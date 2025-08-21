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

interface TicketUserData {
  username: string;
  display_name: string;
  email?: string;
  employee_number?: string;
  phone?: string;
  location?: string;
  cubicle_room?: string;
  office_id?: number;
  bureau_id?: number;
  division_id?: number;
  section_id?: number;
}

// Create a new ticket user
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

    // Check permissions
    if (!authResult.user.permissions?.includes('ticket.create_new_users') &&
        !authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const userData: TicketUserData = await request.json();

    // Validate required fields
    if (!userData.username || !userData.display_name) {
      return NextResponse.json(
        { error: 'Username and display name are required' },
        { status: 400 }
      );
    }

    // Check if username already exists in ticket_users or system users
    const existingTicketUser = await dbGet(
      'SELECT username FROM ticket_users WHERE username = ?',
      [userData.username]
    );
    
    const existingSystemUser = await dbGet(
      'SELECT username FROM users WHERE username = ?',
      [userData.username]
    );

    if (existingTicketUser || existingSystemUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Insert the new ticket user
    await dbRun(`
      INSERT INTO ticket_users (
        username, display_name, email, employee_number, phone,
        location, cubicle_room, office_id, bureau_id, division_id, section_id,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userData.username,
      userData.display_name,
      userData.email || null,
      userData.employee_number || null,
      userData.phone || null,
      userData.location || null,
      userData.cubicle_room || null,
      userData.office_id || null,
      userData.bureau_id || null,
      userData.division_id || null,
      userData.section_id || null,
      authResult.user.username
    ]);

    // Get the created user
    const createdUser = await dbGet(
      'SELECT * FROM ticket_users WHERE username = ?',
      [userData.username]
    );

    return NextResponse.json({
      success: true,
      message: 'Ticket user created successfully',
      user: createdUser
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating ticket user:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket user' },
      { status: 500 }
    );
  }
}

// Get all ticket users (for search)
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
    if (!authResult.user.permissions?.includes('ticket.create_new_users') &&
        !authResult.user.permissions?.includes('ticket.access_internal') &&
        !authResult.user.permissions?.includes('admin.manage_users')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    let query = `
      SELECT 
        tu.username, tu.display_name, tu.email, tu.employee_number, tu.phone,
        tu.location, tu.cubicle_room,
        o.name as office, b.name as bureau, d.name as division, s.name as section,
        tu.office_id, tu.bureau_id, tu.division_id, tu.section_id
      FROM ticket_users tu
      LEFT JOIN dpss_offices o ON tu.office_id = o.id
      LEFT JOIN dpss_bureaus b ON tu.bureau_id = b.id
      LEFT JOIN dpss_divisions d ON tu.division_id = d.id
      LEFT JOIN dpss_sections s ON tu.section_id = s.id
      WHERE tu.active = 1
    `;
    
    const params: any[] = [];
    
    if (search) {
      query += ` AND (
        LOWER(tu.display_name) LIKE ? OR 
        LOWER(tu.username) LIKE ? OR 
        LOWER(tu.email) LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    query += ' ORDER BY tu.display_name';

    const ticketUsers = await dbAll(query, params);

    return NextResponse.json({
      success: true,
      users: ticketUsers
    });

  } catch (error) {
    console.error('Error fetching ticket users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket users' },
      { status: 500 }
    );
  }
}