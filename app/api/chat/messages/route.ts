/**
 * Chat Messages API
 * GET /api/chat/messages - Get messages for channel
 * POST /api/chat/messages - Send new message
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const before = searchParams.get('before'); // timestamp for pagination

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Check if user has access to this channel
    const accessQuery = `
      SELECT cm.user_id, c.type
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `;

    const channelAccess: any = await new Promise((resolve) => {
      db.get(accessQuery, [user.username, channelId], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!channelAccess) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess = channelAccess.type === 'public_channel' || 
                     channelAccess.user_id === user.username ||
                     user.permissions?.includes('chat.view_all_messages');

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this channel' }, { status: 403 });
    }

    // Build query with optional timestamp filtering
    let messagesQuery = `
      SELECT 
        m.id,
        m.channel_id,
        m.user_id,
        u.display_name as user_display_name,
        m.message_text,
        m.message_type,
        m.reply_to_id,
        m.ticket_reference,
        m.file_attachment,
        m.edited_at,
        m.is_deleted,
        m.can_edit_until,
        m.created_at,
        rm.message_text as reply_to_text,
        ru.display_name as reply_to_user
      FROM chat_messages m
      LEFT JOIN users u ON m.user_id = u.username
      LEFT JOIN chat_messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.user_id = ru.username
      WHERE m.channel_id = ?
    `;
    
    const queryParams = [channelId];

    if (before) {
      messagesQuery += ` AND m.created_at < ?`;
      queryParams.push(before);
    }

    messagesQuery += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    return new Promise((resolve) => {
      db.all(messagesQuery, queryParams, (err, messages) => {
        if (err) {
          console.error('Database error fetching messages:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        // Reverse to get chronological order
        const sortedMessages = messages.reverse();

        resolve(NextResponse.json({ 
          messages: sortedMessages,
          channelId: parseInt(channelId),
          hasMore: messages.length === limit
        }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error);
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

    // Check basic chat permissions
    if (!authResult.user.permissions?.includes('chat.send_messages')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { channelId, message, messageType, replyToId, ticketReference } = body;

    // Validate required fields
    if (!channelId || !message) {
      return NextResponse.json({ error: 'Channel ID and message are required' }, { status: 400 });
    }

    // Check if user can post in this channel
    const channelQuery = `
      SELECT 
        c.id, c.type, c.allow_posting, c.is_read_only,
        cm.can_post, cm.blocked_from_posting_by
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `;

    const channelInfo: any = await new Promise((resolve) => {
      db.get(channelQuery, [user.username, channelId], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!channelInfo) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check posting permissions
    if (channelInfo.is_read_only && !user.permissions?.includes('chat.manage_channels')) {
      return NextResponse.json({ error: 'Channel is read-only' }, { status: 403 });
    }

    if (!channelInfo.allow_posting) {
      return NextResponse.json({ error: 'Posting disabled in this channel' }, { status: 403 });
    }

    if (channelInfo.can_post === 0) {
      return NextResponse.json({ error: 'You are blocked from posting in this channel' }, { status: 403 });
    }

    // Validate message type
    const validTypes = ['text', 'file', 'image', 'gif', 'ticket_link', 'system'];
    const msgType = messageType || 'text';
    if (!validTypes.includes(msgType)) {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    // Insert message
    const insertQuery = `
      INSERT INTO chat_messages (
        channel_id, user_id, message_text, message_type, 
        reply_to_id, ticket_reference
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve) => {
      db.run(insertQuery, [
        channelId, user.username, message, msgType, 
        replyToId || null, ticketReference || null
      ], function(err) {
        if (err) {
          console.error('Database error creating message:', err);
          resolve(NextResponse.json({ error: 'Failed to send message' }, { status: 500 }));
          return;
        }

        const messageId = this.lastID;

        // Get the complete message data for response
        const selectQuery = `
          SELECT 
            m.id, m.channel_id, m.user_id,
            u.display_name as user_display_name,
            m.message_text, m.message_type, m.reply_to_id,
            m.ticket_reference, m.can_edit_until, m.created_at
          FROM chat_messages m
          LEFT JOIN users u ON m.user_id = u.username
          WHERE m.id = ?
        `;

        db.get(selectQuery, [messageId], (selectErr, messageData) => {
          if (selectErr) {
            console.error('Error fetching created message:', selectErr);
            resolve(NextResponse.json({ 
              message: 'Message sent successfully',
              messageId,
              channelId: parseInt(channelId)
            }, { status: 201 }));
            return;
          }

          resolve(NextResponse.json({ 
            message: 'Message sent successfully',
            messageData
          }, { status: 201 }));
        });
      });
    });
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}