import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Check permissions - allow admin role or specific permissions
    console.log('Support Teams API - User:', authResult.user.username, 'Role:', authResult.user.role);
    console.log('Support Teams API - Permissions:', authResult.user.permissions);
    
    const hasPermission = authResult.user.role === 'admin' ||
                         authResult.user.permissions?.includes('admin.manage_support_teams') || 
                         authResult.user.permissions?.includes('admin.view_support_teams') ||
                         authResult.user.permissions?.includes('admin.manage_categories'); // Allow category managers too
    
    if (!hasPermission) {
      console.log('Support Teams API - Permission denied for user:', authResult.user.username);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all support team groups with team counts
    const groups = await queryAsync(`
      SELECT 
        stg.*,
        COUNT(st.id) as team_count
      FROM support_team_groups stg
      LEFT JOIN support_teams st ON stg.id = st.group_id AND st.active = TRUE
      WHERE stg.active = TRUE
      GROUP BY stg.id
      ORDER BY stg.sort_order ASC, stg.name ASC
    `);

    // Get all support teams
    const teams = await queryAsync(`
      SELECT 
        st.*,
        stg.name as group_name
      FROM support_teams st
      JOIN support_team_groups stg ON st.group_id = stg.id
      WHERE st.active = TRUE AND stg.active = TRUE
      ORDER BY stg.sort_order ASC, st.sort_order ASC, st.name ASC
    `);

    return NextResponse.json({ groups, teams });

  } catch (error) {
    console.error('Error fetching support teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const hasManagePermission = authResult.user.role === 'admin' ||
                               authResult.user.permissions?.includes('admin.manage_support_teams') ||
                               authResult.user.permissions?.includes('admin.manage_categories');
    
    if (!hasManagePermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, name, label, email, description, group_id, sort_order = 0 } = body;

    if (type === 'group') {
      // Create support team group
      await queryAsync(`
        INSERT INTO support_team_groups (id, name, description, sort_order)
        VALUES (?, ?, ?, ?)
      `, [id, name, description, sort_order]);

      return NextResponse.json({ message: 'Support team group created successfully' });
    } else if (type === 'team') {
      // Create support team
      await queryAsync(`
        INSERT INTO support_teams (id, group_id, name, label, email, description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, group_id, name, label, email, description, sort_order]);

      return NextResponse.json({ message: 'Support team created successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error creating support team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const hasManagePermission = authResult.user.role === 'admin' ||
                               authResult.user.permissions?.includes('admin.manage_support_teams') ||
                               authResult.user.permissions?.includes('admin.manage_categories');
    
    if (!hasManagePermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, name, label, email, description, group_id, sort_order, active } = body;

    if (type === 'group') {
      // Update support team group
      await queryAsync(`
        UPDATE support_team_groups 
        SET name = ?, description = ?, sort_order = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, description, sort_order, active, id]);

      return NextResponse.json({ message: 'Support team group updated successfully' });
    } else if (type === 'team') {
      // Update support team
      await queryAsync(`
        UPDATE support_teams 
        SET name = ?, label = ?, email = ?, description = ?, group_id = ?, sort_order = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, label, email, description, group_id, sort_order, active, id]);

      return NextResponse.json({ message: 'Support team updated successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating support team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const hasManagePermission = authResult.user.role === 'admin' ||
                               authResult.user.permissions?.includes('admin.manage_support_teams') ||
                               authResult.user.permissions?.includes('admin.manage_categories');
    
    if (!hasManagePermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 });
    }

    if (type === 'group') {
      // Check if group has teams
      const teamsCount = await queryAsync(`
        SELECT COUNT(*) as count FROM support_teams WHERE group_id = ? AND active = TRUE
      `, [id]);

      if (teamsCount[0].count > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete group that contains active teams' 
        }, { status: 400 });
      }

      // Soft delete group
      await queryAsync(`
        UPDATE support_team_groups 
        SET active = FALSE, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [id]);

      return NextResponse.json({ message: 'Support team group deleted successfully' });
    } else if (type === 'team') {
      // Soft delete team
      await queryAsync(`
        UPDATE support_teams 
        SET active = FALSE, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [id]);

      return NextResponse.json({ message: 'Support team deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error deleting support team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}