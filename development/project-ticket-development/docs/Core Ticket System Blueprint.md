# Orvale Management System - Core Ticket System Blueprint

## 🎯 **Executive Summary**

This blueprint provides a **complete end-to-end ticket management system** designed for minimal complexity while maintaining full functionality. The system covers user submission through team resolution with proper escalation workflows.

**Proposed Minimal System**: 4 files, ~1,800 lines

---

## 🏗️ **MINIMAL SYSTEM ARCHITECTURE**

### **Complete User Journey**
```
User Submits → Team Assignment → Team Queue → Work → Complete/Escalate → Helpdesk Resolution
```

### **Core Files (4 Total)**
```
Essential Components:
├── index.html              # User ticket submission form
├── TicketManager.js         # Main orchestrator (~800 lines)
├── TicketAPI.js            # All API operations (~400 lines)  
├── TicketUI.js             # UI rendering and events (~500 lines)
└── ticket-types.js         # Type definitions (~100 lines)
```

**Total: ~1,800 lines (77% reduction from current system)**

---

## 📋 **COMPLETE FUNCTIONALITY MAP**

### **1. User Submission Process** (index.html)

#### **Form Components**
- **Support Team Selection**: Location-based team routing
- **User Information**: Name, employee number, phone, location, section
- **Issue Details**: Subject and detailed description
- **Computer Info**: Auto-detected system information
- **On Behalf Support**: Simplified single-table design

#### **Simplified "On Behalf" Data Model**
```javascript
// CLEAN APPROACH - No Duplicate Fields
const ticketData = {
    // PRIMARY USER (person who needs help - ALWAYS)
    user_name: "Jane NeedsHelp",              // Person with the problem
    employee_number: "e789012",               // Their employee number
    phone_number: "Jane's phone",             // Their contact info
    location: "Jane's cubicle",               // Where the problem is
    section: "Jane's department",             // Their department
    teleworking: "Yes/No",                   // Their telework status
    
    // SUBMISSION TRACKING (who submitted the form)
    submitted_by: "John Submitter",           // Person who filled out form
    submitted_by_employee_number: "e123456",  // Submitter's ID
    on_behalf: true,                         // Submission type flag
    
    // TICKET DETAILS
    issue_title: "Problem description",
    issue_description: "Detailed explanation",
    computer_info: { /* auto-detected */ },
    
    // WORKFLOW
    priority: "medium",                      // Default priority
    status: "pending",                       // Initial status
    email_recipient: "team@domain.com",      // Support team email
    email_recipient_display: "Team Name"     // Human-readable team name
};
```

### **2. Team Management Process**

#### **Queue Types**
- **Unassigned Queue**: New tickets awaiting team assignment
- **My Team Queue**: Tickets assigned to user's team
- **Individual Assignments**: Tickets assigned to specific team members
- **Escalated Queue**: Tickets escalated to central helpdesk
- **All Teams View**: Cross-team visibility (admin only)

#### **Assignment Workflow**
```
1. Ticket Created → Unassigned Queue
2. Manager/Admin → Assigns to IT Team
3. Team Lead → Assigns to Team Member
4. Team Member → Works on Ticket
5. Resolution → Complete OR Escalate
```

---

## 🔧 **MINIMAL API SPECIFICATION**

### **User Submission APIs**
```
POST /api/user-tickets           # Create ticket from web form
GET  /api/system-info           # Get computer system info for auto-detection
GET  /api/client-ip             # Get user's IP address
```

### **Core Ticket Management APIs**
```
GET  /api/tickets               # Load tickets (with team/queue filtering)
GET  /api/tickets/:id           # Get ticket details
PUT  /api/tickets/:id           # Update ticket
DELETE /api/tickets/:id         # Delete ticket
```

### **Authentication & Access APIs**
```
POST /api/auth/login            # Modal login authentication
POST /api/auth/logout           # Logout and clear session
GET  /api/auth/user             # Get current user context with permissions
POST /api/auth/validate-queue-access # Validate access to specific queue
```

