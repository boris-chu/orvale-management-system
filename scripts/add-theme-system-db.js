#!/usr/bin/env node

/**
 * Database Migration: Add Theme System Tables and Columns
 * Creates user_theme_preferences, theme_usage_analytics, user_theme_change_log tables
 * Adds theme-related columns to chat_ui_settings
 */

const Database = require('sqlite3').Database;
const path = require('path');

const dbPath = path.join(__dirname, '..', 'orvale_tickets.db');
const db = new Database(dbPath);

console.log('🎨 Adding Chat Theme System database schema...');

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON;');

const migrations = [
  // 0. Create chat_ui_settings table if it doesn't exist
  {
    name: 'Create chat_ui_settings table',
    sql: `
      CREATE TABLE IF NOT EXISTS chat_ui_settings (
        id INTEGER PRIMARY KEY,
        chat_system_enabled BOOLEAN DEFAULT TRUE,
        widget_enabled BOOLEAN DEFAULT FALSE,
        widget_position TEXT DEFAULT 'bottom-right',
        widget_shape TEXT DEFAULT 'rounded-square',
        widget_primary_color TEXT DEFAULT '#1976d2',
        widget_secondary_color TEXT DEFAULT '#6c757d',
        widget_theme TEXT DEFAULT 'light',
        notification_sounds_enabled BOOLEAN DEFAULT TRUE,
        read_receipts_enabled BOOLEAN DEFAULT TRUE,
        file_sharing_enabled BOOLEAN DEFAULT TRUE,
        gif_picker_enabled BOOLEAN DEFAULT TRUE,
        show_unread_badges BOOLEAN DEFAULT TRUE,
        unread_badge_color TEXT DEFAULT '#dc3545',
        unread_badge_text_color TEXT DEFAULT '#ffffff',
        unread_badge_style TEXT DEFAULT 'rounded',
        unread_badge_position TEXT DEFAULT 'right',
        show_zero_counts BOOLEAN DEFAULT FALSE,
        show_channel_member_count BOOLEAN DEFAULT FALSE,
        show_typing_indicators BOOLEAN DEFAULT TRUE,
        show_online_status BOOLEAN DEFAULT TRUE,
        message_grouping_enabled BOOLEAN DEFAULT TRUE,
        timestamp_format TEXT DEFAULT 'relative',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  
  // 1. Add theme columns to chat_ui_settings table
  {
    name: 'Add theme columns to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN theme_preset TEXT DEFAULT 'light';
    `
  },
  {
    name: 'Add custom theme JSON to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN custom_theme_json TEXT DEFAULT '{}';
    `
  },
  {
    name: 'Add public queue theme columns to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN public_queue_theme_preset TEXT DEFAULT 'light';
    `
  },
  {
    name: 'Add public queue custom theme JSON to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN public_queue_custom_theme_json TEXT DEFAULT '{}';
    `
  },
  {
    name: 'Add user customization policy to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN allow_user_customization BOOLEAN DEFAULT TRUE;
    `
  },
  {
    name: 'Add available themes JSON to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN available_themes_json TEXT DEFAULT '["light","iphone","darcula","github","slack"]';
    `
  },
  {
    name: 'Add force theme compliance to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN force_theme_compliance BOOLEAN DEFAULT FALSE;
    `
  },
  {
    name: 'Add theme change frequency limit to chat_ui_settings',
    sql: `
      ALTER TABLE chat_ui_settings ADD COLUMN theme_change_frequency_limit TEXT DEFAULT 'daily';
    `
  },

  // 2. Create user_theme_preferences table
  {
    name: 'Create user_theme_preferences table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_theme_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        
        -- User theme selections
        internal_chat_theme TEXT DEFAULT 'inherit',
        public_queue_theme TEXT DEFAULT 'inherit',
        custom_theme_json TEXT DEFAULT '{}',
        
        -- User accessibility settings
        high_contrast_mode BOOLEAN DEFAULT FALSE,
        reduce_animations BOOLEAN DEFAULT FALSE,
        font_size_multiplier REAL DEFAULT 1.0,
        
        -- Rate limiting and analytics
        last_theme_change TIMESTAMP DEFAULT NULL,
        theme_change_count INTEGER DEFAULT 0,
        
        -- Device/session preferences
        device_fingerprint TEXT DEFAULT NULL,
        sync_across_sessions BOOLEAN DEFAULT TRUE,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (username) REFERENCES users(username),
        UNIQUE(username)
      );
    `
  },

  // 3. Create theme_usage_analytics table
  {
    name: 'Create theme_usage_analytics table',
    sql: `
      CREATE TABLE IF NOT EXISTS theme_usage_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme_type TEXT CHECK(theme_type IN ('preset', 'custom', 'admin_default')) NOT NULL,
        theme_name TEXT NOT NULL,
        interface_type TEXT CHECK(interface_type IN ('internal_chat', 'public_queue')) NOT NULL,
        user_count INTEGER DEFAULT 0,
        active_sessions INTEGER DEFAULT 0,
        switch_count INTEGER DEFAULT 0,
        total_usage_minutes INTEGER DEFAULT 0,
        usage_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(theme_name, interface_type, usage_date)
      );
    `
  },

  // 4. Create user_theme_change_log table
  {
    name: 'Create user_theme_change_log table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_theme_change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        old_theme TEXT,
        new_theme TEXT,
        interface_type TEXT CHECK(interface_type IN ('internal_chat', 'public_queue')) NOT NULL,
        change_reason TEXT DEFAULT 'user_preference',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username)
      );
    `
  },

  // 5. Create indexes for performance
  {
    name: 'Create theme system indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_username 
      ON user_theme_preferences(username);
    `
  },
  {
    name: 'Create theme analytics index',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_theme_usage_analytics_date 
      ON theme_usage_analytics(usage_date, theme_name);
    `
  },
  {
    name: 'Create theme change log index',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_user_theme_change_log_username_date 
      ON user_theme_change_log(username, created_at);
    `
  }
];

// Execute migrations
async function runMigration(migration, index) {
  return new Promise((resolve, reject) => {
    console.log(`${index + 1}/${migrations.length}: ${migration.name}...`);
    
    db.run(migration.sql, function(err) {
      if (err) {
        // Check if error is "duplicate column" (expected for some migrations)
        if (err.message.includes('duplicate column name')) {
          console.log(`   ⚠️  Column already exists (skipping)`);
          resolve();
        } else {
          console.error(`   ❌ Error: ${err.message}`);
          reject(err);
        }
      } else {
        console.log(`   ✅ Success`);
        resolve();
      }
    });
  });
}

async function runAllMigrations() {
  try {
    for (let i = 0; i < migrations.length; i++) {
      await runMigration(migrations[i], i);
    }
    
    console.log('\n🎉 Theme System database schema added successfully!');
    console.log('\nNew tables created:');
    console.log('• user_theme_preferences - User theme selections and accessibility settings');
    console.log('• theme_usage_analytics - Theme popularity and usage statistics');
    console.log('• user_theme_change_log - Audit trail of theme changes');
    console.log('\nColumns added to chat_ui_settings:');
    console.log('• Theme preset settings (internal_chat and public_queue)');
    console.log('• Custom theme JSON storage');
    console.log('• User customization policy controls');
    console.log('• Available themes configuration');
    
    // Insert default theme settings if chat_ui_settings is empty
    db.get('SELECT COUNT(*) as count FROM chat_ui_settings', (err, row) => {
      if (!err && row.count === 0) {
        console.log('\n🔧 Initializing default theme settings...');
        db.run(`
          INSERT INTO chat_ui_settings (
            id, theme_preset, public_queue_theme_preset,
            allow_user_customization, available_themes_json,
            force_theme_compliance, theme_change_frequency_limit
          ) VALUES (1, 'light', 'light', 1, '["light","iphone","darcula","github","slack"]', 0, 'daily')
        `, (insertErr) => {
          if (!insertErr) {
            console.log('   ✅ Default theme settings initialized');
          }
          db.close();
        });
      } else {
        db.close();
      }
    });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    db.close();
    process.exit(1);
  }
}

// Check if database exists
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found:', dbPath);
  console.error('Please run the main application first to create the database.');
  process.exit(1);
}

console.log('📁 Database path:', dbPath);
runAllMigrations();