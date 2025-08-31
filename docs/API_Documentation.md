# Orvale Management System - API Documentation

> **Complete REST API Reference for Chat System, Ticketing System, and Administrative Functions**

## Overview

The Orvale Management System provides a comprehensive REST API with **123 verified route files** providing **195+ individual HTTP method handlers** across **16 functional areas**. All APIs use JWT-based authentication with role-based access control (RBAC) supporting 104 granular permissions.

**Base URL**: `http://localhost:80/api/`  
**Authentication**: Bearer token in `Authorization` header  
**Response Format**: JSON

---

## 1. Chat System APIs

### Core Chat Management

#### **GET** `/api/chat/channels`
Get user's accessible channels with unread counts and last messages.

**Response:**
```json
{
  "channels": [
    {
      "id": 1,
      "name": "general",
      "description": "General discussion for all users",
      "type": "public_channel",
      "is_read_only": false,
      "created_by": "admin",
      "created_at": "2025-01-15T10:00:00Z",
      "member_count": 25,
      "unread_count": 3,
      "last_message": {
        "text": "Hello everyone!",
        "user_display_name": "John Doe",
        "timestamp": "2025-01-15T14:30:00Z"
      }
    }
  ]
}
```

#### **POST** `/api/chat/channels`
Create a new channel.

**Permissions**: `chat.create_channels`

**Request:**
```json
{
  "name": "project-alpha",
  "description": "Project Alpha discussion",
  "type": "public_channel",
  "is_read_only": false
}
```

#### **PUT** `/api/chat/channels/[id]`
Update channel settings.

**Permissions**: `chat.manage_channels`

**Request:**
```json
{
  "name": "updated-channel-name",
  "description": "Updated description", 
  "is_read_only": true
}
```

#### **DELETE** `/api/chat/channels/[id]`
Soft delete a channel.

**Permissions**: `chat.manage_channels`

#### **POST** `/api/chat/channels/[id]/join`
Join a channel.

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined channel"
}
```

#### **POST** `/api/chat/channels/[id]/leave`
Leave a channel.

### Direct Messages & Groups

#### **GET** `/api/chat/dm`
Get user's direct messages (simplified endpoint for chat system).

**Response:**
```json
{
  "dms": []
}
```

#### **POST** `/api/chat/dm`
Create or find existing direct message between two users.

**Request:**
```json
{
  "targetUsername": "john.doe"
}
```

**Response:**
```json
{
  "message": "Direct message created successfully",
  "dmId": 123,
  "isNew": true
}
```

#### **GET** `/api/chat/direct-messages`
Get user's direct messages and group chats.

**Response:**
```json
{
  "direct_messages": [
    {
      "id": "dm_123_456",
      "participants": [
        {
          "username": "john.doe",
          "display_name": "John Doe",
          "status": "online"
        }
      ],
      "last_message": {
        "text": "Hi there!",
        "timestamp": "2025-01-15T14:30:00Z"
      },
      "unread_count": 2
    }
  ],
  "groups": [
    {
      "id": "group_789",
      "name": "Project Team",
      "participants": [...],
      "unread_count": 5
    }
  ]
}
```

#### **POST** `/api/chat/direct-messages`
Create new direct message or group chat.

**Permissions**: `chat.create_direct` (for DMs), `chat.create_groups` (for groups)

**Request:**
```json
{
  "type": "direct_message",
  "participants": ["john.doe", "jane.smith"]
}
```

### Direct Message Management (New Simplified API)

#### **GET** `/api/chat/dm`
Get user's direct messages (simplified endpoint).

**Response:**
```json
{
  "dms": []
}
```

#### **POST** `/api/chat/dm`
Create or find existing direct message conversation.

**Request:**
```json
{
  "targetUsername": "john.doe"
}
```

**Response:**
```json
{
  "message": "Direct message created successfully",
  "dmId": 42,
  "isNew": true
}
```

### Chat Users

#### **GET** `/api/chat/users`
Get available users for chat creation, grouped by online status.

**Response:**
```json
{
  "users": {
    "online": [
      {
        "username": "john.doe",
        "display_name": "John Doe",
        "profile_picture": "/avatars/john.jpg",
        "role_id": "manager",
        "is_online": true,
        "team_name": "Development",
        "is_team_member": true,
        "presence": {
          "status": "online",
          "last_active": "2025-01-15T14:30:00Z"
        }
      }
    ],
    "away": [...],
    "offline": [...]
  }
}
```

### Messages

#### **GET** `/api/chat/messages`
Get messages for a channel with pagination.

**Query Parameters:**
- `channel_id` (required): Channel ID
- `before` (optional): Message ID for pagination
- `limit` (optional): Number of messages (default: 50)
- `offset` (optional): Skip messages

**Response:**
```json
{
  "messages": [
    {
      "id": 123,
      "channel_id": 1,
      "user_id": "john.doe",
      "user_display_name": "John Doe",
      "message_text": "Hello everyone!",
      "message_type": "text",
      "reply_to_id": null,
      "created_at": "2025-01-15T14:30:00Z",
      "updated_at": null,
      "is_edited": false
    }
  ],
  "has_more": true,
  "total_count": 150
}
```

#### **POST** `/api/chat/messages`
Send a new message.

**Permissions**: `chat.send_messages`

**Request:**
```json
{
  "channel_id": 1,
  "message_text": "Hello everyone!",
  "message_type": "text",
  "reply_to_id": 122
}
```

#### **PUT** `/api/chat/messages/[messageId]`
Edit a message (only by original author or admin).

**Request:**
```json
{
  "message_text": "Updated message content"
}
```

#### **DELETE** `/api/chat/messages/[messageId]`
Delete a message (only by original author or admin).

### Presence & Status

#### **GET** `/api/chat/presence`
Get online users with status filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`online`, `away`, `busy`, `offline`, `idle`, `in_call`, `in_meeting`, `presenting`)

**Response:**
```json
{
  "users": [
    {
      "user_id": "john.doe",
      "display_name": "John Doe",
      "status": "online",
      "status_message": "Working on project",
      "last_active": "2025-01-15T14:35:00Z",
      "connection_count": 2
    }
  ]
}
```

#### **POST** `/api/chat/presence`
Update user status.

**Request:**
```json
{
  "status": "away",
  "status_message": "In a meeting"
}
```

### GIF Integration

#### **GET** `/api/chat/search`
Search GIFs via Giphy API.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "giphy_gif_id",
      "url": "https://giphy.com/gifs/...",
      "images": {
        "fixed_height": {
          "url": "https://media.giphy.com/...",
          "width": "200",
          "height": "200"
        }
      }
    }
  ]
}
```

