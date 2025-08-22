# Chat System Implementation Plan
*Slack/MS Teams Style Real-time Chat for Orvale Management System*

## 🎯 **Project Overview**

Create a comprehensive real-time chat system integrated with the Orvale Management System, featuring both full-page chat application and minimized chat widget for seamless communication across all system pages.

### **Key Features**
- **Full-page chat app** (similar to Slack/Teams)
- **Minimized chat widget** (persistent across pages)
- **Real-time messaging** with WebSocket
- **Online/offline presence** indicators
- **Team channels** and **direct messages**
- **File sharing** and **ticket integration**

---

## 🏗️ **Phase-by-Phase Implementation**

### **Phase 1: Foundation & Database Schema** 
*Estimated: 2-3 days*

#### **1.1 Database Design**
```sql
-- Chat channels (teams, departments, general)
CREATE TABLE chat_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('public', 'private', 'direct')) DEFAULT 'public',
    created_by TEXT NOT NULL,
    team_id TEXT, -- Link to teams table
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Channel members
CREATE TABLE chat_channel_members (
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('member', 'admin', 'owner')) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id),
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(username)
);

-- Chat messages
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('text', 'file', 'image', 'ticket_link', 'system')) DEFAULT 'text',
    reply_to_id INTEGER, -- For threaded messages
    ticket_reference TEXT, -- Link to tickets
    file_attachment TEXT, -- File path or URL
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id)
);

-- User presence tracking
CREATE TABLE user_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
    status_message TEXT,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_id TEXT, -- For WebSocket connection tracking
    FOREIGN KEY (user_id) REFERENCES users(username)
);

-- Message reactions (emojis)
CREATE TABLE message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    UNIQUE(message_id, user_id, emoji)
);
```

#### **1.2 WebSocket Infrastructure**
- Set up Socket.io server integration with Next.js
- Create WebSocket middleware for authentication
- Basic connection/disconnection handling
- User presence tracking system

#### **1.3 RBAC Permissions**
```javascript
// New chat permissions
const chatPermissions = [
    'chat.access_channels',      // Basic chat access
    'chat.create_channels',      // Create new channels
    'chat.manage_channels',      // Admin channel management
    'chat.delete_messages',      // Delete any messages
    'chat.moderate_channels',    // Moderate channel content
    'chat.access_private',       // Access private channels
    'chat.send_files',           // Upload/share files
    'chat.create_direct'         // Create direct message channels
];
```

---

### **Phase 2: Basic Chat API & Real-time Foundation**
*Estimated: 3-4 days*

#### **2.1 Core API Endpoints**
```javascript
// Channel Management
GET    /api/chat/channels              // Get user's channels
POST   /api/chat/channels              // Create new channel
PUT    /api/chat/channels/[id]         // Update channel
DELETE /api/chat/channels/[id]         // Delete channel
POST   /api/chat/channels/[id]/join    // Join channel
POST   /api/chat/channels/[id]/leave   // Leave channel

// Messages
GET    /api/chat/channels/[id]/messages     // Get channel messages (paginated)
POST   /api/chat/channels/[id]/messages     // Send message
PUT    /api/chat/messages/[id]              // Edit message
DELETE /api/chat/messages/[id]              // Delete message
POST   /api/chat/messages/[id]/reactions    // Add reaction

// User Presence
GET    /api/chat/presence                   // Get online users
PUT    /api/chat/presence                   // Update user status
GET    /api/chat/users/[id]/presence        // Get specific user status

// Direct Messages
POST   /api/chat/direct                     // Create/get DM channel
GET    /api/chat/direct                     // Get user's DM channels
```

#### **2.2 WebSocket Events**
```javascript
// Client -> Server Events
socket.emit('join_channel', { channelId })
socket.emit('leave_channel', { channelId })
socket.emit('send_message', { channelId, message, type })
socket.emit('typing_start', { channelId })
socket.emit('typing_stop', { channelId })
socket.emit('update_presence', { status, statusMessage })

// Server -> Client Events
socket.on('message_received', { message, channel })
socket.on('user_joined', { user, channel })
socket.on('user_left', { user, channel })
socket.on('user_typing', { user, channel })
socket.on('presence_updated', { user, status })
socket.on('channel_updated', { channel })
```

