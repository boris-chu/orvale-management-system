/**
 * Direct Message API
 * GET /api/chat/dm - Get user's direct messages
 * POST /api/chat/dm - Create or find existing direct message
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // Get user's direct messages with participant info and last message
    const query = `
      SELECT 
        c.id,
        c.created_at,
        GROUP_CONCAT(cm.user_id) as all_members,
        GROUP_CONCAT(u.display_name) as all_display_names,
        (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id AND created_at > COALESCE(user_cm.last_read_at, '1970-01-01')) as unread_count,
        (SELECT message_text FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chat_channels c
      INNER JOIN chat_channel_members user_cm ON c.id = user_cm.channel_id AND user_cm.user_id = ?
      INNER JOIN chat_channel_members cm ON c.id = cm.channel_id
      INNER JOIN users u ON cm.user_id = u.username
      WHERE c.type = 'direct_message' AND c.active = 1
      GROUP BY c.id, c.created_at
      ORDER BY COALESCE(last_message_time, c.created_at) DESC
    `;

    const rows = await queryAsync(query, [user.username]);
    
    // Process DM data to include participant info and computed display names
    const dms = rows.map((row: any) => {
      const memberUsernames = row.all_members.split(',');
      const memberDisplayNames = row.all_display_names.split(',');
      
      // Create participant objects
      const participants = memberUsernames.map((username: string, index: number) => ({
        username: username,
        display_name: memberDisplayNames[index] || username,
        profile_picture: '', // TODO: Add profile picture support
        role_id: 'user'
      }));
      
      // Find the other participant (not the current user)
      const otherParticipant = participants.find(p => p.username !== user.username);
      
      // Compute display name based on other participant
      const displayName = otherParticipant ? otherParticipant.display_name : 'Unknown User';
      
      return {
        id: row.id,
        name: otherParticipant ? otherParticipant.username : 'unknown',
        displayName: displayName,
        participants: participants,
        unreadCount: row.unread_count || 0,
        lastMessage: row.last_message || '',
        lastMessageTime: row.last_message_time || row.created_at,
        type: 'direct_message'
      };
    });

    console.log(`📨 DM API: Loaded ${dms.length} direct messages for user ${user.username}`);
    
    return NextResponse.json({ dms });
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

    try {
      // Check if target user exists
      const userCheckQuery = `SELECT username FROM users WHERE username = ?`;
      const targetUserExists = await getAsync(userCheckQuery, [targetUsername]);

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

      const existingDM = await getAsync(existingDMQuery, [user.username, targetUsername]);

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

      const result = await runAsync(createDMQuery, [user.username]);
      const dmId = result.lastID;

      // Add both users as members
      const addMembersQuery = `
        INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
        VALUES (?, ?, 'member', CURRENT_TIMESTAMP)
      `;

      await Promise.all([
        runAsync(addMembersQuery, [dmId, user.username]),
        runAsync(addMembersQuery, [dmId, targetUsername])
      ]);

      return NextResponse.json({
        message: 'Direct message created successfully',
        dmId,
        isNew: true
      });

    } catch (dbError) {
      console.error('Database error in DM creation:', dbError);
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in POST /api/chat/dm:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}