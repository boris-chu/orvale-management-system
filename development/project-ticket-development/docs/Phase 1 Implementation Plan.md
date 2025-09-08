# Phase 1 Implementation Plan - Orvale Management System
**Date**: August 17, 2025  
**Based on**: Core Ticket System Blueprint + UI Screenshots

## 🎯 **Implementation Overview**

### **UI Reference Analysis**
Based on your screenshots, we need to replicate:

#### **Queue Interface (Screenshot 1)**
- **Header**: Blue bar with "Support Ticket Queue" title
- **Filters**: "My Tickets" dropdown, "All Priorities" dropdown, "Newest First" sort
- **Status Bar**: "1 pending • 9 assigned • 0 today • 25 total" with green "Refresh Now" button
- **Status Tabs**: Pending (blue), In Progress, Completed, Escalated, Deleted
- **Ticket Cards**: Priority badge, status badge, title, submitter info, description, timestamp
- **Action Buttons**: Complete (green), Escalate (purple), Delete (red)

#### **Ticket Detail Modal (Screenshot 2)**
- **Multi-column Layout**: Request Info, User Info, Computer Info, Organizational Info, Category Info
- **Form Fields**: Status dropdown, priority, assignment, detailed user information
- **Issue Details**: Title and description in blue-bordered section

## 📊 **Database Schema Implementation**

### **Priority 1: Core Tables**
```sql
-- Users and Authentication
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'it_user', -- 'admin', 'it_user', 'manager'
    team_id TEXT,
    section_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main Tickets Table (matches blueprint exactly)
CREATE TABLE user_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    
    -- PRIMARY USER (person who needs help)
    user_name TEXT NOT NULL,
    employee_number TEXT NOT NULL,
    phone_number TEXT,
    location TEXT,
    section TEXT,
    teleworking TEXT,
    
    -- SUBMISSION TRACKING
    submitted_by TEXT NOT NULL,
    submitted_by_employee_number TEXT NOT NULL,
    on_behalf BOOLEAN DEFAULT FALSE,
    
    -- TICKET DETAILS
    issue_title TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    computer_info TEXT, -- JSON blob
    
    -- WORKFLOW
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'escalated'
    assigned_to TEXT, -- Username of assigned person
    assigned_team TEXT, -- Team identifier
    
    -- ESCALATION
    escalation_reason TEXT,
    escalated_at TIMESTAMP,
    
    -- COMPLETION
    completion_notes TEXT,
    completed_at TIMESTAMP,
    completed_by TEXT,
    
    -- METADATA
    email_recipient TEXT,
    email_recipient_display TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams Structure
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    email TEXT,
    section_id TEXT
);

-- Sections Structure  
CREATE TABLE sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);
```

### **Initial Data Population**
```sql
-- Create test users
INSERT INTO users (username, display_name, email, password_hash, role) VALUES
('admin', 'System Administrator', 'admin@dpss.gov', '$2b$10$hash...', 'admin'),
('boris.chu', 'Boris Chu', 'boris.chu@dpss.gov', '$2b$10$hash...', 'it_user'),
('john.doe', 'John Doe', 'john.doe@dpss.gov', '$2b$10$hash...', 'it_user');

-- Create teams
INSERT INTO teams (id, name, description, email) VALUES
('ITTS_Region7', 'ITTS: Region 7', 'IT Technical Support Region 7', 'region7@dpss.gov'),
('ITTS_Main', 'ITTS: Main Office', 'IT Technical Support Main Office', 'itts@dpss.gov');

-- Create sections
INSERT INTO sections (id, name, description) VALUES
('ITTS', 'IT Technical Support', 'Information Technology Technical Support Division'),
('ADMIN', 'Administration', 'Administrative Division');
```

## 🔧 **Backend API Implementation**

