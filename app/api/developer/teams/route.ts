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

    // Get teams with section information and user counts
    const teams = await queryAsync(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.section_id,
        s.name as section_name,
        t.lead_user_id,
        u.display_name as lead_user_name,
        t.active,
        t.created_at,
        t.updated_at,
        (SELECT COUNT(*) FROM users WHERE team_id = t.id AND active = TRUE) as user_count
      FROM teams t
      LEFT JOIN sections s ON t.section_id = s.id
      LEFT JOIN users u ON t.lead_user_id = u.id
      WHERE t.active = TRUE
      ORDER BY s.name, t.name
    `);

    return NextResponse.json(teams);

  } catch (error) {
    console.error('Error fetching teams:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, section_id, lead_user_id } = body;

    // Validate required fields
    if (!id || !name || !section_id) {
      return NextResponse.json(
        { error: 'Team ID, name, and section are required' },
        { status: 400 }
      );
    }

    // Check if team ID already exists
    const existingTeam = await getAsync(
      'SELECT id FROM teams WHERE id = ?',
      [id]
    );

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Team ID already exists' },
        { status: 400 }
      );
    }

    // Check if section exists
    const section = await getAsync(
      'SELECT id FROM sections WHERE id = ? AND active = TRUE',
      [section_id]
    );

    if (!section) {
      return NextResponse.json(
        { error: 'Selected section does not exist' },
        { status: 400 }
      );
    }

    // Check if lead user exists (if provided)
    if (lead_user_id) {
      const user = await getAsync(
        'SELECT id FROM users WHERE id = ? AND active = TRUE',
        [lead_user_id]
      );

      if (!user) {
        return NextResponse.json(
          { error: 'Selected team lead does not exist' },
          { status: 400 }
        );
      }
    }

    // Create the team
    await runAsync(
      `INSERT INTO teams (id, name, description, section_id, lead_user_id, active) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [id, name, description, section_id, lead_user_id || null]
    );

    console.log(`🏢 Team created: ${name} (${id}) by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Team created successfully',
      teamId: id
    });

  } catch (error) {
    console.error('Error creating team:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, section_id, lead_user_id, active } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Check if team exists
    const existingTeam = await getAsync(
      'SELECT * FROM teams WHERE id = ?',
      [id]
    );

    if (!existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
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
    if (section_id) {
      // Verify section exists
      const section = await getAsync(
        'SELECT id FROM sections WHERE id = ? AND active = TRUE',
        [section_id]
      );
      if (!section) {
        return NextResponse.json(
          { error: 'Selected section does not exist' },
          { status: 400 }
        );
      }
      updates.push('section_id = ?');
      values.push(section_id);
    }
    if (lead_user_id !== undefined) {
      if (lead_user_id) {
        // Verify user exists
        const user = await getAsync(
          'SELECT id FROM users WHERE id = ? AND active = TRUE',
          [lead_user_id]
        );
        if (!user) {
          return NextResponse.json(
            { error: 'Selected team lead does not exist' },
            { status: 400 }
          );
        }
      }
      updates.push('lead_user_id = ?');
      values.push(lead_user_id || null);
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

    // Update the team
    await runAsync(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log(`🏢 Team updated: ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Team updated successfully'
    });

  } catch (error) {
    console.error('Error updating team:', error);
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

    if (!authResult.user.permissions?.includes('admin.manage_teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('id');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await getAsync(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    );

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if any users are assigned to this team
    const userCount = await getAsync(
      'SELECT COUNT(*) as count FROM users WHERE team_id = ? AND active = TRUE',
      [teamId]
    );

    if (userCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team with assigned users' },
        { status: 400 }
      );
    }

    // Check if any tickets are assigned to this team
    const ticketCount = await getAsync(
      'SELECT COUNT(*) as count FROM user_tickets WHERE assigned_team = ?',
      [teamId]
    );

    if (ticketCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team with assigned tickets. Deactivate instead.' },
        { status: 400 }
      );
    }

    // Delete the team
    await runAsync(
      'DELETE FROM teams WHERE id = ?',
      [teamId]
    );

    console.log(`🗑️ Team deleted: ${teamId} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}