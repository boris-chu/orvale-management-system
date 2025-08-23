import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/presence - Get online users and their presence status
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Filter by specific status
    const team_id = searchParams.get('team_id') // Filter by team
    const include_offline = searchParams.get('include_offline') === 'true'

    let query = `
      SELECT 
        up.*,
        u.display_name,
        u.profile_picture,
        u.email,
        t.name as team_name
      FROM user_presence up
      JOIN users u ON up.user_id = u.username
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE 1=1
    `
    const params: any[] = []

    // Filter by status
    if (status && ['online', 'away', 'busy', 'offline'].includes(status)) {
      query += ' AND up.status = ?'
      params.push(status)
    // Note: We now include offline users for sidebar display, so remove the offline filter

    // Filter by team
    if (team_id) {
      query += ' AND u.team_id = ?'
      params.push(team_id)
    }

    // Include recently active users (last 24 hours) even if offline for sidebar display
    query += ' AND up.last_active > datetime("now", "-24 hours")'

    query += ' ORDER BY up.status ASC, up.last_active DESC'

    const presenceData = await queryAsync(query, params)
    console.log('🔍 Raw presence query results:', presenceData.length, 'users')
    console.log('📊 Presence data sample:', presenceData.slice(0, 3).map(u => `${u.display_name}(${u.status}, last_active: ${u.last_active})`).join(', '))

    // Group by status for easier consumption
    const groupedPresence = {
      online: [],
      away: [],
      busy: [],
      offline: []
    }

    presenceData.forEach(user => {
      if (groupedPresence[user.status]) {
        groupedPresence[user.status].push(user)
      }
    })
    
    console.log('👥 Grouped presence summary:', {
      online: groupedPresence.online.map(u => u.display_name),
      away: groupedPresence.away.map(u => u.display_name),
      busy: groupedPresence.busy.map(u => u.display_name),
      offline: groupedPresence.offline.map(u => u.display_name)
    })

    return NextResponse.json({
      success: true,
      presence: groupedPresence,
      total_users: presenceData.length,
      online_count: groupedPresence.online.length,
      summary: {
        online: groupedPresence.online.length,
        away: groupedPresence.away.length,
        busy: groupedPresence.busy.length,
        offline: groupedPresence.offline.length
      }
    })

  } catch (error) {
    console.error('❌ Error fetching presence data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/presence - Update current user's presence status
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { status, status_message = null } = body

    if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required (online, away, busy, offline)' }, { status: 400 })
    }

    // Validate status message length
    if (status_message && status_message.trim().length > 100) {
      return NextResponse.json({ error: 'Status message too long (max 100 characters)' }, { status: 400 })
    }

    console.log('🔄 Updating presence for user:', authResult.user.username, 'to status:', status)
    
    // Update user presence
    await runAsync(`
      INSERT OR REPLACE INTO user_presence (user_id, status, status_message, last_active)
      VALUES (?, ?, ?, datetime('now'))
    `, [authResult.user.username, status, status_message?.trim() || null])
    
    console.log('✅ Presence updated successfully for:', authResult.user.username)

    // Get updated presence data
    const updatedPresence = await queryAsync(`
      SELECT 
        up.*,
        u.display_name,
        u.profile_picture
      FROM user_presence up
      JOIN users u ON up.user_id = u.username
      WHERE up.user_id = ?
    `, [authResult.user.username])

    return NextResponse.json({
      success: true,
      presence: updatedPresence[0],
      message: 'Presence status updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}