### **Core API Endpoints (Express.js)**
```javascript
// Authentication
POST /api/auth/login          // Login with username/password
POST /api/auth/logout         // Logout and clear session
GET  /api/auth/user           // Get current user context

// Tickets
GET  /api/tickets             // Get tickets with filtering
GET  /api/tickets/:id         // Get single ticket
POST /api/tickets             // Create new ticket
PUT  /api/tickets/:id         // Update ticket
DELETE /api/tickets/:id       // Delete ticket

// Assignment
POST /api/tickets/:id/assign  // Assign ticket to user/team
POST /api/tickets/:id/complete // Complete ticket
POST /api/tickets/:id/escalate // Escalate ticket

// System
GET  /api/system-info         // Computer info for forms
GET  /api/users/assignable    // Get assignable users
```

### **Database Connection (server/database.js)**
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
const initDB = () => {
    // Create tables if they don't exist
    db.serialize(() => {
        db.run(/* users table SQL */);
        db.run(/* user_tickets table SQL */);
        db.run(/* teams table SQL */);
        db.run(/* sections table SQL */);
    });
};

module.exports = { db, initDB };
```

## 🎨 **Frontend Implementation Strategy**

### **1. Public Portal Enhancement (index.html)**
```html
<!-- Add hidden login access -->
<div id="hidden-access" 
     style="position: fixed; bottom: 0; right: 0; width: 80px; height: 80px; 
            opacity: 0; cursor: pointer; z-index: 1000;"
     onclick="showLoginModal()"
     title="Access Ticket Management System">
</div>

<!-- Login Modal -->
<div id="loginModal" class="login-overlay" style="display: none;">
    <div class="login-modal">
        <h2>🔐 IT Team Access</h2>
        <form id="loginForm">
            <input type="text" id="username" placeholder="Username" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit">Login</button>
        </form>
        <button onclick="closeLoginModal()">Cancel</button>
    </div>
</div>

<script>
// Keyboard shortcut (Ctrl+T)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        showLoginModal();
    }
});
</script>
```

### **2. Queue Interface (React Components)**

#### **QueueHeader Component**
```typescript
// components/tickets/QueueHeader.tsx
interface QueueHeaderProps {
    title: string;
    stats: { pending: number; assigned: number; today: number; total: number };
    onRefresh: () => void;
}

