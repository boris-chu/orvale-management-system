/**
 * Direct Message API
 * GET /api/chat/dm - Get user's direct messages
 * POST /api/chat/dm - Create or find existing direct message
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // Get user's direct messages with other user info and last message
    const query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.type,
        c.created_at,
        c.updated_at,
        cm.role as user_role,
        cm.last_read_at,
        (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id AND created_at > COALESCE(cm.last_read_at, '1970-01-01')) as unread_count,
        (SELECT message_text FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        -- Get the other participant's info
        (SELECT u2.username FROM chat_channel_members cm2 
         JOIN users u2 ON cm2.user_id = u2.username 
         WHERE cm2.channel_id = c.id AND cm2.user_id != ? LIMIT 1) as other_user_username,
        (SELECT u2.display_name FROM chat_channel_members cm2 
         JOIN users u2 ON cm2.user_id = u2.username 
         WHERE cm2.channel_id = c.id AND cm2.user_id != ? LIMIT 1) as other_user_display_name,
        (SELECT u2.profile_picture FROM chat_channel_members cm2 
         JOIN users u2 ON cm2.user_id = u2.username 
         WHERE cm2.channel_id = c.id AND cm2.user_id != ? LIMIT 1) as other_user_profile_picture,
        (SELECT up.status FROM chat_channel_members cm2 
         JOIN users u2 ON cm2.user_id = u2.username 
         LEFT JOIN user_presence up ON u2.username = up.username
         WHERE cm2.channel_id = c.id AND cm2.user_id != ? LIMIT 1) as other_user_status
      FROM chat_channels c
      INNER JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.type = 'direct_message' AND c.active = 1
      ORDER BY 
        CASE 
          WHEN (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) IS NOT NULL 
          THEN (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1)
          ELSE c.created_at
        END DESC
    `;

    return new Promise<NextResponse>((resolve) => {
      db.all(query, [user.username, user.username, user.username, user.username, user.username], (err, rows) => {
        if (err) {
          console.error('Database error fetching DMs:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        const dms = (rows as any[]).map(row => ({
          id: row.id.toString(),
          type: 'dm',
          name: row.other_user_username,
          displayName: row.other_user_display_name || 'Unknown User',
          unreadCount: row.unread_count || 0,
          lastMessage: row.last_message || '',
          lastMessageTime: row.last_message_time || '',
          participants: [
            {
              username: row.other_user_username,
              display_name: row.other_user_display_name,
              profile_picture: row.other_user_profile_picture,
              role_id: '', // Not relevant for DMs
              presence: {
                status: row.other_user_status || 'offline'
              }
            }
          ]
        }));

        resolve(NextResponse.json({ dms }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/chat/dm:', error);
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
    const { targetUsername } = body;

    if (!targetUsername) {
      return NextResponse.json({ error: 'targetUsername is required' }, { status: 400 });
    }

    if (targetUsername === user.username) {
      return NextResponse.json({ error: 'Cannot create DM with yourself' }, { status: 400 });
    }

    // Check if target user exists
    const userCheckQuery = `SELECT username FROM users WHERE username = ?`;
    const targetUserExists: any = await new Promise((resolve) => {
      db.get(userCheckQuery, [targetUsername], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!targetUserExists) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check if DM already exists between these two users
    const existingDMQuery = `
      SELECT c.id
      FROM chat_channels c
      INNER JOIN chat_channel_members cm1 ON c.id = cm1.channel_id AND cm1.user_id = ?
      INNER JOIN chat_channel_members cm2 ON c.id = cm2.channel_id AND cm2.user_id = ?
      WHERE c.type = 'direct_message' AND c.active = 1
      LIMIT 1
    `;

    const existingDM: any = await new Promise((resolve) => {
      db.get(existingDMQuery, [user.username, targetUsername], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (existingDM) {
      // DM already exists, return the existing one
      return NextResponse.json({
        message: 'Direct message already exists',
        dmId: existingDM.id,
        isNew: false
      });
    }

    // Create new DM channel
    const createDMQuery = `
      INSERT INTO chat_channels (name, description, type, created_by, active)
      VALUES (NULL, NULL, 'direct_message', ?, 1)
    `;

    const dmId = await new Promise<number>((resolve, reject) => {
      db.run(createDMQuery, [user.username], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });

    // Add both users as members
    const addMembersQuery = `
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
      VALUES (?, ?, 'member', CURRENT_TIMESTAMP)
    `;

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        db.run(addMembersQuery, [dmId, user.username], (err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
      new Promise<void>((resolve, reject) => {
        db.run(addMembersQuery, [dmId, targetUsername], (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    ]);

    return NextResponse.json({
      message: 'Direct message created successfully',
      dmId,
      isNew: true
    });

  } catch (error) {
    console.error('Error in POST /api/chat/dm:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}