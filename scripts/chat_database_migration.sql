-- Chat System Database Schema Migration
-- Adds 15 tables to existing Orvale Management System for comprehensive chat system
-- Includes: Internal chat, public portal chat, ratings, analytics, and calling features
-- Run this after backing up your current database

-- ===================================
-- 1. CHAT CHANNELS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS chat_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, -- NULL for DMs and groups, actual name for channels
    description TEXT,
    type TEXT CHECK(type IN ('public_channel', 'private_channel', 'direct_message', 'group')) DEFAULT 'public_channel',
    created_by TEXT NOT NULL,
    team_id TEXT, -- Link to teams table for channels
    is_read_only BOOLEAN DEFAULT FALSE, -- Announcement channels (read-only)
    allow_posting BOOLEAN DEFAULT TRUE, -- Can be disabled for moderation
    moderated_by TEXT, -- Channel moderator
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(username),
    FOREIGN KEY (moderated_by) REFERENCES users(username),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- ===================================
-- 2. CHAT CHANNEL MEMBERS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS chat_channel_members (
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('member', 'admin', 'owner', 'moderator')) DEFAULT 'member',
    can_post BOOLEAN DEFAULT TRUE, -- Can be blocked from posting
    blocked_from_posting_by TEXT, -- Who blocked them from posting
    blocked_from_posting_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id),
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (blocked_from_posting_by) REFERENCES users(username)
);

-- ===================================
-- 3. CHAT MESSAGES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('text', 'file', 'image', 'gif', 'ticket_link', 'system', 'broadcast')) DEFAULT 'text',
    reply_to_id INTEGER, -- For threaded messages
    ticket_reference TEXT, -- Link to tickets
    file_attachment TEXT, -- JSON: File path, URL, metadata
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete flag
    can_edit_until TIMESTAMP DEFAULT (datetime('now', '+3 minutes')), -- 3-minute edit window
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id)
);

-- ===================================
-- 4. USER PRESENCE TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS user_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
    status_message TEXT,
    away_message TEXT, -- Custom away message
    custom_status TEXT, -- Persistent custom status message
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_connections TEXT DEFAULT '[]', -- JSON array of socket IDs
    connection_count INTEGER DEFAULT 0,
    is_chat_blocked BOOLEAN DEFAULT FALSE, -- Admin can block from chat
    blocked_by TEXT, -- Admin who blocked the user
    blocked_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username),
    FOREIGN KEY (blocked_by) REFERENCES users(username)
);

-- ===================================
-- 5. USER CHAT PREFERENCES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS user_chat_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'system', -- light, dark, system, darcula, etc.
    notification_sounds BOOLEAN DEFAULT TRUE,
    desktop_notifications BOOLEAN DEFAULT TRUE,
    show_typing_indicators BOOLEAN DEFAULT TRUE,
    auto_emoji_reactions BOOLEAN DEFAULT TRUE,
    enter_to_send BOOLEAN DEFAULT TRUE, -- vs shift+enter
    font_size TEXT DEFAULT 'medium', -- small, medium, large
    compact_mode BOOLEAN DEFAULT FALSE,
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    widget_shape TEXT DEFAULT 'circle', -- circle, square, hexagon
    widget_color TEXT DEFAULT '#1976d2', -- Material-UI primary blue
    widget_position TEXT DEFAULT 'bottom-right', -- bottom-right, bottom-left
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username)
);

-- ===================================
-- 6. CHAT FILES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS chat_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    is_image BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id),
    FOREIGN KEY (user_id) REFERENCES users(username)
);

-- ===================================
-- 7. CHAT SYSTEM SETTINGS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS chat_system_settings (
    id INTEGER PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- ===================================
-- 8. CALL LOGS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT UNIQUE NOT NULL, -- UUID for this call session
    caller_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    call_type TEXT CHECK(call_type IN ('audio', 'video')) NOT NULL,
    status TEXT CHECK(status IN ('initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed')) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER, -- Calculated when call ends
    end_reason TEXT, -- 'normal', 'busy', 'timeout', 'network_error', etc.
    quality_rating INTEGER, -- 1-5 user rating (optional)
    FOREIGN KEY (caller_id) REFERENCES users(username),
    FOREIGN KEY (receiver_id) REFERENCES users(username)
);

-- ===================================
-- 9. MESSAGE REACTIONS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id),
    FOREIGN KEY (user_id) REFERENCES users(username),
    UNIQUE(message_id, user_id, emoji)
);