#### **2.3 Basic Authentication Integration**
- Integrate with existing auth system
- JWT token validation for WebSocket connections
- User session management

---

### **Phase 3: Full-page Chat Application UI**
*Estimated: 4-5 days*

#### **3.1 Main Chat Layout** (`/chat` page)
```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Orvale Management  [Chat] [Tickets] [Profile] [Logout]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │  Channels   │ │           Chat Messages                 │ │
│ │             │ │                                         │ │
│ │ # general   │ │ John: Hey team, working on ticket...   │ │
│ │ # helpdesk  │ │ Jane: @John I can help with that       │ │
│ │ # dev-team  │ │                                         │ │
│ │             │ │ [typing indicator: Bob is typing...]   │ │
│ │ 🟢 Online   │ │                                         │ │
│ │ • John      │ │                                         │ │
│ │ • Jane      │ │ ┌─────────────────────────────────────┐ │ │
│ │ ⚫ Offline  │ │ │ Type a message...            [Send] │ │ │
│ │ • Bob       │ │ └─────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### **3.2 Core Components**
- **ChatLayout**: Main layout wrapper
- **ChannelSidebar**: Channel list with online users
- **MessageArea**: Scrollable message display
- **MessageInput**: Text input with emoji picker
- **MessageBubble**: Individual message component
- **TypingIndicator**: Real-time typing status
- **UserPresence**: Online/offline indicators

#### **3.3 UI Features**
- **Message formatting**: Basic text, @mentions, #channel links
- **Timestamp display**: Relative time (5m ago, 2h ago, etc.)
- **Message grouping**: Group consecutive messages from same user
- **Auto-scroll**: Scroll to bottom on new messages
- **Unread indicators**: Bold channel names, message counts
- **Search functionality**: Search messages and channels

---

### **Phase 4: Minimized Chat Widget**
*Estimated: 2-3 days*

#### **4.1 Mini Chat Component**
```
┌─────────────────────────────────────────┐
│ 💬 Chat (3)                        [×] │ ← Collapsible header
├─────────────────────────────────────────┤
│ 🟢 John Smith    2m                     │ ← Recent messages
│ 🟡 Jane Doe      5m                     │
│ ⚫ Bob Wilson    1h                     │
├─────────────────────────────────────────┤
│ Quick message...              [Send]    │ ← Quick input
└─────────────────────────────────────────┘
```

#### **4.2 Widget Features**
- **Persistent position**: Fixed bottom-right corner
- **Collapsible**: Expand/collapse with header click
- **Recent activity**: Show 3-5 most recent conversations
- **Quick access**: Fast switch to full chat page
- **Notification badges**: Unread message counts
- **Presence indicators**: Online/offline status dots

#### **4.3 Integration Points**
- Show on all pages except `/chat`
- Maintain state when navigating between pages
- Quick message sending without leaving current page
- Click to expand to full chat page

---

### **Phase 5: Advanced Chat Features**
*Estimated: 3-4 days*

#### **5.1 Channel Management**
- **Create channels**: Public/private channel creation
- **Channel settings**: Description, member management
- **Channel permissions**: Admin/member roles
- **Archive channels**: Soft delete with search
- **Channel discovery**: Browse/join public channels

#### **5.2 Direct Messages**
- **DM creation**: Click user to start DM
- **Group DMs**: Multi-user direct conversations
- **DM organization**: Recent/pinned conversations
- **User search**: Find users to message

#### **5.3 Message Features**
- **Message editing**: Edit sent messages (with indicator)
- **Message deletion**: Delete messages (soft delete)
- **Message reactions**: Emoji reactions (👍, ❤️, 😂, etc.)
- **Reply threads**: Threaded conversations
- **Message formatting**: **bold**, *italic*, `code`, links

---

### **Phase 6: File Sharing & Ticket Integration**
*Estimated: 2-3 days*

#### **6.1 File Sharing**
- **File upload**: Drag & drop file sharing
- **Image preview**: Inline image display
- **File types**: Support for common file types
- **File permissions**: Check user permissions for file sharing
- **File storage**: Secure file storage system

#### **6.2 Ticket Integration**
- **Ticket links**: Share ticket links with preview
- **Ticket notifications**: Auto-messages for ticket updates
- **Ticket discussions**: Channel for specific tickets
- **Quick ticket creation**: Create tickets from chat messages
- **Status updates**: Ticket status changes in chat

#### **6.3 Smart Features**
- **@mentions**: Notify users when mentioned
- **Channel notifications**: Configurable notification settings
- **Search integration**: Search across messages and files
- **Message history**: Persistent message storage

---

### **Phase 7: Enhanced User Experience & Polish**
*Estimated: 2-3 days*

#### **7.1 Performance Optimizations**
- **Message pagination**: Infinite scroll with lazy loading
- **Virtual scrolling**: Handle large message lists
- **Connection management**: Robust WebSocket reconnection
- **Offline support**: Basic offline message queuing
- **Caching**: Local storage for recent messages

#### **7.2 Accessibility & Polish**
- **Keyboard navigation**: Full keyboard accessibility
- **Screen reader support**: ARIA labels and announcements
- **Dark mode**: Consistent with system theme
- **Mobile responsive**: Mobile-friendly interface
- **Loading states**: Proper loading indicators

#### **7.3 Admin Features**
- **Message moderation**: Admin delete/edit capabilities
- **Channel analytics**: Usage statistics
- **User management**: Ban/mute capabilities
- **Audit logging**: Chat activity logging
- **Backup/export**: Message history export

---

## 🛠️ **Technical Stack**

### **Frontend**
- **Framework**: Next.js 15 + React 19
- **UI Library**: Material-UI (consistent with existing system)
- **Real-time**: Socket.io-client
- **State Management**: React Context + useReducer
- **Animations**: Framer Motion (for smooth interactions)

### **Backend**
- **API**: Next.js API routes
- **Real-time**: Socket.io server
- **Database**: SQLite (existing system)
- **File Storage**: Local file system or cloud storage
- **Authentication**: Existing JWT system

### **WebSocket Server Setup**
```javascript
// pages/api/socket.js
import { Server } from 'socket.io'
import { verifyJWT } from '@/lib/auth'

