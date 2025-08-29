#!/usr/bin/env node

/**
 * Public Portal Live Chat Database Migration
 * Creates all necessary tables for the public portal chat system
 * Run: node scripts/create-public-portal-database.js
 */

const Database = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new Database.Database(dbPath);

console.log('🗄️  Creating Public Portal Live Chat Database Tables...\n');

const migrations = [
  {
    name: 'Create public_chat_sessions table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        visitor_name TEXT,
        visitor_email TEXT,
        visitor_department TEXT,
        visitor_phone TEXT,
        session_data TEXT DEFAULT '{}', -- JSON: pre-chat answers, browser info
        
        -- Enhanced Status Management
        status TEXT CHECK(status IN ('waiting', 'active', 'ended', 'abandoned', 'staff_disconnected', 'priority_requeued')) DEFAULT 'waiting',
        priority_level TEXT CHECK(priority_level IN ('normal', 'high', 'urgent', 'vip')) DEFAULT 'normal',
        priority_reason TEXT, -- Why was this marked as priority (staff_disconnect, vip_customer, etc.)
        
        -- Staff Assignment
        assigned_to TEXT, -- Current staff member
        previously_assigned_to TEXT, -- Previous staff (for disconnect tracking)
        assignment_history TEXT DEFAULT '[]', -- JSON array of assignment history
        
        -- Queue Management
        queue_position INTEGER,
        original_queue_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        priority_boosted_at TIMESTAMP,
        
        -- Session Recovery
        recovery_token TEXT,
        recovery_expires_at TIMESTAMP,
        staff_disconnect_count INTEGER DEFAULT 0,
        guest_disconnect_count INTEGER DEFAULT 0,
        
        -- Connection Status Tracking
        guest_last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        staff_last_seen TIMESTAMP,
        connection_status TEXT CHECK(connection_status IN ('connected', 'disconnected', 'recovering')) DEFAULT 'connected',
        
        -- Auto-Assignment
        auto_assigned BOOLEAN DEFAULT FALSE,
        assignment_attempts INTEGER DEFAULT 0,
        
        -- Ticket Integration
        ticket_created TEXT, -- Link to auto-created ticket
        auto_ticket_eligible BOOLEAN DEFAULT TRUE,
        
        -- Performance Metrics
        first_response_time INTEGER, -- Seconds until staff first responded
        resolution_time INTEGER, -- Total session duration
        customer_wait_time INTEGER, -- Time spent waiting in queue
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_at TIMESTAMP,
        first_response_at TIMESTAMP, -- When staff first responded
        ended_at TIMESTAMP,
        total_wait_time INTEGER, -- Seconds
        total_chat_duration INTEGER, -- Seconds
        
        FOREIGN KEY (assigned_to) REFERENCES users(username),
        FOREIGN KEY (previously_assigned_to) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Create public_chat_messages table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        sender_type TEXT CHECK(sender_type IN ('guest', 'staff', 'system')) NOT NULL,
        sender_id TEXT, -- staff username, null for guest
        sender_name TEXT NOT NULL, -- Display name
        message_text TEXT NOT NULL,
        message_type TEXT CHECK(message_type IN ('text', 'file', 'system', 'ticket_link', 'transfer_notice')) DEFAULT 'text',
        
        -- File/Attachment Data
        file_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        file_type TEXT,
        
        -- Message Status Tracking
        message_status TEXT CHECK(message_status IN ('sending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'sending',
        delivered_at TIMESTAMP,
        read_at TIMESTAMP,
        
        -- Message Metadata
        is_internal_note BOOLEAN DEFAULT FALSE, -- Staff-only internal notes
        reply_to_message_id INTEGER, -- For threading
        edited_at TIMESTAMP,
        edited_by TEXT,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
        FOREIGN KEY (sender_id) REFERENCES users(username),
        FOREIGN KEY (reply_to_message_id) REFERENCES public_chat_messages(id)
      );
    `
  },
  
  {
    name: 'Create public_portal_widget_settings table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_portal_widget_settings (
        id INTEGER PRIMARY KEY,
        
        -- Master Control
        enabled BOOLEAN DEFAULT FALSE,
        
        -- Business Hours
        business_hours_enabled BOOLEAN DEFAULT TRUE,
        timezone TEXT DEFAULT 'America/New_York',
        schedule_json TEXT DEFAULT '{}', -- JSON of weekly schedule
        holidays_json TEXT DEFAULT '[]', -- JSON array of holidays
        
        -- Widget Appearance
        widget_shape TEXT CHECK(widget_shape IN ('circle', 'square', 'rounded')) DEFAULT 'circle',
        widget_color TEXT DEFAULT '#1976d2',
        widget_size TEXT CHECK(widget_size IN ('small', 'medium', 'large')) DEFAULT 'medium',
        widget_position TEXT CHECK(widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')) DEFAULT 'bottom-right',
        widget_image TEXT, -- URL to logo/avatar
        widget_text TEXT DEFAULT 'Chat with us',
        
        -- Animation Settings
        widget_animation TEXT CHECK(widget_animation IN ('none', 'bounce', 'pulse', 'shake', 'glow', 'slide-in', 'rotation')) DEFAULT 'pulse',
        animation_duration INTEGER DEFAULT 2000, -- milliseconds
        animation_delay INTEGER DEFAULT 5000, -- milliseconds before starting
        
        -- Messages (customizable by admin)
        welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
        offline_message TEXT DEFAULT 'We are currently offline. Please submit a ticket.',
        business_hours_message TEXT DEFAULT 'Live chat available Monday-Friday, 7:00 AM - 6:00 PM EST.',
        queue_message TEXT DEFAULT 'You are in queue. Please wait for the next available agent.',
        staff_disconnect_message TEXT DEFAULT 'Your support agent has been disconnected. We are connecting you with another agent.',
        
        -- Pre-chat Form Settings
        require_name BOOLEAN DEFAULT TRUE,
        require_email BOOLEAN DEFAULT TRUE,
        require_phone BOOLEAN DEFAULT FALSE,
        require_department BOOLEAN DEFAULT FALSE,
        custom_fields_json TEXT DEFAULT '[]', -- JSON array of custom form fields
        
        -- Functionality Toggles
        show_agent_typing BOOLEAN DEFAULT TRUE,
        show_queue_position BOOLEAN DEFAULT TRUE,
        enable_file_uploads BOOLEAN DEFAULT TRUE,
        enable_screenshot_sharing BOOLEAN DEFAULT FALSE,
        max_file_size_mb INTEGER DEFAULT 5,
        allowed_file_types_json TEXT DEFAULT '["image/*", "application/pdf", "text/plain"]',
        
        -- Typing Detection Settings
        typing_indicators_enabled BOOLEAN DEFAULT TRUE,
        typing_timeout_seconds INTEGER DEFAULT 3,
        show_staff_typing_to_guests BOOLEAN DEFAULT TRUE,
        show_guest_typing_to_staff BOOLEAN DEFAULT TRUE,
        typing_indicator_text TEXT DEFAULT 'is typing...',
        typing_indicator_style TEXT DEFAULT 'dots', -- 'dots', 'text', 'pulse'
        
        -- Read Receipts Settings
        read_receipts_enabled BOOLEAN DEFAULT TRUE,
        show_delivery_status BOOLEAN DEFAULT TRUE,
        show_guest_read_status_to_staff BOOLEAN DEFAULT TRUE,
        show_staff_read_status_to_guests BOOLEAN DEFAULT FALSE, -- Privacy consideration
        read_receipt_style TEXT DEFAULT 'checkmarks', -- 'checkmarks', 'timestamps', 'both'
        delivery_status_icons TEXT DEFAULT '{"sent":"✓","delivered":"✓✓","read":"✓✓"}', -- JSON
        
        -- Page Visibility
        enabled_pages TEXT DEFAULT '[]', -- JSON array of page paths where widget should appear
        disabled_pages TEXT DEFAULT '[]', -- JSON array of page paths where widget should NOT appear
        
        -- Session & Recovery
        session_recovery_enabled BOOLEAN DEFAULT TRUE,
        session_recovery_minutes INTEGER DEFAULT 5,
        auto_ticket_creation BOOLEAN DEFAULT TRUE,
        
        -- Metadata
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Insert default public portal widget settings',
    sql: `
      INSERT OR IGNORE INTO public_portal_widget_settings (
        id, enabled, welcome_message, offline_message, business_hours_message, 
        schedule_json, updated_by
      ) VALUES (
        1, FALSE, 
        'Hi! How can we help you today?',
        'We are currently offline (7:00 AM - 6:00 PM EST). Please submit a ticket.',
        'Live chat is available Monday-Friday, 7:00 AM - 6:00 PM EST.',
        '{"monday":{"open":"07:00","close":"18:00","enabled":true},"tuesday":{"open":"07:00","close":"18:00","enabled":true},"wednesday":{"open":"07:00","close":"18:00","enabled":true},"thursday":{"open":"07:00","close":"18:00","enabled":true},"friday":{"open":"07:00","close":"18:00","enabled":true},"saturday":{"open":"09:00","close":"17:00","enabled":false},"sunday":{"open":"09:00","close":"17:00","enabled":false}}',
        'system'
      );
    `
  },
  
  {
    name: 'Create public_chat_session_ratings table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_chat_session_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
        comment TEXT, -- Optional feedback comment
        rating_categories TEXT DEFAULT '{}', -- JSON: {helpfulness: 5, speed: 4, knowledge: 5}
        
        -- Fraud Prevention
        browser_fingerprint TEXT,
        ip_address TEXT,
        user_agent TEXT,
        
        -- Staff Information
        staff_username TEXT, -- Who was rated
        staff_performance_impact BOOLEAN DEFAULT TRUE, -- Whether this affects staff metrics
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
        FOREIGN KEY (staff_username) REFERENCES users(username),
        UNIQUE(session_id) -- One rating per session for fraud prevention
      );
    `
  },
  
  {
    name: 'Create staff_work_modes table',
    sql: `
      CREATE TABLE IF NOT EXISTS staff_work_modes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        current_mode TEXT CHECK(current_mode IN ('ready', 'work_mode', 'ticketing_mode', 'offline')) DEFAULT 'offline',
        auto_assign_enabled BOOLEAN DEFAULT TRUE,
        max_concurrent_chats INTEGER DEFAULT 3,
        
        -- Status Tracking
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mode_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        mode_changed_by TEXT, -- Who changed it (self or admin)
        mode_change_reason TEXT, -- Manual, auto-timeout, admin override
        
        -- Performance Settings
        accept_vip_chats BOOLEAN DEFAULT TRUE,
        accept_escalated_chats BOOLEAN DEFAULT TRUE,
        preferred_departments TEXT DEFAULT '[]', -- JSON array of departments
        
        -- Auto-Mode Management
        auto_offline_after_minutes INTEGER DEFAULT 30, -- Auto switch to offline after inactivity
        work_mode_timeout_enabled BOOLEAN DEFAULT TRUE,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
        FOREIGN KEY (mode_changed_by) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Create staff_work_mode_history table',
    sql: `
      CREATE TABLE IF NOT EXISTS staff_work_mode_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        old_mode TEXT,
        new_mode TEXT,
        changed_by TEXT, -- Who changed it (self or admin)
        reason TEXT, -- Manual change, auto-timeout, admin override, etc.
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username),
        FOREIGN KEY (changed_by) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Create public_chat_session_events table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_chat_session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL, -- 'staff_connect', 'staff_disconnect', 'guest_disconnect', 'requeued', 'priority_boost', 'assignment', 'transfer'
        event_data TEXT DEFAULT '{}', -- JSON with event details
        staff_username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
        FOREIGN KEY (staff_username) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Create public_chat_typing_status table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_chat_typing_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_type TEXT CHECK(user_type IN ('guest', 'staff')) NOT NULL,
        user_id TEXT, -- staff username or guest session ID
        is_typing BOOLEAN DEFAULT FALSE,
        started_typing_at TIMESTAMP,
        last_typing_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP, -- Auto-expire typing status
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
        UNIQUE(session_id, user_type, user_id) -- One typing status per user per session
      );
    `
  },
  
  {
    name: 'Create public_chat_read_receipts table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_chat_read_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        reader_type TEXT CHECK(reader_type IN ('guest', 'staff')) NOT NULL,
        reader_id TEXT, -- staff username or 'guest'
        status TEXT CHECK(status IN ('sent', 'delivered', 'read')) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT, -- For guest tracking
        user_agent TEXT, -- For guest tracking
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
        FOREIGN KEY (message_id) REFERENCES public_chat_messages(id),
        UNIQUE(session_id, message_id, reader_type, reader_id) -- One receipt per reader per message
      );
    `
  },
  
  {
    name: 'Create public_queue_theme_settings table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_queue_theme_settings (
        id INTEGER PRIMARY KEY,
        
        -- Custom Color Picker Values
        primary_color TEXT DEFAULT '#e57373',           -- Soft red primary
        secondary_color TEXT DEFAULT '#ffcdd2',         -- Light red background  
        accent_color TEXT DEFAULT '#d32f2f',            -- Dark red for actions
        sidebar_color TEXT DEFAULT '#fce4ec',           -- Pink sidebar background
        header_color TEXT DEFAULT '#f48fb1',            -- Header background
        text_primary_color TEXT DEFAULT '#212121',      -- Primary text
        text_secondary_color TEXT DEFAULT '#757575',    -- Secondary text
        border_color TEXT DEFAULT '#f8bbd9',            -- Border color
        success_color TEXT DEFAULT '#4caf50',           -- Success messages
        warning_color TEXT DEFAULT '#ff9800',           -- Warning messages
        error_color TEXT DEFAULT '#f44336',             -- Error messages
        
        -- Layout Settings
        border_radius TEXT DEFAULT '8px',
        font_family TEXT DEFAULT 'Inter, system-ui, sans-serif',
        font_size_base TEXT DEFAULT '14px',
        compact_mode BOOLEAN DEFAULT FALSE,
        
        -- Badge and Status Colors
        priority_high_color TEXT DEFAULT '#f44336',     -- High priority badge
        priority_urgent_color TEXT DEFAULT '#e91e63',   -- Urgent priority badge
        priority_normal_color TEXT DEFAULT '#2196f3',   -- Normal priority badge
        abandoned_badge_color TEXT DEFAULT '#ff5722',   -- Abandoned session badge
        dropped_badge_color TEXT DEFAULT '#ff9800',     -- Dropped connection badge
        
        -- Metadata
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Insert default public queue theme settings',
    sql: `
      INSERT OR IGNORE INTO public_queue_theme_settings (
        id, primary_color, secondary_color, accent_color, sidebar_color,
        updated_by
      ) VALUES (
        1, '#e57373', '#ffcdd2', '#d32f2f', '#fce4ec', 'system'
      );
    `
  },
  
  {
    name: 'Create public_queue_management_settings table',
    sql: `
      CREATE TABLE IF NOT EXISTS public_queue_management_settings (
        id INTEGER PRIMARY KEY,
        
        -- Auto-Assignment Settings
        auto_assign_enabled BOOLEAN DEFAULT TRUE,
        max_concurrent_per_staff INTEGER DEFAULT 3,
        assignment_timeout_seconds INTEGER DEFAULT 30, -- How long to wait for staff to accept
        priority_boost_on_disconnect BOOLEAN DEFAULT TRUE,
        priority_boost_level TEXT DEFAULT 'high', -- normal -> high, high -> urgent
        
        -- Staff Disconnect Handling
        staff_disconnect_timeout_seconds INTEGER DEFAULT 60, -- How long to wait before considering disconnected
        auto_requeue_on_staff_disconnect BOOLEAN DEFAULT TRUE,
        preserve_chat_history BOOLEAN DEFAULT TRUE,
        notify_guest_of_staff_disconnect BOOLEAN DEFAULT TRUE,
        staff_disconnect_message TEXT DEFAULT 'Your support agent has been disconnected. We are connecting you with another agent.',
        
        -- Queue Management
        queue_refresh_interval_seconds INTEGER DEFAULT 5,
        max_queue_size INTEGER DEFAULT 100,
        estimated_wait_time_enabled BOOLEAN DEFAULT TRUE,
        average_chat_duration_minutes INTEGER DEFAULT 15, -- For wait time calculations
        
        -- Work Mode Settings
        work_mode_auto_timeout_minutes INTEGER DEFAULT 30, -- Auto switch to offline after inactivity
        ready_mode_description TEXT DEFAULT 'Available to receive new chat assignments',
        work_mode_description TEXT DEFAULT 'Handling active chat sessions',
        ticketing_mode_description TEXT DEFAULT 'Working on tickets, not available for new chats',
        
        -- Notification Settings
        sound_notifications_enabled BOOLEAN DEFAULT TRUE,
        desktop_notifications_enabled BOOLEAN DEFAULT TRUE,
        new_chat_notification_sound TEXT DEFAULT '/sounds/new_chat.wav',
        chat_message_notification_sound TEXT DEFAULT '/sounds/message.wav',
        
        -- Metadata
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(username)
      );
    `
  },
  
  {
    name: 'Insert default public queue management settings',
    sql: `
      INSERT OR IGNORE INTO public_queue_management_settings (
        id, auto_assign_enabled, max_concurrent_per_staff, assignment_timeout_seconds,
        updated_by
      ) VALUES (
        1, TRUE, 3, 30, 'system'
      );
    `
  }
];

