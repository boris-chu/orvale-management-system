import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has chat access
    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const messageData = await request.json();
    console.log('📤 Chat Messages API: Received message data:', {
      id: messageData.id,
      type: messageData.type,
      channel: messageData.channel,
      from: messageData.from,
      contentType: typeof messageData.content,
      messageText: messageData.content?.message_text?.substring(0, 50) + '...'
    });
    
    // Extract message details from RealTimeMessage format
    const {
      id,
      type,
      channel,
      from,
      content,
      timestamp
    } = messageData;

    // Validate required fields
    if (!channel || !content?.message_text || !from) {
      console.error('❌ Chat Messages API: Missing required fields:', {
        hasChannel: !!channel,
        hasMessageText: !!content?.message_text,
        hasFrom: !!from,
        channel,
        from,
        contentType: typeof content
      });
      return NextResponse.json({ 
        error: 'Missing required fields: channel, content.message_text, from' 
      }, { status: 400 });
    }

    // Convert channel ID to integer if it's a string
    let channelId;
    try {
      channelId = parseInt(channel);
      if (isNaN(channelId)) {
        return NextResponse.json({ 
          error: 'Invalid channel ID format' 
        }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid channel ID' 
      }, { status: 400 });
    }

    // Ensure the user is authorized to send to this channel
    const channelAccess = await queryAsync(`
      SELECT c.id, c.name, cm.user_id
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, channelId]);

    if (!channelAccess || channelAccess.length === 0) {
      // For public channels, allow access even if not explicitly a member
      const publicChannel = await queryAsync(`
        SELECT id, name FROM chat_channels 
        WHERE id = ? AND type = 'public' AND active = 1
      `, [channelId]);
      
      if (!publicChannel || publicChannel.length === 0) {
        return NextResponse.json({ 
          error: 'Channel not found or access denied' 
        }, { status: 403 });
      }
    }

    // Insert the message into the database (without display_name column)
    try {
      console.log('💾 Chat Messages API: Inserting message:', {
        channelId,
        from,
        messageType: content.message_type || 'text',
        messageLength: content.message_text.length
      });

      await runAsync(`
        INSERT INTO chat_messages (
          channel_id, user_id, message_text, message_type, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        channelId,
        from,
        content.message_text,
        content.message_type || 'text'
      ]);

      console.log(`✅ Message sent via REST API: ${from} -> ${channel}: ${content.message_text.substring(0, 50)}...`);

      return NextResponse.json({ 
        success: true,
        messageId: id,
        timestamp: timestamp 
      });
    } catch (dbError) {
      console.error('❌ Chat Messages API: Database insert failed:', dbError);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

  } catch (error) {
    console.error('❌ Error sending message via REST API:', error);
    
    // Handle database errors specifically
    if (error.message?.includes('SQLITE_CONSTRAINT')) {
      return NextResponse.json({ 
        error: 'Message ID already exists or constraint violation' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to send message' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has chat access
    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const channelId = url.searchParams.get('channel');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!channelId) {
      return NextResponse.json({ 
        error: 'Channel ID is required' 
      }, { status: 400 });
    }

    const numericChannelId = parseInt(channelId);
    if (isNaN(numericChannelId)) {
      return NextResponse.json({ 
        error: 'Invalid channel ID format' 
      }, { status: 400 });
    }

    // Verify user has access to this channel
    const channelAccess = await queryAsync(`
      SELECT c.id, c.name
      FROM chat_channels c
      LEFT JOIN chat_channel_members cm ON c.id = cm.channel_id AND cm.user_id = ?
      WHERE c.id = ? AND c.active = 1 AND (c.type = 'public' OR cm.user_id IS NOT NULL)
    `, [authResult.user.username, numericChannelId]);

    if (!channelAccess || channelAccess.length === 0) {
      return NextResponse.json({ 
        error: 'Channel not found or access denied' 
      }, { status: 403 });
    }

    // Get messages from the channel
    const messages = await queryAsync(`
      SELECT 
        id, channel_id, user_id, message_text, message_type,
        created_at, edited_at, deleted_at, reply_to_id
      FROM chat_messages 
      WHERE channel_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [numericChannelId, limit, offset]);

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      channel: channelAccess[0],
      pagination: {
        limit,
        offset,
        total: messages.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch messages' 
    }, { status: 500 });
  }
}