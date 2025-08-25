/**
 * Direct Messages API
 * GET /api/chat/direct-messages - Get user's DM channels
 * POST /api/chat/direct-messages - Create new DM or group chat
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

    // Get user's direct message and group channels
    const dmQuery = `
      SELECT 
        c.id,
        c.name,
        c.type,
        c.created_at,
        c.updated_at,
        cm.last_read_at,
        (SELECT COUNT(*) FROM chat_messages WHERE channel_id = c.id AND created_at > COALESCE(cm.last_read_at, '1970-01-01')) as unread_count,
        (SELECT message_text FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        GROUP_CONCAT(
          CASE 
            WHEN cm2.user_id != ? THEN u.display_name 
            ELSE NULL 
          END
        ) as other_participants
      FROM chat_channels c
      JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      LEFT JOIN chat_channel_members cm2 ON c.id = cm2.channel_id
      LEFT JOIN users u ON cm2.user_id = u.username
      WHERE c.type IN ('direct_message', 'group') 
        AND c.active = 1
      GROUP BY c.id, c.name, c.type, c.created_at, c.updated_at, cm.last_read_at
      ORDER BY last_message_time DESC NULLS LAST, c.created_at DESC
    `;

    return new Promise<Response>((resolve) => {
      db.all(dmQuery, [user.username, user.username], (err, channels) => {
        if (err) {
          console.error('Database error fetching DM channels:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        // Process channels to generate display names
        const processedChannels = channels.map((channel: any) => {
          let displayName = '';
          
          if (channel.type === 'direct_message') {
            // For DMs, show only the other participant's name
            displayName = channel.other_participants || 'Unknown User';
          } else if (channel.type === 'group') {
            // For groups, show participant names or use channel name
            if (channel.name) {
              displayName = channel.name;
            } else {
              const participants = channel.other_participants ? 
                channel.other_participants.split(',').filter(Boolean) : [];
              if (participants.length <= 2) {
                displayName = participants.join(' & ');
              } else {
                displayName = `${participants.slice(0, 2).join(', ')} +${participants.length - 2} others`;
              }
            }
          }

          return {
            ...channel,
            displayName: displayName || 'Unnamed Chat',
            participantCount: channel.other_participants ? 
              channel.other_participants.split(',').filter(Boolean).length + 1 : 1
          };
        });

        resolve(NextResponse.json({ 
          channels: processedChannels,
          total: processedChannels.length
        }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/chat/direct-messages:', error);
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

    // Check permissions
    if (!authResult.user.permissions?.includes('chat.create_direct')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { participants, name, type } = body;

    // Validate participants
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Participants are required' }, { status: 400 });
    }

    // Determine channel type
    const isGroup = participants.length > 1;
    const channelType = type || (isGroup ? 'group' : 'direct_message');

    if (!['direct_message', 'group'].includes(channelType)) {
      return NextResponse.json({ error: 'Invalid channel type for DM/group' }, { status: 400 });
    }

    // For groups, allow creating groups
    if (channelType === 'group' && !authResult.user.permissions?.includes('chat.create_groups')) {
      return NextResponse.json({ error: 'Insufficient permissions to create groups' }, { status: 403 });
    }

    // Check if participants exist
    const participantList = [...participants, user.username];
    const userCheckQuery = `
      SELECT username FROM users 
      WHERE username IN (${participantList.map(() => '?').join(',')}) AND active = 1
    `;

    const validUsers: any[] = await new Promise((resolve) => {
      db.all(userCheckQuery, participantList, (err, users) => {
        resolve(err ? [] : users);
      });
    });

    if (validUsers.length !== participantList.length) {
      return NextResponse.json({ error: 'Some participants not found or inactive' }, { status: 400 });
    }

    // For DMs, check if channel already exists
    if (channelType === 'direct_message' && participants.length === 1) {
      const existingDmQuery = `
        SELECT c.id 
        FROM chat_channels c
        JOIN chat_channel_members cm1 ON c.id = cm1.channel_id AND cm1.user_id = ?
        JOIN chat_channel_members cm2 ON c.id = cm2.channel_id AND cm2.user_id = ?
        WHERE c.type = 'direct_message' AND c.active = 1
        GROUP BY c.id
        HAVING COUNT(cm1.user_id) = 2
      `;

      const existingDm: any = await new Promise((resolve) => {
        db.get(existingDmQuery, [user.username, participants[0]], (err, row) => {
          resolve(err ? null : row);
        });
      });

      if (existingDm) {
        return NextResponse.json({ 
          message: 'DM channel already exists',
          channelId: existingDm.id,
          existing: true
        });
      }
    }

    // Create new channel
    const insertChannelQuery = `
      INSERT INTO chat_channels (name, type, created_by)
      VALUES (?, ?, ?)
    `;

    return new Promise<NextResponse>((resolve) => {
      db.run(insertChannelQuery, [name || null, channelType, user.username], function(err) {
        if (err) {
          console.error('Database error creating DM/group channel:', err);
          resolve(NextResponse.json({ error: 'Failed to create channel' }, { status: 500 }));
          return;
        }

        const channelId = this.lastID;

        // Add all participants to the channel
        const memberInserts = participantList.map(userId => {
          const role = userId === user.username ? 'owner' : 'member';
          return new Promise<void>((memberResolve) => {
            db.run(
              'INSERT INTO chat_channel_members (channel_id, user_id, role) VALUES (?, ?, ?)',
              [channelId, userId, role],
              () => memberResolve()
            );
          });
        });

        Promise.all(memberInserts).then(() => {
          resolve(NextResponse.json({ 
            message: 'Channel created successfully',
            channelId,
            type: channelType,
            participants: participantList,
            name: name || null
          }, { status: 201 }));
        }).catch(() => {
          resolve(NextResponse.json({ error: 'Failed to add participants' }, { status: 500 }));
        });
      });
    });
  } catch (error) {
    console.error('Error in POST /api/chat/direct-messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}