-- ===================================
-- 10. PUBLIC PORTAL CHAT SESSIONS
-- ===================================
CREATE TABLE IF NOT EXISTS public_chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    visitor_name TEXT,
    visitor_email TEXT,
    session_data TEXT, -- JSON: pre-chat answers, browser info
    status TEXT CHECK(status IN ('waiting', 'active', 'ended', 'abandoned')) DEFAULT 'waiting',
    assigned_to TEXT, -- Staff member handling the chat
    queue_position INTEGER,
    recovery_token TEXT, -- For session recovery within time window
    recovery_expires_at TIMESTAMP,
    ticket_created TEXT, -- Link to auto-created ticket if applicable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(username)
);

-- ===================================
-- 11. PUBLIC PORTAL MESSAGES
-- ===================================
CREATE TABLE IF NOT EXISTS public_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    sender_type TEXT CHECK(sender_type IN ('guest', 'staff', 'system')) NOT NULL,
    sender_id TEXT, -- user_id for staff, null for guest
    sender_name TEXT NOT NULL, -- Display name
    message_text TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('text', 'file', 'system', 'ticket_link')) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
    FOREIGN KEY (sender_id) REFERENCES users(username)
);

-- ===================================
-- 12. WIDGET ANIMATIONS
-- ===================================
CREATE TABLE IF NOT EXISTS widget_animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    widget_type TEXT CHECK(widget_type IN ('internal', 'public_portal')) NOT NULL,
    animation_name TEXT NOT NULL, -- bounce, pulse, shake, glow, slideIn, rotation
    animation_trigger TEXT NOT NULL, -- on_message, on_hover, on_connect, idle
    duration_ms INTEGER DEFAULT 500,
    timing_function TEXT DEFAULT 'ease-in-out',
    intensity INTEGER DEFAULT 1, -- 1-5 scale
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================
-- 13. PUBLIC PORTAL WIDGET SETTINGS
-- ===================================
CREATE TABLE IF NOT EXISTS public_portal_widget_settings (
    id INTEGER PRIMARY KEY,
    enabled_pages TEXT DEFAULT '[]', -- JSON array of page paths
    widget_shape TEXT DEFAULT 'circle',
    widget_color TEXT DEFAULT '#1976d2',
    widget_image TEXT, -- Optional mini image/logo
    position TEXT DEFAULT 'bottom-right',
    welcome_message TEXT DEFAULT 'Hi! How can we help you today?',
    offline_message TEXT DEFAULT 'We are currently offline. Please submit a ticket.',
    pre_chat_questions TEXT DEFAULT '[]', -- JSON array of questions
    session_recovery_enabled BOOLEAN DEFAULT TRUE,
    session_recovery_minutes INTEGER DEFAULT 5,
    auto_ticket_creation BOOLEAN DEFAULT TRUE,
    -- Rating System Settings
    session_rating_enabled BOOLEAN DEFAULT TRUE,
    rating_prompt_message TEXT DEFAULT 'How would you rate your support experience?',
    comment_enabled BOOLEAN DEFAULT TRUE,
    comment_prompt_message TEXT DEFAULT 'Would you like to leave a comment about your experience?',
    comment_placeholder TEXT DEFAULT 'Tell us how we can improve...',
    comment_required BOOLEAN DEFAULT FALSE,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- ===================================
-- 14. PUBLIC PORTAL SESSION RATINGS
-- ===================================
CREATE TABLE IF NOT EXISTS public_chat_session_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    rating INTEGER CHECK(rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT, -- Optional feedback comment
    browser_fingerprint TEXT, -- Fraud prevention
    ip_address TEXT, -- Additional fraud prevention
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions(session_id),
    UNIQUE(session_id) -- One rating per session for fraud prevention
);

-- ===================================
-- 15. STAFF RATING SUMMARIES
-- ===================================
CREATE TABLE IF NOT EXISTS staff_rating_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_username TEXT NOT NULL,
    rating_period TEXT CHECK(rating_period IN ('daily', 'weekly', 'monthly')) NOT NULL,
    period_date TEXT NOT NULL, -- YYYY-MM-DD format
    total_ratings INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_1_count INTEGER DEFAULT 0,
    rating_2_count INTEGER DEFAULT 0,
    rating_3_count INTEGER DEFAULT 0,
    rating_4_count INTEGER DEFAULT 0,
    rating_5_count INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_username) REFERENCES users(username),
    UNIQUE(staff_username, rating_period, period_date)
);

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Channel members indexes
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_id ON chat_channel_members(user_id);

-- Call logs indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver_id ON call_logs(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at);

-- Message reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Public portal chat indexes
CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_status ON public_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_assigned_to ON public_chat_sessions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_public_chat_messages_session_id ON public_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_public_chat_messages_created_at ON public_chat_messages(created_at);

