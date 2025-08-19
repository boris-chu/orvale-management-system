const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

// Create test user for maintenance testing
const testUser = {
  username: 'test.user',
  display_name: 'Test User Region 8',
  email: 'test.user@orvale.gov',
  password: 'test123',
  role: 'it_user', // Basic IT user role (no maintenance override)
  team_id: 'ITTS_Region8',
  section_id: 'ITD'
};

console.log('🔧 Adding test user for maintenance mode testing...');

// Hash the password
const hashedPassword = bcrypt.hashSync(testUser.password, 10);

// Insert the user
db.run(
  `INSERT OR REPLACE INTO users (username, display_name, email, password_hash, role, team_id, section_id) 
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [
    testUser.username,
    testUser.display_name, 
    testUser.email,
    hashedPassword,
    testUser.role,
    testUser.team_id,
    testUser.section_id
  ],
  function(err) {
    if (err) {
      console.error('❌ Error creating test user:', err);
    } else {
      console.log('✅ Test user created successfully!');
      console.log('');
      console.log('📋 Test User Details:');
      console.log(`   Username: ${testUser.username}`);
      console.log(`   Password: ${testUser.password}`);
      console.log(`   Team: ${testUser.team_id}`);
      console.log(`   Role: ${testUser.role} (basic IT permissions)`);
      console.log(`   No maintenance override: ✓`);
      console.log('');
      console.log('🧪 To test maintenance mode:');
      console.log('   1. Enable maintenance in Admin settings');
      console.log('   2. Log out of admin account');
      console.log(`   3. Log in as: ${testUser.username} / ${testUser.password}`);
      console.log('   4. Should see maintenance page');
    }
    db.close();
  }
);