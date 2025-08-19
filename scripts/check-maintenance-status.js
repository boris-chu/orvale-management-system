const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking maintenance status in database...\n');

// Check if system_settings table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'", (err, tables) => {
  if (err) {
    console.error('❌ Error checking tables:', err);
    return;
  }
  
  if (tables.length === 0) {
    console.log('❌ system_settings table does NOT exist!');
    console.log('   This explains why maintenance mode is not working.');
    db.close();
    return;
  }
  
  console.log('✅ system_settings table exists');
  
  // Check all settings in the table
  db.all("SELECT * FROM system_settings ORDER BY setting_key", (err, rows) => {
    if (err) {
      console.error('❌ Error reading settings:', err);
      db.close();
      return;
    }
    
    console.log(`📊 Found ${rows.length} settings in database:\n`);
    
    if (rows.length === 0) {
      console.log('❌ No settings found in system_settings table!');
      console.log('   Settings may not have been saved properly.');
    } else {
      rows.forEach(row => {
        console.log(`   ${row.setting_key}: ${row.setting_value}`);
        console.log(`   Updated by: ${row.updated_by} at ${row.updated_at}`);
        console.log('');
      });
      
      // Check specifically for maintenance settings
      const maintenanceEnabled = rows.find(r => r.setting_key === 'enableMaintenance');
      if (maintenanceEnabled) {
        const isEnabled = JSON.parse(maintenanceEnabled.setting_value);
        console.log(`🚨 Maintenance Mode Status: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
      } else {
        console.log('❌ enableMaintenance setting not found!');
      }
    }
    
    db.close();
  });
});