import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/channels - Get channels user has access to
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has chat access permission
    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'public', 'private', 'direct'
    const teamId = searchParams.get('team_id')

    let query = `
      SELECT 
        c.*,
        u.display_name as created_by_name,
        t.name as team_name,
        ccm.role as user_role,
        ccm.last_read_at,
        (
          SELECT COUNT(*) 
          FROM chat_messages cm 
          WHERE cm.channel_id = c.id 
          AND cm.created_at > COALESCE(ccm.last_read_at, '1970-01-01')
        ) as unread_count,
        (
          SELECT COUNT(*) 
          FROM chat_channel_members 
          WHERE channel_id = c.id AND active = 1
        ) as member_count
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.username
      LEFT JOIN teams t ON c.team_id = t.id
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.active = 1
    `

    const params: any[] = [authResult.user.username]

    // Filter by type if specified
    if (type && ['public', 'private', 'direct'].includes(type)) {
      query += ' AND c.type = ?'
      params.push(type)
    }

    // Filter by team if specified
    if (teamId) {
      query += ' AND c.team_id = ?'
      params.push(teamId)
    }

    // Only show channels user has access to
    query += `
      AND (
        c.type = 'public' 
        OR ccm.user_id IS NOT NULL 
        OR c.created_by = ?
        OR EXISTS (
          SELECT 1 FROM role_permissions rp 
          JOIN users u ON u.role = rp.role_id 
          WHERE u.username = ? AND rp.permission_id = 'chat.manage_channels'
        )
      )
    `
    params.push(authResult.user.username, authResult.user.username)

    query += ' ORDER BY c.updated_at DESC'

    const channels = await queryAsync(query, params)

    return NextResponse.json({
      success: true,
      channels
    })

  } catch (error) {
    console.error('❌ Error fetching channels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create channels
    if (!authResult.user.permissions?.includes('chat.create_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, type = 'public', team_id, members = [], participants = [] } = body
    
    // Support both 'members' and 'participants' field names
    const membersList = participants.length > 0 ? participants : members

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    if (!['public', 'private', 'direct'].includes(type)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    // Check if user can create private channels
    if (type === 'private' && !authResult.user.permissions?.includes('chat.access_private')) {
      return NextResponse.json({ error: 'Cannot create private channels' }, { status: 403 })
    }

    // Validate team_id if provided
    if (team_id) {
      const team = await queryAsync('SELECT id FROM teams WHERE id = ? AND active = 1', [team_id])
      if (!team || team.length === 0) {
        return NextResponse.json({ error: 'Invalid team ID' }, { status: 400 })
      }
    }

    // Check for duplicate channel names in the same context
    let duplicateQuery = 'SELECT id FROM chat_channels WHERE name = ? AND active = 1'
    const duplicateParams = [name.trim()]
    
    if (team_id) {
      duplicateQuery += ' AND team_id = ?'
      duplicateParams.push(team_id)
    } else {
      duplicateQuery += ' AND team_id IS NULL'
    }

    const existing = await queryAsync(duplicateQuery, duplicateParams)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Channel name already exists' }, { status: 400 })
    }

    // Create the channel
    const result = await runAsync(`
      INSERT INTO chat_channels (name, description, type, created_by, team_id)
      VALUES (?, ?, ?, ?, ?)
    `, [name.trim(), description?.trim() || null, type, authResult.user.username, team_id || null])

    const channelId = result.lastID

    // Add creator as a member
    await runAsync(`
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
      VALUES (?, ?, 'admin', datetime('now'))
    `, [channelId, authResult.user.username])

    // Add additional members if provided
    if (membersList && membersList.length > 0) {
      for (const memberUsername of membersList) {
        // Verify member exists
        const user = await queryAsync('SELECT username FROM users WHERE username = ?', [memberUsername])
        if (user && user.length > 0 && memberUsername !== authResult.user.username) {
          await runAsync(`
            INSERT OR IGNORE INTO chat_channel_members (channel_id, user_id, role, joined_at)
            VALUES (?, ?, 'member', datetime('now'))
          `, [channelId, memberUsername])
        }
      }
    }

    // Get the created channel with full details
    const newChannel = await queryAsync(`
      SELECT 
        c.*,
        u.display_name as created_by_name,
        t.name as team_name
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.username
      LEFT JOIN teams t ON c.team_id = t.id
      WHERE c.id = ?
    `, [channelId])

    return NextResponse.json({
      success: true,
      channel: newChannel[0],
      message: 'Channel created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}