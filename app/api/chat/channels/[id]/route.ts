import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// GET /api/chat/channels/[id] - Get specific channel details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: channelId } = await params

    // Get channel with user's membership info
    const channel = await queryAsync(`
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
        ) as unread_count
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.username
      LEFT JOIN teams t ON c.team_id = t.id
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, channelId])

    if (!channel || channel.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const channelData = channel[0]

    // Check if user has access to this channel
    const hasAccess = channelData.type === 'public' || 
                     channelData.user_role !== null || 
                     channelData.created_by === authResult.user.username ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get channel members
    const members = await queryAsync(`
      SELECT 
        ccm.*,
        u.display_name,
        u.profile_picture,
        up.status as presence_status
      FROM chat_channel_members ccm
      JOIN users u ON ccm.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE ccm.channel_id = ? AND ccm.active = 1
      ORDER BY ccm.role DESC, u.display_name ASC
    `, [channelId])

    return NextResponse.json({
      success: true,
      channel: {
        ...channelData,
        members
      }
    })

  } catch (error) {
    console.error('❌ Error fetching channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/chat/channels/[id] - Update channel details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id: channelId } = resolvedParams
    const body = await request.json()
    const { name, description, type } = body

    // Get current channel info
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

    // Check permissions - must be admin/owner or have manage_channels permission
    const canManage = channelData.created_by === authResult.user.username ||
                     channelData.user_role === 'admin' ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions to modify channel' }, { status: 403 })
    }

    // Validate updates
    const updates: any = {}
    const queryParams: any[] = []

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({ error: 'Channel name cannot be empty' }, { status: 400 })
      }
      
      // Check for duplicate names
      const existing = await queryAsync(`
        SELECT id FROM chat_channels 
        WHERE name = ? AND id != ? AND active = 1 
        AND (team_id = ? OR (team_id IS NULL AND ? IS NULL))
      `, [name.trim(), channelId, channelData.team_id, channelData.team_id])
      
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'Channel name already exists' }, { status: 400 })
      }
      
      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    if (type !== undefined) {
      if (!['public', 'private', 'direct'].includes(type)) {
        return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
      }
      
      // Check if user can change to private
      if (type === 'private' && !authResult.user.permissions?.includes('chat.access_private')) {
        return NextResponse.json({ error: 'Cannot change channel to private' }, { status: 403 })
      }
      
      updates.type = type
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    // Build update query
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    const values = Object.values(updates)
    values.push(channelId)

    await runAsync(`
      UPDATE chat_channels 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ?
    `, values)

    // Get updated channel
    const updatedChannel = await queryAsync(`
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
      channel: updatedChannel[0],
      message: 'Channel updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chat/channels/[id] - Delete/deactivate channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const { id: channelId } = resolvedParams

    // Get current channel info
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

    // Check permissions - must be creator or have manage_channels permission
    const canDelete = channelData.created_by === authResult.user.username ||
                     authResult.user.permissions?.includes('chat.manage_channels')

    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions to delete channel' }, { status: 403 })
    }

    // Soft delete the channel
    await runAsync(`
      UPDATE chat_channels 
      SET active = 0, updated_at = datetime('now')
      WHERE id = ?
    `, [channelId])

    // Deactivate all memberships
    await runAsync(`
      UPDATE chat_channel_members 
      SET active = 0
      WHERE channel_id = ?
    `, [channelId])

    return NextResponse.json({
      success: true,
      message: 'Channel deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting channel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}