const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking portal_settings table...\n');

// Check if portal_settings table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='portal_settings'", (err, tables) => {
  if (err) {
    console.error('❌ Error checking tables:', err);
    return;
  }
  
  if (tables.length === 0) {
    console.log('ℹ️  portal_settings table does NOT exist');
    console.log('   This is expected - maintenance service will handle this gracefully.');
  } else {
    console.log('✅ portal_settings table exists');
    
    // Check portal settings
    db.all("SELECT * FROM portal_settings", (err, rows) => {
      if (err) {
        console.error('❌ Error reading portal settings:', err);
      } else {
        console.log(`📊 Found ${rows.length} portal settings:`);
        rows.forEach(row => {
          console.log(`   ${row.setting_key}: ${row.setting_value}`);
        });
      }
    });
  }
  
  db.close();
});