### **Assignment APIs**
```
POST /api/tickets/:id/assign-team # Assign to IT team
POST /api/tickets/:id/assign-user # Assign to team member  
GET  /api/teams                 # Get accessible teams based on permissions
GET  /api/teams/:id/members     # Get team members
GET  /api/users/assignable      # Get assignable users
GET  /api/queues/accessible     # Get queues accessible to current user
```

### **Workflow APIs**
```
POST /api/tickets/:id/complete  # Complete ticket with notes
POST /api/tickets/:id/escalate  # Escalate to helpdesk with reason
POST /api/tickets/:id/resolve   # Resolve escalated ticket (helpdesk)
POST /api/tickets/:id/route-back # Route back to team from helpdesk
```

### **Role Management APIs (Admin)**
```
GET  /api/admin/roles            # List all roles
POST /api/admin/roles            # Create custom role
PUT  /api/admin/roles/:id        # Update role permissions
DELETE /api/admin/roles/:id      # Delete custom role (not system roles)

GET  /api/admin/permissions      # List all available permissions
GET  /api/admin/users/:id/permissions # Get user's effective permissions
POST /api/admin/users/:id/override # Add permission override for user
```

---

## 🔐 **FLEXIBLE RBAC PERMISSIONS SYSTEM**

### **Granular Permission Building Blocks**
```
# BASIC TICKET ACCESS
ticket.view                  # View tickets
ticket.edit                  # Edit ticket details  
ticket.complete              # Mark tickets complete
ticket.delete                # Delete tickets

# ASSIGNMENT PERMISSIONS
ticket.assign_within_team    # Assign tickets within own team
ticket.assign_within_section # Assign tickets within same section
ticket.assign_cross_section  # Assign tickets across sections

# QUEUE ACCESS PERMISSIONS
queue.view_own_team          # View own team queue
queue.view_section_teams     # View all teams in same section
queue.view_all_sections      # View teams across all sections
queue.switch_within_section  # Switch between teams in section
queue.switch_all_sections    # Switch between any sections

# ESCALATION PERMISSIONS
ticket.escalate_to_helpdesk  # Escalate tickets to helpdesk
ticket.escalate_emergency    # Create emergency escalations

# HELPDESK PERMISSIONS
helpdesk.resolve_escalated   # Resolve escalated tickets
helpdesk.route_back_to_teams # Route tickets back to teams
helpdesk.emergency_override  # Override emergency tickets

# USER SUBMISSION PERMISSIONS
user.submit_ticket           # Submit tickets via web form (PUBLIC)
user.submit_on_behalf        # Submit tickets for other employees

# ADMINISTRATIVE PERMISSIONS
admin.manage_team_assignments # Manage team assignments
admin.view_all_queues        # Administrative access to all queues
admin.user_management        # Manage users and permissions
```

### **Customizable Role Templates**
```
# BASIC ROLES
team_member: [
    ticket.view, ticket.edit, ticket.complete,
    ticket.assign_within_team, queue.view_own_team
]

section_supervisor: [
    ...team_member permissions,
    ticket.assign_within_section, queue.view_section_teams,
    queue.switch_within_section, ticket.escalate_to_helpdesk
]

helpdesk_technician: [
    ticket.view, ticket.edit, ticket.complete,
    helpdesk.resolve_escalated, queue.view_own_team
]

helpdesk_supervisor: [
    ...helpdesk_technician permissions,
    helpdesk.route_back_to_teams, queue.view_all_sections,
    queue.switch_all_sections, ticket.escalate_emergency
]

# CUSTOM ORGANIZATIONAL ROLES (Examples)
security_specialist: [
    ticket.view, ticket.edit, ticket.complete,
    queue.view_section_teams, ticket.escalate_emergency
]

network_lead: [
    ticket.view, ticket.edit, ticket.complete,
    ticket.assign_within_section, queue.view_section_teams,
    queue.switch_within_section
]

system_admin: [
    All permissions available
]
```

