# CLAUDE.md - Orvale Management System Development Guide

## 🎯 Project Overview
You are working on the **Orvale Management System** - a comprehensive unified platform that integrates ticket tracking with project management capabilities, real-time communication, knowledge management, analytics, and admin controls. The system maintains the clean architecture from the ticket system blueprint while providing a complete IT operations management solution.

## 📁 Project Structure
```
project management/
├── docs/
│   ├── Team Ticket System.md                    # Core ticket system blueprint (READ FIRST)
│   ├── Available Resources and Materials.md     # UI libraries and components catalog
│   ├── Dashboard & Achievements System.md        # Gamification and user dashboard design
│   ├── Admin Dashboard Conceptual Design.md     # Admin control panel specifications
│   ├── RBAC_PERMISSIONS_DOCUMENTATION.md        # Complete RBAC permissions reference
│   └── Chat_System_Implementation_Plan.md       # Complete chat + audio/video calling system
├── assets/                                      # Configuration data
│   ├── main-categories.js                      # 9 main ticket categories
│   ├── request-types.js                        # Request types for each category
│   ├── ticket-categories.js                    # Detailed subcategories (large file)
│   └── organizational-data.js                  # DPSS organizational structure
├── ui library/                                  # Available UI components
│   ├── evilcharts/                             # Charts and modern UI components
│   ├── material-ui/                            # Material Design components
│   ├── shadcn:ui/                              # Radix-based components
│   └── hilla/                                  # Full-stack framework
└── CLAUDE.md                                   # This file
```

## 🚀 Quick Start Commands

### Development Setup (2-Server Architecture)
```bash
# Terminal 1: Main Next.js application server (Port 80)
sudo npm run dev

# Terminal 2: Socket.io server for real-time features (Port 3001)
node socket-server.js

# Both servers must be running for full functionality
```

### Development Commands
```bash
# Linting and type checking (run after making changes)
npm run lint
npm run typecheck

# Build for production
npm run build

# Production server
sudo npm start

# Run tests
npm test

# View application logs (production mode)
tail -f logs/app.log
tail -f logs/error.log
```

### Access Points:
**Port 80 (Main Application):**
- **Public Portal**: http://localhost/ (Landing page with ticket submission)
- **Submit Tickets**: http://localhost/public-portal/ (Original ticket submission form)
- **Admin Queue**: http://localhost/tickets (IT staff ticket management)
- **Helpdesk Queue**: http://localhost/helpdesk/queue (Multi-team queue for helpdesk staff)
- **Chat System**: http://localhost/chat (Real-time chat with channels, DMs, and groups)
- **Developer Portal**: http://localhost/developer (System configuration and analytics)
- **API Health**: http://localhost/api/health (Server status check)

**Port 3001 (Socket.io Server):**
- **WebSocket Endpoint**: ws://localhost:3001/socket.io/ (Real-time chat, presence, and notifications)

## 🔄 Real-Time Features (Socket.io)

### Currently Active:
- ✅ **Real-time messaging**: Instant message delivery across channels, DMs, and groups
- ✅ **Online presence tracking**: Live user status and activity indicators  
- ✅ **Unread message counts**: Real-time badge updates
- ✅ **User typing indicators**: See when others are typing
- ✅ **Message notifications**: Instant alerts for new messages
- ✅ **Auto-reconnection**: Resilient connection handling with exponential backoff

### Socket.io Events:
- `message_received` - New message in channel/DM
- `user_joined_channel` - User joined a channel
- `user_left_channel` - User left a channel
- `typing_start` / `typing_stop` - Typing indicators
- `presence_update` - User online status changes
- `unread_count_update` - Message count changes

## 🏗️ Architecture Guidelines

### Core Files (from Ticket System Blueprint)
1. **index.html** - User ticket submission form
2. **TicketManager.js** - Main orchestrator (~800 lines)
3. **TicketAPI.js** - All API operations (~400 lines)
4. **TicketUI.js** - UI rendering and events (~500 lines)
5. **ticket-types.js** - Type definitions (~100 lines)

### Project Management Extensions
- Add project-related fields to ticket data model
- Create project dashboard views
- Implement project-ticket linking
- Add project-level permissions

## 🎨 UI Component Usage Guidelines

> 📋 **For comprehensive component usage, see `/docs/UI Libraries & Components Arsenal.md`**

### Quick Reference - Form Components
**Use Material-UI for Select** (React 19 compatible):
```javascript
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
```

**⚠️ CHAT SYSTEM EXCEPTION: Use Material-UI for ALL components**:
```javascript
// For chat system, use Material-UI exclusively (NO shadcn:ui)
import { 
  Dialog, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Avatar, Badge, Chip
} from '@mui/material';

// Use evilcharts for analytics/dashboards
import { GradientBarChart, AnimatedMetric } from '@/charts/...';
```

**Use shadcn:ui for other form elements** (non-chat pages):
```javascript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form } from "@/components/ui/form"
```

### Quick Reference - Data Display
```javascript
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
```

