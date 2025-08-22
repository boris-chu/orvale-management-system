const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('Adding comment management permissions...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// Add comment permissions to developer role
const addPermissions = [
  // Comment permissions for developer role
  { role_id: 'developer', permission_id: 'ticket.comment_delete_own' },
  { role_id: 'developer', permission_id: 'ticket.comment_delete_any' },
  
  // Comment permissions for manager role
  { role_id: 'manager', permission_id: 'ticket.comment_delete_own' },
  { role_id: 'manager', permission_id: 'ticket.comment_delete_any' },
  
  // Comment permissions for admin role
  { role_id: 'admin', permission_id: 'ticket.comment_delete_own' },
  { role_id: 'admin', permission_id: 'ticket.comment_delete_any' },
  
  // Basic comment permission for support role
  { role_id: 'support', permission_id: 'ticket.comment_delete_own' },
  
  // Basic comment permission for user role
  { role_id: 'user', permission_id: 'ticket.comment_delete_own' }
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
          console.log(`✅ Added permission ${permission.permission_id} to role ${permission.role_id}`);
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
    console.log('✅ All comment permissions added successfully');
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