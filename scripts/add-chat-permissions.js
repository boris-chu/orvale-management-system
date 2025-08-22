const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

console.log('🔐 Adding chat system RBAC permissions...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database');
});

// New chat permissions based on the plan
const chatPermissions = [
  'chat.access_channels',      // Basic chat access
  'chat.create_channels',      // Create new channels
  'chat.manage_channels',      // Admin channel management
  'chat.delete_messages',      // Delete any messages
  'chat.moderate_channels',    // Moderate channel content
  'chat.access_private',       // Access private channels
  'chat.send_files',           // Upload/share files
  'chat.create_direct'         // Create direct message channels
];

// Role assignments - giving appropriate permissions to each role
const rolePermissions = {
  'admin': [
    'chat.access_channels',
    'chat.create_channels', 
    'chat.manage_channels',
    'chat.delete_messages',
    'chat.moderate_channels',
    'chat.access_private',
    'chat.send_files',
    'chat.create_direct'
  ],
  'manager': [
    'chat.access_channels',
    'chat.create_channels',
    'chat.manage_channels',
    'chat.moderate_channels',
    'chat.access_private',
    'chat.send_files', 
    'chat.create_direct'
  ],
  'helpdesk_supervisor': [
    'chat.access_channels',
    'chat.create_channels',
    'chat.moderate_channels',
    'chat.send_files',
    'chat.create_direct'
  ],
  'helpdesk_member': [
    'chat.access_channels',
    'chat.create_channels',
    'chat.send_files',
    'chat.create_direct'
  ],
  'it_user': [
    'chat.access_channels',
    'chat.send_files',
    'chat.create_direct'
  ]
};

async function addChatPermissions() {
  console.log('\n📋 Adding chat permissions to role_permissions table...');
  
  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    // Get role ID (role names are stored as id in the roles table)
    const role = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM roles WHERE id = ?', [roleName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!role) {
      console.log(`⚠️ Role '${roleName}' not found, skipping...`);
      continue;
    }

    console.log(`\n🔧 Adding permissions for role: ${roleName}`);
    
    for (const permission of permissions) {
      try {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [role.id, permission],
            function(err) {
              if (err) {
                // Ignore duplicate entries
                if (err.message.includes('UNIQUE constraint failed')) {
                  resolve();
                } else {
                  reject(err);
                }
              } else {
                resolve();
              }
            }
          );
        });
        console.log(`  ✅ ${permission}`);
      } catch (error) {
        console.log(`  ❌ Failed to add ${permission}: ${error.message}`);
      }
    }
  }
}

async function populateInitialPresence() {
  console.log('\n👥 Populating initial user presence data...');
  
  // Set all existing users to offline status initially
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO user_presence (user_id, status, last_active)
      SELECT username, 'offline', datetime('now')
      FROM users
      WHERE active = 1
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Initial user presence data populated');
        resolve();
      }
    });
  });
}

async function createDefaultChannels() {
  console.log('\n💬 Creating default chat channels...');
  
  const defaultChannels = [
    {
      name: 'general',
      description: 'General discussion for all team members',
      type: 'public',
      created_by: 'admin'
    },
    {
      name: 'helpdesk',
      description: 'Helpdesk team coordination and support',
      type: 'public', 
      created_by: 'admin',
      team_id: 'HELPDESK'
    },
    {
      name: 'announcements',
      description: 'Important system and team announcements',
      type: 'public',
      created_by: 'admin'
    }
  ];

  for (const channel of defaultChannels) {
    try {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO chat_channels (name, description, type, created_by, team_id)
          VALUES (?, ?, ?, ?, ?)
        `, [channel.name, channel.description, channel.type, channel.created_by, channel.team_id || null], 
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`  ✅ Created channel: #${channel.name}`);
            resolve(this.lastID);
          }
        });
      });
    } catch (error) {
      console.log(`  ⚠️ Channel #${channel.name} may already exist`);
    }
  }
}

// Execute setup
async function setupChatSystem() {
  try {
    await addChatPermissions();
    await populateInitialPresence();
    await createDefaultChannels();
    
    console.log('\n🎉 Chat system RBAC permissions setup complete!');
    console.log('\n📊 Summary:');
    console.log('   - 8 chat permissions added to role_permissions table');
    console.log('   - Initial user presence data populated (all offline)');
    console.log('   - Default channels created: #general, #helpdesk, #announcements');
    console.log('   - Admin: Full chat permissions');
    console.log('   - Manager: Channel management + moderation');
    console.log('   - Support: Basic chat + file sharing');
    console.log('   - User: Basic chat access');
    
  } catch (error) {
    console.error('❌ Error setting up chat system:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\nDatabase connection closed.');
      }
    });
  }
}

setupChatSystem();