const QueueHeader: React.FC<QueueHeaderProps> = ({ title, stats, onRefresh }) => (
    <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">📋 {title}</h1>
        <div className="flex items-center justify-between mt-2">
            <div className="flex space-x-4">
                <span>{stats.pending} pending</span>
                <span>{stats.assigned} assigned</span>
                <span>{stats.today} today</span>
                <span>{stats.total} total</span>
            </div>
            <button 
                onClick={onRefresh}
                className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm"
            >
                🔄 Refresh Now
            </button>
        </div>
    </div>
);
```

#### **TicketCard Component**
```typescript
// components/tickets/TicketCard.tsx
interface TicketCardProps {
    ticket: Ticket;
    onComplete: (id: string) => void;
    onEscalate: (id: string) => void;
    onDelete: (id: string) => void;
    onClick: (id: string) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onComplete, onEscalate, onDelete, onClick }) => (
    <div 
        className="border border-gray-200 rounded-lg p-4 mb-2 cursor-pointer hover:bg-gray-50"
        onClick={() => onClick(ticket.id)}
    >
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex space-x-2 mb-2">
                    <Badge variant="outline" className="bg-yellow-100">
                        {ticket.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100">
                        {ticket.status.toUpperCase()}
                    </Badge>
                </div>
                <h3 className="font-medium text-lg">{ticket.issue_title}</h3>
                <div className="text-sm text-gray-600 mb-2">
                    {ticket.user_name} • #{ticket.employee_number} • {ticket.location}
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">
                    {ticket.issue_description}
                </p>
                <div className="text-xs text-gray-500 mt-2">
                    Submitted: {formatDate(ticket.submitted_at)} | TKT:{ticket.submission_id}
                </div>
            </div>
            <div className="flex space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                <Button 
                    size="sm" 
                    className="bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => onComplete(ticket.id)}
                >
                    ✓ Complete
                </Button>
                <Button 
                    size="sm" 
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={() => onEscalate(ticket.id)}
                >
                    ⚡ Escalate
                </Button>
                <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => onDelete(ticket.id)}
                >
                    🗑 Delete
                </Button>
            </div>
        </div>
    </div>
);
```

#### **TicketDetailModal Component (Matching Screenshot)**
```typescript
// components/tickets/TicketDetailModal.tsx
const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose, onUpdate }) => (
    <Dialog open={!!ticket} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-xl">{ticket?.issue_title}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Request & User Info */}
                <div className="space-y-6">
                    {/* Request Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-blue-600">Request Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label>Status:</Label>
                                <Badge className="ml-2 bg-blue-100">{ticket?.status}</Badge>
                            </div>
                            <div>
                                <Label>Priority:</Label>
                                <Badge className="ml-2 bg-yellow-100">{ticket?.priority}</Badge>
                            </div>
                            <div>
                                <Label>Submitted:</Label>
                                <span className="ml-2">{formatDate(ticket?.submitted_at)}</span>
                            </div>
                            <div>
                                <Label>Support Team:</Label>
                                <span className="ml-2">{ticket?.assigned_team}</span>
                            </div>
                            <div>
                                <Label>Assign To:</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Boris Chu" />
                                    </SelectTrigger>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* User Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-blue-600">User Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div><Label>Name:</Label> {ticket?.user_name}</div>
                            <div><Label>Employee Number:</Label> {ticket?.employee_number}</div>
                            <div><Label>Phone:</Label> {ticket?.phone_number}</div>
                            <div><Label>Location:</Label> {ticket?.location}</div>
                            <div><Label>Teleworking:</Label> {ticket?.teleworking}</div>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Right Columns - Organizational & Category Info */}
                <div className="col-span-2 space-y-6">
                    {/* More sections matching the screenshot... */}
                </div>
            </div>
            
            {/* Issue Details */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-blue-600">Issue Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div><Label>Title:</Label> {ticket?.issue_title}</div>
                    <div className="mt-4">
                        <Label>Description:</Label>
                        <div className="border-l-4 border-blue-500 pl-4 mt-2 bg-gray-50 p-3">
                            {ticket?.issue_description}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </DialogContent>
    </Dialog>
);
```

## 🚀 **Implementation Steps**

### **Step 1: Database Setup**
```bash
cd project-system
npm install sqlite3 bcryptjs jsonwebtoken express cors
mkdir server
# Create database schema and seed data
```

### **Step 2: Backend API**
```bash
# Create Express server
touch server/server.js
touch server/database.js
touch server/auth.js
touch server/routes/tickets.js
```

### **Step 3: Frontend Components**
```bash
# Create React components
mkdir app/tickets
mkdir components/tickets
# Build queue interface matching screenshots
```

### **Step 4: Integration Testing**
- Test login flow
- Test ticket submission from index.html
- Test queue interface
- Test ticket detail modal

## 🎯 **Success Criteria for Phase 1**

### **Must Have**
- ✅ Users can submit tickets via public portal
- ✅ Hidden login access works (invisible area + Ctrl+T)
- ✅ IT users can log in and see queue matching screenshot
- ✅ Ticket cards display correctly with action buttons
- ✅ Ticket detail modal opens with full information
- ✅ Basic CRUD operations work (create, read, update, delete)

### **Database Requirements**
- ✅ SQLite database with proper schema
- ✅ User authentication with JWT tokens
- ✅ Ticket data matches blueprint structure
- ✅ Admin and IT user roles working

### **UI Requirements**
- ✅ Queue interface matches screenshot exactly
- ✅ Ticket detail modal matches screenshot layout
- ✅ Responsive design for mobile access
- ✅ Material-UI DataGrid for advanced features

## 📋 **Next Steps After Phase 1**

1. **Phase 2**: Add assignment workflows and team management
2. **Phase 3**: Implement escalation system
3. **Phase 4**: Add asset management integration
4. **Phase 5**: Build reporting dashboards
5. **Phase 6**: Add real-time updates and notifications

---

**This plan provides a clear roadmap to implement the exact UI you showed in the screenshots while following the blueprint architecture. Ready to start with database setup!**