-- Rating analytics indexes
CREATE INDEX IF NOT EXISTS idx_rating_summaries_staff_period ON staff_rating_summaries(staff_username, rating_period);
CREATE INDEX IF NOT EXISTS idx_session_ratings_created_at ON public_chat_session_ratings(created_at);

-- ===================================
-- DEFAULT CHAT SYSTEM SETTINGS
-- ===================================

INSERT OR IGNORE INTO chat_system_settings (setting_key, setting_value, updated_by) VALUES
('chat_enabled', 'true', 'system'),
('max_message_length', '5000', 'system'),
('file_upload_max_size', '10485760', 'system'), -- 10MB
('allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx,txt,zip', 'system'),
('message_edit_window_minutes', '3', 'system'),
('auto_away_minutes', '10', 'system'),
('presence_cleanup_minutes', '30', 'system'),
('max_connections_per_user', '10', 'system'); -- For monitoring, not enforcement

-- ===================================
-- DEFAULT PUBLIC CHANNELS
-- ===================================

-- Create default General channel
INSERT OR IGNORE INTO chat_channels (id, name, description, type, created_by) VALUES 
(1, 'General', 'General discussion for all users', 'public_channel', 'system');

-- Create default IT Support channel
INSERT OR IGNORE INTO chat_channels (id, name, description, type, created_by) VALUES 
(2, 'IT Support', 'IT support and announcements', 'public_channel', 'system');

-- Create default Announcements channel (read-only)
INSERT OR IGNORE INTO chat_channels (id, name, description, type, created_by, is_read_only) VALUES 
(3, 'Announcements', 'System-wide announcements', 'public_channel', 'system', TRUE);

-- ===================================
-- DEFAULT WIDGET ANIMATIONS
-- ===================================

INSERT OR IGNORE INTO widget_animations (widget_type, animation_name, animation_trigger, duration_ms, timing_function, intensity, enabled) VALUES
('internal', 'bounce', 'on_message', 600, 'ease-out', 2, TRUE),
('internal', 'pulse', 'on_hover', 400, 'ease-in-out', 1, TRUE),
('public_portal', 'bounce', 'on_message', 800, 'ease-out', 3, TRUE),
('public_portal', 'pulse', 'on_hover', 500, 'ease-in-out', 2, TRUE),
('public_portal', 'shake', 'idle', 1000, 'ease-in-out', 1, FALSE),
('public_portal', 'glow', 'on_connect', 2000, 'ease-in-out', 2, TRUE);

-- ===================================
-- DEFAULT PUBLIC PORTAL WIDGET SETTINGS
-- ===================================

INSERT OR IGNORE INTO public_portal_widget_settings (
    id, 
    enabled_pages, 
    widget_shape, 
    widget_color, 
    position, 
    welcome_message, 
    offline_message, 
    session_recovery_enabled, 
    session_recovery_minutes, 
    session_rating_enabled, 
    rating_prompt_message, 
    comment_enabled, 
    comment_prompt_message, 
    comment_placeholder, 
    updated_by
) VALUES (
    1,
    '["public-portal", "help", "support"]',
    'circle',
    '#1976d2',
    'bottom-right',
    'Hi! How can we help you today?',
    'We are currently offline. Please submit a ticket for assistance.',
    TRUE,
    5,
    TRUE,
    'How would you rate your support experience?',
    TRUE,
    'Would you like to leave a comment about your experience?',
    'Tell us how we can improve...',
    'system'
);

-- ===================================
-- 16. ENHANCED PUBLIC PORTAL WIDGET SETTINGS WITH BUSINESS HOURS
-- ===================================

-- Update existing public portal widget settings table with business hours
-- First, add new columns to existing table (safe operation)
ALTER TABLE public_portal_widget_settings ADD COLUMN business_hours_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE public_portal_widget_settings ADD COLUMN schedule_json TEXT DEFAULT '{}';
ALTER TABLE public_portal_widget_settings ADD COLUMN holidays_json TEXT DEFAULT '[]';
ALTER TABLE public_portal_widget_settings ADD COLUMN business_hours_message TEXT DEFAULT 'Live chat available during business hours.';
ALTER TABLE public_portal_widget_settings ADD COLUMN queue_message TEXT DEFAULT 'Please wait for the next available agent.';