export default function handler(req, res) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    })
    
    // Authentication middleware
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token
      const user = await verifyJWT(token)
      if (user) {
        socket.userId = user.username
        next()
      } else {
        next(new Error('Authentication error'))
      }
    })
    
    io.on('connection', (socket) => {
      // Handle chat events
    })
    
    res.socket.server.io = io
  }
  res.end()
}
```

---

## 🎯 **Success Metrics**

### **Phase 1-2 Success Criteria**
- ✅ Database schema created and migrated
- ✅ WebSocket connection established
- ✅ Basic presence tracking working
- ✅ Users can send/receive messages

### **Phase 3-4 Success Criteria**
- ✅ Full chat page functional
- ✅ Mini chat widget operational
- ✅ Real-time messaging working
- ✅ Channel switching smooth

### **Phase 5-7 Success Criteria**
- ✅ File sharing operational
- ✅ Ticket integration working
- ✅ Admin features functional
- ✅ Performance benchmarks met
- ✅ Mobile responsive design

---

## 📋 **Implementation Timeline**

| Phase | Duration | Dependencies | Deliverables |
|-------|----------|--------------|--------------|
| **Phase 1** | 2-3 days | Database access, Auth system | Schema, WebSocket foundation |
| **Phase 2** | 3-4 days | Phase 1 complete | Core APIs, Real-time events |
| **Phase 3** | 4-5 days | Phase 2 complete | Full chat page |
| **Phase 4** | 2-3 days | Phase 3 complete | Mini chat widget |
| **Phase 5** | 3-4 days | Phase 4 complete | Advanced features |
| **Phase 6** | 2-3 days | Phase 5 complete | File & ticket integration |
| **Phase 7** | 2-3 days | Phase 6 complete | Polish & optimization |

**Total Estimated Duration**: 18-25 days (3.5-5 weeks)

---

## 🔒 **Security Considerations**

1. **Message Encryption**: Consider end-to-end encryption for sensitive channels
2. **Permission Validation**: Server-side permission checks for all operations
3. **Rate Limiting**: Prevent spam and DoS attacks
4. **Input Sanitization**: Prevent XSS attacks in messages
5. **File Upload Security**: Validate and scan uploaded files
6. **Audit Logging**: Log all chat activities for compliance

---

### **Phase 8: Audio/Video Calls Foundation**
*Estimated: 3-4 days*

#### **8.1 WebRTC Infrastructure**
- **WebRTC Setup**: Configure peer-to-peer connections
- **STUN Server**: Use free Google STUN servers for NAT traversal
- **Codec Configuration**: Set up Opus (audio) and H.264 (video) codecs
- **Call Signaling**: WebSocket-based call initiation/management

#### **8.2 Call Database Schema**
```sql
-- Call sessions tracking
CREATE TABLE call_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER,
    initiator_user_id TEXT NOT NULL,
    call_type TEXT CHECK(call_type IN ('audio', 'video', 'screen_share')) NOT NULL,
    participants TEXT NOT NULL, -- JSON array of user IDs
    status TEXT CHECK(status IN ('ringing', 'active', 'ended', 'missed')) DEFAULT 'ringing',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    recording_path TEXT,
    end_reason TEXT, -- 'completed', 'declined', 'timeout', 'error'
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (initiator_user_id) REFERENCES users(username)
);

