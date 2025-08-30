import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { queryAsync } from '@/lib/database';

interface DatabaseTable {
  name: string;
  label: string;
  description: string;
  rowCount: number;
  permissions: string[];
  category: string;
}

// Categorize tables and define their access permissions
const TABLE_CATEGORIES = {
  // Core Business Tables
  'user_tickets': { category: 'Tickets', permissions: ['tables.view_config', 'ticket.view_all'], description: 'Main support tickets' },
  'ticket_categories': { category: 'Tickets', permissions: ['tables.view_config', 'portal.manage_templates'], description: 'Ticket categories and types' },
  'ticket_comments': { category: 'Tickets', permissions: ['tables.view_config', 'ticket.view_all'], description: 'Comments on tickets' },
  'ticket_history': { category: 'Tickets', permissions: ['tables.view_config', 'ticket.view_history'], description: 'Ticket change history' },
  'ticket_attachments': { category: 'Tickets', permissions: ['tables.view_config', 'ticket.view_all'], description: 'File attachments on tickets' },
  
  // User & Team Management
  'users': { category: 'Users', permissions: ['tables.view_config', 'admin.view_users'], description: 'System users and authentication' },
  'teams': { category: 'Users', permissions: ['tables.view_config', 'admin.view_teams'], description: 'Internal teams for ticket processing' },
  'roles': { category: 'Users', permissions: ['tables.view_config', 'admin.view_roles'], description: 'User roles and permissions' },
  'role_permissions': { category: 'Users', permissions: ['tables.view_config', 'admin.view_roles'], description: 'Role permission assignments' },
  'support_teams': { category: 'Users', permissions: ['tables.view_config', 'portal.manage_settings'], description: 'Public portal team options' },
  'support_team_groups': { category: 'Users', permissions: ['tables.view_config', 'portal.manage_settings'], description: 'Support team groupings' },
  
  // Organization Structure
  'dpss_offices': { category: 'Organization', permissions: ['tables.view_config', 'admin.view_organization'], description: 'DPSS office structure' },
  'dpss_bureaus': { category: 'Organization', permissions: ['tables.view_config', 'admin.view_organization'], description: 'DPSS bureau structure' },
  'dpss_divisions': { category: 'Organization', permissions: ['tables.view_config', 'admin.view_organization'], description: 'DPSS division structure' },
  'dpss_sections': { category: 'Organization', permissions: ['tables.view_config', 'admin.view_organization'], description: 'DPSS section structure' },
  'sections': { category: 'Organization', permissions: ['tables.view_config', 'admin.view_organization'], description: 'Legacy sections table' },
  
  // Chat System
  'chat_channels': { category: 'Chat', permissions: ['tables.view_config', 'chat.manage_channels'], description: 'Chat channels and groups' },
  'chat_messages': { category: 'Chat', permissions: ['tables.view_config', 'chat.view_all_messages'], description: 'All chat messages' },
  'chat_channel_members': { category: 'Chat', permissions: ['tables.view_config', 'chat.manage_channels'], description: 'Channel membership data' },
  'chat_files': { category: 'Chat', permissions: ['tables.view_config', 'chat.upload_files'], description: 'Chat file uploads' },
  
  // Public Portal & Queue
  'public_chat_sessions': { category: 'Public Portal', permissions: ['tables.view_config', 'public_portal.view_all_sessions'], description: 'Public chat sessions' },
  'public_chat_messages': { category: 'Public Portal', permissions: ['tables.view_config', 'public_portal.view_all_sessions'], description: 'Public chat messages' },
  'staff_work_modes': { category: 'Public Portal', permissions: ['tables.view_config', 'public_portal.view_realtime_queue'], description: 'Staff availability modes' },
  
  // System Configuration
  'portal_settings': { category: 'System', permissions: ['tables.view_config', 'portal.view_settings'], description: 'Public portal configuration' },
  'system_settings': { category: 'System', permissions: ['tables.view_config', 'admin.system_settings'], description: 'System-wide settings' },
  'system_settings_audit': { category: 'System', permissions: ['tables.view_config', 'admin.system_settings'], description: 'System settings change log' },
  
  // Analytics & Logs
  'backup_log': { category: 'Analytics', permissions: ['tables.view_config', 'admin.system_settings'], description: 'Database backup history' },
  'call_logs': { category: 'Analytics', permissions: ['tables.view_config', 'call.view_all_logs'], description: 'Audio/video call logs' },
  'theme_usage_analytics': { category: 'Analytics', permissions: ['tables.view_config', 'chat.view_analytics'], description: 'Theme usage statistics' },
  'gif_usage_log': { category: 'Analytics', permissions: ['tables.view_config', 'chat.view_analytics'], description: 'GIF usage tracking' },
};