### File Sharing

#### **POST** `/api/chat/files/upload`
Upload files for chat messages.

**Permissions**: `chat.send_files` or `chat.access_channels`

**Request:** Multipart form data
- `file`: File to upload (max 10MB)
- `channel_id`: Target channel ID

**Supported file types:**
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `text/plain`, `text/csv`, `application/json`
- Spreadsheets: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-uuid-123",
    "filename": "document.pdf",
    "type": "file",
    "url": "/api/chat/files/file-uuid-123",
    "size": 2048576,
    "mime_type": "application/pdf"
  }
}
```

#### **GET** `/api/chat/files/[id]`
Download/serve uploaded chat files.

**Permissions**: `chat.access_channels`

**Response:** File content with appropriate headers
- Images: `Content-Disposition: inline`
- Documents: `Content-Disposition: attachment`
- Proper MIME type and caching headers

### Chat Settings

#### **GET** `/api/chat/ui-settings`
Get chat UI preferences.

**Response:**
```json
{
  "show_unread_badges": true,
  "unread_badge_color": "#dc3545",
  "unread_badge_text_color": "#ffffff",
  "unread_badge_style": "rounded",
  "unread_badge_position": "right",
  "show_zero_counts": false,
  "show_channel_member_count": false,
  "show_typing_indicators": true,
  "show_online_status": true,
  "message_grouping_enabled": true,
  "timestamp_format": "relative"
}
```

#### **GET** `/api/chat/widget-settings`
Get chat widget configuration and appearance settings.

**Response:**
```json
{
  "widget_enabled": true,
  "widget_position": "bottom-right",
  "widget_shape": "round",
  "widget_primary_color": "#007bff",
  "widget_button_image": null,
  "widget_default_state": "minimized"
}
```

#### **GET** `/api/chat/user-theme-preferences`
Get user's chat theme preferences.

**Response:**
```json
{
  "theme_id": "dark_blue",
  "custom_colors": {
    "primary": "#1e40af",
    "secondary": "#3b82f6",
    "background": "#1f2937"
  },
  "auto_apply": true
}
```

#### **PUT** `/api/chat/user-theme-preferences`
Update user's chat theme preferences.

#### **GET** `/api/chat/gif-usage`
Get user's GIF usage statistics for rate limiting.

#### **GET** `/api/chat/gif-rate-limit`
Check GIF usage rate limit status.

---

## 2. Ticketing System APIs

### Core Ticketing

#### **GET** `/api/tickets`
Get tickets with advanced filtering and pagination.

**Query Parameters:**
- `queue`: `my_tickets`, `team_tickets`, `all_tickets`
- `status`: Filter by status (`open`, `in_progress`, `resolved`, etc.)
- `priority`: Filter by priority (`low`, `normal`, `high`, `urgent`)
- `team`: Filter by assigned team
- `escalated`: Show only escalated tickets (`true`/`false`)
- `search`: Search in title/description
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "tickets": [
    {
      "id": "T-250115-001",
      "title": "Unable to connect to VPN",
      "description": "Getting connection timeout error",
      "status": "open",
      "priority": "normal",
      "submitted_by": "john.doe",
      "submitted_by_name": "John Doe",
      "assigned_to": "tech.support",
      "assigned_team": "ITTS_Region7",
      "category": "Infrastructure",
      "subcategory": "VPN Issues",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "due_date": "2025-01-17T17:00:00Z",
      "escalated": false,
      "unread_comments": 2,
      "attachments_count": 1
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_tickets": 123,
    "per_page": 25
  },
  "summary": {
    "open": 45,
    "in_progress": 32,
    "resolved": 41,
    "closed": 5
  }
}
```

#### **POST** `/api/tickets`
Create a new public ticket submission.

**Request:**
```json
{
  "title": "VPN Connection Issues",
  "description": "Detailed description of the issue...",
  "category": "Infrastructure",
  "request_type": "Issue Resolution",
  "subcategory": "VPN Issues",
  "priority": "normal",
  "support_team": "itts_region7",
  "user_info": {
    "user_name": "John Doe",
    "employee_number": "E123456",
    "email": "john.doe@dpss.lacounty.gov",
    "phone": "555-0123",
    "location": "Bureau of Human Resources",
    "office": "IT Security Office",
    "bureau": "Network Security Bureau",
    "division": "Infrastructure Division"
  },
  "computer_info": {
    "operating_system": "Windows 11",
    "computer_name": "DPSS-WS-001",
    "ip_address": "192.168.1.100"
  }
}
```

#### **GET** `/api/tickets/[id]`
Get individual ticket details.

**Response:**
```json
{
  "ticket": {
    "id": "T-250115-001",
    "title": "VPN Connection Issues",
    "description": "...",
    "status": "in_progress",
    "history": [
      {
        "id": 1,
        "action": "status_change",
        "old_value": "open",
        "new_value": "in_progress",
        "updated_by": "tech.support",
        "updated_at": "2025-01-15T11:00:00Z",
        "notes": "Started investigation"
      }
    ],
    "comments": [
      {
        "id": 1,
        "comment_text": "We're looking into this issue",
        "created_by": "tech.support",
        "created_at": "2025-01-15T11:30:00Z",
        "is_internal": false
      }
    ],
    "attachments": [
      {
        "id": 1,
        "filename": "screenshot.png",
        "file_size": 245760,
        "uploaded_by": "john.doe",
        "uploaded_at": "2025-01-15T10:15:00Z"
      }
    ]
  }
}
```

