# Database Operations Quick Reference Guide

## Common SQL Queries for Orvale Management System

### User Management

#### Get user with permissions
```sql
SELECT 
    u.*,
    GROUP_CONCAT(rp.permission_id) as permissions
FROM users u
LEFT JOIN role_permissions rp ON u.role = rp.role_id
WHERE u.username = ?
GROUP BY u.id;
```

#### Get all users in a team
```sql
SELECT u.*, t.name as team_name, s.name as section_name
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN sections s ON u.section_id = s.id
WHERE u.team_id = ? AND u.active = TRUE
ORDER BY u.display_name;
```

### Ticket Operations

#### Create new ticket with sequence number
```sql
-- First, get/update sequence
INSERT INTO ticket_sequences (team_id, date, last_sequence, prefix)
VALUES (?, date('now'), 1, ?)
ON CONFLICT(team_id, date) DO UPDATE SET
    last_sequence = last_sequence + 1
RETURNING last_sequence, prefix;

-- Then create ticket
INSERT INTO user_tickets (
    submission_id, user_name, employee_number, phone_number,
    location, section, teleworking, submitted_by, 
    submitted_by_employee_number, on_behalf, issue_title,
    issue_description, computer_info, priority, status,
    assigned_team, email_recipient, email_recipient_display,
    office, bureau, division, category, request_type,
    subcategory, sub_subcategory, implementation,
    original_submitting_team
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Record in history
INSERT INTO ticket_history (
    ticket_id, action_type, performed_by, performed_by_display,
    to_value, to_team, details
) VALUES (?, 'created', ?, ?, 'pending', ?, ?);
```

#### Get tickets for a team with full details
```sql
SELECT 
    ut.*,
    u_submitted.display_name as submitted_by_name,
    u_assigned.display_name as assigned_to_name,
    st.name as team_name,
    tc.name as category_name,
    rt.name as request_type_name
FROM user_tickets ut
LEFT JOIN users u_submitted ON ut.submitted_by = u_submitted.username
LEFT JOIN users u_assigned ON ut.assigned_to = u_assigned.username
LEFT JOIN support_teams st ON ut.assigned_team = st.id
LEFT JOIN ticket_categories tc ON ut.category = tc.id
LEFT JOIN request_types rt ON ut.request_type = rt.id
WHERE ut.assigned_team = ? 
    AND ut.status NOT IN ('completed', 'cancelled')
ORDER BY 
    CASE ut.priority 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    ut.submitted_at;
```

#### Get ticket history with context
```sql
SELECT 
    th.*,
    ut.issue_title,
    ut.submission_id
FROM ticket_history th
JOIN user_tickets ut ON th.ticket_id = ut.id
WHERE th.ticket_id = ?
ORDER BY th.performed_at DESC;
```

### Team Management

#### Get support teams by group
```sql
SELECT 
    stg.name as group_name,
    stg.sort_order as group_order,
    st.*
FROM support_teams st
JOIN support_team_groups stg ON st.group_id = stg.id
WHERE st.active = TRUE AND stg.active = TRUE
ORDER BY stg.sort_order, st.sort_order, st.name;
```

#### Get user's visible teams with preferences
```sql
SELECT 
    st.*,
    stg.name as group_name,
    COALESCE(htp.is_visible, TRUE) as is_visible,
    COALESCE(htp.tab_order, 0) as tab_order
FROM support_teams st
JOIN support_team_groups stg ON st.group_id = stg.id
LEFT JOIN helpdesk_team_preferences htp 
    ON st.id = htp.team_id AND htp.user_id = ?
WHERE st.active = TRUE AND stg.active = TRUE
    AND COALESCE(htp.is_visible, TRUE) = TRUE
ORDER BY htp.tab_order, stg.sort_order, st.sort_order;
```

### Organization Structure

#### Get full DPSS hierarchy
```sql
WITH RECURSIVE org_tree AS (
    -- Start with offices
    SELECT 
        'office' as level,
        id,
        name,
        NULL as parent_id,
        id as office_id,
        NULL as bureau_id,
        NULL as division_id
    FROM dpss_offices
    WHERE active = TRUE
    
    UNION ALL
    
    -- Add bureaus
    SELECT 
        'bureau' as level,
        b.id,
        b.name,
        b.office_id as parent_id,
        b.office_id,
        b.id as bureau_id,
        NULL as division_id
    FROM dpss_bureaus b
    JOIN org_tree ot ON b.office_id = ot.id
    WHERE b.active = TRUE
    
    UNION ALL
    
    -- Add divisions
    SELECT 
        'division' as level,
        d.id,
        d.name,
        d.bureau_id as parent_id,
        ot.office_id,
        d.bureau_id,
        d.id as division_id
    FROM dpss_divisions d
    JOIN org_tree ot ON d.bureau_id = ot.id
    WHERE d.active = TRUE
    
    UNION ALL
    
    -- Add sections
    SELECT 
        'section' as level,
        s.id,
        s.name,
        s.division_id as parent_id,
        ot.office_id,
        ot.bureau_id,
        s.division_id
    FROM dpss_sections s
    JOIN org_tree ot ON s.division_id = ot.id
    WHERE s.active = TRUE
)
SELECT * FROM org_tree
ORDER BY office_id, bureau_id, division_id, level;
```

### Classification System

#### Get full category hierarchy
```sql
SELECT 
    c.id as category_id,
    c.name as category_name,
    rt.id as request_type_id,
    rt.name as request_type_name,
    sc.id as subcategory_id,
    sc.name as subcategory_name,
    i.id as implementation_id,
    i.name as implementation_name
FROM ticket_categories c
LEFT JOIN request_types rt ON c.id = rt.category_id
LEFT JOIN subcategories sc ON rt.id = sc.request_type_id
LEFT JOIN implementations i ON sc.id = i.subcategory_id
WHERE c.active = TRUE
ORDER BY c.sort_order, rt.sort_order, sc.sort_order, i.sort_order;
```

