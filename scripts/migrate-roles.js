const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Running roles table migration...');

db.serialize(() => {
    // Create roles table
    db.run(`
        CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            is_system BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating roles table:', err);
        } else {
            console.log('✅ Roles table created');
        }
    });

    // Create role permissions table
    db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating role_permissions table:', err);
        } else {
            console.log('✅ Role permissions table created');
        }
    });

    // Insert default roles
    const defaultRoles = [
        {
            id: 'admin',
            name: 'Administrator',
            description: 'Full system access with all permissions',
            is_system: true,
            permissions: [
                'ticket.view_all', 'ticket.assign_any', 'ticket.delete',
                'user.view_all', 'user.create', 'user.update', 'user.deactivate',
                'queue.view_all', 'queue.manage',
                'system.manage_settings', 'reporting.view_all',
                'admin.manage_users', 'admin.view_users',
                'admin.manage_teams', 'admin.view_teams',
                'admin.manage_organization', 'admin.view_organization',
                'admin.manage_categories', 'admin.view_categories',
                'admin.view_analytics', 'admin.system_settings'
            ]
        },
        {
            id: 'manager',
            name: 'Manager',
            description: 'Team management and reporting capabilities',
            is_system: true,
            permissions: [
                'ticket.view_team', 'ticket.assign_within_team', 'ticket.escalate',
                'queue.view_team', 'reporting.view_team_metrics',
                'ticket.view_own', 'ticket.update_own', 'ticket.comment_own',
                'queue.view_own_team', 'system.view_basic_info'
            ]
        },
        {
            id: 'it_user',
            name: 'IT User',
            description: 'Standard IT staff member with basic permissions',
            is_system: true,
            permissions: [
                'ticket.view_own', 'ticket.update_own', 'ticket.comment_own',
                'queue.view_own_team', 'system.view_basic_info'
            ]
        }
    ];

    let rolesProcessed = 0;
    defaultRoles.forEach((role) => {
        db.run(
            `INSERT OR IGNORE INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)`,
            [role.id, role.name, role.description, role.is_system],
            function(err) {
                if (err) {
                    console.error(`❌ Error inserting role ${role.id}:`, err);
                } else {
                    console.log(`✅ Role ${role.id} inserted`);
                    
                    // Insert permissions for this role
                    role.permissions.forEach((permission) => {
                        db.run(
                            `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
                            [role.id, permission],
                            (err) => {
                                if (err) {
                                    console.error(`❌ Error inserting permission ${permission} for role ${role.id}:`, err);
                                }
                            }
                        );
                    });
                }
                
                rolesProcessed++;
                if (rolesProcessed === defaultRoles.length) {
                    console.log('🎉 Migration completed successfully!');
                    db.close();
                }
            }
        );
    });
});