-- Update the existing record with business hours data
UPDATE public_portal_widget_settings SET 
    business_hours_enabled = TRUE,
    timezone = 'America/New_York',
    schedule_json = '{"monday":{"open":"07:00","close":"18:00","enabled":true},"tuesday":{"open":"07:00","close":"18:00","enabled":true},"wednesday":{"open":"07:00","close":"18:00","enabled":true},"thursday":{"open":"07:00","close":"18:00","enabled":true},"friday":{"open":"07:00","close":"18:00","enabled":true},"saturday":{"open":"09:00","close":"17:00","enabled":false},"sunday":{"open":"09:00","close":"17:00","enabled":false}}',
    holidays_json = '[{"date":"2025-12-25","name":"Christmas Day"},{"date":"2025-01-01","name":"New Year''s Day"}]',
    business_hours_message = 'Live chat is available Monday-Friday, 7:00 AM - 6:00 PM EST.',
    queue_message = 'You are in queue. Please wait for the next available agent.',
    offline_message = 'We are currently offline (7:00 AM - 6:00 PM EST). Please submit a ticket and we will get back to you.'
WHERE id = 1;

-- ===================================
-- 17. CHAT SYSTEM SETTINGS FOR ADMIN CONFIGURATION
-- ===================================

CREATE TABLE IF NOT EXISTS chat_system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL, -- JSON string for complex values
    setting_type TEXT CHECK(setting_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    category TEXT DEFAULT 'general', -- general, giphy, notifications, permissions
    requires_restart BOOLEAN DEFAULT FALSE,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- ===================================
-- 18. GIF USAGE TRACKING AND RATE LIMITING
-- ===================================

CREATE TABLE IF NOT EXISTS gif_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    gif_id TEXT NOT NULL,
    gif_url TEXT,
    gif_title TEXT,
    channel_id TEXT, -- Which chat channel/DM the GIF was sent to
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS gif_rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    gif_count INTEGER DEFAULT 0,
    reset_time TIMESTAMP NOT NULL, -- Hour window (rounded to hour)
    last_gif_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username),
    UNIQUE(user_id, reset_time) -- One record per user per hour
);

-- ===================================
-- DEFAULT SETTINGS INSERTION
-- ===================================

-- Default Giphy settings
INSERT OR IGNORE INTO chat_system_settings (setting_key, setting_value, setting_type, description, category, updated_by) VALUES
('giphy_enabled', 'false', 'boolean', 'Enable/disable GIF functionality system-wide', 'giphy', 'system'),
('giphy_api_key', '', 'string', 'Giphy API key for GIF integration', 'giphy', 'system'),
('giphy_content_rating', 'g', 'string', 'Content rating filter (g, pg, pg-13, r)', 'giphy', 'system'),
('giphy_search_limit', '20', 'number', 'Maximum GIFs returned per search', 'giphy', 'system'),
('giphy_trending_limit', '12', 'number', 'Maximum trending GIFs to display', 'giphy', 'system'),
('giphy_rate_limit', '50', 'number', 'Max GIFs per user per hour', 'giphy', 'system'),
('giphy_enable_search', 'true', 'boolean', 'Allow users to search for GIFs', 'giphy', 'system'),
('giphy_enable_trending', 'true', 'boolean', 'Show trending GIFs tab', 'giphy', 'system'),
('giphy_enable_categories', 'true', 'boolean', 'Show GIF categories', 'giphy', 'system');

-- General chat system settings
INSERT OR IGNORE INTO chat_system_settings (setting_key, setting_value, setting_type, description, category, updated_by) VALUES
('chat_system_enabled', 'true', 'boolean', 'Master toggle for entire chat system', 'general', 'system'),
('max_message_length', '2000', 'number', 'Maximum characters per message', 'general', 'system'),
('message_edit_window_minutes', '3', 'number', 'Minutes users can edit/delete messages', 'general', 'system'),
('file_upload_max_size_mb', '10', 'number', 'Maximum file upload size in MB', 'general', 'system'),
('notification_sounds_enabled', 'true', 'boolean', 'Allow notification sounds', 'notifications', 'system'),
('typing_indicators_enabled', 'true', 'boolean', 'Show typing indicators', 'general', 'system');

-- ===================================
-- PERFORMANCE INDEXES
-- ===================================

CREATE INDEX IF NOT EXISTS idx_chat_settings_category ON chat_system_settings(category);
CREATE INDEX IF NOT EXISTS idx_gif_usage_user_time ON gif_usage_log(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_gif_usage_gif_id ON gif_usage_log(gif_id);
CREATE INDEX IF NOT EXISTS idx_gif_rate_limits_user_reset ON gif_rate_limits(user_id, reset_time);
CREATE INDEX IF NOT EXISTS idx_public_widget_settings_enabled ON public_portal_widget_settings(business_hours_enabled);