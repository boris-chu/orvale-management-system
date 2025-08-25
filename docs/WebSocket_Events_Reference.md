# WebSocket Events Reference - Chat System

## 🔌 **Connection & Authentication**

### Authentication
```javascript
// Client -> Server: Authenticate connection
socket.emit('authenticate', token);

// Server -> Client: Authentication response
socket.on('authenticated', { userId, displayName, role });
socket.on('auth:error', errorMessage);
```

## 💬 **Core Chat Events (11 Complete)**

### **Client -> Server Events**

#### 1. Channel Management
```javascript
// Join a channel
socket.emit('join_channel', channelId);

// Leave a channel
socket.emit('leave_channel', channelId);
```

#### 2. Messaging
```javascript
// Send message
socket.emit('chat:send_message', {
  channelId,
  message,
  messageType: 'text|file|image|gif|ticket_link',
  replyToId: null // for threaded replies
});

// Mark messages as read
socket.emit('message_read', {
  channelId,
  messageId: null // or specific message ID
});
```

#### 3. Real-time Indicators
```javascript
// Typing indicator
socket.emit('chat:typing', {
  channelId,
  isTyping: true|false
});

// Update presence status
socket.emit('update_presence', {
  status: 'online|away|busy|offline',
  statusMessage: 'Custom status',
  customStatus: 'Working on tickets'
});
```

#### 4. File & System Events
```javascript
// File upload notification
socket.emit('file_uploaded', {
  channelId,
  fileName,
  fileSize,
  fileType,
  messageId
});

// System broadcast (admin only)
socket.emit('system_broadcast', {
  message: 'System maintenance in 10 minutes',
  priority: 'high|normal|low'
});

// Channel updates
socket.emit('channel_updated', {
  channelId,
  changes: { name: 'New Name', description: 'Updated description' }
});
```

### **Server -> Client Events**

#### 1. Message Events
```javascript
// New message received
socket.on('chat:new_message', {
  id,
  channelId,
  userId,
  userDisplayName,
  message,
  messageType,
  replyToId,
  timestamp
});

// Message read receipt
socket.on('message_read_receipt', {
  userId,
  userDisplayName,
  channelId,
  messageId,
  readAt
});
```

#### 2. User Activity
```javascript
// User joined channel
socket.on('user_joined', {
  userId,
  userDisplayName,
  userRole,
  channelId,
  joinedAt
});

// User left channel
socket.on('user_left', {
  userId,
  userDisplayName,
  channelId,
  leftAt,
  reason: 'disconnect|leave'
});

// User typing
socket.on('chat:user_typing', {
  userId,
  userDisplayName,
  isTyping
});
```

#### 3. Presence Updates
```javascript
// Presence updated
socket.on('presence_updated', {
  userId,
  userDisplayName,
  status,
  statusMessage,
  customStatus,
  timestamp,
  reason: 'status_change|disconnect'
});
```

#### 4. System Events
```javascript
// System broadcast
socket.on('system_broadcast_received', {
  message,
  priority,
  from,
  broadcastAt,
  broadcastId
});

// Channel updated
socket.on('channel_updated', {
  channelId,
  changes,
  updatedBy,
  updaterName,
  updatedAt
});

// File upload notification
socket.on('file_upload_notification', {
  messageId,
  channelId,
  uploadedBy,
  uploaderName,
  fileName,
  fileSize,
  fileType,
  uploadedAt
});
```

## 📞 **WebRTC Call Events**

### **Call Management**
```javascript
// Initiate call
socket.emit('call:invite', {
  targetUserId,
  callType: 'audio|video',
  offer
});

// Accept call
socket.emit('call:accept', {
  callId,
  answer,
  targetUserId
});

// Reject call
socket.emit('call:reject', {
  callId,
  targetUserId
});

// End call
socket.emit('call:end', {
  callId,
  targetUserId
});
```

### **Call Status Events**
```javascript
// Incoming call
socket.on('call:incoming', {
  callId,
  from,
  fromName,
  callType,
  offer
});

// Call accepted
socket.on('call:accepted', {
  callId,
  answer
});

// Call rejected
socket.on('call:rejected', {
  callId
});

// Call ended
socket.on('call:ended', {
  callId
});
```

### **WebRTC Signaling**
```javascript
// ICE candidate exchange
socket.emit('call:ice_candidate', {
  targetUserId,
  candidate
});

socket.on('call:ice_candidate', {
  from,
  candidate
});
```

## 🎯 **Presence & Status**

### **Presence Management**
```javascript
// Set status (legacy format)
socket.emit('presence:set_status', 'online|away|busy|offline');

// Get online users
socket.emit('presence:get_online_users', (onlineUsers) => {
  // onlineUsers: [{ userId, status, connectionCount }]
});

// Presence update received
socket.on('presence:update', {
  userId,
  status,
  connectionCount
});
```

## ⚡ **Connection Management**

### **Multi-tab Support**
- Users can have multiple browser tabs connected
- Each tab maintains its own socket connection
- User appears online if ANY tab is connected
- Presence updates only when ALL tabs disconnect

### **Error Handling**
```javascript
// General errors
socket.on('chat:error', errorMessage);
socket.on('presence:error', errorMessage);
socket.on('broadcast:error', errorMessage);
```

### **Connection Health**
```javascript
// Connection established
socket.on('connect', () => {
  // Authenticate immediately
  socket.emit('authenticate', getJWTToken());
});

// Connection lost
socket.on('disconnect', () => {
  // Handle reconnection logic
});
```

## 🔒 **Permission Requirements**

### **Chat Permissions**
- `chat.access` - Basic chat access
- `chat.send_messages` - Send messages
- `chat.create_channels` - Create channels
- `chat.manage_channels` - Update/delete channels
- `chat.send_broadcasts` - System broadcasts (admin only)

### **Call Permissions**
- `call.audio` - Audio calls
- `call.video` - Video calls
- `call.view_history` - View call history

## 📝 **Usage Examples**

### **Basic Chat Connection**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Authenticate
socket.emit('authenticate', localStorage.getItem('jwt'));

socket.on('authenticated', (user) => {
  console.log('Connected as:', user.displayName);
  
  // Join a channel
  socket.emit('join_channel', 1);
});

// Listen for new messages
socket.on('chat:new_message', (message) => {
  displayMessage(message);
});

// Send a message
const sendMessage = (channelId, text) => {
  socket.emit('chat:send_message', {
    channelId,
    message: text,
    messageType: 'text'
  });
};
```

### **Presence Management**
```javascript
// Update status
const updateStatus = (status, message = null) => {
  socket.emit('update_presence', {
    status,
    statusMessage: message,
    customStatus: 'Working on tickets'
  });
};

// Listen for presence updates
socket.on('presence_updated', (presence) => {
  updateUserPresence(presence.userId, presence.status);
});
```

---

## 🚀 **Development Notes**

- **Server**: Socket.io server runs on port 3001
- **CORS**: Configured for localhost:80 (Next.js)
- **Authentication**: JWT required for all operations
- **Database**: All events update SQLite database in real-time
- **Logging**: Comprehensive console logging for debugging
- **Cleanup**: Automatic stale connection cleanup every 5 minutes

## 📊 **Event Statistics**

- **Total Events**: 15+ client->server, 12+ server->client
- **Chat Events**: 11 core events (complete)
- **Call Events**: 8 WebRTC signaling events
- **System Events**: 4 admin/broadcast events
- **All Events**: ✅ **Production Ready**