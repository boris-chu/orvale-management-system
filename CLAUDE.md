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
│   └── RBAC_PERMISSIONS_DOCUMENTATION.md        # Complete RBAC permissions reference
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

**Use shadcn:ui for other form elements**:
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
// USE CONSISTENTLY: All Material UI or All Radix UI
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Select, 
  MenuItem 
} from '@mui/material'; // All from same library

<Dialog>
  <DialogTitle>Title</DialogTitle>
  <DialogContent>
    <Select> {/* No focus conflicts! */}
      <MenuItem>Option 1</MenuItem>
    </Select>
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

### 4. **Team Management Tables**
- **teams**: Internal teams that receive and work on tickets (e.g., ITTS_Region1)
- **support_teams**: Public portal teams for ticket submission
- **support_team_groups**: Groups to organize support teams
- **helpdesk_team_preferences**: User preferences for helpdesk multi-queue view

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
5. **Team Separation**: `teams` for internal use, `support_teams` for public portal

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

Remember: Orvale Management System should be minimal, maintainable, and focused on delivering core functionality efficiently while providing an engaging user experience through dashboards, achievements, and seamless communication.