### Reporting Queries

#### Ticket statistics by team
```sql
SELECT 
    st.name as team_name,
    COUNT(CASE WHEN ut.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN ut.status = 'in_progress' THEN 1 END) as in_progress_count,
    COUNT(CASE WHEN ut.status = 'escalated' THEN 1 END) as escalated_count,
    COUNT(CASE WHEN ut.status = 'completed' 
               AND DATE(ut.completed_at) = DATE('now') THEN 1 END) as completed_today,
    COUNT(*) as total_active
FROM support_teams st
LEFT JOIN user_tickets ut ON st.id = ut.assigned_team 
    AND ut.status NOT IN ('completed', 'cancelled')
    OR (ut.status = 'completed' AND DATE(ut.completed_at) = DATE('now'))
WHERE st.active = TRUE
GROUP BY st.id, st.name
ORDER BY total_active DESC;
```

#### User activity report
```sql
SELECT 
    u.display_name,
    u.username,
    COUNT(DISTINCT CASE WHEN ut.submitted_by = u.username THEN ut.id END) as tickets_submitted,
    COUNT(DISTINCT CASE WHEN ut.assigned_to = u.username THEN ut.id END) as tickets_assigned,
    COUNT(DISTINCT CASE WHEN ut.completed_by = u.username THEN ut.id END) as tickets_completed,
    COUNT(DISTINCT th.id) as total_actions
FROM users u
LEFT JOIN user_tickets ut ON u.username IN (ut.submitted_by, ut.assigned_to, ut.completed_by)
LEFT JOIN ticket_history th ON u.username = th.performed_by
WHERE u.active = TRUE
    AND (ut.submitted_at >= datetime('now', '-30 days') 
         OR th.performed_at >= datetime('now', '-30 days'))
GROUP BY u.id, u.display_name, u.username
ORDER BY total_actions DESC;
```

### Audit Queries

#### Recent system changes
```sql
SELECT 
    ssa.*,
    u.display_name as updated_by_name
FROM system_settings_audit ssa
LEFT JOIN users u ON ssa.updated_by = u.username
ORDER BY ssa.updated_at DESC
LIMIT 50;
```

#### User action timeline
```sql
SELECT 
    'ticket_history' as source,
    th.performed_at as action_time,
    th.action_type,
    th.ticket_id as entity_id,
    ut.submission_id as entity_name,
    th.details
FROM ticket_history th
JOIN user_tickets ut ON th.ticket_id = ut.id
WHERE th.performed_by = ?

UNION ALL

SELECT 
    'system_settings' as source,
    ssa.updated_at as action_time,
    'setting_changed' as action_type,
    ssa.id as entity_id,
    ssa.setting_key as entity_name,
    json_object('old_value', ssa.old_value, 'new_value', ssa.new_value) as details
FROM system_settings_audit ssa
WHERE ssa.updated_by = ?

ORDER BY action_time DESC
LIMIT 100;
```

### Maintenance Queries

#### Clean up old completed tickets (archive)
```sql
-- Move to archive table (if exists) or mark for archival
UPDATE user_tickets
SET status = 'archived'
WHERE status = 'completed'
    AND completed_at < datetime('now', '-90 days');
```

#### Find orphaned records
```sql
-- Find tickets assigned to non-existent users
SELECT ut.* 
FROM user_tickets ut
LEFT JOIN users u ON ut.assigned_to = u.username
WHERE ut.assigned_to IS NOT NULL 
    AND u.id IS NULL;

-- Find tickets assigned to non-existent teams
SELECT ut.* 
FROM user_tickets ut
LEFT JOIN support_teams st ON ut.assigned_team = st.id
WHERE ut.assigned_team IS NOT NULL 
    AND st.id IS NULL;
```

## Database Optimization Tips

### Indexes to Consider Adding
```sql
-- For performance on ticket queries
CREATE INDEX idx_user_tickets_status_team ON user_tickets(status, assigned_team);
CREATE INDEX idx_user_tickets_submitted_by ON user_tickets(submitted_by);
CREATE INDEX idx_user_tickets_submitted_at ON user_tickets(submitted_at DESC);

-- For user lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_team_section ON users(team_id, section_id);

-- For history queries
CREATE INDEX idx_ticket_history_composite ON ticket_history(ticket_id, performed_at DESC);
```

### Regular Maintenance
```sql
-- Vacuum database to reclaim space
VACUUM;

-- Analyze tables for query optimization
ANALYZE;

-- Check database integrity
PRAGMA integrity_check;
```

## Connection Best Practices

### Node.js Connection Example
```javascript
const Database = require('better-sqlite3');

// Open connection with best practices
const db = new Database('orvale_tickets.db', {
    readonly: false,
    fileMustExist: true,
    timeout: 5000,
    verbose: console.log // for debugging
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Set journal mode for better concurrency
db.pragma('journal_mode = WAL');

// Prepare statements for reuse
const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
const updateTicket = db.prepare(`
    UPDATE user_tickets 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
`);

// Use transactions for multiple operations
const assignTicket = db.transaction((ticketId, userId, teamId) => {
    updateTicket.run('in_progress', ticketId);
    // ... more operations
});

// Always close when done
process.on('exit', () => db.close());
```

This guide provides the essential database operations needed for the Orvale Management System. Always use parameterized queries to prevent SQL injection and wrap related operations in transactions for data consistency.