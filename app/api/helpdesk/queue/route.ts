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

    if (!authResult.user.permissions?.includes('helpdesk.multi_queue_access')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const queueType = url.searchParams.get('type'); // 'escalated' or 'team'
    const teamId = url.searchParams.get('teamId');
    const status = url.searchParams.get('status') || 'all';

    if (queueType === 'escalated') {
      // Get all escalated tickets from all teams
      const escalatedTickets = await queryAsync(`
        SELECT 
          ut.*,
          u.display_name as assigned_to_name,
          u2.display_name as submitted_by_name,
          st.name as assigned_team_name,
          st.label as assigned_team_label,
          COALESCE(
            (SELECT COUNT(*) FROM ticket_history_detailed 
             WHERE ticket_id = ut.id AND action_type IN ('commented', 'updated', 'status_changed')),
            0
          ) as activity_count
        FROM user_tickets ut
        LEFT JOIN users u ON ut.assigned_to = u.username
        LEFT JOIN users u2 ON ut.submitted_by = u2.username
        LEFT JOIN support_teams st ON ut.assigned_team = st.id
        WHERE ut.status = 'escalated'
        ORDER BY 
          CASE ut.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
            ELSE 5 
          END,
          ut.submitted_at ASC
      `);

      return NextResponse.json({
        success: true,
        tickets: escalatedTickets,
        queueType: 'escalated',
        totalCount: escalatedTickets.length
      });

    } else if (queueType === 'team' && teamId) {
      // Get tickets for a specific team
      let statusFilter = '';
      const params: any[] = [teamId];

      if (status !== 'all') {
        statusFilter = 'AND ut.status = ?';
        params.push(status);
      }

      const teamTickets = await queryAsync(`
        SELECT 
          ut.*,
          u.display_name as assigned_to_name,
          u2.display_name as submitted_by_name,
          st.name as assigned_team_name,
          st.label as assigned_team_label,
          COALESCE(
            (SELECT COUNT(*) FROM ticket_history_detailed 
             WHERE ticket_id = ut.id AND action_type IN ('commented', 'updated', 'status_changed')),
            0
          ) as activity_count
        FROM user_tickets ut
        LEFT JOIN users u ON ut.assigned_to = u.username
        LEFT JOIN users u2 ON ut.submitted_by = u2.username
        LEFT JOIN support_teams st ON ut.assigned_team = st.id
        WHERE ut.assigned_team = ? ${statusFilter}
        ORDER BY 
          CASE ut.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
            ELSE 5 
          END,
          ut.submitted_at DESC
      `, params);

      // Get team information
      const teamInfo = await queryAsync(
        'SELECT id, name, label, description FROM support_teams WHERE id = ?',
        [teamId]
      );

      return NextResponse.json({
        success: true,
        tickets: teamTickets,
        queueType: 'team',
        teamId,
        teamInfo: teamInfo[0] || null,
        status,
        totalCount: teamTickets.length
      });

    } else {
      // Get teams that are actually receiving tickets (from user preferences or all teams with tickets)
      let userTeams = await queryAsync(`
        SELECT 
          htp.team_id,
          t.name as team_name,
          t.name as team_label,
          htp.tab_order
        FROM helpdesk_team_preferences htp
        JOIN teams t ON htp.team_id = t.id
        WHERE htp.user_id = ? AND htp.is_visible = 1 AND t.active = 1
        ORDER BY htp.tab_order ASC
      `, [authResult.user.id]);

      // If no preferences set, show all teams that have tickets
      if (userTeams.length === 0) {
        userTeams = await queryAsync(`
          SELECT DISTINCT
            ut.assigned_team as team_id,
            COALESCE(t.name, ut.assigned_team) as team_name,
            COALESCE(t.name, ut.assigned_team) as team_label,
            ROW_NUMBER() OVER (ORDER BY COALESCE(t.name, ut.assigned_team)) as tab_order
          FROM user_tickets ut
          LEFT JOIN teams t ON ut.assigned_team = t.id
          WHERE ut.assigned_team IS NOT NULL
          ORDER BY team_name ASC
        `);
      }

      // Get ticket counts for each status per team
      const teamStats = await Promise.all(
        userTeams.map(async (team) => {
          const stats = await queryAsync(`
            SELECT 
              status,
              COUNT(*) as count
            FROM user_tickets 
            WHERE assigned_team = ?
            GROUP BY status
          `, [team.team_id]);

          const statusCounts = {
            pending: 0,
            in_progress: 0,
            completed: 0,
            escalated: 0,
            deleted: 0
          };

          stats.forEach((stat: any) => {
            if (stat.status in statusCounts) {
              statusCounts[stat.status as keyof typeof statusCounts] = stat.count;
            }
          });

          return {
            ...team,
            statusCounts,
            totalTickets: Object.values(statusCounts).reduce((a, b) => a + b, 0)
          };
        })
      );

      // Get escalated tickets count
      const escalatedCount = await queryAsync(
        'SELECT COUNT(*) as count FROM user_tickets WHERE status = ?',
        ['escalated']
      );

      return NextResponse.json({
        success: true,
        queueType: 'summary',
        userTeams: teamStats,
        escalatedCount: escalatedCount[0]?.count || 0
      });
    }

  } catch (error) {
    console.error('Error fetching helpdesk queue data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}