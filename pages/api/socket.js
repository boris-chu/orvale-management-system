import { Server } from 'socket.io'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

export default async function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('🔌 Setting up Socket.io server...')
    
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-domain.com'] 
          : ['http://localhost', 'http://localhost:80'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    })
    
    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
        
        if (!token) {
          console.log('❌ Socket connection rejected: No token provided')
          return next(new Error('Authentication token required'))
        }

        // Create a mock request object for verifyAuth
        const mockRequest = {
          headers: {
            authorization: `Bearer ${token}`
          }
        }

        const authResult = await verifyAuth(mockRequest)
        
        if (!authResult.success || !authResult.user) {
          console.log('❌ Socket connection rejected: Invalid token')
          return next(new Error('Invalid authentication token'))
        }
        
        // Attach user info to socket
        socket.userId = authResult.user.username
        socket.userInfo = authResult.user
        
        console.log(`✅ Socket authenticated: ${authResult.user.username}`)
        next()
      } catch (error) {
        console.error('❌ Socket authentication error:', error)
        next(new Error('Authentication failed'))
      }
    })
    
    // Connection handler
    io.on('connection', async (socket) => {
      console.log(`🔗 User connected: ${socket.userId}`)
      
      try {
        // Update user presence to online
        await runAsync(`
          INSERT OR REPLACE INTO user_presence (user_id, status, last_active, socket_id)
          VALUES (?, 'online', datetime('now'), ?)
        `, [socket.userId, socket.id])
        
        // Broadcast presence update to all users
        socket.broadcast.emit('presence_updated', {
          user_id: socket.userId,
          status: 'online',
          user_info: socket.userInfo
        })
        
        // Join user to their team channel if they have one
        if (socket.userInfo.team_id) {
          socket.join(`team_${socket.userInfo.team_id}`)
          console.log(`👥 ${socket.userId} joined team channel: ${socket.userInfo.team_id}`)
        }

      } catch (error) {
        console.error('❌ Error updating user presence:', error)
      }
      
      // =======================
      // CHANNEL EVENT HANDLERS
      // =======================
      
      // Join a specific chat channel
      socket.on('join_channel', async (data) => {
        try {
          const { channelId } = data
          
          // Check if user has permission to join this channel
          const channel = await queryAsync(`
            SELECT c.*, ccm.role 
            FROM chat_channels c
            LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
            WHERE c.id = ? AND c.active = 1
          `, [socket.userId, channelId])
          
          if (!channel || channel.length === 0) {
            socket.emit('error', { message: 'Channel not found or access denied' })
            return
          }
          
          const channelInfo = channel[0]
          
          // Join the socket room
          socket.join(`channel_${channelId}`)
          
          // Add user to channel members if not already a member
          await runAsync(`
            INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, joined_at)
            VALUES (?, ?, datetime('now'))
          `, [channelId, socket.userId])
          
          // Update last read timestamp
          await runAsync(`
            UPDATE chat_channel_members 
            SET last_read_at = datetime('now')
            WHERE channel_id = ? AND user_id = ?
          `, [channelId, socket.userId])
          
          console.log(`📺 ${socket.userId} joined channel: ${channelInfo.name}`)
          
          // Notify other channel members
          socket.to(`channel_${channelId}`).emit('user_joined', {
            channel_id: channelId,
            user: socket.userInfo
          })
          
        } catch (error) {
          console.error('❌ Error joining channel:', error)
          socket.emit('error', { message: 'Failed to join channel' })
        }
      })
      
      // Leave a channel
      socket.on('leave_channel', async (data) => {
        try {
          const { channelId } = data
          
          socket.leave(`channel_${channelId}`)
          
          console.log(`📺 ${socket.userId} left channel: ${channelId}`)
          
          // Notify other channel members
          socket.to(`channel_${channelId}`).emit('user_left', {
            channel_id: channelId,
            user: socket.userInfo
          })
          
        } catch (error) {
          console.error('❌ Error leaving channel:', error)
        }
      })
      
      // ========================
      // MESSAGE EVENT HANDLERS
      // ========================
      
      // Send a message
      socket.on('send_message', async (data) => {
        try {
          const { channelId, message, messageType = 'text', replyToId = null } = data
          
          // Validate message
          if (!message || !message.trim()) {
            socket.emit('error', { message: 'Message cannot be empty' })
            return
          }
          
          // Check if user is a member of the channel
          const membership = await queryAsync(`
            SELECT * FROM chat_channel_members 
            WHERE channel_id = ? AND user_id = ?
          `, [channelId, socket.userId])
          
          if (!membership || membership.length === 0) {
            socket.emit('error', { message: 'You are not a member of this channel' })
            return
          }
          
          // Insert message into database
          const result = await runAsync(`
            INSERT INTO chat_messages (channel_id, user_id, message_text, message_type, reply_to_id)
            VALUES (?, ?, ?, ?, ?)
          `, [channelId, socket.userId, message.trim(), messageType, replyToId])
          
          // Get the full message with user info
          const fullMessage = await queryAsync(`
            SELECT 
              cm.*,
              u.display_name,
              u.profile_picture
            FROM chat_messages cm
            JOIN users u ON cm.user_id = u.username
            WHERE cm.id = ?
          `, [result.lastID])
          
          const messageData = fullMessage[0]
          
          console.log(`💬 Message from ${socket.userId} in channel ${channelId}`)
          
          // Broadcast message to all channel members
          io.to(`channel_${channelId}`).emit('message_received', {
            message: messageData,
            channel_id: channelId
          })
          
        } catch (error) {
          console.error('❌ Error sending message:', error)
          socket.emit('error', { message: 'Failed to send message' })
        }
      })
      
      // =========================
      // PRESENCE EVENT HANDLERS
      // =========================
      
      // Update user presence status
      socket.on('update_presence', async (data) => {
        try {
          const { status, statusMessage = null } = data
          
          if (!['online', 'away', 'busy', 'offline'].includes(status)) {
            socket.emit('error', { message: 'Invalid presence status' })
            return
          }
          
          await runAsync(`
            UPDATE user_presence 
            SET status = ?, status_message = ?, last_active = datetime('now')
            WHERE user_id = ?
          `, [status, statusMessage, socket.userId])
          
          console.log(`🟢 ${socket.userId} status updated to: ${status}`)
          
          // Broadcast presence update
          socket.broadcast.emit('presence_updated', {
            user_id: socket.userId,
            status: status,
            status_message: statusMessage,
            user_info: socket.userInfo
          })
          
        } catch (error) {
          console.error('❌ Error updating presence:', error)
        }
      })
      
      // Typing indicators
      socket.on('typing_start', (data) => {
        const { channelId } = data
        socket.to(`channel_${channelId}`).emit('user_typing', {
          channel_id: channelId,
          user: socket.userInfo,
          typing: true
        })
      })
      
      socket.on('typing_stop', (data) => {
        const { channelId } = data
        socket.to(`channel_${channelId}`).emit('user_typing', {
          channel_id: channelId,
          user: socket.userInfo,
          typing: false
        })
      })
      
      // =======================
      // DISCONNECTION HANDLER
      // =======================
      
      socket.on('disconnect', async () => {
        console.log(`🔌 User disconnected: ${socket.userId}`)
        
        try {
          // Update user presence to offline
          await runAsync(`
            UPDATE user_presence 
            SET status = 'offline', last_active = datetime('now'), socket_id = NULL
            WHERE user_id = ?
          `, [socket.userId])
          
          // Broadcast presence update
          socket.broadcast.emit('presence_updated', {
            user_id: socket.userId,
            status: 'offline',
            user_info: socket.userInfo
          })
          
        } catch (error) {
          console.error('❌ Error updating presence on disconnect:', error)
        }
      })
    })
    
    res.socket.server.io = io
    console.log('✅ Socket.io server setup complete')
  }
  
  res.end()
}