#### **PUT** `/api/tickets/[id]`
Update ticket status, assignment, or other properties.

**Request:**
```json
{
  "status": "resolved",
  "assigned_to": "senior.tech",
  "priority": "high",
  "internal_notes": "Escalated due to complexity",
  "resolution_notes": "Issue resolved by updating VPN client"
}
```

#### **GET** `/api/tickets/[id]/history`
Get comprehensive ticket history and audit trail.

**Response:**
```json
{
  "history": [
    {
      "id": 1,
      "ticket_id": "T-250115-001",
      "action": "created",
      "field_name": null,
      "old_value": null,
      "new_value": null,
      "updated_by": "john.doe",
      "updated_by_name": "John Doe",
      "updated_at": "2025-01-15T10:00:00Z",
      "notes": "Initial ticket submission",
      "is_internal": false
    }
  ]
}
```

### Staff Ticket Management

#### **GET** `/api/staff/tickets`
Get tickets created by staff members.

**Permissions**: `ticket.create_for_users`

#### **POST** `/api/staff/tickets`
Create ticket on behalf of users.

**Permissions**: `ticket.create_for_users`

**Request:**
```json
{
  "title": "Password Reset Request",
  "description": "User needs password reset for domain account",
  "on_behalf_of": "jane.smith",
  "category": "User Support",
  "priority": "normal",
  "assigned_team": "HELPDESK"
}
```

### Comments System

#### **GET** `/api/tickets/[id]/comments`
Get all comments for a ticket.

**Response:**
```json
{
  "comments": [
    {
      "id": 1,
      "ticket_id": "T-250115-001",
      "comment_text": "Issue reproduced on test environment",
      "created_by": "tech.support",
      "created_by_name": "Tech Support",
      "created_at": "2025-01-15T11:30:00Z",
      "is_internal": true,
      "is_read": false,
      "attachments": []
    }
  ]
}
```

#### **POST** `/api/tickets/[id]/comments`
Add comment to ticket.

**Request:**
```json
{
  "comment_text": "Investigating the root cause",
  "is_internal": true,
  "notify_user": false
}
```

### Ticket Utilities

#### **GET** `/api/tickets/unread-counts`
Get unread notification counts for current user.

**Response:**
```json
{
  "tickets": {
    "my_tickets": 3,
    "team_tickets": 7,
    "escalated_tickets": 1
  },
  "comments": {
    "unread_count": 12
  }
}
```

#### **GET** `/api/public/ticket-status/[id]`
Public ticket status lookup (no authentication required).

**Response:**
```json
{
  "ticket": {
    "id": "T-250115-001",
    "title": "VPN Connection Issues",
    "status": "in_progress",
    "created_at": "2025-01-15T10:00:00Z",
    "last_updated": "2025-01-15T12:00:00Z",
    "estimated_resolution": "2025-01-17T17:00:00Z"
  }
}
```

---

## 3. Authentication APIs

#### **POST** `/api/auth/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "john.doe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "john.doe",
    "display_name": "John Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "permissions": [
      "ticket.view_own",
      "ticket.create",
      "chat.send_messages"
    ]
  }
}
```

#### **POST** `/api/auth/logout`
Invalidate current session.

#### **GET** `/api/auth/user`
Get current authenticated user information.

---

## 4. Helpdesk Management APIs

#### **GET** `/api/helpdesk/queue`
Multi-team helpdesk queue with advanced filtering.

**Permissions**: `helpdesk.multi_queue_access`

**Query Parameters:**
- `teams`: Comma-separated team IDs
- `status`: Filter by ticket status
- `escalated_only`: Show only escalated tickets (`true`/`false`)
- `priority`: Filter by priority level

**Response:**
```json
{
  "queues": {
    "HELPDESK": {
      "team_name": "Helpdesk Team",
      "tickets": [
        {
          "id": "T-250115-002",
          "title": "Password Reset",
          "status": "open",
          "priority": "normal",
          "submitted_by_name": "Jane Smith",
          "age_hours": 2.5,
          "escalated": false
        }
      ],
      "summary": {
        "total": 25,
        "open": 15,
        "in_progress": 8,
        "urgent": 2
      }
    }
  }
}
```

#### **GET** `/api/helpdesk/teams`
Get teams available for helpdesk assignment.

#### **GET** `/api/helpdesk/team-preferences`
Get user's helpdesk team preferences.

**Response:**
```json
{
  "preferences": {
    "selected_teams": ["HELPDESK", "ITTS_Region7"],
    "default_view": "combined",
    "auto_refresh": true,
    "sound_notifications": false
  }
}
```

#### **POST** `/api/helpdesk/team-preferences`
Update helpdesk team preferences.

---

## 5. Staff Management APIs

### Staff Ticketing

#### **GET** `/api/staff/tickets`
Get staff ticket queue with advanced filtering.

**Permissions**: `ticket.view_team_tickets`

**Response:**
```json
{
  "tickets": [
    {
      "id": "TK-250115-001",
      "title": "Password Reset Request",
      "status": "open",
      "priority": "normal",
      "category": "Account Issues",
      "submitted_by_name": "Jane Smith",
      "assigned_to_name": "John Doe",
      "created_at": "2025-01-15T10:00:00Z",
      "age_hours": 2.5
    }
  ],
  "total": 45,
  "summary": {
    "open": 12,
    "in_progress": 8,
    "urgent": 3
  }
}
```

#### **POST** `/api/staff/tickets`
Create staff-generated tickets.

#### **GET** `/api/staff/tickets/attachments/[id]`
Download ticket attachments.

#### **POST** `/api/staff/tickets/attachments`
Upload ticket attachments.

### Staff Work Modes

#### **GET** `/api/staff/work-modes`
Get current user's work mode status.

**Response:**
```json
{
  "work_mode": "ready",
  "last_updated": "2025-01-15T14:30:00Z",
  "auto_assignment_enabled": true
}
```

#### **PUT** `/api/staff/work-modes`
Update user's work mode status.

**Request:**
```json
{
  "work_mode": "away"
}
```

#### **GET** `/api/staff/work-modes/all`
Get all staff work mode statuses (managers/supervisors).

**Permissions**: `staff.view_all_work_modes`

**Response:**
```json
{
  "staff": [
    {
      "username": "jdoe",
      "display_name": "John Doe",
      "work_mode": "ready",
      "last_updated": "2025-01-15T14:30:00Z",
      "active_chats": 2,
      "max_chats": 5
    }
  ]
}
```

### Staff User Management

#### **GET** `/api/staff/ticket-users`
Get users for ticket assignment and management.

---

## 6. Admin System APIs

### Chat Administration

#### **GET** `/api/admin/chat/settings`
Get chat system configuration.

**Permissions**: `admin.manage_chat`

**Response:**
```json
{
  "settings": {
    "giphy_api_key": "configured",
    "rate_limit_messages_per_minute": 10,
    "rate_limit_gifs_per_hour": 50,
    "max_message_length": 2000,
    "file_upload_enabled": true,
    "max_file_size_mb": 25,
    "allowed_file_types": [".jpg", ".png", ".pdf", ".docx"]
  }
}
```

#### **PUT** `/api/admin/chat/settings`
Update chat system settings.

#### **GET** `/api/admin/chat/stats`
Chat system analytics and statistics.

**Response:**
```json
{
  "stats": {
    "total_messages": 15420,
    "active_users": 42,
    "channels_count": 8,
    "messages_today": 234,
    "peak_concurrent_users": 28,
    "storage_used_mb": 145.7
  }
}
```

#### **GET** `/api/admin/chat/users`
Chat user management interface.

#### **POST** `/api/admin/chat/users/force-logout`
Force logout specific chat users.

#### **POST** `/api/admin/chat/users/block`
Block or unblock users from chat system.

#### **GET** `/api/admin/chat/messages`
Advanced message monitoring with filtering and pagination.

**Permissions**: `chat.monitor_all` or `chat.view_all_messages`

**Query Parameters:**
- `channel_id`: Filter by channel
- `user_id`: Filter by user  
- `time_range`: `1h`, `24h`, `7d`, `30d`, `all`
- `message_type`: Filter by message type
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "channel_id": 1,
      "user_id": "jdoe",
      "message_text": "Hello team!",
      "message_type": "text",
      "created_at": "2025-01-15T14:30:00Z",
      "channel_name": "general",
      "user_display_name": "John Doe"
    }
  ],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "channels": [{"id": 1, "name": "general", "type": "public_channel"}],
    "users": [{"username": "jdoe", "display_name": "John Doe"}]
  }
}
```