### **Role Management Database Schema**
```sql
-- Flexible role system
CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id TEXT,
    permission TEXT,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- User-specific permission overrides
CREATE TABLE user_permission_overrides (
    user_id INTEGER,
    permission TEXT,
    granted BOOLEAN, -- true = grant, false = revoke
    granted_by TEXT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 💾 **SIMPLIFIED DATABASE SCHEMA**

### **Main Tickets Table**
```sql
CREATE TABLE user_tickets (
    id INTEGER PRIMARY KEY,
    submission_id TEXT UNIQUE,
    
    -- PRIMARY USER (person who needs help - ALWAYS)
    user_name TEXT NOT NULL,
    employee_number TEXT NOT NULL,
    phone_number TEXT,
    location TEXT,
    section TEXT,
    teleworking TEXT,
    
    -- SUBMISSION TRACKING (who actually submitted)
    submitted_by TEXT NOT NULL,
    submitted_by_employee_number TEXT NOT NULL,
    on_behalf BOOLEAN DEFAULT FALSE,
    
    -- TICKET DETAILS
    issue_title TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    computer_info TEXT, -- JSON blob
    
    -- WORKFLOW
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    assigned_to TEXT, -- Team member username
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
```

### **Supporting Tables**
```sql
-- Organizational Structure
CREATE TABLE sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    email TEXT,
    section_id TEXT,
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- Users with RBAC
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    email TEXT,
    team_id TEXT,
    section_id TEXT,
    role_id TEXT,
    password_hash TEXT,
    active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

---

## 🔐 **AUTHENTICATION & QUEUE ACCESS**

### **Hidden Login Access** (index.html)
```javascript
// Hidden access area - invisible link in bottom-right corner
<div class="hidden-access" onclick="showLoginModal()" 
     style="position: absolute; bottom: 0; right: 0; width: 80px; height: 80px; opacity: 0; cursor: pointer;"
     title="Access Ticket Management System"></div>

// Alternative keyboard shortcut (Ctrl+T)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        showLoginModal();
    }
});
```

### **Modal Login Interface**
```javascript
// Unfolding modal login (instead of separate page)
function showLoginModal() {
    const loginModal = `
        <div class="login-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
             background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div class="login-modal" style="background: white; padding: 30px; border-radius: 8px; width: 90%; max-width: 400px;">
                <h2>🔐 IT Team Access</h2>
                <form id="loginForm">
                    <input type="text" id="username" placeholder="Username" required style="width: 100%; margin-bottom: 15px; padding: 10px;">
                    <input type="password" id="password" placeholder="Password" required style="width: 100%; margin-bottom: 20px; padding: 10px;">
                    <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Login</button>
                </form>
                <button onclick="closeLoginModal()" style="width: 100%; margin-top: 10px; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loginModal);
}

