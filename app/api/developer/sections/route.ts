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

    // Get sections with parent information and team counts
    const sections = await queryAsync(`
      SELECT 
        s.id,
        s.name,
        s.description,
        s.parent_section_id,
        ps.name as parent_section_name,
        s.active,
        s.created_at,
        s.updated_at,
        (SELECT COUNT(*) FROM teams WHERE section_id = s.id AND active = TRUE) as team_count,
        (SELECT COUNT(*) FROM users WHERE section_id = s.id AND active = TRUE) as user_count
      FROM sections s
      LEFT JOIN sections ps ON s.parent_section_id = ps.id
      WHERE s.active = TRUE
      ORDER BY s.parent_section_id IS NULL DESC, s.name
    `);

    return NextResponse.json(sections);

  } catch (error) {
    console.error('Error fetching sections:', error);
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
    const { id, name, description, parent_section_id } = body;

    // Validate required fields
    if (!id || !name) {
      return NextResponse.json(
        { error: 'Section ID and name are required' },
        { status: 400 }
      );
    }

    // Check if section ID already exists
    const existingSection = await getAsync(
      'SELECT id FROM sections WHERE id = ?',
      [id]
    );

    if (existingSection) {
      return NextResponse.json(
        { error: 'Section ID already exists' },
        { status: 400 }
      );
    }

    // Check if parent section exists (if provided)
    if (parent_section_id) {
      const parentSection = await getAsync(
        'SELECT id FROM sections WHERE id = ? AND active = TRUE',
        [parent_section_id]
      );

      if (!parentSection) {
        return NextResponse.json(
          { error: 'Parent section does not exist' },
          { status: 400 }
        );
      }

      // Prevent circular references (basic check)
      if (parent_section_id === id) {
        return NextResponse.json(
          { error: 'Section cannot be its own parent' },
          { status: 400 }
        );
      }
    }

    // Create the section
    await runAsync(
      `INSERT INTO sections (id, name, description, parent_section_id, active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [id, name, description, parent_section_id || null]
    );

    console.log(`🏢 Section created: ${name} (${id}) by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Section created successfully',
      sectionId: id
    });

  } catch (error) {
    console.error('Error creating section:', error);
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
    const { id, name, description, parent_section_id, active } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Section ID is required' },
        { status: 400 }
      );
    }

    // Check if section exists
    const existingSection = await getAsync(
      'SELECT * FROM sections WHERE id = ?',
      [id]
    );

    if (!existingSection) {
      return NextResponse.json(
        { error: 'Section not found' },
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
    if (parent_section_id !== undefined) {
      if (parent_section_id) {
        // Verify parent section exists
        const parentSection = await getAsync(
          'SELECT id FROM sections WHERE id = ? AND active = TRUE',
          [parent_section_id]
        );
        if (!parentSection) {
          return NextResponse.json(
            { error: 'Parent section does not exist' },
            { status: 400 }
          );
        }
        // Prevent circular references
        if (parent_section_id === id) {
          return NextResponse.json(
            { error: 'Section cannot be its own parent' },
            { status: 400 }
          );
        }
      }
      updates.push('parent_section_id = ?');
      values.push(parent_section_id || null);
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

    // Update the section
    await runAsync(
      `UPDATE sections SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`🏢 Section updated: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Section updated successfully'
    });

  } catch (error) {
    console.error('Error updating section:', error);
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
    const sectionId = searchParams.get('id');

    if (!sectionId) {
      return NextResponse.json(
        { error: 'Section ID is required' },
        { status: 400 }
      );
    }

    // Check if section exists
    const section = await getAsync(
      'SELECT * FROM sections WHERE id = ?',
      [sectionId]
    );

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Check if any teams are assigned to this section
    const teamCount = await getAsync(
      'SELECT COUNT(*) as count FROM teams WHERE section_id = ? AND active = TRUE',
      [sectionId]
    );

    if (teamCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete section with assigned teams' },
        { status: 400 }
      );
    }

    // Check if any users are assigned to this section
    const userCount = await getAsync(
      'SELECT COUNT(*) as count FROM users WHERE section_id = ? AND active = TRUE',
      [sectionId]
    );

    if (userCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete section with assigned users' },
        { status: 400 }
      );
    }

    // Check if any subsections exist
    const subsectionCount = await getAsync(
      'SELECT COUNT(*) as count FROM sections WHERE parent_section_id = ? AND active = TRUE',
      [sectionId]
    );

    if (subsectionCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete section with subsections. Delete subsections first.' },
        { status: 400 }
      );
    }

    // Delete the section
    await runAsync(
      'DELETE FROM sections WHERE id = ?',
      [sectionId]
    );

    console.log(`🗑️ Section deleted: ${sectionId} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}