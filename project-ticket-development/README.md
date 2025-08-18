# Orvale Management System Development

This is the complete development environment for the **Orvale Management System** - a unified platform that integrates ticket tracking with project management capabilities, live communication, knowledge management, gamification elements, and comprehensive admin controls.

## 📁 Development Structure

```
project-ticket-development/
├── public-portal/                   # 📝 Public Ticket Submission Portal
│   ├── index.html                  # Front-facing ticket submission form
│   ├── portal-styles.css           # Minimal styles for public use
│   └── support.ico                 # Favicon
├── project-system/                  # 🚀 Internal Orvale Management System
│   ├── app/                        # Next.js 13+ app directory
│   ├── components/                 # React components
│   ├── core/                       # 4-file architecture (blueprint)
│   ├── config/                     # Configuration data
│   └── lib/                        # Utilities and helpers
├── ui-libraries/                    # 🎨 Available UI Components
│   ├── evilcharts/                 # Charts and modern UI
│   ├── material-ui/                # Material Design components
│   ├── shadcn:ui/                  # Radix-based components
│   └── hilla/                      # Full-stack framework
├── resources/                      # 📋 Configuration Data
│   ├── main-categories.js          # 9 main ticket categories
│   ├── request-types.js            # Request types per category
│   ├── ticket-categories.js        # Detailed subcategories
│   └── organizational-data.js      # DPSS structure
├── docs/                          # 📚 Documentation
│   ├── Team Ticket System.md      # Core blueprint
│   ├── Available Resources.md     # UI library catalog
│   ├── Dashboard & Achievements.md # Gamification design
│   └── Admin Dashboard.md         # Admin panel specs
├── CLAUDE.md                      # 🤖 Development guide
└── README.md                      # This file
```

## 🚀 Quick Start

### 1. Navigate to Project System
```bash
cd project-system/
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
sudo npm run dev
```

### 4. Open Browser
Visit `http://localhost/`

## 🎯 Key Features

### ✅ **Core Ticket System**
- User ticket submission form
- Team-based queue management
- RBAC with 86 granular permissions
- Escalation workflows
- Assignment management

### ✅ **Project Management Integration**
- Project-ticket linking
- Project dashboards
- Resource planning
- Timeline views

### ✅ **Gamification & Analytics**
- Personal activity dashboards
- Achievement system (40+ achievements)
- Team leaderboards
- Professional portfolio export

### ✅ **Knowledge Base & Solution Lookup**
- Smart solution search from resolved tickets
- AI-powered similar problem matching
- Institutional knowledge retention
- Solution effectiveness tracking

### ✅ **Admin Dashboard**
- Real-time system monitoring
- User lifecycle management
- Audit logging
- Custom analytics

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15.4.1** - React framework
- **React 19.1.0** - UI library
- **TypeScript 5.7.0** - Type safety
- **Tailwind CSS 4.0** - Styling

### **UI Components**
- **Radix UI** - Accessible primitives
- **Lucide React** - Icon library (525+ icons)
- **Recharts** - Data visualization
- **Framer Motion** - Animations

### **Data Management**
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **TanStack Table** - Data tables
- **Date-fns** - Date utilities

## 📋 Development Commands

```bash
# Development (Port 80 - Production-style setup)
sudo npm run dev     # Start dev server on port 80
npm run build        # Build for production
sudo npm start       # Start production server

# Code Quality
npm run lint         # Check linting
npm run lint:fix     # Fix linting issues
npm run typecheck    # TypeScript checking

# Testing
npm test             # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## 🗂️ Available Resources

### **Pre-configured Data**
- **9 Main Categories**: Application Support, Hardware, Infrastructure, etc.
- **Request Types**: Specific types for each category
- **Subcategories**: Detailed options for each request type
- **DPSS Organization**: Offices, bureaus, divisions, sections

### **UI Libraries**
- **EvilCharts**: 30+ chart components with animations
- **Material-UI**: Complete Material Design system
- **Shadcn:UI**: Copy-paste components with Radix UI
- **Hilla**: Full-stack development framework

### **Documentation**
- **Team Ticket System**: Core architecture (READ FIRST)
- **Available Resources**: UI component catalog
- **Dashboard & Achievements**: Gamification features
- **Admin Dashboard**: Administrative controls
- **Project Management**: Monday.com-style IT project tracking
- **Knowledge Base**: Solution lookup from resolved tickets

## 🏗️ Architecture

### **4-File Core** (Blueprint)
```javascript
core/
├── TicketManager.js    # Main orchestrator
├── TicketAPI.js        # API operations
├── TicketUI.js         # UI rendering
└── ticket-types.js     # Type definitions
```

### **Feature Organization**
```javascript
components/
├── ui/                 # Reusable components
├── tickets/            # Ticket-specific
├── projects/           # Project management
├── dashboard/          # User dashboards
└── admin/              # Admin controls
```

## 🔧 Configuration

### **Import Paths**
```javascript
// Configuration data
import { categories } from './config/categories/main-categories.js';
import { requestTypes } from './config/categories/request-types.js';

// UI Components (copy from ui-libraries)
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';

// Charts (reference from ui-libraries/evilcharts)
import { BarChart } from '../ui-libraries/evilcharts/charts/bar-charts/gradient-bar-chart';
```

## 📊 Data Models

### **Ticket Structure**
```javascript
{
  // User info
  user_name: string,
  employee_number: string,
  phone_number: string,
  location: string,
  
  // Ticket details
  issue_title: string,
  issue_description: string,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  status: 'pending' | 'in_progress' | 'completed',
  
  // Project integration
  project_id?: string,
  project_name?: string,
  project_phase?: string
}
```

## 🎮 Implementation Phases

### **Phase 1: Core System**
- [x] Project structure setup
- [ ] User submission form
- [ ] Ticket queue interface
- [ ] Authentication system

### **Phase 2: Project Management**
- [ ] Project dashboard
- [ ] Project-ticket linking
- [ ] Resource planning

### **Phase 3: Gamification**
- [ ] User dashboards
- [ ] Achievement system
- [ ] Team collaboration

### **Phase 4: Knowledge Base**
- [ ] Solution capture system
- [ ] Smart search and recommendations
- [ ] Knowledge analytics

### **Phase 5: Admin Panel**
- [ ] System monitoring
- [ ] User management
- [ ] Analytics platform

## 🔐 Security

- **RBAC**: 86 granular permissions
- **Authentication**: Session-based with JWT
- **Headers**: Security headers configured
- **Validation**: Zod schema validation

## 📈 Performance

- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Built-in Next.js optimization
- **Caching**: Static generation where possible
- **Bundle Analysis**: Webpack bundle analyzer

## 🤝 Contributing

1. Follow the 4-file core architecture
2. Use existing UI components
3. Maintain TypeScript strict mode
4. Run linting and type checking
5. Test incrementally

## 📞 Support

- **CLAUDE.md**: Complete development guide
- **Documentation**: Comprehensive specs in `docs/`
- **UI Libraries**: Examples in `ui-libraries/`

---

**Ready to build!** Start with the project-system folder and follow the CLAUDE.md guide for detailed implementation instructions.