-- Enhanced Public Portal Settings for Typing Detection and Read Receipts
-- Updated: August 25, 2025

-- Add typing detection and read receipts settings to public_portal_widget_settings
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS typing_indicators_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS typing_timeout_seconds INTEGER DEFAULT 3;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS show_staff_typing_to_guests BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS show_guest_typing_to_staff BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS typing_indicator_text TEXT DEFAULT 'is typing...';
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS typing_indicator_style TEXT DEFAULT 'dots'; -- 'dots', 'text', 'pulse'

-- Read receipts settings
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS show_delivery_status BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS show_guest_read_status_to_staff BOOLEAN DEFAULT TRUE;
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS show_staff_read_status_to_guests BOOLEAN DEFAULT FALSE; -- Privacy consideration
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS read_receipt_style TEXT DEFAULT 'checkmarks'; -- 'checkmarks', 'timestamps', 'both'
ALTER TABLE public_portal_widget_settings ADD COLUMN IF NOT EXISTS delivery_status_icons TEXT DEFAULT '{"sent":"✓","delivered":"✓✓","read":"✓✓"}'; -- JSON

-- Create typing status tracking table
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
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions_enhanced(session_id),
    UNIQUE(session_id, user_type, user_id) -- One typing status per user per session
);

-- Create read receipts tracking table  
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
    FOREIGN KEY (session_id) REFERENCES public_chat_sessions_enhanced(session_id),
    FOREIGN KEY (message_id) REFERENCES public_chat_messages(id),
    UNIQUE(session_id, message_id, reader_type, reader_id) -- One receipt per reader per message
);

-- Update public_chat_messages table to include delivery tracking
ALTER TABLE public_chat_messages ADD COLUMN IF NOT EXISTS message_status TEXT CHECK(message_status IN ('sending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'sending';
ALTER TABLE public_chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE public_chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_status_session_id ON public_chat_typing_status(session_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_expires_at ON public_chat_typing_status(expires_at);
CREATE INDEX IF NOT EXISTS idx_read_receipts_session_message ON public_chat_read_receipts(session_id, message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_status ON public_chat_read_receipts(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON public_chat_messages(message_status);

-- Update default settings
UPDATE public_portal_widget_settings SET 
    typing_indicators_enabled = TRUE,
    typing_timeout_seconds = 3,
    show_staff_typing_to_guests = TRUE,
    show_guest_typing_to_staff = TRUE,
    typing_indicator_text = 'is typing...',
    typing_indicator_style = 'dots',
    read_receipts_enabled = TRUE,
    show_delivery_status = TRUE,
    show_guest_read_status_to_staff = TRUE,
    show_staff_read_status_to_guests = FALSE,
    read_receipt_style = 'checkmarks',
    delivery_status_icons = '{"sent":"✓","delivered":"✓✓","read":"✓✓"}'
WHERE id = 1;