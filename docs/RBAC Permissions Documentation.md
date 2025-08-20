# RBAC Permissions Documentation
## Orvale Management System - Complete Permission Reference

**Last Updated:** August 20, 2025  
**Total Permissions:** 63  
**Permission Categories:** 11  

---

## 🎯 Overview

The Orvale Management System implements a comprehensive Role-Based Access Control (RBAC) system with 33 granular permissions across 8 functional categories. This document provides complete documentation of all available permissions, their purposes, and implementation details.

---

## 📋 Permission Categories

### 1. **Tickets** (13 permissions)
Core ticket management and workflow permissions

### 2. **Queues** (7 permissions)  
Ticket queue visibility and management permissions

### 3. **Users** (4 permissions)
User account management permissions

### 4. **Reporting** (2 permissions)
Analytics and reporting access permissions

### 5. **System** (2 permissions)
Basic system information and configuration permissions

### 6. **Administration** (8 permissions)
Advanced administrative functions

### 7. **Portal Management** (8 permissions)
Public portal configuration and management

### 8. **Data Management** (1 permission)
Data export/import operations

### 9. **Helpdesk** (8 permissions)
Specialized helpdesk operations and cross-team management

### 10. **Role Management** (2 permissions)
Role and permission management

### 11. **SLA Management** (2 permissions)
Service Level Agreement configuration

---

## 🔒 Detailed Permission Reference

### **TICKET PERMISSIONS**

#### `ticket.view_own`
- **Name:** View Own Tickets
- **Description:** View tickets assigned to self
- **Use Cases:** 
  - See personal workload
  - Track assigned issues
  - Basic permission for IT staff
- **Granted To:** IT Users, Managers, Admins

#### `ticket.view_team`
- **Name:** View Team Tickets
- **Description:** View all team tickets
- **Use Cases:**
  - See team workload
  - Monitor priorities
  - For team leads & managers
- **Granted To:** Managers, Admins

#### `ticket.view_all`
- **Name:** View All Tickets
- **Description:** View all system tickets
- **Use Cases:**
  - System-wide visibility
  - For administrators
  - Senior management access
- **Granted To:** Admins

#### `ticket.update_own`
- **Name:** Update Own Tickets
- **Description:** Modify assigned tickets
- **Use Cases:**
  - Update status & details
  - Add resolution notes
  - Essential for IT staff
- **Granted To:** IT Users, Managers, Admins

#### `ticket.assign_within_team`
- **Name:** Assign Within Team
- **Description:** Assign to team members
- **Use Cases:**
  - Distribute workload
  - For team leads
  - Within same section only
- **Granted To:** Managers, Admins

#### `ticket.assign_any`
- **Name:** Assign Any
- **Description:** Assign to any user
- **Use Cases:**
  - Cross-team assignment
  - For administrators
  - Broad oversight required
- **Granted To:** Admins

#### `ticket.comment_own`
- **Name:** Comment Own Tickets
- **Description:** Add comments & notes
- **Use Cases:**
  - Document progress
  - Communicate with users
  - Track solutions attempted
- **Granted To:** IT Users, Managers, Admins

#### `ticket.escalate`
- **Name:** Escalate Tickets
- **Description:** Escalate to higher level
- **Use Cases:**
  - Move to senior support
  - Critical for workflow
  - When issues can't be resolved
- **Granted To:** Managers, Admins

#### `ticket.delete`
- **Name:** Delete Tickets
- **Description:** Permanently delete tickets
- **Use Cases:**
  - Handle spam/duplicates
  - Data cleanup
  - ⚠️ Destructive action
- **Granted To:** Admins

#### `ticket.edit_completed`
- **Name:** Edit Completed Tickets
- **Description:** Modify tickets marked as completed
- **Use Cases:**
  - Correct completion notes
  - Reopen resolved tickets
  - Administrative corrections
  - ⚠️ Override completed status protection
- **Granted To:** Admins

#### `ticket.assign_own`
- **Name:** Assign to Self
- **Description:** Assign tickets to yourself
- **Use Cases:**
  - Take ownership of tickets
  - Self-assignment from queue
  - Basic assignment permission
