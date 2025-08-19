const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

// All permissions that admin should have
const adminPermissions = [
    // Basic ticket permissions
    'ticket.view_all',
    'ticket.view_team',
    'ticket.view_own',
    'ticket.update_own',
    'ticket.comment_own',
    'ticket.assign_own',
    'ticket.assign_within_team',
    'ticket.assign_any',
    'ticket.escalate',
    'ticket.delete',
    'ticket.edit_completed',
    'ticket.override_assignment',
    
    // User management permissions
    'user.view_all',
    'user.create',
    'user.update',
    'user.deactivate',
    
    // Queue permissions
    'queue.view_all',
    'queue.view_team',
    'queue.view_own_team',
    'queue.manage',
    
    // System permissions
    'system.manage_settings',
    'system.view_basic_info',
    
    // Reporting permissions
    'reporting.view_all',
    'reporting.view_team_metrics',
    
    // Admin dashboard permissions
    'admin.manage_users',
    'admin.view_users',
    'admin.manage_teams',
    'admin.view_teams',
    'admin.manage_organization',
    'admin.view_organization',
    'admin.manage_categories',
    'admin.view_categories',
    'admin.manage_support_teams',
    'admin.view_support_teams',
    'admin.view_analytics',
    'admin.system_settings',
    
    // Portal management permissions
    'portal.manage_settings',
    'portal.view_settings',
    'portal.export_data',
    'portal.manage_templates',
    'portal.view_templates',
    'portal.manage_teams',
    'portal.view_teams',
    'portal.manage_categories',
    'portal.view_categories',
    
    // Data management permissions
    'admin.manage_data',
    
    // Role management permissions
    'admin.manage_roles',
    'admin.view_roles',
    
    // SLA management permissions
    'admin.manage_sla',
    'admin.view_sla'
];

console.log('🔄 Updating admin permissions...');

// First, delete all existing admin permissions
db.run(`DELETE FROM role_permissions WHERE role_id = 'admin'`, (err) => {
    if (err) {
        console.error('❌ Error deleting existing admin permissions:', err);
        db.close();
        return;
    }
    
    console.log('✅ Cleared existing admin permissions');
    
    // Now insert all admin permissions
    let inserted = 0;
    const total = adminPermissions.length;
    
    adminPermissions.forEach(permission => {
        db.run(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ('admin', ?)`,
            [permission],
            (err) => {
                if (err) {
                    console.error(`❌ Error inserting permission ${permission}:`, err);
                } else {
                    console.log(`✅ Added permission: ${permission}`);
                }
                
                inserted++;
                
                // Check if we're done
                if (inserted === total) {
                    console.log(`\n🎉 Successfully updated admin role with ${total} permissions`);
                    
                    // Verify the permissions
                    db.all(
                        `SELECT permission_id FROM role_permissions WHERE role_id = 'admin' ORDER BY permission_id`,
                        (err, rows) => {
                            if (err) {
                                console.error('❌ Error verifying permissions:', err);
                            } else {
                                console.log(`\n📊 Admin now has ${rows.length} permissions`);
                            }
                            db.close();
                        }
                    );
                }
            }
        );
    });
});