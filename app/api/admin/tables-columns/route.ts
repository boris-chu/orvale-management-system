import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';
import { createContextLogger } from '@/lib/logger';

const logger = createContextLogger('tables-columns-api');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view table configurations
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const tableIdentifier = url.searchParams.get('table');

    // Get column definitions
    let query = `
      SELECT *
      FROM table_column_definitions
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by table identifier if provided
    if (tableIdentifier) {
      query += ' AND table_identifier = ?';
      params.push(tableIdentifier);
    }

    query += ' ORDER BY table_identifier, default_visible DESC, display_name ASC';

    const columns = await queryAsync(query, params);

    // Group columns by table identifier
    const groupedColumns: {[key: string]: any[]} = {};
    columns.forEach((column: any) => {
      if (!groupedColumns[column.table_identifier]) {
        groupedColumns[column.table_identifier] = [];
      }
      groupedColumns[column.table_identifier].push(column);
    });

    logger.info({
      userId: authResult.user.id,
      tableIdentifier,
      columnCount: columns.length,
      tablesCount: Object.keys(groupedColumns).length,
      event: 'columns_retrieved'
    }, 'Table columns retrieved successfully');

    return NextResponse.json({
      success: true,
      data: {
        columns: columns,
        grouped: groupedColumns,
        total: columns.length
      }
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error retrieving table columns');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage columns
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      table_identifier,
      column_key,
      column_type,
      display_name,
      data_source,
      is_system_column = false,
      default_visible = true,
      default_width,
      sortable = true,
      filterable = true,
      groupable = false,
      exportable = true,
      render_component
    } = body;

    // Validate required fields
    if (!id || !table_identifier || !column_key || !column_type || !display_name || !data_source) {
      return NextResponse.json(
        { error: 'Missing required fields: id, table_identifier, column_key, column_type, display_name, data_source' },
        { status: 400 }
      );
    }

    // Validate column_type
    const validColumnTypes = ['text', 'number', 'date', 'badge', 'user', 'team', 'custom'];
    if (!validColumnTypes.includes(column_type)) {
      return NextResponse.json(
        { error: `Invalid column_type. Must be one of: ${validColumnTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert new column definition
    await runAsync(`
      INSERT INTO table_column_definitions (
        id, table_identifier, column_key, column_type, display_name, data_source,
        is_system_column, default_visible, default_width, sortable, filterable,
        groupable, exportable, render_component, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      id, table_identifier, column_key, column_type, display_name, data_source,
      is_system_column ? 1 : 0, default_visible ? 1 : 0, default_width,
      sortable ? 1 : 0, filterable ? 1 : 0, groupable ? 1 : 0, exportable ? 1 : 0,
      render_component
    ]);

    logger.info({
      userId: authResult.user.id,
      columnId: id,
      tableIdentifier: table_identifier,
      columnKey: column_key,
      columnType: column_type,
      event: 'column_created'
    }, 'Table column definition created successfully');

    return NextResponse.json({
      success: true,
      message: 'Column definition created successfully',
      id
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error creating table column');
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Column ID already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}