// After successful login → Initialize ticket queue interface
async function onLoginSuccess(user) {
    closeLoginModal();
    await initializeTicketQueue(user);
    showTicketQueueInterface(user);
}
```

### **Dynamic Queue Access Based on Permissions**

#### **Regular Team Member View**
```javascript
// Simple queue header - no switching options
function renderTeamMemberView(user) {
    return `
        <div class="queue-header">
            <h2>📋 ${user.team_name} Queue</h2>
            <div class="queue-stats">
                <span>Pending: 5</span>
                <span>In Progress: 3</span>
                <span>My Tickets: 2</span>
            </div>
        </div>
    `;
}
```

#### **Section Manager View**
```javascript
// Queue selector dropdown for teams within same section
function renderSectionManagerView(user, accessibleQueues) {
    return `
        <div class="queue-header">
            <h2>📋 Queue: 
                <select id="queueSelector" onchange="switchQueue(this.value)">
                    ${accessibleQueues.map(queue => 
                        `<option value="${queue.id}" ${queue.id === user.team_id ? 'selected' : ''}>
                            ${queue.name} ${queue.id === user.team_id ? '(Home)' : ''}
                        </option>`
                    ).join('')}
                </select>
            </h2>
            <div class="queue-stats">
                <span>Pending: 5</span>
                <span>In Progress: 3</span>
                <span>Cross-Team: 8</span>
            </div>
        </div>
    `;
}
```

#### **Helpdesk/Admin View**
```javascript
// Full section and team selector for cross-organizational access
function renderAdminView(user, sections, teams) {
    return `
        <div class="queue-header">
            <h2>📋 
                <select id="sectionSelector" onchange="updateTeamSelector(this.value)">
                    ${sections.map(section => 
                        `<option value="${section.id}">${section.name}</option>`
                    ).join('')}
                </select>
                →
                <select id="teamSelector" onchange="switchQueue(this.value)">
                    ${teams.map(team => 
                        `<option value="${team.id}">${team.name}</option>`
                    ).join('')}
                </select>
            </h2>
            <div class="queue-stats">
                <span>All Tickets: 45</span>
                <span>Escalated: 12</span>
                <span>Emergency: 3</span>
            </div>
        </div>
    `;
}
```

### **User Context & Permission Validation**
```javascript
// Login response includes full RBAC context
POST /api/auth/login
Response: {
    user: {
        id: 123,
        username: "john.doe",
        display_name: "John Doe",
        team_id: "ITTS_Region7",
        team_name: "ITTS: Region 7", 
        section_id: "ITTS",
        section_name: "IT Technical Support",
        role_id: "section_supervisor",
        permissions: [
            "ticket.view", "ticket.edit", "ticket.complete",
            "ticket.assign_within_section", "queue.view_section_teams",
            "queue.switch_within_section", "ticket.escalate_to_helpdesk"
        ],
        accessible_queues: [
            {id: "ITTS_Region1", name: "ITTS: Region 1", section: "ITTS"},
            {id: "ITTS_Region7", name: "ITTS: Region 7", section: "ITTS", is_home: true},
            {id: "ITTS_RegionN", name: "ITTS: Region N", section: "ITTS"}
        ],
        can_switch_queues: true,
        home_queue: "ITTS_Region7"
    },
    token: "jwt_token_here"
}

// Queue switching with permission validation
async function switchQueue(queueId) {
    // Validate access before switching
    const validation = await fetch('/api/auth/validate-queue-access', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: queueId })
    });
    
    const result = await validation.json();
    if (!result.allowed) {
        showError(`Access denied: ${result.reason}`);
        return;
    }
    
    // Load new queue
    showLoading(`Switching to ${queueId}...`);
    const tickets = await loadTickets({ queue: queueId });
    renderTicketQueue(tickets);
    updateQueueBreadcrumb(queueId);
}
```

---

## 🎨 **CORE UI COMPONENTS**

### **1. TicketManager.js (Main Orchestrator) - ~800 lines**

```javascript
class TicketManager {
    // === INITIALIZATION ===
    constructor()                        // System setup and dependencies
    init()                              // Authentication and UI initialization
    
    // === USER MANAGEMENT ===
    getCurrentUser()                    // Get current user context
    setCurrentUser(user)                // Update user context
    
    // === QUEUE MANAGEMENT ===
    loadTickets(queueType, teamId)      // Load tickets by queue type
    refreshQueue()                      // Refresh current queue
    filterTickets(filters)              // Apply filtering
    
    // === TICKET OPERATIONS ===
    viewTicket(ticketId)                // Show ticket modal
    createTicket(ticketData)            // Create new ticket
    updateTicket(ticketId, data)        // Update ticket
    deleteTicket(ticketId)              // Delete ticket
    
    // === ASSIGNMENT OPERATIONS ===
    assignToTeam(ticketId, teamId)      // Assign to team
    assignToUser(ticketId, userId)      // Assign to individual
    