// Tables that should be hidden from general access (system-only)
const HIDDEN_TABLES = new Set([
  'sqlite_sequence',
  'gif_rate_limits', // Rate limiting data
  'comment_read_status', // Internal read tracking
  'public_chat_sessions_backup', // Backup table
  'public_chat_typing_status', // Real-time typing data
  'user_presence', // Real-time presence data
  'widget_animations', // UI animation settings
]);

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check basic permissions
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all database tables
    const allTables = await queryAsync(
      `SELECT name FROM sqlite_master 
       WHERE type='table' 
       AND name NOT LIKE 'sqlite_%' 
       ORDER BY name`
    );

    console.log('🗄️ Discovered', allTables.length, 'database tables');

    // Process each table and get row counts
    const availableTables: DatabaseTable[] = [];
    const userPermissions = authResult.user.permissions || [];

    for (const tableRow of allTables) {
      const tableName = tableRow.name;
      
      // Skip hidden tables
      if (HIDDEN_TABLES.has(tableName)) {
        continue;
      }

      // Get table info
      const tableConfig = TABLE_CATEGORIES[tableName as keyof typeof TABLE_CATEGORIES];
      const category = tableConfig?.category || 'Other';
      const permissions = tableConfig?.permissions || ['tables.view_config'];
      const description = tableConfig?.description || `Database table: ${tableName}`;

      // Check if user has permission to view this table
      const hasPermission = permissions.some(permission => userPermissions.includes(permission));
      
      if (!hasPermission) {
        continue; // Skip tables user can't access
      }

      // Get row count
      let rowCount = 0;
      try {
        const countResult = await queryAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
        rowCount = countResult[0]?.count || 0;
      } catch (error) {
        console.log(`⚠️ Could not count rows in ${tableName}:`, error);
        rowCount = 0;
      }

      // Create human-readable label
      const label = tableName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      availableTables.push({
        name: tableName,
        label,
        description,
        rowCount,
        permissions,
        category
      });
    }

    // Group tables by category
    const tablesByCategory = availableTables.reduce((acc, table) => {
      if (!acc[table.category]) {
        acc[table.category] = [];
      }
      acc[table.category].push(table);
      return acc;
    }, {} as Record<string, DatabaseTable[]>);

    // Sort categories and tables within categories
    const sortedCategories = Object.keys(tablesByCategory).sort();
    sortedCategories.forEach(category => {
      tablesByCategory[category].sort((a, b) => b.rowCount - a.rowCount); // Sort by row count desc
    });

    console.log('✅ Returning', availableTables.length, 'accessible tables in', sortedCategories.length, 'categories');

    return NextResponse.json({
      success: true,
      tables: availableTables,
      tablesByCategory,
      summary: {
        totalTables: allTables.length,
        accessibleTables: availableTables.length,
        categories: sortedCategories.length,
        user: authResult.user.username,
        permissions: userPermissions.length
      }
    });

  } catch (error) {
    console.error('Error discovering database tables:', error);
    return NextResponse.json({ 
      error: 'Failed to discover database tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}