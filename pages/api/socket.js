import { Server } from 'socket.io'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

export default async function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('🔌 Setting up Socket.io server...')
    
    // Increase max listeners to prevent memory leak warnings
    process.setMaxListeners(20)
    
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
      // CALL EVENT HANDLERS (Phase 8: WebRTC Foundation)
      // =======================
      
      // Initiate a call
      socket.on('call_initiate', async (data) => {
        try {
          const { channelId, callType, targetUsers = [], sessionId } = data
          
          console.log(`📞 Call initiated by ${socket.userId}: ${callType} call, session ${sessionId}`)
          
          if (channelId) {
            // Channel-based call - notify all channel members
            socket.to(`channel_${channelId}`).emit('incoming_call', {
              sessionId,
              callType,
              channelId,
              initiator: socket.userInfo,
              timestamp: new Date().toISOString()
            })
          } else if (targetUsers && targetUsers.length > 0) {
            // Direct call - find target users' sockets and notify them
            const targetSockets = await io.fetchSockets()
            targetSockets.forEach(targetSocket => {
              if (targetUsers.includes(targetSocket.userId)) {
                targetSocket.emit('incoming_call', {
                  sessionId,
                  callType,
                  initiator: socket.userInfo,
                  participants: [socket.userId, ...targetUsers],
                  timestamp: new Date().toISOString()
                })
              }
            })
          }
          
        } catch (error) {
          console.error('❌ Error handling call initiation:', error)
          socket.emit('error', { message: 'Failed to initiate call' })
        }
      })
      
      // Accept a call
      socket.on('call_accept', async (data) => {
        try {
          const { sessionId } = data
          
          console.log(`✅ Call accepted by ${socket.userId}: session ${sessionId}`)
          
          // Get call session details to notify other participants
          const callSession = await queryAsync(`
            SELECT cs.*, u.display_name as initiator_name
            FROM call_sessions cs
            LEFT JOIN users u ON cs.initiator_user_id = u.username
            WHERE cs.id = ?
          `, [sessionId])
          
          if (callSession && callSession.length > 0) {
            const session = callSession[0]
            const participants = JSON.parse(session.participants || '[]')
            
            // Notify all participants that someone accepted
            const allSockets = await io.fetchSockets()
            allSockets.forEach(participantSocket => {
              if (participants.includes(participantSocket.userId) && participantSocket.userId !== socket.userId) {
                participantSocket.emit('call_accepted', {
                  sessionId,
                  participant: socket.userInfo,
                  timestamp: new Date().toISOString()
                })
              }
            })
            
            // Join the call room for WebRTC signaling
            socket.join(`call_${sessionId}`)
          }
          
        } catch (error) {
          console.error('❌ Error handling call accept:', error)
          socket.emit('error', { message: 'Failed to accept call' })
        }
      })
      
      // Decline a call
      socket.on('call_decline', async (data) => {
        try {
          const { sessionId, reason = 'declined' } = data
          
          console.log(`❌ Call declined by ${socket.userId}: session ${sessionId}, reason: ${reason}`)
          
          // Get call session details
          const callSession = await queryAsync(`
            SELECT cs.*, u.display_name as initiator_name
            FROM call_sessions cs
            LEFT JOIN users u ON cs.initiator_user_id = u.username
            WHERE cs.id = ?
          `, [sessionId])
          
          if (callSession && callSession.length > 0) {
            const session = callSession[0]
            const participants = JSON.parse(session.participants || '[]')
            
            // Notify all participants that someone declined
            const allSockets = await io.fetchSockets()
            allSockets.forEach(participantSocket => {
              if (participants.includes(participantSocket.userId) && participantSocket.userId !== socket.userId) {
                participantSocket.emit('call_declined', {
                  sessionId,
                  participant: socket.userInfo,
                  reason,
                  timestamp: new Date().toISOString()
                })
              }
            })
          }
          
        } catch (error) {
          console.error('❌ Error handling call decline:', error)
          socket.emit('error', { message: 'Failed to decline call' })
        }
      })
      
      // End a call
      socket.on('call_end', async (data) => {
        try {
          const { sessionId, reason = 'completed' } = data
          
          console.log(`🔚 Call ended by ${socket.userId}: session ${sessionId}, reason: ${reason}`)
          
          // Get call session details
          const callSession = await queryAsync(`
            SELECT cs.*, u.display_name as initiator_name
            FROM call_sessions cs
            LEFT JOIN users u ON cs.initiator_user_id = u.username
            WHERE cs.id = ?
          `, [sessionId])
          
          if (callSession && callSession.length > 0) {
            const session = callSession[0]
            const participants = JSON.parse(session.participants || '[]')
            
            // Notify all participants that call ended
            const allSockets = await io.fetchSockets()
            allSockets.forEach(participantSocket => {
              if (participants.includes(participantSocket.userId)) {
                participantSocket.emit('call_ended', {
                  sessionId,
                  endedBy: socket.userInfo,
                  reason,
                  duration: session.duration_seconds,
                  timestamp: new Date().toISOString()
                })
                
                // Remove from call room
                participantSocket.leave(`call_${sessionId}`)
              }
            })
          }
          
        } catch (error) {
          console.error('❌ Error handling call end:', error)
          socket.emit('error', { message: 'Failed to end call' })
        }
      })
      
      // WebRTC Signaling Events
      
      // Handle WebRTC offer
      socket.on('webrtc_offer', async (data) => {
        try {
          const { sessionId, offer, targetUser } = data
          
          console.log(`🔄 WebRTC offer from ${socket.userId} to ${targetUser} (session: ${sessionId})`)
          
          // Find target user's socket
          const allSockets = await io.fetchSockets()
          const targetSocket = allSockets.find(s => s.userId === targetUser)
          
          if (targetSocket) {
            targetSocket.emit('webrtc_offer_received', {
              sessionId,
              offer,
              fromUser: socket.userId,
              fromUserInfo: socket.userInfo,
              timestamp: new Date().toISOString()
            })
          } else {
            socket.emit('error', { message: `Target user ${targetUser} not found or offline` })
          }
          
        } catch (error) {
          console.error('❌ Error handling WebRTC offer:', error)
          socket.emit('error', { message: 'Failed to send WebRTC offer' })
        }
      })
      
      // Handle WebRTC answer
      socket.on('webrtc_answer', async (data) => {
        try {
          const { sessionId, answer, targetUser } = data
          
          console.log(`🔄 WebRTC answer from ${socket.userId} to ${targetUser} (session: ${sessionId})`)
          
          // Find target user's socket
          const allSockets = await io.fetchSockets()
          const targetSocket = allSockets.find(s => s.userId === targetUser)
          
          if (targetSocket) {
            targetSocket.emit('webrtc_answer_received', {
              sessionId,
              answer,
              fromUser: socket.userId,
              fromUserInfo: socket.userInfo,
              timestamp: new Date().toISOString()
            })
          } else {
            socket.emit('error', { message: `Target user ${targetUser} not found or offline` })
          }
          
        } catch (error) {
          console.error('❌ Error handling WebRTC answer:', error)
          socket.emit('error', { message: 'Failed to send WebRTC answer' })
        }
      })
      
      // Handle ICE candidates
      socket.on('webrtc_ice_candidate', async (data) => {
        try {
          const { sessionId, candidate, targetUser } = data
          
          console.log(`🧊 ICE candidate from ${socket.userId} to ${targetUser} (session: ${sessionId})`)
          
          // Find target user's socket  
          const allSockets = await io.fetchSockets()
          const targetSocket = allSockets.find(s => s.userId === targetUser)
          
          if (targetSocket) {
            targetSocket.emit('webrtc_ice_candidate_received', {
              sessionId,
              candidate,
              fromUser: socket.userId,
              fromUserInfo: socket.userInfo,
              timestamp: new Date().toISOString()
            })
          }
          // Note: ICE candidates can be sent multiple times, so we don't emit errors for missing users
          
        } catch (error) {
          console.error('❌ Error handling ICE candidate:', error)
        }
      })
      
      // Join call room (for WebRTC signaling)
      socket.on('join_call', async (data) => {
        try {
          const { sessionId } = data
          
          socket.join(`call_${sessionId}`)
          console.log(`📞 ${socket.userId} joined call room: ${sessionId}`)
          
          // Notify other participants in the call
          socket.to(`call_${sessionId}`).emit('call_participant_joined', {
            sessionId,
            participant: socket.userInfo,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('❌ Error joining call room:', error)
        }
      })
      
      // Leave call room
      socket.on('leave_call', async (data) => {
        try {
          const { sessionId } = data
          
          socket.leave(`call_${sessionId}`)
          console.log(`📞 ${socket.userId} left call room: ${sessionId}`)
          
          // Notify other participants in the call
          socket.to(`call_${sessionId}`).emit('call_participant_left', {
            sessionId,
            participant: socket.userInfo,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('❌ Error leaving call room:', error)
        }
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