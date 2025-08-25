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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
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
      
      console.log(`User authenticated: ${socket.userDisplayName} (${socket.userId})`);
    } catch (error) {
      socket.emit('auth:error', error.message);
      socket.disconnect();
    }
  });

  // === CHAT MESSAGE EVENTS ===
  
  socket.on('chat:join_channel', (channelId) => {
    if (!authenticatedUser) return;
    
    socket.join(`channel_${channelId}`);
    
    // Track room membership
    if (!roomUsers.has(`channel_${channelId}`)) {
      roomUsers.set(`channel_${channelId}`, new Set());
    }
    roomUsers.get(`channel_${channelId}`).add(socket.userId);
    
    console.log(`${socket.userDisplayName} joined channel ${channelId}`);
  });

  socket.on('chat:leave_channel', (channelId) => {
    if (!authenticatedUser) return;
    
    socket.leave(`channel_${channelId}`);
    roomUsers.get(`channel_${channelId}`)?.delete(socket.userId);
    
    console.log(`${socket.userDisplayName} left channel ${channelId}`);
  });

  socket.on('chat:send_message', (data) => {
    if (!authenticatedUser) return;
    
    const { channelId, message, messageType = 'text', replyToId = null } = data;
    
    // Save message to database
    db.run(
      `INSERT INTO chat_messages (channel_id, user_id, message_text, message_type, reply_to_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [channelId, socket.userId, message, messageType, replyToId],
      function(err) {
        if (err) {
          socket.emit('chat:error', 'Failed to send message');
          return;
        }
        
        const messageData = {
          id: this.lastID,
          channelId,
          userId: socket.userId,
          userDisplayName: socket.userDisplayName,
          message,
          messageType,
          replyToId,
          timestamp: new Date().toISOString()
        };
        
        // Broadcast to all users in the channel
        io.to(`channel_${channelId}`).emit('chat:new_message', messageData);
        console.log(`Message sent to channel ${channelId} by ${socket.userDisplayName}`);
      }
    );
  });

  socket.on('chat:typing', (data) => {
    if (!authenticatedUser) return;
    
    const { channelId, isTyping } = data;
    socket.to(`channel_${channelId}`).emit('chat:user_typing', {
      userId: socket.userId,
      userDisplayName: socket.userDisplayName,
      isTyping
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
      
      // Update presence (remove this socket from connections)
      updatePresence(socket.userId, 'offline', socket.id);
      
      // Clean up room memberships
      roomUsers.forEach((users, roomId) => {
        users.delete(socket.userId);
        if (users.size === 0) {
          roomUsers.delete(roomId);
        }
      });
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