- **Granted To:** IT Users, Managers, Admins

#### `ticket.assign_cross_team`
- **Name:** Cross-Team Assignment
- **Description:** Assign tickets between different teams
- **Use Cases:**
  - Helpdesk routing to appropriate teams
  - Escalation to specialized teams
  - Cross-departmental ticket distribution
- **Granted To:** Helpdesk Supervisor, Helpdesk Members, Admins

#### `ticket.reassign_any_team`
- **Name:** Reassign Any Team
- **Description:** Reassign tickets from any team to any other team
- **Use Cases:**
  - Full helpdesk supervisor authority
  - Administrative ticket management
  - Emergency reassignment capabilities
- **Granted To:** Helpdesk Supervisor, Admins

#### `ticket.manage_escalated`
- **Name:** Manage Escalated Tickets
- **Description:** Full management of escalated tickets
- **Use Cases:**
  - Helpdesk queue management
  - Escalated ticket processing
  - Priority ticket handling
- **Granted To:** Helpdesk Supervisor, Helpdesk Members, Admins

#### `ticket.override_assignment`
- **Name:** Override Assignment Protection
- **Description:** Edit tickets assigned to other users
- **Use Cases:**
  - Supervisory intervention
  - Emergency ticket handling
  - Administrative corrections
  - ⚠️ Bypasses ownership protection
- **Granted To:** Helpdesk Supervisor, Admins

---

### **QUEUE PERMISSIONS**

#### `queue.view_own_team`
- **Name:** View Own Team Queue
- **Description:** View team queue
- **Use Cases:**
  - See pending work
  - Prioritize tasks
  - Essential for team members
- **Granted To:** IT Users, Managers, Admins

#### `queue.view_team`
- **Name:** View Team Queues
- **Description:** View all section queues
- **Use Cases:**
  - Cross-team visibility
  - Coordinate work
  - For managers
- **Granted To:** Managers, Admins

#### `queue.view_all`
- **Name:** View All Queues
- **Description:** View all system queues
- **Use Cases:**
  - Organization-wide view
  - For administrators
  - System oversight
- **Granted To:** Admins

#### `queue.manage`
- **Name:** Manage Queues
- **Description:** Create & manage queues
- **Use Cases:**
  - Set rules & priorities
  - Configure routing
  - Administrator only
- **Granted To:** Admins

#### `queue.view_escalated`
- **Name:** View Escalated Queue
- **Description:** Access to the escalated/helpdesk queue
- **Use Cases:**
  - View escalated tickets
  - Helpdesk queue management
  - Priority ticket handling
- **Granted To:** Helpdesk Supervisor, Helpdesk Members, Admins

#### `queue.access_helpdesk`
- **Name:** Access Helpdesk Queue
- **Description:** Permission to access helpdesk queue
- **Use Cases:**
  - Helpdesk team operations
  - Escalated ticket processing
  - Cross-team ticket management
- **Granted To:** Helpdesk Supervisor, Helpdesk Members, Admins

---

### **USER PERMISSIONS**

#### `user.view_all`
- **Name:** View All Users
- **Description:** View all user accounts
- **Use Cases:**
  - See details & roles
  - Check status
  - For administrators
- **Granted To:** Admins

#### `user.create`
- **Name:** Create Users
- **Description:** Create new accounts
- **Use Cases:**
  - Set passwords & roles
  - Assign teams
  - HR & IT administrators
- **Granted To:** Admins

#### `user.update`
- **Name:** Update Users
- **Description:** Modify user details
- **Use Cases:**
  - Update contact info
  - Change assignments
  - Maintain accurate records
- **Granted To:** Admins

#### `user.deactivate`
- **Name:** Deactivate Users
- **Description:** Deactivate accounts
- **Use Cases:**
  - Remove system access
  - Security critical
  - When employees leave
- **Granted To:** Admins

---

### **REPORTING PERMISSIONS**

