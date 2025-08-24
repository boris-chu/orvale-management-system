import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// POST /api/chat/calls/initiate - Start new call
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has call initiation permission
    if (!authResult.user.permissions?.includes('chat.initiate_calls')) {
      return NextResponse.json({ error: 'Insufficient permissions to initiate calls' }, { status: 403 })
    }

    const body = await request.json()
    const { channelId, callType, targetUsers = [] } = body

    // Validate required fields
    if (!callType || !['audio', 'video', 'screen_share'].includes(callType)) {
      return NextResponse.json({ error: 'Valid call type is required (audio, video, screen_share)' }, { status: 400 })
    }

    // For direct calls, targetUsers is required. For channel calls, channelId is required
    if (!channelId && (!targetUsers || targetUsers.length === 0)) {
      return NextResponse.json({ error: 'Either channelId or targetUsers is required' }, { status: 400 })
    }

    let participants: string[] = []
    let finalChannelId = channelId

    if (channelId) {
      // Channel-based call - get all active channel members
      const channelMembers = await queryAsync(`
        SELECT ccm.user_id
        FROM chat_channel_members ccm
        JOIN chat_channels c ON ccm.channel_id = c.id
        WHERE ccm.channel_id = ? AND ccm.active = 1 AND c.active = 1
      `, [channelId])

      if (!channelMembers || channelMembers.length === 0) {
        return NextResponse.json({ error: 'Channel not found or has no members' }, { status: 404 })
      }

      // Check if user is a member of the channel
      const userIsMember = channelMembers.some(member => member.user_id === authResult.user.username)
      if (!userIsMember) {
        return NextResponse.json({ error: 'You are not a member of this channel' }, { status: 403 })
      }

      participants = channelMembers
        .map(member => member.user_id)
        .filter(userId => userId !== authResult.user.username) // Exclude initiator
    } else {
      // Direct call - validate target users exist
      for (const username of targetUsers) {
        const user = await queryAsync('SELECT username FROM users WHERE username = ? AND active = 1', [username])
        if (!user || user.length === 0) {
          return NextResponse.json({ error: `User ${username} not found or inactive` }, { status: 404 })
        }
      }
      participants = targetUsers
    }

    if (participants.length === 0) {
      return NextResponse.json({ error: 'No participants available for the call' }, { status: 400 })
    }

    // Create call session
    const participantsJson = JSON.stringify([authResult.user.username, ...participants])
    
    const result = await runAsync(`
      INSERT INTO call_sessions (
        channel_id, 
        initiator_user_id, 
        call_type, 
        participants, 
        status,
        started_at
      ) VALUES (?, ?, ?, ?, 'ringing', datetime('now'))
    `, [finalChannelId || null, authResult.user.username, callType, participantsJson])

    const callSessionId = result.lastID

    // Add initiator as participant
    await runAsync(`
      INSERT INTO call_participants (call_session_id, user_id, joined_at, connection_quality)
      VALUES (?, ?, datetime('now'), 'excellent')
    `, [callSessionId, authResult.user.username])

    // Add other participants (they start as 'ringing' until they join)
    for (const participantId of participants) {
      await runAsync(`
        INSERT INTO call_participants (call_session_id, user_id, connection_quality)
        VALUES (?, ?, 'disconnected')
      `, [callSessionId, participantId])
    }

    // Get the complete call session data
    const callSession = await queryAsync(`
      SELECT 
        cs.*,
        u.display_name as initiator_name,
        c.name as channel_name
      FROM call_sessions cs
      LEFT JOIN users u ON cs.initiator_user_id = u.username
      LEFT JOIN chat_channels c ON cs.channel_id = c.id
      WHERE cs.id = ?
    `, [callSessionId])

    console.log(`🔔 Call initiated: ${callType} call by ${authResult.user.display_name} (${participants.length + 1} participants)`)

    // Note: Socket.IO events will be handled by the CallInitiator component
    // which emits 'call_initiate' event after receiving this API response

    return NextResponse.json({
      success: true,
      callSession: callSession[0],
      participants: [authResult.user.username, ...participants],
      message: 'Call initiated successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error initiating call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}