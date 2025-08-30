/**
 * Security Service - Row Level Security Implementation
 * Provides data access control at the application level since SQLite doesn't support native RLS
 */

import { queryAsync } from '@/lib/database';

export interface User {
  id: number;
  username: string;
  role: string;
  team_id: string;
  permissions: string[];
  active: boolean;
}

export interface AccessContext {
  userId: number;
  username: string;
  role: string;
  teamId: string;
  permissions: string[];
}

export class SecurityError extends Error {
  constructor(message: string, public resourceType?: string, public resourceId?: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class SecurityService {
  
  /**
   * Enforce row-level access control for tickets
   */
  static async enforceTicketAccess(
    userContext: AccessContext, 
    ticketId: number | string,
    operation: 'read' | 'write' | 'delete' = 'read'
  ): Promise<void> {
    try {
      // Get ticket details
      const tickets = await queryAsync(
        'SELECT id, employee_number, assigned_team, assigned_to, status FROM user_tickets WHERE id = ?',
        [ticketId]
      );

      if (!tickets || tickets.length === 0) {
        throw new SecurityError(`Ticket ${ticketId} not found`, 'ticket', ticketId.toString());
      }

      const ticket = tickets[0];
      
      // Define access rules based on operation
      const accessRules = this.getTicketAccessRules(userContext, ticket, operation);
      
      // Check if any access rule passes
      const hasAccess = accessRules.some(rule => rule.condition);
      
      if (!hasAccess) {
        // Log security violation
        await this.logSecurityViolation(
          userContext.username,
          'ticket',
          ticketId.toString(),
          operation,
          'Access denied by row-level security'
        );
        
        throw new SecurityError(
          `Access denied to ticket ${ticketId}`,
          'ticket',
          ticketId.toString()
        );
      }

      // Log successful access for audit
      await this.logDataAccess(userContext.username, 'ticket', ticketId.toString(), operation);
      
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(`Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enforce user data access control
   */
  static async enforceUserDataAccess(
    userContext: AccessContext,
    targetUsername: string,
    operation: 'read' | 'write' | 'delete' = 'read'
  ): Promise<void> {
    try {
      // Self-access is always allowed for read operations
      if (targetUsername === userContext.username && operation === 'read') {
        return;
      }

      // Admin users can access all user data
      if (userContext.permissions.includes('admin.manage_users')) {
        await this.logDataAccess(userContext.username, 'user_data', targetUsername, operation);
        return;
      }

      // Managers can read their team members' data
      if (operation === 'read' && userContext.permissions.includes('team.view_members')) {
        const isTeamMember = await this.checkTeamMembership(userContext.teamId, targetUsername);
        if (isTeamMember) {
          await this.logDataAccess(userContext.username, 'user_data', targetUsername, operation);
          return;
        }
      }

      // If we reach here, access is denied
      await this.logSecurityViolation(
        userContext.username,
        'user_data',
        targetUsername,
        operation,
        'Insufficient permissions for user data access'
      );

      throw new SecurityError(
        `Access denied to user data: ${targetUsername}`,
        'user_data',
        targetUsername
      );

    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(`User data access check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate filtered SQL conditions based on user permissions
   */
  static getTicketAccessFilter(userContext: AccessContext): { condition: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    // Admin can see all tickets
    if (userContext.permissions.includes('ticket.view_all')) {
      return { condition: '1 = 1', params: [] };
    }

    // User can see their own tickets
    conditions.push('employee_number = ?');
    params.push(userContext.username);

    // User can see tickets assigned to them
    conditions.push('assigned_to = ?');
    params.push(userContext.username);

    // Team members can see team tickets
    if (userContext.permissions.includes('ticket.view_team')) {
      conditions.push('assigned_team = ?');
      params.push(userContext.teamId);
    }

    // Manager can see tickets from their section/department
    if (userContext.permissions.includes('ticket.view_section')) {
      // This would require joining with team/section tables
      conditions.push(`assigned_team IN (
        SELECT id FROM teams WHERE section_id = (
          SELECT section_id FROM teams WHERE id = ?
        )
      )`);
      params.push(userContext.teamId);
    }

    const condition = conditions.length > 0 ? `(${conditions.join(' OR ')})` : '1 = 0';
    return { condition, params };
  }

  /**
   * Get access rules for ticket operations
   */
  private static getTicketAccessRules(
    userContext: AccessContext, 
    ticket: any, 
    operation: string
  ) {
    return [
      {
        name: 'admin_access',
        condition: userContext.permissions.includes('ticket.view_all'),
        description: 'Admin can access all tickets'
      },
      {
        name: 'owner_access',
        condition: ticket.employee_number === userContext.username,
        description: 'User can access their own tickets'
      },
      {
        name: 'assigned_access',
        condition: ticket.assigned_to === userContext.username,
        description: 'User can access tickets assigned to them'
      },
      {
        name: 'team_access',
        condition: 
          ticket.assigned_team === userContext.teamId && 
          userContext.permissions.includes('ticket.view_team'),
        description: 'Team member can access team tickets'
      },
      {
        name: 'manager_write_access',
        condition: 
          operation === 'write' && 
          userContext.permissions.includes('ticket.assign_within_team') &&
          ticket.assigned_team === userContext.teamId,
        description: 'Manager can modify team tickets'
      }
    ];
  }

  /**
   * Check if user is member of specified team
   */
  private static async checkTeamMembership(teamId: string, username: string): Promise<boolean> {
    try {
      const result = await queryAsync(
        'SELECT COUNT(*) as count FROM users WHERE username = ? AND team_id = ?',
        [username, teamId]
      );
      return (result[0]?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking team membership:', error);
      return false;
    }
  }

  /**
   * Log security violations for monitoring
   */
  private static async logSecurityViolation(
    username: string,
    resourceType: string,
    resourceId: string,
    operation: string,
    reason: string
  ): Promise<void> {
    try {
      console.warn('🚨 Security Violation:', {
        timestamp: new Date().toISOString(),
        username,
        resourceType,
        resourceId,
        operation,
        reason,
        severity: 'HIGH'
      });

      // In production, you'd want to log to a security incident system
      // await queryAsync(`
      //   INSERT INTO security_incidents (username, resource_type, resource_id, operation, reason, timestamp)
      //   VALUES (?, ?, ?, ?, ?, ?)
      // `, [username, resourceType, resourceId, operation, reason, new Date().toISOString()]);

    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  /**
   * Log successful data access for audit trail
   */
  private static async logDataAccess(
    username: string,
    resourceType: string,
    resourceId: string,
    operation: string
  ): Promise<void> {
    try {
      console.log('🔍 Data Access:', {
        timestamp: new Date().toISOString(),
        username,
        resourceType,
        resourceId,
        operation
      });

      // In production, log to audit system
      // await queryAsync(`
      //   INSERT INTO audit_log (username, resource_type, resource_id, operation, timestamp)
      //   VALUES (?, ?, ?, ?, ?)
      // `, [username, resourceType, resourceId, operation, new Date().toISOString()]);

    } catch (error) {
      console.error('Failed to log data access:', error);
    }
  }

  /**
   * Create access context from user object
   */
  static createAccessContext(user: User): AccessContext {
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      teamId: user.team_id,
      permissions: user.permissions || []
    };
  }

  /**
   * Validate and sanitize ticket filters
   */
  static validateTicketFilters(filters: any): any {
    const sanitized: any = {};

    // Validate status filter
    if (filters.status) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
      if (validStatuses.includes(filters.status)) {
        sanitized.status = filters.status;
      }
    }

    // Validate priority filter  
    if (filters.priority) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (validPriorities.includes(filters.priority)) {
        sanitized.priority = filters.priority;
      }
    }

    // Validate category filter
    if (filters.category && typeof filters.category === 'string') {
      sanitized.category = filters.category.substring(0, 100); // Limit length
    }

    // Validate date ranges
    if (filters.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)) {
      sanitized.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo)) {
      sanitized.dateTo = filters.dateTo;
    }

    return sanitized;
  }
}

/**
 * Middleware function to enforce row-level security
 */
export const enforceRowSecurity = (resourceType: string, operation: string = 'read') => {
  return async (req: any, res: any, next: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userContext = SecurityService.createAccessContext(req.user);
      
      // Extract resource ID from request
      const resourceId = req.params.id || req.params.ticketId || req.params.userId;
      
      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID required for security check' });
      }

      // Perform security check based on resource type
      switch (resourceType) {
        case 'ticket':
          await SecurityService.enforceTicketAccess(userContext, resourceId, operation as any);
          break;
        case 'user':
          await SecurityService.enforceUserDataAccess(userContext, resourceId, operation as any);
          break;
        default:
          return res.status(400).json({ error: 'Unknown resource type for security check' });
      }

      next();
    } catch (error) {
      if (error instanceof SecurityError) {
        return res.status(403).json({ 
          error: error.message,
          resourceType: error.resourceType,
          resourceId: error.resourceId
        });
      }
      
      console.error('Security middleware error:', error);
      return res.status(500).json({ error: 'Security check failed' });
    }
  };
};