const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('Adding basic comment permissions to all roles...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Add basic comment permission to all roles that can view tickets
const addPermissions = [
  // All roles that should be able to comment
  { role_id: 'developer', permission_id: 'ticket.comment_own' },
  { role_id: 'manager', permission_id: 'ticket.comment_own' },
  { role_id: 'admin', permission_id: 'ticket.comment_own' },
  { role_id: 'support', permission_id: 'ticket.comment_own' },
  { role_id: 'user', permission_id: 'ticket.comment_own' },
  
  // Also add viewing permissions if not already there
  { role_id: 'support', permission_id: 'ticket.view_team' },
  { role_id: 'user', permission_id: 'ticket.view_own' },
];

const insertPermission = (permission) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
      [permission.role_id, permission.permission_id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes > 0) {
            console.log(`✅ Added permission ${permission.permission_id} to role ${permission.role_id}`);
          } else {
            console.log(`ℹ️ Permission ${permission.permission_id} already exists for role ${permission.role_id}`);
          }
          resolve(this.changes);
        }
      }
    );
  });
};

// Add all permissions
const addAllPermissions = async () => {
  try {
    for (const permission of addPermissions) {
      await insertPermission(permission);
    }
    console.log('✅ All basic comment permissions processed successfully');
  } catch (error) {
    console.error('❌ Error adding permissions:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
};

addAllPermissions();