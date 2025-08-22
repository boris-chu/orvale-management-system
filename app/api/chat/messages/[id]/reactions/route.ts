import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/messages/[id]/reactions - Get reactions for a message
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

    // Check if message exists and user has access to the channel
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

    // Get all reactions for the message
    const reactions = await queryAsync(`
      SELECT 
        mr.emoji,
        COUNT(*) as count,
        JSON_GROUP_ARRAY(
          JSON_OBJECT(
            'user_id', mr.user_id,
            'display_name', u.display_name,
            'profile_picture', u.profile_picture,
            'created_at', mr.created_at
          )
        ) as users
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.username
      WHERE mr.message_id = ?
      GROUP BY mr.emoji
      ORDER BY MIN(mr.created_at) ASC
    `, [messageId])

    // Parse user JSON
    const reactionsWithUsers = reactions.map(reaction => ({
      ...reaction,
      users: JSON.parse(reaction.users)
    }))

    return NextResponse.json({
      success: true,
      reactions: reactionsWithUsers
    })

  } catch (error) {
    console.error('❌ Error fetching message reactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/messages/[id]/reactions - Add reaction to message
export async function POST(
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
    const { emoji } = body

    if (!emoji || emoji.trim().length === 0) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    // Basic emoji validation (can be enhanced)
    const emojiPattern = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u
    if (!emojiPattern.test(emoji.trim()) && emoji.trim().length > 2) {
      return NextResponse.json({ error: 'Invalid emoji format' }, { status: 400 })
    }

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

    // Check if user already reacted with this emoji
    const existingReaction = await queryAsync(`
      SELECT id FROM message_reactions 
      WHERE message_id = ? AND user_id = ? AND emoji = ?
    `, [messageId, authResult.user.username, emoji.trim()])

    if (existingReaction && existingReaction.length > 0) {
      return NextResponse.json({ error: 'You already reacted with this emoji' }, { status: 400 })
    }

    // Add the reaction
    await runAsync(`
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES (?, ?, ?)
    `, [messageId, authResult.user.username, emoji.trim()])

    // Get updated reaction count for this emoji
    const reactionCount = await queryAsync(`
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
        WHERE mr.message_id = ? AND mr.emoji = ?
        ORDER BY mr.created_at ASC
      )
      GROUP BY emoji
    `, [messageId, emoji.trim()])

    const reaction = reactionCount[0]

    return NextResponse.json({
      success: true,
      reaction: {
        ...reaction,
        users: JSON.parse(reaction.users)
      },
      message: 'Reaction added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error adding reaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}