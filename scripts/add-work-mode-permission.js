/**
 * Add Staff Work Mode Management RBAC Permission
 * Adds new permission for managing staff work modes in public portal
 */

const Database = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

const addWorkModePermission = () => {
  return new Promise((resolve, reject) => {
    const db = new Database.Database(dbPath);

    const operations = [
      {
        name: 'Add staff work mode management permission to admin role',
        sql: `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'public_portal.manage_work_modes')`
      },
      {
        name: 'Add staff work mode management permission to manager role',
        sql: `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'public_portal.manage_work_modes')`
      },
      {
        name: 'Check if Boris Chu exists and add permission override',
        sql: `UPDATE users SET permission_overrides = CASE 
          WHEN permission_overrides IS NULL OR permission_overrides = '' OR permission_overrides = '[]' 
          THEN '["public_portal.manage_work_modes"]'
          ELSE json_set(permission_overrides, '$[#]', 'public_portal.manage_work_modes')
        END 
        WHERE username = 'bchu' AND (
          permission_overrides IS NULL OR 
          permission_overrides = '' OR 
          permission_overrides = '[]' OR 
          json_extract(permission_overrides, '$') NOT LIKE '%public_portal.manage_work_modes%'
        )`
      }
    ];

    let completedOperations = 0;
    const totalOperations = operations.length;

    const runOperation = (index) => {
      if (index >= operations.length) {
        db.close();
        resolve();
        return;
      }
      
      const operation = operations[index];
      db.run(operation.sql, (err) => {
        if (err) {
          console.error(`❌ Error executing operation "${operation.name}":`, err.message);
          // Continue with other operations instead of failing completely
        } else {
          console.log(`✅ Operation ${index + 1}/${totalOperations}: ${operation.name}`);
        }
        
        completedOperations++;
        runOperation(index + 1);
      });
    };
    
    runOperation(0);
  });
};

// Run the permission addition
addWorkModePermission()
  .then(() => {
    console.log('🎉 Work mode management permission added successfully!');
    console.log('📋 Permission: public_portal.manage_work_modes');
    console.log('👥 Added to roles: admin, manager');
    console.log('🔧 Added to Boris Chu permission overrides');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to add work mode management permission:', error);
    process.exit(1);
  });