    // === WORKFLOW OPERATIONS ===
    completeTicket(ticketId, notes)     // Complete with notes
    escalateTicket(ticketId, reason)    // Escalate to helpdesk
    resolveEscalation(ticketId, notes)  // Resolve escalated ticket
}
```

### **2. TicketAPI.js (API Client) - ~400 lines**

```javascript
class TicketAPI {
    // === CORE OPERATIONS ===
    makeRequest(url, options)           // Base API request handler
    getHeaders()                       // Authentication headers
    
    // === TICKET CRUD ===
    getTickets(filters)                // Load tickets with filtering
    getTicket(id)                      // Get single ticket
    createTicket(data)                 // Create new ticket
    updateTicket(id, data)             // Update ticket
    deleteTicket(id)                   // Delete ticket
    
    // === ASSIGNMENT ===
    assignToTeam(ticketId, teamId)     // Team assignment
    assignToUser(ticketId, userId)     // User assignment
    getAssignableUsers(teamId)         // Get users for assignment
    
    // === WORKFLOW ===
    completeTicket(ticketId, notes)    // Complete ticket
    escalateTicket(ticketId, reason)   // Escalate ticket
    resolveTicket(ticketId, notes)     // Resolve escalated ticket
    
    // === SYSTEM ===
    getSystemInfo()                    // Computer info for forms
    getClientIP()                      // IP detection
}
```

### **3. TicketUI.js (UI Renderer) - ~500 lines**

```javascript
class TicketUI {
    // === INITIALIZATION ===
    createQueueInterface()             // Main queue UI
    createFilterControls()             // Filter/search UI
    createTicketModal()                // Ticket detail modal
    
    // === QUEUE RENDERING ===
    renderTicketQueue(tickets)         // Render ticket list
    renderTicketCard(ticket)           // Individual ticket card
    updateQueueStats(stats)            // Update counter displays
    
    // === MODAL RENDERING ===
    showTicketModal(ticket)            // Display ticket details
    renderAssignmentControls(ticket)   // Assignment UI
    renderStatusControls(ticket)       // Status/priority controls
    renderEscalationForm()             // Escalation reason form
    
    // === FORM HANDLING ===
    attachEventListeners()             // UI event binding
    handleFormSubmission(event)        // Form submission logic
    validateFormData(data)             // Form validation
    
