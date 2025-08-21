import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const columnId = params.id;
    const body = await request.json();
    const {
      column_label,
      column_type,
      is_sortable = false,
      is_filterable = false,
      default_visible = true,
      display_order = 0
    } = body;

    // Validate required fields
    if (!column_label || !column_type) {
      return NextResponse.json(
        { error: 'Missing required fields: column_label, column_type' },
        { status: 400 }
      );
    }

    // Check if column exists
    const existingColumn = await queryAsync(
      'SELECT id FROM table_column_definitions WHERE id = ?',
      [columnId]
    );

    if (existingColumn.length === 0) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      );
    }

    // Update column definition
    await queryAsync(`
      UPDATE table_column_definitions 
      SET 
        display_name = ?,
        column_type = ?,
        sortable = ?,
        filterable = ?,
        default_visible = ?,
        display_order = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      column_label,
      column_type,
      is_sortable ? 1 : 0,
      is_filterable ? 1 : 0,
      default_visible ? 1 : 0,
      display_order,
      columnId
    ]);

    return NextResponse.json({
      success: true,
      message: 'Column updated successfully',
      data: {
        id: columnId,
        column_label,
        column_type,
        is_sortable,
        is_filterable,
        default_visible,
        display_order
      }
    });

  } catch (error) {
    console.error('Error updating table column definition:', error);
    return NextResponse.json(
      { error: 'Failed to update table column definition' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const columnId = params.id;

    // Check if column exists
    const existingColumn = await queryAsync(
      'SELECT id, table_identifier, column_key FROM table_column_definitions WHERE id = ?',
      [columnId]
    );

    if (existingColumn.length === 0) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      );
    }

    // Delete column definition
    await queryAsync(
      'DELETE FROM table_column_definitions WHERE id = ?',
      [columnId]
    );

    return NextResponse.json({
      success: true,
      message: 'Column deleted successfully',
      data: {
        id: columnId,
        table_identifier: existingColumn[0].table_identifier,
        column_key: existingColumn[0].column_key
      }
    });

  } catch (error) {
    console.error('Error deleting table column definition:', error);
    return NextResponse.json(
      { error: 'Failed to delete table column definition' },
      { status: 500 }
    );
  }
}