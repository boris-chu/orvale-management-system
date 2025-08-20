# Database Relationships Diagram

## Entity Relationship Overview

```mermaid
erDiagram
    %% User and Authentication System
    users ||--o{ user_tickets : "submits/assigned_to"
    users ||--o{ ticket_history : "performs_actions"
    users }o--|| roles : "has_role"
    users }o--o| teams : "belongs_to"
    users }o--o| sections : "belongs_to"
    users ||--o{ helpdesk_team_preferences : "has_preferences"
    
    roles ||--o{ role_permissions : "has_permissions"
    
    %% Ticket System
    user_tickets ||--o{ ticket_history : "has_history"
    user_tickets }o--o| support_teams : "assigned_to_team"
    
    ticket_sequences ||--|| support_teams : "generates_for"
    
    %% Organization Structure (DPSS)
    dpss_offices ||--o{ dpss_bureaus : "contains"
    dpss_bureaus ||--o{ dpss_divisions : "contains"
    dpss_divisions ||--o{ dpss_sections : "contains"
    
    %% Team Management
    sections ||--o{ teams : "contains"
    teams }o--o| users : "led_by"
    
    support_team_groups ||--o{ support_teams : "contains"
    support_teams ||--o{ helpdesk_team_preferences : "configured_in"
    
    %% Classification System
    ticket_categories ||--o{ request_types : "contains"
    request_types ||--o{ subcategories : "contains"
    subcategories ||--o{ implementations : "contains"
    
    %% Configuration and Audit
    system_settings ||--o{ system_settings_audit : "tracked_in"
    portal_settings ||--|| users : "updated_by"
    backup_log ||--|| users : "triggered_by"
```

## Detailed Relationships by System

### 1. User & Authentication Relationships

```mermaid
graph TD
    subgraph "User System"
        U[users]
        R[roles]
        RP[role_permissions]
        
        U -->|has role| R
        R -->|has permissions| RP
    end
    
    subgraph "Related Entities"
        T[teams]
        S[sections]
        UT[user_tickets]
        TH[ticket_history]
        HTP[helpdesk_team_preferences]
        
        U -->|belongs to| T
        U -->|belongs to| S
        U -->|submits| UT
        U -->|performs| TH
        U -->|configures| HTP
        T -->|led by| U
    end
```

### 2. Ticket System Relationships

```mermaid
graph TD
    subgraph "Ticket Core"
        UT[user_tickets]
        TH[ticket_history]
        TS[ticket_sequences]
        
        UT -->|tracked in| TH
        TS -->|generates IDs for| UT
    end
    
    subgraph "Related Entities"
        U[users]
        ST[support_teams]
        
        U -->|submits| UT
        U -->|assigned to| UT
        U -->|completes| UT
        UT -->|assigned to| ST
        ST -->|uses| TS
    end
```

### 3. DPSS Organization Hierarchy

```mermaid
graph TD
    DO[dpss_offices] -->|contains| DB[dpss_bureaus]
    DB -->|contains| DD[dpss_divisions]
    DD -->|contains| DS[dpss_sections]
    
    UT[user_tickets] -.->|references| DO
    UT -.->|references| DB
    UT -.->|references| DD
    UT -.->|references| DS
```

### 4. Team Management Structure

```mermaid
graph TD
    subgraph "Team Hierarchy"
        STG[support_team_groups] -->|contains| ST[support_teams]
        S[sections] -->|contains| T[teams]
    end
    
    subgraph "User Relations"
        U[users]
        HTP[helpdesk_team_preferences]
        
        U -->|belongs to| T
        T -->|led by| U
        U -->|has preferences for| HTP
        ST -->|configured in| HTP
    end
    
    subgraph "Ticket Relations"
        UT[user_tickets]
        TS[ticket_sequences]
        
        UT -->|assigned to| ST
        ST -->|uses| TS
    end
```

### 5. Classification Hierarchy

```mermaid
graph TD
    TC[ticket_categories] -->|contains| RT[request_types]
    RT -->|contains| SC[subcategories]
    SC -->|contains| I[implementations]
    
    UT[user_tickets] -.->|classified by| TC
    UT -.->|typed as| RT
    UT -.->|subcategorized as| SC
    UT -.->|implemented as| I
```

### 6. Audit & Configuration

```mermaid
graph TD
    subgraph "Settings"
        PS[portal_settings]
        SS[system_settings]
        SSA[system_settings_audit]
        
        SS -->|tracked in| SSA
    end
    
    subgraph "Backup"
        BL[backup_log]
    end
    
    U[users] -->|updates| PS
    U -->|updates| SS
    U -->|triggers| BL
```

## Key Relationship Patterns

### One-to-Many Relationships
- `users` → `user_tickets` (user can submit many tickets)
- `roles` → `role_permissions` (role can have many permissions)
- `support_team_groups` → `support_teams` (group contains many teams)
- `ticket_categories` → `request_types` (category has many types)

### Many-to-One Relationships
- `user_tickets` → `support_teams` (many tickets to one team)
- `teams` → `sections` (many teams in one section)
- `users` → `roles` (many users have one role)

### Many-to-Many Relationships
- `users` ↔ `support_teams` (via helpdesk_team_preferences)
- `roles` ↔ permissions (via role_permissions)

### Self-Referential Relationships
- `sections` → `sections` (parent-child hierarchy)

### Audit Relationships
- All major entities → audit tables (for change tracking)
- `user_tickets` → `ticket_history` (comprehensive audit trail)
- `system_settings` → `system_settings_audit` (configuration changes)

## Data Flow Examples

### Ticket Creation Flow
```
1. User submits ticket → creates user_tickets record
2. System gets next sequence from ticket_sequences
3. Ticket assigned to support_teams
4. Action recorded in ticket_history
5. User notified based on email_recipient
```

### Permission Check Flow
```
1. User attempts action
2. System checks users.role
3. Looks up role_permissions for that role
4. Verifies permission exists
5. Allows/denies action
```

### Organization Lookup Flow
```
1. User selects dpss_offices
2. System loads related dpss_bureaus
3. User selects bureau, loads dpss_divisions
4. User selects division, loads dpss_sections
5. Selection stored in user_tickets
```

This relationship structure ensures data integrity while supporting complex workflows and maintaining a complete audit trail of all system activities.