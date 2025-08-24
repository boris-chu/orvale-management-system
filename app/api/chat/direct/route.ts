import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/direct - Get user's direct message conversations
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.create_direct')) {
      return NextResponse.json({ error: 'Insufficient permissions for direct messages' }, { status: 403 })
    }

    // Get 1-on-1 direct message conversations only (exactly 2 participants)
    const directChannels = await queryAsync(`
      SELECT 
        c.*,
        ccm.last_read_at,
        (
          SELECT COUNT(*) 
          FROM chat_messages cm 
          WHERE cm.channel_id = c.id 
          AND cm.user_id != ?
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
        ) as last_message_at,
        (
          SELECT u.display_name
          FROM chat_messages cm
          JOIN users u ON cm.user_id = u.username
          WHERE cm.channel_id = c.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message_by
      FROM chat_channels c
      JOIN chat_channel_members ccm ON c.id = ccm.channel_id
      WHERE c.type = 'direct' 
        AND c.active = 1 
        AND ccm.user_id = ? 
        AND ccm.active = 1
        AND (
          SELECT COUNT(*)
          FROM chat_channel_members ccm2
          WHERE ccm2.channel_id = c.id AND ccm2.active = 1
        ) = 2
      ORDER BY 
        CASE WHEN last_message_at IS NOT NULL THEN last_message_at ELSE c.created_at END DESC
    `, [authResult.user.username, authResult.user.username])

    // For each direct channel, get the other participants
    const conversationsWithParticipants = await Promise.all(
      directChannels.map(async (channel) => {
        const participants = await queryAsync(`
          SELECT 
            ccm.user_id,
            ccm.role,
            u.display_name,
            u.profile_picture,
            up.status as presence_status
          FROM chat_channel_members ccm
          JOIN users u ON ccm.user_id = u.username
          LEFT JOIN user_presence up ON u.username = up.user_id
          WHERE ccm.channel_id = ? 
            AND ccm.active = 1 
            AND ccm.user_id != ?
        `, [channel.id, authResult.user.username])

        return {
          ...channel,
          participants
        }
      })
    )

    return NextResponse.json({
      success: true,
      conversations: conversationsWithParticipants
    })

  } catch (error) {
    console.error('❌ Error fetching direct conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/direct - Create or get existing direct message conversation
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.create_direct')) {
      return NextResponse.json({ error: 'Insufficient permissions for direct messages' }, { status: 403 })
    }

    const body = await request.json()
    const { participants } = body

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Participants list is required' }, { status: 400 })
    }

    // Include the requesting user in participants
    const allParticipants = [...new Set([authResult.user.username, ...participants])]

    // Support group direct messages (3+ participants) or 1-on-1 (2 participants)
    if (allParticipants.length < 2) {
      return NextResponse.json({ error: 'Direct messages require at least 2 participants' }, { status: 400 })
    }

    // Validate all participants exist
    const userValidation = await Promise.all(
      allParticipants.map(username => 
        queryAsync('SELECT username, display_name FROM users WHERE username = ?', [username])
      )
    )

    for (let i = 0; i < userValidation.length; i++) {
      if (!userValidation[i] || userValidation[i].length === 0) {
        return NextResponse.json({ error: `User ${allParticipants[i]} not found` }, { status: 400 })
      }
    }

    // Check if a direct conversation already exists between these users
    const existingChannel = await queryAsync(`
      SELECT c.id, c.name, c.description
      FROM chat_channels c
      WHERE c.type = 'direct' 
        AND c.active = 1
        AND (
          SELECT COUNT(DISTINCT ccm.user_id)
          FROM chat_channel_members ccm
          WHERE ccm.channel_id = c.id 
            AND ccm.active = 1
            AND ccm.user_id IN (${allParticipants.map(() => '?').join(',')})
        ) = ?
        AND (
          SELECT COUNT(*)
          FROM chat_channel_members ccm
          WHERE ccm.channel_id = c.id AND ccm.active = 1
        ) = ?
    `, [...allParticipants, allParticipants.length, allParticipants.length])

    if (existingChannel && existingChannel.length > 0) {
      // Return existing conversation
      const channel = existingChannel[0]
      
      // Get participants info
      const participantsInfo = await queryAsync(`
        SELECT 
          ccm.user_id,
          u.display_name,
          u.profile_picture,
          up.status as presence_status
        FROM chat_channel_members ccm
        JOIN users u ON ccm.user_id = u.username
        LEFT JOIN user_presence up ON u.username = up.user_id
        WHERE ccm.channel_id = ? AND ccm.active = 1
      `, [channel.id])

      return NextResponse.json({
        success: true,
        conversation: {
          ...channel,
          participants: participantsInfo
        },
        created: false,
        message: 'Existing conversation found'
      })
    }

    // Create new direct message channel
    const otherUsers = allParticipants.filter(p => p !== authResult.user.username)
    const allUsersInfo = userValidation.map(user => user[0]).filter(Boolean)
    
    const channelName = allParticipants.length === 2 
      ? `DM: ${allUsersInfo.map(u => u.display_name).join(' & ')}`
      : `Group: ${allUsersInfo.map(u => u.display_name).join(', ')}`
    
    const channelResult = await runAsync(`
      INSERT INTO chat_channels (name, description, type, created_by)
      VALUES (?, ?, 'direct', ?)
    `, [channelName, 'Direct message conversation', authResult.user.username])

    const channelId = channelResult.lastID

    // Add all participants as members
    for (const username of allParticipants) {
      await runAsync(`
        INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
        VALUES (?, ?, 'member', datetime('now'))
      `, [channelId, username])
    }

    // Get the new channel with participants
    const newChannel = await queryAsync(`
      SELECT * FROM chat_channels WHERE id = ?
    `, [channelId])

    const participantsInfo = await queryAsync(`
      SELECT 
        ccm.user_id,
        u.display_name,
        u.profile_picture,
        up.status as presence_status
      FROM chat_channel_members ccm
      JOIN users u ON ccm.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE ccm.channel_id = ? AND ccm.active = 1
    `, [channelId])

    return NextResponse.json({
      success: true,
      conversation: {
        ...newChannel[0],
        participants: participantsInfo
      },
      created: true,
      message: 'Direct conversation created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating direct conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}