import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/chat/channels/[id]/stream - Server-Sent Events for real-time messages
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 })
    }

    // Create mock request with token for auth verification
    const mockRequest = {
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'authorization') {
            return `Bearer ${token}`
          }
          return request.headers.get(name)
        }
      }
    } as NextRequest

    const authResult = await verifyAuth(mockRequest)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const params = await context.params
    const { id: channelId } = params
    let lastMessageId = null // Track server-side to prevent client reconnection loops

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

    // Create Server-Sent Events stream
    const encoder = new TextEncoder()
    
    const customReadable = new ReadableStream({
      async start(controller) {
        // Send initial connection confirmation
        const data = `data: ${JSON.stringify({ type: 'connected', channelId })}\n\n`
        controller.enqueue(encoder.encode(data))

        // Get the current latest message ID to start tracking from
        try {
          const latestMessage = await queryAsync(`
            SELECT id FROM chat_messages 
            WHERE channel_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
          `, [channelId])
          
          if (latestMessage.length > 0) {
            lastMessageId = latestMessage[0].id.toString()
            console.log(`🔍 SSE initial lastMessageId for channel ${channelId}:`, lastMessageId)
          }
        } catch (error) {
          console.error('Error getting initial lastMessageId:', error)
        }

        // Set up polling to check for new messages
        const pollInterval = setInterval(async () => {
          try {
            let query = `
              SELECT 
                cm.*,
                u.display_name,
                u.profile_picture,
                reply_to.message_text as reply_to_text,
                reply_to_user.display_name as reply_to_display_name
              FROM chat_messages cm
              JOIN users u ON cm.user_id = u.username
              LEFT JOIN chat_messages reply_to ON cm.reply_to_id = reply_to.id
              LEFT JOIN users reply_to_user ON reply_to.user_id = reply_to_user.username
              WHERE cm.channel_id = ?
            `
            
            const queryParams = [channelId]
            
            if (lastMessageId && lastMessageId !== '') {
              query += ' AND cm.id > ?'
              queryParams.push(parseInt(lastMessageId))
            }
            
            query += ' ORDER BY cm.created_at ASC LIMIT 50'

            const messages = await queryAsync(query, queryParams)

            // Only send if there are actually new messages
            if (messages.length > 0) {
              console.log(`📤 SSE sending ${messages.length} new messages to channel ${channelId}`)
              // Update lastMessageId to prevent sending same messages again
              lastMessageId = messages[messages.length - 1].id.toString()
            }

            if (messages.length > 0) {
              const data = `data: ${JSON.stringify({
                type: 'messages',
                messages: messages.map(msg => ({
                  ...msg,
                  reactions: []
                }))
              })}\n\n`
              controller.enqueue(encoder.encode(data))
            }

          } catch (error) {
            console.error('SSE polling error:', error)
            const errorData = `data: ${JSON.stringify({ type: 'error', error: 'Failed to fetch messages' })}\n\n`
            controller.enqueue(encoder.encode(errorData))
          }
        }, 250) // Poll every 250ms (4x per second) for near-instant updates

        // Clean up interval when stream closes
        const cleanup = () => {
          clearInterval(pollInterval)
        }

        // Store cleanup function for later use
        ;(controller as any).cleanup = cleanup
      },

      cancel() {
        // Clean up when client disconnects
        if ((this as any).cleanup) {
          (this as any).cleanup()
        }
      }
    })

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control, Authorization'
      },
    })

  } catch (error) {
    console.error('❌ Error setting up SSE stream:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}