-- Call participants details
CREATE TABLE call_participants (
    call_session_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    connection_quality TEXT, -- 'excellent', 'good', 'poor', 'disconnected'
    PRIMARY KEY (call_session_id, user_id),
    FOREIGN KEY (call_session_id) REFERENCES call_sessions(id),
    FOREIGN KEY (user_id) REFERENCES users(username)
);
```

#### **8.3 Call API Endpoints**
```javascript
// Call Management
POST   /api/chat/calls/initiate        // Start new call
POST   /api/chat/calls/[id]/answer     // Accept incoming call
POST   /api/chat/calls/[id]/decline    // Decline call
POST   /api/chat/calls/[id]/end        // End active call
GET    /api/chat/calls/[id]/status     // Get call status
GET    /api/chat/calls/history         // Get call history

// WebRTC Signaling
POST   /api/chat/calls/[id]/offer      // Send WebRTC offer
POST   /api/chat/calls/[id]/answer     // Send WebRTC answer
POST   /api/chat/calls/[id]/ice        // Exchange ICE candidates
```

#### **8.4 WebSocket Call Events**
```javascript
// Call Signaling Events
socket.emit('call_initiate', { channelId, callType, targetUsers })
socket.emit('call_accept', { sessionId })
socket.emit('call_decline', { sessionId, reason })
socket.emit('call_end', { sessionId })
socket.emit('webrtc_offer', { sessionId, offer, targetUser })
socket.emit('webrtc_answer', { sessionId, answer, targetUser })
socket.emit('webrtc_ice_candidate', { sessionId, candidate, targetUser })

// Call Status Events
socket.on('incoming_call', { sessionId, caller, callType, participants })
socket.on('call_accepted', { sessionId, participant })
socket.on('call_declined', { sessionId, participant, reason })
socket.on('call_ended', { sessionId, duration, endReason })
socket.on('call_participant_joined', { sessionId, participant })
socket.on('call_participant_left', { sessionId, participant })
socket.on('webrtc_offer_received', { sessionId, offer, fromUser })
socket.on('webrtc_answer_received', { sessionId, answer, fromUser })
socket.on('webrtc_ice_candidate_received', { sessionId, candidate, fromUser })
```

---

### **Phase 9: Audio Calls Implementation**
*Estimated: 2-3 days*

#### **9.1 Audio Call Components**
- **CallInitiator**: Button to start audio calls from chat
- **IncomingCallModal**: Accept/decline incoming calls
- **AudioCallWidget**: Active call controls and status
- **CallHistory**: List of past calls with duration/status

#### **9.2 Audio Call Features**
- **1-on-1 Audio**: Direct voice calls between users
- **Group Audio**: Conference calls for multiple participants
- **Call Controls**: Mute/unmute, volume, speaker selection
- **Call Quality**: Real-time connection quality indicators
- **Call History**: Persistent call logs with duration

#### **9.3 Audio Call UI**
```
┌─────────────────────────────────────────────────────────────┐
│ # helpdesk-team                                    [📞] [📹] │
├─────────────────────────────────────────────────────────────┤
│ John: Server issue needs immediate attention                │
│ Jane: @John Let me call you right now                      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📞 Audio Call - 05:23                      [End Call]  │ │
│ │                                                         │ │
│ │ 🟢 Jane Smith          🟢 John Doe                     │ │
│ │ [🎤] Unmuted          [🎤] Muted                       │ │
│ │                                                         │ │
│ │ [🔇] [🎤] [📞]    Connection: Excellent                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### **9.4 Audio Codec Configuration**
```javascript
// Optimal audio settings for IT support
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1, // Mono for voice calls
    bitrate: 32000   // 32kbps Opus codec
  }
};
```

