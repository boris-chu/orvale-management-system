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

### Development Commands
```bash
# Linting and type checking (run after making changes)
npm run lint
npm run typecheck

# Main development server (Port 80 - Production-style setup)
sudo npm run dev

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

### Access Points (Port 80):
- **Public Portal**: http://localhost/ (Landing page with ticket submission)
- **Submit Tickets**: http://localhost/public-portal/ (Original ticket submission form)
- **Admin Queue**: http://localhost/tickets (IT staff ticket management)
- **Helpdesk Queue**: http://localhost/helpdesk/queue (Multi-team queue for helpdesk staff)
- **Developer Portal**: http://localhost/developer (System configuration and analytics)
- **API Health**: http://localhost/api/health (Server status check)

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

## 📋 Implementation Checklist

### Phase 1: Core Ticket System
- [ ] Set up Next.js project with TypeScript
- [ ] Configure Tailwind CSS and shadcn:ui
- [ ] Implement core ticket system files
- [ ] Create user submission form (index.html)
- [ ] Build ticket queue interface
- [ ] Add authentication modal
- [ ] Import category configuration from assets/

### Phase 2: Project Management Layer
- [ ] Extend ticket data model with project fields
- [ ] Create project dashboard with evilcharts
- [ ] Implement project-ticket linking UI
- [ ] Add project-level queue views
- [ ] Build project analytics

### Phase 3: User Dashboard & Gamification
- [ ] Personal dashboard with metrics
- [ ] Achievement system implementation
- [ ] Team collaboration features
- [ ] Professional portfolio builder
- [ ] Activity tracking and streaks

### Phase 4: Admin Dashboard
- [ ] System health monitoring
- [ ] User management interface
- [ ] RBAC permission control with overrides
- [ ] Analytics and reporting
- [ ] Audit logging system

### Phase 5: Advanced Features
- [ ] Real-time updates
- [ ] Advanced filtering
- [ ] Resource planning views
- [ ] Mobile responsive design

### Phase 6: Chat System with Audio/Video
- [ ] Implement Socket.io server (port 3001) for chat + WebRTC signaling
- [ ] Create 8 database tables (7 chat + 1 call_logs)
- [ ] Add 21 new RBAC permissions (16 chat + 5 call)
- [ ] Build full-page chat application with Material-UI
- [ ] Add minimized chat widget for all pages
- [ ] Implement WebRTC audio/video calls with Safari support
- [ ] Create admin chat management dashboard
- [ ] **See `/docs/Chat_System_Implementation_Plan.md` for complete details**

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

### 🚨 **IMPORTANT: Component Migration Status**

**Components Deprecated in `/components/ui/`:**
- `dialog.tsx` ⚠️ **DEPRECATED STUB** - Use Material-UI Dialog
- `select.tsx` ⚠️ **DEPRECATED STUB** - Use Material-UI Select

These components now throw runtime errors with helpful migration messages.

**Migration Progress:**
- ✅ `components/StaffTicketModal.tsx` - **CONVERTED** (Complete Material-UI)
- ✅ `app/developer/roles/page.tsx` - **CONVERTED** (Material-UI Dialog)
- ✅ `app/admin/tables-management/page.tsx` - **IMPORTS UPDATED** (Material-UI Dialog/Select)
- ✅ `components/CategoryBrowserModal.tsx` - **CONVERTED** (Material-UI Dialog/Select)
- ✅ `components/OrganizationalBrowserModal.tsx` - **CONVERTED** (Material-UI Dialog/Select)
- ✅ `components/ProfileEditModal.tsx` - **CONVERTED** (Material-UI Dialog)
- ⚠️ `components/RowEditorDialog.tsx` - Needs conversion
- ⚠️ `components/ColumnEditorDialog.tsx` - Needs conversion
- ⚠️ Other files - Need conversion as encountered

**Migration Strategy:**
- Files using ONLY Dialog: Convert to Material-UI Dialog
- Files using ONLY Select: Convert to Material-UI Select  
- Files using Dialog + Select: Convert entire modal to Material-UI
- Files using Select outside modals: Can keep shadcn:ui if no focus conflicts

**Priority Migration Order:**
1. Admin interfaces (tables-management)
2. Developer interfaces (roles, teams, users)
3. Modal components (CategoryBrowserModal, etc.)
4. Public portal forms

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

#### 🔧 **Best Practices for Tabs:**
1. **Always include `w-full`** with grid layouts for proper horizontal display
2. **Add spacing** with `mb-4` or similar for visual separation
3. **Match grid columns** to the number of tabs (grid-cols-2, grid-cols-3, etc.)
4. **For dynamic tabs**, use `flex` instead of `grid`:
   ```javascript
   <TabsList className="flex w-full justify-start">
   ```

**Note**: This pattern appears frequently in the codebase. When creating new tabbed interfaces, always ensure the TabsList has proper width classes to maintain horizontal layout.

### 🎯 Select Components in Modals - CRITICAL PATTERN

**When using Select components inside Modal dialogs, ALWAYS use Material-UI Select to avoid focus management issues with React 19:**

#### ❌ **Common Issue - shadcn:ui Select in Modals:**
```javascript
// This causes focus-scope infinite recursion errors in modals!
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Dialog>
  <DialogContent>
    <Select onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
      </SelectContent>
    </Select>
  </DialogContent>
