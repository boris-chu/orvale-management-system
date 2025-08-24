import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// POST /api/chat/calls/[id]/answer - Accept incoming call
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.join_calls')) {
      return NextResponse.json({ error: 'Insufficient permissions to join calls' }, { status: 403 })
    }

    const params = await context.params
    const callSessionId = params.id

    // Get call session details
    const callSession = await queryAsync(`
      SELECT cs.*, u.display_name as initiator_name
      FROM call_sessions cs
      LEFT JOIN users u ON cs.initiator_user_id = u.username
      WHERE cs.id = ?
    `, [callSessionId])

    if (!callSession || callSession.length === 0) {
      return NextResponse.json({ error: 'Call session not found' }, { status: 404 })
    }

    const session = callSession[0]

    // Check if call is still ringing
    if (session.status !== 'ringing') {
      return NextResponse.json({ 
        error: `Call is ${session.status}, cannot answer` 
      }, { status: 400 })
    }

    // Check if user is a participant in this call
    const participants = JSON.parse(session.participants || '[]')
    if (!participants.includes(authResult.user.username)) {
      return NextResponse.json({ error: 'You are not a participant in this call' }, { status: 403 })
    }

    // Update call session status to active and set answered_at
    await runAsync(`
      UPDATE call_sessions 
      SET status = 'active', answered_at = datetime('now')
      WHERE id = ?
    `, [callSessionId])

    // Update participant status - mark as joined
    await runAsync(`
      UPDATE call_participants 
      SET joined_at = datetime('now'), connection_quality = 'excellent'
      WHERE call_session_id = ? AND user_id = ?
    `, [callSessionId, authResult.user.username])

    // Get updated call session
    const updatedSession = await queryAsync(`
      SELECT 
        cs.*,
        u.display_name as initiator_name,
        c.name as channel_name
      FROM call_sessions cs
      LEFT JOIN users u ON cs.initiator_user_id = u.username
      LEFT JOIN chat_channels c ON cs.channel_id = c.id
      WHERE cs.id = ?
    `, [callSessionId])

    // Get all participants with their status
    const callParticipants = await queryAsync(`
      SELECT 
        cp.*,
        u.display_name,
        up.status as presence_status
      FROM call_participants cp
      JOIN users u ON cp.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE cp.call_session_id = ?
      ORDER BY cp.joined_at ASC
    `, [callSessionId])

    console.log(`📞 Call answered: ${authResult.user.display_name} joined ${session.call_type} call (Session: ${callSessionId})`)

    return NextResponse.json({
      success: true,
      callSession: updatedSession[0],
      participants: callParticipants,
      message: 'Call answered successfully'
    })

  } catch (error) {
    console.error('❌ Error answering call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}