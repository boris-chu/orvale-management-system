# Orvale Management System Database Schema Documentation

## Overview
The Orvale Management System uses SQLite database (`orvale_tickets.db`) with 23 tables organized into several functional groups:

1. **User & Authentication System** - User accounts, roles, and permissions
2. **Ticket Management System** - Core ticketing functionality
3. **Organization Structure** - DPSS hierarchical organization
4. **Team Management** - Support teams and preferences
5. **Classification System** - Categories, types, and implementations
6. **Configuration & Audit** - System settings and audit logs

## Database Tables

### 1. User & Authentication System

#### `users` Table
Primary table for user accounts and authentication.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| username | TEXT | UNIQUE NOT NULL | Login username |
| display_name | TEXT | NOT NULL | User's display name |
| email | TEXT | | User's email address |
| password_hash | TEXT | NOT NULL | Bcrypt password hash |
| role | TEXT | NOT NULL DEFAULT 'it_user' | User's role (links to roles table) |
| team_id | TEXT | | ID of user's team |
| section_id | TEXT | | ID of user's section |
| active | BOOLEAN | DEFAULT TRUE | Account active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| profile_picture | TEXT | | URL/path to profile picture |
| login_preferences | TEXT | DEFAULT '{}' | JSON login preferences |

#### `roles` Table
Defines available roles in the system.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Role identifier (e.g., 'admin', 'it_user') |
| name | TEXT | NOT NULL | Human-readable role name |
| description | TEXT | | Role description |
| is_system | BOOLEAN | DEFAULT FALSE | Whether role is system-defined |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

