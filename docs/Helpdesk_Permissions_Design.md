# Helpdesk Permissions Design

## Overview
This document outlines the permission structure for the helpdesk functionality in the Orvale Management System. The helpdesk module allows specialized users to manage tickets across multiple teams, facilitating efficient ticket routing and resolution.

## Current Implementation

### Existing Permission
- `helpdesk.multi_queue_access` - Grants access to view and manage tickets across multiple team queues

## Proposed Permission Structure

### 1. Team Management Permissions
These permissions control the ability to manage tickets across team boundaries.

| Permission | Description | Use Case |
|------------|-------------|----------|
| `helpdesk.assign_cross_team` | Can assign tickets to any team | Routing tickets to appropriate teams |
| `helpdesk.transfer_tickets` | Can transfer tickets between teams | Moving misrouted tickets |
| `helpdesk.reassign_any_ticket` | Can reassign any ticket regardless of current assignment | Override team assignments |

### 2. Ticket Operations Permissions
Control over ticket lifecycle and special operations.

| Permission | Description | Use Case |
|------------|-------------|----------|
| `helpdesk.escalate_tickets` | Can escalate tickets to management | Escalation workflow |
| `helpdesk.close_any_ticket` | Can close tickets from any team | Resolving cross-team issues |
| `helpdesk.reopen_closed_tickets` | Can reopen tickets that have been closed | Handling recurring issues |
| `helpdesk.delete_any_ticket` | Can delete tickets from any team | Data cleanup (use with caution) |

### 3. Priority & Status Management
Fine-grained control over ticket metadata.

| Permission | Description | Use Case |
|------------|-------------|----------|
| `helpdesk.set_urgent_priority` | Can set tickets to urgent priority | Emergency situations |
| `helpdesk.override_priority` | Can change priority on any ticket | Reprioritization |
| `helpdesk.bypass_workflow` | Can skip normal workflow states | Fast-track resolutions |

### 4. Visibility & Monitoring
Read access and monitoring capabilities.

| Permission | Description | Use Case |
|------------|-------------|----------|
| `helpdesk.view_all_teams` | Can view tickets from all teams (read-only) | Monitoring workload |
| `helpdesk.view_private_notes` | Can see internal/private notes on tickets | Full context access |
| `helpdesk.monitor_user_activity` | Can see who's working on what | Resource management |

### 5. Communication Permissions
Internal communication and notification capabilities.

| Permission | Description | Use Case |
|------------|-------------|----------|
| `helpdesk.send_team_notifications` | Can send notifications to teams | Alert teams about issues |
| `helpdesk.add_internal_notes` | Can add internal notes to any ticket | Cross-team communication |
| `helpdesk.broadcast_messages` | Can send system-wide messages | Major announcements |

### 6. Reporting & Analytics
Data export and reporting capabilities.

| Permission | Description | Use Case |
|------------|-------------|----------|
| `helpdesk.export_all_tickets` | Can export tickets from all teams | Data analysis |
| `helpdesk.view_team_metrics` | Can view performance metrics for all teams | Performance monitoring |
| `helpdesk.generate_reports` | Can generate cross-team reports | Management reporting |

## Recommended Core Permission Set

For initial implementation, these six permissions provide essential helpdesk functionality:

```javascript
const coreHelpdeskPermissions = [
  'helpdesk.multi_queue_access',    // Already implemented
  'helpdesk.assign_cross_team',     // Route tickets to any team
  'helpdesk.transfer_tickets',      // Move tickets between teams
  'helpdesk.escalate_tickets',      // Escalate to management
  'helpdesk.view_all_teams',        // Monitor all queues
  'helpdesk.add_internal_notes'     // Add notes for team communication
];
```

## Role-Based Permission Assignment

### Helpdesk Member
Basic helpdesk functionality for tier 1 support.

```javascript
const helpdeskMemberPermissions = [
  'helpdesk.multi_queue_access',
  'helpdesk.view_all_teams',
  'helpdesk.add_internal_notes'
];
```

### Helpdesk Supervisor
Enhanced permissions for team leads and supervisors.