#### **GET** `/api/admin/chat/messages/export`
Export chat messages as CSV or JSON.

**Permissions**: `chat.monitor_all`

**Query Parameters:**
- `format`: `csv` or `json`
- `channel_id`, `user_id`, `time_range`: Same as messages API

**Response:** File download with proper content-type headers

#### **GET** `/api/admin/chat/widget-settings`
Get chat widget configuration.

**Response:**
```json
{
  "widget_enabled": true,
  "widget_position": "bottom-right",
  "widget_shape": "round",
  "widget_primary_color": "#007bff",
  "widget_button_image": "data:image/png;base64,...",
  "widget_default_state": "minimized",
  "show_unread_badges": true,
  "notification_sounds_enabled": true,
  "read_receipts_enabled": true,
  "typing_indicators_enabled": true
}
```

#### **PUT** `/api/admin/chat/widget-settings`
Update chat widget configuration.

#### **GET** `/api/admin/websocket-settings`
Get WebSocket system configuration.

**Response:**
```json
{
  "websocket_unlimited_mode": false
}
```

#### **PUT** `/api/admin/websocket-settings`
Update WebSocket configuration including unlimited mode toggle.

#### **GET** `/api/admin/chat/theme-settings`
Get chat theming system configuration.

#### **PUT** `/api/admin/chat/theme-settings`
Update chat theme settings and user assignments.

#### **GET** `/api/admin/chat/theme-analytics`
Get theme usage analytics.

#### **POST** `/api/admin/chat/force-theme-compliance`
Force all users to use compliant themes.

### Public Portal Administration

#### **GET** `/api/admin/public-portal/settings`
Get public portal chat configuration.

**Response:**
```json
{
  "widget_settings": {
    "enabled": true,
    "shape": "round",
    "color": "#007bff",
    "position": "bottom-right",
    "text": "Need Help?",
    "animation": "pulse"
  },
  "chat_settings": {
    "business_hours_enabled": true,
    "welcome_message": "Hi! How can we help you today?",
    "offline_message": "We're currently offline. Please leave a message.",
    "session_recovery_enabled": true,
    "auto_ticket_creation": false
  }
}
```

#### **PUT** `/api/admin/public-portal/settings`
Update public portal configuration.

#### **GET** `/api/admin/public-portal/recovery-settings`
Get session recovery configuration.

#### **GET** `/api/admin/public-portal/work-mode-settings`
Get staff work mode system configuration.

#### **PUT** `/api/admin/public-portal/work-mode-settings`
Update work mode settings and policies.

### Tables Management

#### **GET** `/api/admin/tables-configs`
Get table view configurations.

#### **GET** `/api/admin/tables-views`
Get available table views for admin interface.

#### **GET** `/api/admin/table-data`
Get table data with advanced filtering and sorting.

---

## 7. Developer/Management APIs

### User Management

#### **GET** `/api/developer/users`
Get all system users with filtering.

**Permissions**: `admin.manage_users`

