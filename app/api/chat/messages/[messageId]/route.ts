import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// PATCH /api/chat/messages/[messageId] - Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { messageId } = await params
    const body = await request.json()
    const { message_text } = body

    // Validate message content
    if (!message_text || message_text.trim().length === 0) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    if (message_text.trim().length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 characters)' }, { status: 400 })
    }

    // Check if message exists
    const messageCheck = await queryAsync(`
      SELECT cm.*, c.id as channel_id
      FROM chat_messages cm
      JOIN chat_channels c ON cm.channel_id = c.id
      WHERE cm.id = ? AND c.active = 1
    `, [messageId])

    if (!messageCheck || messageCheck.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if user owns the message
    const message = messageCheck[0]
    if (message.user_id !== authResult.user.username) {
      return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 })
    }

    // Check if user is still a member of the channel
    const membership = await queryAsync(`
      SELECT * FROM chat_channel_members 
      WHERE channel_id = ? AND user_id = ? AND active = 1
    `, [message.channel_id, authResult.user.username])

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this channel' }, { status: 403 })
    }

    // Update the message
    await runAsync(`
      UPDATE chat_messages 
      SET message_text = ?, edited_at = datetime('now')
      WHERE id = ?
    `, [message_text.trim(), messageId])

    // Get the updated message with user info
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

    // Parse file_attachment safely for response
    let parsedFileAttachment = null
    if (updatedMessage[0].file_attachment) {
      try {
        if (typeof updatedMessage[0].file_attachment === 'object') {
          parsedFileAttachment = updatedMessage[0].file_attachment
        } else {
          parsedFileAttachment = JSON.parse(updatedMessage[0].file_attachment)
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse file_attachment JSON in PATCH response:', messageId, error)
        parsedFileAttachment = null
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        ...updatedMessage[0],
        reactions: [], // TODO: Get actual reactions
        file_attachment: parsedFileAttachment,
        edited: !!updatedMessage[0].edited_at
      }
    })

  } catch (error) {
    console.error('❌ Error editing message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chat/messages/[messageId] - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { messageId } = await params

    // Check if message exists and user owns it or has admin permissions
    const message = await queryAsync(`
      SELECT cm.*, c.id as channel_id
      FROM chat_messages cm
      JOIN chat_channels c ON cm.channel_id = c.id
      WHERE cm.id = ? AND c.active = 1
    `, [messageId])

    if (!message || message.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check permissions - user owns message OR has admin permissions
    const isOwner = message[0].user_id === authResult.user.username
    const isAdmin = authResult.user.permissions?.includes('chat.manage_channels')

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'You do not have permission to delete this message' }, { status: 403 })
    }

    // Check if user is still a member of the channel
    const membership = await queryAsync(`
      SELECT * FROM chat_channel_members 
      WHERE channel_id = ? AND user_id = ? AND active = 1
    `, [message.channel_id, authResult.user.username])

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this channel' }, { status: 403 })
    }

    // Soft delete the message (mark as deleted instead of removing from DB)
    await runAsync(`
      UPDATE chat_messages 
      SET deleted_at = datetime('now')
      WHERE id = ?
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