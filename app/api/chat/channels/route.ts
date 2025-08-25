/**
 * Chat Channels API
 * GET /api/chat/channels - Get user's channels
 * POST /api/chat/channels - Create new channel
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

    const { user } = authResult;

    // Get user's channels with last message info
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.type,
        c.is_read_only,
        c.active,
        c.created_at,
        c.updated_at,
        cm.role as user_role,
        cm.last_read_at,
        (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id AND created_at > COALESCE(cm.last_read_at, '1970-01-01')) as unread_count,
        (SELECT message_text FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.active = 1 
        AND (c.type = 'public_channel' OR cm.user_id = ?)
      ORDER BY c.type, c.name
    `;

    return new Promise<Response>((resolve) => {
      db.all(query, [user.username, user.username], (err, channels) => {
        if (err) {
          console.error('Database error fetching channels:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ channels }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/chat/channels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('chat.create_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { name, description, type, team_id, is_read_only } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    // Validate channel type
    const validTypes = ['public_channel', 'private_channel'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 });
    }

    // Create new channel
    const insertQuery = `
      INSERT INTO chat_channels (name, description, type, created_by, team_id, is_read_only)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve) => {
      db.run(insertQuery, [name, description, type, user.username, team_id, is_read_only || false], function(err) {
        if (err) {
          console.error('Database error creating channel:', err);
          resolve(NextResponse.json({ error: 'Failed to create channel' }, { status: 500 }));
          return;
        }

        const channelId = this.lastID;

        // Add creator as owner of the channel
        const memberQuery = `
          INSERT INTO chat_channel_members (channel_id, user_id, role)
          VALUES (?, ?, 'owner')
        `;

        db.run(memberQuery, [channelId, user.username], (memberErr) => {
          if (memberErr) {
            console.error('Database error adding channel owner:', memberErr);
            resolve(NextResponse.json({ error: 'Channel created but failed to add owner' }, { status: 500 }));
            return;
          }

          resolve(NextResponse.json({ 
            message: 'Channel created successfully',
            channelId,
            channel: {
              id: channelId,
              name,
              description,
              type,
              created_by: user.username,
              team_id,
              is_read_only: is_read_only || false,
              user_role: 'owner'
            }
          }, { status: 201 }));
        });
      });
    });
  } catch (error) {
    console.error('Error in POST /api/chat/channels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}