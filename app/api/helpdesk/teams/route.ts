import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and helpdesk permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to assign cross-team or view all teams
    const hasHelpdeskAccess = authResult.user.permissions?.includes('helpdesk.multi_queue_access');
    const canAssignCrossTeam = authResult.user.permissions?.includes('helpdesk.assign_cross_team');
    const canViewAllTeams = authResult.user.permissions?.includes('helpdesk.view_all_teams');

    if (!hasHelpdeskAccess && !canAssignCrossTeam && !canViewAllTeams) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Fetch all active teams with their section information and ticket counts
    const teams = await queryAsync(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.section_id,
        s.name as section_name,
        u.display_name as team_lead_name,
        u.username as team_lead_username,
        -- Get ticket counts for each team
        COALESCE((
          SELECT COUNT(*) 
          FROM user_tickets ut 
          WHERE ut.assigned_team = t.id AND ut.status != 'completed'
        ), 0) as active_tickets,
        COALESCE((
          SELECT COUNT(*) 
          FROM user_tickets ut 
          WHERE ut.assigned_team = t.id AND ut.status = 'pending'
        ), 0) as pending_tickets,
        COALESCE((
          SELECT COUNT(*) 
          FROM user_tickets ut 
          WHERE ut.assigned_team = t.id AND ut.status = 'in_progress'
        ), 0) as in_progress_tickets,
        COALESCE((
          SELECT COUNT(*) 
          FROM user_tickets ut 
          WHERE ut.assigned_team = t.id AND ut.status = 'escalated'
        ), 0) as escalated_tickets
      FROM teams t
      LEFT JOIN sections s ON t.section_id = s.id
      LEFT JOIN users u ON t.lead_user_id = u.id
      WHERE t.active = 1
      ORDER BY s.name ASC, t.name ASC
    `);

    // Group teams by their section for better organization
    const groupedTeams: {[key: string]: any} = {};
    const ungroupedTeams: any[] = [];

    teams.forEach((team: any) => {
      if (team.section_id && team.section_name) {
        if (!groupedTeams[team.section_id]) {
          groupedTeams[team.section_id] = {
            id: team.section_id,
            name: team.section_name,
            teams: []
          };
        }
        groupedTeams[team.section_id].teams.push({
          id: team.id,
          name: team.name,
          description: team.description,
          team_lead_name: team.team_lead_name,
          team_lead_username: team.team_lead_username,
          active_tickets: team.active_tickets,
          pending_tickets: team.pending_tickets,
          in_progress_tickets: team.in_progress_tickets,
          escalated_tickets: team.escalated_tickets
        });
      } else {
        ungroupedTeams.push({
          id: team.id,
          name: team.name,
          description: team.description,
          team_lead_name: team.team_lead_name,
          team_lead_username: team.team_lead_username,
          active_tickets: team.active_tickets,
          pending_tickets: team.pending_tickets,
          in_progress_tickets: team.in_progress_tickets,
          escalated_tickets: team.escalated_tickets
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        grouped_teams: Object.values(groupedTeams),
        ungrouped_teams: ungroupedTeams,
        all_teams: teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          description: team.description,
          section_name: team.section_name,
          team_lead_name: team.team_lead_name,
          team_lead_username: team.team_lead_username,
          active_tickets: team.active_tickets,
          pending_tickets: team.pending_tickets,
          in_progress_tickets: team.in_progress_tickets,
          escalated_tickets: team.escalated_tickets
        })),
        total_teams: teams.length,
        user_permissions: {
          can_assign_cross_team: canAssignCrossTeam,
          can_view_all_teams: canViewAllTeams,
          has_helpdesk_access: hasHelpdeskAccess
        }
      }
    });

  } catch (error) {
    console.error('Error fetching support teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}