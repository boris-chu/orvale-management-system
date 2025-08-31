/**
 * Staff Service
 * Handles staff work mode management and availability settings
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';

export class StaffService extends BaseService {
  constructor() {
    super('staff');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      case 'get_work_mode':
        return this.getWorkMode(data, context);
      case 'update_work_mode':
        return this.updateWorkMode(data, context);
      case 'get_all_work_modes':
        return this.getAllWorkModes(data, context);
      case 'get_ticket_users':
        return this.getTicketUsers(data, context);
      
      default:
        throw new Error(`Unknown staff action: ${action}`);
    }
  }

  /**
   * Get current work mode for user
   */
  private async getWorkMode(data: any, context: RequestContext): Promise<any> {
    // Users can view their own work mode, admins/supervisors can view others
    const { username = context.user!.username } = data;
    
    if (username !== context.user!.username) {
      this.requirePermission(context, 'admin.view_users');
    }
    
    this.log(context, 'Getting work mode', { username });
    
    const workMode = await getAsync(`
      SELECT 
        swm.*,
        u.display_name,
        u.role,
        CASE 
          WHEN swm.last_activity >= datetime('now', '-5 minutes') THEN 'active'
          WHEN swm.last_activity >= datetime('now', '-30 minutes') THEN 'idle' 
          ELSE 'inactive'
        END as activity_status
      FROM staff_work_modes swm
      JOIN users u ON swm.username = u.username
      WHERE swm.username = ?
    `, [username]);
    
    if (!workMode) {
      // Create default work mode if none exists
      await runAsync(`
        INSERT INTO staff_work_modes (username, current_mode, created_at)
        VALUES (?, 'offline', datetime('now'))
      `, [username]);
      
      return this.getWorkMode(data, context);
    }
    
    return this.success({
      username: workMode.username,
      display_name: workMode.display_name,
      role: workMode.role,
      current_mode: workMode.current_mode,
      auto_assign_enabled: workMode.auto_assign_enabled === 1,
      max_concurrent_chats: workMode.max_concurrent_chats,
      accept_vip_chats: workMode.accept_vip_chats === 1,
      accept_escalated_chats: workMode.accept_escalated_chats === 1,
      preferred_departments: JSON.parse(workMode.preferred_departments || '[]'),
      last_activity: workMode.last_activity,
      mode_changed_at: workMode.mode_changed_at,
      mode_changed_by: workMode.mode_changed_by,
      mode_change_reason: workMode.mode_change_reason,
      activity_status: workMode.activity_status,
      auto_offline_after_minutes: workMode.auto_offline_after_minutes,
      work_mode_timeout_enabled: workMode.work_mode_timeout_enabled === 1
    });
  }

  /**
   * Update work mode for user
   */
  private async updateWorkMode(data: any, context: RequestContext): Promise<any> {
    const { 
      username = context.user!.username,
      mode,
      reason = 'Manual change',
      auto_assign_enabled,
      max_concurrent_chats,
      accept_vip_chats,
      accept_escalated_chats,
      preferred_departments,
      auto_offline_after_minutes,
      work_mode_timeout_enabled
    } = data;
    
    // Users can update their own mode, admins can update others
    if (username !== context.user!.username) {
      this.requirePermission(context, 'admin.manage_users');
    }
    
    this.log(context, 'Updating work mode', { username, mode, reason });
    
    const user = context.user!;
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    
    // Build dynamic update query
    if (mode !== undefined) {
      const validModes = ['ready', 'work_mode', 'ticketing_mode', 'offline'];
      if (!validModes.includes(mode)) {
        throw new ValidationError(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
      }
      updateFields.push('current_mode = ?', 'mode_changed_at = datetime(\'now\')', 'mode_changed_by = ?', 'mode_change_reason = ?');
      updateParams.push(mode, user.username, reason);
    }
    
    if (auto_assign_enabled !== undefined) {
      updateFields.push('auto_assign_enabled = ?');
      updateParams.push(auto_assign_enabled ? 1 : 0);
    }
    
    if (max_concurrent_chats !== undefined) {
      updateFields.push('max_concurrent_chats = ?');
      updateParams.push(max_concurrent_chats);
    }
    
    if (accept_vip_chats !== undefined) {
      updateFields.push('accept_vip_chats = ?');
      updateParams.push(accept_vip_chats ? 1 : 0);
    }
    
    if (accept_escalated_chats !== undefined) {
      updateFields.push('accept_escalated_chats = ?');
      updateParams.push(accept_escalated_chats ? 1 : 0);
    }
    
    if (preferred_departments !== undefined) {
      updateFields.push('preferred_departments = ?');
      updateParams.push(JSON.stringify(preferred_departments));
    }
    
    if (auto_offline_after_minutes !== undefined) {
      updateFields.push('auto_offline_after_minutes = ?');
      updateParams.push(auto_offline_after_minutes);
    }
    
    if (work_mode_timeout_enabled !== undefined) {
      updateFields.push('work_mode_timeout_enabled = ?');
      updateParams.push(work_mode_timeout_enabled ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      throw new ValidationError('No fields to update');
    }
    
    // Always update activity timestamp and version
    updateFields.push('last_activity = datetime(\'now\')', 'updated_at = datetime(\'now\')');
    updateParams.push(username);
    
    const result = await runAsync(`
      UPDATE staff_work_modes 
      SET ${updateFields.join(', ')} 
      WHERE username = ?
    `, updateParams);
    
    if (result.changes === 0) {
      // Create if doesn't exist
      await runAsync(`
        INSERT INTO staff_work_modes (
          username, current_mode, auto_assign_enabled, max_concurrent_chats,
          accept_vip_chats, accept_escalated_chats, preferred_departments,
          auto_offline_after_minutes, work_mode_timeout_enabled,
          mode_changed_by, mode_change_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        username, mode || 'offline', auto_assign_enabled ? 1 : 0, max_concurrent_chats || 3,
        accept_vip_chats ? 1 : 0, accept_escalated_chats ? 1 : 0, 
        JSON.stringify(preferred_departments || []),
        auto_offline_after_minutes || 30, work_mode_timeout_enabled ? 1 : 0,
        user.username, reason
      ]);
    }
    
    this.log(context, 'Work mode updated successfully', { username, mode });
    
    // Return updated work mode
    return this.getWorkMode({ username }, context);
  }

  /**
   * Get all staff work modes (for admin/supervisor view)
   */
  private async getAllWorkModes(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_users');
    
    this.log(context, 'Getting all work modes');
    
    const { 
      mode_filter = 'all',
      department_filter = 'all',
      limit = 50,
      offset = 0 
    } = data;
    
    let whereClause = 'WHERE u.active = TRUE';
    const params: any[] = [];
    
    // Mode filter
    if (mode_filter !== 'all') {
      whereClause += ' AND swm.current_mode = ?';
      params.push(mode_filter);
    }
    
    // Department filter (team_id)
    if (department_filter !== 'all') {
      whereClause += ' AND u.team_id = ?';
      params.push(department_filter);
    }
    
    const staffModes = await queryAsync(`
      SELECT 
        swm.*,
        u.display_name,
        u.role,
        u.team_id,
        u.email,
        CASE 
          WHEN swm.last_activity >= datetime('now', '-5 minutes') THEN 'active'
          WHEN swm.last_activity >= datetime('now', '-30 minutes') THEN 'idle' 
          ELSE 'inactive'
        END as activity_status,
        (
          SELECT COUNT(*) FROM public_chat_sessions pcs 
          WHERE pcs.assigned_to = u.username 
            AND pcs.status = 'active'
        ) as active_chats
      FROM users u
      LEFT JOIN staff_work_modes swm ON u.username = swm.username
      ${whereClause}
      ORDER BY swm.current_mode DESC, swm.last_activity DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // Get total count
    const countResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN staff_work_modes swm ON u.username = swm.username
      ${whereClause}
    `, params);
    
    const total = countResult[0]?.total || 0;
    
    return this.createPaginatedResponse(
      staffModes.map((staff: any) => ({
        username: staff.username,
        display_name: staff.display_name,
        role: staff.role,
        team_id: staff.team_id,
        email: staff.email,
        current_mode: staff.current_mode || 'offline',
        auto_assign_enabled: staff.auto_assign_enabled === 1,
        max_concurrent_chats: staff.max_concurrent_chats || 3,
        accept_vip_chats: staff.accept_vip_chats === 1,
        accept_escalated_chats: staff.accept_escalated_chats === 1,
        preferred_departments: JSON.parse(staff.preferred_departments || '[]'),
        last_activity: staff.last_activity,
        mode_changed_at: staff.mode_changed_at,
        mode_changed_by: staff.mode_changed_by,
        mode_change_reason: staff.mode_change_reason,
        activity_status: staff.activity_status,
        active_chats: staff.active_chats
      })),
      total,
      Math.floor(offset / limit) + 1,
      limit
    );
  }

  /**
   * Get users who can handle tickets (for assignment)
   */
  private async getTicketUsers(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.assign_within_team');
    
    this.log(context, 'Getting ticket users');
    
    const { 
      team_filter = context.user!.team_id,
      available_only = true 
    } = data;
    
    let availabilityFilter = '';
    if (available_only) {
      availabilityFilter = `
        AND (swm.current_mode IN ('ready', 'ticketing_mode') OR swm.current_mode IS NULL)
        AND swm.auto_assign_enabled = TRUE
      `;
    }
    
    const ticketUsers = await queryAsync(`
      SELECT 
        u.username,
        u.display_name,
        u.role,
        u.team_id,
        u.email,
        COALESCE(swm.current_mode, 'offline') as work_mode,
        COALESCE(swm.auto_assign_enabled, 0) as auto_assign_enabled,
        COALESCE(swm.max_concurrent_chats, 3) as max_concurrent_chats,
        (
          SELECT COUNT(*) FROM user_tickets ut 
          WHERE ut.assigned_to = u.username 
            AND ut.status IN ('open', 'in_progress')
        ) as active_tickets
      FROM users u
      LEFT JOIN staff_work_modes swm ON u.username = swm.username
      WHERE u.active = TRUE 
        AND u.team_id = ?
        AND u.role IN ('it_user', 'helpdesk_member', 'helpdesk_supervisor', 'manager', 'admin')
        ${availabilityFilter}
      ORDER BY 
        CASE WHEN swm.current_mode = 'ready' THEN 0
             WHEN swm.current_mode = 'ticketing_mode' THEN 1
             ELSE 2 END,
        active_tickets ASC,
        u.display_name
    `, [team_filter]);
    
    return this.success({
      users: ticketUsers,
      total: ticketUsers.length,
      team_filter,
      available_only
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity
      await queryAsync('SELECT COUNT(*) as count FROM staff_work_modes LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM users LIMIT 1');
      
      return {
        status: 'healthy',
        service: 'StaffService',
        database: 'connected',
        implementation_status: 'Phase 3 - Complete work mode management implemented',
        features: [
          'get_work_mode', 'update_work_mode', 'get_all_work_modes', 'get_ticket_users'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'StaffService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}