    // === UTILITY ===
    showNotification(message, type)    // User notifications
    showLoading(message)               // Loading states
    formatDate(date)                   // Date formatting
}
```

---

## 🚀 **IMPLEMENTATION GUIDE**

### **Phase 1: Core Foundation**
1. **Set up basic HTML structure** (index.html)
2. **Implement TicketAPI.js** with essential CRUD operations
3. **Create simple database schema** with main tickets table
4. **Test user submission flow** from form to database

### **Phase 2: Team Management**
1. **Add team structure** (teams table and API endpoints)
2. **Implement team assignment** logic in TicketManager.js
3. **Create team queue views** in TicketUI.js
4. **Add RBAC permissions** for team-based access

### **Phase 3: Workflow & Escalation**
1. **Implement status management** (pending → in_progress → completed)
2. **Add escalation workflow** with reason capture
3. **Create helpdesk queue interface**
4. **Test complete user journey**

### **Phase 4: Polish & Enhancement**
1. **Add filtering and search** capabilities
2. **Implement notifications** and loading states
3. **Add responsive design** for mobile access
4. **Performance optimization** and caching

---

## ⚡ **KEY SIMPLIFICATIONS**

### **1. Single Modal Manager**
- **Instead of**: 3 separate modal managers (1,889 lines)
- **Use**: Unified modal in TicketUI.js (~150 lines)
- **Benefit**: Eliminates form/dropdown coordination complexity

### **2. Unified API Client**
- **Instead of**: Scattered API calls across multiple managers
- **Use**: Single TicketAPI.js class (~400 lines)
- **Benefit**: Centralized error handling and authentication

### **3. Flexible RBAC System**
- **Instead of**: Hard-coded role hierarchy and 86 scattered permissions
- **Use**: Granular permission building blocks with customizable role templates
- **Benefit**: Fully customizable to any organizational structure

### **4. Clean Data Model**
- **Instead of**: Duplicate fields for "on behalf" functionality
- **Use**: Single user fields + submitted_by tracking
- **Benefit**: No data duplication, simpler queries

### **5. Integrated Authentication**
- **Instead of**: Separate ticket-system.html page for team access
- **Use**: Hidden modal login integrated into user submission form
- **Benefit**: Seamless user experience, single entry point

### **6. Event-Driven Communication**
- **Instead of**: Circular dependencies between managers
- **Use**: Direct method calls and event listeners
- **Benefit**: Cleaner architecture, easier debugging

---

## 📈 **EXPECTED BENEFITS**

### **Development Benefits**
- **77% code reduction**: 7,722 → 1,800 lines
- **80% file reduction**: 14 → 4 core files
- **90% complexity reduction**: Eliminate circular dependencies
- **50% faster development**: Simpler architecture to understand

### **Maintenance Benefits**
- **Single source of truth** for each functionality
- **Clear separation of concerns** without over-fragmentation
- **Easier debugging** with straightforward call paths
- **Simpler testing** with fewer interaction points

### **User Benefits**
- **Faster performance** with less code overhead
- **Better reliability** with simpler architecture
- **Easier to extend** for future requirements
- **Consistent user experience** across all features

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements**
- ✅ **User can submit tickets** via web form with auto-detection
- ✅ **Teams can manage queues** with proper assignment workflows
- ✅ **Escalation works** with reason capture and helpdesk resolution
- ✅ **RBAC controls access** based on team membership and role
- ✅ **On behalf submissions** work cleanly without duplicate fields

### **Technical Requirements**
- ✅ **4 core files maximum** for main functionality
- ✅ **Under 2,000 total lines** of code
- ✅ **No circular dependencies** between components
- ✅ **Single database table** for main ticket data
- ✅ **Flexible RBAC system** with granular permissions and role templates
- ✅ **Hidden modal authentication** integrated into user submission form
- ✅ **Dynamic queue access** based on user permissions

### **Performance Requirements**
- ✅ **Sub-second page loads** for queue management
- ✅ **Real-time updates** for ticket status changes
- ✅ **Mobile responsive** design for field access
- ✅ **Offline form storage** for user convenience

---

## 🚀 **DEPLOYMENT & INFRASTRUCTURE**

### **Apache + React Integration**

#### **Current Architecture (Single Next.js Server)**
```
User Browser → Next.js Server (HTTP/HTTPS localhost:80)
             ↓
           Unified App (SSR + API Routes + Static Files)
```

#### **React Migration Path**
```
Phase 1: Gradual Migration
├── Keep existing HTML forms (index.html)
├── Convert ticket queue to React components
├── Apache serves React build + original forms
└── Shared API endpoints for both interfaces

Phase 2: Full React Application
├── Convert entire system to React SPA
├── Apache serves React build folder
├── All API calls proxied to Node.js backend
└── Single page application with React Router
```

### **Apache HTTPS Configuration**

#### **SSL Virtual Host Setup**
```apache
# HTTPS Virtual Host (Port 443)
<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/html/ticket-system
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your-cert.crt
    SSLCertificateKeyFile /etc/ssl/private/your-key.key
    SSLCertificateChainFile /etc/ssl/certs/your-chain.crt
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Single Next.js Server (Port 80)
    # All API routes and static files served by Next.js
    # No proxy needed - unified server architecture
    
    # React Router Support (SPA)
    <Directory "/var/www/html/ticket-system">
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
        
        # Security
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
    
    # Static Asset Caching
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 month"
        Header append Cache-Control "public"
    </LocationMatch>
    
    # API No Caching
    <LocationMatch "^/api/">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </LocationMatch>
</VirtualHost>

# HTTP to HTTPS Redirect
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>
```

#### **Required Apache Modules**
```bash
# Enable required modules
sudo a2enmod ssl
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod expires

