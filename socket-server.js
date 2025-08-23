#!/usr/bin/env node

const { createServer } = require("node:http");
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration
const PORT = process.env.SOCKET_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:80";

// Database setup
const dbPath = path.join(__dirname, 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

// Promisify database methods
const dbQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

console.log('🚀 Starting Orvale Chat Socket.IO Server...');
console.log(`📡 Port: ${PORT}`);
console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Connected users tracking
const connectedUsers = new Map();
const userSockets = new Map(); // username -> socket.id
const socketUsers = new Map(); // socket.id -> username

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // For development, we'll use a simple token validation
    // In production, use proper JWT verification
    const user = await validateAuthToken(token);
    
    if (!user) {
      return next(new Error('Invalid authentication token'));
    }

    socket.userId = user.username;
    socket.userInfo = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    next(new Error('Authentication failed'));
  }
});

// Simple auth token validation (replace with your actual auth logic)
async function validateAuthToken(token) {
  try {
    // For now, we'll just check if the token exists in localStorage format
    // and extract basic user info. Replace this with actual JWT verification.
    
    // Query database for user based on token
    // This is a simplified version - implement proper JWT validation
    const users = await dbQuery('SELECT * FROM users WHERE active = 1 LIMIT 1');
    
    if (users.length > 0) {
      return {
        username: users[0].username,
        display_name: users[0].display_name,
        role: users[0].role
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return null;
  }
}

// Update user presence in database
async function updateUserPresence(username, status = 'online') {
  try {
    // Create user_presence table if it doesn't exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS user_presence (
        user_id TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
        status_message TEXT,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        socket_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(username)
      )
    `);

    // Update or insert presence
    await dbRun(`
      INSERT OR REPLACE INTO user_presence 
      (user_id, status, last_active, socket_id) 
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    `, [username, status, userSockets.get(username)]);
    
    console.log(`👤 Updated presence: ${username} → ${status}`);
  } catch (error) {
    console.error('❌ Error updating user presence:', error);
  }
}

// Broadcast user count to all clients
function broadcastUserCount() {
  const count = connectedUsers.size;
  io.emit('user_count', count);
  console.log(`📊 Broadcasting user count: ${count}`);
}

// Broadcast presence update
function broadcastPresenceUpdate(username, status) {
  const update = {
    username,
    status,
    lastActive: new Date().toISOString()
  };
  
  io.emit('presence_update', update);
  console.log(`📡 Broadcasting presence update: ${username} → ${status}`);
}

// Connection handling
io.on("connection", (socket) => {
  const username = socket.userId;
  const userInfo = socket.userInfo;
  
  console.log(`✅ User connected: ${userInfo.display_name} (${username}) [${socket.id}]`);

  // Track connected user
  connectedUsers.set(username, {
    socketId: socket.id,
    username,
    displayName: userInfo.display_name,
    connectedAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  });
  
  userSockets.set(username, socket.id);
  socketUsers.set(socket.id, username);

  // Update presence to online
  updateUserPresence(username, 'online');
  broadcastPresenceUpdate(username, 'online');
  broadcastUserCount();

  // Send connection confirmation
  socket.emit('connected', {
    message: 'Connected to Orvale Chat System',
    mode: 'socket',
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });

  // Handle chat messages
  socket.on('message', async (messageData) => {
    try {
      console.log(`💬 Message from ${username}:`, messageData);
      
      // Add server-side data
      const fullMessage = {
        ...messageData,
        from: username,
        fromDisplayName: userInfo.display_name,
        timestamp: new Date().toISOString(),
        serverId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Store message in database (implement as needed)
      // await storeMessage(fullMessage);

      // Broadcast to all connected clients
      io.emit('message', fullMessage);
      
      // Update user's last active time
      if (connectedUsers.has(username)) {
        const user = connectedUsers.get(username);
        user.lastActive = new Date().toISOString();
        connectedUsers.set(username, user);
      }
      
    } catch (error) {
      console.error('❌ Error handling message:', error);
      socket.emit('message_error', { error: 'Failed to process message' });
    }
  });

  // Handle presence updates
  socket.on('presence_update', async (presenceData) => {
    try {
      console.log(`👤 Presence update from ${username}:`, presenceData);
      
      const { status, statusMessage } = presenceData;
      
      // Update in database
      await updateUserPresence(username, status);
      
      // Update in memory
      if (connectedUsers.has(username)) {
        const user = connectedUsers.get(username);
        user.status = status;
        user.statusMessage = statusMessage;
        user.lastActive = new Date().toISOString();
        connectedUsers.set(username, user);
      }
      
      // Broadcast to other clients
      broadcastPresenceUpdate(username, status);
      
    } catch (error) {
      console.error('❌ Error handling presence update:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socket.broadcast.emit('user_typing', {
      username,
      displayName: userInfo.display_name,
      channel: data.channel,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data) => {
    socket.broadcast.emit('user_typing', {
      username,
      displayName: userInfo.display_name,
      channel: data.channel,
      isTyping: false
    });
  });

  // Handle ping for latency measurement
  socket.on('ping', (timestamp) => {
    const latency = Date.now() - timestamp;
    socket.emit('pong', latency);
  });

  // Handle room/channel joining
  socket.on('join_channel', (channel) => {
    socket.join(channel);
    console.log(`📍 ${username} joined channel: ${channel}`);
    
    socket.to(channel).emit('user_joined_channel', {
      username,
      displayName: userInfo.display_name,
      channel,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leave_channel', (channel) => {
    socket.leave(channel);
    console.log(`📍 ${username} left channel: ${channel}`);
    
    socket.to(channel).emit('user_left_channel', {
      username,
      displayName: userInfo.display_name,
      channel,
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log(`❌ User disconnected: ${userInfo.display_name} (${username}) - Reason: ${reason}`);
    
    // Update presence to offline
    await updateUserPresence(username, 'offline');
    
    // Remove from tracking
    connectedUsers.delete(username);
    userSockets.delete(username);
    socketUsers.delete(socket.id);
    
    // Broadcast updates
    broadcastPresenceUpdate(username, 'offline');
    broadcastUserCount();
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${username}:`, error);
  });
});

// Health check endpoint for monitoring
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      connectedUsers: connectedUsers.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Periodic cleanup and maintenance
setInterval(() => {
  // Clean up stale connections
  const now = Date.now();
  const staleTimeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [username, user] of connectedUsers.entries()) {
    const lastActive = new Date(user.lastActive).getTime();
    if (now - lastActive > staleTimeout) {
      console.log(`🧹 Cleaning up stale connection: ${username}`);
      connectedUsers.delete(username);
      userSockets.delete(username);
      updateUserPresence(username, 'offline');
    }
  }
}, 60000); // Run every minute

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Graceful shutdown initiated...');
  
  // Update all connected users to offline
  connectedUsers.forEach(async (user) => {
    await updateUserPresence(user.username, 'offline');
  });
  
  // Close database connection
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
  });
  
  // Close server
  httpServer.close(() => {
    console.log('✅ Socket.IO server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  process.kill(process.pid, 'SIGTERM');
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🎉 Orvale Chat Socket.IO Server running on port ${PORT}`);
  console.log(`🔗 Health check available at: http://localhost:${PORT}/health`);
  console.log('📡 Ready to accept WebSocket connections');
});

// Error handling
httpServer.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Export for testing or programmatic use
module.exports = { io, httpServer };