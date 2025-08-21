import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for tables view permission
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Validate table name to prevent SQL injection
    const allowedTables = [
      'user_tickets', 'users', 'teams', 'support_teams', 'ticket_categories',
      'request_types', 'subcategories', 'dpss_offices', 'dpss_bureaus', 
      'dpss_divisions', 'dpss_sections', 'portal_settings', 'system_settings',
      'roles', 'role_permissions'
    ];

    if (!allowedTables.includes(tableName)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Get table data with pagination - using parameterized queries for safety
    let data, countResult, schemaInfo;
    try {
      data = await queryAsync(
        `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      // Get total count
      countResult = await queryAsync(`SELECT COUNT(*) as total FROM \`${tableName}\``);

      // Get table schema info
      schemaInfo = await queryAsync(`PRAGMA table_info(\`${tableName}\`)`);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    const total = countResult[0]?.total || 0;
    const columns = schemaInfo.map((col: any) => ({
      name: col.name,
      type: col.type,
      notnull: col.notnull,
      pk: col.pk,
      dflt_value: col.dflt_value
    }));

    return NextResponse.json({
      success: true,
      data: {
        table: tableName,
        rows: data,
        columns: columns,
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for tables management permission
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { table, rowId, field, value, primaryKey = 'id' } = body;

    if (!table || !rowId || !field || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: table, rowId, field, value' },
        { status: 400 }
      );
    }

    // Validate table name
    const allowedTables = [
      'user_tickets', 'users', 'teams', 'support_teams', 'ticket_categories',
      'request_types', 'subcategories', 'dpss_offices', 'dpss_bureaus', 
      'dpss_divisions', 'dpss_sections', 'portal_settings', 'system_settings'
    ];

    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Update the specific field - using backticks to safely quote identifiers
    await queryAsync(
      `UPDATE \`${table}\` SET \`${field}\` = ?, updated_at = datetime('now') WHERE \`${primaryKey}\` = ?`,
      [value, rowId]
    );

    return NextResponse.json({
      success: true,
      message: 'Record updated successfully',
      data: {
        table,
        rowId,
        field,
        value
      }
    });

  } catch (error) {
    console.error('Error updating table data:', error);
    return NextResponse.json(
      { error: 'Failed to update table data' },
      { status: 500 }
    );
  }
}