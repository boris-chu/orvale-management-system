import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/direct/[username] - Get or create direct conversation with specific user
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.create_direct')) {
      return NextResponse.json({ error: 'Insufficient permissions for direct messages' }, { status: 403 })
    }

    const params = await context.params
    const targetUsername = params.username

    // Can't DM yourself
    if (targetUsername === authResult.user.username) {
      return NextResponse.json({ error: 'Cannot create direct message with yourself' }, { status: 400 })
    }

    // Verify target user exists
    const targetUser = await queryAsync(`
      SELECT username, display_name, profile_picture 
      FROM users 
      WHERE username = ?
    `, [targetUsername])

    if (!targetUser || targetUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetUserInfo = targetUser[0]

    // Look for existing direct conversation between these two users
    const existingConversation = await queryAsync(`
      SELECT DISTINCT c.*
      FROM chat_channels c
      JOIN chat_channel_members ccm1 ON c.id = ccm1.channel_id
      JOIN chat_channel_members ccm2 ON c.id = ccm2.channel_id
      WHERE c.type = 'direct' 
        AND c.active = 1
        AND ccm1.user_id = ? 
        AND ccm2.user_id = ?
        AND ccm1.active = 1 
        AND ccm2.active = 1
        AND (
          SELECT COUNT(*) 
          FROM chat_channel_members ccm 
          WHERE ccm.channel_id = c.id AND ccm.active = 1
        ) = 2
    `, [authResult.user.username, targetUsername])

    if (existingConversation && existingConversation.length > 0) {
      const conversation = existingConversation[0]

      // Get conversation details with unread count
      const conversationDetails = await queryAsync(`
        SELECT 
          c.*,
          ccm.last_read_at,
          (
            SELECT COUNT(*) 
            FROM chat_messages cm 
            WHERE cm.channel_id = c.id 
            AND cm.created_at > COALESCE(ccm.last_read_at, '1970-01-01')
          ) as unread_count,
          (
            SELECT cm.message_text
            FROM chat_messages cm
            WHERE cm.channel_id = c.id
            ORDER BY cm.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT cm.created_at
            FROM chat_messages cm
            WHERE cm.channel_id = c.id
            ORDER BY cm.created_at DESC
            LIMIT 1
          ) as last_message_at
        FROM chat_channels c
        LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
        WHERE c.id = ?
      `, [authResult.user.username, conversation.id])

      // Get presence status
      const presence = await queryAsync(`
        SELECT status, status_message, last_active
        FROM user_presence 
        WHERE user_id = ?
      `, [targetUsername])

      return NextResponse.json({
        success: true,
        conversation: conversationDetails[0],
        participant: {
          ...targetUserInfo,
          presence: presence[0] || { status: 'offline', status_message: null, last_active: null }
        },
        existing: true
      })
    }

    // No existing conversation found, return user info for potential conversation
    const presence = await queryAsync(`
      SELECT status, status_message, last_active
      FROM user_presence 
      WHERE user_id = ?
    `, [targetUsername])

    return NextResponse.json({
      success: true,
      conversation: null,
      participant: {
        ...targetUserInfo,
        presence: presence[0] || { status: 'offline', status_message: null, last_active: null }
      },
      existing: false,
      message: 'No existing conversation found. Use POST to create one.'
    })

  } catch (error) {
    console.error('❌ Error fetching direct conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/direct/[username] - Create direct conversation with specific user
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.create_direct')) {
      return NextResponse.json({ error: 'Insufficient permissions for direct messages' }, { status: 403 })
    }

    const params = await context.params
    const targetUsername = params.username
    const body = await request.json()
    const { initial_message = null } = body

    // Can't DM yourself
    if (targetUsername === authResult.user.username) {
      return NextResponse.json({ error: 'Cannot create direct message with yourself' }, { status: 400 })
    }

    // Verify target user exists
    const targetUser = await queryAsync(`
      SELECT username, display_name, profile_picture 
      FROM users 
      WHERE username = ?
    `, [targetUsername])

    if (!targetUser || targetUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetUserInfo = targetUser[0]

    // Check if conversation already exists
    const existingConversation = await queryAsync(`
      SELECT DISTINCT c.*
      FROM chat_channels c
      JOIN chat_channel_members ccm1 ON c.id = ccm1.channel_id
      JOIN chat_channel_members ccm2 ON c.id = ccm2.channel_id
      WHERE c.type = 'direct' 
        AND c.active = 1
        AND ccm1.user_id = ? 
        AND ccm2.user_id = ?
        AND ccm1.active = 1 
        AND ccm2.active = 1
    `, [authResult.user.username, targetUsername])

    if (existingConversation && existingConversation.length > 0) {
      const conversation = existingConversation[0]

      // If initial message provided, send it
      if (initial_message && initial_message.trim()) {
        await runAsync(`
          INSERT INTO chat_messages (channel_id, user_id, message_text, message_type)
          VALUES (?, ?, ?, 'text')
        `, [conversation.id, authResult.user.username, initial_message.trim()])
      }

      return NextResponse.json({
        success: true,
        conversation,
        participant: targetUserInfo,
        existing: true,
        message: initial_message ? 'Message sent to existing conversation' : 'Existing conversation found'
      })
    }

    // Create new direct conversation
    const channelName = `DM: ${authResult.user.display_name} & ${targetUserInfo.display_name}`
    
    const channelResult = await runAsync(`
      INSERT INTO chat_channels (name, description, type, created_by)
      VALUES (?, ?, 'direct', ?)
    `, [channelName, 'Direct message conversation', authResult.user.username])

    const channelId = channelResult.lastID

    // Add both users as members
    await runAsync(`
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
      VALUES (?, ?, 'member', datetime('now'))
    `, [channelId, authResult.user.username])

    await runAsync(`
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
      VALUES (?, ?, 'member', datetime('now'))
    `, [channelId, targetUsername])

    // Send initial message if provided
    if (initial_message && initial_message.trim()) {
      await runAsync(`
        INSERT INTO chat_messages (channel_id, user_id, message_text, message_type)
        VALUES (?, ?, ?, 'text')
      `, [channelId, authResult.user.username, initial_message.trim()])
    }

    // Get the created conversation
    const newConversation = await queryAsync(`
      SELECT * FROM chat_channels WHERE id = ?
    `, [channelId])

    return NextResponse.json({
      success: true,
      conversation: newConversation[0],
      participant: targetUserInfo,
      existing: false,
      message: 'Direct conversation created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating direct conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}