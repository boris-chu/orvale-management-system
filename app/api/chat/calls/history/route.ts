import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/chat/calls/history - Get call history
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.view_call_history')) {
      return NextResponse.json({ error: 'Insufficient permissions to view call history' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const callType = searchParams.get('call_type') // 'audio', 'video', 'screen_share'
    const status = searchParams.get('status') // 'ringing', 'active', 'ended', 'missed'
    const channelId = searchParams.get('channel_id')
    const userId = searchParams.get('user_id') // Admin can search by specific user

    let query = `
      SELECT 
        cs.*,
        u.display_name as initiator_name,
        u.email as initiator_email,
        c.name as channel_name,
        c.type as channel_type,
        (
          SELECT COUNT(*)
          FROM call_participants cp
          WHERE cp.call_session_id = cs.id
        ) as total_participants,
        (
          SELECT COUNT(*)
          FROM call_participants cp
          WHERE cp.call_session_id = cs.id AND cp.joined_at IS NOT NULL
        ) as joined_participants
      FROM call_sessions cs
      LEFT JOIN users u ON cs.initiator_user_id = u.username
      LEFT JOIN chat_channels c ON cs.channel_id = c.id
      WHERE (
        cs.initiator_user_id = ? 
        OR EXISTS (
          SELECT 1 FROM call_participants cp 
          WHERE cp.call_session_id = cs.id AND cp.user_id = ?
        )
    `

    const params: any[] = [authResult.user.username, authResult.user.username]

    // Admin can see all calls
    if (authResult.user.permissions?.includes('chat.manage_calls')) {
      query += ' OR 1=1'
    }

    query += ')'

    // Apply filters
    if (callType && ['audio', 'video', 'screen_share'].includes(callType)) {
      query += ' AND cs.call_type = ?'
      params.push(callType)
    }

    if (status && ['ringing', 'active', 'ended', 'missed'].includes(status)) {
      query += ' AND cs.status = ?'
      params.push(status)
    }

    if (channelId) {
      query += ' AND cs.channel_id = ?'
      params.push(channelId)
    }

    // Admin-only: Filter by specific user
    if (userId && authResult.user.permissions?.includes('chat.manage_calls')) {
      query += ` AND (
        cs.initiator_user_id = ? 
        OR EXISTS (
          SELECT 1 FROM call_participants cp 
          WHERE cp.call_session_id = cs.id AND cp.user_id = ?
        )
      )`
      params.push(userId, userId)
    }

    query += ` ORDER BY cs.started_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const calls = await queryAsync(query, params)

    // Get participant details for each call (limit to recent calls for performance)
    const callsWithParticipants = await Promise.all(
      calls.slice(0, 10).map(async (call) => { // Only get details for first 10 calls
        const participants = await queryAsync(`
          SELECT 
            cp.*,
            u.display_name,
            CASE 
              WHEN cp.joined_at IS NOT NULL AND cp.left_at IS NOT NULL THEN
                (strftime('%s', cp.left_at) - strftime('%s', cp.joined_at))
              WHEN cp.joined_at IS NOT NULL AND cs.status = 'active' THEN
                (strftime('%s', 'now') - strftime('%s', cp.joined_at))
              WHEN cp.joined_at IS NOT NULL THEN
                cs.duration_seconds
              ELSE 0
            END as participation_duration
          FROM call_participants cp
          JOIN users u ON cp.user_id = u.username
          JOIN call_sessions cs ON cp.call_session_id = cs.id
          WHERE cp.call_session_id = ?
          ORDER BY cp.joined_at ASC NULLS LAST
        `, [call.id])

        return {
          ...call,
          participants: participants || []
        }
      })
    )

    // For remaining calls, just include basic participant count
    const remainingCalls = calls.slice(10).map(call => ({
      ...call,
      participants: [] // Empty array for performance, full data available via individual status endpoint
    }))

    const allCalls = [...callsWithParticipants, ...remainingCalls]

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN cs.status = 'ended' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN cs.status = 'missed' THEN 1 END) as missed_calls,
        COUNT(CASE WHEN cs.call_type = 'audio' THEN 1 END) as audio_calls,
        COUNT(CASE WHEN cs.call_type = 'video' THEN 1 END) as video_calls,
        COUNT(CASE WHEN cs.call_type = 'screen_share' THEN 1 END) as screen_share_calls,
        AVG(CASE WHEN cs.duration_seconds > 0 THEN cs.duration_seconds END) as avg_duration_seconds
      FROM call_sessions cs
      WHERE (
        cs.initiator_user_id = ? 
        OR EXISTS (
          SELECT 1 FROM call_participants cp 
          WHERE cp.call_session_id = cs.id AND cp.user_id = ?
        )
      )
    `

    const summaryParams = [authResult.user.username, authResult.user.username]
    const summary = await queryAsync(summaryQuery, summaryParams)

    return NextResponse.json({
      success: true,
      calls: allCalls,
      pagination: {
        limit,
        offset,
        total: summary[0]?.total_calls || 0,
        hasMore: (offset + limit) < (summary[0]?.total_calls || 0)
      },
      summary: {
        totalCalls: summary[0]?.total_calls || 0,
        completedCalls: summary[0]?.completed_calls || 0,
        missedCalls: summary[0]?.missed_calls || 0,
        callTypes: {
          audio: summary[0]?.audio_calls || 0,
          video: summary[0]?.video_calls || 0,
          screenShare: summary[0]?.screen_share_calls || 0
        },
        averageDuration: {
          seconds: Math.round(summary[0]?.avg_duration_seconds || 0),
          formatted: summary[0]?.avg_duration_seconds 
            ? `${Math.floor(summary[0].avg_duration_seconds / 60)}:${(Math.round(summary[0].avg_duration_seconds) % 60).toString().padStart(2, '0')}`
            : '0:00'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error getting call history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}