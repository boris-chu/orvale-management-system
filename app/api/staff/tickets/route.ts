import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { ticketLogger, systemLogger } from '@/lib/logger';
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
  requestType?: string;
  subcategory: string;
  subSubcategory?: string;
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

// Helper functions for staff ticket numbering (same logic as regular tickets)
const getNextSequenceForTeam = async (teamId: string, dateStr: string): Promise<number> => {
  try {
    // Get current sequence for this team and date
    const existingRecord = await dbGet(
      'SELECT last_sequence FROM ticket_sequences WHERE team_id = ? AND date = ?',
      [teamId, dateStr]
    ) as any;
    
    let nextSequence: number;
    
    if (existingRecord) {
      // Increment existing sequence
      nextSequence = existingRecord.last_sequence + 1;
      await dbRun(
        'UPDATE ticket_sequences SET last_sequence = ? WHERE team_id = ? AND date = ?',
        [nextSequence, teamId, dateStr]
      );
    } else {
      // First ticket for this team on this date
      nextSequence = 1;
      await dbRun(
        'INSERT INTO ticket_sequences (team_id, date, last_sequence, prefix) VALUES (?, ?, ?, ?)',
        [teamId, dateStr, nextSequence, 'SF']
      );
    }
    
    return nextSequence;
    
  } catch (error) {
    console.error('❌ Error getting next sequence:', error);
    // Fallback to timestamp-based sequence if database fails
    return Math.floor(Date.now() / 1000) % 999 + 1;
  }
};

// Convert sequence number to formatted string (same logic as regular tickets)
const formatSequenceNumber = (sequence: number): string => {
  // 1-999: Standard 3-digit format (001-999)
  if (sequence <= 999) {
    return sequence.toString().padStart(3, '0');
  }
  
  // 1000-3599: One letter + two digits (A00-Z99)
  if (sequence <= 999 + 2600) {
    const offset = sequence - 1000;
    const letterIndex = Math.floor(offset / 100);
    const number = offset % 100;
    const letter = String.fromCharCode(65 + letterIndex);
    return `${letter}${number.toString().padStart(2, '0')}`;
  }
  
  // 3600-10359: Two letters + one digit (AA0-ZZ9)
  if (sequence <= 999 + 2600 + 6760) {
    const offset = sequence - (1000 + 2600);
    const firstLetterIndex = Math.floor(offset / 260);
    const remaining = offset % 260;
    const secondLetterIndex = Math.floor(remaining / 10);
    const number = remaining % 10;
    const firstLetter = String.fromCharCode(65 + firstLetterIndex);
    const secondLetter = String.fromCharCode(65 + secondLetterIndex);
    return `${firstLetter}${secondLetter}${number}`;
  }
  
  // 10360+: Three letters (AAA-ZZZ)
  const offset = sequence - (1000 + 2600 + 6760);
  const firstLetterIndex = Math.floor(offset / 676);
  const remaining = offset % 676;
  const secondLetterIndex = Math.floor(remaining / 26);
  const thirdLetterIndex = remaining % 26;
  const firstLetter = String.fromCharCode(65 + firstLetterIndex);
  const secondLetter = String.fromCharCode(65 + secondLetterIndex);
  const thirdLetter = String.fromCharCode(65 + thirdLetterIndex);
  return `${firstLetter}${secondLetter}${thirdLetter}`;
};

