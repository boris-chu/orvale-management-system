const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding ticket.view_history permission to all roles...');

// Permission to add
const newPermission = 'ticket.view_history';

// Get all existing roles
db.all('SELECT id FROM roles', (err, roles) => {
    if (err) {
        console.error('❌ Error fetching roles:', err);
        db.close();
        return;
    }
    
    if (roles.length === 0) {
        console.log('ℹ️  No roles found to update');
        db.close();
        return;
    }
    
    console.log(`📋 Found ${roles.length} roles to update:`);
    
    let processed = 0;
    let added = 0;
    
    roles.forEach(role => {
        // Check if permission already exists for this role
        db.get(
            'SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?',
            [role.id, newPermission],
            (err, existingPerm) => {
                if (err) {
                    console.error(`❌ Error checking permission for role ${role.id}:`, err);
                } else if (existingPerm) {
                    console.log(`  ➤ ${role.id}: Already has ticket.view_history permission ✓`);
                } else {
                    // Add the permission
                    db.run(
                        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                        [role.id, newPermission],
                        function(insertErr) {
                            if (insertErr) {
                                console.error(`❌ Error adding permission to role ${role.id}:`, insertErr);
                            } else {
                                console.log(`  ➤ ${role.id}: Added ticket.view_history permission ✅`);
                                added++;
                            }
                        }
                    );
                }
                
                processed++;
                
                // Close database when all roles are processed
                if (processed === roles.length) {
                    setTimeout(() => {
                        console.log(`\n🎉 Successfully processed ${processed} roles!`);
                        console.log(`📊 Summary:`);
                        console.log(`   - ${added} roles received new permission`);
                        console.log(`   - ${processed - added} roles already had permission`);
                        console.log(`\n✅ All users can now view ticket history!`);
                        db.close();
                    }, 100); // Small delay to ensure all operations complete
                }
            }
        );
    });
});