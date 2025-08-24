import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/admin/chat/conversations/[id]/messages - Get messages from a conversation for monitoring
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to monitor conversations
    if (!authResult.user.permissions?.includes('chat.monitor_conversations')) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to monitor conversations' 
      }, { status: 403 })
    }

    const channelId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const searchQuery = searchParams.get('search')

    // Verify channel exists
    const channel = await queryAsync(`
      SELECT c.*, u.display_name as created_by_name
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.username
      WHERE c.id = ? AND c.active = 1
    `, [channelId])

    if (!channel || channel.length === 0) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    let whereClause = 'WHERE cm.channel_id = ?'
    const params: any[] = [channelId]

    // Filter by search query (message content or sender name)
    if (searchQuery && searchQuery.trim()) {
      whereClause += ` AND (
        cm.message_text LIKE ? OR
        u.display_name LIKE ? OR
        u.username LIKE ?
      )`
      const searchPattern = `%${searchQuery.trim()}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // Get messages with user info
    const messages = await queryAsync(`
      SELECT 
        cm.*,
        u.display_name,
        u.email,
        u.username as sender_username,
        -- Reply information if this is a reply
        CASE 
          WHEN cm.reply_to_id IS NOT NULL THEN (
            SELECT JSON_OBJECT(
              'id', parent.id,
              'message_text', parent.message_text,
              'user_name', parent_user.display_name,
              'created_at', parent.created_at
            )
            FROM chat_messages parent
            LEFT JOIN users parent_user ON parent.user_id = parent_user.username
            WHERE parent.id = cm.reply_to_id
          )
        END as reply_to_message
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.username
      ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    // Get total message count
    const totalResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.username
      ${whereClause}
    `, params)

    const total = totalResult[0]?.total || 0

    // Get channel participants
    const participants = await queryAsync(`
      SELECT 
        ccm.user_id,
        ccm.role,
        ccm.joined_at,
        u.display_name,
        u.email,
        up.status as presence_status
      FROM chat_channel_members ccm
      JOIN users u ON ccm.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE ccm.channel_id = ? AND ccm.active = 1
      ORDER BY ccm.joined_at ASC
    `, [channelId])

    return NextResponse.json({
      success: true,
      channel: {
        ...channel[0],
        participants
      },
      messages: messages.reverse(), // Show oldest first
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + messages.length < total
      }
    })

  } catch (error) {
    console.error('❌ Error fetching messages for monitoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}