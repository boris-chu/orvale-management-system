# Chat System Implementation Plan
*Slack/MS Teams Style Real-time Chat for Orvale Management System*

## 🎯 **Project Overview**

Create a comprehensive real-time chat system integrated with the Orvale Management System, featuring both full-page chat application and minimized chat widget for seamless communication across all system pages.

### **Key Features**
- **Full-page chat app** (similar to Slack/Teams)
- **Customizable chat widget** (shapes, colors, themes, animations) from day one
- **Real-time messaging** with Socket.io only (no SSE fallback)
- **Admin chat management system** with comprehensive dashboard
- **Three chat sections**: Direct Messages, Channels, Groups
- **Public Portal Live Chat** with guest support and session recovery
- **Smart naming logic** for conversations
- **File sharing** with image viewing and download capabilities
- **Shared components** for system-wide integration
- **3-minute message edit/delete window**
- **Typing indicators** for both internal and public portal users
- **Widget animations** with customizable triggers and effects
- **Session recovery system** for public portal disconnections

### **🏗️ Architecture Overview**
- **Two-Server Architecture**:
  - **Server 1**: Next.js (Port 80) - Serves web pages, REST APIs, handles authentication
  - **Server 2**: Socket.io (Port 3001) - Handles ALL real-time: chat messages + WebRTC signaling + public portal chats
- **No Third Server Needed**: WebRTC is peer-to-peer; Socket.io only handles signaling
- **Socket.io Only**: No SSE fallback - simplified real-time approach
- **Concurrent Development**: Single `npm run dev:all` command runs both servers
- **Dual Authentication**: JWT for internal users, session-based for public portal guests
- **RBAC Integration**: Fine-grained permissions for chat and calling features
- **Public Portal Integration**: Guest chat sessions with queue management and session recovery

---

## 🏗️ **Phase-by-Phase Implementation**

### **Phase 1: Foundation & Database Schema** 
*Estimated: 2-3 days*

#### **1.1 Database Design**
```sql
-- Chat channels (teams, departments, general, DMs, groups)
CREATE TABLE chat_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, -- NULL for DMs and groups, actual name for channels
    description TEXT,
    type TEXT CHECK(type IN ('public_channel', 'private_channel', 'direct_message', 'group')) DEFAULT 'public_channel',
    created_by TEXT NOT NULL,
    team_id TEXT, -- Link to teams table for channels
    is_read_only BOOLEAN DEFAULT FALSE, -- Announcement channels (read-only)
    allow_posting BOOLEAN DEFAULT TRUE, -- Can be disabled for moderation
    moderated_by TEXT, -- Channel moderator
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (moderated_by) REFERENCES users(username)
);

-- Channel members (with posting permissions)
CREATE TABLE chat_channel_members (
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('member', 'admin', 'owner', 'moderator')) DEFAULT 'member',
    can_post BOOLEAN DEFAULT TRUE, -- Can be blocked from posting
    blocked_from_posting_by TEXT, -- Who blocked them from posting
    blocked_from_posting_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id),
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (blocked_from_posting_by) REFERENCES users(username)
);

-- Chat messages (with 3-minute edit/delete window)
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('text', 'file', 'image', 'gif', 'ticket_link', 'system', 'broadcast')) DEFAULT 'text',
    reply_to_id INTEGER, -- For threaded messages
    ticket_reference TEXT, -- Link to tickets
    file_attachment TEXT, -- JSON: File path, URL, metadata
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete flag
    can_edit_until TIMESTAMP DEFAULT (datetime('now', '+3 minutes')), -- 3-minute edit window
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id)
);

-- User presence tracking (enhanced with multi-tab support)
CREATE TABLE user_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
    status_message TEXT,
    away_message TEXT, -- Custom away message
    custom_status TEXT, -- Persistent custom status message
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_connections TEXT DEFAULT '[]', -- JSON array of socket IDs
    connection_count INTEGER DEFAULT 0,
    is_chat_blocked BOOLEAN DEFAULT FALSE, -- Admin can block from chat
    blocked_by TEXT, -- Admin who blocked the user
    blocked_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (blocked_by) REFERENCES users(username)
);

-- Chat system settings (widget customization, etc.)
CREATE TABLE chat_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- User chat preferences (individual settings)
CREATE TABLE user_chat_preferences (
    user_id TEXT PRIMARY KEY,
    notification_sounds BOOLEAN DEFAULT TRUE, -- User can disable sounds
    timestamp_format TEXT CHECK(timestamp_format IN ('relative', 'absolute')) DEFAULT 'relative',
    timestamp_position TEXT CHECK(timestamp_position IN ('right', 'tooltip', 'below')) DEFAULT 'tooltip',
    show_read_receipts BOOLEAN DEFAULT TRUE, -- Always TRUE (admin controlled)
    theme_preference TEXT CHECK(theme_preference IN ('light', 'dark', 'auto', 'darcula', 'midnight', 'ocean', 'forest', 'sunset', 'high_contrast')) DEFAULT 'auto',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

#### **1.2 WebSocket Infrastructure (Separate Server)**
- **Separate Node.js Socket.io Server**: Runs on port 3001 (avoids Next.js compatibility issues)
- **JWT Authentication Middleware**: Secure WebSocket connections
- **CORS Configuration**: Allow connections from Next.js client (port 80)
- **Connection Management**: Basic connection/disconnection handling
- **User Presence Tracking**: Real-time online/offline status

```javascript
// socket-server.js (standalone Node.js server)
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const http = require('http')

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: "http://localhost:80", // Next.js server
    methods: ["GET", "POST"]
  }
})

// JWT Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.username
    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