// Create indexes for performance
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_status ON public_chat_sessions(status);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_assigned_to ON public_chat_sessions(assigned_to);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_priority ON public_chat_sessions(priority_level);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_created_at ON public_chat_sessions(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_messages_session_id ON public_chat_messages(session_id);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_messages_sender_type ON public_chat_messages(sender_type);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_messages_created_at ON public_chat_messages(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_staff_work_modes_username ON staff_work_modes(username);',
  'CREATE INDEX IF NOT EXISTS idx_staff_work_modes_current_mode ON staff_work_modes(current_mode);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_session_events_session_id ON public_chat_session_events(session_id);',
  'CREATE INDEX IF NOT EXISTS idx_public_chat_session_events_event_type ON public_chat_session_events(event_type);',
  'CREATE INDEX IF NOT EXISTS idx_typing_status_session_id ON public_chat_typing_status(session_id);',
  'CREATE INDEX IF NOT EXISTS idx_typing_status_expires_at ON public_chat_typing_status(expires_at);',
  'CREATE INDEX IF NOT EXISTS idx_read_receipts_session_message ON public_chat_read_receipts(session_id, message_id);',
  'CREATE INDEX IF NOT EXISTS idx_read_receipts_status ON public_chat_read_receipts(status);'
];

// Run migrations
async function runMigrations() {
  try {
    console.log('📋 Running database migrations...\n');
    
    for (const migration of migrations) {
      try {
        await new Promise((resolve, reject) => {
          db.exec(migration.sql, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✅ ${migration.name}`);
      } catch (error) {
        console.error(`❌ Failed: ${migration.name}`);
        console.error(`   Error: ${error.message}`);
        throw error;
      }
    }
    
    console.log('\n📊 Creating performance indexes...\n');
    
    for (const index of indexes) {
      try {
        await new Promise((resolve, reject) => {
          db.exec(index, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✅ Index created`);
      } catch (error) {
        console.error(`❌ Index failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Public Portal Live Chat database setup completed successfully!');
    console.log('\n📊 Summary of tables created:');
    console.log('   • public_chat_sessions - Guest chat sessions with enhanced tracking');
    console.log('   • public_chat_messages - All chat messages between guests and staff');
    console.log('   • public_portal_widget_settings - Admin configuration for the chat widget');
    console.log('   • public_chat_session_ratings - Customer satisfaction ratings');
    console.log('   • staff_work_modes - Staff availability and work mode tracking');
    console.log('   • staff_work_mode_history - Audit trail for work mode changes');
    console.log('   • public_chat_session_events - Event log for all session activities');
    console.log('   • public_chat_typing_status - Real-time typing indicators');
    console.log('   • public_chat_read_receipts - Message delivery and read confirmations');
    console.log('   • public_queue_theme_settings - Color customization for staff queue interface');
    console.log('   • public_queue_management_settings - Queue behavior and auto-assignment settings');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

runMigrations();