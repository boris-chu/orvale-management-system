-- Enhanced Database Schema for Public Portal Live Chat with Staff Work Modes
-- Updated: August 25, 2025

-- Add staff work modes table
CREATE TABLE IF NOT EXISTS staff_work_modes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    current_mode TEXT CHECK(current_mode IN ('ready', 'work_mode', 'ticketing_mode', 'offline')) DEFAULT 'offline',
    auto_assign_enabled BOOLEAN DEFAULT TRUE,
    max_concurrent_chats INTEGER DEFAULT 3,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mode_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Add public queue theme settings table
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

-- Insert default public queue theme
INSERT OR IGNORE INTO public_queue_theme_settings (
    id, primary_color, secondary_color, accent_color, sidebar_color,
    updated_by
) VALUES (
    1, '#e57373', '#ffcdd2', '#d32f2f', '#fce4ec', 'system'
);

-- Enhanced public_chat_sessions table with staff disconnect tracking
CREATE TABLE IF NOT EXISTS public_chat_sessions_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_department TEXT,
    session_data TEXT, -- JSON: pre-chat answers, browser info
    
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

-- Staff work mode change history
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

-- Public chat session events log
CREATE TABLE IF NOT EXISTS public_chat_session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'staff_connect', 'staff_disconnect', 'guest_disconnect', 'requeued', 'priority_boost', 'assignment', 'transfer'
    event_data TEXT, -- JSON with event details
    staff_username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions_enhanced(session_id),
    FOREIGN KEY (staff_username) REFERENCES users(username)
);

-- Public queue chat management settings
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

-- Insert default public queue management settings
INSERT OR IGNORE INTO public_queue_management_settings (
    id, auto_assign_enabled, max_concurrent_per_staff, assignment_timeout_seconds,
    updated_by
) VALUES (
    1, TRUE, 3, 30, 'system'
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_work_modes_username ON staff_work_modes(username);
CREATE INDEX IF NOT EXISTS idx_staff_work_modes_current_mode ON staff_work_modes(current_mode);
CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_status ON public_chat_sessions_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_assigned_to ON public_chat_sessions_enhanced(assigned_to);
CREATE INDEX IF NOT EXISTS idx_public_chat_sessions_priority ON public_chat_sessions_enhanced(priority_level);
CREATE INDEX IF NOT EXISTS idx_public_chat_session_events_session_id ON public_chat_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_public_chat_session_events_event_type ON public_chat_session_events(event_type);

-- Add RBAC permissions for public portal management
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES 
('admin', 'public_portal.manage_settings'),
('admin', 'public_portal.manage_queue'),
('admin', 'public_portal.view_all_sessions'),
('admin', 'public_portal.force_disconnect'),
('admin', 'public_portal.override_work_modes'),
('manager', 'public_portal.manage_queue'),
('manager', 'public_portal.view_all_sessions'),
('support', 'public_portal.handle_chats'),
('support', 'public_portal.change_work_mode'),
('helpdesk', 'public_portal.handle_chats'),
('helpdesk', 'public_portal.change_work_mode');