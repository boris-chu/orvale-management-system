const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('🔐 Adding chat admin permissions to RBAC system...');

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Chat admin permissions to add
const chatAdminPermissions = [
  { role: 'admin', permission: 'chat.admin_access', description: 'Access chat system admin dashboard' },
  { role: 'admin', permission: 'chat.manage_channels', description: 'Create, edit, delete chat channels' },
  { role: 'admin', permission: 'chat.moderate_all', description: 'Moderate all messages across channels' },
  { role: 'admin', permission: 'chat.manage_files', description: 'Configure file sharing policies' },
  { role: 'admin', permission: 'chat.manage_apis', description: 'Manage external API integrations' },
  { role: 'admin', permission: 'chat.view_analytics', description: 'View chat system analytics' },
  { role: 'admin', permission: 'chat.system_settings', description: 'Configure chat system settings' },
  { role: 'admin', permission: 'chat.user_restrictions', description: 'Apply restrictions to chat users' }
];

// Add permissions
async function addPermissions() {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
  `);

  let added = 0;
  let skipped = 0;

  for (const perm of chatAdminPermissions) {
    await new Promise((resolve, reject) => {
      insertStmt.run(perm.role, perm.permission, function(err) {
        if (err) {
          console.error(`❌ Error adding permission ${perm.permission}:`, err.message);
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`✅ Added: ${perm.permission} - ${perm.description}`);
            added++;
          } else {
            console.log(`⏭️  Skipped (exists): ${perm.permission}`);
            skipped++;
          }
          resolve();
        }
      });
    });
  }

  insertStmt.finalize();
  console.log(`\n📊 Summary: ${added} permissions added, ${skipped} skipped`);
}

// Run the update
addPermissions()
  .then(() => {
    console.log('\n🎉 Chat admin permissions update complete!');
    db.close();
  })
  .catch(err => {
    console.error('❌ Failed to add permissions:', err);
    db.close();
    process.exit(1);
  });