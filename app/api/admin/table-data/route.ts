import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

// Categorize tables and define their access permissions - SAME as database-tables API
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

// Common primary key patterns for auto-detection
const PRIMARY_KEY_PATTERNS = {
  'id': ['id'],
  'composite': ['table_id', 'user_id'], // For junction tables
  'username': ['username'], // For users table
  'name': ['name'] // For simple lookup tables
};

/**
 * Auto-detect primary key for a table
 */
async function detectPrimaryKey(tableName: string): Promise<string> {
  try {
    // Get table schema
    const schema = await queryAsync(`PRAGMA table_info(${tableName})`);
    
    // Look for explicit primary key
    const primaryKeyColumn = schema.find((col: any) => col.pk === 1);
    if (primaryKeyColumn) {
      return primaryKeyColumn.name;
    }
    
    // Fallback patterns
    const columnNames = schema.map((col: any) => col.name.toLowerCase());
    
    if (columnNames.includes('id')) return 'id';
    if (columnNames.includes('username')) return 'username';
    if (columnNames.includes('name')) return 'name';
    
    // Default to first column
    return schema[0]?.name || 'id';
  } catch (error) {
    console.error(`Failed to detect primary key for ${tableName}:`, error);
    return 'id';
  }
}

/**
 * Check if user has permission to access a table
 */
function hasTableAccess(tableName: string, userPermissions: string[]): boolean {
  // Skip hidden tables
  if (HIDDEN_TABLES.has(tableName)) {
    return false;
  }
  
  // Get table configuration
  const tableConfig = TABLE_CATEGORIES[tableName as keyof typeof TABLE_CATEGORIES];
  const permissions = tableConfig?.permissions || ['tables.view_config'];
  
  // Check if user has any of the required permissions
  return permissions.some(permission => userPermissions.includes(permission));
}

// Legacy hardcoded table config for backward compatibility
const LEGACY_TABLE_CONFIG = {
  'user_tickets': { primaryKey: 'id', label: 'User Tickets' },
  'users': { primaryKey: 'id', label: 'Users' },
  'teams': { primaryKey: 'id', label: 'Teams' },
  'support_teams': { primaryKey: 'id', label: 'Support Teams' },
  'ticket_categories': { primaryKey: 'id', label: 'Ticket Categories' },
  'dpss_offices': { primaryKey: 'id', label: 'DPSS Offices' },
  'portal_settings': { primaryKey: 'id', label: 'Portal Settings' },
  'system_settings': { primaryKey: 'setting_key', label: 'System Settings' }
};

