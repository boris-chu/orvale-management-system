# CLAUDE.md - Orvale Management System Development Guide

## 🎯 Project Overview
You are working on the **Orvale Management System** - a comprehensive unified platform that integrates ticket tracking with project management capabilities, asset management, real-time communication, knowledge management, analytics, and admin controls. The system maintains the clean architecture from the ticket system blueprint while providing a complete IT operations management solution.

## 📁 Development Structure
```
project-ticket-development/                     # Main development folder
├── project-system/                             # Main Next.js application
│   ├── app/                                    # Next.js 13+ app directory
│   │   ├── api/                               # API routes
│   │   ├── tickets/                           # Ticket pages
│   │   ├── projects/                          # Project pages
│   │   ├── assets/                            # Asset management pages  
│   │   ├── dashboard/                         # User dashboard
│   │   └── admin/                             # Admin panel
│   ├── components/                            # React components
│   │   ├── ui/                                # Reusable UI components
│   │   ├── tickets/                           # Ticket-specific components
│   │   ├── projects/                          # Project components
│   │   ├── assets/                            # Asset management components
│   │   ├── dashboard/                         # Dashboard components
│   │   └── admin/                             # Admin components
│   ├── core/                                  # 4-file architecture (blueprint)
│   │   ├── TicketManager.js                   # Main orchestrator
│   │   ├── TicketAPI.js                       # API operations
│   │   ├── TicketUI.js                        # UI rendering
│   │   └── ticket-types.js                    # Type definitions
│   ├── config/                                # Configuration data
│   │   ├── categories/                        # Ticket categories
│   │   └── permissions/                       # RBAC permissions
│   └── lib/                                   # Utilities and helpers
├── ui-libraries/                              # Available UI components
│   ├── evilcharts/                            # Charts and modern UI components
│   ├── material-ui/                           # Material Design components
│   ├── shadcn:ui/                             # Radix-based components
│   └── hilla/                                 # Full-stack framework
├── resources/                                 # Original configuration data
│   ├── main-categories.js                     # 9 main ticket categories
│   ├── request-types.js                       # Request types for each category
│   ├── ticket-categories.js                   # Detailed subcategories (large file)
│   └── organizational-data.js                 # DPSS organizational structure
├── docs/                                      # All documentation
│   ├── Core Ticket System Blueprint.md        # Core ticket system blueprint (READ FIRST)
│   ├── Available Resources and Materials.md   # UI libraries and components catalog
│   ├── Dashboard & Achievements System.md     # Gamification and user dashboard design
│   ├── Admin Dashboard Conceptual Design.md   # Admin control panel specifications
│   ├── Project Management System Design.md    # Monday.com-style IT project management
│   ├── Knowledge Base & Solution Lookup.md    # Internal solution database from resolved tickets
│   ├── Reporting & Analytics System.md        # RBAC-secured reports for all management levels
│   ├── Internal Messaging & Live Chat.md      # Slack-style communication with context integration
│   ├── Asset Management System Design.md      # Complete asset lifecycle management with QR codes
│   ├── Asset Variables Documentation.md       # Comprehensive list of asset/ticket variables
│   └── Work History.md                        # Real IT project examples and experience
└── CLAUDE.md                                  # This file
```

## 🚀 Quick Start Commands

### Development Commands
```bash
# Linting and type checking (run after making changes)
npm run lint
npm run typecheck

# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

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

### Form Components
**Use shadcn:ui** for all form elements:
```javascript
// Example: Ticket submission form
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Form } from "@/components/ui/form"
```

### Data Display
**Use shadcn:ui DataTable** for ticket lists:
```javascript
// Example: Ticket queue display
import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
```

### Charts and Analytics
**Use evilcharts** for all visualizations:
```javascript
// Example: Project metrics dashboard
import { BarChart } from "@/charts/bar-charts/gradient-bar-chart"
import { PieChart } from "@/charts/pie-charts/rounded-pie-chart"
import { LineChart } from "@/charts/line-charts/glowing-line"
```

### Icons
**Use Lucide React** as primary icon library:
```javascript
import { Users, Ticket, Calendar, ChevronRight } from "lucide-react"
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

### Phase 4: Knowledge Base & Solution Lookup
- [ ] Enhanced ticket completion with solution capture
- [ ] Smart solution search and similarity matching
- [ ] Knowledge base article creation and management
- [ ] Solution rating and feedback system
- [ ] Knowledge analytics dashboard

### Phase 5: Internal Messaging & Live Chat
- [ ] Real-time chat interface with WebSocket
- [ ] Context-aware messaging for tickets and projects
- [ ] Formal messaging system for hierarchical communication
- [ ] User presence and online status tracking
- [ ] RBAC-integrated communication permissions

### Phase 6: Admin Dashboard
- [ ] System health monitoring
- [ ] User management interface
- [ ] RBAC permission control with overrides
- [ ] Analytics and reporting
- [ ] Audit logging system

### Phase 7: Asset Management System
- [ ] Core asset CRUD operations
- [ ] QR code generation and scanning
- [ ] Mobile PWA for field updates
- [ ] Asset-ticket-project integration
- [ ] Asset reporting and analytics

### Phase 8: Advanced Features
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

### For Communication System:
| Feature | Component Library | Specific Component |
|---------|------------------|-------------------|
| Chat Interface | shadcn:ui | Dialog, ScrollArea |
| Messages | shadcn:ui | Card, Avatar |
| Real-time | Socket.io | WebSocket integration |
| Notifications | shadcn:ui | Toast, Badge |
| File Upload | shadcn:ui | Input, Progress |

