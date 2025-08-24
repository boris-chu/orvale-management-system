import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// POST /api/chat/calls/[id]/decline - Decline incoming call
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
      return NextResponse.json({ error: 'Insufficient permissions to manage calls' }, { status: 403 })
    }

    const params = await context.params
    const callSessionId = params.id

    const body = await request.json()
    const { reason = 'declined' } = body

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

    // Check if call can be declined
    if (!['ringing', 'active'].includes(session.status)) {
      return NextResponse.json({ 
        error: `Call is ${session.status}, cannot decline` 
      }, { status: 400 })
    }

    // Check if user is a participant in this call
    const participants = JSON.parse(session.participants || '[]')
    if (!participants.includes(authResult.user.username)) {
      return NextResponse.json({ error: 'You are not a participant in this call' }, { status: 403 })
    }

    // Remove participant from call
    await runAsync(`
      DELETE FROM call_participants 
      WHERE call_session_id = ? AND user_id = ?
    `, [callSessionId, authResult.user.username])

    // Update participants list in call session
    const updatedParticipants = participants.filter(p => p !== authResult.user.username)
    await runAsync(`
      UPDATE call_sessions 
      SET participants = ?
      WHERE id = ?
    `, [JSON.stringify(updatedParticipants), callSessionId])

    // If no participants left (only initiator), end the call
    const remainingParticipants = await queryAsync(`
      SELECT COUNT(*) as count
      FROM call_participants
      WHERE call_session_id = ?
    `, [callSessionId])

    let callEnded = false
    if (remainingParticipants[0].count <= 1) { // Only initiator left
      await runAsync(`
        UPDATE call_sessions 
        SET status = 'missed', 
            ended_at = datetime('now'),
            end_reason = 'all_participants_declined'
        WHERE id = ?
      `, [callSessionId])
      callEnded = true
    }

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

    console.log(`❌ Call declined: ${authResult.user.display_name} declined ${session.call_type} call (Session: ${callSessionId})${callEnded ? ' - Call ended' : ''}`)

    return NextResponse.json({
      success: true,
      callSession: updatedSession[0],
      callEnded,
      reason,
      message: `Call declined successfully${callEnded ? ' - Call ended due to no participants' : ''}`
    })

  } catch (error) {
    console.error('❌ Error declining call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}