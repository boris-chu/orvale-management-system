const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding log_level column to system_settings table...');

// Add log_level column to system_settings table
db.run(`ALTER TABLE system_settings ADD COLUMN log_level TEXT DEFAULT 'info'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Error adding log_level column:', err);
        db.close();
        return;
    }
    
    console.log('✅ Added log_level column to system_settings');
    
    // Update existing record if it exists
    db.run(`UPDATE system_settings SET log_level = 'info' WHERE id = 1 AND log_level IS NULL`, (updateErr) => {
        if (updateErr) {
            console.error('❌ Error updating default log level:', updateErr);
        } else {
            console.log('✅ Updated default log level to "info"');
        }
        
        // Verify the column was added
        db.get(`SELECT log_level FROM system_settings WHERE id = 1`, (selectErr, row) => {
            if (selectErr) {
                console.error('❌ Error verifying log_level column:', selectErr);
            } else if (row) {
                console.log(`✅ Verified log_level setting: ${row.log_level}`);
            } else {
                console.log('ℹ️  No existing system_settings record found');
            }
            
            console.log('\n🎉 Log level integration ready!');
            console.log('📊 The Advanced tab Log Level setting will now control actual logging behavior.');
            db.close();
        });
    });
});