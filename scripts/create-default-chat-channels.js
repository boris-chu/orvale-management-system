const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🗣️ Creating default chat channels...');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('Connected to SQLite database');

  // Create default public channels
  const defaultChannels = [
    {
      name: 'general',
      description: 'General discussion for all team members',
      type: 'public',
      created_by: 'admin'
    },
    {
      name: 'announcements',
      description: 'Important announcements and updates',
      type: 'public',
      created_by: 'admin'
    },
    {
      name: 'help-desk',
      description: 'Help desk coordination and support',
      type: 'public',
      created_by: 'admin'
    },
    {
      name: 'it-support',
      description: 'IT support team discussions',
      type: 'public',
      created_by: 'admin'
    }
  ];

async function createChannels() {
  for (const channel of defaultChannels) {
    try {
      // Check if channel already exists
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM chat_channels WHERE name = ?', [channel.name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (existing) {
        console.log(`⚠️ Channel '${channel.name}' already exists, skipping`);
        continue;
      }

      // Create the channel
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO chat_channels (name, description, type, created_by, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `, [channel.name, channel.description, channel.type, channel.created_by], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });

      console.log(`✅ Created channel '${channel.name}' with ID ${result.lastID}`);

      // Add the creator as a member
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at, active)
          VALUES (?, ?, 'admin', datetime('now'), 1)
        `, [result.lastID, channel.created_by], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`✅ Added ${channel.created_by} as admin member of '${channel.name}'`);

    } catch (error) {
      console.error(`❌ Error creating channel '${channel.name}':`, error.message);
    }
  }

  // Show summary
  const channels = await new Promise((resolve, reject) => {
    db.all('SELECT name, type, description FROM chat_channels WHERE active = 1', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log('\n📊 Channel Summary:');
  channels.forEach(channel => {
    console.log(`   📢 ${channel.name} (${channel.type}): ${channel.description}`);
  });

  console.log('\n🎉 Default chat channels setup complete!');
  db.close();
}

createChannels().catch(error => {
  console.error('❌ Database error:', error);
  db.close();
});