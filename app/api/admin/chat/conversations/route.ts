import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/admin/chat/conversations - Get all conversations for monitoring (admin only)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const channelType = searchParams.get('type') // 'public', 'private', 'direct'
    const searchQuery = searchParams.get('search')

    let whereClause = 'WHERE c.active = 1'
    const params: any[] = []

    // Filter by channel type
    if (channelType && ['public', 'private', 'direct'].includes(channelType)) {
      whereClause += ' AND c.type = ?'
      params.push(channelType)
    }

    // Filter by search query (channel name or participant names)
    if (searchQuery && searchQuery.trim()) {
      whereClause += ` AND (
        c.name LIKE ? OR
        c.description LIKE ? OR
        EXISTS (
          SELECT 1 FROM chat_channel_members ccm2
          JOIN users u2 ON ccm2.user_id = u2.username
          WHERE ccm2.channel_id = c.id 
          AND u2.display_name LIKE ?
        )
      )`
      const searchPattern = `%${searchQuery.trim()}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // Get conversations with participant info and message counts
    const conversations = await queryAsync(`
      SELECT 
        c.*,
        u.display_name as created_by_name,
        (
          SELECT COUNT(*) 
          FROM chat_messages cm 
          WHERE cm.channel_id = c.id
        ) as message_count,
        (
          SELECT COUNT(*) 
          FROM chat_channel_members ccm 
          WHERE ccm.channel_id = c.id AND ccm.active = 1
        ) as member_count,
        (
          SELECT cm.created_at
          FROM chat_messages cm
          WHERE cm.channel_id = c.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message_at,
        (
          SELECT cm.message_text
          FROM chat_messages cm
          WHERE cm.channel_id = c.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT u2.display_name
          FROM chat_messages cm
          JOIN users u2 ON cm.user_id = u2.username
          WHERE cm.channel_id = c.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message_by
      FROM chat_channels c
      LEFT JOIN users u ON c.created_by = u.username
      ${whereClause}
      ORDER BY 
        CASE WHEN last_message_at IS NOT NULL THEN last_message_at ELSE c.created_at END DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset])

    // Get participants for each conversation
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conversation) => {
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
        `, [conversation.id])

        return {
          ...conversation,
          participants
        }
      })
    )

    // Get total count for pagination
    const totalResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM chat_channels c
      ${whereClause}
    `, params)

    const total = totalResult[0]?.total || 0

    return NextResponse.json({
      success: true,
      conversations: conversationsWithParticipants,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + conversations.length < total
      }
    })

  } catch (error) {
    console.error('❌ Error fetching conversations for monitoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}