const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Creating Helpdesk team, roles and users...');

// Helpdesk Supervisor permissions
const helpdeskSupervisorPermissions = [
    // Basic ticket permissions
    'ticket.view_all',               // Can see all tickets
    'ticket.view_team',
    'ticket.view_own',
    'ticket.update_own',
    'ticket.comment_own',
    'ticket.assign_own',
    'ticket.assign_within_team',
    'ticket.assign_cross_team',      // NEW: Cross-team assignment
    'ticket.reassign_any_team',      // NEW: Reassign from any team to any team
    'ticket.escalate',
    'ticket.manage_escalated',       // NEW: Manage escalated tickets
    
    // Queue permissions
    'queue.view_all',                // Can see all team queues
    'queue.view_team',
    'queue.view_own_team',
    'queue.view_escalated',          // NEW: View escalated queue
    'queue.access_helpdesk',         // NEW: Access helpdesk queue
    
    // System permissions
    'system.view_basic_info',
    
    // Reporting permissions
    'reporting.view_all',
    'reporting.view_team_metrics'
];

// Helpdesk Team Member permissions
const helpdeskTeamMemberPermissions = [
    // Basic ticket permissions
    'ticket.view_own',
    'ticket.update_own',
    'ticket.comment_own',
    'ticket.assign_own',
    'ticket.assign_cross_team',      // NEW: Can assign to other teams
    'ticket.escalate',
    'ticket.manage_escalated',       // NEW: Work with escalated tickets
    
    // Queue permissions (limited)
    'queue.view_own_team',
    'queue.view_escalated',          // NEW: View escalated queue only
    'queue.access_helpdesk',         // NEW: Access helpdesk queue
    
    // System permissions
    'system.view_basic_info'
];

// Define new roles
const newRoles = [
    {
        id: 'helpdesk_supervisor',
        name: 'Helpdesk Supervisor',
        description: 'Helpdesk supervisor with cross-team visibility and assignment capabilities',
        is_system: true,
        permissions: helpdeskSupervisorPermissions
    },
    {
        id: 'helpdesk_member',
        name: 'Helpdesk Team Member',
        description: 'Helpdesk team member with escalated queue access and cross-team assignment',
        is_system: true,
        permissions: helpdeskTeamMemberPermissions
    }
];

// New users to create
const newUsers = [
    {
        username: 'jane.smith',
        display_name: 'Jane Smith',
        email: 'jane.smith@orvale.gov',
        password: 'jane123',
        role: 'helpdesk_supervisor',
        team_id: 'HELPDESK',
        section_id: 'ITD'
    },
    {
        username: 'john.smith',
        display_name: 'John Smith', 
        email: 'john.smith@orvale.gov',
        password: 'john123',
        role: 'helpdesk_member',
        team_id: 'HELPDESK',
        section_id: 'ITD'
    }
];

// Step 1: Create Helpdesk Team
function createHelpdeskTeam() {
    console.log('🏢 Creating Helpdesk Team...');
    
    db.run(
        `INSERT OR IGNORE INTO teams (id, name, description, section_id) VALUES (?, ?, ?, ?)`,
        ['HELPDESK', 'Helpdesk Team', 'Escalated ticket management and cross-team support', 'ITD'],
        function(err) {
            if (err) {
                console.error('❌ Error creating Helpdesk team:', err);
                db.close();
                return;
            }
            
            if (this.changes > 0) {
                console.log('✅ Created Helpdesk Team (HELPDESK)');
            } else {
                console.log('ℹ️  Helpdesk Team already exists');
            }
            
            // Continue with roles creation
            createRoles();
        }
    );
}

