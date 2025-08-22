import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// DELETE /api/chat/messages/[id]/reactions/[emoji] - Remove reaction from message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; emoji: string } }
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
    const emoji = decodeURIComponent(params.emoji)

    // Check if message exists and user has access
    const messageAccess = await queryAsync(`
      SELECT cm.channel_id, c.type, ccm.user_id
      FROM chat_messages cm
      JOIN chat_channels c ON cm.channel_id = c.id
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE cm.id = ? AND c.active = 1
    `, [authResult.user.username, messageId])

    if (!messageAccess || messageAccess.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const hasAccess = messageAccess[0].type === 'public' || 
                     messageAccess[0].user_id !== null ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if user has this reaction
    const existingReaction = await queryAsync(`
      SELECT id FROM message_reactions 
      WHERE message_id = ? AND user_id = ? AND emoji = ?
    `, [messageId, authResult.user.username, emoji])

    if (!existingReaction || existingReaction.length === 0) {
      return NextResponse.json({ error: 'Reaction not found' }, { status: 404 })
    }

    // Remove the reaction
    await runAsync(`
      DELETE FROM message_reactions 
      WHERE message_id = ? AND user_id = ? AND emoji = ?
    `, [messageId, authResult.user.username, emoji])

    // Get updated reaction count for this emoji
    const remainingCount = await queryAsync(`
      SELECT COUNT(*) as count
      FROM message_reactions 
      WHERE message_id = ? AND emoji = ?
    `, [messageId, emoji])

    const count = remainingCount[0]?.count || 0

    return NextResponse.json({
      success: true,
      emoji,
      remaining_count: count,
      message: 'Reaction removed successfully'
    })

  } catch (error) {
    console.error('❌ Error removing reaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}