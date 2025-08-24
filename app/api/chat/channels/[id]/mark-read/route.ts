import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { runAsync } from '@/lib/database'

// POST /api/chat/channels/[id]/mark-read - Mark channel messages as read for current user
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
    const username = authResult.user.username

    // Check if user has access to this channel
    const hasAccess = authResult.user.permissions?.includes('chat.access_channels')
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the latest message ID in this channel
    const latestMessageResult = await runAsync(`
      SELECT id FROM chat_messages 
      WHERE channel_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [channelId])
    
    const latestMessageId = latestMessageResult.length > 0 ? latestMessageResult[0].id : null

    // Insert or update read receipt for this user and channel
    await runAsync(`
      INSERT OR REPLACE INTO chat_read_receipts 
      (channel_id, user_id, last_read_at, last_message_id, updated_at)
      VALUES (?, ?, datetime('now'), ?, datetime('now'))
    `, [channelId, username, latestMessageId])
    
    console.log(`📖 User ${username} marked channel ${channelId} as read (latest message: ${latestMessageId})`)

    return NextResponse.json({ 
      success: true,
      channel_id: channelId,
      marked_read_by: username,
      marked_read_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error marking channel as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}