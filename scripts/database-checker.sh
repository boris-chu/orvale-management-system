#!/bin/bash

echo ""
echo "🔍 Orvale Management System - Database Structure Check"
echo ""
echo "================================================================================"

# Database path
DB="orvale_tickets.db"

# Get total table count
TABLE_COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
echo ""
echo "📊 Total Tables: $TABLE_COUNT"
echo ""

# Function to display tables in a category
display_category() {
    echo ""
    echo "$1"
    echo "--------------------------------------------------------------------------------"
    shift
    for table in "$@"; do
        ROW_COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        COL_COUNT=$(sqlite3 $DB "PRAGMA table_info($table);" 2>/dev/null | wc -l | xargs)
        if [ "$COL_COUNT" -gt 0 ]; then
            echo "  • $table ($ROW_COUNT rows) - $COL_COUNT columns"
        fi
    done
}

# Display tables by category
display_category "🔐 Authentication & Authorization Tables:" \
    "users" "roles" "role_permissions"

display_category "📋 Ticket Management Tables:" \
    "user_tickets" "ticket_history" "ticket_history_detailed" "ticket_sequences" \
    "ticket_comments" "ticket_comment_read_status"

display_category "🏢 Organization Structure Tables:" \
    "dpss_offices" "dpss_bureaus" "dpss_divisions" "dpss_sections" "sections" \
    "ticket_categories" "request_types" "subcategories" "implementations"

display_category "👥 Team Management Tables:" \
    "teams" "support_teams" "support_team_groups" "helpdesk_team_preferences"

display_category "⚙️ Configuration Tables:" \
    "portal_settings" "system_settings" "system_settings_audit" "theme_settings" \
    "theme_presets" "public_portal_config" "recovery_requests" "widget_positions"

display_category "💬 Chat System Tables:" \
    "chat_channels" "channel_members" "chat_messages" "message_read_status" \
    "channel_typing_status" "message_attachments" "pinned_messages" "call_logs"

display_category "🔧 System Tables:" \
    "backup_log" "staff_work_modes"

# Roles and Permissions Analysis
echo ""
echo ""
echo "👤 Roles & Permissions Analysis:"
echo "--------------------------------------------------------------------------------"

# Get all roles
sqlite3 $DB "SELECT id, name FROM roles;" | while IFS='|' read -r role_id role_name; do
    USER_COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM users WHERE role='$role_id';")
    PERM_COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM role_permissions WHERE role_id='$role_id';")
    
    echo ""
    echo "📌 $(echo $role_name | tr '[:lower:]' '[:upper:]') Role:"
    echo "   Users: $USER_COUNT"
    echo "   Permissions: $PERM_COUNT"
    
    # Get permission categories
    sqlite3 $DB "SELECT DISTINCT substr(permission_id, 1, instr(permission_id, '.') - 1) as category, COUNT(*) as count 
                 FROM role_permissions 
                 WHERE role_id='$role_id' 
                 GROUP BY category;" | while IFS='|' read -r category count; do
        echo "   $category: $count permissions"
    done
done

# Total unique permissions
TOTAL_PERMS=$(sqlite3 $DB "SELECT COUNT(DISTINCT permission_id) FROM role_permissions;")
echo ""
echo "📊 Total Unique Permissions: $TOTAL_PERMS"

# Team Analysis
echo ""
echo ""
echo "🏢 Team Analysis:"
echo "--------------------------------------------------------------------------------"

# Internal teams
ACTIVE_TEAMS=$(sqlite3 $DB "SELECT COUNT(*) FROM teams WHERE active=1;")
echo ""
echo "Internal Teams ($ACTIVE_TEAMS active):"
sqlite3 $DB "SELECT id, name FROM teams WHERE active=1;" | while IFS='|' read -r team_id team_name; do
    TICKET_COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM user_tickets WHERE assigned_team='$team_id';")
    echo "  • $team_name: $TICKET_COUNT tickets"
done

# Support teams
ACTIVE_SUPPORT=$(sqlite3 $DB "SELECT COUNT(*) FROM support_teams WHERE active=1;")
echo ""
echo "Public Portal Teams ($ACTIVE_SUPPORT active):"
sqlite3 $DB "SELECT name, label FROM support_teams WHERE active=1 LIMIT 10;" | while IFS='|' read -r name label; do
    echo "  • $label ($name)"
done

# Ticket Categories
echo ""
echo ""
echo "📂 Ticket Categories:"
echo "--------------------------------------------------------------------------------"
sqlite3 $DB "SELECT id, name FROM ticket_categories;" | while IFS='|' read -r cat_id cat_name; do
    RT_COUNT=$(sqlite3 $DB "SELECT COUNT(*) FROM request_types WHERE category_id='$cat_id';")
    echo "  • $cat_name: $RT_COUNT request types"
done

# Recent Activity
echo ""
echo ""
echo "📈 Recent Activity:"
echo "--------------------------------------------------------------------------------"

# Recent tickets
RECENT_TICKETS=$(sqlite3 $DB "SELECT COUNT(*) FROM user_tickets WHERE submitted_at > datetime('now', '-7 days');")
echo "  • Tickets created in last 7 days: $RECENT_TICKETS"

# Active users (we don't have last_login field)
ACTIVE_USERS=$(sqlite3 $DB "SELECT COUNT(*) FROM users WHERE active = 1;")
echo "  • Active users: $ACTIVE_USERS"

# Chat activity
RECENT_MESSAGES=$(sqlite3 $DB "SELECT COUNT(*) FROM chat_messages WHERE created_at > datetime('now', '-7 days');" 2>/dev/null || echo "0")
if [ "$RECENT_MESSAGES" == "0" ]; then
    echo "  • Chat system: Not yet active"
else
    echo "  • Chat messages in last 7 days: $RECENT_MESSAGES"
fi

echo ""
echo "================================================================================"
echo "✅ Database structure check complete!"
echo ""