// GET: Load table data with pagination and column info
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tableName) {
      return NextResponse.json({ 
        error: 'Table name is required' 
      }, { status: 400 });
    }

    // Check if table exists and user has access
    const userPermissions = authResult.user.permissions || [];
    
    // Verify table exists in database
    const tablesInDb = await queryAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ? AND name NOT LIKE 'sqlite_%'`,
      [tableName]
    );
    
    if (tablesInDb.length === 0) {
      return NextResponse.json({ 
        error: 'Table not found in database',
        table: tableName
      }, { status: 404 });
    }
    
    // Check permissions using dynamic logic
    const hasPermission = hasTableAccess(tableName, userPermissions);
    
    // Debug logging
    const tableConfig = TABLE_CATEGORIES[tableName as keyof typeof TABLE_CATEGORIES];
    console.log('🔍 Table Access Debug:', {
      table: tableName,
      user: authResult.user.username,
      requiredPermissions: tableConfig?.permissions || ['tables.view_config'],
      userPermissionsCount: userPermissions.length,
      hasAccess: hasPermission,
      category: tableConfig?.category || 'Unknown'
    });
    
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        required: tableConfig.permissions,
        userPermissions: userPermissions.length,
        debug: {
          user: authResult.user.username,
          table: tableName,
          hasTableViewConfig: userPermissions.includes('tables.view_config')
        }
      }, { status: 403 });
    }

    // Get table schema information
    const schemaInfo = await queryAsync(`PRAGMA table_info(${tableName})`);
    const columns = schemaInfo.map((col: any) => ({
      name: col.name,
      type: col.type,
      notNull: col.notnull === 1,
      defaultValue: col.dflt_value,
      pk: col.pk === 1
    }));

    // Get table data with pagination
    const countResult = await getAsync(`SELECT COUNT(*) as total FROM ${tableName}`) as { total: number };
    const rows = await queryAsync(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`, [limit, offset]);

    return NextResponse.json({
      success: true,
      data: {
        table: tableName,
        columns,
        rows,
        pagination: {
          total: countResult.total,
          limit,
          offset,
          hasMore: offset + limit < countResult.total
        }
      }
    });

  } catch (error) {
    console.error('Error loading table data:', error);
    return NextResponse.json({ 
      error: 'Failed to load table data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Update a single cell or row
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table, rowId, field, value } = body;

    if (!table) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Check if table exists and user has access
    const userPermissions = authResult.user.permissions || [];
    const hasPermission = hasTableAccess(table, userPermissions);
    
    if (!hasPermission) {
      const tableConfig = TABLE_CATEGORIES[table as keyof typeof TABLE_CATEGORIES];
      console.log('🔍 Permission Debug:', {
        table,
        user: authResult.user.username,
        required: tableConfig?.permissions || ['tables.view_config'],
        userPermissionsCount: userPermissions.length,
        hasTableViewConfig: userPermissions.includes('tables.view_config')
      });
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        required: tableConfig?.permissions || ['tables.view_config']
      }, { status: 403 });
    }

    // Auto-detect primary key for this table
    const primaryKey = await detectPrimaryKey(table);

    // Validate the field exists
    const schemaInfo = await queryAsync(`PRAGMA table_info(${table})`);
    const validFields = schemaInfo.map((col: any) => col.name);
    
    if (!validFields.includes(field)) {
      return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 });
    }

    // Update the specific field
    const updateQuery = `UPDATE ${table} SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE ${primaryKey} = ?`;
    const result = await runAsync(updateQuery, [value, rowId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'No rows updated. Record may not exist.' }, { status: 404 });
    }

    // Log the change
    console.log(`Table Editor: ${authResult.user.username} updated ${table}.${field} for ${primaryKey}=${rowId}`);

    return NextResponse.json({
      success: true,
      message: `Updated ${field} successfully`,
      changes: result.changes
    });

  } catch (error) {
    console.error('Error updating table data:', error);
    return NextResponse.json({ 
      error: 'Failed to update data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Create a new row
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table, rowData } = body;

    if (!table) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Check if table exists and user has access
    const userPermissions = authResult.user.permissions || [];
    const hasPermission = hasTableAccess(table, userPermissions);
    
    if (!hasPermission) {
      const tableConfig = TABLE_CATEGORIES[table as keyof typeof TABLE_CATEGORIES];
      console.log('🔍 Permission Debug:', {
        table,
        user: authResult.user.username,
        required: tableConfig?.permissions || ['tables.view_config'],
        userPermissionsCount: userPermissions.length,
        hasTableViewConfig: userPermissions.includes('tables.view_config')
      });
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        required: tableConfig?.permissions || ['tables.view_config']
      }, { status: 403 });
    }

    // Get table schema to validate fields
    const schemaInfo = await queryAsync(`PRAGMA table_info(${table})`);
    const validFields = schemaInfo.map((col: any) => col.name);
    
    // Filter rowData to only include valid fields and remove the temporary id
    const filteredData = Object.fromEntries(
      Object.entries(rowData)
        .filter(([key, value]) => validFields.includes(key) && !key.startsWith('new_'))
    );

    // Add metadata fields if they exist
    if (validFields.includes('created_at')) {
      filteredData.created_at = new Date().toISOString();
    }
    if (validFields.includes('created_by')) {
      filteredData.created_by = authResult.user.username;
    }
    if (validFields.includes('updated_at')) {
      filteredData.updated_at = new Date().toISOString();
    }

    // Build dynamic insert query
    const fields = Object.keys(filteredData);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(filteredData);

    const insertQuery = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await runAsync(insertQuery, values);

    // Log the change
    console.log(`Table Editor: ${authResult.user.username} created new row in ${table}, ID: ${result.lastInsertRowid}`);

    return NextResponse.json({
      success: true,
      message: 'Row created successfully',
      insertId: result.lastInsertRowid,
      changes: result.changes
    });

  } catch (error) {
    console.error('Error creating table row:', error);
    return NextResponse.json({ 
      error: 'Failed to create row',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Delete a row
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { table, rowId } = body;

    if (!table) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Check if table exists and user has access
    const userPermissions = authResult.user.permissions || [];
    const hasPermission = hasTableAccess(table, userPermissions);
    
    if (!hasPermission) {
      const tableConfig = TABLE_CATEGORIES[table as keyof typeof TABLE_CATEGORIES];
      console.log('🔍 Permission Debug:', {
        table,
        user: authResult.user.username,
        required: tableConfig?.permissions || ['tables.view_config'],
        userPermissionsCount: userPermissions.length,
        hasTableViewConfig: userPermissions.includes('tables.view_config')
      });
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        required: tableConfig?.permissions || ['tables.view_config']
      }, { status: 403 });
    }

    // Auto-detect primary key for this table
    const primaryKey = await detectPrimaryKey(table);

    // Delete the row
    const deleteQuery = `DELETE FROM ${table} WHERE ${primaryKey} = ?`;
    const result = await runAsync(deleteQuery, [rowId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'No rows deleted. Record may not exist.' }, { status: 404 });
    }

    // Log the change
    console.log(`Table Editor: ${authResult.user.username} deleted row from ${table}, ${primaryKey}=${rowId}`);

    return NextResponse.json({
      success: true,
      message: 'Row deleted successfully',
      changes: result.changes
    });

  } catch (error) {
    console.error('Error deleting table row:', error);
    return NextResponse.json({ 
      error: 'Failed to delete row',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}