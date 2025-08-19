import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to assign tickets
    const hasAssignPermission = authResult.user.permissions?.some((perm: string) => 
      ['ticket.assign_own', 'ticket.assign_within_team', 'ticket.assign_any'].includes(perm)
    );

    if (!hasAssignPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to assign tickets' }, { status: 403 });
    }

    // Determine which users the current user can assign to based on permissions
    let whereClause = '';
    const queryParams: any[] = [];

    if (authResult.user.permissions?.includes('ticket.assign_any')) {
      // Can assign to any active user
      whereClause = 'WHERE u.active = TRUE';
    } else if (authResult.user.permissions?.includes('ticket.assign_within_team')) {
      // Can assign to users within the same team
      whereClause = 'WHERE u.active = TRUE AND u.team_id = ?';
      queryParams.push(authResult.user.team_id);
    } else if (authResult.user.permissions?.includes('ticket.assign_own')) {
      // Can only assign to self
      whereClause = 'WHERE u.active = TRUE AND u.id = ?';
      queryParams.push(authResult.user.id);
    }

    // Get assignable users
    const users = await queryAsync(`
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.role as role_id,
        u.team_id,
        u.section_id
      FROM users u
      ${whereClause}
      ORDER BY u.display_name ASC
    `, queryParams);

    // Add team and section names based on IDs
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
      section_name: sectionMap[user.section_id] || user.section_id,
      // Add a display label for the dropdown
      display_label: `${user.display_name} (${user.username}) - ${teamMap[user.team_id] || user.team_id}`
    }));

    return NextResponse.json({
      success: true,
      users: usersWithNames,
      permission_scope: authResult.user.permissions?.includes('ticket.assign_any') ? 'any' :
                       authResult.user.permissions?.includes('ticket.assign_within_team') ? 'team' :
                       'self'
    });

  } catch (error) {
    console.error('Error fetching assignable users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}