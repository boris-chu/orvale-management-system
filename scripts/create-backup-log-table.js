/**
 * Create backup_log table for tracking database backups
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('📋 Connected to SQLite database');
});

const createBackupLogTable = `
CREATE TABLE IF NOT EXISTS backup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_size INTEGER,
  backup_type TEXT CHECK(backup_type IN ('manual', 'automatic')) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'system',
  status TEXT CHECK(status IN ('completed', 'failed', 'in_progress')) DEFAULT 'completed',
  error_message TEXT,
  restore_point BOOLEAN DEFAULT FALSE,
  retention_days INTEGER DEFAULT 30,
  UNIQUE(filename)
);
`;

db.run(createBackupLogTable, (err) => {
  if (err) {
    console.error('❌ Error creating backup_log table:', err.message);
  } else {
    console.log('✅ backup_log table created successfully');
    
    // Add an initial entry for the existing backup if it exists
    const fs = require('fs');
    const backupDir = path.join(__dirname, '..', 'backups');
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      const backupFiles = files.filter(f => f.endsWith('.db'));
      
      backupFiles.forEach(filename => {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        const createdAt = stats.birthtime.toISOString();
        
        db.run(
          `INSERT OR IGNORE INTO backup_log 
           (filename, file_size, backup_type, created_at, created_by, status) 
           VALUES (?, ?, 'manual', ?, 'system', 'completed')`,
          [filename, size, createdAt],
          (err) => {
            if (err) {
              console.warn('⚠️ Could not log existing backup:', filename);
            } else {
              console.log('📋 Logged existing backup:', filename);
            }
          }
        );
      });
    }
  }
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('📋 Database connection closed');
    }
  });
});