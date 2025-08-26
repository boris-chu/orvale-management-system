/**
 * User Presence API
 * GET /api/chat/presence - Get online users
 * POST /api/chat/presence - Update user status
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';
import { presenceManager } from '@/lib/presence-manager';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status
    const includeOffline = searchParams.get('includeOffline') === 'true';

    // Build query based on filters
    let presenceQuery = `
      SELECT 
        p.user_id,
        u.display_name,
        u.role,
        p.status,
        p.status_message,
        p.custom_status,
        p.last_active,
        p.connection_count,
        p.is_chat_blocked
      FROM user_presence p
      JOIN users u ON p.user_id = u.username
      WHERE u.active = 1
    `;

    const queryParams: string[] = [];

    if (!includeOffline) {
      presenceQuery += ` AND p.status != 'offline'`;
    }

    if (status) {
      presenceQuery += ` AND p.status = ?`;
      queryParams.push(status);
    }

    presenceQuery += ` ORDER BY p.status, u.display_name`;

    return new Promise<Response>((resolve) => {
      db.all(presenceQuery, queryParams, (err, users) => {
        if (err) {
          console.error('Database error fetching presence:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        // Group users by status for easier client-side handling
        const presenceData = {
          online: users.filter((u: any) => u.status === 'online'),
          away: users.filter((u: any) => u.status === 'away'),
          busy: users.filter((u: any) => u.status === 'busy'),
          idle: users.filter((u: any) => u.status === 'idle'),
          in_call: users.filter((u: any) => u.status === 'in_call'),
          in_meeting: users.filter((u: any) => u.status === 'in_meeting'),
          presenting: users.filter((u: any) => u.status === 'presenting'),
          offline: users.filter((u: any) => u.status === 'offline'),
          total: users.length
        };

        resolve(NextResponse.json({ presence: presenceData }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/chat/presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { status, statusMessage, customStatus } = body;

    // Validate status
    const validStatuses = ['online', 'away', 'busy', 'offline', 'idle', 'in_call', 'in_meeting', 'presenting'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Determine if this is a manual status (overrides automatic updates)
    const manualStatuses = ['busy', 'in_call', 'in_meeting', 'presenting'];
    const isManual = status && manualStatuses.includes(status);
    
    // Create table with is_manual column if it doesn't exist
    await new Promise<void>((resolve) => {
      db.run(`
        ALTER TABLE user_presence ADD COLUMN is_manual INTEGER DEFAULT 0
      `, (err) => {
        // Ignore error if column already exists
        resolve();
      });
    });

    // Update user presence
    const updateQuery = `
      INSERT OR REPLACE INTO user_presence (
        user_id, status, status_message, custom_status, last_active, is_manual
      ) VALUES (?, COALESCE(?, 'online'), ?, ?, CURRENT_TIMESTAMP, ?)
    `;

    return new Promise<NextResponse>((resolve) => {
      db.run(updateQuery, [
        user.username, 
        status, 
        statusMessage || null, 
        customStatus || null,
        isManual ? 1 : 0
      ], function(err) {
        if (err) {
          console.error('Database error updating presence:', err);
          resolve(NextResponse.json({ error: 'Failed to update presence' }, { status: 500 }));
          return;
        }

        // Update activity timestamp in presence manager for automatic users
        if (!isManual) {
          presenceManager.updateUserActivity(user.username);
        }
        
        resolve(NextResponse.json({ 
          message: 'Presence updated successfully',
          userId: user.username,
          status: status || 'online',
          statusMessage,
          customStatus,
          isManual
        }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/chat/presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}