#### `reporting.view_team_metrics`
- **Name:** View Team Metrics
- **Description:** View team analytics
- **Use Cases:**
  - Resolution times
  - Workload distribution
  - Efficiency statistics
- **Granted To:** Managers, Admins

#### `reporting.view_all`
- **Name:** View All Reports
- **Description:** Access all reports
- **Use Cases:**
  - System-wide analytics
  - Strategic planning
  - Senior management
- **Granted To:** Admins

---

### **SYSTEM PERMISSIONS**

#### `system.view_basic_info`
- **Name:** View Basic Info
- **Description:** View system information
- **Use Cases:**
  - Version numbers
  - Uptime status
  - General awareness
- **Granted To:** IT Users, Managers, Admins

#### `system.manage_settings`
- **Name:** Manage Settings
- **Description:** Modify system config
- **Use Cases:**
  - Email templates
  - Notification rules
  - ⚠️ Critical permission
- **Granted To:** Admins

---

### **ADMINISTRATION PERMISSIONS**

#### `admin.manage_users`
- **Name:** Manage Users
- **Description:** Full user management
- **Use Cases:**
  - Create, modify, delete
  - Role assignment
  - ⚠️ Powerful permission
- **Granted To:** Admins

#### `admin.view_users`
- **Name:** View Users
- **Description:** Read-only user access
- **Use Cases:**
  - View details
  - See assignments
  - No modification rights
- **Granted To:** Admins

#### `admin.manage_teams`
- **Name:** Manage Teams
- **Description:** Create & manage teams
- **Use Cases:**
  - Set hierarchies
  - Assign members
  - Organizational structure
- **Granted To:** Admins

#### `admin.view_teams`
- **Name:** View Teams
- **Description:** Read-only team access
- **Use Cases:**
  - View structure
  - See relationships
  - No modifications
- **Granted To:** Admins

#### `admin.manage_organization`
- **Name:** Manage Organization
- **Description:** Modify org structure
- **Use Cases:**
  - Departments & sections
  - Reporting relationships
  - Critical data management
- **Granted To:** Admins

#### `admin.view_organization`
- **Name:** View Organization
- **Description:** View org hierarchy
- **Use Cases:**
  - Understand structure
  - See relationships
  - Read-only access
- **Granted To:** Admins

#### `admin.manage_categories`
- **Name:** Manage Categories
- **Description:** Manage ticket categories
- **Use Cases:**
  - Create & modify types
  - Organize routing
  - Classification system
- **Granted To:** Admins

#### `admin.view_categories`
- **Name:** View Categories
- **Description:** View category system
- **Use Cases:**
  - See available types
  - Understand structure
  - No modifications
- **Granted To:** Admins

#### `admin.view_analytics`
- **Name:** View Analytics
- **Description:** System analytics access
- **Use Cases:**
  - Performance dashboards
  - Trend analysis
  - Strategic planning
- **Granted To:** Admins

#### `admin.system_settings`
- **Name:** System Settings
- **Description:** Advanced system config
- **Use Cases:**
  - Security settings
  - Core behaviors
  - ⚠️ Highest level access
- **Granted To:** Admins

---

### **PORTAL MANAGEMENT PERMISSIONS**

#### `portal.manage_settings`
- **Name:** Manage Portal Settings
- **Description:** Configure portal settings
- **Use Cases:**
  - Form fields & validation
  - Display options
  - User experience controls
- **Granted To:** Admins

#### `portal.view_settings`
- **Name:** View Portal Settings
- **Description:** Read portal configuration
- **Use Cases:**
  - See current settings
  - Review options
  - No modification rights
- **Granted To:** Admins

#### `portal.manage_teams`
- **Name:** Manage Support Teams
- **Description:** Manage support teams
- **Use Cases:**
  - Create team assignments
  - Route categories to teams
  - Workflow configuration
- **Granted To:** Admins

#### `portal.view_teams`
- **Name:** View Support Teams
- **Description:** View team assignments
- **Use Cases:**
  - See routing rules
  - Check configurations
  - Read-only access
- **Granted To:** Admins

