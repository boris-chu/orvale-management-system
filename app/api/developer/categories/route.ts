import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all ticket categories with request type counts
    const categories = await queryAsync(`
      SELECT 
        c.id,
        c.name,
        c.description,
        c.active,
        c.sort_order,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM request_types WHERE category_id = c.id AND active = TRUE) as request_type_count
      FROM ticket_categories c
      WHERE c.active = TRUE
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    return NextResponse.json(categories);

  } catch (error) {
    console.error('Error fetching categories:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_categories')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, sort_order } = body;

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        { error: 'Category ID and name are required' },
        { status: 400 }
      );
    }

    // Check if category ID already exists
    const existingCategory = await getAsync(
      'SELECT id FROM ticket_categories WHERE id = ?',
      [id]
    );

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category ID already exists' },
        { status: 400 }
      );
    }

    // Create the category
    await runAsync(
      `INSERT INTO ticket_categories (id, name, description, sort_order, active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [id, name, description, sort_order || 0]
    );

    console.log(`📂 Category created: ${name} (${id}) by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      categoryId: id
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    if (!authResult.user.permissions?.includes('admin.manage_categories')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, sort_order, active } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await getAsync(
      'SELECT * FROM ticket_categories WHERE id = ?',
      [id]
    );

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    // Update the category
    await runAsync(
      `UPDATE ticket_categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`📂 Category updated: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.manage_categories')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await getAsync(
      'SELECT * FROM ticket_categories WHERE id = ?',
      [categoryId]
    );

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if any request types exist for this category
    const requestTypeCount = await getAsync(
      'SELECT COUNT(*) as count FROM request_types WHERE category_id = ? AND active = TRUE',
      [categoryId]
    );

    if (requestTypeCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with active request types' },
        { status: 400 }
      );
    }

    // Check if any tickets use this category
    const ticketCount = await getAsync(
      'SELECT COUNT(*) as count FROM user_tickets WHERE category = ?',
      [categoryId]
    );

    if (ticketCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category used by existing tickets. Deactivate instead.' },
        { status: 400 }
      );
    }

    // Delete the category
    await runAsync(
      'DELETE FROM ticket_categories WHERE id = ?',
      [categoryId]
    );

    console.log(`🗑️ Category deleted: ${categoryId} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}