### Quick Reference - Charts and Analytics
```javascript
import { GradientBarChart } from "@/charts/bar-charts/gradient-bar-chart"
import { GlowingLine } from "@/charts/line-charts/glowing-line"
import { RoundedPieChart } from "@/charts/pie-charts/rounded-pie-chart"
```

### Quick Reference - Icons
**Use Lucide React** as primary icon library:
```javascript
import { Save, Search, Building2, Tag, Check, RefreshCw } from "lucide-react"
```

### Quick Reference - Animations
**Use Framer Motion** for smooth interactions:
```javascript
import { motion, AnimatePresence } from 'framer-motion';
```

## 📋 Current Development Status

**✅ COMPLETED SYSTEMS:**
- Core ticket system (Next.js, TypeScript, Tailwind CSS)
- Authentication and RBAC (86 permissions)
- Real-time chat system with Socket.io
- Admin dashboard with user management
- Helpdesk queue with multi-team support
- Public portal and ticket submission
- Database schema (23 tables)

**🚧 PENDING FEATURES:**
- WebRTC audio/video calls (Safari support)
- User dashboard gamification system
- Project management layer
- Advanced analytics and reporting

## 🔧 Technical Guidelines

### State Management
- Use React Context for global state
- Consider Jotai for complex state needs
- Keep component state local when possible

### API Integration
- All API calls through TicketAPI.js
- Use consistent error handling
- Implement proper loading states

### Styling
- Use Tailwind CSS classes exclusively
- Follow the design system from evilcharts
- Maintain dark mode support

### Performance
- Lazy load chart components
- Implement virtual scrolling for long lists
- Use React.memo for expensive components
- Optimize bundle size with dynamic imports

### Refactoring and Code Quality - CRITICAL
**⚠️ ALWAYS refactor and improve code whenever possible:**

1. **Remove External Dependencies**: Replace external libraries with lightweight custom implementations when feasible
   ```javascript
   // ❌ Don't introduce heavy external dependencies
   import rateLimit from 'express-rate-limit'; // Doesn't work with Next.js
   
   // ✅ Create lightweight custom implementations
   export const checkRateLimit = (identifier: string, windowMs: number, maxRequests: number) => {
     // Custom rate limiting logic using simple in-memory store
   };
   ```

2. **Fix Token Storage Inconsistencies**: Ensure consistent localStorage key naming
   ```javascript
   // ❌ Mixed token key names cause authentication failures
   localStorage.getItem('token')      // Dashboard looking for this
   localStorage.getItem('authToken')  // AuthContext storing this
   
   // ✅ Use consistent naming throughout the application
   const TOKEN_KEY = 'authToken'; // Define once, use everywhere
   ```

3. **Simplify Complex Code**: Break down large functions, remove unnecessary abstractions
   ```javascript
   // ❌ Overly complex nested security handlers
   createSecureHandler({ ... })(request, async (req, context) => {
     return createSecureHandler({ ... })(req, async () => { ... });
   });
   
   // ✅ Flat, clear security patterns
   const authResult = await verifyAuth(request);
   if (!authResult.success) return unauthorized();
   ```

4. **Eliminate Build Errors**: Fix syntax errors, missing dependencies, type mismatches immediately
   ```javascript
   // ❌ Syntax errors that break the build
   try {
     // some code
     return success();
   } catch (error) { // Missing opening brace or wrong nesting
   
   // ✅ Clean, proper error handling
   try {
     const result = await operation();
     return NextResponse.json({ success: true, data: result });
   } catch (error) {
     return NextResponse.json({ error: error.message }, { status: 500 });
   }
   ```

5. **Database Consistency**: Ensure permission names exist in database and UI
   ```javascript
   // ❌ Using permissions that don't exist in database
   requiredPermissions: ['portal.view_dashboard'] // Not in database
   
   // ✅ Add missing permissions to both database and UI
   // 1. Add to database: INSERT INTO role_permissions...
   // 2. Add to UI permissions list: AVAILABLE_PERMISSIONS array
   // 3. Then use in code
   ```

**Refactoring Priorities:**
1. **Authentication Flow**: Fix token inconsistencies
2. **Dependencies**: Remove external libs, create custom implementations  
3. **Error Handling**: Consistent patterns across all APIs
4. **Permission System**: Ensure database-UI consistency
5. **Code Structure**: Simplify complex nested handlers

### Logging System
The system uses **Pino** for production-grade structured logging:

```javascript
// Import structured loggers
import { ticketLogger, authLogger, systemLogger } from '@/lib/logger';

// Ticket operations
ticketLogger.created(ticketId, submittedBy, team);
ticketLogger.updated(ticketId, updatedBy, changes);
ticketLogger.escalated(ticketId, escalatedBy, reason);

// Authentication events
authLogger.login(username, ipAddress, success);
authLogger.permissionDenied(username, action, resource);

// System events
systemLogger.startup(port);
systemLogger.configUpdated(setting, updatedBy);
```

**Log Configuration:**
- **Development**: Pretty-printed console output
- **Production**: File output (`logs/app.log`, `logs/error.log`) + console
- **Dynamic Control**: Change log level via Admin → System Settings → Advanced
- **Structured Data**: All logs include context, timestamps, and event types