#### `portal.manage_categories`
- **Name:** Manage Portal Categories
- **Description:** Configure ticket categories
- **Use Cases:**
  - Add/edit categories
  - Set up routing
  - Classification management
- **Granted To:** Admins

#### `portal.view_categories`
- **Name:** View Portal Categories
- **Description:** View category structure
- **Use Cases:**
  - See available options
  - Understand routing
  - No modifications
- **Granted To:** Admins

#### `portal.manage_templates`
- **Name:** Manage Response Templates
- **Description:** Manage email templates
- **Use Cases:**
  - Create & edit templates
  - Set trigger conditions
  - Communication management
- **Granted To:** Admins

#### `portal.view_templates`
- **Name:** View Response Templates
- **Description:** View email templates
- **Use Cases:**
  - See template content
  - Check configurations
  - Read-only access
- **Granted To:** Admins

#### `portal.export_data`
- **Name:** Export Data
- **Description:** Export configuration data
- **Use Cases:**
  - Backup settings
  - Data migration
  - System maintenance
- **Granted To:** Admins

---

### **DATA MANAGEMENT PERMISSIONS**

#### `admin.manage_data`
- **Name:** Manage Data
- **Description:** Full data management
- **Use Cases:**
  - Import/export operations
  - Database maintenance
  - ⚠️ Critical system access
- **Granted To:** Admins

---

### **ROLE MANAGEMENT PERMISSIONS**

#### `admin.manage_roles`
- **Name:** Manage Roles
- **Description:** Create & modify roles
- **Use Cases:**
  - Assign permissions
  - Define access levels
  - ⚠️ Security critical
- **Granted To:** Admins

#### `admin.view_roles`
- **Name:** View Roles
- **Description:** View role definitions
- **Use Cases:**
  - See permissions
  - Understand hierarchy
  - Read-only access
- **Granted To:** Admins

---

### **HELPDESK PERMISSIONS**

#### `helpdesk.multi_queue_access`
- **Name:** Helpdesk Multi-Queue Access
- **Description:** Access helpdesk multi-queue interface
- **Use Cases:**
  - View escalated tickets from all teams
  - Monitor multiple team queues simultaneously
  - Configure team visibility settings
  - Essential for helpdesk supervisors & staff
- **Granted To:** Helpdesk Member, Helpdesk Supervisor, Admins

#### `helpdesk.view_all_teams`
- **Name:** View All Teams
- **Description:** Read-only access to all team tickets
- **Use Cases:**
  - Monitor cross-team workloads
  - Visibility into all queues
  - No assignment permissions
  - For helpdesk analysts and monitoring
- **Granted To:** Helpdesk Member, Helpdesk Supervisor, Admins

#### `helpdesk.assign_cross_team`
- **Name:** Cross-Team Assignment
- **Description:** Assign tickets to any team
- **Use Cases:**
  - Cross-team ticket routing
  - Load balancing capability
  - Override normal team boundaries
  - ⚠️ Powerful helpdesk permission
- **Granted To:** Helpdesk Supervisor, Admins

#### `helpdesk.transfer_tickets`
- **Name:** Transfer Tickets
- **Description:** Transfer tickets between teams
- **Use Cases:**
  - Redirect misrouted requests
  - Organizational flexibility
  - Track transfer history
  - For helpdesk coordinators
- **Granted To:** Helpdesk Supervisor, Admins

#### `helpdesk.escalate_tickets`
- **Name:** Escalate Tickets
- **Description:** Escalate tickets to management
- **Use Cases:**
  - Bypass normal workflows
  - Urgent issue handling
  - Management notification
  - Crisis response capability
- **Granted To:** Helpdesk Supervisor, Admins

#### `helpdesk.add_internal_notes`
- **Name:** Add Internal Notes
- **Description:** Add internal-only notes
- **Use Cases:**
  - Team communication
  - Hidden from requesters
  - Collaboration tool
  - For all helpdesk staff
- **Granted To:** Helpdesk Member, Helpdesk Supervisor, Admins

