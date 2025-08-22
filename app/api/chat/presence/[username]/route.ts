import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/presence/[username] - Get specific user's presence status
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const username = params.username

    // Get user presence
    const presence = await queryAsync(`
      SELECT 
        up.*,
        u.display_name,
        u.profile_picture,
        u.email,
        t.name as team_name
      FROM user_presence up
      JOIN users u ON up.user_id = u.username
      LEFT JOIN teams t ON u.team_id = t.id
      WHERE up.user_id = ?
    `, [username])

    if (!presence || presence.length === 0) {
      // Check if user exists but has no presence record
      const user = await queryAsync(`
        SELECT username, display_name, profile_picture 
        FROM users 
        WHERE username = ?
      `, [username])

      if (!user || user.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Return default offline status
      return NextResponse.json({
        success: true,
        presence: {
          user_id: username,
          status: 'offline',
          status_message: null,
          last_active: null,
          socket_id: null,
          display_name: user[0].display_name,
          profile_picture: user[0].profile_picture
        }
      })
    }

    return NextResponse.json({
      success: true,
      presence: presence[0]
    })

  } catch (error) {
    console.error('❌ Error fetching user presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/chat/presence/[username] - Update specific user's presence (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins or the user themselves can update presence
    const canUpdate = authResult.user.username === params.username ||
                     authResult.user.permissions?.includes('chat.moderate_channels')

    if (!canUpdate) {
      return NextResponse.json({ error: 'Cannot update other users\' presence' }, { status: 403 })
    }

    const username = params.username
    const body = await request.json()
    const { status, status_message = null, force_offline = false } = body

    if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    // Validate status message
    if (status_message && status_message.trim().length > 100) {
      return NextResponse.json({ error: 'Status message too long' }, { status: 400 })
    }

    // Check if target user exists
    const user = await queryAsync('SELECT username FROM users WHERE username = ?', [username])
    if (!user || user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For force offline (admin function), also clear socket_id
    if (force_offline && status === 'offline') {
      await runAsync(`
        INSERT OR REPLACE INTO user_presence (user_id, status, status_message, last_active, socket_id)
        VALUES (?, ?, ?, datetime('now'), NULL)
      `, [username, status, status_message?.trim() || null])
    } else {
      await runAsync(`
        INSERT OR REPLACE INTO user_presence (user_id, status, status_message, last_active)
        VALUES (?, ?, ?, datetime('now'))
      `, [username, status, status_message?.trim() || null])
    }

    // Get updated presence
    const updatedPresence = await queryAsync(`
      SELECT 
        up.*,
        u.display_name,
        u.profile_picture
      FROM user_presence up
      JOIN users u ON up.user_id = u.username
      WHERE up.user_id = ?
    `, [username])

    return NextResponse.json({
      success: true,
      presence: updatedPresence[0],
      message: 'Presence updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating user presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}