const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Debug: What maintenance service is querying...\n');

// Query exactly what the maintenance service queries
const systemQuery = `
  SELECT setting_key, setting_value 
  FROM system_settings 
  WHERE setting_key IN (
    'enableMaintenance', 
    'maintenanceMessage', 
    'maintenance_theme',
    'estimated_return_time',
    'emergency_contact',
    'admin_override_enabled'
  )
`;

console.log('📋 System maintenance query:');
console.log(systemQuery);
console.log('\n📊 Results:');

db.all(systemQuery, (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${rows.length} rows:`);
  rows.forEach(row => {
    console.log(`   ${row.setting_key}: ${row.setting_value}`);
    
    if (row.setting_key === 'enableMaintenance') {
      try {
        const parsed = JSON.parse(row.setting_value);
        console.log(`   ^^^ Parsed value: ${parsed} (type: ${typeof parsed})`);
      } catch (e) {
        console.log(`   ^^^ Parse error: ${e.message}`);
      }
    }
  });
  
  // Also check what enableMaintenance setting exists
  console.log('\n🔍 All enableMaintenance related settings:');
  db.all("SELECT * FROM system_settings WHERE setting_key LIKE '%aintenance%'", (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
    } else {
      rows.forEach(row => {
        console.log(`   ${row.setting_key}: ${row.setting_value}`);
      });
    }
    db.close();
  });
});