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

    // Get all roles from database
    const roles = await queryAsync(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM users WHERE role = r.id) as user_count
      FROM roles r
      ORDER BY r.is_system DESC, r.name ASC
    `);

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role: any) => {
        const permissions = await queryAsync(
          `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
          [role.id]
        );
        return {
          ...role,
          permissions: permissions.map((p: any) => p.permission_id),
          is_system: role.is_system === 1
        };
      })
    );

    return NextResponse.json(rolesWithPermissions);

  } catch (error) {
    console.error('Error fetching roles:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, permissions } = body;

    // Validate required fields
    if (!id || !name || !permissions || permissions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if role ID already exists
    const existingRole = await getAsync(
      'SELECT id FROM roles WHERE id = ?',
      [id]
    );

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role ID already exists' },
        { status: 400 }
      );
    }

    // Create the role
    await runAsync(
      `INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?)`,
      [id, name, description, false]
    );

    // Insert permissions
    for (const permission of permissions) {
      await runAsync(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [id, permission]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Role created successfully',
      roleId: id
    });

  } catch (error) {
    console.error('Error creating role:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, permissions } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Check if role exists
    const existingRole = await getAsync(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Update role details (only for non-system roles)
    if (!existingRole.is_system && (name || description)) {
      const updates = [];
      const values = [];

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description) {
        updates.push('description = ?');
        values.push(description);
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        await runAsync(
          `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
    }

    // Update permissions (allowed for all roles)
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await runAsync(
        'DELETE FROM role_permissions WHERE role_id = ?',
        [id]
      );

      // Insert new permissions
      for (const permission of permissions) {
        await runAsync(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [id, permission]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully'
    });

  } catch (error) {
    console.error('Error updating role:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('id');

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Check if role exists and is not a system role
    const role = await getAsync(
      'SELECT * FROM roles WHERE id = ?',
      [roleId]
    );

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    if (role.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 400 }
      );
    }

    // Check if any users have this role
    const userCount = await getAsync(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      [roleId]
    );

    if (userCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with assigned users' },
        { status: 400 }
      );
    }

    // Delete role permissions first (due to foreign key constraint)
    await runAsync(
      'DELETE FROM role_permissions WHERE role_id = ?',
      [roleId]
    );

    // Delete the role
    await runAsync(
      'DELETE FROM roles WHERE id = ?',
      [roleId]
    );

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}