---

### **Phase 10: Video Calls Implementation**
*Estimated: 2-3 days*

#### **10.1 Video Call Components**
- **VideoCallGrid**: Multi-participant video layout
- **VideoControls**: Camera on/off, video quality settings
- **VideoSettings**: Camera selection, resolution preferences
- **FullscreenVideo**: Maximize video for better visibility

#### **10.2 Video Call Features**
- **1-on-1 Video**: Face-to-face video calls
- **Group Video**: Multi-participant video conferences
- **Camera Controls**: On/off, switch cameras (front/back)
- **Video Quality**: Adaptive quality based on bandwidth
- **Picture-in-Picture**: Minimize video while using other features

#### **10.3 Video Call UI**
```
┌─────────────────────────────────────────────────────────────┐
│ 📹 Video Call - helpdesk-team (3 participants)    [End]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │      Jane       │ │      John       │ │       Bob       │ │
│ │  [video feed]   │ │  [video feed]   │ │  [video feed]   │ │
│ │     🎤 📹       │ │     🎤 📹       │ │     🔇 📹       │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                             │
│ [🔇] [📹] [🖥️] [💬] [⚙️]                                  │
│ Mute  Cam  Share  Chat Settings                            │
└─────────────────────────────────────────────────────────────┘
```

#### **10.4 Video Codec Configuration**
```javascript
// Optimized video settings for IT support
const videoConstraints = {
  video: {
    width: { min: 320, ideal: 1280, max: 1920 },
    height: { min: 240, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 30 },
    bitrate: 800000 // 800kbps for 720p H.264
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    bitrate: 64000 // 64kbps Opus for video calls
  }
};
```

---

### **Phase 11: Screen Sharing Implementation**
*Estimated: 1-2 days*

#### **11.1 Screen Sharing Features**
- **Full Screen**: Share entire desktop
- **Application Window**: Share specific application
- **Browser Tab**: Share specific browser tab
- **Screen Annotation**: Basic drawing tools for screen sharing
- **Remote Control**: Allow remote assistance (optional)

#### **11.2 Screen Sharing UI**
```
┌─────────────────────────────────────────────────────────────┐
│ 🖥️ John is sharing screen                         [Stop]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │           [Shared Screen Content]                       │ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────┐ Quality: High  👥 3 viewers               │
│ │    John     │ [📹] [🎤] [💬] [🖊️]                        │
│ │ [presenter] │ Cam  Mic   Chat Annotate                   │
│ └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

#### **11.3 Screen Sharing Implementation**
```javascript
// Screen capture API
async function startScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { max: 1920 },
        height: { max: 1080 },
        frameRate: { max: 30 }
      },
      audio: true // Include system audio
    });
    
    // Replace video track in existing peer connection
    const videoTrack = screenStream.getVideoTracks()[0];
    await peerConnection.getSenders().find(sender => 
      sender.track && sender.track.kind === 'video'
    ).replaceTrack(videoTrack);
    
  } catch (error) {
    console.error('Screen sharing failed:', error);
  }
}
```

---

### **Phase 12: Advanced Call Features**
*Estimated: 2-3 days*

#### **12.1 Group Call Management**
- **TURN Server Setup**: For corporate firewall compatibility
- **SFU Integration**: Support for 5+ participants (optional)
- **Call Moderator**: Host controls for large meetings
- **Participant Management**: Mute/unmute participants, remove users

#### **12.2 Call Recording & History**
- **Call Recording**: Optional recording with user consent
- **Recording Storage**: Secure storage of call recordings
- **Call Analytics**: Duration, participants, quality metrics
- **Call Search**: Search call history by participants/date

#### **12.3 Integration Features**
- **Ticket Calls**: Start calls directly from ticket discussions
- **Call Notifications**: Integrate with system notification system
- **Calendar Integration**: Schedule calls for future times
- **Call Reports**: Generate call usage reports for teams

#### **12.4 Advanced Settings**
```javascript
// Adaptive quality based on network conditions
const adaptiveSettings = {
  excellent: { video: '1080p', audio: '128kbps' },
  good: { video: '720p', audio: '64kbps' },
  poor: { video: '480p', audio: '32kbps' },
  unstable: { video: 'audio-only', audio: '16kbps' }
};