// Generate staff ticket ID using the same sequence as regular tickets
async function generateStaffTicketId(teamId?: string): Promise<string> {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format
    
    // Use the assigned team for the sequence, or default to the current user's team
    const targetTeamId = teamId || 'ITTS_Region7'; // Default fallback
    
    // Get next sequence number using the same system as regular tickets
    const sequence = await getNextSequenceForTeam(targetTeamId, dateStr);
    const formattedSequence = formatSequenceNumber(sequence);
    
    // Use 'SF' prefix for staff tickets instead of team prefix
    return `SF-${dateStr}-${formattedSequence}`;
    
  } catch (error) {
    console.error('Error generating staff ticket ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now();
    return `SF-${timestamp}`;
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
  let authResult: any = null;
  try {
    console.log('🎫 Staff ticket creation API called');
    
    // Verify authentication
    authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ Authentication successful for user:', authResult.user.username);

    // Check staff ticket creation permissions
    if (!hasStaffTicketPermissions(authResult.user.permissions || [])) {
      systemLogger.warn({
        event: 'staff_ticket_creation_denied',
        denied_user: authResult.user.username,
        user_permissions: authResult.user.permissions,
        reason: 'insufficient_permissions'
      }, `Staff ticket creation denied for ${authResult.user.username}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to create tickets for users' },
        { status: 403 }
      );
    }

    // Parse request body
    const ticketData: StaffTicketData = await request.json();
    console.log('📋 Received ticket data:', ticketData);
    
    // Validate required fields
    if (!ticketData.title || !ticketData.category || !ticketData.description || !ticketData.submittedBy) {
      console.log('❌ Missing required fields:', {
        title: !!ticketData.title,
        category: !!ticketData.category,
        description: !!ticketData.description,
        submittedBy: !!ticketData.submittedBy
      });
      return NextResponse.json(
        { error: 'Missing required fields: title, category, description, submittedBy' },
        { status: 400 }
      );
    }

    // Note: For staff-created tickets, submittedBy can be any user identifier
    // We don't require them to exist in the users table since this could be
    // a ticket for someone not yet in the system

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
    const ticketId = await generateStaffTicketId(ticketData.assignedTeam);
    
    // Prepare ticket data
    const now = new Date().toISOString();
    const submittedDate = ticketData.submittedDate || now;
    const createdByStaff = ticketData.createdByStaff || authResult.user.username;

    // Priority is stored as text in the database, not numeric

    // Insert ticket into database
    await dbRun(`
      INSERT INTO user_tickets (
        submission_id,
        issue_title,
        issue_description,
        category,
        request_type,
        subcategory,
        sub_subcategory,
        priority,
        status,
        user_name,
        request_creator_display_name,
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
        submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ticketId,
      ticketData.title,
      ticketData.description,
      ticketData.category,
      ticketData.requestType || null,           // Map requestType → request_type
      ticketData.subcategory || null,
      ticketData.subSubcategory || null,        // Map subSubcategory → sub_subcategory  
      ticketData.priority || 'medium',
      ticketData.status || 'pending',
      ticketData.submittedBy,
      authResult.user.display_name || createdByStaff, // Request Creator = Staff who created it
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
      now
    ]);

    // Get the database ID of the created ticket for history logging
    const createdTicketRow = await dbGet(
      'SELECT id FROM user_tickets WHERE submission_id = ?',
      [ticketId]
    ) as any;

    if (!createdTicketRow) {
      throw new Error('Failed to retrieve created ticket ID for history logging');
    }

    // Log the ticket creation in history (use the regular ticket_history table)
    await dbRun(`
      INSERT INTO ticket_history (
        ticket_id,
        action_type,
        performed_by,
        performed_by_display,
        to_value,
        details
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      createdTicketRow.id,  // Use numeric database ID, not submission_id
      'created',
      createdByStaff,
      authResult.user.display_name || createdByStaff,
      JSON.stringify({
        status: ticketData.status || 'pending',
        priority: ticketData.priority,
        category: ticketData.category,
        assigned_team: ticketData.assignedTeam,
        assigned_to: ticketData.assignedTo
      }),
      JSON.stringify({
        created_by_staff: createdByStaff,
        ticket_source: 'staff_created',
        original_user: ticketData.submittedBy,
        internal_notes: ticketData.internalNotes
      })
    ]);

    // Log staff ticket creation for audit trail
    ticketLogger.staffCreated(
      ticketId,
      createdByStaff,
      ticketData.submittedBy,
      finalAssignedTeam || undefined,
      {
        category: ticketData.category,
        subcategory: ticketData.subcategory,
        priority: ticketData.priority,
        status: ticketData.status || 'open',
        assigned_to: ticketData.assignedTo,
        has_internal_notes: !!ticketData.internalNotes,
        user_info: {
          display_name: ticketData.userDisplayName,
          email: ticketData.userEmail,
          office: ticketData.userOffice,
          location: ticketData.userLocation
        }
      }
    );

    // Get the created ticket
    const createdTicket = await dbGet(`
      SELECT 
        ut.*,
        t.name as team_name,
        u.display_name as assigned_to_name
      FROM user_tickets ut
      LEFT JOIN teams t ON ut.assigned_team = t.id
      LEFT JOIN users u ON ut.assigned_to = u.username
      WHERE ut.submission_id = ?
    `, [ticketId]);

    return NextResponse.json({
      success: true,
      message: 'Staff ticket created successfully',
      ticketId: ticketId,
      ticket: createdTicket
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating staff ticket:', error);
    console.error('📋 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user: authResult?.user?.username || 'unknown'
    });
    
    // Log the error for audit trail
    systemLogger.error({
      event: 'staff_ticket_creation_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      user: authResult?.user?.username || 'unknown',
      stack_trace: error instanceof Error ? error.stack : undefined
    }, `Staff ticket creation failed`);
    
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve staff-created tickets (for management/reporting)
export async function GET(request: NextRequest) {
  let authResult: any = null;
  try {
    // Verify authentication
    authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    if (!hasStaffTicketPermissions(authResult.user.permissions || [])) {
      systemLogger.warn({
        event: 'staff_tickets_access_denied',
        denied_user: authResult.user.username,
        user_permissions: authResult.user.permissions,
        reason: 'insufficient_permissions'
      }, `Staff tickets access denied for ${authResult.user.username}`);
      
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

    // Log staff tickets access for audit trail
    systemLogger.info({ 
      event: 'staff_tickets_accessed',
      accessed_by: authResult.user.username,
      filter_created_by: createdBy || 'all',
      result_count: countResult.total,
      query_limit: limit,
      query_offset: offset
    }, `Staff tickets accessed by ${authResult.user.username}`);

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
    
    // Log the error for audit trail
    systemLogger.error({
      event: 'staff_tickets_fetch_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      user: authResult?.user?.username || 'unknown',
      stack_trace: error instanceof Error ? error.stack : undefined
    }, `Staff tickets fetch failed`);
    
    return NextResponse.json(
      { error: 'Failed to fetch staff tickets' },
      { status: 500 }
    );
  }
}