const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './orvale_tickets.db';

function addPresenceAdminColumns() {
  console.log('🔧 Adding admin override columns to user_presence table...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  
  try {
    // Check if columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(user_presence)").all();
    const columnNames = tableInfo.map(col => col.name);
    
    const columnsToAdd = [
      { name: 'admin_override', type: 'TEXT' },
      { name: 'override_reason', type: 'TEXT' },
      { name: 'override_by', type: 'TEXT' },
      { name: 'override_at', type: 'TIMESTAMP' },
      { name: 'visibility_override', type: 'TEXT' }
    ];
    
    let columnsAdded = 0;
    
    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`📝 Adding column: ${column.name}`);
        db.exec(`ALTER TABLE user_presence ADD COLUMN ${column.name} ${column.type}`);
        columnsAdded++;
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Update the status CHECK constraint to include 'invisible'
    console.log('🔧 Updating status constraint to include "invisible"...');
    try {
      // Create a temporary table with the new constraint
      db.exec(`
        CREATE TABLE user_presence_new (
          user_id TEXT PRIMARY KEY,
          status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline', 'invisible')) DEFAULT 'offline',
          status_message TEXT,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          socket_id TEXT,
          admin_override TEXT,
          override_reason TEXT,
          override_by TEXT,
          override_at TIMESTAMP,
          visibility_override TEXT,
          FOREIGN KEY (user_id) REFERENCES users(username)
        )
      `);
      
      // Copy data from old table
      db.exec(`
        INSERT INTO user_presence_new 
        SELECT user_id, status, status_message, last_active, socket_id, 
               admin_override, override_reason, override_by, override_at, visibility_override
        FROM user_presence
      `);
      
      // Drop old table and rename new one
      db.exec('DROP TABLE user_presence');
      db.exec('ALTER TABLE user_presence_new RENAME TO user_presence');
      
      // Recreate indexes
      db.exec('CREATE INDEX idx_user_presence_status ON user_presence(status)');
      db.exec('CREATE INDEX idx_user_presence_last_active ON user_presence(last_active)');
      db.exec('CREATE INDEX idx_user_presence_admin_override ON user_presence(admin_override)');
      
      console.log('✅ Status constraint updated successfully');
    } catch (error) {
      console.log('⚠️ Could not update status constraint (may already be correct):', error.message);
    }
    
    if (columnsAdded > 0) {
      console.log(`✅ Successfully added ${columnsAdded} new columns to user_presence table`);
    } else {
      console.log('✅ All admin override columns already exist');
    }
    
    // Show final table structure
    console.log('\n📋 Final user_presence table structure:');
    const finalTableInfo = db.prepare("PRAGMA table_info(user_presence)").all();
    finalTableInfo.forEach(col => {
      console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating user_presence table:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the migration
addPresenceAdminColumns();