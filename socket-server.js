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
const isDevelopment = process.env.NODE_ENV === 'development';

// Connection limits (can be overridden by admin settings)
const DEFAULT_MAX_CONNECTIONS_PER_USER = isDevelopment ? 10 : 5;
const DEFAULT_MAX_CONNECTIONS_PER_IP = isDevelopment ? 25 : 15;
const DEFAULT_MAX_TOTAL_CONNECTIONS = isDevelopment ? 500 : 200;

// Create HTTP server with health endpoint and Socket.io instance
const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'connected',
      port: PORT,
      uptime: Math.floor(process.uptime()),
      uptimeFormatted: formatUptime(process.uptime()),
      connections: io.engine.clientsCount || 0,
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // For all other requests, return 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});
const io = new Server(server, {
  cors: {
    origin: "http://localhost:80",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Safari/iOS compatibility
  // Improved connection settings
  connectTimeout: isDevelopment ? 60000 : 30000,
  pingTimeout: isDevelopment ? 45000 : 30000,
  pingInterval: isDevelopment ? 30000 : 25000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true
});

// Database connection
const db = new Database(DB_PATH);

// Utility function to format uptime
const formatUptime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${Math.floor(seconds)}s`;
  }
};

// Connection tracking
const connectionsByUser = new Map(); // userId -> Set of socket IDs
const connectionsByIP = new Map();    // IP -> Set of socket IDs
const totalConnections = new Set();   // All active socket IDs
let websocketUnlimitedMode = false;   // Admin override for connection limits

// In-memory stores for active connections and presence
const activeUsers = new Map(); // userId -> { socketId, displayName, lastActive, connections: [] }
const roomUsers = new Map();   // roomId -> Set of userIds

// Public portal specific stores
const publicSessions = new Map(); // sessionId -> { socketId, guestName, email, startTime, agentId }
const publicQueue = []; // Array of sessionIds waiting for agent
const publicAgentAvailability = new Map(); // agentId -> { available, workMode, activeChats }

// Load system settings for websocket unlimited mode
const loadSystemSettings = () => {
  db.get('SELECT websocket_unlimited_mode FROM system_settings WHERE id = 1', (err, row) => {
    if (!err && row) {
      websocketUnlimitedMode = Boolean(row.websocket_unlimited_mode);
      console.log(`📡 WebSocket unlimited mode: ${websocketUnlimitedMode ? 'ENABLED' : 'DISABLED'}`);
    }
  });
};

// Load settings on startup
loadSystemSettings();

// Reload settings every 30 seconds
setInterval(loadSystemSettings, 30000);

// Connection management helpers
const checkConnectionLimits = (socket, userId) => {
  // Skip limits if unlimited mode is enabled
  if (websocketUnlimitedMode) {
    console.log(`🌍 Connection allowed (unlimited mode): ${userId || 'guest'} from ${socket.handshake.address}`);
    return { allowed: true, reason: 'unlimited_mode' };
  }

  const clientIP = socket.handshake.address;
  const userConnections = connectionsByUser.get(userId)?.size || 0;
  const ipConnections = connectionsByIP.get(clientIP)?.size || 0;
  const total = totalConnections.size;

  // Check total connections
  if (total >= DEFAULT_MAX_TOTAL_CONNECTIONS) {
    return { allowed: false, reason: 'total_limit', current: total, limit: DEFAULT_MAX_TOTAL_CONNECTIONS };
  }

  // Check per-user connections (if authenticated)
  if (userId && userConnections >= DEFAULT_MAX_CONNECTIONS_PER_USER) {
    return { allowed: false, reason: 'user_limit', current: userConnections, limit: DEFAULT_MAX_CONNECTIONS_PER_USER };
  }

  // Check per-IP connections
  if (ipConnections >= DEFAULT_MAX_CONNECTIONS_PER_IP) {
    return { allowed: false, reason: 'ip_limit', current: ipConnections, limit: DEFAULT_MAX_CONNECTIONS_PER_IP };
  }

  return { allowed: true, reason: 'within_limits' };
};

const trackConnection = (socket, userId) => {
  const socketId = socket.id;
  const clientIP = socket.handshake.address;

  // Track total connections
  totalConnections.add(socketId);

  // Track by IP
  if (!connectionsByIP.has(clientIP)) {
    connectionsByIP.set(clientIP, new Set());
  }
  connectionsByIP.get(clientIP).add(socketId);

  // Track by user (if authenticated)
  if (userId) {
    if (!connectionsByUser.has(userId)) {
      connectionsByUser.set(userId, new Set());
    }
    connectionsByUser.get(userId).add(socketId);
  }

  console.log(`✅ Connection tracked: ${userId || 'guest'} from ${clientIP} (Total: ${totalConnections.size})`);
};

const untrackConnection = (socket, userId) => {
  const socketId = socket.id;
  const clientIP = socket.handshake.address;

  // Remove from total
  totalConnections.delete(socketId);

  // Remove from IP tracking
  const ipSet = connectionsByIP.get(clientIP);
  if (ipSet) {
    ipSet.delete(socketId);
    if (ipSet.size === 0) {
      connectionsByIP.delete(clientIP);
    }
  }

  // Remove from user tracking
  if (userId) {
    const userSet = connectionsByUser.get(userId);
    if (userSet) {
      userSet.delete(socketId);
      if (userSet.size === 0) {
        connectionsByUser.delete(userId);
      }
    }
  }

  console.log(`🗑️  Connection untracked: ${userId || 'guest'} from ${clientIP} (Total: ${totalConnections.size})`);
};

const getConnectionLimitMessage = (checkResult) => {
  switch (checkResult.reason) {
    case 'total_limit':
      return `Server at capacity (${checkResult.current}/${checkResult.limit} connections). Please try again later.`;
    case 'user_limit':
      return `Too many connections for this user (${checkResult.current}/${checkResult.limit}). Please close other chat windows.`;
    case 'ip_limit':
      return `Too many connections from this location (${checkResult.current}/${checkResult.limit}). Please try again later.`;
    default:
      return 'Connection limit exceeded. Please try again later.';
  }
};

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
  
  console.log(`Socket connected: ${socket.id} from ${socket.handshake.address}`);

  // Check initial connection limits (before authentication)
  const preAuthCheck = checkConnectionLimits(socket, null);
  if (!preAuthCheck.allowed) {
    console.warn(`❌ Connection rejected (pre-auth): ${preAuthCheck.reason} - ${preAuthCheck.current}/${preAuthCheck.limit}`);
    socket.emit('connection_limit_exceeded', {
      reason: preAuthCheck.reason,
      message: getConnectionLimitMessage(preAuthCheck)
    });
    socket.disconnect(true);
    return;
  }

  // Track the connection (initially as guest)
  trackConnection(socket, null);

  // === AUTHENTICATION ===
  socket.on('authenticate', async (token) => {
    try {
      authenticatedUser = await authenticateSocket(socket, token);
      const userId = authenticatedUser.userId;

      // Check connection limits for authenticated user
      const authCheck = checkConnectionLimits(socket, userId);
      if (!authCheck.allowed) {
        console.warn(`❌ Authentication rejected for ${userId}: ${authCheck.reason} - ${authCheck.current}/${authCheck.limit}`);
        socket.emit('connection_limit_exceeded', {
          reason: authCheck.reason,
          message: getConnectionLimitMessage(authCheck),
          userId: userId
        });
        socket.disconnect(true);
        return;
      }

      // Re-track connection with user ID
      untrackConnection(socket, null);
      trackConnection(socket, userId);

      socket.userId = userId;
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
    
    const { channelId, message, type = 'text', replyToId = null, fileAttachment = null } = data;
    
    // Save message to database
    db.run(
      `INSERT INTO chat_messages (channel_id, user_id, message_text, message_type, reply_to_id, file_attachment) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [channelId, socket.userId, message, type, replyToId, fileAttachment],
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
          fileAttachment,
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
    const validStatuses = ['online', 'away', 'busy', 'offline', 'idle', 'in_call', 'in_meeting', 'presenting'];
    
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
    
    const { callId, targetUserId, callType, offer } = data;
    // Use the callId from client, or generate one if not provided
    const finalCallId = callId || `${socket.userId}-${targetUserId}-${Date.now()}`;
    
    // Log call initiation
    db.run(
      `INSERT INTO call_logs (call_id, caller_id, receiver_id, call_type, status) 
       VALUES (?, ?, ?, ?, 'initiated')`,
      [finalCallId, socket.userId, targetUserId, callType]
    );
    
    // Find target user's socket(s)
    const targetConnections = activeUsers.get(targetUserId)?.connections || [];
    targetConnections.forEach(connectionId => {
      io.to(connectionId).emit('call:incoming', {
        callId: finalCallId,
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
  
  // === PUBLIC PORTAL MESSAGE HANDLERS (for main namespace staff) ===
  
  // Handle staff connecting to a public portal session from main namespace
  socket.on('staff:connect_to_session', async (data) => {
    if (!authenticatedUser) return;
    
    const { sessionId } = data;
    const session = publicSessions.get(sessionId);
    
    if (session && !session.agentId) {
      // Assign agent to session
      session.agentId = socket.userId;
      session.agentName = socket.userDisplayName;
      session.status = 'active';
      
      // Update database
      db.run(
        'UPDATE public_chat_sessions SET assigned_to = ?, status = ? WHERE session_id = ?',
        [socket.userId, 'active', sessionId]
      );
      
      // Remove from queue
      const queueIndex = publicQueue.indexOf(sessionId);
      if (queueIndex > -1) {
        publicQueue.splice(queueIndex, 1);
        
        // Notify remaining guests of updated positions
        notifyGuestPositions();
        
        // Notify staff of updated queue
        notifyAvailableAgents();
      }
      
      // Notify guest that agent connected
      publicPortalNamespace.to(`session:${sessionId}`).emit('agent:assigned', {
        agentId: socket.userId,
        agentName: socket.userDisplayName
      });
      
      console.log(`✅ Main namespace agent ${socket.userDisplayName} connected to session ${sessionId}`);
    }
  });
  
  // Handle staff messages to guests from main namespace
  socket.on('staff:message', async (data) => {
    if (!authenticatedUser) return;
    
    const { sessionId, message } = data;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Save message to database
      db.run(
        `INSERT INTO public_chat_messages 
         (session_id, sender_type, sender_id, sender_name, message_text, message_type) 
         VALUES (?, 'staff', ?, ?, ?, 'text')`,
        [sessionId, socket.userId, socket.userDisplayName || 'Staff', message]
      );
      
      // Send to guest in session via public portal namespace
      publicPortalNamespace.to(`session:${sessionId}`).emit('agent:message', {
        messageId,
        message,
        type: 'text',
        staffName: socket.userDisplayName,
        timestamp: new Date()
      });
      
      // Send confirmation to staff via main namespace
      socket.emit('staff:message_sent', { 
        sessionId,
        messageId, 
        message,
        timestamp: new Date(),
        staffName: socket.userDisplayName 
      });
      
      // ALSO emit to main namespace for other staff to see
      io.emit('staff:message_sent', {
        sessionId,
        messageId, 
        message,
        timestamp: new Date(),
        staffName: socket.userDisplayName 
      });
      
      console.log(`📤 Main namespace staff message: ${socket.userDisplayName} -> session ${sessionId}`);
      
    } catch (error) {
      console.error('Failed to send staff message from main namespace:', error);
      socket.emit('message:error', { messageId, error: 'Failed to send message' });
    }
  });
  
  // Handle staff typing indicators from main namespace
  socket.on('staff:typing', (data) => {
    if (!authenticatedUser) return;
    
    const { sessionId, isTyping } = data;
    
    // Send typing indicator to guest via public portal namespace
    publicPortalNamespace.to(`session:${sessionId}`).emit('agent:typing', {
      isTyping
    });
  });
  
  // Handle staff disconnecting from session from main namespace
  socket.on('staff:disconnect_from_session', (data) => {
    if (!authenticatedUser) return;
    
    const { sessionId } = data;
    const session = publicSessions.get(sessionId);
    
    if (session && session.agentId === socket.userId) {
      // Remove agent assignment
      session.agentId = null;
      session.agentName = null;
      
      // Update database - store previous assignment for badge display
      db.run(
        'UPDATE public_chat_sessions SET status = ?, previously_assigned_to = assigned_to, assigned_to = NULL WHERE session_id = ? AND assigned_to = ?',
        ['waiting', sessionId, socket.userId]
      );
      
      // Put back in queue if guest is still connected
      if (!publicQueue.includes(sessionId)) {
        publicQueue.push(sessionId);
      }
      
      console.log(`🔌 Main namespace agent ${socket.userDisplayName} disconnected from session ${sessionId}`);
    }
  });
  
  // Handle staff ending session from main namespace
  socket.on('staff:end_session', (data) => {
    if (!authenticatedUser) return;
    
    const { sessionId } = data;
    const session = publicSessions.get(sessionId);
    
    if (session && session.agentId === socket.userId) {
      // Update session status
      session.status = 'ended';
      
      // Update database
      db.run(
        'UPDATE public_chat_sessions SET status = ?, ended_at = datetime("now") WHERE session_id = ?',
        ['ended', sessionId]
      );
      
      // Notify guest
      publicPortalNamespace.to(`session:${sessionId}`).emit('session:ended', {
        reason: 'Session ended by support agent'
      });
      
      // Clean up memory
      setTimeout(() => {
        publicSessions.delete(sessionId);
        console.log(`🗑️ Session ${sessionId} cleaned up from memory`);
      }, 10 * 60 * 1000); // 10 minutes
      
      console.log(`🔚 Main namespace staff ended session ${sessionId}`);
    }
  });

  socket.on('disconnect', () => {
    // Untrack connection first
    untrackConnection(socket, socket.userId || null);
    
    if (authenticatedUser) {
      console.log(`User disconnected: ${socket.userDisplayName} (${socket.id})`);
      
      // Update presence to offline
      updatePresence(socket.userId, 'offline', null);
      
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

// Built-in presence timeout management (simplified)
let presenceSettings = {
  idleTimeoutMinutes: 10,
  awayTimeoutMinutes: 30,
  offlineTimeoutMinutes: 60,
  enableAutoPresenceUpdates: true
};

// Load presence settings from database
const loadPresenceSettings = () => {
  db.all('SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?, ?, ?)', 
    ['idleTimeoutMinutes', 'awayTimeoutMinutes', 'offlineTimeoutMinutes', 'enableAutoPresenceUpdates'],
    (err, rows) => {
      if (!err && rows) {
        rows.forEach(row => {
          try {
            presenceSettings[row.setting_key] = JSON.parse(row.setting_value);
          } catch (e) {
            console.warn(`Failed to parse presence setting ${row.setting_key}`);
          }
        });
        console.log('✅ Presence timeout settings loaded:', presenceSettings);
      }
    }
  );
};

// Update user presence based on inactivity
const checkAndUpdatePresence = () => {
  if (!presenceSettings.enableAutoPresenceUpdates) return;

  const now = new Date();
  
  db.all(`
    SELECT user_id, status, last_active, is_manual
    FROM user_presence 
    WHERE status != 'offline'
  `, (err, users) => {
    if (err || !users) return;

    users.forEach(user => {
      // Skip manual statuses (busy, in_call, in_meeting, presenting)
      if (user.status === 'busy' || user.status === 'in_call' || 
          user.status === 'in_meeting' || user.status === 'presenting') {
        return;
      }

      const lastActive = new Date(user.last_active);
      const minutesInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));

      let newStatus = user.status;
      
      if (minutesInactive >= presenceSettings.offlineTimeoutMinutes) {
        newStatus = 'offline';
      } else if (minutesInactive >= presenceSettings.awayTimeoutMinutes) {
        newStatus = 'away';
      } else if (minutesInactive >= presenceSettings.idleTimeoutMinutes) {
        newStatus = 'idle';
      }

      if (newStatus !== user.status) {
        db.run('UPDATE user_presence SET status = ? WHERE user_id = ?', [newStatus, user.user_id]);
        
        // Broadcast presence update
        io.emit('presence_updated', {
          userId: user.user_id,
          status: newStatus,
          timestamp: new Date().toISOString(),
          reason: 'timeout'
        });
        
        console.log(`📍 Updated ${user.user_id} from ${user.status} to ${newStatus} (${minutesInactive}min inactive)`);
      }
    });
  });
};

// Load settings on startup and every 5 minutes
loadPresenceSettings();
setInterval(loadPresenceSettings, 5 * 60 * 1000);

// Run presence check every minute
setInterval(checkAndUpdatePresence, 60 * 1000);
console.log('✅ Built-in presence timeout management started');

// === PUBLIC PORTAL NAMESPACE ===
const publicPortalNamespace = io.of('/public-portal');
console.log('🌐 Public portal namespace created at /public-portal');

// Load existing waiting sessions from database into memory on server startup
const loadWaitingSessionsFromDatabase = () => {
  db.all(
    `SELECT session_id, visitor_name, visitor_email, session_data, created_at 
     FROM public_chat_sessions 
     WHERE status = 'waiting' 
     ORDER BY created_at ASC`,
    (err, rows) => {
      if (err) {
        console.error('❌ Error loading waiting sessions from database:', err);
        return;
      }
      
      if (rows && rows.length > 0) {
        console.log(`📋 Loading ${rows.length} waiting sessions from database...`);
        
        rows.forEach(row => {
          // Add to queue
          if (!publicQueue.includes(row.session_id)) {
            publicQueue.push(row.session_id);
          }
          
          // Add to memory sessions
          const sessionData = row.session_data ? JSON.parse(row.session_data) : {};
          publicSessions.set(row.session_id, {
            socketId: null, // No socket connected yet
            guestName: row.visitor_name,
            email: row.visitor_email,
            startTime: new Date(row.created_at),
            status: 'waiting',
            phone: sessionData.phone || null,
            department: sessionData.department || null
          });
          
          console.log(`  ✅ Loaded session: ${row.session_id} (${row.visitor_name}) - Position ${publicQueue.indexOf(row.session_id) + 1}`);
        });
        
        console.log(`📊 Queue initialized with ${publicQueue.length} waiting sessions`);
        
        // Notify staff of current queue state
        setTimeout(() => {
          notifyAvailableAgents();
        }, 1000); // Delay to ensure server is fully initialized
      } else {
        console.log('📋 No waiting sessions found in database');
      }
    }
  );
};

// Load waiting sessions on startup
loadWaitingSessionsFromDatabase();

// Public portal connection handling
publicPortalNamespace.on('connection', async (socket) => {
  console.log(`🌐 Public portal connection: ${socket.id} from ${socket.handshake.address}`);
  console.log(`🔑 Auth token present: ${socket.handshake.auth?.token ? 'Yes' : 'No'}`);
  
  // If this is a staff connection (has auth token), send immediate queue update
  if (socket.handshake.auth?.token) {
    console.log(`👤 Staff connected: ${socket.id}, sending queue update`);
    setTimeout(() => {
      console.log(`📤 Sending queue update to staff: ${publicQueue.length} sessions`);
      notifyAvailableAgents();
    }, 500); // Short delay to ensure connection is established
  }
  
  // Handle guest authentication (no JWT required)
  socket.on('guest:start_session', async (data) => {
    const { name, email, phone, department, customFields, recoverySessionId } = data;
    
    try {
      // Check for session recovery first
      if (recoverySessionId) {
        console.log(`🔄 Attempting session recovery for: ${recoverySessionId}`);
        
        // First check in-memory sessions
        let existingSession = publicSessions.get(recoverySessionId);
        
        if (!existingSession) {
          // Try to recover from database if not in memory (e.g., after server restart)
          const dbSession = await new Promise((resolve) => {
            db.get(
              `SELECT session_id, visitor_name, visitor_email, visitor_phone, visitor_department, 
                      status, assigned_to, created_at
               FROM public_chat_sessions 
               WHERE session_id = ? AND status IN ('waiting', 'active')`,
              [recoverySessionId],
              (err, row) => {
                if (err) {
                  console.error('Error recovering session from DB:', err);
                  resolve(null);
                } else {
                  resolve(row);
                }
              }
            );
          });
          
          if (dbSession) {
            // Reconstruct session from database
            existingSession = {
              sessionId: dbSession.session_id,
              guestName: dbSession.visitor_name || name || 'Guest',
              email: dbSession.visitor_email || email,
              phone: dbSession.visitor_phone || phone,
              department: dbSession.visitor_department || department,
              socketId: socket.id,
              createdAt: new Date(dbSession.created_at),
              lastReconnect: new Date(),
              agentId: dbSession.assigned_to,
              status: dbSession.status
            };
            
            // Add back to in-memory map
            publicSessions.set(recoverySessionId, existingSession);
            console.log(`📥 Recovered session from database: ${recoverySessionId} for ${existingSession.guestName}`);
          }
        }
        
        if (existingSession) {
          // Restore session
          socket.sessionId = recoverySessionId;
          socket.guestName = existingSession.guestName;
          socket.join(`session:${recoverySessionId}`);
          
          // Update session with new socket
          existingSession.socketId = socket.id;
          existingSession.lastReconnect = new Date();
          
          // Check if still in queue or already connected to agent
          const queuePosition = publicQueue.indexOf(recoverySessionId);
          if (queuePosition > -1) {
            // Still in queue - send current position
            socket.emit('session:recovered', {
              sessionId: recoverySessionId,
              queuePosition: queuePosition + 1,
              estimatedWaitTime: (queuePosition + 1) * 2,
              status: 'waiting'
            });
            
            console.log(`✅ Session recovered: ${recoverySessionId} at position ${queuePosition + 1}`);
          } else {
            // Check if connected to agent
            db.get(
              'SELECT assigned_to FROM public_chat_sessions WHERE session_id = ?',
              [recoverySessionId],
              (err, row) => {
                if (row && row.assigned_to) {
                  socket.emit('session:recovered', {
                    sessionId: recoverySessionId,
                    status: 'active',
                    agentId: row.assigned_to
                  });
                  console.log(`✅ Session recovered: ${recoverySessionId} connected to agent ${row.assigned_to}`);
                } else {
                  // Session expired, create new one
                  createNewGuestSession();
                }
              }
            );
          }
          return;
        } else {
          console.log(`❌ Recovery session ${recoverySessionId} not found or expired`);
        }
      }
      
      // Check for existing active session for this guest before creating new one
      checkForExistingSession();
      
      function checkForExistingSession() {
        // Check database for existing active sessions from same guest (by name and email)
        db.get(
          `SELECT session_id, status, created_at 
           FROM public_chat_sessions 
           WHERE visitor_name = ? AND visitor_email = ? 
           AND status IN ('waiting', 'active') 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [name, email],
          (err, existingRow) => {
            if (err) {
              console.error('Error checking for existing session:', err);
              createNewGuestSession();
              return;
            }
            
            if (existingRow) {
              // Found existing session - check if it's recent (within 30 minutes)
              const existingTime = new Date(existingRow.created_at);
              const timeDiff = Date.now() - existingTime.getTime();
              const thirtyMinutes = 30 * 60 * 1000;
              
              if (timeDiff < thirtyMinutes) {
                // Reuse existing session
                const existingSessionId = existingRow.session_id;
                
                console.log(`♻️ Reusing existing session ${existingSessionId} for ${name} (created ${Math.floor(timeDiff / 1000)}s ago)`);
                
                // Update existing session with new socket
                socket.sessionId = existingSessionId;
                socket.guestName = name;
                socket.join(`session:${existingSessionId}`);
                
                // Update in-memory session if exists
                const existingSession = publicSessions.get(existingSessionId);
                if (existingSession) {
                  existingSession.socketId = socket.id;
                  existingSession.lastReconnect = new Date();
                } else {
                  // Recreate in memory
                  publicSessions.set(existingSessionId, {
                    socketId: socket.id,
                    guestName: name,
                    email: email,
                    startTime: existingTime,
                    status: existingRow.status,
                    lastReconnect: new Date()
                  });
                }
                
                // Check queue position or connection status
                const queuePosition = publicQueue.indexOf(existingSessionId);
                if (queuePosition > -1) {
                  // Still in queue
                  socket.emit('session:started', {
                    sessionId: existingSessionId,
                    queuePosition: queuePosition + 1,
                    estimatedWaitTime: (queuePosition + 1) * 2,
                    reconnected: true
                  });
                } else if (existingRow.status === 'active') {
                  // Connected to agent
                  socket.emit('session:started', {
                    sessionId: existingSessionId,
                    status: 'active',
                    reconnected: true
                  });
                } else {
                  // Add back to queue
                  publicQueue.push(existingSessionId);
                  socket.emit('session:started', {
                    sessionId: existingSessionId,
                    queuePosition: publicQueue.length,
                    estimatedWaitTime: publicQueue.length * 2,
                    reconnected: true
                  });
                }
                
                return;
              } else {
                console.log(`⏰ Existing session ${existingRow.session_id} for ${name} is too old (${Math.floor(timeDiff / 60000)} minutes), creating new one`);
              }
            }
            
            // No suitable existing session found - create new one
            createNewGuestSession();
          }
        );
      }
      
      function createNewGuestSession() {
        const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create session in database
        db.run(
          `INSERT INTO public_chat_sessions 
           (session_id, visitor_name, visitor_email, session_data, status) 
           VALUES (?, ?, ?, ?, 'waiting')`,
          [sessionId, name, email, JSON.stringify({
            phone: phone || null,
            department: department || null,
            customFields: customFields || {}
          })]
        );
        
        // Track in memory
        publicSessions.set(sessionId, {
          socketId: socket.id,
          guestName: name,
          email: email,
          startTime: new Date(),
          status: 'waiting'
        });
        
        // Add to queue
        publicQueue.push(sessionId);
        
        // Store session ID on socket
        socket.sessionId = sessionId;
        socket.guestName = name;
        
        // Join session room
        socket.join(`session:${sessionId}`);
        
        // Send confirmation with correct queue position
        const actualPosition = publicQueue.indexOf(sessionId) + 1; // 1-based position
        socket.emit('session:started', {
          sessionId,
          queuePosition: actualPosition,
          estimatedWaitTime: actualPosition * 2 // 2 minutes per person estimate
        });
        
        // Notify available agents and update guest positions
        notifyAvailableAgents();
        notifyGuestPositions();
        
        // Notify main socket clients of new guest
        io.emit('public_queue:guest_joined', {
          sessionId,
          guestName: name,
          priority: 'normal',
          department: department || 'General Support',
          message: customFields?.initialMessage || '',
          waitTime: 0
        });
        
        console.log(`✅ Guest session started: ${sessionId} for ${name}`);
      }
      
    } catch (error) {
      console.error('Failed to start guest session:', error);
      socket.emit('session:error', { message: 'Failed to start chat session' });
    }
  });
  
  // Handle guest messages
  socket.on('guest:message', async (data) => {
    if (!socket.sessionId) {
      socket.emit('error', { message: 'No active session' });
      return;
    }
    
    const { message, type = 'text' } = data;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Save message to database
      db.run(
        `INSERT INTO public_chat_messages 
         (session_id, sender_type, sender_id, sender_name, message_text, message_type) 
         VALUES (?, 'guest', ?, ?, ?, ?)`,
        [socket.sessionId, socket.sessionId, socket.guestName || 'Guest', message, type || 'text']
      );
      
      // Get session info
      const session = publicSessions.get(socket.sessionId);
      if (session && session.agentId) {
        // Forward to assigned agent via public portal namespace
        publicPortalNamespace.to(`agent:${session.agentId}`).emit('guest:message', {
          sessionId: socket.sessionId,
          messageId,
          message,
          type,
          guestName: session.guestName,
          timestamp: new Date()
        });
        
        // ALSO emit to main namespace for singleton client
        io.emit('guest:message', {
          sessionId: socket.sessionId,
          messageId,
          message,
          type,
          guestName: session.guestName,
          timestamp: new Date()
        });
      }
      
      // Send delivery confirmation
      socket.emit('message:delivered', { messageId });
      
    } catch (error) {
      console.error('Failed to send guest message:', error);
      socket.emit('message:error', { messageId, error: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('guest:typing', (data) => {
    if (!socket.sessionId) return;
    
    const session = publicSessions.get(socket.sessionId);
    if (session && session.agentId) {
      // Send via public portal namespace
      publicPortalNamespace.to(`agent:${session.agentId}`).emit('guest:typing', {
        sessionId: socket.sessionId,
        isTyping: data.isTyping
      });
      
      // ALSO emit to main namespace for singleton client
      io.emit('guest:typing', {
        sessionId: socket.sessionId,
        isTyping: data.isTyping
      });
    }
  });
  
  // === STAFF/AGENT EVENT HANDLERS ===
  
  // Handle staff connecting to a session
  socket.on('staff:connect_to_session', async (data) => {
    if (!socket.isAgent) return;
    
    const { sessionId } = data;
    const session = publicSessions.get(sessionId);
    
    if (session && !session.agentId) {
      // Assign agent to session
      session.agentId = socket.userId;
      session.agentName = socket.userDisplayName;
      session.status = 'active';
      
      // Join agent room for this session
      socket.join(`agent:${socket.userId}`);
      socket.join(`session:${sessionId}`);
      
      // Update database
      db.run(
        'UPDATE public_chat_sessions SET assigned_to = ?, status = ? WHERE session_id = ?',
        [socket.userId, 'active', sessionId]
      );
      
      // Remove from queue
      const queueIndex = publicQueue.indexOf(sessionId);
      if (queueIndex > -1) {
        publicQueue.splice(queueIndex, 1);
        
        // Notify remaining guests of updated positions
        notifyGuestPositions();
        
        // Notify staff of updated queue
        notifyAvailableAgents();
      }
      
      // Notify guest that agent connected
      publicPortalNamespace.to(`session:${sessionId}`).emit('agent:assigned', {
        agentId: socket.userId,
        agentName: socket.userDisplayName
      });
      
      console.log(`✅ Agent ${socket.userDisplayName} connected to session ${sessionId}`);
    }
  });
  
  // Handle staff messages to guests
  socket.on('staff:message', async (data) => {
    if (!socket.isAgent) return;
    
    const { sessionId, message } = data;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Save message to database
      db.run(
        `INSERT INTO public_chat_messages 
         (session_id, sender_type, sender_id, sender_name, message_text, message_type) 
         VALUES (?, 'staff', ?, ?, ?, 'text')`,
        [sessionId, socket.userId, socket.userDisplayName || 'Staff', message]
      );
      
      // Send to guest in session
      publicPortalNamespace.to(`session:${sessionId}`).emit('agent:message', {
        messageId,
        message,
        type: 'text',
        staffName: socket.userDisplayName,
        timestamp: new Date()
      });
      
      // Send confirmation to staff via both namespaces
      socket.emit('staff:message_sent', { 
        sessionId,
        messageId, 
        message,
        timestamp: new Date(),
        staffName: socket.userDisplayName 
      });
      
      // ALSO emit to main namespace for singleton client
      io.emit('staff:message_sent', {
        sessionId,
        messageId, 
        message,
        timestamp: new Date(),
        staffName: socket.userDisplayName 
      });
      
      console.log(`📤 Staff message: ${socket.userDisplayName} -> session ${sessionId}`);
      
    } catch (error) {
      console.error('Failed to send staff message:', error);
      socket.emit('message:error', { messageId, error: 'Failed to send message' });
    }
  });
  
  // Handle staff typing indicators
  socket.on('staff:typing', (data) => {
    if (!socket.isAgent) return;
    
    const { sessionId, isTyping } = data;
    
    // Send typing indicator to guest
    publicPortalNamespace.to(`session:${sessionId}`).emit('agent:typing', {
      isTyping
    });
  });
  
  // Handle staff disconnecting from session
  socket.on('staff:disconnect_from_session', (data) => {
    if (!socket.isAgent) return;
    
    const { sessionId } = data;
    const session = publicSessions.get(sessionId);
    
    if (session && session.agentId === socket.userId) {
      // Remove agent assignment
      session.agentId = null;
      session.agentName = null;
      
      // Update database - store previous assignment for badge display
      db.run(
        'UPDATE public_chat_sessions SET status = ?, previously_assigned_to = assigned_to, assigned_to = NULL WHERE session_id = ? AND assigned_to = ?',
        ['waiting', sessionId, socket.userId]
      );
      
      // Put back in queue if guest is still connected
      if (!publicQueue.includes(sessionId)) {
        publicQueue.push(sessionId);
      }
      
      console.log(`🔌 Agent ${socket.userDisplayName} disconnected from session ${sessionId}`);
    }
  });
  
  // Handle staff ending session
  socket.on('staff:end_session', (data) => {
    if (!socket.isAgent) return;
    
    const { sessionId } = data;
    const session = publicSessions.get(sessionId);
    
    if (session && session.agentId === socket.userId) {
      // Update session status
      session.status = 'ended';
      
      // Update database
      db.run(
        'UPDATE public_chat_sessions SET status = ?, ended_at = datetime("now") WHERE session_id = ?',
        ['ended', sessionId]
      );
      
      // Notify guest
      publicPortalNamespace.to(`session:${sessionId}`).emit('session:ended', {
        reason: 'Session ended by support agent'
      });
      
      // Clean up memory
      setTimeout(() => {
        publicSessions.delete(sessionId);
      }, 5000);
      
      console.log(`✅ Session ${sessionId} ended by ${socket.userDisplayName}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.sessionId) {
      const session = publicSessions.get(socket.sessionId);
      if (session) {
        // Update status to abandoned when guest disconnects
        db.run(
          'UPDATE public_chat_sessions SET status = ?, ended_at = datetime("now") WHERE session_id = ?',
          ['abandoned', socket.sessionId]
        );
        
        // Remove from queue if waiting
        const queueIndex = publicQueue.indexOf(socket.sessionId);
        if (queueIndex > -1) {
          publicQueue.splice(queueIndex, 1);
          
          // Notify remaining guests of updated positions
          notifyGuestPositions();
          
          // Notify staff of updated queue
          notifyAvailableAgents();
          
          // Notify main socket clients of guest leaving
          io.emit('public_queue:guest_left', {
            sessionId: socket.sessionId,
            guestName: session.guestName
          });
        }
        
        // Notify agent if assigned
        if (session.agentId) {
          publicPortalNamespace.to(`agent:${session.agentId}`).emit('guest:disconnected', {
            sessionId: socket.sessionId,
            guestName: session.guestName
          });
        }
        
        // Clean up after 10 minutes (for reconnection window)
        setTimeout(() => {
          publicSessions.delete(socket.sessionId);
          console.log(`🧹 Cleaned up session ${socket.sessionId} after 10 minutes`);
        }, 10 * 60 * 1000); // 10 minutes
      }
    }
    
    // Handle agent disconnect
    if (socket.isAgent) {
      console.log(`🌐 Agent disconnection: ${socket.userDisplayName} (${socket.id})`);
      // TODO: Handle agent disconnect - reassign sessions, update availability
    } else {
      console.log(`🌐 Public portal disconnection: ${socket.id}`);
    }
  });
});

// Helper function to notify guests of their updated queue positions
const notifyGuestPositions = () => {
  publicQueue.forEach((sessionId, index) => {
    const position = index + 1; // 1-based position
    const estimatedWaitTime = position * 2; // 2 minutes per person
    
    // Emit to specific guest session room
    publicPortalNamespace.to(`session:${sessionId}`).emit('queue:position_update', {
      queuePosition: position,
      estimatedWaitTime: estimatedWaitTime
    });
  });
};

// Helper function to notify available agents
const notifyAvailableAgents = () => {
  // Get all online agents with public chat permissions
  publicPortalNamespace.emit('queue:update', {
    queueLength: publicQueue.length,
    waitingSessions: publicQueue.map((sessionId, index) => {
      const session = publicSessions.get(sessionId);
      return {
        sessionId,
        guestName: session?.guestName || 'Guest',
        waitTime: Math.floor((Date.now() - session?.startTime) / 1000), // seconds
        queuePosition: index + 1 // Add position to staff display
      };
    })
  });
};

// Agent-specific handlers (agents connect to same namespace with auth)
publicPortalNamespace.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // No token = guest user, allow
    return next();
  }
  
  try {
    // Verify agent JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, username, displayName } = decoded;
    
    // Check if user has public chat permissions
    db.get(
      `SELECT u.*, GROUP_CONCAT(rp.permission) as permissions
       FROM users u 
       LEFT JOIN role_permissions rp ON u.role_id = rp.role_id
       WHERE u.username = ?
       GROUP BY u.id`,
      [username],
      (err, user) => {
        if (err || !user) {
          return next(new Error('Authentication failed'));
        }
        
        const permissions = user.permissions ? user.permissions.split(',') : [];
        if (!permissions.includes('chat.public_queue') && user.role_id !== 1) {
          return next(new Error('Insufficient permissions for public chat'));
        }
        
        // Store user info on socket
        socket.userId = userId;
        socket.userDisplayName = displayName;
        socket.isAgent = true;
        
        next();
      }
    );
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Recover active sessions from database on startup
async function recoverSessionsFromDatabase() {
  return new Promise((resolve) => {
    db.all(
      `SELECT session_id, visitor_name, visitor_email, visitor_phone, visitor_department, 
              status, assigned_to, created_at
       FROM public_chat_sessions 
       WHERE status IN ('waiting', 'active')
       ORDER BY created_at ASC`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error recovering sessions from database:', err);
          resolve();
          return;
        }
        
        let waitingCount = 0;
        let activeCount = 0;
        
        rows.forEach(row => {
          const session = {
            sessionId: row.session_id,
            guestName: row.visitor_name || 'Guest',
            email: row.visitor_email,
            phone: row.visitor_phone,
            department: row.visitor_department,
            socketId: null, // Will be set when guest reconnects
            createdAt: new Date(row.created_at),
            lastReconnect: null,
            agentId: row.assigned_to,
            status: row.status
          };
          
          publicSessions.set(row.session_id, session);
          
          if (row.status === 'waiting') {
            publicQueue.push(row.session_id);
            waitingCount++;
          } else if (row.status === 'active') {
            activeCount++;
          }
        });
        
        console.log(`📥 Recovered ${waitingCount} waiting sessions and ${activeCount} active sessions from database`);
        resolve();
      }
    );
  });
}

// Start the server
server.listen(PORT, async () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
  console.log(`🔗 CORS enabled for: http://localhost:80`);
  console.log(`💬 Ready to handle chat messages and WebRTC signaling`);
  console.log(`👥 Ready for user presence tracking with automatic timeouts`);
  console.log(`📞 Ready for audio/video call signaling`);
  
  // Recover sessions from database
  await recoverSessionsFromDatabase();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing Socket.io server...');
  console.log('✅ Built-in presence timeout management stopped');
  
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

module.exports = server;