// Step 2: Create roles and permissions
function createRoles() {
    console.log('📋 Creating new roles...');
    let rolesCreated = 0;
    const totalRoles = newRoles.length;

    newRoles.forEach(role => {
        db.run(
            `INSERT OR IGNORE INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)`,
            [role.id, role.name, role.description, role.is_system],
            function(err) {
                if (err) {
                    console.error(`❌ Error creating role ${role.id}:`, err);
                } else {
                    console.log(`✅ Created role: ${role.name}`);
                    
                    // Insert permissions for this role
                    let permissionsAdded = 0;
                    role.permissions.forEach(permission => {
                        db.run(
                            `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
                            [role.id, permission],
                            (permErr) => {
                                if (permErr) {
                                    console.error(`❌ Error adding permission ${permission} to ${role.id}:`, permErr);
                                } else {
                                    console.log(`  ➤ Added permission: ${permission}`);
                                }
                                
                                permissionsAdded++;
                                
                                // Check if all permissions for this role are done
                                if (permissionsAdded === role.permissions.length) {
                                    rolesCreated++;
                                    console.log(`✅ Role ${role.name} completed with ${role.permissions.length} permissions`);
                                    
                                    // If all roles are created, create users
                                    if (rolesCreated === totalRoles) {
                                        createUsers();
                                    }
                                }
                            }
                        );
                    });
                }
            }
        );
    });
}

// Step 3: Create new users
function createUsers() {
    console.log('\n👥 Creating new users...');
    let usersCreated = 0;
    const totalUsers = newUsers.length;
    
    newUsers.forEach(userData => {
        const hashedPassword = bcrypt.hashSync(userData.password, 10);
        db.run(
            `INSERT OR REPLACE INTO users (username, display_name, email, password_hash, role, team_id, section_id, active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [userData.username, userData.display_name, userData.email, hashedPassword, userData.role, userData.team_id, userData.section_id],
            function(err) {
                if (err) {
                    console.error(`❌ Error creating user ${userData.username}:`, err);
                } else {
                    console.log(`✅ Created user: ${userData.display_name} (${userData.username}) - ${userData.role}`);
                }
                
                usersCreated++;
                
                // Check if we're done
                if (usersCreated === totalUsers) {
                    console.log(`\n🎉 Successfully created Helpdesk team, ${newRoles.length} roles and ${totalUsers} users!`);
                    
                    // Verify the setup
                    verifySetup();
                }
            }
        );
    });
}

// Step 4: Verify the setup
function verifySetup() {
    console.log('\n🔍 Verifying setup...');
    
    // Check team
    db.get(
        `SELECT id, name FROM teams WHERE id = 'HELPDESK'`,
        (teamErr, team) => {
            if (teamErr) {
                console.error('❌ Error verifying team:', teamErr);
            } else if (team) {
                console.log(`🏢 Verified Helpdesk team: ${team.name} (${team.id})`);
            }
            
            // Check roles
            db.all(
                `SELECT id, name FROM roles WHERE id IN ('helpdesk_supervisor', 'helpdesk_member')`,
                (err, roles) => {
                    if (err) {
                        console.error('❌ Error verifying roles:', err);
                    } else {
                        console.log(`📋 Verified ${roles.length} helpdesk roles created`);
                        roles.forEach(role => console.log(`  ➤ ${role.name} (${role.id})`));
                    }
                    
                    // Check users
                    db.all(
                        `SELECT username, display_name, role, team_id FROM users WHERE username IN ('jane.smith', 'john.smith')`,
                        (userErr, users) => {
                            if (userErr) {
                                console.error('❌ Error verifying users:', userErr);
                            } else {
                                console.log(`👥 Verified ${users.length} helpdesk users created`);
                                users.forEach(user => console.log(`  ➤ ${user.display_name} (${user.username}) - ${user.role} - Team: ${user.team_id}`));
                            }
                            
                            // Check permissions count
                            db.all(
                                `SELECT role_id, COUNT(*) as perm_count FROM role_permissions WHERE role_id IN ('helpdesk_supervisor', 'helpdesk_member') GROUP BY role_id`,
                                (permErr, permCounts) => {
                                    if (permErr) {
                                        console.error('❌ Error verifying permissions:', permErr);
                                    } else {
                                        console.log(`🔒 Permission counts:`);
                                        permCounts.forEach(count => console.log(`  ➤ ${count.role_id}: ${count.perm_count} permissions`));
                                    }
                                    
                                    console.log('\n✨ Helpdesk setup complete!');
                                    console.log('\n🔑 Test Credentials:');
                                    console.log('   Supervisor: jane.smith / jane123');
                                    console.log('   Team Member: john.smith / john123');
                                    console.log('\n📋 New Permissions Added:');
                                    console.log('   - ticket.assign_cross_team');
                                    console.log('   - queue.view_escalated');
                                    console.log('   - ticket.manage_escalated');
                                    console.log('   - ticket.reassign_any_team');
                                    console.log('   - queue.access_helpdesk');
                                    
                                    db.close();
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}

// Start the process
createHelpdeskTeam();