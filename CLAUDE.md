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
│   └── Admin Dashboard Conceptual Design.md     # Admin control panel specifications
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
```

### Access Points (Port 80):
- **Public Portal**: http://localhost/ (Landing page with ticket submission)
- **Submit Tickets**: http://localhost/public-portal/ (Original ticket submission form)
- **Admin Queue**: http://localhost/tickets (IT staff ticket management)
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
import { categories } from './assets/main-categories.js';
import { requestTypes } from './assets/request-types.js';
import { subcategories } from './assets/ticket-categories.js';
import { organizationalData } from './assets/organizational-data.js';
```

## 📚 Key Resources

1. **Team Ticket System.md** - Core system architecture
2. **Available Resources and Materials.md** - Component catalog
3. **Dashboard & Achievements System.md** - Gamification features
4. **Admin Dashboard Conceptual Design.md** - Admin panel specs
5. **shadcn:ui docs** - Component examples
6. **evilcharts examples** - Chart implementations

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

## 💡 Tips for Success

1. **Start with the ticket system blueprint** - Don't deviate from the 4-file architecture
2. **Use existing components** - Don't create custom UI when libraries provide it
3. **Follow the permission model** - Respect the RBAC system design (86 permissions)
4. **Leverage existing data** - Use the pre-configured categories from assets/
5. **Implement gamification thoughtfully** - Make achievements meaningful
6. **Maintain simplicity** - The goal is 90% functionality with 20% complexity
7. **Test incrementally** - Verify each phase before moving forward

Remember: Orvale Management System should be minimal, maintainable, and focused on delivering core functionality efficiently while providing an engaging user experience through dashboards, achievements, and seamless communication.