#### `role_permissions` Table
Maps roles to permissions (many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| role_id | TEXT | NOT NULL, FK→roles(id) | Role identifier |
| permission_id | TEXT | NOT NULL | Permission identifier |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Assignment timestamp |

**Primary Key**: (role_id, permission_id)

### 2. Ticket Management System

#### `user_tickets` Table
Core table storing all ticket data.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique ticket ID |
| submission_id | TEXT | UNIQUE NOT NULL | Generated ticket number |
| user_name | TEXT | NOT NULL | Name of affected user |
| employee_number | TEXT | NOT NULL | Employee number |
| phone_number | TEXT | | Contact phone |
| location | TEXT | | Physical location |
| section | TEXT | | User's section |
| teleworking | TEXT | | Telework status |
| submitted_by | TEXT | NOT NULL | Username who submitted |
| submitted_by_employee_number | TEXT | NOT NULL | Submitter's employee number |
| on_behalf | BOOLEAN | DEFAULT FALSE | Submitted on behalf of someone |
| issue_title | TEXT | NOT NULL | Ticket title |
| issue_description | TEXT | NOT NULL | Detailed description |
| computer_info | TEXT | | Computer/asset information |
| priority | TEXT | DEFAULT 'medium' | Priority level |
| status | TEXT | DEFAULT 'pending' | Current status |
| assigned_to | TEXT | | Assigned user |
| assigned_team | TEXT | | Assigned team |
| email_recipient | TEXT | | Email notification recipient |
| email_recipient_display | TEXT | | Display name for email |
| submitted_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Submission timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| office | TEXT | | DPSS office |
| bureau | TEXT | | DPSS bureau |
| division | TEXT | | DPSS division |
| category | TEXT | | Ticket category |
| request_type | TEXT | | Type of request |
| subcategory | TEXT | | Subcategory |
| sub_subcategory | TEXT | | Sub-subcategory |
| implementation | TEXT | | Implementation details |
| completion_notes | TEXT | | Completion notes |
| escalation_reason | TEXT | | Reason for escalation |
| escalated_at | TIMESTAMP | | Escalation timestamp |
| completed_at | TIMESTAMP | | Completion timestamp |
| completed_by | TEXT | | User who completed |
| original_submitting_team | TEXT | | Original team assignment |

#### `ticket_sequences` Table
Manages sequential ticket numbering per team.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| team_id | TEXT | PRIMARY KEY (with date) | Team identifier |
| date | TEXT | PRIMARY KEY (with team_id) | Date (YYYY-MM-DD) |
| last_sequence | INTEGER | DEFAULT 0 | Last sequence number used |
| prefix | TEXT | | Ticket prefix for team |

#### `ticket_history` Table
Audit trail for all ticket changes.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | History entry ID |
| ticket_id | INTEGER | NOT NULL, FK→user_tickets(id) | Related ticket |
| action_type | TEXT | NOT NULL | Type of action |
| performed_by | TEXT | NOT NULL | User who performed action |
| performed_by_display | TEXT | | Display name of user |
| from_value | TEXT | | Previous value |
| to_value | TEXT | | New value |
| from_team | TEXT | | Previous team |
| to_team | TEXT | | New team |
| reason | TEXT | | Reason for change |
| details | TEXT | | Additional JSON details |
| performed_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Action timestamp |

**Indexes**:
- idx_ticket_history_ticket_id
- idx_ticket_history_performed_at
- idx_ticket_history_action_type
- idx_ticket_history_performed_by

#### `ticket_history_detailed` View
Enriched view joining ticket history with ticket details.

### 3. Organization Structure (DPSS)

The DPSS tables form a hierarchical structure:
Office → Bureau → Division → Section

#### `dpss_offices` Table
Top-level organizational units.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Office identifier |
| name | TEXT | NOT NULL | Office name |
| description | TEXT | | Office description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `dpss_bureaus` Table
Second-level organizational units under offices.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Bureau identifier |
| office_id | TEXT | FK→dpss_offices(id) | Parent office |
| name | TEXT | NOT NULL | Bureau name |
| description | TEXT | | Bureau description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `dpss_divisions` Table
Third-level organizational units under bureaus.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Division identifier |
| bureau_id | TEXT | FK→dpss_bureaus(id) | Parent bureau |
| name | TEXT | NOT NULL | Division name |
| description | TEXT | | Division description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `dpss_sections` Table
Fourth-level organizational units under divisions.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Section identifier |
| division_id | TEXT | FK→dpss_divisions(id) | Parent division |
| name | TEXT | NOT NULL | Section name |
| description | TEXT | | Section description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

### 4. Team Management

#### `sections` Table
Organizational sections (different from DPSS sections).

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Section identifier |
| name | TEXT | NOT NULL | Section name |
| description | TEXT | | Section description |
| parent_section_id | TEXT | FK→sections(id) | Parent section |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `teams` Table
Teams within sections.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Team identifier |
| name | TEXT | NOT NULL | Team name |
| description | TEXT | | Team description |
| section_id | TEXT | NOT NULL, FK→sections(id) | Parent section |
| lead_user_id | INTEGER | FK→users(id) | Team lead user |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `support_team_groups` Table
Groups of support teams for organization.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Group identifier |
| name | TEXT | NOT NULL | Group name |
| description | TEXT | | Group description |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `support_teams` Table
Individual support teams within groups.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Team identifier |
| group_id | TEXT | NOT NULL, FK→support_team_groups(id) | Parent group |
| name | TEXT | NOT NULL | Team name |
| label | TEXT | NOT NULL | Display label |
| email | TEXT | NOT NULL | Team email |
| description | TEXT | | Team description |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `helpdesk_team_preferences` Table
User preferences for helpdesk team display.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| user_id | INTEGER | NOT NULL, FK→users(id) | User ID |
| team_id | TEXT | NOT NULL, FK→support_teams(id) | Team ID |
| is_visible | BOOLEAN | DEFAULT TRUE | Visibility preference |
| tab_order | INTEGER | DEFAULT 0 | Tab display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

**Primary Key**: (user_id, team_id)

### 5. Classification System

The classification system forms a hierarchy:
Category → Request Type → Subcategory → Implementation

#### `ticket_categories` Table
Top-level ticket categories.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Category identifier |
| name | TEXT | NOT NULL | Category name |
| description | TEXT | | Category description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `request_types` Table
Types of requests within categories.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Request type identifier |
| category_id | TEXT | NOT NULL, FK→ticket_categories(id) | Parent category |
| name | TEXT | NOT NULL | Request type name |
| description | TEXT | | Request type description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `subcategories` Table
Subcategories within request types.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Subcategory identifier |
| request_type_id | TEXT | NOT NULL, FK→request_types(id) | Parent request type |
| name | TEXT | NOT NULL | Subcategory name |
| description | TEXT | | Subcategory description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `implementations` Table
Implementation options within subcategories.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Implementation identifier |
| subcategory_id | TEXT | NOT NULL, FK→subcategories(id) | Parent subcategory |
| name | TEXT | NOT NULL | Implementation name |
| description | TEXT | | Implementation description |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

### 6. Configuration & Audit

#### `portal_settings` Table
Portal configuration settings stored as JSON.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | TEXT | PRIMARY KEY | Settings identifier |
| settings_json | TEXT | NOT NULL | JSON configuration |
| updated_by | TEXT | NOT NULL | User who updated |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `system_settings` Table
System-wide key-value settings.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY | Setting ID |
| setting_key | TEXT | UNIQUE NOT NULL | Setting key |
| setting_value | TEXT | NOT NULL | Setting value |
| updated_by | TEXT | NOT NULL | User who updated |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |
| log_level | TEXT | DEFAULT 'info' | Logging level |

#### `system_settings_audit` Table
Audit trail for system settings changes.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY | Audit entry ID |
| setting_key | TEXT | NOT NULL | Setting that changed |
| old_value | TEXT | | Previous value |
| new_value | TEXT | NOT NULL | New value |
| updated_by | TEXT | NOT NULL | User who updated |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

#### `backup_log` Table
Database backup history.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Backup ID |
| filename | TEXT | NOT NULL | Backup filename |
| file_path | TEXT | NOT NULL | Full file path |
| file_size | INTEGER | NOT NULL | Size in bytes |
| backup_type | TEXT | NOT NULL | Type of backup |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Backup timestamp |
| triggered_by | TEXT | | User who triggered |
| status | TEXT | DEFAULT 'completed' | Backup status |

## Table Relationships

### Primary Relationships

1. **User System**:
   - `users` → `roles` (many-to-one via role field)
   - `roles` → `role_permissions` → permissions (many-to-many)
   - `users` → `teams` (many-to-one via team_id)
   - `users` → `sections` (many-to-one via section_id)

2. **Ticket System**:
   - `user_tickets` → `users` (via submitted_by, assigned_to, completed_by)
   - `user_tickets` → `support_teams` (via assigned_team)
   - `ticket_history` → `user_tickets` (many-to-one)

3. **Organization Hierarchy**:
   - `dpss_offices` → `dpss_bureaus` → `dpss_divisions` → `dpss_sections`
   - Each level references its parent via foreign key

4. **Classification Hierarchy**:
   - `ticket_categories` → `request_types` → `subcategories` → `implementations`
   - Each level references its parent via foreign key

5. **Team Structure**:
   - `support_team_groups` → `support_teams` (one-to-many)
   - `sections` → `teams` (one-to-many)
   - `teams` → `users` (via lead_user_id)
   - `helpdesk_team_preferences` → `users` + `support_teams` (many-to-many with preferences)

## Key Design Patterns

### 1. Audit Trail
- All major entities have `created_at` and `updated_at` timestamps
- `ticket_history` provides comprehensive audit for tickets
- `system_settings_audit` tracks configuration changes

### 2. Soft Delete Pattern
- Most entities have an `active` boolean flag instead of hard deletes
- Preserves referential integrity and history

### 3. Hierarchical Data
- Multiple hierarchical structures (DPSS organization, ticket classification)
- Uses foreign keys to parent entities

### 4. JSON Storage
- `portal_settings` uses JSON for flexible configuration
- `login_preferences` in users table stores JSON
- `details` in ticket_history stores JSON for extensibility

### 5. Sequential Numbering
- `ticket_sequences` provides team-specific sequential ticket numbers
- Resets daily (based on date field)

## Security Considerations

1. **Password Storage**: Uses bcrypt hashes (password_hash field)
2. **Role-Based Access**: Comprehensive RBAC system with roles and permissions
3. **Audit Logging**: All changes tracked with user attribution
4. **Data Integrity**: Foreign key constraints maintain referential integrity

## Performance Optimizations

1. **Indexes**:
   - All primary keys have automatic indexes
   - Additional indexes on frequently queried fields (ticket_history)
   - Unique constraints create implicit indexes

2. **Views**:
   - `ticket_history_detailed` pre-joins common queries

3. **Denormalization**:
   - Some fields duplicated for query performance (e.g., display names)
   - Ticket contains flattened organization/classification data

## Usage Notes

1. **Ticket Submission Flow**:
   - Ticket created in `user_tickets`
   - Sequence number generated from `ticket_sequences`
   - Initial history entry created in `ticket_history`

2. **Permission Checking**:
   - User's role determined from `users.role`
   - Role's permissions fetched from `role_permissions`
   - Permission checked against action requirements

3. **Team Assignment**:
   - Tickets assigned to `support_teams`
   - User preferences from `helpdesk_team_preferences` affect display
   - History tracked in `ticket_history`

4. **Configuration Management**:
   - Portal UI settings in `portal_settings` (JSON)
   - System settings in `system_settings` (key-value)
   - All changes audited

This database schema provides a robust foundation for the Orvale Management System, supporting complex workflows while maintaining data integrity and providing comprehensive audit capabilities.