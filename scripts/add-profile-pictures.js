#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);

console.log('🖼️ Adding profile picture support to users table...');

db.serialize(() => {
  // Check if profile_picture column already exists
  db.all("PRAGMA table_info(users)", (err, tableInfo) => {
    if (err) {
      console.error('❌ Error checking table info:', err);
      process.exit(1);
    }
    
    const hasProfilePicture = tableInfo.some(column => column.name === 'profile_picture');
    
    if (!hasProfilePicture) {
      // Add profile_picture column to users table
      db.run(`ALTER TABLE users ADD COLUMN profile_picture TEXT`, (err) => {
        if (err) {
          console.error('❌ Error adding profile_picture column:', err);
          process.exit(1);
        }
        console.log('✅ Added profile_picture column to users table');
        
        // Create profile_pictures directory if it doesn't exist
        const profilePicsDir = path.join(__dirname, '..', 'public', 'profile-pictures');
        
        if (!fs.existsSync(profilePicsDir)) {
          fs.mkdirSync(profilePicsDir, { recursive: true });
          console.log('✅ Created profile-pictures directory');
        }

        // Create .gitkeep file to keep directory in git
        const gitkeepPath = path.join(profilePicsDir, '.gitkeep');
        if (!fs.existsSync(gitkeepPath)) {
          fs.writeFileSync(gitkeepPath, '');
          console.log('✅ Added .gitkeep file');
        }

        console.log('🎉 Profile picture support added successfully!');
        db.close();
      });
    } else {
      console.log('ℹ️ profile_picture column already exists');
      
      // Still create directories if they don't exist
      const profilePicsDir = path.join(__dirname, '..', 'public', 'profile-pictures');
      
      if (!fs.existsSync(profilePicsDir)) {
        fs.mkdirSync(profilePicsDir, { recursive: true });
        console.log('✅ Created profile-pictures directory');
      }

      const gitkeepPath = path.join(profilePicsDir, '.gitkeep');
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '');
        console.log('✅ Added .gitkeep file');
      }
      
      console.log('🎉 Profile picture directories ready!');
      db.close();
    }
  });
});