# Restart Apache
sudo systemctl restart apache2
```

### **React Build Integration**

#### **Development Workflow**
```bash
# Current development setup
npm start                    # React dev server (port 3000)
node server/server.js       # Node.js API (port 3001)
# Apache proxies between them

# API calls flow: React (3000) → Apache (443) → Node.js (3001)
```

#### **Production Deployment**
```bash
# Build React for production
npm run build

# Deploy to Apache
sudo cp -r build/* /var/www/html/ticket-system/
sudo chown -R www-data:www-data /var/www/html/ticket-system/
sudo systemctl reload apache2
```

#### **Package.json Configuration**
```json
{
  "name": "ticket-management-system",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "deploy": "npm run build && sudo cp -r build/* /var/www/html/ticket-system/",
    "dev-api": "node server/server.js"
  },
  "proxy": "http://localhost:3001",
  "homepage": "https://yourdomain.com"
}
```

### **Security Considerations**

#### **HTTPS Enforcement**
- **SSL/TLS termination** at Apache level
- **HTTP to HTTPS redirect** for all traffic
- **HSTS headers** to prevent downgrade attacks
- **Secure cookie flags** for authentication tokens

#### **API Security**
```apache
# Rate limiting for API endpoints
<LocationMatch "^/api/">
    # Limit to 100 requests per minute per IP
    SetEnvIf Remote_Addr "^(.*)$" CLIENT_IP=$1
    RewriteEngine On
    RewriteMap throttle "txt:/etc/apache2/throttle.map"
    RewriteCond ${throttle:${CLIENT_IP}|0} ^([0-9]+)$
    RewriteCond %1 >100
    RewriteRule .* - [R=429,L]
</LocationMatch>
```

#### **File Upload Security**
```apache
# Restrict file upload types and sizes
<LocationMatch "^/api/upload">
    # Max 10MB uploads
    LimitRequestBody 10485760
    
    # Block dangerous file types
    <FilesMatch "\.(php|pl|py|jsp|asp|sh|exe)$">
        Require all denied
    </FilesMatch>
</LocationMatch>
```

---

## 🔮 **PROGRESSIVE ENHANCEMENT PATH**

### **Migration Strategy: HTML → React**

#### **Phase 1: Hybrid Approach** (Minimal Risk)
```
Keep:
├── index.html (user submission form)
├── Apache HTTPS configuration
└── Node.js API backend

Convert to React:
├── Ticket queue management interface
├── Team assignment workflows  
├── Modal ticket details
└── Admin panels
```

#### **Phase 2: Full React SPA** (Future)
```
Convert Everything:
├── User submission form → React component
├── Authentication modal → React modal
├── All team interfaces → React router
└── Complete SPA with Apache serving build files
```

### **Optional Advanced Features**
These can be added later without changing the core architecture:

1. **React Component Library**: Reusable UI components for consistency
2. **Advanced Analytics**: Ticket metrics and reporting dashboard with React charts
3. **Real-time Updates**: WebSocket integration for live ticket updates
4. **Mobile App**: React Native app sharing components with web version
5. **Progressive Web App**: Service workers for offline functionality
6. **Automated Routing**: AI-based team assignment based on issue content
7. **SLA Management**: Time-based escalation and deadline tracking
8. **Knowledge Base**: Integration with FAQ and solution database
9. **Email Integration**: Bidirectional email sync for external communication

### **Scalability Considerations**
- **CDN Integration**: Serve React build files from CDN for global performance
- **Database optimization**: Add indexes for large ticket volumes
- **Caching layer**: Redis for frequently accessed team/user data  
- **API rate limiting**: Prevent abuse of submission endpoints
- **File attachments**: Object storage for ticket screenshots/documents
- **Audit logging**: Comprehensive change tracking for compliance
- **Load balancing**: Multiple Apache/Node.js instances for high availability

---

*This blueprint provides a **complete, minimal, and maintainable** ticket management system that delivers 90% of the functionality with 20% of the complexity. The design prioritizes simplicity, clarity, and ease of maintenance while preserving all essential workflows.*