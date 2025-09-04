/**
 * Ticket Service
 * Handles all ticket-related operations
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';
import { generateTicketNumber } from '@/lib/ticket-numbering';
import { ticketLogger } from '@/lib/logger';

export class TicketService extends BaseService {
  constructor() {
    super('tickets');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      case 'list':
        return this.listTickets(data, options, context);
      case 'create':
        return this.createTicket(data, context);
      case 'get':
        return this.getTicket(data, context);
      case 'update':
        return this.updateTicket(data, context);
      case 'delete':
        return this.deleteTicket(data, context);
      case 'get_history':
        return this.getHistory(data, context);
      case 'get_comments':
        return this.getComments(data, context);
      case 'add_comment':
        return this.addComment(data, context);
      case 'delete_comment':
        return this.deleteComment(data, context);
      case 'get_unread_counts':
        return this.getUnreadCounts(data, context);
      case 'mark_comments_read':
        return this.markCommentsRead(data, context);
      case 'get_public_status':
        return this.getPublicStatus(data, context);
      case 'get_attachments':
        return this.getAttachments(data, context);
      case 'upload_attachment':
        return this.uploadAttachment(data, context);
      case 'delete_attachment':
        return this.deleteAttachment(data, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * List tickets with filtering
   */
  private async listTickets(data: any, options: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    
    this.log(context, 'Listing tickets', { filters: data });

    const {
      status = '',
      queue = 'team_tickets',
      priority = '',
      limit = 50,
      offset = 0,
      search = '',
      team = '',
      escalated
    } = data;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Status filter
    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // Priority filter
    if (priority && priority !== 'all') {
      whereClause += ' AND priority = ?';
      params.push(priority);
    }

    // Search filter
    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ? OR submission_id LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Team filter
    if (team) {
      whereClause += ' AND assigned_team = ?';
      params.push(team);
    }

    // Escalated filter
    if (escalated === 'true' || escalated === true) {
      whereClause += ' AND escalated = 1';
    } else if (escalated === 'false' || escalated === false) {
      whereClause += ' AND escalated = 0';
    }

    // Queue-based filtering
    const user = context.user!;
    if (user.role !== 'admin') {
      const canManageEscalated = user.permissions?.includes('ticket.manage_escalated') || false;
      
      if (queue === 'my_tickets') {
        if (canManageEscalated) {
          whereClause += ' AND (assigned_to = ? OR status = \'escalated\')';
          params.push(user.username);
        } else {
          whereClause += ' AND assigned_to = ?';
          params.push(user.username);
        }
      } else if (queue === 'team_tickets') {
        if (canManageEscalated) {
          whereClause += ' AND (assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL) OR status = \'escalated\')';
          params.push(user.team_id);
        } else {
          whereClause += ' AND (assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL))';
          params.push(user.team_id);
        }
      } else if (queue === 'all_tickets') {
        if (canManageEscalated) {
          whereClause += ' AND (assigned_to = ? OR assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL) OR status = \'escalated\')';
          params.push(user.username, user.team_id);
        } else {
          whereClause += ' AND (assigned_to = ? OR assigned_team = ? OR (assigned_to IS NULL AND assigned_team IS NULL))';
          params.push(user.username, user.team_id);
        }
      }
    }

    // Query tickets
    const query = `
      SELECT 
        ut.*,
        t.name as team_name,
        u1.display_name as assigned_to_name,
        ut.user_name as submitted_by_name,
        (
          SELECT COUNT(*) FROM ticket_comments tc 
          WHERE tc.ticket_id = ut.submission_id 
          -- Comment count (no read tracking) 
        ) as comment_count
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u1 ON ut.assigned_to = u1.username
      ${whereClause}
      ORDER BY 
        CASE WHEN ut.priority = 'urgent' THEN 1
             WHEN ut.priority = 'high' THEN 2
             WHEN ut.priority = 'normal' THEN 3
             WHEN ut.priority = 'low' THEN 4
             ELSE 5 END,
        ut.submitted_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const tickets = await queryAsync(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_tickets ut
      ${whereClause}
    `;
    
    const countParams = params.slice(0, -3); // Remove limit, offset, and username
    const countResult = await queryAsync(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return this.createPaginatedResponse(
      tickets,
      total,
      Math.floor(offset / limit) + 1,
      limit
    );
  }

  /**
   * Create new ticket
   */
  private async createTicket(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.create');
    
    // Validate required fields
    this.validateRequiredFields(data, ['title', 'description', 'category']);
    
    this.log(context, 'Creating ticket', { title: data.title, category: data.category });

    const {
      title,
      description,
      category,
      request_type,
      subcategory,
      priority = 'normal',
      support_team,
      user_info,
      computer_info
    } = data;

    // Generate ticket number
    const assignedTeam = support_team || context.user?.team_id || 'GENERAL';
    const ticketId = await generateTicketNumber(assignedTeam);

    // Insert ticket
    await runAsync(`
      INSERT INTO user_tickets (
        submission_id, title, description, category, request_type, subcategory,
        priority, assigned_team, submitted_by, user_name, employee_number,
        email, phone, location, office, bureau, division, section,
        computer_info, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'))
    `, [
      ticketId, title, description, category, request_type, subcategory,
      priority, assignedTeam, context.user?.username,
      user_info?.user_name || context.user?.display_name,
      user_info?.employee_number || context.user?.username,
      user_info?.email || context.user?.email,
      user_info?.phone,
      user_info?.location,
      user_info?.office,
      user_info?.bureau,
      user_info?.division,
      user_info?.section,
      computer_info ? JSON.stringify(computer_info) : null
    ]);

    // Add history entry
    await this.addHistoryEntry(
      ticketId, 
      'created', 
      context.user!, 
      null, 
      'open', 
      null, 
      assignedTeam,
      'Initial ticket submission'
    );

    // Log ticket creation
    ticketLogger.created(ticketId, context.user!.username, assignedTeam);

    this.log(context, 'Ticket created successfully', { ticketId, assignedTeam });

    return this.success({
      ticket_id: ticketId,
      title,
      status: 'open',
      priority,
      assigned_team: assignedTeam,
      created_at: new Date().toISOString()
    }, `Ticket created: ${ticketId}`);
  }

  /**
   * Get single ticket
   */
  private async getTicket(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    
    this.validateRequiredFields(data, ['id']);
    const { id } = data;
    
    this.log(context, 'Fetching ticket', { ticketId: id });

    const ticket = await getAsync(`
      SELECT 
        ut.*,
        t.name as team_name,
        u1.display_name as assigned_to_name,
        ut.user_name as submitted_by_name
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u1 ON ut.assigned_to = u1.username
      WHERE ut.submission_id = ?
    `, [id]);

    if (!ticket) {
      throw new ValidationError(`Ticket not found: ${id}`);
    }

    // Check permissions
    const user = context.user!;
    const canView = user.role === 'admin' ||
                   ticket.assigned_to === user.username ||
                   ticket.submitted_by === user.username ||
                   ticket.assigned_team === user.team_id ||
                   user.permissions?.includes('ticket.view_all');

    if (!canView) {
      throw new ValidationError('Access denied to this ticket');
    }

    return this.success(ticket);
  }

  /**
   * Update ticket
   */
  private async updateTicket(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.update_own');
    
    this.validateRequiredFields(data, ['id']);
    const { id, ...updates } = data;
    
    this.log(context, 'Updating ticket', { ticketId: id, updates: Object.keys(updates) });

    // Get current ticket
    const currentTicket = await getAsync(
      'SELECT * FROM user_tickets WHERE submission_id = ?',
      [id]
    );

    if (!currentTicket) {
      throw new ValidationError(`Ticket not found: ${id}`);
    }

    // Build update query dynamically
    const updateFields = [];
    const updateParams = [];
    const changes: any = {};

    const allowedFields = ['title', 'description', 'priority', 'status', 'assigned_to', 'assigned_team', 'notes'];
    
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined) {
        updateFields.push(`${field} = ?`);
        updateParams.push(value);
        
        if (currentTicket[field] !== value) {
          changes[field] = { from: currentTicket[field], to: value };
        }
      }
    }

    if (updateFields.length === 0) {
      return this.success(currentTicket, 'No changes to update');
    }

    // Add updated timestamp
    updateFields.push('updated_at = datetime(\'now\')');
    updateParams.push(id);

    // Execute update
    await runAsync(
      `UPDATE user_tickets SET ${updateFields.join(', ')} WHERE submission_id = ?`,
      updateParams
    );

    // Add history entries for changes
    for (const [field, change] of Object.entries(changes)) {
      await this.addHistoryEntry(
        id,
        'updated',
        context.user!,
        String(change.from),
        String(change.to),
        field === 'assigned_team' ? change.from : undefined,
        field === 'assigned_team' ? change.to : undefined,
        `Field updated: ${field}`
      );
    }

    // Log update
    ticketLogger.updated(id, context.user!.username, changes);

    this.log(context, 'Ticket updated successfully', { ticketId: id, changesCount: Object.keys(changes).length });

    // Return updated ticket
    const updatedTicket = await getAsync(
      'SELECT * FROM user_tickets WHERE submission_id = ?',
      [id]
    );

    return this.success(updatedTicket, `Ticket updated: ${id}`);
  }

  /**
   * Add history entry helper
   */
  private async addHistoryEntry(
    ticketId: string, 
    actionType: string, 
    user: any, 
    fromValue?: string, 
    toValue?: string, 
    fromTeam?: string, 
    toTeam?: string, 
    reason?: string
  ): Promise<void> {
    try {
      await runAsync(`
        INSERT INTO ticket_history (
          ticket_id, action_type, performed_by, performed_by_display,
          from_value, to_value, from_team, to_team, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ticketId,
        actionType,
        user.username,
        user.display_name,
        fromValue,
        toValue,
        fromTeam,
        toTeam,
        reason
      ]);
    } catch (error) {
      this.logError(context, 'Failed to add history entry', error);
    }
  }

  /**
   * Placeholder methods for other actions
   */
  private async deleteTicket(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.delete');
    return this.success({ message: 'Delete ticket - Implementation pending' });
  }

  private async getHistory(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    return this.success({ message: 'Get ticket history - Implementation pending' });
  }

  private async getComments(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    return this.success({ message: 'Get ticket comments - Implementation pending' });
  }

  private async addComment(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.comment_own');
    return this.success({ message: 'Add ticket comment - Implementation pending' });
  }

  private async deleteComment(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.comment_delete_own');
    return this.success({ message: 'Delete ticket comment - Implementation pending' });
  }

  private async getUnreadCounts(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    return this.success({ message: 'Get unread counts - Implementation pending' });
  }

  private async markCommentsRead(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    return this.success({ message: 'Mark comments read - Implementation pending' });
  }

  private async getPublicStatus(data: any, context: RequestContext): Promise<any> {
    // No auth required for public status
    return this.success({ message: 'Get public ticket status - Implementation pending' });
  }

  /**
   * Get ticket attachments
   */
  private async getAttachments(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.view_own');
    
    const { ticket_id } = data;
    this.validateRequiredFields(data, ['ticket_id']);
    
    this.log(context, 'Getting ticket attachments', { ticket_id });
    
    // TODO: Implement actual attachment retrieval from database
    // For now, return empty attachments to prevent errors
    return this.success({
      attachments: [],
      total: 0
    });
  }

  /**
   * Upload ticket attachment
   */
  private async uploadAttachment(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.update_own');
    
    // TODO: Implement actual file upload
    return this.success({ message: 'Upload attachment - Implementation pending' });
  }

  /**
   * Delete ticket attachment
   */
  private async deleteAttachment(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'ticket.update_own');
    
    // TODO: Implement actual attachment deletion
    return this.success({ message: 'Delete attachment - Implementation pending' });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity
      await queryAsync('SELECT COUNT(*) as count FROM user_tickets LIMIT 1');
      
      return {
        status: 'healthy',
        service: 'TicketService',
        database: 'connected',
        implementation_status: 'Phase 2 - Core operations implemented',
        features: ['list', 'create', 'get', 'update', 'history_logging']
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'TicketService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}