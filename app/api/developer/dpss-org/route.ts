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
    const type = searchParams.get('type'); // offices, bureaus, divisions, sections

    let data;

    switch (type) {
      case 'offices':
        data = await queryAsync(`
          SELECT 
            o.id,
            o.name,
            o.description,
            o.active,
            o.sort_order,
            o.created_at,
            o.updated_at,
            0 as bureau_count
          FROM dpss_offices o
          WHERE o.active = TRUE
          ORDER BY o.sort_order ASC, o.name ASC
        `);
        break;

      case 'bureaus':
        data = await queryAsync(`
          SELECT 
            b.id,
            b.name,
            b.description,
            b.office_id,
            '' as office_name,
            b.active,
            b.sort_order,
            b.created_at,
            b.updated_at,
            0 as division_count
          FROM dpss_bureaus b
          WHERE b.active = TRUE
          ORDER BY b.sort_order ASC, b.name ASC
        `);
        break;

      case 'divisions':
        data = await queryAsync(`
          SELECT 
            d.id,
            d.name,
            d.description,
            d.bureau_id,
            '' as bureau_name,
            '' as office_id,
            '' as office_name,
            d.active,
            d.sort_order,
            d.created_at,
            d.updated_at,
            0 as section_count
          FROM dpss_divisions d
          WHERE d.active = TRUE
          ORDER BY d.sort_order ASC, d.name ASC
        `);
        break;

      case 'sections':
        data = await queryAsync(`
          SELECT 
            s.id,
            s.name,
            s.description,
            s.division_id,
            '' as division_name,
            '' as bureau_id,
            '' as bureau_name,
            '' as office_id,
            '' as office_name,
            s.active,
            s.sort_order,
            s.created_at,
            s.updated_at,
            0 as user_count
          FROM dpss_sections s
          WHERE s.active = TRUE
          ORDER BY s.sort_order ASC, s.name ASC
        `);
        break;

      default:
        // Return all organizational data
        const [offices, bureaus, divisions, sections] = await Promise.all([
          queryAsync('SELECT * FROM dpss_offices WHERE active = TRUE ORDER BY sort_order ASC, name ASC'),
          queryAsync('SELECT * FROM dpss_bureaus WHERE active = TRUE ORDER BY sort_order ASC, name ASC'),
          queryAsync('SELECT * FROM dpss_divisions WHERE active = TRUE ORDER BY sort_order ASC, name ASC'),
          queryAsync('SELECT * FROM dpss_sections WHERE active = TRUE ORDER BY sort_order ASC, name ASC')
        ]);
        
        return NextResponse.json({
          offices,
          bureaus,
          divisions,
          sections
        });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching DPSS organizational data:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_organization')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, name, description, parent_id, sort_order } = body;

    // Validate required fields
    if (!type || !id || !name) {
      return NextResponse.json(
        { error: 'Type, ID, and name are required' },
        { status: 400 }
      );
    }

    let table, parentField, parentTable;
    
    switch (type) {
      case 'office':
        table = 'dpss_offices';
        break;
      case 'bureau':
        table = 'dpss_bureaus';
        parentField = 'office_id';
        parentTable = 'dpss_offices';
        break;
      case 'division':
        table = 'dpss_divisions';
        parentField = 'bureau_id';
        parentTable = 'dpss_bureaus';
        break;
      case 'section':
        table = 'dpss_sections';
        parentField = 'division_id';
        parentTable = 'dpss_divisions';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        );
    }

    // Check if ID already exists
    const existing = await getAsync(
      `SELECT id FROM ${table} WHERE id = ?`,
      [id]
    );

    if (existing) {
      return NextResponse.json(
        { error: `${type} ID already exists` },
        { status: 400 }
      );
    }

    // Check parent exists (if required)
    if (parentField && parent_id) {
      const parent = await getAsync(
        `SELECT id FROM ${parentTable} WHERE id = ? AND active = TRUE`,
        [parent_id]
      );

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent does not exist' },
          { status: 400 }
        );
      }
    }

    // Create the item
    const fields = ['id', 'name', 'description', 'sort_order', 'active'];
    const values = [id, name, description, sort_order || 0, true];
    
    if (parentField) {
      fields.push(parentField);
      values.push(parent_id || null);
    }

    await runAsync(
      `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      values
    );

    console.log(`🏢 ${type} created: ${name} (${id}) by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: `${type} created successfully`,
      id: id
    });

  } catch (error) {
    console.error('Error creating DPSS organizational item:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_organization')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, name, description, parent_id, sort_order, active } = body;

    // Validate required fields
    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    let table, parentField;
    
    switch (type) {
      case 'office':
        table = 'dpss_offices';
        break;
      case 'bureau':
        table = 'dpss_bureaus';
        parentField = 'office_id';
        break;
      case 'division':
        table = 'dpss_divisions';
        parentField = 'bureau_id';
        break;
      case 'section':
        table = 'dpss_sections';
        parentField = 'division_id';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        );
    }

    // Check if item exists
    const existing = await getAsync(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: `${type} not found` },
        { status: 404 }
      );
    }

    // Build update query
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
    if (parentField && parent_id !== undefined) {
      updates.push(`${parentField} = ?`);
      values.push(parent_id || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await runAsync(
      `UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`🏢 ${type} updated: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: `${type} updated successfully`
    });

  } catch (error) {
    console.error('Error updating DPSS organizational item:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_organization')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    let table, childTable, childField;
    
    switch (type) {
      case 'office':
        table = 'dpss_offices';
        childTable = 'dpss_bureaus';
        childField = 'office_id';
        break;
      case 'bureau':
        table = 'dpss_bureaus';
        childTable = 'dpss_divisions';
        childField = 'bureau_id';
        break;
      case 'division':
        table = 'dpss_divisions';
        childTable = 'dpss_sections';
        childField = 'division_id';
        break;
      case 'section':
        table = 'dpss_sections';
        // Check users instead of child table
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        );
    }

    // Check if item exists
    const item = await getAsync(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );

    if (!item) {
      return NextResponse.json(
        { error: `${type} not found` },
        { status: 404 }
      );
    }

    // Check for dependencies
    if (type === 'section') {
      // Check if users are assigned to this section
      const userCount = await getAsync(
        'SELECT COUNT(*) as count FROM users WHERE section_id = ? AND active = TRUE',
        [id]
      );

      if (userCount.count > 0) {
        return NextResponse.json(
          { error: 'Cannot delete section with assigned users' },
          { status: 400 }
        );
      }
    } else if (childTable) {
      // Check for child items
      const childCount = await getAsync(
        `SELECT COUNT(*) as count FROM ${childTable} WHERE ${childField} = ? AND active = TRUE`,
        [id]
      );

      if (childCount.count > 0) {
        return NextResponse.json(
          { error: `Cannot delete ${type} with active child items` },
          { status: 400 }
        );
      }
    }

    // Delete the item
    await runAsync(
      `DELETE FROM ${table} WHERE id = ?`,
      [id]
    );

    console.log(`🗑️ ${type} deleted: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: `${type} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting DPSS organizational item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}