### For Asset Management:
| Feature | Component Library | Specific Component |
|---------|------------------|-------------------|
| Asset List | shadcn:ui | DataTable with filters |
| Asset Forms | shadcn:ui | Form with validation |
| QR Scanner | Custom | Camera API integration |
| Asset Cards | shadcn:ui | Card with Badge |
| Status Badges | shadcn:ui | Badge variants |
| Quick Actions | shadcn:ui | DropdownMenu |
| Timeline | shadcn:ui | Custom with Card |
| Charts | evilcharts | Bar, Pie, Line charts |

## 🚨 Important Patterns

### API Response Handling
```javascript
try {
  const response = await TicketAPI.getTickets(filters);
  // Handle success
} catch (error) {
  showNotification(error.message, 'error');
}
```

### Permission Checks
```javascript
if (user.permissions.includes('ticket.assign_within_team')) {
  // Show assignment UI
}
```

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
// From project-system config (copied during setup)
import { categories } from './config/categories/main-categories.js';
import { requestTypes } from './config/categories/request-types.js';
import { subcategories } from './config/categories/ticket-categories.js';
import { organizationalData } from './config/organizational-data.js';

// Or reference from original resources folder
import { categories } from '../resources/main-categories.js';
```

## 📚 Key Resources

1. **Core Ticket System Blueprint.md** - Core system architecture
2. **Available Resources and Materials.md** - Component catalog
3. **Dashboard & Achievements System.md** - Gamification features
4. **Admin Dashboard Conceptual Design.md** - Admin panel specs
5. **Project Management System Design.md** - Monday.com-style IT project management
6. **Knowledge Base & Solution Lookup.md** - Internal solution database from resolved tickets
7. **Reporting & Analytics System.md** - RBAC-secured reports for all management levels
8. **Internal Messaging & Live Chat System.md** - Slack-style communication with context integration
9. **Asset Management System Design.md** - Complete asset lifecycle management with QR codes
10. **Asset Variables Documentation.md** - Comprehensive list of asset/ticket variables from legacy system
11. **Work History.md** - Real project examples and experience
12. **shadcn:ui docs** - Component examples
13. **evilcharts examples** - Chart implementations

## 🎮 Key Features to Implement

### User Dashboard Features
- **Activity Heatmap**: Calendar view of ticket generation
- **Achievement Badges**: 40+ achievements across 4 categories
- **Team Leaderboards**: Friendly competition metrics
- **Professional Portfolio**: Export performance reports

### Project Management Features
- **Monday.com-style Boards**: Kanban project tracking
- **IT Project Templates**: MPS, Laptop Refresh, Office Moves, etc.
- **Asset Integration**: Equipment tracking within projects
- **Vendor Management**: Sharp, Lexmark, T-Mobile collaboration
- **Timeline & Gantt Charts**: Visual project scheduling
- **Budget Tracking**: Cost management and ROI analysis

### Knowledge Base & Solution Lookup
- **Smart Solution Search**: AI-powered similar ticket lookup
- **Institutional Knowledge**: Convert resolved tickets to searchable database
- **Solution Rating**: Rate effectiveness of solutions for continuous improvement
- **Auto-KB Generation**: Transform common solutions into knowledge articles
- **Success Tracking**: Monitor solution effectiveness and time savings
- **Mobile Access**: Quick solution lookup on mobile devices

### Reporting & Analytics System
- **RBAC-Secured Reports**: Role-based access to different management levels
- **Executive Dashboards**: Strategic KPIs, ROI analysis, organizational health
- **Management Reports**: Team performance, resource utilization, SLA compliance
- **Real-time Analytics**: Live data with permission-based filtering
- **Custom Report Builder**: Create reports based on user permissions
- **Automated Distribution**: Scheduled reports with security watermarking

### Internal Messaging & Live Chat System
- **Real-time Chat**: Slack-style instant messaging between team members
- **Context-Aware Messaging**: Ticket and project-specific conversation threads
- **Formal Communication**: Hierarchical messaging for management communication
- **User Presence**: Online status, custom status, and activity tracking
- **RBAC Integration**: Permission-based access to different communication channels
- **Rich Content**: File attachments, embedded tickets/projects, reactions

### Asset Management Features
- **Complete Lifecycle Management**: From procurement to disposal
- **QR Code Integration**: Mobile scanning for instant asset access
- **Ticket & Project Linking**: Automatic association with support requests
- **Real-time Location Tracking**: Building, department, and user assignments
- **Comprehensive Reporting**: Asset utilization, depreciation, and compliance
- **Mobile-First Interface**: Progressive Web App for field updates
- **Automated Workflows**: Warranty alerts, maintenance schedules, audits

### Admin Dashboard Features
- **Real-time Monitoring**: System health and usage stats
- **User Management**: Complete lifecycle control
- **103+ Permissions**: Granular RBAC control (expanded with asset permissions)
- **Audit Logging**: Complete action tracking
- **Analytics Platform**: Custom dashboards and reports

## 💡 Tips for Success

1. **Start with the ticket system blueprint** - Don't deviate from the 4-file architecture
2. **Use existing components** - Don't create custom UI when libraries provide it
3. **Follow the permission model** - Respect the RBAC system design (86 permissions)
4. **Leverage existing data** - Use the pre-configured categories from assets/
5. **Build institutional knowledge** - Capture solutions for future reference
6. **Implement gamification thoughtfully** - Make achievements meaningful
7. **Maintain simplicity** - The goal is 90% functionality with 20% complexity
8. **Test incrementally** - Verify each phase before moving forward

Remember: Orvale Management System should be minimal, maintainable, and focused on delivering core functionality efficiently while providing an engaging user experience through dashboards, achievements, and seamless communication.