import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// POST /api/chat/calls/[id]/end - End active call
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
    const { reason = 'completed' } = body

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

    // Check if call can be ended
    if (session.status === 'ended') {
      return NextResponse.json({ error: 'Call is already ended' }, { status: 400 })
    }

    // Check if user is a participant in this call or has admin permissions
    const participants = JSON.parse(session.participants || '[]')
    const canEnd = participants.includes(authResult.user.username) || 
                   session.initiator_user_id === authResult.user.username ||
                   authResult.user.permissions?.includes('chat.manage_calls')

    if (!canEnd) {
      return NextResponse.json({ error: 'You do not have permission to end this call' }, { status: 403 })
    }

    // Calculate call duration
    const startedAt = new Date(session.started_at)
    const answeredAt = session.answered_at ? new Date(session.answered_at) : startedAt
    const now = new Date()
    const durationSeconds = Math.floor((now.getTime() - answeredAt.getTime()) / 1000)

    // End the call
    await runAsync(`
      UPDATE call_sessions 
      SET status = 'ended', 
          ended_at = datetime('now'),
          duration_seconds = ?,
          end_reason = ?
      WHERE id = ?
    `, [durationSeconds, reason, callSessionId])

    // Mark all participants as left
    await runAsync(`
      UPDATE call_participants 
      SET left_at = datetime('now'),
          connection_quality = 'disconnected'
      WHERE call_session_id = ? AND left_at IS NULL
    `, [callSessionId])

    // Get updated call session with full details
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

    // Get final participant summary
    const participantSummary = await queryAsync(`
      SELECT 
        cp.*,
        u.display_name,
        CASE 
          WHEN cp.joined_at IS NOT NULL AND cp.left_at IS NOT NULL THEN
            (strftime('%s', cp.left_at) - strftime('%s', cp.joined_at))
          WHEN cp.joined_at IS NOT NULL THEN
            (strftime('%s', 'now') - strftime('%s', cp.joined_at))
          ELSE 0
        END as duration_seconds
      FROM call_participants cp
      JOIN users u ON cp.user_id = u.username
      WHERE cp.call_session_id = ?
      ORDER BY cp.joined_at ASC
    `, [callSessionId])

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    console.log(`🔚 Call ended: ${session.call_type} call ended by ${authResult.user.display_name} after ${formatDuration(durationSeconds)} (Session: ${callSessionId})`)

    return NextResponse.json({
      success: true,
      callSession: updatedSession[0],
      participants: participantSummary,
      duration: formatDuration(durationSeconds),
      endReason: reason,
      message: 'Call ended successfully'
    })

  } catch (error) {
    console.error('❌ Error ending call:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}