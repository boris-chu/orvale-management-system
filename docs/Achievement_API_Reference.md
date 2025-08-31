# Achievement System API Reference

## 🔗 Quick Reference

### Authentication
All endpoints require `Authorization: Bearer <token>` header and admin permissions.

### Required Permissions
- `admin.manage_users` OR `admin.system_settings`

### Base URL
- Development: `http://localhost/api/admin/achievements`
- Production: `https://yourdomain.com/api/admin/achievements`

---

## ⚠️ Database Requirements

**CRITICAL**: Ensure all database columns exist before using the API:

```sql
-- Check if all columns exist
PRAGMA table_info(achievements);

-- Add missing columns if needed
ALTER TABLE achievements ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE achievements ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE achievements ADD COLUMN icon_type TEXT DEFAULT 'emoji';
ALTER TABLE achievements ADD COLUMN toast_config TEXT;
ALTER TABLE achievements ADD COLUMN active_from TIMESTAMP;
ALTER TABLE achievements ADD COLUMN active_until TIMESTAMP;
ALTER TABLE achievements ADD COLUMN created_by TEXT;
ALTER TABLE achievements ADD COLUMN updated_by TEXT;
ALTER TABLE achievements ADD COLUMN custom_css TEXT;
```

## 📊 Achievement Management

### GET `/api/admin/achievements`
Returns all achievements with unlock statistics.

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
      "active": true,
      "unlocked_count": 25,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### POST `/api/admin/achievements`
Create new achievement.

**Request Body:**
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

### GET `/api/admin/achievements/[id]`
Get specific achievement with unlock count.

### PUT `/api/admin/achievements/[id]`
Update complete achievement (all fields).

### PATCH `/api/admin/achievements/[id]`
Update specific fields only.

**Request Body Example:**
```json
{
  "active": false,
  "xp_reward": 150
}
```

### DELETE `/api/admin/achievements/[id]`
Soft delete achievement (sets active = false).

## 📈 Statistics

### GET `/api/admin/achievements/stats`
Get dashboard statistics.

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

## ⚙️ Configuration Management

### GET/POST `/api/admin/achievements/dashboard-settings`

**Configuration Structure:**
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

### GET/POST `/api/admin/achievements/toast-config`

**Toast Configuration:**
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

## 🎨 Valid Values

### Categories
- `productivity`
- `quality` 
- `collaboration`
- `special`
- `custom`

### Rarity Levels
- `common`
- `uncommon`
- `rare`
- `epic`
- `legendary`

### Icon Types
- `emoji`
- `lucide`
- `material`
- `custom_svg`

### Criteria Types
- `ticket_count`
- `streak_days`
- `template_usage`
- `category_diversity`
- `time_saved`
- `team_collaboration`
- `special_event`
- `custom`

### Toast Positions
- `top-right`
- `top-center`
- `top-left`
- `bottom-right`
- `bottom-center`
- `bottom-left`

### Toast Animations
- `slide`
- `fade`
- `scale`
- `bounce`

### Shadow Options
- `none`
- `sm`
- `md`
- `lg`
- `xl`

## 🔒 Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Achievement not found"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid configuration: missing layout section"
}
```

### 500 Server Error
```json
{
  "error": "Failed to save achievement"
}
```

## 🧪 Testing Examples

### Create Basic Achievement
```bash
curl -X POST http://localhost/api/admin/achievements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_achievement",
    "name": "Test Achievement",
    "description": "A test achievement",
    "category": "productivity",
    "rarity": "common",
    "icon": "✅",
    "xp_reward": 100,
    "criteria_type": "ticket_count",
    "criteria_value": 5
  }'
```

### Update Toast Configuration
```bash
curl -X POST http://localhost/api/admin/achievements/toast-config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 6000,
    "position": "top-center",
    "animation": {"entry": "bounce", "exit": "fade", "duration": 500},
    "style": {"glow": true, "shadow": "xl"},
    "sound": {"enabled": true, "volume": 75}
  }'
```

### Toggle Achievement Status
```bash
curl -X PATCH http://localhost/api/admin/achievements/achievement_123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

## ✅ System Verification

### Quick Health Check
```bash
# 1. Verify API server is running
curl http://localhost/api/health

# 2. Check database schema
sqlite3 orvale_tickets.db "PRAGMA table_info(achievements);" | wc -l
# Should return 21 (21 columns)

# 3. Verify default achievements exist
sqlite3 orvale_tickets.db "SELECT COUNT(*) FROM achievements;"
# Should return 9 or more

# 4. Test admin endpoint (requires valid token)
curl http://localhost/api/admin/achievements \
  -H "Authorization: Bearer <your_token>"
```

### Current System Status
- ✅ **Database Schema**: All required columns added and verified
- ✅ **Default Achievements**: 9 pre-installed achievements available  
- ✅ **API Endpoints**: All CRUD operations functional
- ✅ **Admin Interface**: 5-tab management system ready
- ✅ **React 19 Compatible**: Material-UI components throughout

### Expected Default Achievements
```sql
-- Verify all default achievements are present
SELECT id, name, category, rarity, xp_reward 
FROM achievements 
ORDER BY display_order;
```

**Should return**:
- first_steps, consistent_contributor, marathon_runner, centurion, efficiency_expert
- problem_solver, template_master, team_player, early_adopter

## 📋 Implementation Checklist

For developers implementing similar systems:

- [x] Database schema with admin-configurable fields
- [x] Material-UI components for React 19 compatibility  
- [x] Proper TypeScript interfaces and type safety
- [x] RBAC integration with permission checks
- [x] Audit logging for all admin operations
- [x] Live preview functionality for user experience
- [x] Configuration export/import capabilities
- [x] Comprehensive error handling and validation
- [x] Responsive design for mobile admin access
- [x] Integration with existing authentication system
- [x] **Schema migration handling for existing databases**