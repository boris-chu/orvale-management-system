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
    const tableFilter = searchParams.get('table');

    let query = `
      SELECT 
        id,
        table_identifier,
        column_key,
        column_label,
        column_type,
        is_sortable,
        is_filterable,
        default_visible,
        display_order
      FROM table_column_definitions 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (tableFilter) {
      query += ' AND table_identifier = ?';
      params.push(tableFilter);
    }
    
    query += ' ORDER BY table_identifier, display_order';

    const columns = await queryAsync(query, params);

    // Group columns by table identifier for easier consumption
    const groupedColumns: { [key: string]: any[] } = {};
    columns.forEach((column: any) => {
      if (!groupedColumns[column.table_identifier]) {
        groupedColumns[column.table_identifier] = [];
      }
      groupedColumns[column.table_identifier].push(column);
    });

    return NextResponse.json({
      success: true,
      columns: columns,
      data: {
        columns: columns,
        grouped: groupedColumns,
        count: columns.length
      }
    });

  } catch (error) {
    console.error('Error fetching table columns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table columns' },
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

    // Check for tables management permission
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      table_identifier,
      column_key,
      column_label,
      column_type,
      is_sortable = false,
      is_filterable = false,
      default_visible = true,
      display_order = 999
    } = body;

    // Validate required fields
    if (!table_identifier || !column_key || !column_label || !column_type) {
      return NextResponse.json(
        { error: 'Missing required fields: table_identifier, column_key, column_label, column_type' },
        { status: 400 }
      );
    }

    // Check if column already exists
    const existingColumn = await queryAsync(
      'SELECT id FROM table_column_definitions WHERE table_identifier = ? AND column_key = ?',
      [table_identifier, column_key]
    );

    if (existingColumn.length > 0) {
      return NextResponse.json(
        { error: 'Column definition already exists for this table' },
        { status: 409 }
      );
    }

    // Insert new column definition
    const result = await queryAsync(`
      INSERT INTO table_column_definitions (
        table_identifier, column_key, column_label, column_type,
        is_sortable, is_filterable, default_visible, display_order,
        created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      table_identifier,
      column_key,
      column_label,
      column_type,
      is_sortable ? 1 : 0,
      is_filterable ? 1 : 0,
      default_visible ? 1 : 0,
      display_order,
      authResult.user.username
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: (result as any).lastID,
        table_identifier,
        column_key,
        column_label,
        column_type,
        is_sortable,
        is_filterable,
        default_visible,
        display_order
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating table column definition:', error);
    return NextResponse.json(
      { error: 'Failed to create table column definition' },
      { status: 500 }
    );
  }
}