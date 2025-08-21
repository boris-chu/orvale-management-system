import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

// Database setup
const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

interface StaffTicketData {
  title: string;
  category: string;
  subcategory: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedBy: string;
  userDisplayName: string;
  userEmail: string;
  userEmployeeNumber?: string;
  userPhone?: string;
  userLocation?: string;
  userCubicleRoom?: string;
  userOffice?: string;
  userBureau?: string;
  userDivision?: string;
  userSection?: string;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assignedTeam: string;
  assignedTo: string;
  internalNotes: string;
  ticketSource: 'staff_created';
  createdByStaff?: string;
  submittedDate?: string;
}

// Generate ticket ID with team prefix
async function generateTicketId(teamId?: string): Promise<string> {
  try {
    let prefix = 'STAFF';
    
    if (teamId) {
      // Get team info for prefix
      const team = await dbGet(
        'SELECT name FROM teams WHERE id = ?',
        [teamId]
      ) as any;
      
      if (team) {
        // Use first part of team name for prefix (e.g., "ITTS_Region7" -> "ITTS")
        prefix = team.name.split('_')[0].toUpperCase();
      }
    }
    
    // Get or create sequence for this team
    const sequenceResult = await dbGet(
      'SELECT next_number FROM ticket_sequences WHERE team_id = ?',
      [teamId || 'STAFF']
    ) as any;
    
    let nextNumber: number;
    
    if (sequenceResult) {
      nextNumber = sequenceResult.next_number;
      await dbRun(
        'UPDATE ticket_sequences SET next_number = next_number + 1 WHERE team_id = ?',
        [teamId || 'STAFF']
      );
    } else {
      // Create new sequence starting at 1
      nextNumber = 1;
      await dbRun(
        'INSERT INTO ticket_sequences (team_id, next_number) VALUES (?, ?)',
        [teamId || 'STAFF', 2]
      );
    }
    
    // Format: PREFIX-YYYY-NNNNNN
    const year = new Date().getFullYear();
    const paddedNumber = nextNumber.toString().padStart(6, '0');
    return `${prefix}-${year}-${paddedNumber}`;
    
  } catch (error) {
    console.error('Error generating ticket ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now();
    return `STAFF-${timestamp}`;
  }
}

// Validate required permissions
function hasStaffTicketPermissions(userPermissions: string[]): boolean {
  const requiredPermissions = [
    'ticket.create_for_users',
    'ticket.access_internal'
  ];
  
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  ) || userPermissions.includes('admin.system_settings'); // Admin fallback
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check staff ticket creation permissions
    if (!hasStaffTicketPermissions(authResult.user.permissions || [])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create tickets for users' },
        { status: 403 }
      );
    }

    // Parse request body
    const ticketData: StaffTicketData = await request.json();
    
    // Validate required fields
    if (!ticketData.title || !ticketData.category || !ticketData.description || !ticketData.submittedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, description, submittedBy' },
        { status: 400 }
      );
    }

    // Validate user exists
    const userExists = await dbGet(
      'SELECT username FROM users WHERE username = ?',
      [ticketData.submittedBy]
    );
    
    if (!userExists) {
      return NextResponse.json(
        { error: `User ${ticketData.submittedBy} not found` },
        { status: 400 }
      );
    }

    // Handle team assignment based on permissions
    let finalAssignedTeam = ticketData.assignedTeam;
    
    // Check if user has cross-team assignment permissions
    const canAssignCrossTeam = authResult.user.permissions?.some((perm: string) => 
      ['ticket.assign_cross_team', 'helpdesk.assign_cross_team', 'ticket.assign_any'].includes(perm)
    );
    
    if (!canAssignCrossTeam) {
      // User doesn't have cross-team permissions, use their own team
      finalAssignedTeam = authResult.user.team_id || null;
    } else if (ticketData.assignedTeam) {
      // User has permissions and provided a team, validate it exists
      const teamExists = await dbGet(
        'SELECT id FROM teams WHERE id = ?',
        [ticketData.assignedTeam]
      );
      
      if (!teamExists) {
        return NextResponse.json(
          { error: `Team ${ticketData.assignedTeam} not found` },
          { status: 400 }
        );
      }
    }

    // Validate assigned user exists if provided
    if (ticketData.assignedTo) {
      const assignedUserExists = await dbGet(
        'SELECT username FROM users WHERE username = ?',
        [ticketData.assignedTo]
      );
      
      if (!assignedUserExists) {
        return NextResponse.json(
          { error: `Assigned user ${ticketData.assignedTo} not found` },
          { status: 400 }
        );
      }
    }

    // Generate ticket ID
    const ticketId = await generateTicketId(ticketData.assignedTeam);
    
    // Prepare ticket data
    const now = new Date().toISOString();
    const submittedDate = ticketData.submittedDate || now;
    const createdByStaff = ticketData.createdByStaff || authResult.user.username;

    // Map priority to numeric values for database
    const priorityMap = {
      'low': 1,
      'medium': 2, 
      'high': 3,
      'urgent': 4
    };

    // Insert ticket into database
    await dbRun(`
      INSERT INTO user_tickets (
        ticket_id,
        title,
        description,
        category,
        subcategory,
        priority,
        status,
        submitted_by,
        submitted_by_name,
        submitted_by_email,
        employee_number,
        phone_number,
        location,
        cubicle_room,
        office,
        bureau,
        division,
        section,
        assigned_team,
        assigned_to,
        internal_notes,
        created_by_staff,
        ticket_source,
        submitted_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ticketId,
      ticketData.title,
      ticketData.description,
      ticketData.category,
      ticketData.subcategory || null,
      priorityMap[ticketData.priority] || 2,
      ticketData.status || 'open',
      ticketData.submittedBy,
      ticketData.userDisplayName,
      ticketData.userEmail,
      ticketData.userEmployeeNumber || null,
      ticketData.userPhone || null,
      ticketData.userLocation || null,
      ticketData.userCubicleRoom || null,
      ticketData.userOffice || null,
      ticketData.userBureau || null,
      ticketData.userDivision || null,
      ticketData.userSection || null,
      finalAssignedTeam || null,
      ticketData.assignedTo || null,
      ticketData.internalNotes || null,
      createdByStaff,
      'staff_created',
      submittedDate,
      now,
      now
    ]);

    // Log the ticket creation in history
    await dbRun(`
      INSERT INTO ticket_history_detailed (
        ticket_id,
        action_type,
        action_description,
        old_value,
        new_value,
        changed_by,
        changed_at,
        change_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ticketId,
      'created',
      'Ticket created by staff',
      null,
      JSON.stringify({
        status: ticketData.status || 'open',
        priority: ticketData.priority,
        category: ticketData.category,
        assigned_team: ticketData.assignedTeam,
        assigned_to: ticketData.assignedTo
      }),
      createdByStaff,
      now,
      JSON.stringify({
        created_by_staff: createdByStaff,
        ticket_source: 'staff_created',
        original_user: ticketData.submittedBy,
        internal_notes: ticketData.internalNotes
      })
    ]);

    // Get the created ticket
    const createdTicket = await dbGet(`
      SELECT 
        ut.*,
        t.name as team_name,
        u.display_name as assigned_to_name
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u ON ut.assigned_to = u.username
      WHERE ut.ticket_id = ?
    `, [ticketId]);

    return NextResponse.json({
      success: true,
      message: 'Staff ticket created successfully',
      ticketId: ticketId,
      ticket: createdTicket
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating staff ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve staff-created tickets (for management/reporting)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    if (!hasStaffTicketPermissions(authResult.user.permissions || [])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view staff tickets' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const createdBy = searchParams.get('created_by');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = `
      SELECT 
        ut.*,
        t.name as team_name,
        u1.display_name as assigned_to_name,
        u2.display_name as created_by_name
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u1 ON ut.assigned_to = u1.username
      LEFT JOIN users u2 ON ut.created_by_staff = u2.username
      WHERE ut.ticket_source = 'staff_created'
    `;
    
    const params: any[] = [];
    
    if (createdBy) {
      query += ' AND ut.created_by_staff = ?';
      params.push(createdBy);
    }
    
    query += ' ORDER BY ut.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tickets = await dbAll(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM user_tickets WHERE ticket_source = \'staff_created\'';
    const countParams: any[] = [];
    
    if (createdBy) {
      countQuery += ' AND created_by_staff = ?';
      countParams.push(createdBy);
    }
    
    const countResult = await dbGet(countQuery, countParams) as any;

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        total: countResult.total,
        limit,
        offset,
        hasMore: (offset + limit) < countResult.total
      }
    });

  } catch (error) {
    console.error('Error fetching staff tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff tickets' },
      { status: 500 }
    );
  }
}