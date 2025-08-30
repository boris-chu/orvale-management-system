/**
 * Secure Tickets API - Demonstrates Row-Level Security and API Security Features
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryAsync } from '@/lib/database';
import { SecurityService, SecurityError } from '@/lib/security-service';
import { createSecureHandler, validators, auditLogger, getClientIP } from '@/lib/api-security';

// GET: Retrieve tickets with row-level security
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['ticket.view_own', 'ticket.view_team', 'ticket.view_all']
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const userContext = SecurityService.createAccessContext(user);
    const clientIP = getClientIP(request);
    
    try {
      // Extract and validate query parameters
      const url = new URL(request.url);
      const filters = SecurityService.validateTicketFilters({
        status: url.searchParams.get('status'),
        priority: url.searchParams.get('priority'),
        category: url.searchParams.get('category'),
        dateFrom: url.searchParams.get('dateFrom'),
        dateTo: url.searchParams.get('dateTo'),
        page: url.searchParams.get('page') || '1',
        limit: url.searchParams.get('limit') || '20'
      });

      // Validate pagination parameters
      const page = Math.max(1, parseInt(filters.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20)); // Max 100 items per page
      const offset = (page - 1) * limit;

      // Get row-level security filter for this user
      const securityFilter = SecurityService.getTicketAccessFilter(userContext);
      
      // Build dynamic WHERE clause
      const conditions = [securityFilter.condition];
      const params = [...securityFilter.params];

      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }

      if (filters.priority) {
        conditions.push('priority = ?');
        params.push(filters.priority);
      }

      if (filters.category) {
        conditions.push('category = ?');
        params.push(filters.category);
      }

      if (filters.dateFrom) {
        conditions.push('DATE(submitted_at) >= ?');
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        conditions.push('DATE(submitted_at) <= ?');
        params.push(filters.dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM user_tickets 
        ${whereClause}
      `;
      
      const countResult = await queryAsync(countQuery, params);
      const totalRecords = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalRecords / limit);

      // Get tickets with pagination
      const ticketsQuery = `
        SELECT 
          id,
          employee_number,
          user_name,
          category,
          request_type,
          priority,
          status,
          subject,
          request_details,
          assigned_team,
          assigned_to,
          submitted_at,
          updated_at,
          CASE 
            WHEN employee_number = ? THEN 'owner'
            WHEN assigned_to = ? THEN 'assignee'
            WHEN assigned_team = ? THEN 'team_member'
            ELSE 'restricted'
          END as access_level
        FROM user_tickets 
        ${whereClause}
        ORDER BY submitted_at DESC
        LIMIT ? OFFSET ?
      `;

      const tickets = await queryAsync(ticketsQuery, [
        ...params,
        userContext.username,
        userContext.username, 
        userContext.teamId,
        limit,
        offset
      ]);

      // Log successful data access
      auditLogger.logSecurityEvent({
        type: 'tickets_list_access',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/tickets/secure',
        success: true,
        details: {
          filters,
          resultCount: tickets.length,
          totalRecords,
          page,
          limit
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          tickets,
          pagination: {
            page,
            limit,
            totalRecords,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          },
          filters: filters,
          accessInfo: {
            userRole: user.role,
            permissions: user.permissions,
            canViewAll: userContext.permissions.includes('ticket.view_all'),
            canViewTeam: userContext.permissions.includes('ticket.view_team')
          }
        }
      });

    } catch (error) {
      console.error('Error fetching secure tickets:', error);
      
      auditLogger.logSecurityEvent({
        type: 'tickets_list_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/tickets/secure',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return NextResponse.json({
        error: 'Failed to fetch tickets',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// POST: Create new ticket with validation
export async function POST(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['ticket.create'],
    validationSchema: {
      subject: (input: string) => validators.textInput(input, 200),
      category: (input: string) => validators.textInput(input, 100),
      request_type: (input: string) => validators.textInput(input, 100),
      priority: (input: string) => {
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (!validPriorities.includes(input)) {
          throw new Error('Invalid priority value');
        }
        return input;
      },
      request_details: (input: string) => validators.textInput(input, 5000),
      location: (input: string) => validators.textInput(input, 200),
      office: (input: string) => validators.textInput(input, 200)
    }
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const validatedData = (req as any).validatedData;
    const clientIP = getClientIP(request);
    
    try {
      // Get next ticket ID for user's team
      const sequenceResult = await queryAsync(
        'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM ticket_sequences WHERE team_id = ?',
        [user.team_id]
      );
      
      const sequenceNumber = sequenceResult[0]?.next_seq || 1;
      
      // Generate ticket ID
      const ticketId = `TK-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(sequenceNumber).padStart(3, '0')}`;

      // Insert new ticket
      const insertResult = await queryAsync(`
        INSERT INTO user_tickets (
          ticket_id, employee_number, user_name, category, request_type,
          priority, status, subject, request_details, location, office,
          assigned_team, submitted_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ticketId,
        user.username,
        user.display_name || user.username,
        validatedData.category,
        validatedData.request_type,
        validatedData.priority,
        'open',
        validatedData.subject,
        validatedData.request_details,
        validatedData.location,
        validatedData.office,
        user.team_id,
        new Date().toISOString(),
        new Date().toISOString()
      ]);

      // Update sequence
      await queryAsync(
        'INSERT OR REPLACE INTO ticket_sequences (team_id, sequence_number) VALUES (?, ?)',
        [user.team_id, sequenceNumber]
      );

      // Log ticket creation
      auditLogger.logSecurityEvent({
        type: 'ticket_created',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/tickets/secure',
        success: true,
        details: {
          ticketId,
          category: validatedData.category,
          priority: validatedData.priority,
          subject: validatedData.subject
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          ticketId,
          message: 'Ticket created successfully',
          ticket: {
            id: insertResult.lastID,
            ticket_id: ticketId,
            status: 'open',
            priority: validatedData.priority,
            category: validatedData.category,
            subject: validatedData.subject,
            submitted_at: new Date().toISOString()
          }
        }
      }, { status: 201 });

    } catch (error) {
      console.error('Error creating ticket:', error);
      
      auditLogger.logSecurityEvent({
        type: 'ticket_creation_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/tickets/secure',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return NextResponse.json({
        error: 'Failed to create ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// PUT: Update existing ticket with row-level security check
export async function PUT(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['ticket.update_own', 'ticket.update_team', 'ticket.update_all'],
    validationSchema: {
      ticketId: validators.ticketId,
      status: (input: string) => {
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(input)) {
          throw new Error('Invalid status value');
        }
        return input;
      },
      priority: (input: string) => {
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (!validPriorities.includes(input)) {
          throw new Error('Invalid priority value');
        }
        return input;
      },
      assigned_to: (input: string) => validators.username(input),
      notes: (input: string) => validators.textInput(input, 2000)
    }
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const userContext = SecurityService.createAccessContext(user);
    const validatedData = (req as any).validatedData;
    const clientIP = getClientIP(request);
    
    try {
      const ticketId = validatedData.ticketId;

      // Enforce row-level security for write operation
      await SecurityService.enforceTicketAccess(userContext, ticketId, 'write');

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];

      if (validatedData.status) {
        updates.push('status = ?');
        params.push(validatedData.status);
      }

      if (validatedData.priority) {
        updates.push('priority = ?');
        params.push(validatedData.priority);
      }

      if (validatedData.assigned_to) {
        updates.push('assigned_to = ?');
        params.push(validatedData.assigned_to);
      }

      if (validatedData.notes) {
        updates.push('notes = ?');
        params.push(validatedData.notes);
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(ticketId);

      // Update ticket
      const updateResult = await queryAsync(
        `UPDATE user_tickets SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      if (updateResult.changes === 0) {
        return NextResponse.json({
          error: 'Ticket not found or no changes made'
        }, { status: 404 });
      }

      // Log ticket update
      auditLogger.logSecurityEvent({
        type: 'ticket_updated',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/tickets/secure',
        success: true,
        details: {
          ticketId,
          updates: Object.keys(validatedData),
          changedFields: updates.length - 1 // Exclude updated_at
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          ticketId,
          message: 'Ticket updated successfully',
          changedFields: updates.length - 1
        }
      });

    } catch (error) {
      // SecurityService.enforceTicketAccess throws SecurityError for access violations
      if (error instanceof SecurityError) {
        auditLogger.logSecurityEvent({
          type: 'unauthorized_ticket_update',
          username: user.username,
          ip: clientIP,
          endpoint: '/api/tickets/secure',
          success: false,
          details: { 
            ticketId: validatedData.ticketId,
            error: error.message 
          }
        });

        return NextResponse.json({
          error: 'Access denied to ticket',
          ticketId: validatedData.ticketId
        }, { status: 403 });
      }

      console.error('Error updating ticket:', error);
      
      auditLogger.logSecurityEvent({
        type: 'ticket_update_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/tickets/secure',
        success: false,
        details: { 
          ticketId: validatedData.ticketId,
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      });

      return NextResponse.json({
        error: 'Failed to update ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}