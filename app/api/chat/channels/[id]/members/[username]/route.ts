import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// PUT /api/chat/channels/[id]/members/[username] - Update member role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; username: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: channelId, username: targetUsername } = params
    const body = await request.json()
    const { role } = body

    if (!role || !['member', 'moderator', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 })
    }

    // Get channel info and both users' roles
    const channelInfo = await queryAsync(`
      SELECT 
        c.*,
        ccm1.role as requester_role,
        ccm2.role as target_role
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm1 ON c.id = ccm1.channel_id AND ccm1.user_id = ?
      LEFT JOIN chat_channel_members ccm2 ON c.id = ccm2.channel_id AND ccm2.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, targetUsername, channelId])

    if (!channelInfo || channelInfo.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const channel = channelInfo[0]

    // Check if target user is a member
    if (channel.target_role === null) {
      return NextResponse.json({ error: 'User is not a member of this channel' }, { status: 404 })
    }

    // Check permissions to modify roles
    const canModifyRoles = channel.created_by === authResult.user.username ||
                          channel.requester_role === 'admin' ||
                          authResult.user.permissions?.includes('chat.manage_channels')

    if (!canModifyRoles) {
      return NextResponse.json({ error: 'Insufficient permissions to modify member roles' }, { status: 403 })
    }

    // Prevent demoting the channel creator
    if (channel.created_by === targetUsername && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot demote channel creator' }, { status: 400 })
    }

    // Update the member's role
    await runAsync(`
      UPDATE chat_channel_members 
      SET role = ?
      WHERE channel_id = ? AND user_id = ?
    `, [role, channelId, targetUsername])

    // Get updated member info
    const updatedMember = await queryAsync(`
      SELECT 
        ccm.*,
        u.display_name,
        u.profile_picture
      FROM chat_channel_members ccm
      JOIN users u ON ccm.user_id = u.username
      WHERE ccm.channel_id = ? AND ccm.user_id = ?
    `, [channelId, targetUsername])

    return NextResponse.json({
      success: true,
      member: updatedMember[0],
      message: `Member role updated to ${role}`
    })

  } catch (error) {
    console.error('❌ Error updating member role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chat/channels/[id]/members/[username] - Remove member from channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; username: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: channelId, username: targetUsername } = params

    // Get channel info and both users' roles
    const channelInfo = await queryAsync(`
      SELECT 
        c.*,
        ccm1.role as requester_role,
        ccm2.role as target_role
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm1 ON c.id = ccm1.channel_id AND ccm1.user_id = ?
      LEFT JOIN chat_channel_members ccm2 ON c.id = ccm2.channel_id AND ccm2.user_id = ?
      WHERE c.id = ? AND c.active = 1
    `, [authResult.user.username, targetUsername, channelId])

    if (!channelInfo || channelInfo.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const channel = channelInfo[0]

    // Check if target user is a member
    if (channel.target_role === null) {
      return NextResponse.json({ error: 'User is not a member of this channel' }, { status: 404 })
    }

    // Check permissions to remove members
    const isSelfRemoval = authResult.user.username === targetUsername
    const canRemoveMembers = isSelfRemoval || // Users can always leave themselves
                            channel.created_by === authResult.user.username ||
                            channel.requester_role === 'admin' ||
                            (channel.requester_role === 'moderator' && channel.target_role === 'member') ||
                            authResult.user.permissions?.includes('chat.manage_channels')

    if (!canRemoveMembers) {
      return NextResponse.json({ error: 'Insufficient permissions to remove member' }, { status: 403 })
    }

    // Prevent removing the channel creator (unless they're removing themselves)
    if (channel.created_by === targetUsername && !isSelfRemoval) {
      return NextResponse.json({ error: 'Cannot remove channel creator' }, { status: 400 })
    }

    // Remove member (soft delete)
    await runAsync(`
      UPDATE chat_channel_members 
      SET active = 0
      WHERE channel_id = ? AND user_id = ?
    `, [channelId, targetUsername])

    const action = isSelfRemoval ? 'left' : 'removed from'
    
    return NextResponse.json({
      success: true,
      message: `User ${action} channel successfully`
    })

  } catch (error) {
    console.error('❌ Error removing channel member:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}