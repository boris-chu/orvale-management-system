#!/usr/bin/env node

/**
 * Add Enhanced Session Recovery Settings Table
 * Creates table for configurable session recovery and staff disconnect handling
 * Run: node scripts/add-recovery-settings-table.js
 */

const Database = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new Database.Database(dbPath);

console.log('🔄 Adding Enhanced Session Recovery Settings Table...\n');

async function addRecoverySettingsTable() {
  try {
    console.log('📋 Creating recovery settings table...\n');
    
    // Create the recovery settings table
    await new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS public_portal_recovery_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          
          -- Auto-requeue settings
          auto_requeue_enabled INTEGER DEFAULT 1,
          requeue_position TEXT DEFAULT 'priority_boost' CHECK(requeue_position IN ('front', 'priority_boost', 'original', 'end')),
          priority_boost_amount INTEGER DEFAULT 1 CHECK(priority_boost_amount >= 0 AND priority_boost_amount <= 3),
          
          -- Staff disconnect settings
          staff_disconnect_timeout INTEGER DEFAULT 30,
          grace_period_seconds INTEGER DEFAULT 60,
          auto_reassign_after_seconds INTEGER DEFAULT 120,
          
          -- Guest notification settings
          notify_guest_on_staff_disconnect INTEGER DEFAULT 1,
          staff_disconnect_message TEXT DEFAULT 'Your support agent has been disconnected. We are connecting you with another agent.',
          reassignment_message TEXT DEFAULT 'You have been connected with a new support agent.',
          
          -- Priority escalation
          escalate_on_multiple_disconnects INTEGER DEFAULT 1,
          max_disconnects_before_escalation INTEGER DEFAULT 2,
          escalation_priority TEXT DEFAULT 'urgent' CHECK(escalation_priority IN ('urgent', 'vip')),
          
          -- Abandon detection
          guest_inactivity_timeout INTEGER DEFAULT 10,
          auto_end_abandoned_sessions INTEGER DEFAULT 1,
          
          -- Audit fields
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_by TEXT
        )
      `;
      
      db.run(sql, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Created public_portal_recovery_settings table');
          resolve();
        }
      });
    });

    // Insert default settings
    await new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO public_portal_recovery_settings (
          id,
          auto_requeue_enabled,
          requeue_position,
          priority_boost_amount,
          staff_disconnect_timeout,
          grace_period_seconds,
          auto_reassign_after_seconds,
          notify_guest_on_staff_disconnect,
          staff_disconnect_message,
          reassignment_message,
          escalate_on_multiple_disconnects,
          max_disconnects_before_escalation,
          escalation_priority,
          guest_inactivity_timeout,
          auto_end_abandoned_sessions,
          updated_by
        ) VALUES (
          1,
          1,
          'priority_boost',
          1,
          30,
          60,
          120,
          1,
          'Your support agent has been disconnected. We are connecting you with another agent.',
          'You have been connected with a new support agent.',
          1,
          2,
          'urgent',
          10,
          1,
          'system'
        )
      `;
      
      db.run(sql, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Inserted default recovery settings');
          resolve();
        }
      });
    });

    // Create session recovery log table
    await new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS public_portal_recovery_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          staff_id TEXT NOT NULL,
          event_type TEXT NOT NULL CHECK(event_type IN ('disconnect', 'reconnect', 'requeue', 'escalate', 'abandon', 'recover')),
          event_details TEXT, -- JSON field
          original_priority TEXT,
          new_priority TEXT,
          queue_position_before INTEGER,
          queue_position_after INTEGER,
          reconnect_attempts INTEGER DEFAULT 0,
          disconnect_reason TEXT,
          recovery_success INTEGER DEFAULT 0,
          recovery_duration_seconds INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id)
        )
      `;
      
      db.run(sql, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Created public_portal_recovery_log table');
          resolve();
        }
      });
    });

    // Create indexes for recovery log
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_recovery_log_session ON public_portal_recovery_log(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_recovery_log_staff ON public_portal_recovery_log(staff_id)',
      'CREATE INDEX IF NOT EXISTS idx_recovery_log_event_type ON public_portal_recovery_log(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_recovery_log_timestamp ON public_portal_recovery_log(timestamp)'
    ];

    for (const indexSql of indexes) {
      await new Promise((resolve, reject) => {
        db.run(indexSql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    console.log('✅ Created recovery log indexes');

    // Add staff disconnect tracking table
    await new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS public_portal_staff_disconnects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id TEXT NOT NULL,
          disconnect_time TIMESTAMP NOT NULL,
          reconnect_time TIMESTAMP,
          disconnect_reason TEXT CHECK(disconnect_reason IN ('network', 'browser_close', 'timeout', 'manual')),
          active_sessions_count INTEGER DEFAULT 0,
          sessions_affected TEXT, -- JSON array of session IDs
          recovery_success_rate REAL DEFAULT 0.0,
          total_recovery_time_seconds INTEGER DEFAULT 0,
          disconnect_duration_seconds INTEGER,
          resolved INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      db.run(sql, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Created public_portal_staff_disconnects table');
          resolve();
        }
      });
    });

    console.log('\n🎉 Enhanced Session Recovery System database setup complete!');
    console.log('\n📊 New Features Available:');
    console.log('   • Configurable auto-requeue positions (front, priority boost, original, end)');
    console.log('   • Staff disconnect timeout and grace period settings');
    console.log('   • Priority boost system (normal → high → urgent → vip)');
    console.log('   • Multiple disconnect escalation to supervisors');
    console.log('   • Automatic session abandonment detection');
    console.log('   • Comprehensive recovery event logging');
    console.log('   • Staff disconnect pattern analysis');
    console.log('   • Real-time recovery status monitoring');
    
    console.log('\n⚙️ Default Settings:');
    console.log('   • Auto-requeue: Enabled with priority boost');
    console.log('   • Staff disconnect timeout: 30 seconds');
    console.log('   • Grace period for reconnection: 60 seconds');
    console.log('   • Auto-reassignment timeout: 120 seconds');
    console.log('   • Priority boost amount: +1 level');
    console.log('   • Escalation after: 2 disconnects');
    console.log('   • Guest inactivity timeout: 10 minutes');
    
    console.log('\n🎛️ Admin Controls Available:');
    console.log('   • Configure all timeout and grace period settings');
    console.log('   • Customize guest notification messages');
    console.log('   • Set escalation thresholds and priorities');
    console.log('   • Enable/disable auto-requeue and abandonment detection');
    console.log('   • Choose requeue positioning strategy');
    
  } catch (error) {
    console.error('\n💥 Error setting up recovery system:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

addRecoverySettingsTable();