## 🎯 Component Selection Guide

### For Ticket Management:
| Feature | Component Library | Specific Component |
|---------|------------------|-------------------|
| Forms | shadcn:ui | Form, Input, Select |
| Ticket List | shadcn:ui | DataTable |
| Status | evilcharts | Badge |
| Modals | shadcn:ui | Dialog, Sheet |
| Navigation | evilcharts | Sidebar, Breadcrumb |

### For Project Management:
| Feature | Component Library | Specific Component |
|---------|------------------|-------------------|
| Dashboard | evilcharts | Chart components |
| Timeline | evilcharts | Custom with LineChart |
| Kanban | shadcn:ui | With dnd-kit |
| Resources | material-ui | DataGrid |
| Analytics | evilcharts | All chart types |

## 🚨 Important Patterns

### 🍎 Safari/iOS WebRTC & Socket.io Handling

**CRITICAL for Chat System Implementation:**

1. **WebRTC Requirements**:
   - User gesture required before `getUserMedia()` on iOS
   - Audio tracks must be added before video tracks
   - H.264 codec must be explicitly preferred
   - Use `unified-plan` SDP semantics

2. **Socket.io Configuration**:
   ```javascript
   // Safari/iOS specific settings
   const socket = io({
     transports: ['websocket', 'polling'], // Order matters!
     reconnection: true,
     reconnectionDelay: 1000,
     timeout: 20000 // iOS needs longer timeouts
   });
   ```

