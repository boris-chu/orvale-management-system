import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/chat/calls/[id]/status - Get call status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.join_calls')) {
      return NextResponse.json({ error: 'Insufficient permissions to view call status' }, { status: 403 })
    }

    const params = await context.params
    const callSessionId = params.id

    // Get call session details
    const callSession = await queryAsync(`
      SELECT 
        cs.*,
        u.display_name as initiator_name,
        c.name as channel_name,
        c.type as channel_type
      FROM call_sessions cs
      LEFT JOIN users u ON cs.initiator_user_id = u.username
      LEFT JOIN chat_channels c ON cs.channel_id = c.id
      WHERE cs.id = ?
    `, [callSessionId])

    if (!callSession || callSession.length === 0) {
      return NextResponse.json({ error: 'Call session not found' }, { status: 404 })
    }

    const session = callSession[0]

    // Check if user has access to this call
    const participants = JSON.parse(session.participants || '[]')
    const hasAccess = participants.includes(authResult.user.username) ||
                     session.initiator_user_id === authResult.user.username ||
                     authResult.user.permissions?.includes('chat.manage_calls')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to call status' }, { status: 403 })
    }

    // Get all participants with their current status
    const callParticipants = await queryAsync(`
      SELECT 
        cp.*,
        u.display_name,
        u.email,
        up.status as presence_status,
        up.last_active,
        CASE 
          WHEN cp.joined_at IS NOT NULL AND cp.left_at IS NOT NULL THEN
            (strftime('%s', cp.left_at) - strftime('%s', cp.joined_at))
          WHEN cp.joined_at IS NOT NULL THEN
            (strftime('%s', 'now') - strftime('%s', cp.joined_at))
          ELSE NULL
        END as current_duration_seconds
      FROM call_participants cp
      JOIN users u ON cp.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE cp.call_session_id = ?
      ORDER BY cp.joined_at ASC NULLS LAST
    `, [callSessionId])

    // Calculate statistics
    const stats = {
      totalParticipants: callParticipants.length,
      activeParticipants: callParticipants.filter(p => p.joined_at && !p.left_at).length,
      waitingParticipants: callParticipants.filter(p => !p.joined_at).length,
      leftParticipants: callParticipants.filter(p => p.left_at).length,
    }

    // Calculate call duration
    let duration = null
    if (session.answered_at) {
      const startTime = new Date(session.answered_at)
      const endTime = session.ended_at ? new Date(session.ended_at) : new Date()
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      
      const mins = Math.floor(durationSeconds / 60)
      const secs = durationSeconds % 60
      duration = {
        seconds: durationSeconds,
        formatted: `${mins}:${secs.toString().padStart(2, '0')}`
      }
    }

    // Determine if current user is actively in the call
    const currentUserParticipant = callParticipants.find(p => p.user_id === authResult.user.username)
    const userInCall = currentUserParticipant && currentUserParticipant.joined_at && !currentUserParticipant.left_at

    return NextResponse.json({
      success: true,
      callSession: {
        ...session,
        duration,
        userInCall
      },
      participants: callParticipants,
      stats,
      currentUser: {
        username: authResult.user.username,
        inCall: userInCall,
        canControl: session.initiator_user_id === authResult.user.username || 
                   authResult.user.permissions?.includes('chat.manage_calls')
      }
    })

  } catch (error) {
    console.error('❌ Error getting call status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}