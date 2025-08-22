import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/messages/[id] - Get specific message details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const messageId = params.id

    // Get message with user access check
    const message = await queryAsync(`
      SELECT 
        cm.*,
        u.display_name,
        u.profile_picture,
        c.type as channel_type,
        ccm.user_id as user_access,
        reply_to.message_text as reply_to_text,
        reply_to_user.display_name as reply_to_display_name
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.username
      JOIN chat_channels c ON cm.channel_id = c.id
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      LEFT JOIN chat_messages reply_to ON cm.reply_to_id = reply_to.id
      LEFT JOIN users reply_to_user ON reply_to.user_id = reply_to_user.username
      WHERE cm.id = ? AND c.active = 1
    `, [authResult.user.username, messageId])

    if (!message || message.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const messageData = message[0]

    // Check access
    const hasAccess = messageData.channel_type === 'public' || 
                     messageData.user_access !== null ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get reactions
    const reactions = await queryAsync(`
      SELECT 
        emoji,
        COUNT(*) as count,
        JSON_GROUP_ARRAY(
          JSON_OBJECT(
            'user_id', user_id,
            'display_name', display_name,
            'profile_picture', profile_picture
          )
        ) as users
      FROM (
        SELECT 
          mr.emoji,
          mr.user_id,
          u.display_name,
          u.profile_picture
        FROM message_reactions mr
        JOIN users u ON mr.user_id = u.username
        WHERE mr.message_id = ?
        ORDER BY mr.created_at ASC
      )
      GROUP BY emoji
    `, [messageId])

    const reactionsWithUsers = reactions.map(reaction => ({
      ...reaction,
      users: JSON.parse(reaction.users)
    }))

    return NextResponse.json({
      success: true,
      message: {
        ...messageData,
        reactions: reactionsWithUsers
      }
    })

  } catch (error) {
    console.error('❌ Error fetching message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/chat/messages/[id] - Edit message
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const messageId = params.id
    const body = await request.json()
    const { message_text } = body

    if (!message_text || message_text.trim().length === 0) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    if (message_text.trim().length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 characters)' }, { status: 400 })
    }

    // Get message and check permissions
    const message = await queryAsync(`
      SELECT cm.*, c.type as channel_type, ccm.user_id as user_access
      FROM chat_messages cm
      JOIN chat_channels c ON cm.channel_id = c.id
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE cm.id = ? AND c.active = 1
    `, [authResult.user.username, messageId])

    if (!message || message.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const messageData = message[0]

    // Check if user can edit this message
    const canEdit = messageData.user_id === authResult.user.username ||
                   authResult.user.permissions?.includes('chat.moderate_channels')

    if (!canEdit) {
      return NextResponse.json({ error: 'Cannot edit this message' }, { status: 403 })
    }

    // Check if message is not too old (15 minutes for regular users)
    const messageAge = new Date() - new Date(messageData.created_at)
    const maxEditAge = 15 * 60 * 1000 // 15 minutes

    if (messageData.user_id === authResult.user.username && 
        messageAge > maxEditAge && 
        !authResult.user.permissions?.includes('chat.moderate_channels')) {
      return NextResponse.json({ error: 'Message too old to edit' }, { status: 400 })
    }

    // Update the message
    await runAsync(`
      UPDATE chat_messages 
      SET message_text = ?, updated_at = datetime('now'), edited = 1
      WHERE id = ?
    `, [message_text.trim(), messageId])

    // Get updated message
    const updatedMessage = await queryAsync(`
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
    `, [messageId])

    return NextResponse.json({
      success: true,
      message: updatedMessage[0]
    })

  } catch (error) {
    console.error('❌ Error editing message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chat/messages/[id] - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messageId = params.id

    // Get message and check permissions
    const message = await queryAsync(`
      SELECT cm.*, c.type as channel_type, ccm.user_id as user_access
      FROM chat_messages cm
      JOIN chat_channels c ON cm.channel_id = c.id
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE cm.id = ? AND c.active = 1
    `, [authResult.user.username, messageId])

    if (!message || message.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const messageData = message[0]

    // Check if user can delete this message
    const canDelete = messageData.user_id === authResult.user.username ||
                     authResult.user.permissions?.includes('chat.delete_messages') ||
                     authResult.user.permissions?.includes('chat.moderate_channels')

    if (!canDelete) {
      return NextResponse.json({ error: 'Cannot delete this message' }, { status: 403 })
    }

    // Soft delete the message
    await runAsync(`
      UPDATE chat_messages 
      SET message_text = '[Message deleted]', deleted = 1, updated_at = datetime('now')
      WHERE id = ?
    `, [messageId])

    // Also delete all reactions for this message
    await runAsync(`
      DELETE FROM message_reactions 
      WHERE message_id = ?
    `, [messageId])

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}