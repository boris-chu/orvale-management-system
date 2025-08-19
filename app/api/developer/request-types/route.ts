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

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    let query = `
      SELECT 
        rt.id,
        rt.category_id,
        rt.name,
        rt.description,
        rt.active,
        rt.sort_order,
        rt.created_at,
        rt.updated_at,
        tc.name as category_name,
        (SELECT COUNT(*) FROM subcategories WHERE request_type_id = rt.id AND active = TRUE) as subcategory_count
      FROM request_types rt
      LEFT JOIN ticket_categories tc ON rt.category_id = tc.id
      WHERE rt.active = TRUE
    `;

    const params = [];
    if (categoryId) {
      query += ' AND rt.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY rt.sort_order ASC, rt.name ASC';

    const requestTypes = await queryAsync(query, params);
    return NextResponse.json(requestTypes);

  } catch (error) {
    console.error('Error fetching request types:', error);
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
    const { id, category_id, name, description, sort_order } = body;

    // Validate required fields
    if (!id || !category_id || !name) {
      return NextResponse.json(
        { error: 'ID, category ID, and name are required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await getAsync(
      'SELECT id FROM ticket_categories WHERE id = ? AND active = TRUE',
      [category_id]
    );

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }

    // Check if request type ID already exists
    const existingRequestType = await getAsync(
      'SELECT id FROM request_types WHERE id = ?',
      [id]
    );

    if (existingRequestType) {
      return NextResponse.json(
        { error: 'Request type ID already exists' },
        { status: 400 }
      );
    }

    // Create the request type
    await runAsync(
      `INSERT INTO request_types (id, category_id, name, description, sort_order, active) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [id, category_id, name, description, sort_order || 0]
    );

    console.log(`📋 Request type created: ${name} (${id}) by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Request type created successfully',
      requestTypeId: id
    });

  } catch (error) {
    console.error('Error creating request type:', error);
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
    const { id, category_id, name, description, sort_order, active } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Request type ID is required' },
        { status: 400 }
      );
    }

    // Check if request type exists
    const existingRequestType = await getAsync(
      'SELECT * FROM request_types WHERE id = ?',
      [id]
    );

    if (!existingRequestType) {
      return NextResponse.json(
        { error: 'Request type not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (category_id) {
      // Verify new category exists
      const category = await getAsync(
        'SELECT id FROM ticket_categories WHERE id = ? AND active = TRUE',
        [category_id]
      );
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 400 }
        );
      }
      updates.push('category_id = ?');
      values.push(category_id);
    }
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

    // Update the request type
    await runAsync(
      `UPDATE request_types SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`📋 Request type updated: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Request type updated successfully'
    });

  } catch (error) {
    console.error('Error updating request type:', error);
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
    const requestTypeId = searchParams.get('id');

    if (!requestTypeId) {
      return NextResponse.json(
        { error: 'Request type ID is required' },
        { status: 400 }
      );
    }

    // Check if request type exists
    const requestType = await getAsync(
      'SELECT * FROM request_types WHERE id = ?',
      [requestTypeId]
    );

    if (!requestType) {
      return NextResponse.json(
        { error: 'Request type not found' },
        { status: 404 }
      );
    }

    // Check if any subcategories exist for this request type
    const subcategoryCount = await getAsync(
      'SELECT COUNT(*) as count FROM subcategories WHERE request_type_id = ? AND active = TRUE',
      [requestTypeId]
    );

    if (subcategoryCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete request type with active subcategories' },
        { status: 400 }
      );
    }

    // Check if any tickets use this request type
    const ticketCount = await getAsync(
      'SELECT COUNT(*) as count FROM user_tickets WHERE request_type = ?',
      [requestTypeId]
    );

    if (ticketCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete request type used by existing tickets. Deactivate instead.' },
        { status: 400 }
      );
    }

    // Delete the request type
    await runAsync(
      'DELETE FROM request_types WHERE id = ?',
      [requestTypeId]
    );

    console.log(`🗑️ Request type deleted: ${requestTypeId} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Request type deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting request type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}