// Automatic quality adjustment
peerConnection.getStats().then(stats => {
  const quality = analyzeConnectionQuality(stats);
  adjustCallQuality(adaptiveSettings[quality]);
});
```

---

## 📊 **Updated Implementation Timeline**

| Phase | Duration | Focus Area | Dependencies |
|-------|----------|------------|--------------|
| **Phase 1-7** | 18-25 days | Chat System | Core functionality |
| **Phase 8** | 3-4 days | WebRTC Foundation | Phase 2 complete |
| **Phase 9** | 2-3 days | Audio Calls | Phase 8 complete |
| **Phase 10** | 2-3 days | Video Calls | Phase 9 complete |
| **Phase 11** | 1-2 days | Screen Sharing | Phase 10 complete |
| **Phase 12** | 2-3 days | Advanced Features | Phase 11 complete |

**Total with Audio/Video**: 28-40 days (5.5-8 weeks)

---

## 💰 **Updated Cost Analysis**

### **Development Costs (Time)**
- **Chat Only**: 18-25 days
- **Chat + Audio/Video**: 28-40 days  
- **Additional Effort**: 10-15 days for full A/V features

### **Operational Costs (Monthly)**
| Feature Level | Cost | Participants | Requirements |
|---------------|------|--------------|--------------|
| **Chat Only** | $0 | Unlimited | WebSocket server |
| **1-on-1 Calls** | $0 | 2 users | Free STUN servers |
| **Small Groups** | $10-20 | 2-4 users | TURN server |
| **Large Groups** | $50-100 | 5-20 users | SFU server |
| **Enterprise** | $200+ | 20+ users | Dedicated infrastructure |

---

## 🛠️ **Updated Technical Stack**

### **Audio/Video Technologies**
- **WebRTC**: Native browser peer-to-peer communication
- **Socket.io**: WebRTC signaling and call coordination
- **Opus Codec**: High-quality audio compression (32-128kbps)
- **H.264 Codec**: Universal video compression (480p-1080p)
- **STUN/TURN**: NAT traversal for firewall compatibility

### **Recommended Codec Matrix**
| Use Case | Video | Audio | Bandwidth | Browser Support |
|----------|-------|-------|-----------|-----------------|
| **Voice Only** | N/A | Opus 32kbps | 32kbps | Universal |
| **IT Support** | H.264 720p | Opus 64kbps | 800kbps | Universal |
| **Screen Share** | H.264 1080p | Opus 64kbps | 1.5Mbps | Universal |
| **High Quality** | H.264 1080p | Opus 128kbps | 2Mbps | Universal |

---

## 🎯 **Updated Success Metrics**

### **Audio/Video Call Success Criteria**
- ✅ **Audio Quality**: Clear voice with <100ms latency
- ✅ **Video Quality**: Smooth 720p at 30fps
- ✅ **Connection Success**: >95% call establishment rate
- ✅ **Stability**: <2% call drop rate
- ✅ **Performance**: <5% CPU usage for 1-on-1 calls
- ✅ **Compatibility**: Works on Chrome, Firefox, Safari, Edge

---

## 🚀 **Future Enhancements** (Post-MVP)

- **AI Noise Cancellation**: Advanced audio filtering
- **Virtual Backgrounds**: Background replacement for video
- **Call Analytics**: Detailed call quality and usage metrics
- **Mobile App**: Native iOS/Android calling support
- **Chat Bots**: Automated responses and integrations
- **Message Scheduling**: Send messages at specific times
- **Integration APIs**: Third-party service integrations
- **Advanced Search**: Full-text search with filters
- **Message Translation**: Multi-language support

---

*This comprehensive implementation plan now includes professional-grade audio/video calling capabilities that will transform the Orvale Management System into a complete collaboration platform similar to Slack and Microsoft Teams, with the added benefit of seamless IT support workflows.*