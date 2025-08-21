import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

// Database setup
const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);
const dbAll = promisify(db.all.bind(db));

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const teamId = params.id;

    // Get users from the specified team
    const users = await dbAll(`
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.active,
        u.role_id,
        t.name as team_name
      FROM users u
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE u.team_id = ? AND u.active = 1
      ORDER BY u.display_name
    `, [teamId]);

    return NextResponse.json(users);

  } catch (error) {
    console.error('Error fetching team users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team users' },
      { status: 500 }
    );
  }
}