const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Testing maintenance logic exactly like the service...\n');

async function testMaintenanceLogic() {
  return new Promise((resolve, reject) => {
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

    db.all(systemQuery, (err, settingsRows) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('📊 Raw query results:', settingsRows);

      // Replicate the parseMaintenanceSettings logic
      const settings = {};
      
      // Convert rows to key-value object (exactly like the service)
      settingsRows.forEach(row => {
        try {
          settings[row.setting_key] = JSON.parse(row.setting_value);
          console.log(`   Parsed ${row.setting_key}: ${settings[row.setting_key]} (type: ${typeof settings[row.setting_key]})`);
        } catch (e) {
          settings[row.setting_key] = row.setting_value;
          console.log(`   Failed to parse ${row.setting_key}, using raw: ${settings[row.setting_key]}`);
        }
      });

      console.log('\n🔍 Final settings object:', settings);

      // Check if maintenance is enabled (exactly like the service)
      const enabledKey = 'enableMaintenance'; // type === 'system'
      const enabledValue = settings[enabledKey];
      const enabled = enabledValue === true;
      
      console.log(`\n🎯 Key logic check:`);
      console.log(`   enabledKey: ${enabledKey}`);
      console.log(`   enabledValue: ${enabledValue}`);
      console.log(`   typeof enabledValue: ${typeof enabledValue}`);
      console.log(`   enabledValue === true: ${enabledValue === true}`);
      console.log(`   Final enabled result: ${enabled}`);

      if (enabled) {
        console.log('\n✅ Logic would return enabled: true');
      } else {
        console.log('\n❌ Logic would return enabled: false');
        console.log('   This explains why maintenance mode is not working!');
      }

      db.close();
      resolve(enabled);
    });
  });
}

testMaintenanceLogic().catch(console.error);