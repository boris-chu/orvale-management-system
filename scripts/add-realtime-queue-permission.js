const Database = require('sqlite3').Database;
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

async function addRealtimeQueuePermission() {
  const db = new Database(dbPath);
  
  try {
    console.log('🔐 Adding public_portal.view_realtime_queue permission...\n');

    // First check if permission already exists
    const existingPermission = await new Promise((resolve, reject) => {
      db.get(
        `SELECT permission_id FROM role_permissions WHERE permission_id = ?`,
        ['public_portal.view_realtime_queue'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingPermission) {
      console.log('ℹ️  Permission public_portal.view_realtime_queue already exists.');
      db.close();
      return;
    }

    // Add permission to roles that should have it
    const permissionsToAdd = [
      { role_id: 'admin', permission_id: 'public_portal.view_realtime_queue' }, // admin
      { role_id: 'manager', permission_id: 'public_portal.view_realtime_queue' }, // manager  
      { role_id: 'helpdesk_supervisor', permission_id: 'public_portal.view_realtime_queue' }, // helpdesk supervisor
    ];

    console.log('📝 Adding permission to roles...');

    for (const perm of permissionsToAdd) {
      // Check if role exists
      const roleExists = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id, name FROM roles WHERE id = ?`,
          [perm.role_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (roleExists) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [perm.role_id, perm.permission_id],
            function(err) {
              if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                  console.log(`   ⚠️  Permission already exists for role: ${roleExists.name}`);
                  resolve();
                } else {
                  reject(err);
                }
              } else {
                console.log(`   ✅ Added to role: ${roleExists.name} (ID: ${perm.role_id})`);
                resolve();
              }
            }
          );
        });
      } else {
        console.log(`   ⚠️  Role ID ${perm.role_id} not found, skipping...`);
      }
    }

    // Verify the additions
    console.log('\n🔍 Verifying added permissions:');
    const addedPermissions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT rp.permission_id, r.name as role_name, r.id as role_id
         FROM role_permissions rp
         JOIN roles r ON rp.role_id = r.id
         WHERE rp.permission_id = ?
         ORDER BY r.id`,
        ['public_portal.view_realtime_queue'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (addedPermissions.length > 0) {
      addedPermissions.forEach(perm => {
        console.log(`   ✅ ${perm.role_name} (ID: ${perm.role_id}) -> ${perm.permission_id}`);
      });
    } else {
      console.log('   ⚠️  No permissions found (this might indicate an issue)');
    }

    console.log('\n🎉 Permission setup complete!');
    console.log('\n📋 Permission Details:');
    console.log('   Name: public_portal.view_realtime_queue');
    console.log('   Description: View real-time updates in public support queue');
    console.log('   Purpose: Controls access to live queue statistics and real-time updates');
    console.log('   Use Cases:');
    console.log('     - Live queue monitoring');
    console.log('     - Real-time staff presence updates');
    console.log('     - Prevention of selective customer service');
    console.log('   Security: Admins can disable this to prevent queue cherry-picking');

  } catch (error) {
    console.error('❌ Error adding permission:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

// Run the script
if (require.main === module) {
  addRealtimeQueuePermission()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { addRealtimeQueuePermission };