</Dialog>
```

#### ✅ **Correct Pattern - Material-UI Select in Modals:**
```javascript
// Use Material-UI for Select components inside modals
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

<Dialog>
  <DialogContent>
    <FormControl fullWidth size="small">
      <InputLabel>Select Option</InputLabel>
      <Select 
        value={value} 
        onChange={(e) => handleChange(e.target.value)}
        label="Select Option"
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
      </Select>
    </FormControl>
  </DialogContent>
</Dialog>
```

#### 📋 **When to Use Each:**
- **Material-UI Select**: Inside modals, dialogs, drawers (focus-managed components)
- **shadcn:ui Select**: Regular page content, forms not in modals
- **Never mix**: Don't use different Select libraries in the same modal

**This is especially important for StaffTicketModal, user creation modals, and any other dialog-based forms.**

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

The Orvale Management System uses SQLite database (`orvale_tickets.db`) with 23 tables organized into 6 functional groups:

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
```

### Important Design Patterns

1. **Audit Trails**: Both `ticket_history_detailed` and `system_settings_audit` provide comprehensive change tracking
2. **Soft Deletes**: Most tables use `active` flags instead of hard deletes
3. **Hierarchical Data**: Both DPSS structure and ticket categories use parent-child relationships
4. **JSON Storage**: Used for flexible data like `computer_info` and permission overrides
5. **Team Separation**: **CRITICAL** - `teams` for internal ticket processing/helpdesk, `support_teams` for public portal submission only

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

## 🎮 Key Features to Implement

### User Dashboard Features
- **Activity Heatmap**: Calendar view of ticket generation
- **Achievement Badges**: 40+ achievements across 4 categories
- **Team Leaderboards**: Friendly competition metrics
- **Professional Portfolio**: Export performance reports

### Admin Dashboard Features
- **Real-time Monitoring**: System health and usage stats
- **User Management**: Complete lifecycle control
- **86 Permissions**: Granular RBAC control
- **Audit Logging**: Complete action tracking
- **Analytics Platform**: Custom dashboards and reports

### Helpdesk Queue Features
- **Multi-Team View**: Monitor multiple teams simultaneously 
- **Team Preferences**: Customize which teams to display
- **Status Tabs**: Horizontal folder-style tabs for each status
- **Escalated Tickets**: Dedicated view for cross-team escalations
- **User Profile**: Integrated settings and sign-out functionality
- **Real-time Updates**: Live ticket counts and status changes

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