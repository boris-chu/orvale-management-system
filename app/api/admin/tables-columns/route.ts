import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

// GET: Return available columns for all tables from database
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const columns = await queryAsync(`
      SELECT 
        id,
        table_identifier,
        column_key,
        display_name as column_label,
        column_type,
        sortable as is_sortable,
        filterable as is_filterable,
        default_visible,
        default_width,
        groupable,
        exportable,
        render_component,
        created_at
      FROM table_column_definitions 
      ORDER BY table_identifier, column_key
    `);

    // Transform database boolean values and add display order
    const formattedColumns = columns.map((col: any, index: number) => ({
      id: col.id,
      table_identifier: col.table_identifier,
      column_key: col.column_key,
      column_label: col.column_label,
      column_type: col.column_type,
      is_sortable: col.is_sortable === 1,
      is_filterable: col.is_filterable === 1,
      default_visible: col.default_visible === 1,
      display_order: index + 1,
      default_width: col.default_width,
      groupable: col.groupable === 1,
      exportable: col.exportable === 1,
      render_component: col.render_component,
      created_at: col.created_at
    }));

    console.log('🗄️ Loaded', formattedColumns.length, 'column definitions from database');


    return NextResponse.json({
      success: true,
      columns: formattedColumns
    });

  } catch (error) {
    console.error('Error loading column definitions:', error);
    return NextResponse.json({ 
      error: 'Failed to load column definitions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Create new column definition
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      table_identifier, 
      column_key, 
      column_label, 
      column_type, 
      is_sortable = true, 
      is_filterable = true, 
      default_visible = true,
      default_width,
      groupable = false,
      exportable = true,
      render_component
    } = body;

    if (!table_identifier || !column_key || !column_label || !column_type) {
      return NextResponse.json({ 
        error: 'Table identifier, column key, label, and type are required' 
      }, { status: 400 });
    }

    // Generate unique ID for the column definition
    const columnId = `col_${table_identifier}_${column_key}_${Date.now()}`;

    // Insert into database
    const result = await runAsync(`
      INSERT INTO table_column_definitions (
        id, table_identifier, column_key, column_type, display_name, data_source,
        is_system_column, default_visible, default_width, sortable, filterable, 
        groupable, exportable, render_component, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      columnId,
      table_identifier,
      column_key,
      column_type,
      column_label,
      column_key, // data_source defaults to column_key
      0, // is_system_column = false for user-created columns
      default_visible ? 1 : 0,
      default_width,
      is_sortable ? 1 : 0,
      is_filterable ? 1 : 0,
      groupable ? 1 : 0,
      exportable ? 1 : 0,
      render_component
    ]);

    if (result.changes === 0) {
      return NextResponse.json({ 
        error: 'Failed to create column definition' 
      }, { status: 500 });
    }

    console.log('✅ Created column definition:', columnId);

    return NextResponse.json({
      success: true,
      message: 'Column definition created successfully',
      column: {
        id: columnId,
        table_identifier,
        column_key,
        column_label,
        column_type,
        is_sortable,
        is_filterable,
        default_visible,
        default_width,
        groupable,
        exportable,
        render_component,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating column definition:', error);
    return NextResponse.json({ 
      error: 'Failed to create column definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Update existing column definition
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, 
      column_label, 
      column_type, 
      is_sortable, 
      is_filterable, 
      default_visible,
      default_width,
      groupable,
      exportable,
      render_component
    } = body;

    if (!id || !column_label || !column_type) {
      return NextResponse.json({ 
        error: 'Column ID, label, and type are required' 
      }, { status: 400 });
    }

    // Check if column exists
    const existingColumn = await getAsync(
      'SELECT * FROM table_column_definitions WHERE id = ?',
      [id]
    );

    if (!existingColumn) {
      return NextResponse.json({ 
        error: 'Column definition not found' 
      }, { status: 404 });
    }

    // Update in database
    const result = await runAsync(`
      UPDATE table_column_definitions 
      SET 
        display_name = ?,
        column_type = ?,
        default_visible = ?,
        default_width = ?,
        sortable = ?,
        filterable = ?,
        groupable = ?,
        exportable = ?,
        render_component = ?
      WHERE id = ?
    `, [
      column_label,
      column_type,
      default_visible ? 1 : 0,
      default_width,
      is_sortable ? 1 : 0,
      is_filterable ? 1 : 0,
      groupable ? 1 : 0,
      exportable ? 1 : 0,
      render_component,
      id
    ]);

    if (result.changes === 0) {
      return NextResponse.json({ 
        error: 'Failed to update column definition' 
      }, { status: 500 });
    }

    console.log('✅ Updated column definition:', id);

    return NextResponse.json({
      success: true,
      message: 'Column definition updated successfully'
    });

  } catch (error) {
    console.error('Error updating column definition:', error);
    return NextResponse.json({ 
      error: 'Failed to update column definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Remove column definition
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get('id');

    if (!columnId) {
      return NextResponse.json({ 
        error: 'Column ID is required' 
      }, { status: 400 });
    }

    // Check if column exists and is not a system column
    const existingColumn = await getAsync(
      'SELECT * FROM table_column_definitions WHERE id = ?',
      [columnId]
    );

    if (!existingColumn) {
      return NextResponse.json({ 
        error: 'Column definition not found' 
      }, { status: 404 });
    }

    if (existingColumn.is_system_column) {
      return NextResponse.json({ 
        error: 'Cannot delete system column' 
      }, { status: 400 });
    }

    // Delete from database
    const result = await runAsync(
      'DELETE FROM table_column_definitions WHERE id = ?',
      [columnId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete column definition' 
      }, { status: 500 });
    }

    console.log('✅ Deleted column definition:', columnId);

    return NextResponse.json({
      success: true,
      message: 'Column definition deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting column definition:', error);
    return NextResponse.json({ 
      error: 'Failed to delete column definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}