/**
 * Admin Chat Channels Management API
 * GET /api/admin/chat/channels - Get all channels with admin details
 * Requires: admin.manage_chat_channels permission
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('admin.manage_chat_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions to manage chat channels' }, { status: 403 });
    }

    // Get all channels with detailed information for admin
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.type,
        c.is_read_only,
        c.active,
        c.created_by,
        c.team_id,
        c.created_at,
        c.updated_at,
        u.display_name as created_by_name,
        (SELECT COUNT(*) FROM chat_channel_members WHERE channel_id = c.id) as member_count,
        (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id) as message_count,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.channel_id = c.id AND cm.created_at >= datetime('now', '-24 hours')) as messages_24h,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.channel_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.username
      WHERE c.active = 1
      ORDER BY c.created_at DESC
    `;

    return new Promise<Response>((resolve) => {
      db.all(query, [], (err, channels) => {
        if (err) {
          console.error('Database error fetching admin channels:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          channels,
          total_count: channels.length
        }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/admin/chat/channels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}