3. **Testing Requirements**:
   - Test on REAL iOS devices (simulators don't support WebRTC)
   - Test background/foreground transitions
   - Test with poor network conditions

### 🔌 Socket.io Singleton Pattern - CRITICAL FOR REAL-TIME FEATURES

**IMPORTANT: All Socket.io connections must use the singleton client pattern to prevent connection issues and enable WebRTC signaling for audio/video calls.**

#### 🎯 **Why Singleton is Required**

1. **Single Persistent Connection**: Prevents multiple Socket.io connections from different components
2. **Real-time Message Delivery**: Ensures messages appear instantly without navigation refresh
3. **WebRTC Signaling**: Required for audio/video call signaling (future implementation)
4. **Resource Efficiency**: Reduces server load and client-side connection overhead
5. **React StrictMode Safe**: Prevents double-connection issues in development

#### ✅ **Socket.io Singleton Implementation**

**Location**: `/lib/socket-client.ts`

```javascript
import { socketClient } from '@/lib/socket-client';

// ✅ CORRECT: Use singleton in all chat components
const componentId = useRef(`ComponentName_${chat.id}_${Date.now()}`).current;

// Connect (shared connection)
const socket = socketClient.connect(token);

// Add event listeners (component-scoped)
socketClient.addEventListener(componentId, 'message_received', (data) => {
  // Handle message
});

// Emit events
socketClient.emit('send_message', { channelId, message });
socketClient.sendMessage(channelId, message, 'text'); // Helper method

// Join/leave channels
socketClient.joinChannel(channelId);
socketClient.leaveChannel(channelId);

// Cleanup (only removes this component's listeners)
return () => {
  socketClient.removeEventListeners(componentId);
};
```

#### ❌ **What NOT to do:**

```javascript
// DON'T: Create direct Socket.io connections
const socket = io('http://localhost:3001', { auth: { token } });

// DON'T: Disconnect shared socket in cleanup
socket.disconnect(); // Breaks other components!
```

#### 🏗️ **Component Usage Pattern**

1. **MessageArea.tsx**: Joins active channel for messaging + listens to all events
2. **ChatSidebar.tsx**: Listens to `message_notification` only for unread counts (NO channel joins)
3. **ChatWidget.tsx**: Listens to `message_received` for conversation updates
4. **Future Audio/Video**: Will use same singleton for WebRTC signaling events

#### 🔄 **Event Flow**

```
User sends message in MessageArea
    ↓
socketClient.sendMessage() → Server
    ↓
Server broadcasts message_received → All connected clients
    ↓
All components receive via their addEventListener handlers:
- MessageArea: Updates message list in real-time
- ChatSidebar: Updates unread count badge
- ChatWidget: Updates conversation preview
```

#### 🚀 **Future WebRTC Integration**

The singleton pattern is **REQUIRED** for audio/video calls:

```javascript
// Future WebRTC implementation will use same singleton
socketClient.addEventListener(componentId, 'call:incoming', (data) => {
  // Handle incoming call
});

socketClient.addEventListener(componentId, 'call:ice_candidate', (data) => {
  // Handle WebRTC ICE candidate
});

socketClient.emit('call:invite', { targetUserId, callType: 'video', offer });
```

**This ensures all real-time features (chat + audio/video) share the same reliable connection.**

### ⚠️ UI Library Mixing - CRITICAL LESSONS LEARNED

**NEVER mix different UI libraries for the same component type**. This causes focus management conflicts and infinite recursion errors, especially with React 19.

#### ❌ **What NOT to do:**
```javascript
// DON'T MIX: Radix UI Dialog with Material UI Select
import { Dialog, DialogContent } from '@/components/ui/dialog'; // Radix UI
import { Select, MenuItem } from '@mui/material'; // Material UI

// This causes focus-scope infinite recursion errors!
<Dialog>
  <DialogContent>
    <Select> {/* Focus conflict! */}
      <MenuItem>Option 1</MenuItem>
    </Select>
  </DialogContent>
</Dialog>
```

#### ✅ **What TO do:**
```javascript
// USE CONSISTENTLY: All Material UI for modals with dropdowns
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Select, 
  MenuItem,
  TextField,
  Button,
  Paper,
  Box,
  Tabs,
  Tab
} from '@mui/material'; // All from same library

<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Create New Item</DialogTitle>
  <DialogContent>
    <Select> {/* No focus conflicts! */}
      <MenuItem>Option 1</MenuItem>
    </Select>
    <TextField label="Input Field" />
  </DialogContent>
  <DialogActions>
    <Button>Action</Button>
  </DialogActions>
</Dialog>
```

#### 🔧 **Library-Specific Guidelines:**

**For React 19 compatibility with dropdowns in modals:**
- **Use Material UI**: `Dialog` + `Select` + `MenuItem` (fully compatible)
- **Avoid Radix UI**: `Dialog` + Material UI `Select` (causes focus errors)
- **Update packages**: Keep Radix UI at latest versions for React 19

**Component consistency rules:**
1. **Modal + Dropdown**: Use same library for both
2. **Form components**: Stick to one library per form
3. **Interactive elements**: Don't mix focus-managed components

#### 📚 **Error signatures to watch for:**
```
focus-scope.tsx:295 Uncaught RangeError: Maximum call stack size exceeded
```
**Solution**: Check for mixed UI libraries in modals/dropdowns

#### ✅ **Complete Modal Conversion Pattern (StaffTicketModal Example):**
When converting from mixed libraries to full Material-UI:

1. **Replace Dialog Structure:**
```javascript
// From shadcn:ui Dialog
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>

// To Material-UI Dialog
<Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="lg" fullWidth>
  <DialogTitle>Title</DialogTitle>
  <DialogContent>
    <Typography variant="body2" color="text.secondary">Description</Typography>
```

2. **Replace Tabs with Material-UI:**
```javascript
// From shadcn:ui Tabs
<Tabs defaultValue="tab1">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content</TabsContent>
</Tabs>

// To Material-UI Tabs
const [activeTab, setActiveTab] = useState('tab1');
<Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
  <Tab label="Tab 1" value="tab1" />
</Tabs>
{activeTab === 'tab1' && <Box>Content</Box>}
```

3. **Replace Form Components:**
```javascript
// From shadcn:ui + Material-UI mix
<Input /> + <Textarea /> + <Select><MenuItem /></Select>

// To Material-UI only
<TextField /> + <TextField multiline /> + <Select><MenuItem /></Select>
```

### 🚨 **Component Migration Status**

**Migration to Material-UI (COMPLETED):**
Most components have been successfully migrated to Material-UI for modal compatibility.

**Remaining components to migrate as needed:**
- `components/RowEditorDialog.tsx`
- `components/ColumnEditorDialog.tsx`

**Rule**: For any new modals with dropdowns, use Material-UI exclusively to avoid focus conflicts.

### 🎨 Tabs Component Pattern - IMPORTANT

**The `TabsList` component from shadcn:ui requires specific classes for horizontal layout:**

#### ❌ **Common Issue - Vertical Stacking:**
```javascript
// This creates vertically stacked tabs (incorrect for most use cases)
<TabsList className="grid grid-cols-4">
```

#### ✅ **Correct Pattern - Horizontal Tabs:**
```javascript
// For horizontal tabs, use the grid with explicit width
<TabsList className="grid w-full grid-cols-4">
```

#### 🔧 **Key Rules:**
- **TabsList**: Always include `w-full` with grid layouts for horizontal display
- **Modal + Select**: Use Material-UI exclusively in modals to avoid focus conflicts
- **Never mix**: Don't use different UI libraries for the same component type

### 🚫 Mock Data in Components - CRITICAL LESSON LEARNED

**NEVER use mock data in components for development**. Always load real data from APIs to avoid wasting time debugging phantom issues.

#### ❌ **What NOT to do:**
```javascript
// DON'T: Mock data in components
const ChatSidebar = () => {
  const [chatData, setChatData] = useState({
    directMessages: [
      { id: 'dm_1', name: 'mock_user', displayName: 'Mock User' }, // Mock data!
    ],
    channels: [
      { id: '1', name: 'general', displayName: '#general' }, // Mock data!
    ]
  });
  
  // This leads to confusion when debugging real API issues
  // Messages may work with mock data but fail with real API
```

#### ✅ **What TO do:**
```javascript
// DO: Always load real data from APIs
const ChatSidebar = () => {
  const [chatData, setChatData] = useState({ directMessages: [], channels: [] });
  
  useEffect(() => {
    // Load real data from API
    const loadChats = async () => {
      const response = await fetch('/api/chat/channels');
      const data = await response.json();
      setChatData(data);
    };
    loadChats();
  }, []);
```

#### 🔧 **Lessons Learned:**
1. **Mock data masks real issues**: Real API problems hidden by working mock data
2. **Authentication issues invisible**: Mock data doesn't require auth tokens
3. **Database schema mismatches hidden**: Mock structure may not match real API
4. **Time wasted debugging**: Phantom issues that don't exist with real data

**Debugging Rule**: If something works in isolation but fails integrated, check for mock data masking real API issues.

### API Response Handling
```javascript
try {
  const response = await TicketAPI.getTickets(filters);
  // Handle success
} catch (error) {
  showNotification(error.message, 'error');
}
```

### 🔒 RBAC Permission Checks

**IMPORTANT: Always check permissions before showing UI or processing actions**

#### Frontend Permission Checks
```javascript
// Single permission check
if (user.permissions?.includes('ticket.assign_within_team')) {
  // Show assignment UI
}

// Multiple permission check (OR logic)
if (user.permissions?.includes('portal.manage_settings') || 
    user.permissions?.includes('admin.system_settings')) {
  // Show portal settings access
}

// Role-based shortcuts (use permissions instead)
const hasAdminAccess = user.role === 'admin';  // ❌ Don't do this
const hasAdminAccess = user.permissions?.includes('admin.system_settings'); // ✅ Correct
```

#### API Permission Enforcement
```javascript
// In API routes - ALWAYS verify permissions
const authResult = await verifyAuth(request);
if (!authResult.success || !authResult.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Check specific permission
if (!authResult.user.permissions?.includes('portal.manage_templates')) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
}
```

#### Component-Level Permission Guards
```javascript
// Use permission guards in components
const PermissionGuard = ({ permission, children, fallback = null }) => {
  const { user } = useAuth();
  if (!user?.permissions?.includes(permission)) {
    return fallback;
  }
  return children;
};

// Usage
<PermissionGuard permission="admin.manage_users">
  <UserManagementButton />
</PermissionGuard>
```

**📚 Complete Permission Reference:** See `/docs/RBAC_PERMISSIONS_DOCUMENTATION.md` for all 33 available permissions across 10 categories.

### Form Validation
```javascript
// Use Zod with react-hook-form
const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description too short"),
});
```

## 📝 Code Style Guidelines

1. **No unnecessary comments** - code should be self-documenting
2. **Consistent naming** - use existing patterns
3. **Component structure** - follow shadcn:ui patterns
4. **Error handling** - always handle edge cases
5. **Type safety** - use TypeScript strictly

## 🔄 Git Workflow Guidelines

### **Commit After Each Completed Change**
To maintain clean development history and enable easy reverting:

1. **Commit Frequency**: After completing each discrete feature or fix
2. **Atomic Commits**: Each commit should represent one logical change
3. **Descriptive Messages**: Clear commit messages explaining what was changed
4. **Push Regularly**: Sync to remote after each commit for backup

### **Standard Git Workflow**
```bash
# After completing a feature/change
git add .
git status                    # Review what's being committed
git commit -m "Brief description of change"
git push origin main          # Sync to remote immediately
```

### **Commit Message Format**
```bash
git commit -m "$(cat <<'EOF'
Brief description of the main change

- Specific change 1
- Specific change 2  
- Specific change 3

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### **When to Commit**
- ✅ **After completing a component** (e.g., new modal, new page)
- ✅ **After adding a new API endpoint** that works
- ✅ **After fixing a bug** or issue
- ✅ **After updating documentation** 
- ✅ **After completing a todo item**
- ✅ **Before starting a major refactor**

### **When NOT to Commit**
- ❌ **Broken or incomplete code** that doesn't compile
- ❌ **Half-implemented features** without basic functionality
- ❌ **Debug/test code** that shouldn't be in production

### **Emergency Reverting**
```bash
# View recent commits
git log --oneline -5

# Revert last commit (soft - keeps changes)
git reset HEAD~1

# Revert last commit (hard - discards changes)
git reset --hard HEAD~1

# Revert specific commit
git revert <commit-hash>

# Push revert to remote
git push origin main --force-with-lease
```

### **Branch Protection**
- **Always work on main branch** for this project
- **Use --force-with-lease** instead of --force for safety
- **Test locally** before pushing to remote

## 🔍 Testing Guidelines

Run these commands after changes:
```bash
npm run lint        # Check code style
npm run typecheck   # Verify TypeScript
npm test           # Run unit tests
```

## 📊 Data Configuration

### Ticket Categories (from assets/)
The system includes pre-configured ticket categories:
- **9 Main Categories**: Application Support, Hardware, Infrastructure, etc.
- **Request Types**: Specific types for each category
- **Subcategories**: Detailed options for each request type
- **Organizational Data**: DPSS offices, bureaus, divisions, sections

### Usage Example:
```javascript
import { categories } from './assets/main-categories.js';
import { requestTypes } from './assets/request-types.js';
import { subcategories } from './assets/ticket-categories.js';
import { organizationalData } from './assets/organizational-data.js';
```

## 🗄️ Database Schema Documentation

The Orvale Management System uses SQLite database (`orvale_tickets.db`) with 41+ tables organized into 7 functional groups:

### 1. **Authentication & Authorization Tables**
- **users**: User accounts with authentication details
- **roles**: System roles (admin, manager, support, user)
- **role_permissions**: Maps permissions to roles (86 permissions total)

### 2. **Ticket Management Tables**
- **user_tickets**: Main ticket records with all ticket information
- **ticket_history**: Legacy audit trail for tickets
- **ticket_history_detailed**: Comprehensive ticket activity tracking
- **ticket_sequences**: Generates unique ticket numbers per team

### 3. **Organization Structure Tables**
**DPSS Hierarchy:**
- **dpss_offices**: Top-level offices (e.g., Director's Office)
- **dpss_bureaus**: Bureaus within offices
- **dpss_divisions**: Divisions within bureaus  
- **dpss_sections**: Sections within divisions
- **sections**: Legacy sections table

**Ticket Classification:**
- **ticket_categories**: 9 main categories (Application Support, Hardware, etc.)
- **request_types**: Types for each category
- **subcategories**: Detailed subcategories
- **implementations**: Most specific classification level

### 4. **Team Management Tables** ⚠️ **CRITICAL DISTINCTION**

#### **teams** vs **support_teams** - DO NOT CONFUSE THESE:

**`teams` Table (Internal/Queue Teams):**
- Used by: Ticket queue, helpdesk queue, team assignment
- Purpose: Internal teams that actually work on tickets
- Examples: `ITTS_Region7`, `HELPDESK`, `NET_North`, `DEV_Alpha`
- Used in: `user_tickets.assigned_team`, helpdesk functionality
- Schema: `id, name, description, section_id, lead_user_id, active`

**`support_teams` Table (Public Portal Teams):**
- Used by: Public portal ticket submission form
- Purpose: User-facing team options for ticket routing
- Examples: `dpss_academy`, `crossroads_main`, `bhr_tech`
- Used in: Public portal dropdowns, initial ticket routing
- Schema: `id, group_id, name, label, email, description, sort_order, active`

**Additional Team Tables:**
- **support_team_groups**: Groups to organize support_teams (for public portal)
- **helpdesk_team_preferences**: User preferences for helpdesk multi-queue view

#### **When to Use Which:**
- **Helpdesk APIs**: Use `teams` table (internal teams that work tickets)
- **Public Portal**: Use `support_teams` table (user-facing options)
- **Ticket Assignment**: Use `teams` table (where tickets get assigned)
- **Team Metrics**: Use `teams` table (teams that handle workload)

### 5. **Configuration Tables**
- **portal_settings**: Public portal configuration (branding, messages)
- **system_settings**: System-wide settings (maintenance mode, logging)
- **system_settings_audit**: Tracks all system setting changes

### 6. **System Tables**
- **backup_log**: Database backup history

### 7. **Chat System Tables** 💬 **COMPREHENSIVE CHAT ANALYTICS**

The chat system includes 18 specialized tables for internal and public portal chat functionality:

#### **Internal Chat Tables:**
- **chat_channels**: Public channels, private channels, DMs, and groups
- **chat_channel_members**: Channel membership with roles (owner, admin, moderator, member)
- **chat_messages**: All internal chat messages with threading and file support
- **user_presence**: Real-time user status (online, away, busy, offline)
- **user_chat_preferences**: Individual user settings and theme preferences
- **chat_files**: File attachments in chat messages
- **message_reactions**: Emoji reactions to messages
- **call_logs**: Audio/video call history with quality ratings

#### **Public Portal Chat Tables:**
- **public_chat_sessions**: Guest chat sessions with staff assignment tracking
- **public_chat_messages**: Messages between guests and staff
- **public_chat_session_ratings**: Guest satisfaction ratings (1-5 stars)
- **public_chat_session_events**: Session lifecycle events (connect, transfer, disconnect)
- **public_chat_typing_status**: Real-time typing indicators
- **public_chat_read_receipts**: Message delivery and read status
- **staff_work_modes**: Staff availability status (ready, work_mode, ticketing_mode, offline)
- **staff_work_mode_history**: Work mode change audit trail

#### **Chat Analytics & Metrics:**
- **staff_rating_summaries**: Aggregated staff performance ratings by period
- **gif_usage_log**: GIF usage tracking with rate limiting
- **chat_system_settings**: Admin-configurable chat settings

#### **Key Chat Metrics Available:**

**📊 Public Portal Chat Analytics:**
```sql
-- Users helped per staff member
SELECT 
  assigned_to as staff_member,
  COUNT(*) as sessions_handled,
  AVG(total_chat_duration) as avg_session_duration,
  AVG(first_response_time) as avg_response_time
FROM public_chat_sessions 
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;

-- Customer satisfaction ratings
SELECT 
  AVG(rating) as avg_rating,
  COUNT(*) as total_ratings,
  staff_username
FROM public_chat_session_ratings r
JOIN public_chat_sessions s ON r.session_id = s.session_id
WHERE s.assigned_to IS NOT NULL
GROUP BY s.assigned_to;

-- Tickets created from chat sessions
SELECT 
  COUNT(*) as tickets_from_chat
FROM public_chat_sessions 
WHERE ticket_created IS NOT NULL;
```

**📈 Internal Chat Analytics:**
```sql
-- Most active chat channels
SELECT 
  c.name as channel_name,
  COUNT(m.id) as message_count,
  COUNT(DISTINCT m.user_id) as unique_users
FROM chat_channels c
JOIN chat_messages m ON c.id = m.channel_id
WHERE c.type = 'public_channel'
GROUP BY c.id, c.name;

-- User engagement metrics
SELECT 
  user_id,
  COUNT(*) as messages_sent,
  COUNT(DISTINCT channel_id) as channels_active
FROM chat_messages
GROUP BY user_id;
```

**🎯 Dashboard Metrics Integration:**
- **Users Helped**: Count of completed public chat sessions per staff member
- **Average Rating**: Customer satisfaction scores from session ratings
- **Response Time**: Time from guest message to first staff response
- **Resolution Time**: Total duration of chat sessions
- **Tickets from Chat**: Auto-created tickets from chat interactions
- **Active Channels**: Most used internal communication channels
- **Staff Availability**: Real-time work mode distribution

### Key Relationships

```
users ←→ roles (via role_id)
roles ←→ role_permissions (via role_id)
user_tickets ←→ teams (via assigned_team)
user_tickets ←→ users (via assigned_to, submitted_by)
ticket_history_detailed ←→ user_tickets (via ticket_id)
helpdesk_team_preferences ←→ users & teams
dpss_offices → dpss_bureaus → dpss_divisions → dpss_sections (hierarchical)
ticket_categories → request_types → subcategories → implementations (hierarchical)
support_teams ←→ support_team_groups (via group_id)

-- Chat System Relationships
chat_channels ←→ chat_messages (via channel_id)
chat_channel_members ←→ users & chat_channels (via user_id, channel_id)
chat_messages ←→ users (via user_id)
public_chat_sessions ←→ users (via assigned_to)
public_chat_sessions ←→ user_tickets (via ticket_created)
public_chat_messages ←→ public_chat_sessions (via session_id)
public_chat_session_ratings ←→ public_chat_sessions (via session_id)
staff_work_modes ←→ users (via username)
call_logs ←→ users (via caller_id, receiver_id)
```

### Important Design Patterns

1. **Audit Trails**: Both `ticket_history_detailed` and `system_settings_audit` provide comprehensive change tracking
2. **Soft Deletes**: Most tables use `active` flags instead of hard deletes
3. **Hierarchical Data**: Both DPSS structure and ticket categories use parent-child relationships
4. **JSON Storage**: Used for flexible data like `computer_info` and permission overrides
5. **Team Separation**: **CRITICAL** - `teams` for internal ticket processing/helpdesk, `support_teams` for public portal submission only
6. **Chat Session Lifecycle**: Public chat sessions track complete interaction flow from waiting → active → ended/abandoned
7. **Real-time Presence**: User presence and typing status with automatic cleanup and expiration
8. **Message Threading**: Both internal and public chat support message replies and threading
9. **Staff Work Modes**: Granular availability tracking for chat assignment and workload management
10. **Performance Metrics**: Built-in timing fields for response time and resolution analytics

### Common Operations

**Get user with permissions:**
```sql
SELECT u.*, r.name as role_name, 
       GROUP_CONCAT(rp.permission) as permissions
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE u.username = ?
GROUP BY u.id;
```

**Get tickets with team info:**
```sql
SELECT ut.*, t.name as team_name, 
       u1.display_name as assigned_to_name,
       u2.display_name as submitted_by_name
FROM user_tickets ut
LEFT JOIN teams t ON ut.assigned_team = t.id
LEFT JOIN users u1 ON ut.assigned_to = u1.username
LEFT JOIN users u2 ON ut.submitted_by = u2.username;
```

**Get chat metrics for dashboard:**
```sql
-- Staff chat performance (public portal)
SELECT 
  u.display_name as staff_name,
  COUNT(pcs.id) as sessions_handled,
  AVG(pcs.total_chat_duration) as avg_duration_seconds,
  AVG(pcs.first_response_time) as avg_response_time_seconds,
  COUNT(pcs.ticket_created) as tickets_created_from_chat,
  AVG(pcsr.rating) as avg_rating
FROM users u
LEFT JOIN public_chat_sessions pcs ON u.username = pcs.assigned_to 
  AND pcs.status IN ('ended', 'abandoned')
LEFT JOIN public_chat_session_ratings pcsr ON pcs.session_id = pcsr.session_id
WHERE u.role_id IN ('support', 'helpdesk', 'manager', 'admin')
GROUP BY u.username, u.display_name;
```

**Get active chat channels with message counts:**
```sql
SELECT 
  cc.name as channel_name,
  cc.type as channel_type,
  COUNT(DISTINCT ccm.user_id) as member_count,
  COUNT(cm.id) as message_count,
  MAX(cm.created_at) as last_activity
FROM chat_channels cc
LEFT JOIN chat_channel_members ccm ON cc.id = ccm.channel_id
LEFT JOIN chat_messages cm ON cc.id = cm.channel_id 
  AND cm.is_deleted = FALSE
WHERE cc.active = TRUE
GROUP BY cc.id, cc.name, cc.type
ORDER BY last_activity DESC;
```

## 📚 Key Resources

1. **Team Ticket System.md** - Core system architecture
2. **UI Libraries & Components Arsenal.md** - **COMPREHENSIVE UI COMPONENT REFERENCE** ⭐
3. **Available Resources and Materials.md** - Component catalog
4. **Dashboard & Achievements System.md** - Gamification features
5. **Admin Dashboard Conceptual Design.md** - Admin panel specs
6. **RBAC_PERMISSIONS_DOCUMENTATION.md** - **COMPLETE RBAC PERMISSIONS REFERENCE** 🔒
7. **Helpdesk_Permissions_Design.md** - **HELPDESK PERMISSIONS & FEATURES GUIDE** 🎧
8. **shadcn:ui docs** - Component examples
9. **evilcharts examples** - Chart implementations

## 🎮 Key Features Summary

**✅ IMPLEMENTED FEATURES:**
- **Admin Dashboard**: User management, RBAC control (86 permissions), system settings
- **Helpdesk Queue**: Multi-team view, team preferences, status tabs, real-time updates
- **Real-time Chat**: Messaging, presence tracking, unread counts, typing indicators
- **Ticket Management**: Full CRUD operations, assignment, status tracking, history

**🚧 PENDING IMPLEMENTATION:**
- **User Dashboard**: Activity heatmap, achievement badges, team leaderboards
- **WebRTC Calls**: Audio/video calls with Safari support
- **Project Management**: Project-ticket linking, project analytics
- **Advanced Analytics**: Custom dashboards, performance reports

## 💡 Tips for Success

1. **Start with the ticket system blueprint** - Don't deviate from the 4-file architecture
2. **Use existing components** - Don't create custom UI when libraries provide it
3. **Follow the permission model** - Respect the RBAC system design (86 permissions)
4. **Leverage existing data** - Use the pre-configured categories from assets/
5. **Implement gamification thoughtfully** - Make achievements meaningful
6. **Maintain simplicity** - The goal is 90% functionality with 20% complexity
7. **Test incrementally** - Verify each phase before moving forward
8. **⚠️ CRITICAL: Use correct team tables** - `teams` for helpdesk/queue functionality, `support_teams` for public portal only

## 🏢 DPSS Organizational Hierarchy - CRITICAL UNDERSTANDING

**Location Hierarchy for Tickets:**
```
Location → Office → Bureau → Division → Section
```

### **Location vs Office Distinction:**
- **Location**: "Bureau of Human Resources" (building/facility level)
- **Office**: "IT Security Office" or "Fiscal Management Division" (specific office within that building)

**CRITICAL**: Location is ABOVE Office in the hierarchy, not below. Location represents the physical building or facility, while Office represents the specific department within that building.

### **Real-World Example:**
```
Location: "Bureau of Human Resources" (the physical building)
├── Office: "IT Security Office" (department within BHR building)
├── Office: "Fiscal Management Division" (another department in same building)
└── Office: "Human Resources Operations" (another department in same building)
```

### **Critical Field Usage:**
- **Location**: Required - represents building/facility where user works (ABOVE Office level)
- **Office**: Required - specific department within the location building
- **Employee Number**: Required - serves as username identifier for DPSS
- **Username**: Removed - redundant since Employee Number IS the username
- **Display Name**: Required - human-readable name for tickets

### **Database Field Mapping:**
```sql
-- User information in tickets
user_name          -- Display name (human-readable)
employee_number    -- Username identifier (unique)
location          -- Building/facility (TOP level - e.g., "Bureau of Human Resources")
office            -- Specific office within the location (e.g., "IT Security Office")
bureau            -- Bureau within office
division          -- Division within bureau  
section           -- Section within division
```

### **Hierarchy Examples:**
```
Location: "Bureau of Human Resources" (Physical building)
  └── Office: "IT Security Office" (Department in BHR building)
      └── Bureau: "Network Security Bureau" (Unit within IT Security)
          └── Division: "Cybersecurity Division" (Team within bureau)
              └── Section: "Threat Analysis Section" (Group within division)
```

**Remember**: Location → Office → Bureau → Division → Section (largest to smallest organizational unit)

### **Staff Ticket ID Format:**
- **Format**: SF-YYMMDD-XXX (e.g., SF-250822-001)
- **Shares sequence** with regular tickets to prevent conflicts
- **SF prefix** distinguishes staff-created tickets

Remember: Orvale Management System should be minimal, maintainable, and focused on delivering core functionality efficiently while providing an engaging user experience through dashboards, achievements, and seamless communication.

## 📊 Mock Data Pattern - IMPORTANT

**For preview features, use informational overlays:**
```javascript
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
  <span className="font-semibold text-blue-800">[Feature Name] - Preview</span>
  <p className="text-blue-700 text-sm mt-2">
    This data is simulated. Real-time [feature] will be available once [condition].
  </p>
</div>
```

**Always be transparent about mock data to prevent user confusion.**