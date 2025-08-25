#!/usr/bin/env node

/**
 * Unified Socket.io Server for Chat System + WebRTC Signaling
 * 
 * This single server handles:
 * - Real-time chat messaging
 * - WebRTC signaling for audio/video calls
 * - User presence tracking
 * - Channel/room management
 * 
 * Runs on port 3001 alongside Next.js on port 80
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const http = require('http');
const Database = require('sqlite3').Database;
const path = require('path');

// Configuration
const PORT = process.env.SOCKET_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'orvale-management-system-secret-key-2025';
const DB_PATH = path.join(__dirname, 'orvale_tickets.db');

// Create HTTP server and Socket.io instance
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "http://localhost:80",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Safari/iOS compatibility
});

// Database connection
const db = new Database(DB_PATH);

// In-memory stores for active connections and presence
const activeUsers = new Map(); // userId -> { socketId, displayName, lastActive, connections: [] }
const roomUsers = new Map();   // roomId -> Set of userIds

// Helper function to authenticate socket connections
const authenticateSocket = async (socket, token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.username || decoded.user_id;
    
    // Get user info from database
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT username, display_name, role FROM users WHERE username = ? AND active = 1',
        [userId],
        (err, user) => {
          if (err || !user) {
            reject(new Error('User not found or inactive'));
          } else {
            resolve({ ...user, userId: user.username });
          }
        }
      );
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Update user presence in database
const updatePresence = (userId, status, socketId = null) => {
  const connections = activeUsers.get(userId)?.connections || [];
  
  if (socketId && status === 'online') {
    if (!connections.includes(socketId)) {
      connections.push(socketId);
    }
  } else if (socketId && status === 'offline') {
    const index = connections.indexOf(socketId);
    if (index > -1) connections.splice(index, 1);
  }

  // Update in-memory store
  if (status === 'online' || connections.length > 0) {
    activeUsers.set(userId, {
      socketId,
      lastActive: new Date(),
      connections,
      status: connections.length > 0 ? 'online' : status
    });
  } else {
    activeUsers.delete(userId);
  }

  // Update database
  const finalStatus = connections.length > 0 ? 'online' : status;
  db.run(
    `INSERT OR REPLACE INTO user_presence 
     (user_id, status, last_active, socket_connections, connection_count) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      finalStatus,
      new Date().toISOString(),
      JSON.stringify(connections),
      connections.length
    ]
  );

  // Broadcast presence update to all connected users
  io.emit('presence:update', {
    userId,
    status: finalStatus,
    connectionCount: connections.length
  });
};

// Socket.io connection handling
io.on('connection', async (socket) => {
  let authenticatedUser = null;
  
  console.log(`Socket connected: ${socket.id}`);

  // === AUTHENTICATION ===
  socket.on('authenticate', async (token) => {
    try {
      authenticatedUser = await authenticateSocket(socket, token);
      socket.userId = authenticatedUser.userId;
      socket.userDisplayName = authenticatedUser.display_name;
      socket.userRole = authenticatedUser.role;
      
      // Update presence to online
      updatePresence(socket.userId, 'online', socket.id);
      
      socket.emit('authenticated', {
        userId: socket.userId,
        displayName: socket.userDisplayName,
        role: socket.userRole
      });
      
      console.log(`✅ User authenticated: ${socket.userDisplayName} (${socket.userId}) on socket ${socket.id}`);
    } catch (error) {
      socket.emit('auth:error', error.message);
      socket.disconnect();
    }
  });

  // === STANDARDIZED CHAT EVENTS (Legacy handlers removed for clarity) ===

  // === STANDARDIZED 11 WEBSOCKET EVENTS (per Chat Implementation Plan) ===
  
  // 1. JOIN_CHANNEL - Client -> Server
  socket.on('join_channel', (data) => {
    if (!socket.userId) return;
    
    const { channelId } = data;
    const roomName = `channel_${channelId}`;
    
    // First check if user has access to this channel or auto-join public channels
    db.get(
      `SELECT c.*, cm.role as user_role 
       FROM chat_channels c
       LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
       WHERE c.id = ? AND c.active = 1`,
      [socket.userId, channelId],
      (err, channel) => {
        if (err || !channel) {
          socket.emit('join_channel_error', { message: 'Channel not found or access denied' });
          return;
        }
        
        // Auto-join public channels if not already a member
        if (channel.type === 'public_channel' && !channel.user_role) {
          db.run(
            `INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, joined_at)
             VALUES (?, ?, 'member', CURRENT_TIMESTAMP)`,
            [channelId, socket.userId],
            (insertErr) => {
              if (insertErr) {
                console.error('Error auto-joining public channel:', insertErr);
              } else {
                console.log(`Auto-joined ${socket.userId} to public channel ${channelId}`);
              }
            }
          );
        }
        
        // Join the Socket.io room
        socket.join(roomName);
        
        // Track room membership
        if (!roomUsers.has(roomName)) {
          roomUsers.set(roomName, new Set());
        }
        roomUsers.get(roomName).add(socket.userId);
        
        // Log room members for debugging
        console.log(`${socket.userDisplayName} (${socket.userId}) joined channel ${channelId}`);
        console.log(`Room ${roomName} now has ${roomUsers.get(roomName).size} members:`, Array.from(roomUsers.get(roomName)));
        
        // Emit USER_JOINED to other channel members
        socket.to(roomName).emit('user_joined', {
          userId: socket.userId,
          displayName: socket.userDisplayName,
          role: socket.userRole,
          channelId,
          timestamp: new Date().toISOString()
        });
        
        // Confirm successful join to the user
        socket.emit('channel_joined', {
          channelId,
          channelName: channel.name,
          roomMembers: Array.from(roomUsers.get(roomName))
        });
      }
    );
  });

  // 2. LEAVE_CHANNEL - Client -> Server
  socket.on('leave_channel', (data) => {
    if (!socket.userId) return;
    
    const { channelId } = data;
    socket.leave(`channel_${channelId}`);
    roomUsers.get(`channel_${channelId}`)?.delete(socket.userId);
    
    // Emit USER_LEFT to other channel members
    socket.to(`channel_${channelId}`).emit('user_left', {
      userId: socket.userId,
      displayName: socket.userDisplayName,
      channelId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`${socket.userDisplayName} left channel ${channelId}`);
  });

  // 3. SEND_MESSAGE - Client -> Server
  socket.on('send_message', (data) => {
    if (!socket.userId) return;
    
    const { channelId, message, type = 'text', replyToId = null } = data;
    
    // Save message to database
    db.run(
      `INSERT INTO chat_messages (channel_id, user_id, message_text, message_type, reply_to_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [channelId, socket.userId, message, type, replyToId],
      function(err) {
        if (err) {
          socket.emit('error', { type: 'message_send_failed', message: 'Failed to send message' });
          return;
        }
        
        const messageData = {
          id: this.lastID,
          channelId,
          userId: socket.userId,
          userDisplayName: socket.userDisplayName,
          message,
          messageType: type,
          replyToId,
          timestamp: new Date().toISOString()
        };
        
        // Emit MESSAGE_RECEIVED to ALL users in the channel (including sender)
        const roomName = `channel_${channelId}`;
        const roomMembers = roomUsers.get(roomName) || new Set();
        console.log(`Broadcasting message to room ${roomName} with ${roomMembers.size} members:`, Array.from(roomMembers));
        
        // Broadcast to ALL users in the room (including sender for real-time updates)
        console.log(`Broadcasting message_received to ALL users in room ${roomName}`);
        io.to(roomName).emit('message_received', {
          message: messageData,
          channel: { id: channelId }
        });
        
        console.log(`Message successfully broadcast to ${roomMembers.size} users in ${roomName}`);
        socket.emit('message_sent', {
          message: messageData,
          channel: { id: channelId }
        });
        
        // IMPORTANT: Broadcast message_notification GLOBALLY for sidebar updates
        // This ensures unread counts are updated for ALL connected users (not just room members)
        console.log(`Broadcasting message_notification globally for sidebar updates`);
        io.emit('message_notification', {
          message: messageData,
          channel: { id: channelId }
        });
        
        console.log(`Message sent to channel ${channelId} by ${socket.userDisplayName}`);
      }
    );
  });

  // 4. TYPING_START - Client -> Server
  socket.on('typing_start', (data) => {
    if (!socket.userId) return;
    
    const { channelId } = data;
    // Emit USER_TYPING to other channel members
    socket.to(`channel_${channelId}`).emit('user_typing', {
      userId: socket.userId,
      userDisplayName: socket.userDisplayName,
      channelId,
      isTyping: true
    });
  });

  // 5. TYPING_STOP - Client -> Server  
  socket.on('typing_stop', (data) => {
    if (!socket.userId) return;
    
    const { channelId } = data;
    // Emit USER_TYPING (false) to other channel members
    socket.to(`channel_${channelId}`).emit('user_typing', {
      userId: socket.userId,
      userDisplayName: socket.userDisplayName,
      channelId,
      isTyping: false
    });
  });

  // 6. UPDATE_PRESENCE - Client -> Server (already exists, keeping as-is)
  // Note: Emits PRESENCE_UPDATED (server->client) in existing handler
  
  /*
  === SUMMARY: 11 STANDARDIZED WEBSOCKET EVENTS ===
  
  Client -> Server Events:
  1. ✅ join_channel      - User joins a chat channel
  2. ✅ leave_channel     - User leaves a chat channel  
  3. ✅ send_message      - Send chat message to channel
  4. ✅ typing_start      - User starts typing indicator
  5. ✅ typing_stop       - User stops typing indicator
  6. ✅ update_presence   - Update user status (online/away/busy/offline)
  
  Server -> Client Events:
  7. ✅ message_received  - New message broadcast to channel members
  8. ✅ user_joined       - User joined channel notification
  9. ✅ user_left         - User left channel notification
  10. ✅ user_typing      - Typing indicator from other users
  11. ✅ presence_updated - User presence status changed
  
  Additional Events:
  - ✅ channel_updated    - Channel settings/info updated (used in admin functions)
  */

  // === NEW WEBSOCKET EVENTS ===

  // Update user presence status
  socket.on('update_presence', (data) => {
    if (!authenticatedUser) return;
    
    const { status, statusMessage, customStatus } = data;
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    
    if (!validStatuses.includes(status)) {
      socket.emit('presence:error', 'Invalid status');
      return;
    }

    // Update presence in database and memory
    updatePresence(socket.userId, status, socket.id);
    
    // Update database with additional info
    db.run(
      `UPDATE user_presence 
       SET status_message = ?, custom_status = ?
       WHERE user_id = ?`,
      [statusMessage || null, customStatus || null, socket.userId],
      (err) => {
        if (!err) {
          // Broadcast presence update to all connected users
          io.emit('presence_updated', {
            userId: socket.userId,
            userDisplayName: socket.userDisplayName,
            status,
            statusMessage,
            customStatus,
            timestamp: new Date().toISOString()
          });
        }
      }
    );
  });

  // Mark messages as read
  socket.on('message_read', (data) => {
    if (!authenticatedUser) return;
    
    const { channelId, messageId } = data;
    
    // Update user's last read timestamp for channel
    db.run(
      `UPDATE chat_channel_members 
       SET last_read_at = CURRENT_TIMESTAMP 
       WHERE channel_id = ? AND user_id = ?`,
      [channelId, socket.userId],
      (err) => {
        if (!err) {
          // Emit read receipt to channel (optional - for read receipts)
          socket.to(`channel_${channelId}`).emit('message_read_receipt', {
            userId: socket.userId,
            userDisplayName: socket.userDisplayName,
            channelId: parseInt(channelId),
            messageId: messageId ? parseInt(messageId) : null,
            readAt: new Date().toISOString()
          });
        }
      }
    );
  });

  // === Duplicate handlers removed for clarity ===

  // File upload notification
  socket.on('file_uploaded', (data) => {
    if (!authenticatedUser) return;
    
    const { channelId, fileName, fileSize, fileType, messageId } = data;
    
    // Broadcast file upload to channel members
    socket.to(`channel_${channelId}`).emit('file_upload_notification', {
      messageId: parseInt(messageId),
      channelId: parseInt(channelId),
      uploadedBy: socket.userId,
      uploaderName: socket.userDisplayName,
      fileName,
      fileSize,
      fileType,
      uploadedAt: new Date().toISOString()
    });
  });

  // System broadcast (admin only)
  socket.on('system_broadcast', (data) => {
    if (!authenticatedUser) return;
    
    // Check if user has broadcast permission
    if (!socket.userRole || !['admin'].includes(socket.userRole)) {
      socket.emit('broadcast:error', 'Insufficient permissions for system broadcast');
      return;
    }

    const { message, priority = 'normal' } = data;
    
    // Broadcast to all connected users
    io.emit('system_broadcast_received', {
      message,
      priority,
      from: socket.userDisplayName,
      broadcastAt: new Date().toISOString(),
      broadcastId: `broadcast_${Date.now()}`
    });
    
    console.log(`System broadcast sent by ${socket.userDisplayName}: ${message}`);
  });

  // Channel updated notification
  socket.on('channel_updated', (data) => {
    if (!authenticatedUser) return;
    
    const { channelId, changes } = data;
    
    // Broadcast channel update to channel members
    socket.to(`channel_${channelId}`).emit('channel_updated', {
      channelId: parseInt(channelId),
      changes,
      updatedBy: socket.userId,
      updaterName: socket.userDisplayName,
      updatedAt: new Date().toISOString()
    });
  });

  // === WEBRTC SIGNALING EVENTS ===
  
  socket.on('call:invite', (data) => {
    if (!authenticatedUser) return;
    
    const { targetUserId, callType, offer } = data;
    const callId = `${socket.userId}-${targetUserId}-${Date.now()}`;
    
    // Log call initiation
    db.run(
      `INSERT INTO call_logs (call_id, caller_id, receiver_id, call_type, status) 
       VALUES (?, ?, ?, ?, 'initiated')`,
      [callId, socket.userId, targetUserId, callType]
    );
    
    // Find target user's socket(s)
    const targetConnections = activeUsers.get(targetUserId)?.connections || [];
    targetConnections.forEach(connectionId => {
      io.to(connectionId).emit('call:incoming', {
        callId,
        from: socket.userId,
        fromName: socket.userDisplayName,
        callType,
        offer
      });
    });
    
    console.log(`${callType} call from ${socket.userDisplayName} to ${targetUserId}`);
  });

  socket.on('call:accept', (data) => {
    if (!authenticatedUser) return;
    
    const { callId, answer, targetUserId } = data;
    
    // Update call status
    db.run(
      `UPDATE call_logs SET status = 'accepted', answered_at = CURRENT_TIMESTAMP 
       WHERE call_id = ?`,
      [callId]
    );
    
    // Send acceptance to caller
    const targetConnections = activeUsers.get(targetUserId)?.connections || [];
    targetConnections.forEach(connectionId => {
      io.to(connectionId).emit('call:accepted', { callId, answer });
    });
    
    console.log(`Call ${callId} accepted by ${socket.userDisplayName}`);
  });

  socket.on('call:reject', (data) => {
    if (!authenticatedUser) return;
    
    const { callId, targetUserId } = data;
    
    // Update call status
    db.run(
      `UPDATE call_logs SET status = 'rejected', ended_at = CURRENT_TIMESTAMP 
       WHERE call_id = ?`,
      [callId]
    );
    
    // Notify caller of rejection
    const targetConnections = activeUsers.get(targetUserId)?.connections || [];
    targetConnections.forEach(connectionId => {
      io.to(connectionId).emit('call:rejected', { callId });
    });
    
    console.log(`Call ${callId} rejected by ${socket.userDisplayName}`);
  });

  socket.on('call:end', (data) => {
    if (!authenticatedUser) return;
    
    const { callId, targetUserId } = data;
    
    // Update call status
    db.run(
      `UPDATE call_logs SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
       WHERE call_id = ?`,
      [callId]
    );
    
    // Notify other participant
    const targetConnections = activeUsers.get(targetUserId)?.connections || [];
    targetConnections.forEach(connectionId => {
      io.to(connectionId).emit('call:ended', { callId });
    });
    
    console.log(`Call ${callId} ended by ${socket.userDisplayName}`);
  });

  socket.on('call:ice_candidate', (data) => {
    if (!authenticatedUser) return;
    
    const { targetUserId, candidate } = data;
    
    // Forward ICE candidate to target user
    const targetConnections = activeUsers.get(targetUserId)?.connections || [];
    targetConnections.forEach(connectionId => {
      io.to(connectionId).emit('call:ice_candidate', {
        from: socket.userId,
        candidate
      });
    });
  });

  // === PRESENCE EVENTS ===
  
  socket.on('presence:set_status', (status) => {
    if (!authenticatedUser) return;
    updatePresence(socket.userId, status, socket.id);
  });

  socket.on('presence:get_online_users', (callback) => {
    if (!authenticatedUser) return;
    
    const onlineUsers = Array.from(activeUsers.entries()).map(([userId, data]) => ({
      userId,
      status: data.status,
      connectionCount: data.connections.length
    }));
    
    callback(onlineUsers);
  });

  // === DISCONNECTION HANDLING ===
  
  socket.on('disconnect', () => {
    if (authenticatedUser) {
      console.log(`User disconnected: ${socket.userDisplayName} (${socket.id})`);
      
      // Notify all channels that user left (for this socket connection)
      roomUsers.forEach((users, roomId) => {
        if (users.has(socket.userId)) {
          // Extract channel ID from room ID (format: "channel_123")
          const channelId = roomId.replace('channel_', '');
          if (channelId !== roomId) {
            socket.to(roomId).emit('user_left', {
              userId: socket.userId,
              userDisplayName: socket.userDisplayName,
              channelId: parseInt(channelId),
              leftAt: new Date().toISOString(),
              reason: 'disconnect'
            });
          }
        }
      });
      
      // Update presence (remove this socket from connections)
      updatePresence(socket.userId, 'offline', socket.id);
      
      // Clean up room memberships for this socket
      roomUsers.forEach((users, roomId) => {
        // Only remove the user if they have no other active connections
        const userConnections = activeUsers.get(socket.userId)?.connections || [];
        const hasOtherConnections = userConnections.some(connId => connId !== socket.id);
        
        if (!hasOtherConnections) {
          users.delete(socket.userId);
          if (users.size === 0) {
            roomUsers.delete(roomId);
          }
        }
      });

      // Broadcast updated presence if user is now offline
      const userConnections = activeUsers.get(socket.userId)?.connections || [];
      if (userConnections.length === 0) {
        io.emit('presence_updated', {
          userId: socket.userId,
          userDisplayName: socket.userDisplayName,
          status: 'offline',
          timestamp: new Date().toISOString(),
          reason: 'disconnect'
        });
      }
    } else {
      console.log(`Unauthenticated socket disconnected: ${socket.id}`);
    }
  });
});

// Periodic cleanup of stale presence data
setInterval(() => {
  const staleThreshold = 30 * 60 * 1000; // 30 minutes
  const now = new Date();
  
  activeUsers.forEach((userData, userId) => {
    if (now - userData.lastActive > staleThreshold) {
      console.log(`Cleaning up stale presence for user: ${userId}`);
      updatePresence(userId, 'offline');
    }
  });
}, 5 * 60 * 1000); // Run every 5 minutes

// Start the server
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
  console.log(`CORS enabled for: http://localhost:80`);
  console.log('Ready to handle chat messages and WebRTC signaling');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing Socket.io server...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

module.exports = server;