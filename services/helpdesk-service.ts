/**
 * Helpdesk Service
 * Handles all helpdesk-related operations including queue management and team preferences
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';

export class HelpdeskService extends BaseService {
  constructor() {
    super('helpdesk');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      case 'get_queue':
        return this.getQueue(data, context);
      case 'get_teams':
        return this.getTeams(data, context);
      case 'get_team_preferences':
        return this.getTeamPreferences(data, context);
      case 'update_team_preferences':
        return this.updateTeamPreferences(data, context);
      default:
        throw new Error(`Unknown helpdesk action: ${action}`);
    }
  }

  /**
   * Get Helpdesk Queue with filters and team-based organization
   */
  private async getQueue(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'helpdesk.multi_queue_access');
    
    const {
      teams = null,           // Filter by specific team IDs
      status = 'all',         // open, in_progress, pending, closed, all
      priority = 'all',       // low, normal, high, urgent, all
      assigned_to = null,     // Filter by assigned user
      submitter = null,       // Filter by submitter
      category = null,        // Filter by category
      date_from = null,       // Date range filtering
      date_to = null,
      search = null,          // Text search in title/description
      sort_by = 'submitted_at', // Sort column
      sort_order = 'DESC',    // ASC or DESC
      limit = 50,
      offset = 0,
      include_history = false // Include ticket history
    } = data;
    
    this.log(context, 'Getting helpdesk queue', { teams, status, limit, offset });
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    // Team filtering - critical for helpdesk multi-queue view
    if (teams && teams.length > 0) {
      conditions.push(`ut.assigned_team IN (${teams.map(() => '?').join(',')})`);
      params.push(...teams);
    }
    
    // Status filtering
    if (status !== 'all') {
      conditions.push('ut.status = ?');
      params.push(status);
    }
    
    // Priority filtering
    if (priority !== 'all') {
      conditions.push('ut.priority = ?');
      params.push(priority);
    }
    
    // Assignment filtering
    if (assigned_to) {
      if (assigned_to === 'unassigned') {
        conditions.push('ut.assigned_to IS NULL');
      } else {
        conditions.push('ut.assigned_to = ?');
        params.push(assigned_to);
      }
    }
    
    // Submitter filtering
    if (submitter) {
      conditions.push('ut.user_name = ?');
      params.push(submitter);
    }
    
    // Category filtering
    if (category) {
      conditions.push('ut.category = ?');
      params.push(category);
    }
    
    // Date range filtering
    if (date_from) {
      conditions.push('ut.submitted_at >= ?');
      params.push(date_from);
    }
    if (date_to) {
      conditions.push('ut.submitted_at <= ?');
      params.push(date_to);
    }
    
    // Text search
    if (search) {
      conditions.push('(ut.issue_title LIKE ? OR ut.issue_description LIKE ? OR ut.submission_id LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get tickets with team and user information
    const tickets = await queryAsync(`
      SELECT 
        ut.*,
        t.name as team_name,
        t.description as team_description,
        u1.display_name as assigned_to_name,
        ut.user_name as submitted_by_name,
        ut.employee_number as submitter_employee_number,
        ut.location as submitter_location,
        CASE 
          WHEN ut.priority = 'urgent' THEN 1
          WHEN ut.priority = 'high' THEN 2
          WHEN ut.priority = 'normal' THEN 3
          WHEN ut.priority = 'low' THEN 4
          ELSE 5
        END as priority_order
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u1 ON ut.assigned_to = u1.username
      ${whereClause}
      ORDER BY ut.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u1 ON ut.assigned_to = u1.username
      ${whereClause}
    `, params);
    
    // Get queue statistics by team
    const teamStats = await queryAsync(`
      SELECT 
        t.id as team_id,
        t.name as team_name,
        COUNT(ut.id) as total_tickets,
        COUNT(CASE WHEN ut.status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN ut.status = 'in_progress' THEN 1 END) as in_progress_tickets,
        COUNT(CASE WHEN ut.assigned_to IS NULL THEN 1 END) as unassigned_tickets,
        COUNT(CASE WHEN ut.priority = 'urgent' THEN 1 END) as urgent_tickets,
        AVG(CASE 
          WHEN ut.status = 'closed' AND ut.completed_at IS NOT NULL 
          THEN (julianday(ut.completed_at) - julianday(ut.submitted_at)) * 24 
          ELSE NULL 
        END) as avg_resolution_hours
      FROM teams t
      LEFT JOIN user_tickets ut ON t.id = ut.assigned_team
      WHERE t.active = TRUE
      GROUP BY t.id, t.name
      HAVING total_tickets > 0
      ORDER BY total_tickets DESC
    `);
    
    // Include ticket history if requested
    if (include_history && tickets.length > 0) {
      const ticketIds = tickets.map((t: any) => t.id);
      const history = await queryAsync(`
        SELECT 
          thd.*,
          u.display_name as changed_by_name
        FROM ticket_history_detailed thd
        LEFT JOIN users u ON thd.changed_by = u.username
        WHERE thd.ticket_id IN (${ticketIds.map(() => '?').join(',')})
        ORDER BY thd.changed_at DESC
      `, ticketIds);
      
      // Group history by ticket
      const historyByTicket: any = {};
      history.forEach((h: any) => {
        if (!historyByTicket[h.ticket_id]) {
          historyByTicket[h.ticket_id] = [];
        }
        historyByTicket[h.ticket_id].push(h);
      });
      
      // Add history to tickets
      tickets.forEach((ticket: any) => {
        ticket.history = historyByTicket[ticket.id] || [];
      });
    }
    
    return this.createPaginatedResponse(
      tickets,
      countResult[0]?.total || 0,
      Math.floor(offset / limit) + 1,
      limit,
      {
        team_statistics: teamStats,
        applied_filters: {
          teams,
          status,
          priority,
          assigned_to,
          category,
          search
        },
        queue_summary: {
          total_teams: teamStats.length,
          tickets_in_view: tickets.length,
          unassigned_count: tickets.filter((t: any) => !t.assigned_to).length,
          urgent_count: tickets.filter((t: any) => t.priority === 'urgent').length
        }
      }
    );
  }

  /**
   * Get available helpdesk teams
   */
  private async getTeams(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'helpdesk.view_all_teams');
    
    const { include_stats = true, active_only = true } = data;
    
    this.log(context, 'Getting helpdesk teams', { include_stats, active_only });
    
    // Build query
    let query = `
      SELECT 
        t.*,
        s.name as section_name,
        COUNT(ut.id) as active_tickets
      FROM teams t
      LEFT JOIN sections s ON t.section_id = s.id
      LEFT JOIN user_tickets ut ON t.id = ut.assigned_team 
        AND ut.status IN ('open', 'in_progress', 'pending')
    `;
    
    const params = [];
    if (active_only) {
      query += ' WHERE t.active = TRUE';
    }
    
    query += `
      GROUP BY t.id
      ORDER BY t.name
    `;
    
    const teams = await queryAsync(query, params);
    
    // Get detailed stats if requested
    let teamDetails = teams;
    if (include_stats) {
      const detailedStats = await queryAsync(`
        SELECT 
          t.id as team_id,
          COUNT(ut.id) as total_tickets,
          COUNT(CASE WHEN ut.status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN ut.status = 'in_progress' THEN 1 END) as in_progress_tickets,
          COUNT(CASE WHEN ut.status = 'pending' THEN 1 END) as pending_tickets,
          COUNT(CASE WHEN ut.assigned_to IS NULL THEN 1 END) as unassigned_tickets,
          COUNT(CASE WHEN ut.priority = 'urgent' THEN 1 END) as urgent_tickets,
          COUNT(CASE WHEN ut.priority = 'high' THEN 1 END) as high_tickets,
          AVG(CASE 
            WHEN ut.status = 'closed' AND ut.completed_at IS NOT NULL 
            THEN (julianday(ut.completed_at) - julianday(ut.submitted_at)) * 24 
            ELSE NULL 
          END) as avg_resolution_hours,
          COUNT(DISTINCT ut.assigned_to) as active_agents
        FROM teams t
        LEFT JOIN user_tickets ut ON t.id = ut.assigned_team
        WHERE t.active = TRUE
        GROUP BY t.id
      `);
      
      // Merge stats with team data
      teamDetails = teams.map((team: any) => {
        const stats = detailedStats.find((s: any) => s.team_id === team.id) || {};
        return {
          ...team,
          statistics: {
            total_tickets: stats.total_tickets || 0,
            open_tickets: stats.open_tickets || 0,
            in_progress_tickets: stats.in_progress_tickets || 0,
            pending_tickets: stats.pending_tickets || 0,
            unassigned_tickets: stats.unassigned_tickets || 0,
            urgent_tickets: stats.urgent_tickets || 0,
            high_tickets: stats.high_tickets || 0,
            avg_resolution_hours: parseFloat(stats.avg_resolution_hours || 0).toFixed(2),
            active_agents: stats.active_agents || 0
          }
        };
      });
    }
    
    return this.success({
      teams: teamDetails,
      total: teamDetails.length,
      summary: {
        active_teams: teams.filter((t: any) => t.active).length,
        total_active_tickets: teams.reduce((sum: any, t: any) => sum + (t.active_tickets || 0), 0),
        teams_with_urgent: teams.filter((t: any) => t.statistics?.urgent_tickets > 0).length
      }
    });
  }

  /**
   * Get team preferences for a user
   */
  private async getTeamPreferences(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'helpdesk.multi_queue_access');
    
    const { username = context.user?.username } = data;
    
    if (!username) {
      throw new ValidationError('Username is required');
    }
    
    // Check if user can view other users' preferences
    if (username !== context.user?.username) {
      this.requirePermission(context, 'helpdesk.view_team_metrics');
    }
    
    this.log(context, 'Getting team preferences', { username });
    
    // Get user's team preferences
    const preferences = await queryAsync(`
      SELECT 
        htp.user_id,
        htp.team_id,
        htp.is_visible,
        htp.tab_order,
        htp.created_at,
        htp.updated_at,
        u.display_name as user_name
      FROM helpdesk_team_preferences htp
      LEFT JOIN users u ON htp.user_id = u.username
      WHERE htp.user_id = ?
      ORDER BY htp.tab_order
    `, [username]);
    
    if (!preferences || preferences.length === 0) {
      // Return default preferences if none exist
      return this.success({
        username,
        preferences: {
          preferred_teams: [],
          team_order: [],
          show_all_teams: true,
          default_view: 'all_teams',
          auto_refresh_interval: 30,
          show_team_stats: true,
          show_unassigned_first: true,
          notifications_enabled: true,
          sound_notifications: false,
          desktop_notifications: true
        },
        is_default: true,
        last_updated: null
      });
    }
    
    // Transform helpdesk preferences to expected format
    const preferredTeams = preferences.filter((p: any) => p.is_visible).map((p: any) => p.team_id);
    const teamOrder = preferences.sort((a: any, b: any) => a.tab_order - b.tab_order).map((p: any) => p.team_id);
    
    // Get team names
    const teamIds = [...new Set([...preferredTeams, ...teamOrder])];
    let teamNames = {};
    
    if (teamIds.length > 0) {
      const teams = await queryAsync(`
        SELECT id, name
        FROM teams 
        WHERE id IN (${teamIds.map(() => '?').join(',')})
      `, teamIds);
      
      teamNames = teams.reduce((acc: any, team: any) => {
        acc[team.id] = team.name;
        return acc;
      }, {});
    }
    
    return this.success({
      username,
      user_name: preferences[0]?.user_name,
      preferences: {
        preferred_teams: preferredTeams,
        team_order: teamOrder,
        show_all_teams: preferredTeams.length === 0,
        default_view: 'preferred_teams',
        auto_refresh_interval: 30,
        show_team_stats: true,
        show_unassigned_first: true,
        notifications_enabled: true,
        sound_notifications: false,
        desktop_notifications: true,
        team_names: teamNames
      },
      is_default: false,
      last_updated: preferences[0]?.updated_at,
      created_at: preferences[0]?.created_at
    });
  }

  /**
   * Update team preferences for a user
   */
  private async updateTeamPreferences(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'helpdesk.multi_queue_access');
    
    this.validateRequiredFields(data, ['preferences']);
    const { 
      username = context.user?.username, 
      preferences 
    } = data;
    
    if (!username) {
      throw new ValidationError('Username is required');
    }
    
    // Check if user can update other users' preferences
    if (username !== context.user?.username) {
      this.requirePermission(context, 'helpdesk.view_team_metrics');
    }
    
    this.log(context, 'Updating team preferences', { username, preferenceKeys: Object.keys(preferences) });
    
    // Extract preferred teams from preferences
    const preferredTeams = Array.isArray(preferences.preferred_teams) ? preferences.preferred_teams : [];
    
    // Validate team IDs exist
    if (preferredTeams.length > 0) {
      const teamCheck = await queryAsync(`
        SELECT COUNT(*) as count
        FROM teams 
        WHERE id IN (${preferredTeams.map(() => '?').join(',')})
        AND active = TRUE
      `, preferredTeams);
      
      if (teamCheck[0]?.count !== preferredTeams.length) {
        throw new ValidationError('Some selected teams do not exist or are inactive');
      }
    }
    
    // Clear existing preferences for this user
    await runAsync(`
      DELETE FROM helpdesk_team_preferences WHERE user_id = ?
    `, [username]);
    
    // Insert new preferences
    if (preferredTeams.length > 0) {
      const insertPromises = preferredTeams.map((teamId: string, index: number) =>
        runAsync(`
          INSERT INTO helpdesk_team_preferences 
          (user_id, team_id, is_visible, tab_order)
          VALUES (?, ?, ?, ?)
        `, [username, teamId, true, index + 1])
      );
      
      await Promise.all(insertPromises);
    }
    
    // Get updated preferences with team names
    const teamNames = {};
    if (preferredTeams.length > 0) {
      const teams = await queryAsync(`
        SELECT id, name
        FROM teams 
        WHERE id IN (${preferredTeams.map(() => '?').join(',')})
      `, preferredTeams);
      
      teams.forEach((team: any) => {
        teamNames[team.id] = team.name;
      });
    }
    
    return this.success({
      username,
      preferences: {
        preferred_teams: preferredTeams,
        team_order: preferredTeams,
        show_all_teams: preferredTeams.length === 0,
        default_view: preferredTeams.length > 0 ? 'preferred_teams' : 'all_teams',
        auto_refresh_interval: parseInt(preferences.auto_refresh_interval) || 30,
        show_team_stats: typeof preferences.show_team_stats === 'boolean' ? preferences.show_team_stats : true,
        show_unassigned_first: typeof preferences.show_unassigned_first === 'boolean' ? preferences.show_unassigned_first : true,
        notifications_enabled: typeof preferences.notifications_enabled === 'boolean' ? preferences.notifications_enabled : true,
        sound_notifications: typeof preferences.sound_notifications === 'boolean' ? preferences.sound_notifications : false,
        desktop_notifications: typeof preferences.desktop_notifications === 'boolean' ? preferences.desktop_notifications : true,
        team_names: teamNames
      },
      updated_by: context.user!.username
    }, 'Team preferences updated successfully');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity for helpdesk tables
      await queryAsync('SELECT COUNT(*) as count FROM teams LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM user_tickets LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM helpdesk_team_preferences LIMIT 1');
      
      return {
        status: 'healthy',
        service: 'HelpdeskService', 
        database: 'connected',
        implementation_status: 'Phase 3 - Fully implemented',
        features: [
          'get_queue', 'get_teams', 'get_team_preferences', 'update_team_preferences'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'HelpdeskService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}