/**
 * Create Staff Work Modes Database Table
 * Adds staff work mode tracking for public portal chat assignment
 */

const Database = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

const createStaffWorkModesTable = () => {
  return new Promise((resolve, reject) => {
    const db = new Database.Database(dbPath);

    const migrations = [
      {
        name: 'Create staff_work_modes table',
        sql: `CREATE TABLE IF NOT EXISTS staff_work_modes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          work_mode TEXT CHECK(work_mode IN ('ready', 'work_mode', 'ticketing_mode', 'away', 'break')) DEFAULT 'away',
          status_message TEXT DEFAULT '',
          auto_accept_chats INTEGER DEFAULT 1,
          max_concurrent_chats INTEGER DEFAULT 3,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (username) REFERENCES users(username),
          UNIQUE(user_id),
          UNIQUE(username)
        )`
      },
      {
        name: 'Create staff_work_mode_history table',
        sql: `CREATE TABLE IF NOT EXISTS staff_work_mode_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          old_mode TEXT,
          new_mode TEXT NOT NULL,
          duration_minutes INTEGER,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (username) REFERENCES users(username)
        )`
      },
      {
        name: 'Create staff_work_mode_settings table',
        sql: `CREATE TABLE IF NOT EXISTS staff_work_mode_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          auto_assignment_enabled INTEGER DEFAULT 1,
          ready_mode_auto_accept INTEGER DEFAULT 1,
          work_mode_auto_accept INTEGER DEFAULT 0,
          ticketing_mode_auto_accept INTEGER DEFAULT 0,
          max_queue_time_minutes INTEGER DEFAULT 10,
          escalate_unassigned_chats INTEGER DEFAULT 1,
          break_timeout_minutes INTEGER DEFAULT 30,
          away_timeout_minutes INTEGER DEFAULT 60,
          work_mode_descriptions TEXT DEFAULT '{"ready": "Available for new chats", "work_mode": "Focused work - manual chat accept", "ticketing_mode": "Ticket work - no new chats", "away": "Not available", "break": "On break - return soon"}',
          updated_by TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'Create indexes for staff_work_modes',
        sql: `CREATE INDEX IF NOT EXISTS idx_staff_work_modes_username ON staff_work_modes(username)`
      },
      {
        name: 'Create indexes for staff_work_mode_history',
        sql: `CREATE INDEX IF NOT EXISTS idx_staff_work_mode_history_user ON staff_work_mode_history(username, changed_at)`
      },
      {
        name: 'Insert default work mode settings',
        sql: `INSERT OR IGNORE INTO staff_work_mode_settings (id) VALUES (1)`
      }
    ];

    let completedMigrations = 0;
    const totalMigrations = migrations.length;

    const runMigration = (index) => {
      if (index >= migrations.length) {
        db.close();
        resolve();
        return;
      }
      
      const migration = migrations[index];
      db.run(migration.sql, (err) => {
        if (err) {
          console.error(`❌ Error executing migration "${migration.name}":`, err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ Migration ${index + 1}/${totalMigrations}: ${migration.name}`);
        
        // Run next migration
        runMigration(index + 1);
      });
    };
    
    runMigration(0);
  });
};

// Run the migration
createStaffWorkModesTable()
  .then(() => {
    console.log('🎉 Staff work modes database tables created successfully!');
    console.log('📋 Tables created:');
    console.log('  - staff_work_modes (user work status)');
    console.log('  - staff_work_mode_history (mode change tracking)');
    console.log('  - staff_work_mode_settings (system configuration)');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to create staff work modes tables:', error);
    process.exit(1);
  });