-- Add 21 new permissions for Chat System and Calling Features
-- 16 Chat permissions + 5 Call permissions

-- ===================================
-- CHAT SYSTEM PERMISSIONS (16)
-- ===================================

-- Basic Chat Access
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.access');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.access');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.access');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'chat.access');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'chat.access');

-- Send Messages
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.send_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.send_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.send_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'chat.send_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'chat.send_messages');

-- Upload Files
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.upload_files');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.upload_files');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.upload_files');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'chat.upload_files');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'chat.upload_files');

-- Create Channels
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.create_channels');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.create_channels');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.create_channels');

-- Create Groups
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.create_groups');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.create_groups');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.create_groups');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'chat.create_groups');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'chat.create_groups');

-- Delete Own Messages
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.delete_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.delete_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.delete_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'chat.delete_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'chat.delete_own_messages');

-- Delete Any Messages (Moderation)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.delete_any_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.delete_any_messages');

-- Edit Own Messages
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.edit_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.edit_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'chat.edit_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'chat.edit_own_messages');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'chat.edit_own_messages');

-- Manage Channels (Admin/Moderator)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.manage_channels');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.manage_channels');

-- Block Users from Posting
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.block_users');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.block_users');

-- View All Messages (Monitor)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.view_all_messages');

-- Send System Broadcasts
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.send_broadcasts');

-- Force User Logout from Chat
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.force_logout');

-- Manage Chat System Settings
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.manage_system');

-- View Chat Analytics
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.view_analytics');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'chat.view_analytics');

-- Download Chat History
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'chat.download_history');

-- ===================================
-- CALLING PERMISSIONS (5)
-- ===================================

-- Make Audio Calls
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'call.audio');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'call.audio');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'call.audio');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'call.audio');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'call.audio');

-- Make Video Calls  
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'call.video');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'call.video');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'call.video');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'call.video');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'call.video');

-- View Call History
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'call.view_history');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'call.view_history');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('support', 'call.view_history');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('it_user', 'call.view_history');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('helpdesk', 'call.view_history');

-- View All Call Logs (Admin)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'call.view_all_logs');
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('manager', 'call.view_all_logs');

-- Manage Call System Settings
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('admin', 'call.manage_system');