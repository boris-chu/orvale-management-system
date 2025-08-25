# Orvale Management System - API Documentation

> **Complete REST API Reference for Chat System, Ticketing System, and Administrative Functions**

## Overview

The Orvale Management System provides a comprehensive REST API with **80+ endpoints** across 8 functional areas. All APIs use JWT-based authentication with role-based access control (RBAC) supporting 86 granular permissions.

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
- `status` (optional): Filter by status (`online`, `away`, `busy`, `offline`)

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

## 5. Admin System APIs

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

### Tables Management

#### **GET** `/api/admin/tables-configs`
Get table view configurations.

#### **GET** `/api/admin/tables-views`
Get available table views for admin interface.

#### **GET** `/api/admin/table-data`
Get table data with advanced filtering and sorting.

---

## 6. Developer/Management APIs

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

## 7. Utility & Reference APIs

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

### User Utilities

#### **GET** `/api/users/profile-picture`
Get user's profile picture.

#### **POST** `/api/users/profile-picture`
Upload/update user profile picture.

---

## 8. System Monitoring APIs

#### **GET** `/api/health`
API health check and status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T14:30:00Z",
  "services": {
    "database": "connected",
    "socket_server": "running",
    "email": "configured",
    "backup": "scheduled"
  },
  "version": "1.0.0"
}
```

#### **GET** `/api/system-info`
Detailed system information and diagnostics.

#### **GET** `/api/maintenance/status`
Check maintenance mode status.

#### **POST** `/api/maintenance/status`
Enable/disable maintenance mode.

---

## Authentication & Permissions

### JWT Token Format
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permission Categories (86 total permissions)

#### **Chat Permissions (16)**
- `chat.send_messages` - Send chat messages
- `chat.create_channels` - Create new channels
- `chat.manage_channels` - Edit/delete channels
- `chat.create_direct` - Create direct messages
- `chat.create_groups` - Create group chats
- `chat.manage_messages` - Edit/delete any messages
- `chat.view_all_channels` - Access all channels
- `chat.moderate` - Moderate chat content
- And 8 more...

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

**Version 1.0.0** - January 2025
- Initial API documentation
- Chat system APIs complete
- Ticketing system APIs complete
- Authentication and RBAC system
- WebSocket real-time features
- Comprehensive permission system (86 permissions)

---

*This documentation covers all 80+ API endpoints in the Orvale Management System. For implementation details, see the corresponding route files in `/app/api/`.*