```javascript
const helpdeskSupervisorPermissions = [
  'helpdesk.multi_queue_access',
  'helpdesk.assign_cross_team',
  'helpdesk.transfer_tickets',
  'helpdesk.escalate_tickets',
  'helpdesk.view_all_teams',
  'helpdesk.add_internal_notes',
  'helpdesk.override_priority',
  'helpdesk.view_team_metrics'
];
```

### Helpdesk Manager
Full helpdesk capabilities for management.

```javascript
const helpdeskManagerPermissions = [
  'helpdesk.*'  // All helpdesk permissions
];
```

## UI Implementation Guidelines

### Ticket Modal Enhancements

The ticket modal should progressively reveal features based on permissions:

#### Basic Features (with `helpdesk.multi_queue_access`)
- View tickets from all teams
- Access helpdesk queue interface

#### Team Assignment (with `helpdesk.assign_cross_team`)
```typescript
{hasPermission('helpdesk.assign_cross_team') && (
  <div className="mt-3">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Assigned Team:
    </label>
    <Select
      value={selectedTicket.assigned_team || ''}
      onChange={handleTeamChange}
      disabled={!isTicketEditable(selectedTicket)}
    >
      {teams.map(team => (
        <MenuItem key={team.id} value={team.id}>
          {team.label}
        </MenuItem>
      ))}
    </Select>
  </div>
)}
```

#### Escalation Controls (with `helpdesk.escalate_tickets`)
```typescript
{hasPermission('helpdesk.escalate_tickets') && (
  <Button
    variant="warning"
    onClick={() => escalateTicket(selectedTicket.id)}
  >
    <AlertTriangle className="h-4 w-4 mr-1" />
    Escalate to Management
  </Button>
)}
```

#### Internal Notes (with `helpdesk.add_internal_notes`)
```typescript
{hasPermission('helpdesk.add_internal_notes') && (
  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
    <h4 className="font-semibold text-yellow-800 mb-2">
      Internal Notes (Not visible to requester)
    </h4>
    <Textarea
      value={internalNote}
      onChange={(e) => setInternalNote(e.target.value)}
      placeholder="Add internal notes for team members..."
    />
    <Button 
      size="sm" 
      className="mt-2"
      onClick={saveInternalNote}
    >
      Add Note
    </Button>
  </div>
)}
```

## Database Schema Considerations

### Ticket History Tracking
When implementing these permissions, ensure ticket history tracks:
- Team transfers (from_team, to_team)
- Permission used for the action
- User who performed the action
- Timestamp of the action

### Internal Notes Table
```sql
CREATE TABLE ticket_internal_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES user_tickets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Security Considerations

1. **Audit Logging**: All helpdesk actions should be logged for accountability
2. **Permission Checks**: Always validate permissions on both frontend and backend
3. **Data Access**: Ensure helpdesk users can only see data relevant to their role
4. **Sensitive Information**: Consider adding field-level permissions for sensitive data

## Implementation Priority

1. **Phase 1**: Core permissions (6 permissions)
   - Implement basic cross-team functionality
   - Add team assignment dropdown
   - Enable ticket transfers

2. **Phase 2**: Enhanced operations (4 permissions)
   - Add escalation workflow
   - Implement priority overrides
   - Add internal notes

3. **Phase 3**: Advanced features (remaining permissions)
   - Reporting capabilities
   - Monitoring tools
   - Broadcast messaging

## Testing Scenarios

1. **Permission Inheritance**: Verify permissions work correctly in hierarchy
2. **Cross-Team Operations**: Test ticket transfers between all team combinations
3. **Audit Trail**: Confirm all actions are logged with correct metadata
4. **UI Visibility**: Ensure UI elements show/hide based on permissions
5. **API Security**: Verify backend enforces permissions independently

## Future Considerations

- **SLA Management**: Permissions for setting and overriding SLAs
- **Automation Rules**: Permissions for creating ticket routing rules
- **Customer Communication**: Permissions for direct customer contact
- **Integration Management**: Permissions for third-party integrations