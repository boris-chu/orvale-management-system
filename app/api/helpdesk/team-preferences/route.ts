import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and helpdesk permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('helpdesk.multi_queue_access')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get user's team preferences
    const preferences = await queryAsync(`
      SELECT 
        htp.team_id,
        htp.is_visible,
        htp.tab_order,
        st.name as team_name,
        st.label as team_label
      FROM helpdesk_team_preferences htp
      JOIN support_teams st ON htp.team_id = st.id
      WHERE htp.user_id = ? AND st.active = 1
      ORDER BY htp.tab_order ASC
    `, [authResult.user.id]);

    // Get all available teams for this user to choose from
    const allTeams = await queryAsync(`
      SELECT id, name, label, description
      FROM support_teams 
      WHERE active = 1
      ORDER BY name ASC
    `);

    return NextResponse.json({
      success: true,
      preferences,
      availableTeams: allTeams
    });

  } catch (error) {
    console.error('Error fetching helpdesk team preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and helpdesk permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('helpdesk.multi_queue_access')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { teamPreferences } = await request.json();

    if (!Array.isArray(teamPreferences)) {
      return NextResponse.json(
        { error: 'teamPreferences must be an array' },
        { status: 400 }
      );
    }

    // Clear existing preferences for this user
    await runAsync(
      'DELETE FROM helpdesk_team_preferences WHERE user_id = ?',
      [authResult.user.id]
    );

    // Insert new preferences
    for (const pref of teamPreferences) {
      if (pref.team_id && typeof pref.is_visible === 'boolean' && typeof pref.tab_order === 'number') {
        await runAsync(`
          INSERT INTO helpdesk_team_preferences (user_id, team_id, is_visible, tab_order)
          VALUES (?, ?, ?, ?)
        `, [
          authResult.user.id,
          pref.team_id,
          pref.is_visible,
          pref.tab_order
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Team preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating helpdesk team preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}