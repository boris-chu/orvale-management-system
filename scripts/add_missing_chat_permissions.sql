-- Add missing chat permissions that are required by the chat service
-- These permissions were not included in the original permissions setup

-- Missing chat permissions needed for chat service functionality
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES 
-- Admin role - should have all permissions
('admin', 'chat.view_settings'),
('admin', 'chat.view_widget_settings'),
('admin', 'chat.view_preferences'),
('admin', 'chat.update_preferences'),
('admin', 'chat.manage_groups'),
('admin', 'chat.view_users'),
('admin', 'chat.view_presence'),
('admin', 'chat.update_presence'),
('admin', 'chat.view_files'),
('admin', 'chat.use_gifs'),
('admin', 'chat.view_gif_usage'),

-- Manager role - most chat permissions
('manager', 'chat.view_settings'),
('manager', 'chat.view_widget_settings'),
('manager', 'chat.view_preferences'),
('manager', 'chat.update_preferences'),
('manager', 'chat.manage_groups'),
('manager', 'chat.view_users'),
('manager', 'chat.view_presence'),
('manager', 'chat.update_presence'),
('manager', 'chat.view_files'),
('manager', 'chat.use_gifs'),
('manager', 'chat.view_gif_usage'),

-- Support role - standard chat permissions
('support', 'chat.view_preferences'),
('support', 'chat.update_preferences'),
('support', 'chat.view_users'),
('support', 'chat.view_presence'),
('support', 'chat.update_presence'),
('support', 'chat.view_files'),
('support', 'chat.use_gifs'),

-- Helpdesk role - standard chat permissions
('helpdesk', 'chat.view_preferences'),
('helpdesk', 'chat.update_preferences'),
('helpdesk', 'chat.view_users'),
('helpdesk', 'chat.view_presence'),
('helpdesk', 'chat.update_presence'),
('helpdesk', 'chat.view_files'),
('helpdesk', 'chat.use_gifs'),

-- IT User role - basic chat permissions
('it_user', 'chat.view_preferences'),
('it_user', 'chat.update_preferences'),
('it_user', 'chat.view_presence'),
('it_user', 'chat.update_presence'),
('it_user', 'chat.use_gifs');

-- Verify the permissions were added
SELECT 'Chat permissions added successfully. Admin role now has ' || COUNT(*) || ' chat permissions.' as result
FROM role_permissions 
WHERE role_id = 'admin' AND permission_id LIKE 'chat.%';