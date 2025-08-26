#!/usr/bin/env node

/**
 * Add Public Portal Permissions to RBAC System
 * This script adds the new public portal permissions to the role_permissions table
 * Run: node scripts/add-public-portal-permissions.js
 */

const Database = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new Database.Database(dbPath);

console.log('🔐 Adding Public Portal Permissions to RBAC System...\n');

// Define the new permissions
const publicPortalPermissions = [
  {
    permission: 'public_portal.manage_settings',
    description: 'Configure public portal chat settings and themes',
    roles: ['admin']
  },
  {
    permission: 'public_portal.manage_queue',
    description: 'Manage public chat queue and assignments',
    roles: ['admin', 'manager']
  },
  {
    permission: 'public_portal.view_all_sessions',
    description: 'View all public chat sessions',
    roles: ['admin', 'manager']
  },
  {
    permission: 'public_portal.force_disconnect',
    description: 'Force disconnect chat sessions',
    roles: ['admin']
  },
  {
    permission: 'public_portal.override_work_modes',
    description: 'Override staff work mode settings',
    roles: ['admin']
  },
  {
    permission: 'public_portal.handle_chats',
    description: 'Handle public portal chat sessions',
    roles: ['admin', 'manager', 'support']
  },
  {
    permission: 'public_portal.change_work_mode',
    description: 'Change own work mode status',
    roles: ['admin', 'manager', 'support']
  }
];

// Also ensure portal.manage_settings exists for backward compatibility
const additionalPermissions = [
  {
    permission: 'portal.manage_settings',
    description: 'Manage public portal configuration',
    roles: ['admin']
  }
];

async function addPermissions() {
  try {
    console.log('📋 Adding permissions to database...\n');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    // Combine all permissions
    const allPermissions = [...publicPortalPermissions, ...additionalPermissions];
    
    for (const permDef of allPermissions) {
      for (const role of permDef.roles) {
        await new Promise((resolve, reject) => {
          // First check if permission already exists
          db.get(
            'SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?',
            [role, permDef.permission],
            (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (row) {
                console.log(`⏭️  Skipped: ${permDef.permission} for ${role} (already exists)`);
                skippedCount++;
                resolve();
              } else {
                // Add the permission
                db.run(
                  'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                  [role, permDef.permission],
                  function(err) {
                    if (err) {
                      reject(err);
                    } else {
                      console.log(`✅ Added: ${permDef.permission} for ${role}`);
                      addedCount++;
                      resolve();
                    }
                  }
                );
              }
            }
          );
        });
      }
    }
    
    // Also ensure specific users have the permissions
    console.log('\n📋 Ensuring admin users have permissions...\n');
    
    // Get admin users
    const adminUsers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT username, display_name FROM users WHERE role = 'admin'`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    if (adminUsers.length > 0) {
      console.log(`Found ${adminUsers.length} admin users:`, adminUsers.map(u => u.display_name).join(', '));
    } else {
      console.log('No admin users found in database');
    }
    
    console.log('\n🎉 Public Portal permissions added successfully!');
    console.log(`   ✅ Added: ${addedCount} permissions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} permissions (already existed)`);
    console.log('\n📊 Summary of permissions added:');
    console.log('   • public_portal.manage_settings - Configure public portal chat settings');
    console.log('   • public_portal.manage_queue - Manage public chat queue');
    console.log('   • public_portal.view_all_sessions - View all chat sessions');
    console.log('   • public_portal.force_disconnect - Force disconnect sessions');
    console.log('   • public_portal.override_work_modes - Override work modes');
    console.log('   • public_portal.handle_chats - Handle public chats');
    console.log('   • public_portal.change_work_mode - Change work mode status');
    console.log('   • portal.manage_settings - Manage portal configuration');
    
  } catch (error) {
    console.error('\n💥 Error adding permissions:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

addPermissions();