#### `helpdesk.override_priority`
- **Name:** Override Priority
- **Description:** Change ticket priority
- **Use Cases:**
  - Bump urgent issues
  - Adjust based on impact
  - Override initial assessment
  - For supervisors & leads
- **Granted To:** Helpdesk Supervisor, Admins

#### `helpdesk.view_team_metrics`
- **Name:** View Team Metrics
- **Description:** Access team performance data
- **Use Cases:**
  - Resolution time analytics
  - Workload distribution
  - Quality metrics
  - Management reporting tools
- **Granted To:** Helpdesk Supervisor, Admins

### **SLA MANAGEMENT PERMISSIONS**

#### `admin.manage_sla`
- **Name:** Manage SLA Configurations
- **Description:** Configure SLA rules
- **Use Cases:**
  - Set response times
  - Define escalation
  - Service level management
- **Granted To:** Admins

#### `admin.view_sla`
- **Name:** View SLA Configurations
- **Description:** View SLA settings
- **Use Cases:**
  - See time limits
  - Check configurations
  - Read-only access
- **Granted To:** Admins

---

## 🎭 Default Role Permissions

### **IT User Role**
**Base permissions for regular IT staff**
- `ticket.view_own`
- `ticket.update_own`
- `ticket.comment_own`
- `queue.view_own_team`
- `system.view_basic_info`

### **Manager Role**
**All IT User permissions plus team management**
- `ticket.view_team`
- `ticket.assign_within_team`
- `ticket.escalate`
- `queue.view_team`
- `reporting.view_team_metrics`

### **Admin Role**
**Complete system access with all 33 permissions**
- All ticket permissions
- All queue permissions
- All user permissions
- All reporting permissions
- All system permissions
- All administration permissions
- All portal management permissions
- All data management permissions
- All role management permissions
- All SLA management permissions

---

## 🔐 Security Considerations

### **High-Risk Permissions**
These permissions should be granted carefully:
- `ticket.delete` - Can permanently remove tickets
- `user.deactivate` - Can disable user accounts
- `admin.manage_users` - Full user control
- `admin.system_settings` - Core system access
- `admin.manage_data` - Database operations
- `admin.manage_roles` - Permission control

### **Permission Inheritance**
- Managers inherit all IT User permissions
- Admins inherit all Manager permissions
- No permission inheritance across non-hierarchical roles

### **Permission Enforcement**
All API endpoints enforce permissions through the `verifyAuth` middleware:
```javascript
if (!user.permissions?.includes('required.permission')) {
  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
}
```

---

## 📊 Implementation Status

### **Fully Implemented** ✅
- All 33 permissions defined in auth.ts
- All permissions available in Role Management UI
- Permission checks in all API endpoints
- Default role assignments configured

### **API Endpoint Coverage** ✅
All API endpoints have proper permission checks:
- `/api/developer/users/*` - User management permissions
- `/api/developer/teams/*` - Team management permissions  
- `/api/developer/roles/*` - Role management permissions
- `/api/developer/portal-settings/*` - Portal settings permissions
- `/api/developer/response-templates/*` - Template permissions
- `/api/developer/sla-configurations/*` - SLA permissions
- `/api/developer/data-management/*` - Data management permissions

---

## 🚀 Future Enhancements

### **Planned Additions**
- Time-based permissions (scheduled access)
- IP-based restrictions
- Multi-factor authentication requirements
- Audit logging for permission changes
- Fine-grained field-level permissions

### **Advanced Features**
- Dynamic permission generation
- Context-aware permissions
- Permission templates
- Bulk permission management

---

## 📞 Support & Maintenance

### **Permission Updates**
When adding new functionality:
1. Define new permissions in auth.ts
2. Add to Role Management UI
3. Implement API endpoint checks
4. Update this documentation
5. Test permission enforcement

### **Troubleshooting**
Common permission issues:
- User not seeing features: Check role permissions
- API 403 errors: Verify endpoint permission checks
- Role updates not applying: Clear user session

---

*This documentation is maintained as part of the Orvale Management System and should be updated whenever new permissions are added or existing ones are modified.*