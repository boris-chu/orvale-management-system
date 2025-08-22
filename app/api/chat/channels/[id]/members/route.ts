import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/channels/[id]/members - Get channel members
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const channelId = params.id

    // Check if user has access to this channel
    const channelAccess = await queryAsync(`
      SELECT c.type, ccm.user_id
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, channelId])

    if (!channelAccess || channelAccess.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const hasAccess = channelAccess[0].type === 'public' || 
                     channelAccess[0].user_id !== null ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all active members
    const members = await queryAsync(`
      SELECT 
        ccm.*,
        u.display_name,
        u.profile_picture,
        u.email,
        up.status as presence_status,
        up.status_message,
        up.last_active
      FROM chat_channel_members ccm
      JOIN users u ON ccm.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE ccm.channel_id = ? AND ccm.active = 1
      ORDER BY 
        CASE ccm.role 
          WHEN 'admin' THEN 1 
          WHEN 'moderator' THEN 2 
          WHEN 'member' THEN 3 
          ELSE 4 
        END,
        u.display_name ASC
    `, [channelId])

    return NextResponse.json({
      success: true,
      members
    })

  } catch (error) {
    console.error('❌ Error fetching channel members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/channels/[id]/members - Add members to channel
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const channelId = params.id
    const body = await request.json()
    const { usernames, role = 'member' } = body

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'User list is required' }, { status: 400 })
    }

    if (!['member', 'moderator', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get channel info and user's role
    const channel = await queryAsync(`
      SELECT c.*, ccm.role as user_role
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, channelId])

    if (!channel || channel.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const channelData = channel[0]

    // Check permissions to add members
    const canAddMembers = channelData.created_by === authResult.user.username ||
                         ['admin', 'moderator'].includes(channelData.user_role) ||
                         authResult.user.permissions?.includes('chat.manage_channels')

    if (!canAddMembers) {
      return NextResponse.json({ error: 'Insufficient permissions to add members' }, { status: 403 })
    }

    // For private channels, need special permission
    if (channelData.type === 'private' && !authResult.user.permissions?.includes('chat.access_private')) {
      return NextResponse.json({ error: 'Cannot add members to private channels' }, { status: 403 })
    }

    const results = []
    const errors = []

    for (const username of usernames) {
      try {
        // Check if user exists
        const user = await queryAsync('SELECT username, display_name FROM users WHERE username = ?', [username])
        if (!user || user.length === 0) {
          errors.push(`User ${username} not found`)
          continue
        }

        // Check if already a member
        const existing = await queryAsync(`
          SELECT id FROM chat_channel_members 
          WHERE channel_id = ? AND user_id = ? AND active = 1
        `, [channelId, username])

        if (existing && existing.length > 0) {
          errors.push(`User ${username} is already a member`)
          continue
        }

        // Add member
        await runAsync(`
          INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
          VALUES (?, ?, ?, datetime('now'))
        `, [channelId, username, role])

        results.push({
          username,
          display_name: user[0].display_name,
          role,
          status: 'added'
        })

      } catch (error) {
        console.error(`Error adding user ${username}:`, error)
        errors.push(`Failed to add user ${username}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Added ${results.length} member(s) successfully`
    })

  } catch (error) {
    console.error('❌ Error adding channel members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}