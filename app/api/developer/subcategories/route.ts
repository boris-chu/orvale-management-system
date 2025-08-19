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
    const requestTypeId = searchParams.get('request_type_id');

    let query = `
      SELECT 
        sc.id,
        sc.request_type_id,
        sc.name,
        sc.description,
        sc.active,
        sc.sort_order,
        sc.created_at,
        sc.updated_at,
        rt.name as request_type_name,
        rt.category_id,
        tc.name as category_name
      FROM subcategories sc
      LEFT JOIN request_types rt ON sc.request_type_id = rt.id
      LEFT JOIN ticket_categories tc ON rt.category_id = tc.id
      WHERE sc.active = TRUE
    `;

    const params = [];
    if (requestTypeId) {
      query += ' AND sc.request_type_id = ?';
      params.push(requestTypeId);
    }

    query += ' ORDER BY sc.sort_order ASC, sc.name ASC';

    const subcategories = await queryAsync(query, params);
    return NextResponse.json(subcategories);

  } catch (error) {
    console.error('Error fetching subcategories:', error);
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
    const { id, request_type_id, name, description, sort_order } = body;

    // Validate required fields
    if (!id || !request_type_id || !name) {
      return NextResponse.json(
        { error: 'ID, request type ID, and name are required' },
        { status: 400 }
      );
    }

    // Check if request type exists
    const requestType = await getAsync(
      'SELECT id FROM request_types WHERE id = ? AND active = TRUE',
      [request_type_id]
    );

    if (!requestType) {
      return NextResponse.json(
        { error: 'Request type not found' },
        { status: 400 }
      );
    }

    // Check if subcategory ID already exists
    const existingSubcategory = await getAsync(
      'SELECT id FROM subcategories WHERE id = ?',
      [id]
    );

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory ID already exists' },
        { status: 400 }
      );
    }

    // Create the subcategory
    await runAsync(
      `INSERT INTO subcategories (id, request_type_id, name, description, sort_order, active) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [id, request_type_id, name, description, sort_order || 0]
    );

    console.log(`🏷️ Subcategory created: ${name} (${id}) by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Subcategory created successfully',
      subcategoryId: id
    });

  } catch (error) {
    console.error('Error creating subcategory:', error);
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
    const { id, request_type_id, name, description, sort_order, active } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Subcategory ID is required' },
        { status: 400 }
      );
    }

    // Check if subcategory exists
    const existingSubcategory = await getAsync(
      'SELECT * FROM subcategories WHERE id = ?',
      [id]
    );

    if (!existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (request_type_id) {
      // Verify new request type exists
      const requestType = await getAsync(
        'SELECT id FROM request_types WHERE id = ? AND active = TRUE',
        [request_type_id]
      );
      if (!requestType) {
        return NextResponse.json(
          { error: 'Request type not found' },
          { status: 400 }
        );
      }
      updates.push('request_type_id = ?');
      values.push(request_type_id);
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

    // Update the subcategory
    await runAsync(
      `UPDATE subcategories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`🏷️ Subcategory updated: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Subcategory updated successfully'
    });

  } catch (error) {
    console.error('Error updating subcategory:', error);
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
    const subcategoryId = searchParams.get('id');

    if (!subcategoryId) {
      return NextResponse.json(
        { error: 'Subcategory ID is required' },
        { status: 400 }
      );
    }

    // Check if subcategory exists
    const subcategory = await getAsync(
      'SELECT * FROM subcategories WHERE id = ?',
      [subcategoryId]
    );

    if (!subcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      );
    }

    // Check if any tickets use this subcategory
    const ticketCount = await getAsync(
      'SELECT COUNT(*) as count FROM user_tickets WHERE subcategory = ?',
      [subcategoryId]
    );

    if (ticketCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subcategory used by existing tickets. Deactivate instead.' },
        { status: 400 }
      );
    }

    // Delete the subcategory
    await runAsync(
      'DELETE FROM subcategories WHERE id = ?',
      [subcategoryId]
    );

    console.log(`🗑️ Subcategory deleted: ${subcategoryId} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}