**Query Parameters:**
- `role`: Filter by role
- `active`: Filter by active status
- `search`: Search by name/username/email

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "john.doe",
      "display_name": "John Doe",
      "email": "john.doe@example.com",
      "role_id": "user",
      "role_name": "User",
      "active": true,
      "created_at": "2024-12-01T10:00:00Z",
      "last_login": "2025-01-15T08:30:00Z",
      "permissions": ["ticket.view_own", "chat.send_messages"]
    }
  ],
  "total": 156,
  "roles_summary": {
    "admin": 3,
    "manager": 12,
    "support": 28,
    "user": 113
  }
}
```

#### **POST** `/api/developer/users`
Create new system user.

**Request:**
```json
{
  "username": "new.user",
  "display_name": "New User",
  "email": "new.user@example.com",
  "password": "temporarypassword123",
  "role_id": "user",
  "employee_number": "E789456",
  "office": "IT Support Office"
}
```

#### **PUT** `/api/developer/users`
Update user information and permissions.

#### **POST** `/api/developer/users/reset-password`
Reset user password (admin function).

### System Configuration

#### **GET** `/api/developer/roles`
Get system roles and their permissions.

**Response:**
```json
{
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system access",
      "permissions": [
        "admin.manage_users",
        "admin.system_settings",
        "ticket.manage_all",
        "chat.manage_channels"
      ],
      "user_count": 3
    }
  ]
}
```

#### **GET** `/api/developer/teams`
Get team configurations.

#### **GET** `/api/developer/support-teams`
Get support teams for public portal.

#### **GET** `/api/developer/categories`
Get ticket categories and classification system.

#### **GET** `/api/developer/sections`
Get organizational sections for user assignment.

#### **GET** `/api/developer/dpss-org`
Get DPSS organizational structure (offices, bureaus, divisions).

#### **GET** `/api/developer/request-types`
Get available request types for each category.

#### **GET** `/api/developer/subcategories`
Get detailed subcategories for ticket classification.

#### **GET** `/api/developer/response-templates`
Get automated response templates.

#### **GET** `/api/developer/sla-configurations`
Get SLA (Service Level Agreement) configurations.

#### **GET** `/api/developer/work-mode-analytics`
Get analytics for staff work mode system usage.

**Response:**
```json
{
  "analytics": {
    "current_status_distribution": {
      "ready": 15,
      "away": 5,
      "ticketing": 3,
      "helping": 7
    },
    "mode_changes_today": 45,
    "average_ready_time_hours": 6.5,
    "most_active_users": [
      {"username": "jdoe", "mode_changes": 8, "ready_percentage": 85}
    ]
  }
}
```

### System Settings

#### **GET** `/api/developer/settings`
Get comprehensive system settings.

**Response:**
```json
{
  "settings": {
    "maintenance_mode": false,
    "maintenance_message": "",
    "email_notifications_enabled": true,
    "smtp_configured": true,
    "backup_enabled": true,
    "log_level": "info",
    "session_timeout_hours": 8,
    "password_policy": {
      "min_length": 8,
      "require_uppercase": true,
      "require_numbers": true,
      "require_special_chars": false
    }
  }
}
```

#### **POST** `/api/developer/settings`
Update system settings.

#### **POST** `/api/developer/settings/test-email`
Test email configuration.

### Analytics & Reporting

#### **GET** `/api/developer/stats`
Comprehensive system statistics.

**Response:**
```json
{
  "stats": {
    "tickets": {
      "total": 1247,
      "open": 89,
      "resolved_this_month": 156,
      "average_resolution_time_hours": 18.5
    },
    "users": {
      "total": 156,
      "active_last_30_days": 98,
      "new_this_month": 12
    },
    "chat": {
      "messages_today": 234,
      "active_channels": 8,
      "users_online": 23
    },
    "system": {
      "uptime_days": 45,
      "database_size_mb": 247.8,
      "backup_last_run": "2025-01-14T02:00:00Z"
    }
  }
}
```

### Data Management

#### **GET** `/api/developer/data-management/export`
Export system data for backup or migration.

#### **POST** `/api/developer/data-management/import`
Import data from external sources.

#### **GET** `/api/developer/backup`
Get backup status and history.

#### **POST** `/api/developer/backup`
Create system backup.

---

## 8. Achievement System APIs

### Achievement Management (Admin Only)

#### **GET** `/api/admin/achievements`
Get all achievements with unlock statistics.

**Permissions**: `admin.manage_users` OR `admin.system_settings`

**Response:**
```json
{
  "success": true,
  "achievements": [
    {
      "id": "achievement_1234567890",
      "name": "Ticket Master",
      "description": "Complete 100 tickets",
      "category": "productivity",
      "rarity": "rare",
      "icon": "🎯",
      "icon_type": "emoji",
      "xp_reward": 500,
      "criteria_type": "ticket_count",
      "criteria_value": 100,
      "criteria_data": "{}",
      "toast_config": "{}",
      "display_order": 1,
      "active_from": null,
      "active_until": null,
      "custom_css": "",
      "active": true,
      "unlocked_count": 25,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### **POST** `/api/admin/achievements`
Create new achievement.

**Permissions**: `admin.manage_users` OR `admin.system_settings`

**Request:**
```json
{
  "id": "achievement_1234567890",
  "name": "Team Player",
  "description": "Collaborate on 10 tickets with team members",
  "category": "collaboration",
  "rarity": "uncommon",
  "icon": "🤝",
  "icon_type": "emoji",
  "xp_reward": 200,
  "criteria_type": "team_collaboration",
  "criteria_value": 10,
  "criteria_data": "{}",
  "toast_config": "{\"animation\": {\"entry\": \"bounce\"}}",
  "active_from": null,
  "active_until": null,
  "custom_css": "",
  "active": true
}
```

#### **GET** `/api/admin/achievements/[id]`
Get specific achievement with unlock count.

#### **PUT** `/api/admin/achievements/[id]`
Update complete achievement (all fields).

#### **PATCH** `/api/admin/achievements/[id]`
Update specific achievement fields only.

**Request Example:**
```json
{
  "active": false,
  "xp_reward": 150
}
```

#### **DELETE** `/api/admin/achievements/[id]`
Soft delete achievement (sets active = false).

### Achievement Configuration

#### **GET** `/api/admin/achievements/stats`
Get achievement dashboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalAchievements": 25,
    "activeAchievements": 22,
    "totalUnlocks": 1247,
    "usersWithAchievements": 89
  }
}
```

#### **GET** `/api/admin/achievements/dashboard-settings`
Get user dashboard configuration settings.

**Response:**
```json
{
  "layout": {
    "showStatsCards": true,
    "showProgressBar": true,
    "showRecentAchievements": true,
    "showActivityHeatmap": true,
    "showLeaderboard": true,
    "showUpcomingMilestones": true,
    "showAchievementGallery": true,
    "showPersonalStats": true
  },
  "display": {
    "achievementsPerPage": 12,
    "animationsEnabled": true,
    "showXPValues": true,
    "showRarityColors": true,
    "compactMode": false,
    "darkModeDefault": false
  },
  "privacy": {
    "showPublicProfile": true,
    "shareProgressWithTeam": true,
    "showInLeaderboards": true,
    "allowBadgeSharing": true
  },
  "notifications": {
    "enableAchievementNotifications": true,
    "enableMilestoneAlerts": true,
    "enableWeeklyDigest": false,
    "enableTeamComparisons": true
  },
  "customization": {
    "allowThemeSelection": true,
    "allowLayoutCustomization": false,
    "maxCustomAchievements": 5,
    "enablePersonalGoals": true
  }
}
```

#### **POST** `/api/admin/achievements/dashboard-settings`
Update user dashboard configuration.

#### **GET** `/api/admin/achievements/toast-config`
Get toast notification configuration.

**Response:**
```json
{
  "duration": 5000,
  "position": "top-right",
  "animation": {
    "entry": "slide",
    "exit": "slide",
    "duration": 400
  },
  "style": {
    "borderRadius": 8,
    "shadow": "lg",
    "blur": false,
    "glow": false,
    "gradient": "from-blue-500 to-purple-600"
  },
  "sound": {
    "enabled": true,
    "volume": 50,
    "file": "achievement.mp3"
  }
}
```

#### **POST** `/api/admin/achievements/toast-config`
Update toast notification configuration.

**Valid Values:**
- **Categories**: `productivity`, `quality`, `collaboration`, `special`, `custom`
- **Rarities**: `common`, `uncommon`, `rare`, `epic`, `legendary`
- **Icon Types**: `emoji`, `lucide`, `material`, `custom_svg`
- **Criteria Types**: `ticket_count`, `streak_days`, `template_usage`, `category_diversity`, `time_saved`, `team_collaboration`, `special_event`, `custom`
- **Toast Positions**: `top-right`, `top-center`, `top-left`, `bottom-right`, `bottom-center`, `bottom-left`
- **Toast Animations**: `slide`, `fade`, `scale`, `bounce`

---

## 9. Public Portal APIs

### Public Portal Widget

#### **GET** `/api/public-portal/widget-settings`
Get public portal widget configuration.

**Response:**
```json
{
  "enabled": true,
  "shape": "round",
  "color": "#007bff",
  "position": "bottom-right",
  "text": "Need Help?",
  "animation": "pulse",
  "business_hours_enabled": true,
  "welcome_message": "Hi! How can we help you today?",
  "offline_message": "We're currently offline. Please leave a message."
}
```

#### **GET** `/api/public-portal/widget-status`
Check if public portal widget should be displayed.

**Response:**
```json
{
  "enabled": true,
  "within_business_hours": true,
  "staff_available": true,
  "estimated_wait_minutes": 3,
  "queue_position": null
}
```

#### **GET** `/api/public-portal/available-agents`
Get list of available support agents for chat.

**Response:**
```json
{
  "available_agents": [
    {
      "id": "agent_1",
      "display_name": "Support Agent",
      "status": "available",
      "queue_count": 2
    }
  ],
  "total_available": 1,
  "estimated_wait_time": 120
}
```

### Public Chat System

#### **GET** `/api/public-portal/chat/start-session`
Get guest chat session information.

#### **POST** `/api/public-portal/chat/start-session`
Start a new guest chat session.

**Request:**
```json
{
  "guest_name": "John Visitor",
  "guest_email": "john@example.com",
  "initial_message": "I need help with login issues"
}
```

#### **GET** `/api/public-portal/chat/messages`
Get messages for guest chat session.

#### **POST** `/api/public-portal/chat/messages`
Send message in guest chat session.

#### **DELETE** `/api/public-portal/chat/messages`
Delete guest chat messages (cleanup).

#### **POST** `/api/public-portal/chat/auto-assign`
Auto-assign guest to available agent.

#### **POST** `/api/public-portal/chat/reconnect-session`
Reconnect to existing guest chat session.

#### **POST** `/api/public-portal/chat/return-to-queue`
Return guest to waiting queue.

### Public Queue Management

#### **GET** `/api/public-portal/queue/guests`
Get guest waiting queue status.

#### **POST** `/api/public-portal/queue/guests/remove`
Remove guest from waiting queue.

#### **GET** `/api/public-portal/queue/staff`
Get staff view of guest queue.

#### **GET** `/api/public-portal/staff/active-chats`
Get active guest chat sessions for staff.

### Public Chat Messages

#### **GET** `/api/public-chat/messages/[sessionId]`
Get messages for specific guest session.

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "session_id": "session_abc",
      "sender_type": "guest",
      "sender_name": "John Visitor",
      "message": "I need help with login",
      "timestamp": "2025-08-31T10:00:00Z"
    }
  ],
  "session_active": true,
  "agent_assigned": "agent_1"
}
```

---

## 9. Developer Portal APIs

### System Management

#### **GET** `/api/developer/analytics`
Get comprehensive system analytics.

**Permissions**: `admin.view_analytics`

#### **GET** `/api/developer/stats`
Get system statistics and performance metrics.

**Permissions**: `admin.view_analytics`

#### **GET** `/api/developer/settings`
Get current system configuration settings.

**Permissions**: `admin.system_settings`

#### **PUT** `/api/developer/settings`
Update system configuration settings.

**Permissions**: `admin.system_settings`

#### **POST** `/api/developer/settings/test-email`
Test email configuration and connectivity.

**Permissions**: `admin.system_settings`

### Data Management

#### **GET** `/api/developer/backup`
Get backup status and history.

**Permissions**: `admin.manage_backup`

#### **POST** `/api/developer/backup`
Create system backup.

**Permissions**: `admin.manage_backup`

#### **GET** `/api/developer/backup/download`
Download backup file.

**Permissions**: `admin.manage_backup`

#### **POST** `/api/developer/data-management/export`
Export system data in various formats.

**Permissions**: `admin.manage_backup`

#### **POST** `/api/developer/data-management/import`
Import data into the system.

**Permissions**: `admin.manage_backup`

### Entity Management

#### **GET/POST/PUT/DELETE** `/api/developer/categories`
Complete CRUD operations for ticket categories.

**Permissions**: `admin.manage_categories`

#### **GET/POST/PUT/DELETE** `/api/developer/request-types`
Manage request types within categories.

**Permissions**: `admin.manage_categories`

#### **GET/POST/PUT/DELETE** `/api/developer/subcategories`
Manage detailed subcategories.

**Permissions**: `admin.manage_categories`

#### **GET/POST/PUT/DELETE** `/api/developer/support-teams`
Manage support team configurations.

**Permissions**: `admin.manage_teams`

#### **GET/POST/PUT/DELETE** `/api/developer/teams`
Manage internal working teams.

**Permissions**: `admin.manage_teams`

#### **GET** `/api/developer/teams/[id]/users`
Get users assigned to specific team.

**Permissions**: `admin.manage_teams`

### User Management

#### **GET/POST/PUT/DELETE** `/api/developer/users`
Complete user lifecycle management.

**Permissions**: `admin.manage_users`

#### **POST** `/api/developer/users/reset-password`
Reset user password administratively.

**Permissions**: `admin.manage_users`

#### **GET/POST/PUT/DELETE** `/api/developer/roles`
Manage user roles and permissions.

**Permissions**: `admin.manage_users`

### Organizational Structure

#### **GET/POST/PUT/DELETE** `/api/developer/sections`
Manage DPSS organizational sections.

**Permissions**: `admin.manage_organization`

#### **GET/POST/PUT/DELETE** `/api/developer/dpss-org`
Manage complete DPSS organizational hierarchy.

**Permissions**: `admin.manage_organization`

### Configuration Management

#### **GET/PUT/POST** `/api/developer/portal-settings`
Manage public portal configuration.

**Permissions**: `admin.system_settings`

#### **GET/POST/PUT/DELETE** `/api/developer/response-templates`
Manage automated response templates.

**Permissions**: `admin.system_settings`

#### **GET/POST/PUT/DELETE** `/api/developer/sla-configurations`
Manage service level agreement configurations.

**Permissions**: `admin.system_settings`

#### **GET** `/api/developer/work-mode-analytics`
Analytics for staff work mode efficiency.

**Permissions**: `admin.view_analytics`

---

## 10. Utility & Reference APIs

### Data Reference

#### **GET** `/api/ticket-data/organization`
Get DPSS organizational hierarchy for forms.

**Response:**
```json
{
  "locations": [
    {
      "name": "Bureau of Human Resources",
      "offices": [
        {
          "name": "IT Security Office",
          "bureaus": [
            {
              "name": "Network Security Bureau",
              "divisions": [
                {
                  "name": "Infrastructure Division",
                  "sections": ["Network Operations Section"]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

#### **GET** `/api/ticket-data/categories`
Get ticket categories for dropdown forms.

#### **GET** `/api/users/assignable`
Get users available for ticket assignment.

#### **GET** `/api/ticket-data/support-teams`
Get public portal support teams for routing.

#### **GET** `/api/categories`
Get simplified ticket categories for public forms.

### User Utilities

#### **GET** `/api/users/profile-picture`
Get user's profile picture.

#### **POST** `/api/users/profile-picture`
Upload/update user profile picture.

---

## 11. System Monitoring APIs

### Application Health

#### **GET** `/api/health`
API health check and status.

**Response:**
```json
{
  "success": true,
  "message": "Orvale Management System API is running",
  "timestamp": "2025-08-31T10:00:00Z",
  "version": "1.0.0"
}
```

#### **GET** `/api/system-info`
Detailed system information and diagnostics.

**Permissions**: `admin.system_settings`

#### **GET** `/api/maintenance/status`
Check maintenance mode status.

#### **POST** `/api/maintenance/status`
Enable/disable maintenance mode.

**Permissions**: `admin.system_settings`

### Socket Server Management

#### **GET** `/api/socket-server/status`
Get Socket.io server status and connection count.

**Permissions**: `admin.system_settings`

**Response:**
```json
{
  "status": "running",
  "port": 3001,
  "connected_clients": 25,
  "uptime_seconds": 86400
}
```

#### **POST** `/api/socket-server/restart`
Restart Socket.io server for maintenance.

**Permissions**: `admin.system_settings`

### System Utilities

#### **GET** `/api/data-backup`
Initiate system data backup.

**Permissions**: `admin.system_settings`

#### **GET** `/api/system/stats`
Get comprehensive system statistics.

**Permissions**: `admin.view_analytics`

**Response:**
```json
{
  "tickets": {
    "total": 1250,
    "open": 45,
    "in_progress": 32
  },
  "users": {
    "total": 156,
    "active_today": 87
  },
  "chat": {
    "messages_today": 320,
    "active_channels": 12
  }
}
```

#### **GET** `/api/system-info`
Detailed system information and diagnostics.

**Permissions**: `admin.system_settings`

#### **GET** `/api/system/init`
System initialization status.

**Permissions**: `admin.system_settings`

#### **POST** `/api/system/init`
Initialize or reset system components.

**Permissions**: `admin.system_settings`

#### **GET** `/api/debug/maintenance`
Maintenance mode debugging information.

**Permissions**: `admin.system_settings`

#### **GET** `/api/test-logging`
Test system logging functionality.

**Permissions**: `admin.system_settings`

#### **GET** `/api/security/test`
Security system testing endpoint.

**Permissions**: `admin.system_settings`

#### **POST** `/api/security/test`
Execute security tests and validations.

**Permissions**: `admin.system_settings`

---

## Authentication & Permissions

### JWT Token Format
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission Categories (104 total permissions)

#### **Chat Permissions (21)**
- `chat.access_channels` - Basic chat access
- `chat.send_messages` - Send chat messages  
- `chat.send_files` - Upload and share files
- `chat.create_channels` - Create new channels
- `chat.manage_channels` - Edit/delete channels
- `chat.create_direct` - Create direct messages
- `chat.create_groups` - Create group chats
- `chat.manage_messages` - Edit/delete any messages
- `chat.view_all_channels` - Access all channels
- `chat.view_all_messages` - Monitor all messages (admin)
- `chat.monitor_all` - Advanced message monitoring
- `chat.moderate` - Moderate chat content
- `chat.manage_system` - Chat system administration
- `chat.customize_widget` - Customize chat widget
- And 7 more...

#### **Ticket Permissions (25)**
- `ticket.view_own` - View own tickets
- `ticket.view_team` - View team tickets
- `ticket.view_all` - View all tickets
- `ticket.create` - Create new tickets
- `ticket.create_for_users` - Create tickets for other users
- `ticket.assign_within_team` - Assign tickets within team
- `ticket.assign_cross_team` - Assign tickets across teams
- `ticket.manage_escalated` - Handle escalated tickets
- `ticket.close` - Close tickets
- `ticket.reopen` - Reopen closed tickets
- And 15 more...

#### **Admin Permissions (20)**
- `admin.manage_users` - User management
- `admin.system_settings` - System configuration
- `admin.manage_teams` - Team management
- `admin.manage_roles` - Role and permission management
- `admin.view_analytics` - System analytics
- `admin.manage_backup` - Backup management
- And 14 more...

#### **Staff Permissions (8)**
- `staff.view_all_work_modes` - View all staff work mode statuses
- `staff.manage_work_modes` - Manage work mode settings
- `staff.create_tickets` - Create staff-generated tickets
- `staff.upload_attachments` - Upload ticket attachments
- `staff.access_analytics` - Access staff analytics
- And 3 more...

#### **Helpdesk Permissions (10)**
- `helpdesk.multi_queue_access` - Access multi-team queue
- `helpdesk.assign_cross_team` - Cross-team assignment
- `helpdesk.escalate_tickets` - Escalate tickets
- And 7 more...

### Error Responses

All APIs return standardized error responses:

```json
{
  "error": "Authentication failed",
  "code": 401,
  "details": "Invalid or expired token",
  "timestamp": "2025-01-15T14:30:00Z"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## WebSocket Events (Chat System)

In addition to REST APIs, the chat system uses WebSocket connections for real-time features:

**Connection**: `ws://localhost:3001` with JWT authentication

### Client → Server Events
1. `join_channel` - Join a chat channel
2. `leave_channel` - Leave a chat channel  
3. `send_message` - Send chat message
4. `typing_start` - Start typing indicator
5. `typing_stop` - Stop typing indicator
6. `update_presence` - Update user status

### Server → Client Events  
7. `message_received` - New message broadcast
8. `user_joined` - User joined channel
9. `user_left` - User left channel
10. `user_typing` - Typing indicator
11. `presence_updated` - User status changed

---

## Rate Limits

- **Chat Messages**: 10 messages per minute per user
- **GIF Searches**: 50 searches per hour per user  
- **API Requests**: 1000 requests per hour per user
- **File Uploads**: 25MB max file size, 10 files per hour

---

## Changelog

**Version 1.3.1** - August 31, 2025
- **AUDIT**: Comprehensive codebase scan completed - **123 endpoints verified** across **16 functional areas**
- **ADDED**: Missing endpoints documented - Socket server management, system utilities, application health
- **ENHANCED**: Complete API service mapping for single gateway migration
- **VALIDATION**: All endpoints cross-referenced with actual codebase implementation
- **DOCUMENTATION**: Updated service mapping and migration plan with validated endpoint count

**Version 1.3.0** - August 30, 2025
- **NEW**: Achievement System APIs (`/api/admin/achievements/*`) - Complete gamification system
- **NEW**: Admin-managed achievement creation and customization 
- **NEW**: Toast notification configuration APIs
- **NEW**: Dashboard settings management for user achievement displays
- **NEW**: Achievement statistics and analytics endpoints
- **ADDED**: 9 pre-installed achievements with XP rewards (3,270 total XP)
- **ADDED**: Icon picker support (emoji + Lucide icons)
- **ADDED**: Achievement rarity system (common to legendary)
- **UPDATED**: API count increased to 130+ endpoints across 13 functional areas

**Version 1.2.0** - January 26, 2025
- **NEW**: File sharing APIs for chat messages (`/api/chat/files/*`)
- **NEW**: Staff management APIs (`/api/staff/*`)
- **NEW**: Public portal widget APIs (`/api/public-portal/*`)
- **NEW**: Advanced chat administration APIs (`/api/admin/chat/*`)
- **NEW**: Message monitoring and export APIs
- **EXPANDED**: Chat theming and widget customization APIs
- **EXPANDED**: WebSocket management and unlimited mode controls
- **EXPANDED**: Work mode system for staff management
- **UPDATED**: Permission system expanded to 104 permissions
- **UPDATED**: Chat permissions include file sharing capabilities

**Version 1.0.0** - January 2025
- Initial API documentation
- Chat system APIs complete
- Ticketing system APIs complete
- Authentication and RBAC system
- WebSocket real-time features
- Comprehensive permission system (86 permissions)

---

*This documentation covers all **123 verified API endpoints** across **16 functional areas** in the Orvale Management System. Comprehensive audit completed August 31, 2025. For implementation details, see the corresponding route files in `/app/api/`.*