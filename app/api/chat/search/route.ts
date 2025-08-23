import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/chat/search - Search messages across all accessible channels
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Chat search endpoint called')
    
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('❌ Chat search: Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      console.log('❌ Chat search: Insufficient permissions')
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const channelType = searchParams.get('channel_type') // 'public', 'private', 'direct'

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    // Build the search query
    let searchQuery = `
      SELECT 
        cm.*,
        c.name as channel_name,
        c.type as channel_type,
        u.display_name,
        u.profile_picture,
        -- Get context (messages before and after)
        (
          SELECT message_text 
          FROM chat_messages cm_before 
          WHERE cm_before.channel_id = cm.channel_id 
            AND cm_before.created_at < cm.created_at 
            AND cm_before.deleted_at IS NULL
          ORDER BY cm_before.created_at DESC 
          LIMIT 1
        ) as context_before,
        (
          SELECT message_text 
          FROM chat_messages cm_after 
          WHERE cm_after.channel_id = cm.channel_id 
            AND cm_after.created_at > cm.created_at 
            AND cm_after.deleted_at IS NULL
          ORDER BY cm_after.created_at ASC 
          LIMIT 1
        ) as context_after
      FROM chat_messages cm
      JOIN chat_channels c ON cm.channel_id = c.id
      JOIN users u ON cm.user_id = u.username
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.active = 1 
        AND cm.deleted_at IS NULL
        AND cm.message_text LIKE ?
        AND (
          -- User has access to this channel (simplified)
          c.type = 'public' 
          OR ccm.user_id IS NOT NULL 
          OR c.created_by = ?
        )
    `

    const params = [
      authResult.user.username,
      `%${query.trim()}%`,
      authResult.user.username
    ]

    // Add channel type filter if specified
    if (channelType && ['public', 'private', 'direct'].includes(channelType)) {
      searchQuery += ' AND c.type = ?'
      params.push(channelType)
    }

    searchQuery += ' ORDER BY cm.created_at DESC LIMIT ?'
    params.push(limit)

    console.log('🔍 Executing search query for:', query.trim())
    console.log('📋 Query params length:', params.length)
    
    const results = await queryAsync(searchQuery, params)
    
    console.log('✅ Search results count:', results.length)

    // Process results to highlight matches and clean up
    const processedResults = results.map((result: any) => ({
      id: result.id,
      channel_id: result.channel_id,
      channel_name: result.channel_name,
      channel_type: result.channel_type,
      message_text: result.message_text,
      user_id: result.user_id,
      display_name: result.display_name,
      profile_picture: result.profile_picture,
      created_at: result.created_at,
      message_type: result.message_type,
      file_attachment: result.file_attachment ? JSON.parse(result.file_attachment) : null,
      context_before: result.context_before ? result.context_before.substring(0, 100) : null,
      context_after: result.context_after ? result.context_after.substring(0, 100) : null
    }))

    return NextResponse.json({
      success: true,
      results: processedResults,
      query: query.trim(),
      total: results.length
    })

  } catch (error) {
    console.error('❌ Error searching messages:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}