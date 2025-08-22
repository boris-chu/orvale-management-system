import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/channels/[id]/messages - Get paginated messages for channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: channelId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const before = searchParams.get('before') // Timestamp for cursor-based pagination
    const after = searchParams.get('after')

    // Check if user has access to this channel
    const channelAccess = await queryAsync(`
      SELECT c.type, ccm.user_id
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, channelId])

    if (!channelAccess || channelAccess.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const hasAccess = channelAccess[0].type === 'public' || 
                     channelAccess[0].user_id !== null ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build messages query with pagination
    let messagesQuery = `
      SELECT 
        cm.*,
        u.display_name,
        u.profile_picture,
        reply_to.message_text as reply_to_text,
        reply_to_user.display_name as reply_to_display_name,
        (
          SELECT COUNT(*) 
          FROM message_reactions mr 
          WHERE mr.message_id = cm.id
        ) as reaction_count,
        (
          SELECT JSON_GROUP_ARRAY(
            JSON_OBJECT(
              'emoji', emoji,
              'count', reaction_count,
              'users', users
            )
          )
          FROM (
            SELECT 
              mr.emoji,
              COUNT(*) as reaction_count,
              JSON_GROUP_ARRAY(mu.display_name) as users
            FROM message_reactions mr
            JOIN users mu ON mr.user_id = mu.username
            WHERE mr.message_id = cm.id
            GROUP BY mr.emoji
          )
        ) as reactions
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.username
      LEFT JOIN chat_messages reply_to ON cm.reply_to_id = reply_to.id
      LEFT JOIN users reply_to_user ON reply_to.user_id = reply_to_user.username
      WHERE cm.channel_id = ?
    `

    const params: any[] = [channelId]

    // Add cursor-based pagination
    if (before) {
      messagesQuery += ' AND cm.created_at < ?'
      params.push(before)
    }

    if (after) {
      messagesQuery += ' AND cm.created_at > ?'
      params.push(after)
    }

    messagesQuery += ' ORDER BY cm.created_at DESC LIMIT ?'
    params.push(limit)

    const messages = await queryAsync(messagesQuery, params)

    // Parse reactions JSON
    const messagesWithReactions = messages.map(message => ({
      ...message,
      reactions: message.reactions ? JSON.parse(message.reactions) : []
    }))

    // Update last read timestamp for the user
    await runAsync(`
      UPDATE chat_channel_members 
      SET last_read_at = datetime('now')
      WHERE channel_id = ? AND user_id = ?
    `, [channelId, authResult.user.username])

    return NextResponse.json({
      success: true,
      messages: messagesWithReactions.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        has_more: messages.length === limit,
        oldest_id: messages.length > 0 ? messages[messages.length - 1].id : null,
        newest_id: messages.length > 0 ? messages[0].id : null
      }
    })

  } catch (error) {
    console.error('❌ Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/channels/[id]/messages - Send new message to channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: channelId } = await params
    const body = await request.json()
    const { 
      message_text, 
      message_type = 'text', 
      reply_to_id = null,
      file_attachment = null,
      ticket_reference = null 
    } = body

    // Validate message content
    if (!message_text || message_text.trim().length === 0) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    if (message_text.trim().length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 characters)' }, { status: 400 })
    }

    if (!['text', 'file', 'system'].includes(message_type)) {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }

    // Check if user is a member of the channel
    const membership = await queryAsync(`
      SELECT ccm.*, c.type
      FROM chat_channel_members ccm
      JOIN chat_channels c ON ccm.channel_id = c.id
      WHERE ccm.channel_id = ? AND ccm.user_id = ? AND ccm.active = 1 AND c.active = 1
    `, [channelId, authResult.user.username])

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this channel' }, { status: 403 })
    }

    // Validate reply_to_id if provided
    if (reply_to_id) {
      const replyMessage = await queryAsync(`
        SELECT id FROM chat_messages 
        WHERE id = ? AND channel_id = ?
      `, [reply_to_id, channelId])

      if (!replyMessage || replyMessage.length === 0) {
        return NextResponse.json({ error: 'Reply message not found' }, { status: 400 })
      }
    }

    // Validate ticket reference if provided
    if (ticket_reference) {
      const ticket = await queryAsync(`
        SELECT submission_id FROM user_tickets 
        WHERE submission_id = ?
      `, [ticket_reference])

      if (!ticket || ticket.length === 0) {
        return NextResponse.json({ error: 'Referenced ticket not found' }, { status: 400 })
      }
    }

    // Insert the message
    const result = await runAsync(`
      INSERT INTO chat_messages (
        channel_id, 
        user_id, 
        message_text, 
        message_type, 
        reply_to_id,
        file_attachment,
        ticket_reference
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      channelId, 
      authResult.user.username, 
      message_text.trim(), 
      message_type, 
      reply_to_id,
      file_attachment,
      ticket_reference
    ])

    // Get the complete message with user info
    const fullMessage = await queryAsync(`
      SELECT 
        cm.*,
        u.display_name,
        u.profile_picture,
        reply_to.message_text as reply_to_text,
        reply_to_user.display_name as reply_to_display_name
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.username
      LEFT JOIN chat_messages reply_to ON cm.reply_to_id = reply_to.id
      LEFT JOIN users reply_to_user ON reply_to.user_id = reply_to_user.username
      WHERE cm.id = ?
    `, [result.lastID])

    const messageData = fullMessage[0]

    return NextResponse.json({
      success: true,
      message: {
        ...messageData,
        reactions: []
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}