server.listen(3001, () => {
  console.log('🔌 Socket.io server running on port 3001')
})
```

#### **1.3 Development Scripts**
```json
{
  "scripts": {
    "dev": "next dev -p 80",
    "dev:socket": "node socket-server.js",
    "dev:all": "concurrently \"npm run dev:socket\" \"npm run dev\"",
    "start:all": "concurrently \"npm run start:socket\" \"npm run start:next\"",
    "start:socket": "node socket-server.js",
    "start:next": "next start -p 80"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

#### **1.4 RBAC Permissions**
```javascript
// New chat permissions (expanded)
const chatPermissions = [
    'chat.access_channels',      // Basic chat access (ALL USERS by default)
    'chat.create_channels',      // Create new channels
    'chat.manage_channels',      // Admin channel management
    'chat.delete_messages',      // Delete any messages
    'chat.moderate_channels',    // Moderate channel content
    'chat.access_private',       // Access private channels
    'chat.send_files',           // Upload/share files
    'chat.create_direct',        // Create direct message channels
    'chat.admin_dashboard',      // Access chat management dashboard
    'chat.system_broadcast',     // Send system-wide broadcast messages
    'chat.monitor_all',          // Monitor all chat messages (extra permission)
    'chat.manage_users',         // Manage chat users (block/unblock)
    'chat.view_analytics',       // View chat system analytics
    'chat.customize_widget',     // Customize chat widget appearance
    'chat.post_in_channel',      // Post messages in specific channels (channel-level)
    'chat.moderate_channel',     // Moderate specific channels (channel-level)
];

// Default permissions for all users
const defaultUserPermissions = [
    'chat.access_channels',      // Everyone gets basic chat access
    'chat.create_direct',        // Everyone can create DMs and groups
    'chat.send_files',           // Everyone can share files
];
```

---

## 🎛️ **Admin Chat Management System**

### **Chat Management Dashboard Card**
Located in Admin Dashboard, accessible with `chat.admin_dashboard` permission.

#### **Dashboard Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Chat System Management                            🟢 Healthy │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Socket.io Status│ │ User Presence   │ │ System Broadcast│ │
│ │ 🟢 Connected    │ │ 🟢 12 Online    │ │ [Send to All]   │ │
│ │ Port: 3001      │ │ 🟡 3 Away       │ │ Type message... │ │
│ │ Uptime: 2h 15m  │ │ 🔴 2 Busy       │ │                 │ │
│ │                 │ │ ⚫ 8 Offline     │ │                 │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Active Users    │ │ Total Channels  │ │ Messages/Hour   │ │
│ │ 15 users        │ │ 8 channels      │ │ 245 msgs/hr     │ │
│ │ +2 since 1h ago │ │ 3 public        │ │ ↑ 15% from avg  │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│ ┌─────────────────┐                                         │
│ │ Storage Used    │                                         │
│ │ 125 MB total    │                                         │
│ │ 85 MB messages  │                                         │
│ │ 40 MB files     │                                         │
│ └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

#### **Widget Customization Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Chat Customization                            [Save]        │
├─────────────────────────────────────────────────────────────┤
│ Widget Appearance:                                          │
│ Shape: [●] Round  [ ] Square  [ ] Rounded Square           │
│ [ ] Pill  [ ] Hexagon  [ ] Custom                          │
│                                                             │
│ Colors:                                                     │
│ Primary:   [#007bff] ████  Secondary: [#6c757d] ████       │
│ Accent:    [#28a745] ████  Theme: [●] Light [ ] Dark       │
│                                                             │
│ Message Display:                                            │
│ Timestamps: [●] Relative (2m ago)  [ ] Absolute (2:15 PM)  │
│ Position:   [ ] Right  [●] Tooltip  [ ] Below message      │
│                                                             │
│ System Settings (Admin Only):                              │
│ [●] Notification Sounds Enabled System-wide               │
│ [●] Read Receipts Enabled (Users cannot disable)          │
│                                                             │
│ Preview:         ┌─────────┐                               │
│                  │ 💬 Chat │  ← Live preview                │
│                  └─────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

#### **Monitor Tab** (Requires `chat.monitor_all` permission)
```
┌─────────────────────────────────────────────────────────────┐
│ Message Monitoring                    [Download All]        │
├─────────────────────────────────────────────────────────────┤
│ Filter: [All Channels ▼] [Last 24h ▼] [All Users ▼]       │
│                                                             │
│ # general                                      2:15 PM     │
│ John: Working on the server migration...                   │
│                                                             │
│ # helpdesk                                     2:10 PM     │
│ Jane: @admin Need help with ticket #1234                   │
│                                                             │
│ DM: John ↔ Alice                               2:05 PM     │
│ John: Can you review this before EOD?                      │
│                                                             │
│ [Load More] [Export CSV] [Export JSON]                     │
└─────────────────────────────────────────────────────────────┘
```

#### **Users Management Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Chat Users Management                                       │
├─────────────────────────────────────────────────────────────┤
│ Search: [Enter username...]                                 │
│                                                             │
│ John Doe         🟢 Online (3 tabs)  [Force Logout] [Block]│ ← Multi-tab indicator
│ Jane Smith       🟡 Away   (1 tab)   [Force Logout] [Block]│
│ Bob Wilson       ⚫ Offline          [Force Logout] [Block]│
│ Alice Johnson    🔴 Blocked          [Unblock]             │
│                                                             │
│ Multiple Connections:                                       │
│ John Doe - 4 tabs:                                         │
│   • Chat (chrome, 2:15 PM)                                │
│   • Tickets (chrome, 1:45 PM)                             │
│   • Admin Dashboard (firefox, 1:30 PM)                    │
│   • Helpdesk Queue (chrome, 12:45 PM)                     │
│ Jane Smith - 2 tabs:                                       │
│   • Chat (safari, 2:10 PM)                                │
│   • Public Portal (safari, 1:20 PM)                       │
│                                                             │
│ Blocked Users:                                              │
│ Alice Johnson - Blocked by Admin on 8/24/25                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Admin Connection Display Component**
```javascript
// Admin component for displaying user connections
const UserConnectionDetails = ({ user }) => {
  const connections = JSON.parse(user.socket_connections || '[]');
  
  const getBrowserFromUserAgent = (userAgent) => {
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox'; 
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  };

  const formatConnectionTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (connections.length <= 1) return null;

  return (
    <div className="user-connections">
      <div className="connection-header">
        {user.display_name} - {connections.length} tabs:
      </div>
      {connections.map((conn, index) => (
        <div key={conn.socketId} className="connection-item">
          • {conn.tabInfo} ({getBrowserFromUserAgent(conn.userAgent)}, {formatConnectionTime(conn.connectedAt)})
        </div>
      ))}
    </div>
  );
};

// Usage in admin Users tab
const AdminUsersTab = () => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // Fetch users with presence and connection data
    fetchUsersWithConnections();
  }, []);

  return (
    <div className="admin-users-tab">
      {/* Regular user list */}
      <div className="users-list">
        {users.map(user => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
      
      {/* Multiple connections section */}
      <div className="multiple-connections-section">
        <h3>Multiple Connections:</h3>
        {users
          .filter(user => JSON.parse(user.socket_connections || '[]').length > 1)
          .map(user => (
            <UserConnectionDetails key={user.id} user={user} />
          ))
        }
      </div>
    </div>
  );
};
```

#### **Analytics Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Chat System Analytics                    [Export Data]      │
├─────────────────────────────────────────────────────────────┤
│ Time Range: [Last 7 days ▼] [Custom Range] [Auto Refresh]  │
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Message Volume  │ │ Active Users    │ │ Peak Hours      │ │
│ │ ████████████    │ │ ████████████    │ │ ████████████    │ │
│ │ 2,450 messages  │ │ 24 daily active │ │ 10-11 AM Peak   │ │
│ │ ↑ 15% this week │ │ ↑ 8% this week  │ │ 245 msg/hour    │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                             │
│ Channel Activity:                                           │
│ # general        ████████████ 45%  (1,102 messages)       │
│ # helpdesk       ████████ 32%      (784 messages)         │
│ # dev-team       ████ 18%          (441 messages)         │
│ # announcements  ██ 5%             (123 messages)         │
│                                                             │
│ File Sharing Stats:                                         │
│ Images: 234 files (45 MB)    PDFs: 89 files (125 MB)       │
│ Documents: 156 files (78 MB) Other: 45 files (12 MB)       │
│                                                             │
│ User Engagement:                                            │
│ Most Active: John Doe (456 messages), Jane Smith (234)     │
│ Response Time: Avg 2.3 minutes                             │
│ Message Length: Avg 42 characters                          │
│                                                             │
│ Connection Statistics:                                      │
│ Total Open Tabs: 47 tabs across 24 users                   │
│ Multi-Tab Users: 8 users (33% of online users)             │
│ Avg Tabs/User: 1.96 tabs per active user                   │
│ Most Used Pages: Chat (18), Tickets (12), Admin (8)        │
│                                                             │
│ System Performance:                                         │
│ Average Message Delivery: 45ms                             │
│ Socket.io Connections: 24 active, 156 total today          │
│ Database Queries: Avg 12ms response time                   │
│                                                             │
│ Public Portal Support Ratings:                             │
│ Overall Rating: ⭐⭐⭐⭐⭐ 4.6/5.0 (89 ratings this week)    │
│ Rating Distribution: 5★(45) 4★(28) 3★(12) 2★(3) 1★(1)     │
│ Comments Received: 67/89 sessions (75% feedback rate)      │
│                                                             │
│ Staff Performance:                                          │
│ John Doe: ⭐⭐⭐⭐⭐ 4.8/5.0 (23 ratings)                    │
│ Jane Smith: ⭐⭐⭐⭐⭐ 4.5/5.0 (31 ratings)                  │
│ Bob Wilson: ⭐⭐⭐⭐⭐ 4.4/5.0 (19 ratings)                  │
│ Alice Johnson: ⭐⭐⭐⭐⭐ 4.7/5.0 (16 ratings)                │
│                                                             │
│ Recent Feedback Highlights:                                 │
│ "Excellent service, solved my issue quickly!" - 5⭐        │
│ "Very helpful staff, thank you!" - 5⭐                     │
│ "Could improve response time during peak hours" - 3⭐      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### **Settings & Control Tab**
```
┌─────────────────────────────────────────────────────────────┐
│ Chat System Settings                              [Save]     │
├─────────────────────────────────────────────────────────────┤
│ System Status:                                              │
│ [🟢] Chat System Enabled                                    │
│ [⚪] Chat System Disabled (Emergency Toggle)                │
│                                                             │
│ When disabled:                                              │
│ • All chat widgets will be hidden                          │
│ • Socket.io connections will be rejected                   │
│ • Public portal chat unavailable                           │
│ • Internal chat inaccessible                               │
│ • Show maintenance message to users                        │
│                                                             │
│ Maintenance Message:                                        │
│ [Chat system is temporarily unavailable for maintenance.   ]│
│ [Please submit a ticket for assistance.                    ]│
│                                                             │
│ Emergency Controls:                                         │
│ [Force Disconnect All Users]  [Clear All Sessions]         │
│ [Backup Chat Database]        [Export Chat Logs]           │
│                                                             │
│ Danger Zone:                                                │
│ [🗑️ Purge All Chat Data] (Requires confirmation)           │
│                                                             │
│ Last Status Change: Never                                   │
│ Changed By: N/A                                             │
│                                                             │
│ Public Portal Widget Settings:                              │
│ [📝 Configure Widget]  [🎨 Animation Settings]              │
│ [📊 Session Recovery]  [🎯 Auto-Ticket Rules]               │
│ [⭐ Rating System]     [💬 Comment Settings]                │
└─────────────────────────────────────────────────────────────┘
```

#### **Rating System Configuration Modal**
```
┌─────────────────────────────────────────────────────────────┐
│ Public Portal Rating System Settings            [Save]      │
├─────────────────────────────────────────────────────────────┤
│ Session Rating System:                                      │
│ [●] Enable session ratings at end of chat                   │
│ [ ] Disable session ratings                                 │
│                                                             │
│ Rating Prompt Message:                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ How would you rate your support experience?             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Rating Display Style:                                       │
│ [●] 5-star rating (⭐⭐⭐⭐⭐)                                   │
│ [ ] Number scale (1-5)                                     │
│ [ ] Thumbs up/down                                         │
│                                                             │
│ Comment System:                                             │
│ [●] Enable optional comments                               │
│ [ ] Disable comments                                       │
│                                                             │
│ Comment Prompt Message:                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Would you like to leave a comment about your experience?│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Comment Placeholder Text:                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tell us how we can improve...                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Comment Requirements:                                       │
│ [ ] Comments required for ratings 1-3 (low ratings)       │
│ [●] Comments always optional                               │
│ [ ] Comments always required                               │
│                                                             │
│ Fraud Prevention:                                           │
│ [●] Enable browser fingerprinting                          │
│ [●] Track IP addresses                                     │
│ [●] One rating per session (enforced)                     │
│                                                             │
│ Data Retention:                                            │
│ Rating Data: [Keep forever ▼]                             │
│ Comment Data: [Keep forever ▼]                            │
│                                                             │
│ Preview:                                                    │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🎉 Chat ended - Thank you for contacting support!    │   │
│ │                                                       │   │
│ │ How would you rate your support experience?           │   │
│ │ ⭐ ⭐ ⭐ ⭐ ⭐                                             │   │
│ │                                                       │   │
│ │ Would you like to leave a comment about your          │   │
│ │ experience?                                           │   │
│ │ ┌─────────────────────────────────────────────────┐   │   │
│ │ │ Tell us how we can improve...                   │   │   │
│ │ └─────────────────────────────────────────────────┘   │   │
│ │                                                       │   │
│ │ [Skip] [Submit Feedback]                              │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### **Connection Analytics Implementation**
```javascript
// Calculate connection statistics for analytics
const getConnectionAnalytics = async () => {
  const onlineUsers = await getUsersByStatus('online');
  
  let totalTabs = 0;
  let multiTabUsers = 0;
  const pageUsage = {};
  
  onlineUsers.forEach(user => {
    const connections = JSON.parse(user.socket_connections || '[]');
    const tabCount = connections.length;
    
    totalTabs += tabCount;
    
    if (tabCount > 1) {
      multiTabUsers++;
    }
    
    // Count page usage
    connections.forEach(conn => {
      const page = conn.tabInfo || 'Unknown';
      pageUsage[page] = (pageUsage[page] || 0) + 1;
    });
  });
  
  const avgTabsPerUser = totalTabs / onlineUsers.length;
  const multiTabPercentage = (multiTabUsers / onlineUsers.length) * 100;
  
  // Sort pages by usage
  const sortedPages = Object.entries(pageUsage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([page, count]) => `${page} (${count})`)
    .join(', ');

  return {
    totalTabs,
    totalUsers: onlineUsers.length,
    multiTabUsers,
    multiTabPercentage: Math.round(multiTabPercentage),
    avgTabsPerUser: Math.round(avgTabsPerUser * 100) / 100,
    mostUsedPages: sortedPages,
    detailedPageUsage: pageUsage
  };
};

// Analytics dashboard component
const ConnectionAnalyticsCard = () => {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      const data = await getConnectionAnalytics();
      setAnalytics(data);
    };
    
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (!analytics) return <div>Loading connection analytics...</div>;

  return (
    <div className="analytics-card connection-analytics">
      <h3>Connection Statistics</h3>
      <div className="analytics-grid">
        <div className="stat-item">
          <div className="stat-label">Total Open Tabs</div>
          <div className="stat-value">
            {analytics.totalTabs} tabs across {analytics.totalUsers} users
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Multi-Tab Users</div>
          <div className="stat-value">
            {analytics.multiTabUsers} users ({analytics.multiTabPercentage}% of online users)
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Average Tabs/User</div>
          <div className="stat-value">
            {analytics.avgTabsPerUser} tabs per active user
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">Most Used Pages</div>
          <div className="stat-value">
            {analytics.mostUsedPages}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🧩 **Shared Components Architecture**

### **OnlinePresenceTracker** 
*Used system-wide for status indicators*
```javascript
// components/shared/OnlinePresenceTracker.tsx
interface PresenceTrackerProps {
  userId: string;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Usage in UserProfile (top-right)
<OnlinePresenceTracker userId={user.username} showStatus size="sm" />

// Usage in Chat Sidebar
<OnlinePresenceTracker userId={user.username} size="md" />
```

### **EmojiPicker**
*Shared across chat and other features*
```javascript
// components/shared/EmojiPicker.tsx
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Usage in Chat
<EmojiPicker onEmojiSelect={handleEmojiAdd} position="top" />

// Usage in Ticket Comments
<EmojiPicker onEmojiSelect={addReaction} position="bottom" />
```

### **GifPicker with Giphy Integration**
*Giphy API integration for system-wide GIF support*
```javascript
// components/shared/GifPicker.tsx
interface GifPickerProps {
  onGifSelect: (gifUrl: string, gifTitle: string) => void;
  apiKey: string;
}

// Usage in Chat
<GifPicker onGifSelect={sendGif} apiKey={process.env.GIPHY_API_KEY} />
```

### **FileUpload with Image Viewing**
*Comprehensive file handling for chat and system*
```javascript
// components/shared/FileUpload.tsx
interface FileUploadProps {
  onFileUpload: (file: File, url: string) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  showImagePreview?: boolean;
  allowDownload?: boolean;
}

// Usage in Chat
<FileUpload 
  onFileUpload={handleFileUpload}
  showImagePreview={true}
  allowDownload={true}
  acceptedTypes={['image/*', 'application/pdf', 'text/*']}
/>

// Usage in Ticket System
<FileUpload 
  onFileUpload={attachToTicket}
  maxSize={10485760} // 10MB
/>
```

---

## ⏰ **3-Minute Edit/Delete Window**

### **Message Actions Logic**
```javascript
// Check if user can edit/delete message
const canModifyMessage = (message, currentUser) => {
  const isOwner = message.user_id === currentUser.username;
  const withinTimeLimit = new Date() < new Date(message.can_edit_until);
  const notDeleted = !message.is_deleted;
  
  return isOwner && withinTimeLimit && notDeleted;
};

// Message component shows edit/delete buttons conditionally
{canModifyMessage(message, currentUser) && (
  <div className="message-actions">
    <Button onClick={editMessage}>Edit</Button>
    <Button onClick={deleteMessage}>Delete</Button>
  </div>
)}
```

### **Soft Delete Implementation**
```javascript
// When user deletes message
const deleteMessage = async (messageId) => {
  await fetch(`/api/chat/messages/${messageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Socket.io broadcasts deletion to all users in channel
  socket.emit('message_deleted', { messageId, channelId });
};

// Other users see: "This message was deleted"
```

---

## 🔍 **Enhanced Chat Features**

### **Global Chat Search**
Search across all user's chats, messages, files, and contacts from main chat header.

```javascript
// Search functionality
const searchResults = {
  messages: [
    { channelName: "# helpdesk", user: "John", text: "server migration", timestamp: "2:15 PM" },
    { channelName: "Alice", user: "Alice", text: "migration completed", timestamp: "1:30 PM" }
  ],
  files: [
    { channelName: "Jane & Bob", fileName: "migration-plan.pdf", uploadedBy: "Jane", timestamp: "12:45 PM" }
  ],
  people: [
    { name: "John Doe", lastMessage: "Thanks for the help", timestamp: "2:15 PM" }
  ],
  channels: [
    { name: "# dev-migration", description: "Server migration discussion" }
  ]
};
```

### **Create Group Chat**
"+ Chat" button allows creating new group chats by selecting multiple users.

```javascript
// Create group chat flow
const createGroupChat = (selectedUsers) => {
  const participants = [currentUser, ...selectedUsers];
  const groupName = generateGroupName(participants, currentUser);
  
  // Creates new channel with type 'group'
  return createChannel({
    type: 'group',
    participants,
    name: null, // Auto-generated display name
  });
};
```

### **Group Participant Badge & Call Buttons**
Groups show participant count badge with hover tooltip and dual call buttons.

```javascript
// Group header component
<div className="chat-header">
  <span className="group-name">Jane & Bob</span>
  <Badge 
    count={3}
    className="participant-badge"
    tooltip="Jane Smith, Bob Wilson, John Doe"
  />
  <div className="call-buttons">
    <Button className="audio-call-button" disabled title="Audio Call">📞</Button>
    <Button className="video-call-button" disabled title="Video Call">📹</Button>
  </div>
</div>
```

### **Direct Message Call Buttons**
DMs and individual chats also include audio and video call options in the header.

```javascript
// DM chat header with call buttons
<div className="chat-header">
  <div className="user-info">
    <OnlinePresenceTracker userId="jane.smith" size="sm" />
    <span className="dm-name">Jane Smith</span>
    <span className="status-message">"Away until 3 PM"</span>
  </div>
  <div className="call-buttons">
    <Button 
      className="audio-call-button" 
      disabled 
      title="Start Audio Call"
      onClick={() => initiateAudioCall("jane.smith")}
    >
      📞
    </Button>
    <Button 
      className="video-call-button" 
      disabled 
      title="Start Video Call" 
      onClick={() => initiateVideoCall("jane.smith")}
    >
      📹
    </Button>
  </div>
</div>
```

### **Call Button States**
Call buttons have different states based on implementation status and user permissions.

```javascript
// Call button state management
const CallButton = ({ type, targetUserId, disabled = true }) => {
  const buttonConfig = {
    audio: {
      icon: '📞',
      title: 'Start Audio Call',
      className: 'audio-call-button',
      handler: () => initiateAudioCall(targetUserId)
    },
    video: {
      icon: '📹', 
      title: 'Start Video Call',
      className: 'video-call-button',
      handler: () => initiateVideoCall(targetUserId)
    }
  };

  const config = buttonConfig[type];
  
  return (
    <Button
      className={`call-button ${config.className} ${disabled ? 'disabled' : ''}`}
      disabled={disabled}
      title={disabled ? `${config.title} (Coming Soon)` : config.title}
      onClick={disabled ? null : config.handler}
    >
      {config.icon}
    </Button>
  );
};
```

### **Channel Moderation System**
Comprehensive channel-level permissions and moderation.

```javascript
// Channel posting permissions check
const canPostInChannel = (channelId, userId) => {
  const channel = getChannel(channelId);
  const member = getChannelMember(channelId, userId);
  
  // Check if channel allows posting
  if (!channel.allow_posting || channel.is_read_only) return false;
  
  // Check if user is blocked from posting
  if (!member.can_post) return false;
  
  // Check if user has channel posting permission
  return hasPermission(userId, 'chat.post_in_channel');
};

// Announcement channels (read-only)
const announcementChannel = {
  name: "announcements",
  is_read_only: true,
  allow_posting: false, // Only moderators can post
};
```

### **Browser Tab Notifications**
Real-time notification badges on browser tabs for new messages.

```javascript
// Update browser tab title with notification count
const updateTabNotifications = (unreadCount) => {
  const originalTitle = "Orvale Management System";
  document.title = unreadCount > 0 
    ? `(${unreadCount}) ${originalTitle}` 
    : originalTitle;
    
  // Update favicon with red dot
  updateFavicon(unreadCount > 0);
};

// Socket.io listener for new messages
socket.on('message_received', (message) => {
  if (message.user_id !== currentUser.username) {
    incrementUnreadCount();
    updateTabNotifications(getUnreadCount());
  }
});
```

### **Multi-Tab Connection Tracking**
Track and display all browser tab connections per user for admin monitoring.

```javascript
// Socket.io server connection tracking with tab information
io.on('connection', (socket) => {
  const userId = socket.userId;
  const tabInfo = socket.handshake.query.tabInfo || 'Unknown Page';
  
  // Get current connections
  const userPresence = getUserPresence(userId);
  let connections = JSON.parse(userPresence.socket_connections || '[]');
  
  // Add new connection with tab information
  const connectionInfo = {
    socketId: socket.id,
    tabInfo: tabInfo,
    connectedAt: new Date().toISOString(),
    userAgent: socket.handshake.headers['user-agent']
  };
  
  connections.push(connectionInfo);
  
  // Update database with all connection details
  updateUserPresence(userId, {
    socket_connections: JSON.stringify(connections),
    connection_count: connections.length,
    status: 'online'
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    connections = connections.filter(conn => conn.socketId !== socket.id);
    updateUserPresence(userId, {
      socket_connections: JSON.stringify(connections),
      connection_count: connections.length,
      status: connections.length > 0 ? 'online' : 'offline'
    });
  });
});
```

---

## ⚙️ **User Chat Settings & Preferences**

### **Settings Gear Menu** (⚙️ icon in chat header)
Accessible from main chat interface for individual user preferences.

```
┌─────────────────────────────────────────────────────────────┐
│ Chat Settings                                      [Close]   │
├─────────────────────────────────────────────────────────────┤
│ Notifications:                                              │
│ [●] Enable notification sounds    🔊                        │
│ [ ] Mute all notifications                                  │
│                                                             │
│ Status & Away Messages:                                     │
│ Current Status: [Online ▼]                                 │
│ Away Message: [Back in 30 minutes...]                      │
│ Custom Status: [Working on server migration 🔧]           │
│                                                             │
│ Message Display:                                            │
│ Timestamps: [●] Relative (2m ago)  [ ] Absolute (2:15 PM)  │
│ Position:   [ ] Right  [●] Tooltip  [ ] Below message      │
│                                                             │
│ Chat Theme:                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [●] Auto     [ ] Light    [ ] Dark      [ ] Darcula    │ │
│ │ [ ] Midnight [ ] Ocean    [ ] Forest    [ ] Sunset     │ │
│ │ [ ] High Contrast                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Theme Preview:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ # general                    Boris Chu - 2:15 PM       │ │
│ │ Boris: This is a preview of the selected theme         │ │
│ │ You: Looks great! 👍                      2:16 PM      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Save Preferences]                                          │
└─────────────────────────────────────────────────────────────┘
```

### **Away Message & Custom Status System**
```javascript
// Status message types
const statusTypes = {
  online: {
    color: 'green',
    allowCustom: true,
    examples: ['Working on tickets', 'Available for chat 💬']
  },
  away: {
    color: 'yellow', 
    allowCustom: true,
    examples: ['In a meeting', 'Back in 30 minutes', 'Away until 3 PM']
  },
  busy: {
    color: 'red',
    allowCustom: true,
    examples: ['Do not disturb', 'In focus mode 🎯', 'On a call']
  },
  offline: {
    color: 'gray',
    allowCustom: false
  }
};

// Update user status with custom message
const updateUserStatus = (status, customMessage) => {
  updateUserPresence(userId, {
    status,
    custom_status: customMessage,
    away_message: status === 'away' ? customMessage : null
  });
};
```

### **Notification Sound System**
```javascript
// Notification sound management
const playNotificationSound = (messageType) => {
  // Check system-wide setting first
  const systemSoundsEnabled = getSystemSetting('notification_sounds_enabled');
  if (!systemSoundsEnabled) return;
  
  // Check user preference
  const userSoundsEnabled = getUserPreference('notification_sounds');
  if (!userSoundsEnabled) return;
  
  // Play appropriate sound
  const sounds = {
    message: '/sounds/message-ding.mp3',
    mention: '/sounds/mention-ping.mp3',
    group: '/sounds/group-notification.mp3'
  };
  
  const audio = new Audio(sounds[messageType] || sounds.message);
  audio.volume = 0.3;
  audio.play().catch(console.error);
};
```

### **Read Receipts System**
Always enabled system-wide, users cannot disable.

```javascript
// Read receipt tracking
const markMessageAsRead = (messageId, userId) => {
  // Update last_read_at in chat_channel_members
  updateChannelMember(channelId, userId, {
    last_read_at: new Date()
  });
  
  // Emit read receipt via Socket.io
  socket.emit('message_read', {
    messageId,
    userId,
    channelId,
    timestamp: new Date()
  });
};

// Display read receipts
const getReadReceipts = (messageId) => {
  // Returns array of users who read the message
  // ✓ = delivered, ✓✓ = read by all
  return getMessageReadStatus(messageId);
};
```

### **Message Timestamp Customization**
```javascript
// Timestamp display options
const TimestampDisplay = ({ message, format, position }) => {
  const timestamp = formatTimestamp(message.created_at, format);
  
  if (position === 'right') {
    return (
      <div className="message-with-timestamp">
        <div className="message-content">{message.text}</div>
        <div className="timestamp-right">{timestamp}</div>
      </div>
    );
  }
  
  if (position === 'tooltip') {
    return (
      <div className="message-content" title={timestamp}>
        {message.text}
      </div>
    );
  }
  
  if (position === 'below') {
    return (
      <div>
        <div className="message-content">{message.text}</div>
        <div className="timestamp-below">{timestamp}</div>
      </div>
    );
  }
};

// Timestamp formatting
const formatTimestamp = (date, format) => {
  if (format === 'relative') {
    return formatRelativeTime(date); // "2m ago", "1h ago"
  }
  return formatAbsoluteTime(date); // "2:15 PM", "Aug 24, 2:15 PM"
};
```

### **Chat Theme System**
VS Code-inspired theme selection with live preview and dark mode variants.

```javascript
// Chat theme definitions
const chatThemes = {
  auto: {
    name: 'System Default',
    description: 'Follows system dark/light mode',
    variables: 'css-variables-auto'
  },
  light: {
    name: 'Light',
    description: 'Clean light theme',
    sidebar: '#f8f9fa',
    messageArea: '#ffffff',
    inputBg: '#ffffff',
    textPrimary: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    accent: '#007bff'
  },
  dark: {
    name: 'Dark',
    description: 'Standard dark theme',
    sidebar: '#2f3349',
    messageArea: '#36393f',
    inputBg: '#40444b',
    textPrimary: '#dcddde',
    textSecondary: '#8e9297',
    border: '#484c52',
    accent: '#7289da'
  },
  darcula: {
    name: 'Darcula',
    description: 'VS Code Darcula-inspired theme',
    sidebar: '#2b2b2b',
    messageArea: '#3c3f41',
    inputBg: '#45494a',
    textPrimary: '#a9b7c6',
    textSecondary: '#808080',
    border: '#555555',
    accent: '#cc7832',
    highlight: '#ffc66d'
  },
  midnight: {
    name: 'Midnight',
    description: 'Deep blue night theme',
    sidebar: '#0d1421',
    messageArea: '#161b22',
    inputBg: '#21262d',
    textPrimary: '#c9d1d9',
    textSecondary: '#7c8b97',
    border: '#30363d',
    accent: '#58a6ff'
  },
  ocean: {
    name: 'Ocean',
    description: 'Blue-teal ocean theme',
    sidebar: '#0e4b5a',
    messageArea: '#1a5f6f',
    inputBg: '#237284',
    textPrimary: '#e0f2e7',
    textSecondary: '#a8c8ce',
    border: '#2d8596',
    accent: '#4fb3d9'
  },
  forest: {
    name: 'Forest',
    description: 'Green nature-inspired theme',
    sidebar: '#1a2e1a',
    messageArea: '#2d4a2d',
    inputBg: '#3d5a3d',
    textPrimary: '#e8f5e8',
    textSecondary: '#b8d4b8',
    border: '#4d6a4d',
    accent: '#6fbf73'
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm orange-red sunset theme',
    sidebar: '#2d1b1b',
    messageArea: '#4a2c2c',
    inputBg: '#5c3636',
    textPrimary: '#f5e8e8',
    textSecondary: '#d4b8b8',
    border: '#6a4d4d',
    accent: '#ff8c69'
  },
  high_contrast: {
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    sidebar: '#000000',
    messageArea: '#ffffff',
    inputBg: '#000000',
    textPrimary: '#ffffff',
    textSecondary: '#cccccc',
    border: '#ffffff',
    accent: '#ffff00',
    special: 'high-contrast-mode'
  }
};

// Apply theme to chat interface
const applyTheme = (themeName) => {
  const theme = chatThemes[themeName] || chatThemes.auto;
  const chatContainer = document.querySelector('.chat-container');
  
  // Apply CSS custom properties
  Object.entries(theme).forEach(([key, value]) => {
    if (key !== 'name' && key !== 'description') {
      chatContainer.style.setProperty(`--chat-${key}`, value);
    }
  });
  
  // Add theme class for special handling
  chatContainer.className = `chat-container theme-${themeName}`;
  
  // Save user preference
  updateUserPreference('theme_preference', themeName);
};

// Live theme preview in settings
const previewTheme = (themeName) => {
  const preview = document.querySelector('.theme-preview');
  const theme = chatThemes[themeName];
  
  preview.style.background = theme.sidebar;
  preview.style.color = theme.textPrimary;
  preview.style.border = `1px solid ${theme.border}`;
  
  // Apply to preview elements
  preview.querySelector('.preview-header').style.background = theme.messageArea;
  preview.querySelector('.preview-accent').style.color = theme.accent;
};
```

### **Theme CSS Implementation**
```css
/* Base chat theme variables */
.chat-container {
  --chat-sidebar: var(--theme-sidebar, #f8f9fa);
  --chat-message-area: var(--theme-message-area, #ffffff);
  --chat-input-bg: var(--theme-input-bg, #ffffff);
  --chat-text-primary: var(--theme-text-primary, #212529);
  --chat-text-secondary: var(--theme-text-secondary, #6c757d);
  --chat-border: var(--theme-border, #dee2e6);
  --chat-accent: var(--theme-accent, #007bff);
}

/* Theme-specific styles */
.theme-darcula {
  --syntax-keyword: #cc7832;
  --syntax-string: #6a8759;
  --syntax-comment: #808080;
  --selection-bg: #214283;
}

.theme-midnight {
  --glow-effect: 0 0 10px rgba(88, 166, 255, 0.3);
  box-shadow: var(--glow-effect);
}

.theme-high-contrast {
  --focus-ring: 3px solid #ffff00;
  font-weight: bold;
}

.theme-high-contrast button:focus,
.theme-high-contrast input:focus {
  outline: var(--focus-ring);
}

/* Chat components using theme variables */
.chat-sidebar {
  background-color: var(--chat-sidebar);
  border-right: 1px solid var(--chat-border);
  color: var(--chat-text-primary);
}

.message-area {
  background-color: var(--chat-message-area);
  color: var(--chat-text-primary);
}

.message-bubble {
  background-color: var(--chat-input-bg);
  border: 1px solid var(--chat-border);
}

.chat-input {
  background-color: var(--chat-input-bg);
  border: 1px solid var(--chat-border);
  color: var(--chat-text-primary);
}

.accent-text {
  color: var(--chat-accent);
}
```

### **Admin System-Wide Controls**
```javascript
// System settings that override user preferences
const systemChatSettings = {
  notification_sounds_enabled: true,  // Admin can disable system-wide
  read_receipts_enabled: true,        // Always true, users cannot disable
  allow_custom_status: true,
  max_away_message_length: 100,
  default_timestamp_format: 'relative',
  available_themes: Object.keys(chatThemes), // Admin can restrict themes
  default_theme: 'auto'
};

// Admin can force disable sounds for all users
const toggleSystemNotificationSounds = (enabled) => {
  updateSystemSetting('notification_sounds_enabled', enabled);
  
  // Broadcast to all connected users
  io.emit('system_setting_updated', {
    setting: 'notification_sounds_enabled',
    value: enabled
  });
};
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
│ 🏠 Orvale Management  [Chat (●3)] [Tickets] [Profile] [Logout] │ ← Notification badge
├─────────────────────────────────────────────────────────────┤
│ [🔍 Search all chats, messages, files...]  [+ Chat] 📞 📹 ⚙️ │ ← Search + Create + Calls + Settings
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │ Direct Messages │ │ Jane & Bob              👥3  📞 📹 │ ← Group badge + Call buttons
│ ├─────────────────┤ │                                     │
│ │ 🟢 Boris Chu    │ │ John: Hey team, working on ticket…│2:15 PM (✓✓) │ ← Timestamp + Read receipts
│ │    "In a meeting"│ │ Jane: @John I can help with that   │1:45 PM (✓) │
│ │ 🟡 Jane Smith   │ │                                     │
│ │    "Away until 3PM"                             │
│ │ ⚫ Bob Wilson   │ │ [typing: Bob is typing...]         │ │
│ │                 │ │                                     │ │
│ │ Channels        │ │                                     │ │
│ ├─────────────────┤ │ ┌─────────────────────────────────┐ │ │
│ │ # general       │ │ │ Type a message...  📎 😀 [Send] │ │ │
│ │ # helpdesk 🔒   │ │ └─────────────────────────────────┘ │ │
│ │ # announcements │ └─────────────────────────────────────┘ │
│ │   (read-only)   │                                         │
│ │                 │                                         │
│ │ Groups          │                                         │
│ ├─────────────────┤                                         │
│ │ Jane & Bob  👥3 │                                         │
│ │ Alice, Bob+ 👥5 │                                         │
│ └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

#### **3.1.1 Chat Sections & Naming Logic**

**Direct Messages Section:**
- Shows **only the other participant's name** (never "DM: Boris & John")
- Example: John Doe sees "Boris Chu" when chatting with Boris

```javascript
const getDMDisplayName = (participants, currentUser) => {
  return participants
    .filter(p => p.username !== currentUser.username)
    .map(p => p.display_name)[0] // Only show other person
}
```

**Channels Section:**
- Uses actual channel names with # prefix
- Example: "#general", "#helpdesk", "#dev-team"

```javascript
const getChannelDisplayName = (channel) => {
  return `# ${channel.name}`
}
```

**Groups Section:**
- **2-3 people total**: "Jane Smith & Bob Wilson"
- **4+ people total**: "Jane Smith, Bob Wilson, Person 3"

```javascript
const getGroupDisplayName = (participants, currentUser) => {
  const others = participants.filter(p => p.username !== currentUser.username)
  
  if (others.length === 2) {
    return `${others[0].display_name} & ${others[1].display_name}`
  } else if (others.length === 3) {
    return `${others[0].display_name}, ${others[1].display_name}, ${others[2].display_name}`
  } else if (others.length > 3) {
    return `${others[0].display_name}, ${others[1].display_name}, Person ${others.length - 1}`
  }
  
  return others[0]?.display_name || 'Group Chat'
}
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

### **Global Search System**
Comprehensive search across all user's accessible chats, messages, files, and people.

```javascript
// Global search functionality
const GlobalSearchModal = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    messages: [],
    files: [],
    people: [],
    channels: []
  });

  const performGlobalSearch = async (query) => {
    if (!query.trim()) return;
    
    // Search across all accessible content
    const results = await Promise.all([
      searchMessages(query),    // Messages user can access
      searchFiles(query),       // Files shared in accessible channels
      searchPeople(query),      // Users by name/username
      searchChannels(query)     // Channels user can access
    ]);

    setSearchResults({
      messages: results[0],
      files: results[1],
      people: results[2],
      channels: results[3]
    });
  };

  return (
    <div className="global-search-modal">
      <div className="search-header">
        <input
          type="text"
          placeholder="🔍 Search all chats, messages, files..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            performGlobalSearch(e.target.value);
          }}
          className="global-search-input"
        />
      </div>
      
      <div className="search-results">
        {/* Messages Results */}
        <SearchSection title="Messages" results={searchResults.messages}>
          {searchResults.messages.map(message => (
            <MessageSearchResult 
              key={message.id} 
              message={message}
              onClick={() => jumpToMessage(message)}
              highlight={searchQuery}
            />
          ))}
        </SearchSection>

        {/* Files Results */}
        <SearchSection title="Files" results={searchResults.files}>
          {searchResults.files.map(file => (
            <FileSearchResult 
              key={file.id} 
              file={file}
              onClick={() => openFile(file)}
              highlight={searchQuery}
            />
          ))}
        </SearchSection>

        {/* People Results */}
        <SearchSection title="People" results={searchResults.people}>
          {searchResults.people.map(person => (
            <PersonSearchResult 
              key={person.id} 
              person={person}
              onClick={() => startDirectMessage(person)}
              highlight={searchQuery}
            />
          ))}
        </SearchSection>

        {/* Channels Results */}
        <SearchSection title="Channels" results={searchResults.channels}>
          {searchResults.channels.map(channel => (
            <ChannelSearchResult 
              key={channel.id} 
              channel={channel}
              onClick={() => joinChannel(channel)}
              highlight={searchQuery}
            />
          ))}
        </SearchSection>
      </div>
    </div>
  );
};

// Search API endpoints
const searchMessages = async (query) => {
  return await fetch(`/api/chat/search/messages?q=${encodeURIComponent(query)}`);
};

const searchFiles = async (query) => {
  return await fetch(`/api/chat/search/files?q=${encodeURIComponent(query)}`);
};

const searchPeople = async (query) => {
  return await fetch(`/api/chat/search/people?q=${encodeURIComponent(query)}`);
};

const searchChannels = async (query) => {
  return await fetch(`/api/chat/search/channels?q=${encodeURIComponent(query)}`);
};
```

### **Search Result Actions**
Each search result type supports specific actions for quick access.

```javascript
// Message search result actions
const MessageSearchResult = ({ message, onClick, highlight }) => (
  <div className="search-result message-result" onClick={onClick}>
    <div className="result-header">
      <span className="channel-name">#{message.channel_name}</span>
      <span className="message-author">{message.author}</span>
      <span className="message-date">{formatDate(message.created_at)}</span>
    </div>
    <div className="result-content">
      <HighlightedText text={message.content} highlight={highlight} />
    </div>
  </div>
);

// File search result actions
const FileSearchResult = ({ file, onClick, highlight }) => (
  <div className="search-result file-result" onClick={onClick}>
    <div className="file-icon">{getFileIcon(file.type)}</div>
    <div className="file-info">
      <div className="file-name">
        <HighlightedText text={file.name} highlight={highlight} />
      </div>
      <div className="file-details">
        {file.size} • Shared by {file.uploader} in #{file.channel}
      </div>
    </div>
  </div>
);

// Person search result actions
const PersonSearchResult = ({ person, onClick, highlight }) => (
  <div className="search-result person-result" onClick={onClick}>
    <OnlinePresenceTracker userId={person.id} size="sm" />
    <div className="person-info">
      <div className="person-name">
        <HighlightedText text={person.display_name} highlight={highlight} />
      </div>
      <div className="person-details">
        @{person.username} • {person.status_message}
      </div>
    </div>
    <div className="person-actions">
      <Button size="sm" onClick={() => startDirectMessage(person)}>
        Message
      </Button>
    </div>
  </div>
);

// Channel search result actions  
const ChannelSearchResult = ({ channel, onClick, highlight }) => (
  <div className="search-result channel-result" onClick={onClick}>
    <div className="channel-icon">{channel.type === 'private' ? '🔒' : '#'}</div>
    <div className="channel-info">
      <div className="channel-name">
        <HighlightedText text={channel.name} highlight={highlight} />
      </div>
      <div className="channel-description">
        <HighlightedText text={channel.description} highlight={highlight} />
      </div>
    </div>
    <div className="channel-actions">
      <Button size="sm" onClick={() => joinChannel(channel)}>
        {channel.is_member ? 'Open' : 'Join'}
      </Button>
    </div>
  </div>
);
```

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

### **Phase 8: WebRTC Foundation & Call Database**
*Estimated: 2-3 days*
*Can be developed concurrently with Phase 3-4*

#### **8.1 Call Database Schema**
```sql
-- Single table for call history and logs
CREATE TABLE call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL,
    type TEXT CHECK(type IN ('audio', 'video', 'screen_share')) DEFAULT 'audio',
    status TEXT CHECK(status IN ('initiated', 'ringing', 'connected', 'ended', 'missed', 'rejected')) DEFAULT 'initiated',
    caller_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    channel_id INTEGER, -- Optional: calls within a channel
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    connected_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER DEFAULT 0, -- seconds
    end_reason TEXT, -- user_hangup, network_error, rejected, no_answer
    quality_rating INTEGER CHECK(quality_rating BETWEEN 1 AND 5),
    quality_feedback TEXT,
    recording_url TEXT, -- future feature
    metadata TEXT, -- JSON: connection stats, codec info
    FOREIGN KEY (caller_id) REFERENCES users(username),
    FOREIGN KEY (recipient_id) REFERENCES users(username),
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id)
);

-- Index for quick lookups
CREATE INDEX idx_call_logs_users ON call_logs(caller_id, recipient_id);
CREATE INDEX idx_call_logs_timestamp ON call_logs(started_at);
```

#### **8.2 WebRTC Client Setup**
```javascript
// lib/webrtc.js - WebRTC connection manager
class WebRTCManager {
  constructor(socket, userId) {
    this.socket = socket;
    this.userId = userId;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    
    // ICE servers configuration
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  async initializeCall(targetUserId, callType = 'audio') {
    try {
      // Safari/iOS specific handling
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Get user media based on call type with Safari-specific constraints
      const constraints = callType === 'video' 
        ? { 
            audio: true, 
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              // Safari requires specific handling
              ...(isSafari && { facingMode: 'user' })
            }
          }
        : { audio: true, video: false };
      
      // iOS Safari requires user interaction before getUserMedia
      if (isIOS && !this.hasUserGesture) {
        throw new Error('User gesture required for iOS Safari');
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection with Safari-compatible config
      this.peerConnection = new RTCPeerConnection({
        ...this.iceServers,
        // Safari requires explicit codec preferences
        ...(isSafari && { 
          sdpSemantics: 'unified-plan',
          bundlePolicy: 'max-bundle'
        })
      });
      
      // Add local stream tracks (Safari needs specific ordering)
      if (isSafari) {
        // Add audio track first for Safari
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          this.peerConnection.addTrack(audioTrack, this.localStream);
        }
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          this.peerConnection.addTrack(videoTrack, this.localStream);
        }
      } else {
        // Standard approach for other browsers
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('call:ice-candidate', {
            targetUserId,
            candidate: event.candidate
          });
        }
      };
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream);
      };
      
      // Create offer with Safari-specific options
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
        // Safari needs these for reliable connections
        ...(isSafari && {
          iceRestart: false,
          voiceActivityDetection: true
        })
      });
      
      // Safari sometimes needs SDP munging for H.264
      if (isSafari && callType === 'video') {
        offer.sdp = this.preferH264Codec(offer.sdp);
      }
      
      await this.peerConnection.setLocalDescription(offer);
      
      // Send offer through Socket.io signaling
      this.socket.emit('call:invite', {
        targetUserId,
        callType,
        offer
      });
      
    } catch (error) {
      console.error('Failed to initialize call:', error);
      throw error;
    }
  }
  
  // Safari H.264 codec preference helper
  preferH264Codec(sdp) {
    // Move H.264 to the front of the codec list for Safari
    return sdp.replace(/m=video.*\r\n/g, (match) => {
      return match.replace(/(\d+) (\d+) (\d+)/, (m, p1, p2, p3) => {
        return `${p1} ${p2} ${p3}`.replace(/(\d+)/g, (codecId) => {
          // Prefer H.264 codec IDs (typically 96-127 range)
          return codecId;
        });
      });
    });
  }
}
```

#### **8.3 RBAC Permissions for Calls**
```javascript
// Add to existing chat permissions
const callPermissions = [
  'chat.make_audio_calls',     // Make audio calls
  'chat.make_video_calls',     // Make video calls  
  'chat.receive_calls',        // Receive incoming calls
  'chat.record_calls',         // Record calls (future)
  'chat.monitor_calls'         // Admin: monitor active calls
];
```

---

### **Phase 9: Audio Call Implementation**
*Estimated: 2-3 days*
*Requires Phase 8 completion*

#### **9.1 Audio Call UI Components**
```javascript
// components/calls/AudioCallModal.jsx
const AudioCallModal = ({ isOpen, callInfo, onClose }) => {
  const [callState, setCallState] = useState('ringing'); // ringing, connected, ended
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  return (
    <Dialog open={isOpen} maxWidth="sm" fullWidth>
      <DialogContent className="audio-call-modal">
        <div className="call-header">
          <Avatar src={callInfo.userAvatar} size="large" />
          <Typography variant="h5">{callInfo.userName}</Typography>
          <Typography variant="body2">
            {callState === 'ringing' ? 'Calling...' : formatDuration(duration)}
          </Typography>
        </div>
        
        <div className="call-controls">
          <IconButton 
            onClick={() => setIsMuted(!isMuted)}
            color={isMuted ? 'error' : 'default'}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
          
          <IconButton 
            onClick={onClose}
            color="error"
            size="large"
          >
            <CallEnd />
          </IconButton>
          
          <IconButton>
            <VolumeUp />
          </IconButton>
        </div>
        
        {/* Audio visualization */}
        <canvas className="audio-visualizer" ref={visualizerRef} />
      </DialogContent>
    </Dialog>
  );
};
```

#### **9.2 Incoming Call Handler**
```javascript
// Incoming call notification
const IncomingCallNotification = ({ callInfo, onAccept, onReject }) => {
  const [ringtone] = useState(new Audio('/sounds/ringtone.mp3'));
  
  useEffect(() => {
    ringtone.loop = true;
    ringtone.play();
    return () => ringtone.pause();
  }, []);
  
  return (
    <div className="incoming-call-notification">
      <Avatar src={callInfo.fromAvatar} />
      <div className="call-info">
        <Typography variant="h6">{callInfo.fromName}</Typography>
        <Typography variant="body2">
          Incoming {callInfo.callType} call...
        </Typography>
      </div>
      <div className="call-actions">
        <IconButton onClick={onAccept} color="success">
          <Call />
        </IconButton>
        <IconButton onClick={onReject} color="error">
          <CallEnd />
        </IconButton>
      </div>
    </div>
  );
};
```

---

### **Phase 10: Video Call Implementation**  
*Estimated: 2-3 days*
*Requires Phase 9 completion*

#### **10.1 Video Call Components**
```javascript
// components/calls/VideoCallModal.jsx
const VideoCallModal = ({ isOpen, callInfo, webrtcManager }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  useEffect(() => {
    if (webrtcManager.localStream) {
      localVideoRef.current.srcObject = webrtcManager.localStream;
    }
    
    webrtcManager.onRemoteStream = (stream) => {
      remoteVideoRef.current.srcObject = stream;
    };
  }, [webrtcManager]);
  
  return (
    <Dialog open={isOpen} maxWidth="lg" fullWidth>
      <DialogContent className="video-call-modal">
        <div className="video-container">
          <video 
            ref={remoteVideoRef} 
            className="remote-video" 
            autoPlay 
            playsInline 
          />
          <video 
            ref={localVideoRef} 
            className="local-video" 
            autoPlay 
            playsInline 
            muted
          />
        </div>
        
        <div className="video-controls">
          <IconButton onClick={() => toggleVideo()}>
            {isVideoEnabled ? <Videocam /> : <VideocamOff />}
          </IconButton>
          {/* Other controls... */}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

#### **10.2 Enable Call Buttons**
```javascript
// Update the disabled call buttons to functional
const CallButton = ({ type, targetUserId }) => {
  const { socket, user } = useChat();
  const [webrtcManager] = useState(() => new WebRTCManager(socket, user.id));
  
  const handleCall = async () => {
    try {
      await webrtcManager.initializeCall(targetUserId, type);
      // Open appropriate call modal
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        // Show permission request UI
      }
    }
  };
  
  const hasPermission = type === 'video' 
    ? user.permissions?.includes('chat.make_video_calls')
    : user.permissions?.includes('chat.make_audio_calls');
  
  return (
    <Button
      onClick={handleCall}
      disabled={!hasPermission}
      title={!hasPermission ? 'No permission for calls' : `Start ${type} call`}
    >
      {type === 'video' ? '📹' : '📞'}
    </Button>
  );
};
```

---

## 🛠️ **Technical Stack**

### **Frontend**
- **Framework**: Next.js 15 + React 19
- **UI Libraries**: 
  - **Material-UI** - Primary for all form controls, modals, selects
  - **evilcharts** - For dashboard charts, analytics, modern UI components
  - **NO shadcn:ui selects** - Use Material-UI Select exclusively
- **Real-time**: Socket.io-client (with Safari/iOS specific handling)
- **State Management**: React Context + useReducer
- **Animations**: Framer Motion (for smooth interactions)

### **Backend**
- **API**: Next.js API routes (port 80)
- **Real-time**: Separate Socket.io server (port 3001)
- **Database**: SQLite (existing system)
- **File Storage**: Local file system or cloud storage
- **Authentication**: Existing JWT system

---

## 🎨 **UI Component Guidelines for Chat System**

### **CRITICAL: Use Material-UI for ALL Form Components**
```javascript
// ✅ CORRECT - Use Material-UI for all selects, inputs, modals
import { 
  Select, 
  MenuItem, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Avatar,
  Chip,
  Badge
} from '@mui/material';

// ❌ INCORRECT - Never use shadcn:ui select in chat system
// import { Select } from '@/components/ui/select'; // DO NOT USE
```

### **Use evilcharts for Analytics & Modern UI**
```javascript
// ✅ Use evilcharts for dashboard components
import { GradientBarChart } from '@/charts/bar-charts/gradient-bar-chart';
import { GlowingLine } from '@/charts/line-charts/glowing-line';
import { ModernCard } from '@/charts/ui/modern-card';
import { AnimatedMetric } from '@/charts/metrics/animated-metric';
```

### **Component Usage Examples**

#### **Channel/User Selection Dropdown**
```javascript
// Always use Material-UI Select for dropdowns
<FormControl fullWidth size="small">
  <InputLabel>Select Channel</InputLabel>
  <Select 
    value={selectedChannel} 
    onChange={(e) => setSelectedChannel(e.target.value)}
    label="Select Channel"
  >
    <MenuItem value="general"># general</MenuItem>
    <MenuItem value="helpdesk"># helpdesk</MenuItem>
    <MenuItem value="dev-team"># dev-team</MenuItem>
  </Select>
</FormControl>
```

#### **Chat Analytics Dashboard**
```javascript
// Use evilcharts for analytics displays
<ModernCard>
  <AnimatedMetric
    label="Active Users"
    value={activeUsers}
    trend="+12%"
    icon={<Users />}
  />
  <GradientBarChart 
    data={messageVolume}
    height={200}
    gradient={['#4F46E5', '#7C3AED']}
  />
</ModernCard>
```

### **Unified Socket.io Server Architecture (Chat + WebRTC Signaling)**
```javascript
// socket-server.js (standalone server - port 3001)
// Handles BOTH chat messages AND WebRTC signaling
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const http = require('http')

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: "http://localhost:80",
    methods: ["GET", "POST"],
    credentials: true
  }
})

// JWT Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.username
    socket.userDisplayName = decoded.display_name
    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

// Connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`)
  
  // === CHAT EVENTS ===
  socket.on('join_channel', (channelId) => {
    socket.join(`channel_${channelId}`)
  })
  
  socket.on('send_message', (data) => {
    io.to(`channel_${data.channelId}`).emit('message_received', data)
  })

  // === WEBRTC SIGNALING EVENTS ===
  // Call invitation
  socket.on('call:invite', (data) => {
    const { targetUserId, callType, offer } = data
    io.to(targetUserId).emit('call:incoming', {
      from: socket.userId,
      fromName: socket.userDisplayName,
      callType,
      offer,
      callId: `${socket.userId}-${targetUserId}-${Date.now()}`
    })
  })

  // Call answer
  socket.on('call:answer', (data) => {
    const { targetUserId, answer, callId } = data
    io.to(targetUserId).emit('call:answered', {
      from: socket.userId,
      answer,
      callId
    })
  })

  // ICE candidates for NAT traversal
  socket.on('call:ice-candidate', (data) => {
    const { targetUserId, candidate, callId } = data
    io.to(targetUserId).emit('call:ice-candidate', {
      from: socket.userId,
      candidate,
      callId
    })
  })

  // Call control events
  socket.on('call:end', (data) => {
    const { targetUserId, callId } = data
    io.to(targetUserId).emit('call:ended', {
      from: socket.userId,
      callId
    })
  })

  socket.on('call:reject', (data) => {
    const { targetUserId, callId, reason } = data
    io.to(targetUserId).emit('call:rejected', {
      from: socket.userId,
      callId,
      reason
    })
  })
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`)
    // Notify any active calls that user disconnected
    socket.broadcast.emit('user:disconnected', socket.userId)
  })
})

server.listen(3001, () => {
  console.log('🔌 Socket.io server running on port 3001 (Chat + WebRTC Signaling)')
})
```

### **Client Connection Setup**
```javascript
// lib/socket.js (Next.js client)
import { io } from 'socket.io-client'

export const initSocket = (token) => {
  // Detect current page for admin tracking
  const getTabInfo = () => {
    const path = window.location.pathname;
    const pageMap = {
      '/chat': 'Chat',
      '/tickets': 'Tickets',
      '/admin': 'Admin Dashboard',
      '/helpdesk': 'Helpdesk Queue',
      '/developer': 'Developer Portal',
      '/': 'Public Portal',
      '/public-portal': 'Public Portal'
    };
    
    return pageMap[path] || `Page: ${path}`;
  };

  // Safari/iOS specific Socket.io configuration
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return io('http://localhost:3001', {
    auth: { token },
    query: { tabInfo: getTabInfo() },
    autoConnect: false,
    // Safari-specific transport settings
    transports: isSafari ? ['websocket', 'polling'] : ['websocket'],
    // iOS needs these for background handling
    ...(isIOS && {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      // iOS Safari needs explicit timeout
      timeout: 20000,
      // Prevent iOS from closing connection in background
      forceNew: false,
      multiplex: true
    })
  });
};

// Update tab info when navigating (for SPAs)
export const updateTabInfo = (socket) => {
  if (socket && socket.connected) {
    socket.emit('update_tab_info', getTabInfo());
  }
};
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
-- Call sessions tracking (updated with call_logs schema)
CREATE TABLE call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL, -- UUID for this call session
    caller_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    call_type TEXT CHECK(call_type IN ('audio', 'video')) NOT NULL,
    status TEXT CHECK(status IN ('initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed')) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER, -- Calculated when call ends
    end_reason TEXT, -- 'normal', 'busy', 'timeout', 'network_error', etc.
    quality_rating INTEGER, -- 1-5 user rating (optional)
    FOREIGN KEY (caller_id) REFERENCES users(username),
    FOREIGN KEY (receiver_id) REFERENCES users(username)
);

-- Public portal chat sessions
CREATE TABLE public_chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    visitor_name TEXT,
    visitor_email TEXT,
    session_data TEXT, -- JSON: pre-chat answers, browser info
    status TEXT CHECK(status IN ('waiting', 'active', 'ended', 'abandoned')) DEFAULT 'waiting',
    assigned_to TEXT, -- Staff member handling the chat
    queue_position INTEGER,
    recovery_token TEXT, -- For session recovery within time window
    recovery_expires_at TIMESTAMP,
    ticket_created TEXT, -- Link to auto-created ticket if applicable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(username)
);

-- Public portal messages
CREATE TABLE public_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    sender_type TEXT CHECK(sender_type IN ('guest', 'staff', 'system')) NOT NULL,
    sender_id TEXT, -- user_id for staff, null for guest
    sender_name TEXT NOT NULL, -- Display name
    message_text TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('text', 'file', 'system', 'ticket_link')) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
    FOREIGN KEY (sender_id) REFERENCES users(username)
);

-- Widget animation settings
CREATE TABLE widget_animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    widget_type TEXT CHECK(widget_type IN ('internal', 'public_portal')) NOT NULL,
    animation_name TEXT NOT NULL, -- bounce, pulse, shake, glow, slideIn
    animation_trigger TEXT NOT NULL, -- on_message, on_hover, on_connect, idle
    duration_ms INTEGER DEFAULT 500,
    timing_function TEXT DEFAULT 'ease-in-out',
    intensity INTEGER DEFAULT 1, -- 1-5 scale
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Public portal widget settings
CREATE TABLE public_portal_widget_settings (
    id INTEGER PRIMARY KEY,
    enabled_pages TEXT DEFAULT '[]', -- JSON array of page paths
    widget_shape TEXT DEFAULT 'circle',
    widget_color TEXT DEFAULT '#1976d2',
    widget_image TEXT, -- Optional mini image/logo
    position TEXT DEFAULT 'bottom-right',
    welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
    offline_message TEXT DEFAULT 'We are currently offline. Please submit a ticket.',
    pre_chat_questions TEXT DEFAULT '[]', -- JSON array of questions
    session_recovery_enabled BOOLEAN DEFAULT TRUE,
    session_recovery_minutes INTEGER DEFAULT 5,
    auto_ticket_creation BOOLEAN DEFAULT TRUE,
    -- Rating System Settings
    session_rating_enabled BOOLEAN DEFAULT TRUE,
    rating_prompt_message TEXT DEFAULT 'How would you rate your support experience?',
    comment_enabled BOOLEAN DEFAULT TRUE,
    comment_prompt_message TEXT DEFAULT 'Would you like to leave a comment about your experience?',
    comment_placeholder TEXT DEFAULT 'Tell us how we can improve...',
    comment_required BOOLEAN DEFAULT FALSE,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- Public portal session ratings
CREATE TABLE public_chat_session_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT, -- Optional feedback comment
    browser_fingerprint TEXT, -- Fraud prevention
    ip_address TEXT, -- Additional fraud prevention
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
    UNIQUE(session_id) -- One rating per session for fraud prevention
);

-- Staff rating analytics summaries
CREATE TABLE staff_rating_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_username TEXT NOT NULL,
    rating_period TEXT CHECK(rating_period IN ('daily', 'weekly', 'monthly')) NOT NULL,
    period_date TEXT NOT NULL, -- YYYY-MM-DD format
    total_ratings INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_1_count INTEGER DEFAULT 0,
    rating_2_count INTEGER DEFAULT 0,
    rating_3_count INTEGER DEFAULT 0,
    rating_4_count INTEGER DEFAULT 0,
    rating_5_count INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_username) REFERENCES users(username),
    UNIQUE(staff_username, rating_period, period_date)
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

## 📊 **Integrated Implementation Timeline**

### **Concurrent Development Approach (Single Team)**
| Phase | Duration | Focus Area | Can Start After | Notes |
|-------|----------|------------|-----------------|-------|
| **Phase 1** | 2-3 days | Database & Socket.io | Day 1 | Chat tables + call_logs table |
| **Phase 2** | 3-4 days | Core Chat APIs | Phase 1 | Basic messaging endpoints |
| **Phase 3** | 4-5 days | Chat UI Components | Phase 2 | Full chat interface |
| **Phase 8** | 2-3 days | WebRTC Foundation | Phase 1 | **Start after Phase 2** |
| **Phase 4** | 2-3 days | Chat Widget | Phase 3 | Mini chat component |
| **Phase 9** | 2-3 days | Audio Calls | Phase 8 | **Overlap with Phase 4** |
| **Phase 5** | 3-4 days | Advanced Chat | Phase 4 | DMs, channels, groups |
| **Phase 10** | 2-3 days | Video Calls | Phase 9 | **Overlap with Phase 5** |
| **Phase 6** | 2-3 days | File Sharing | Phase 5 | Drag & drop uploads |
| **Phase 7** | 2-3 days | Polish & Admin | Phase 6 | Performance & UX |

### **Timeline Summary**
- **Sequential Approach**: 30-35 days (all phases one after another)
- **Integrated Approach**: 22-27 days (audio/video woven into chat development)
- **Time Saved**: 8 days by developing features concurrently
- **Single Team Advantage**: Same developers understand both systems deeply

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

## 🍎 **Safari/iOS Special Handling**

### **WebRTC Considerations**
1. **User Gesture Requirement**: iOS Safari requires user interaction before `getUserMedia()`
2. **Track Ordering**: Audio tracks must be added before video tracks
3. **Codec Preferences**: H.264 must be explicitly preferred for video
4. **Connection Config**: Requires `unified-plan` SDP semantics

### **Socket.io Considerations**
1. **Transport Order**: Start with WebSocket, fallback to polling
2. **Background Handling**: iOS aggressively closes connections
3. **Reconnection**: Need explicit reconnection settings
4. **Timeouts**: Longer timeouts needed for iOS

### **UI/UX Considerations**
1. **Permission Prompts**: Show clear instructions before requesting camera/mic
2. **Playback Policy**: Videos must be muted or user-initiated
3. **Fullscreen**: Different fullscreen API for iOS Safari
4. **Touch Events**: Use touch-friendly UI elements

### **Testing Requirements**
- Test on real iOS devices (simulators don't support WebRTC)
- Test both Safari and Chrome on iOS (same WebKit engine)
- Test background/foreground transitions
- Test with different network conditions

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

---

## 🌐 **Public Portal Live Chat Integration**

### **Enhanced Features Added**

#### **Public Portal Live Chat System** 🎆 (NEW)
- ✨ **Guest support chat** without account creation
- ✨ **Customizable widget animations** (bounce, pulse, shake, glow, slide-in, rotation)
- ✨ **Session recovery system** for connection issues (5-minute customizable window)
- ✨ **Queue management** for staff to handle multiple public chats
- ✨ **Auto-ticket creation** from chat conversations
- ✨ **Pre-chat form builder** with customizable questions tied to ticket categories
- ✨ **Page visibility controls** for widget placement
- ✨ **Typing indicators** for both internal and public portal users

#### **Component-Based Architecture** 🔧 (NEW)
- ✨ **Modular design** with 20+ reusable components
- ✨ **Maintainable structure** for easy updates and debugging
- ✨ **Shared components** between internal and public chat
- ✨ **Independent development and testing** of components

#### **Advanced Widget System** 🎨 (NEW)
- ✨ **Animation library** with 6 different effects and customizable triggers
- ✨ **Dual widget support** (internal system + public portal)
- ✨ **Real-time preview** of animation settings in admin interface
- ✨ **Mini image/branding support** for both widget types

#### **Master System Control** 🔒 (NEW)
- ✨ **Emergency disable toggle** for system-wide chat shutdown
- ✨ **Graceful user notifications** when system is disabled
- ✨ **Customizable maintenance messages** 
- ✨ **Emergency controls** (force disconnect, backup, export)
- ✨ **Complete audit trail** of system status changes

### **Updated Implementation Timeline**

| Phase | Duration | Focus Area | New Features Added |
|-------|----------|------------|-----------------|
| **Phase 1** | 3-4 days | Database & Socket.io | + Public portal tables, system status, animations |
| **Phase 2** | 4-5 days | Core APIs & Events | + Guest authentication, typing indicators |
| **Phase 3** | 5-6 days | Component Architecture | + Modular design, public widget system |
| **Phase 4** | 3-4 days | Public Portal Integration | + Session recovery, queue management |
| **Phase 5** | 3-4 days | Advanced Features | + Animation system, auto-ticketing |
| **Phase 6** | 2-3 days | Enhanced Management | + System toggle, enhanced admin interface |
| **Phase 7** | 2-3 days | Audio/Video Calls | WebRTC integration (concurrent) |
| **Phase 8** | 2-3 days | Testing & Polish | Cross-platform testing, optimization |

**Total Development Time**: 24-32 days (4.8-6.4 weeks)

### **Enhanced Success Metrics**

#### **Public Portal Chat Success Criteria**
- ✅ **Session Recovery**: 95%+ successful session restoration within configured window
- ✅ **Animation Performance**: Smooth 60fps animations across all browsers
- ✅ **Queue Efficiency**: Staff can handle 3+ concurrent public chats effectively
- ✅ **Auto-Ticketing**: 100% of ended chats create proper ticket records
- ✅ **Mobile Compatibility**: Full functionality on iOS Safari and Android Chrome

#### **Component Architecture Success Criteria**
- ✅ **Modularity**: Each component can be developed/tested independently
- ✅ **Reusability**: Shared components work seamlessly in both contexts
- ✅ **Maintainability**: Clear separation of concerns enables easy updates
- ✅ **Performance**: Lazy loading reduces initial bundle size by 40%+

#### **System Control Success Criteria**
- ✅ **Instant Response**: System disable takes effect within 5 seconds
- ✅ **Graceful Shutdown**: All users receive proper notifications
- ✅ **Clean Recovery**: Re-enabling restores full functionality
- ✅ **Admin Visibility**: Complete status tracking and change history

---

*This comprehensive implementation plan now includes professional-grade audio/video calling capabilities, a complete public portal live chat system with session recovery, a component-based architecture for long-term maintainability, customizable widget animations, typing indicators throughout, and emergency system controls that will transform the Orvale Management System into a complete collaboration and customer support platform similar to Slack and Microsoft Teams, with the added benefits of seamless IT support workflows, guest support capabilities, and enterprise-grade administrative controls.*