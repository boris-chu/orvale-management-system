import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync, getAsync } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view users
    if (!authResult.user.permissions?.includes('admin.view_users') && 
        !authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all users
    const users = await queryAsync(`
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.role as role_id,
        u.team_id,
        u.section_id,
        u.active,
        u.created_at
      FROM users u
      ORDER BY u.display_name ASC
    `);

    // Add team and section names based on IDs (temporary until we have proper tables)
    const teamMap: { [key: string]: string } = {
      'ITTS_Region7': 'ITTS: Region 7',
      'ITTS_Region1': 'ITTS: Region 1',
      'ITTS_Region2': 'ITTS: Region 2',
      'ITTS_Main': 'ITTS: Main Office',
      'NET_North': 'Network: North Zone',
      'NET_South': 'Network: South Zone',
      'DEV_Alpha': 'Dev Team Alpha',
      'DEV_Beta': 'Dev Team Beta',
      'SEC_Core': 'Security: Core',
      'ADMIN': 'Administration'
    };

    const sectionMap: { [key: string]: string } = {
      'ITD': 'IT Department',
      'NET': 'Network Services',
      'DEV': 'Development',
      'SEC': 'Security',
      'ADMIN': 'Administration'
    };

    const usersWithNames = users.map((user: any) => ({
      ...user,
      team_name: teamMap[user.team_id] || user.team_id,
      section_name: sectionMap[user.section_id] || user.section_id
    }));

    return NextResponse.json(usersWithNames);

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage users
    if (!authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { username, display_name, email, password, role_id, team_id, active = true } = body;
    
    // Derive section_id from team_id
    const sectionMap: { [key: string]: string } = {
      'ITTS_Region7': 'ITD',
      'ITTS_Region1': 'ITD',
      'ITTS_Region2': 'ITD',
      'ITTS_Main': 'ITD',
      'NET_North': 'NET',
      'NET_South': 'NET',
      'DEV_Alpha': 'DEV',
      'DEV_Beta': 'DEV',
      'SEC_Core': 'SEC',
      'ADMIN': 'ADMIN'
    };
    
    const section_id = team_id ? sectionMap[team_id] || null : null;

    // Validate required fields
    if (!username || !display_name || !password || !role_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await getAsync(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user
    const result = await runAsync(
      `INSERT INTO users (username, display_name, email, password_hash, role, team_id, section_id, active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, display_name, email, passwordHash, role_id, team_id, section_id, active]
    );

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      userId: result.lastID
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage users
    if (!authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, username, display_name, email, role_id, team_id, active, password } = body;
    
    // Derive section_id from team_id if team_id is being updated
    const sectionMap: { [key: string]: string } = {
      'ITTS_Region7': 'ITD',
      'ITTS_Region1': 'ITD',
      'ITTS_Region2': 'ITD',
      'ITTS_Main': 'ITD',
      'NET_North': 'NET',
      'NET_South': 'NET',
      'DEV_Alpha': 'DEV',
      'DEV_Beta': 'DEV',
      'SEC_Core': 'SEC',
      'ADMIN': 'ADMIN'
    };
    
    const section_id = team_id !== undefined ? (team_id ? sectionMap[team_id] || null : null) : undefined;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if username already exists (excluding current user)
    if (username) {
      const existingUser = await getAsync(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, id]
      );

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(display_name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role_id !== undefined) {
      updates.push('role = ?');
      values.push(role_id);
    }
    if (team_id !== undefined) {
      updates.push('team_id = ?');
      values.push(team_id);
    }
    if (section_id !== undefined) {
      updates.push('section_id = ?');
      values.push(section_id);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active);
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add user ID to values
    values.push(id);

    // Update the user
    await runAsync(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage users
    if (!authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Don't allow deleting self
    if (parseInt(userId) === authResult.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Soft delete - set active to false
    await runAsync(
      'UPDATE users SET active = FALSE WHERE id = ?',
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}