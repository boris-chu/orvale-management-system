import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync, runAsync } from '@/lib/database'

// POST /api/admin/chat/broadcast - Send system-wide broadcast message
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has chat admin permissions
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings')
    
    if (!hasChatAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions for system broadcast' }, { status: 403 })
    }

    const body = await request.json()
    const { title, message, priority = 'info' } = body

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Broadcast title is required' }, { status: 400 })
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Broadcast message is required' }, { status: 400 })
    }

    if (!['info', 'warning', 'critical'].includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority level' }, { status: 400 })
    }

    // Get all active public channels to broadcast to
    const channels = await queryAsync(`
      SELECT id, name, type 
      FROM chat_channels 
      WHERE active = 1 AND type = 'public'
      ORDER BY name
    `)

    if (!channels || channels.length === 0) {
      return NextResponse.json({ error: 'No active channels found for broadcast' }, { status: 404 })
    }

    const broadcastId = `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let totalMessagesSent = 0
    const channelResults = []

    // Create system broadcast message for each channel
    for (const channel of channels) {
      try {
        // Format broadcast message with priority styling
        const priorityEmoji = priority === 'critical' ? '🚨' : priority === 'warning' ? '⚠️' : 'ℹ️'
        const formattedMessage = `${priorityEmoji} **${title.trim()}**\n\n${message.trim()}\n\n*— System Administrator*`

        // Insert broadcast message into channel
        const result = await runAsync(`
          INSERT INTO chat_messages (
            channel_id, 
            user_id, 
            message_text, 
            message_type, 
            created_at
          ) VALUES (?, 'system', ?, 'system', datetime('now'))
        `, [channel.id, formattedMessage])

        const messageId = result.lastID
        totalMessagesSent++

        channelResults.push({
          channelId: channel.id,
          channelName: channel.name,
          messageId,
          success: true
        })

        console.log(`📢 Broadcast sent to channel #${channel.name} (ID: ${channel.id})`)

      } catch (error) {
        console.error(`❌ Error sending broadcast to channel ${channel.name}:`, error)
        channelResults.push({
          channelId: channel.id,
          channelName: channel.name,
          messageId: null,
          success: false,
          error: error.message
        })
      }
    }

    // Get count of online users who will see the broadcast
    const onlineUsers = await queryAsync(`
      SELECT COUNT(*) as count 
      FROM user_presence 
      WHERE status = 'online'
    `).catch(() => [{ count: 0 }])

    const response = {
      success: true,
      broadcastId,
      title: title.trim(),
      message: message.trim(),
      priority,
      sentBy: authResult.user.username,
      sentByName: authResult.user.display_name,
      sentAt: new Date().toISOString(),
      channels: {
        total: channels.length,
        successful: channelResults.filter(r => r.success).length,
        failed: channelResults.filter(r => !r.success).length
      },
      recipients: {
        totalChannels: channels.length,
        onlineUsers: onlineUsers[0]?.count || 0,
        messagesSent: totalMessagesSent
      },
      results: channelResults
    }

    console.log(`🎯 System broadcast completed:`, {
      broadcastId,
      priority,
      channelsSent: totalMessagesSent,
      onlineUsers: onlineUsers[0]?.count || 0,
      sentBy: authResult.user.display_name
    })

    // Emit real-time broadcast notification to all connected users
    try {
      const { Server } = require('socket.io')
      const { createServer } = require('http')
      
      // Try to get existing Socket.io instance
      const io = global.io || new Server(createServer(), {
        path: '/api/socket',
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? ['https://your-domain.com'] 
            : ['http://localhost', 'http://localhost:80'],
          methods: ['GET', 'POST'],
          credentials: true
        }
      })

      if (!global.io) {
        global.io = io
      }

      // Broadcast system message to all connected users
      io.emit('system_broadcast', {
        type: 'system_broadcast',
        broadcastId,
        title: title.trim(),
        message: message.trim(),
        priority,
        sentBy: authResult.user.display_name,
        sentAt: new Date().toISOString(),
        channels: response.channels
      })

      console.log('📡 Real-time broadcast notification sent to all users')
    } catch (socketError) {
      console.warn('⚠️ Failed to send real-time broadcast notification:', socketError.message)
      // Continue - broadcast was still saved to database
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('❌ Error sending system broadcast:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/admin/chat/broadcast - Get recent broadcast history  
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has chat admin permissions
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings')
    
    if (!hasChatAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Get recent system broadcasts
    const broadcasts = await queryAsync(`
      SELECT 
        cm.id,
        cm.message_text,
        cm.created_at,
        cc.name as channel_name,
        COUNT(*) as message_count
      FROM chat_messages cm
      JOIN chat_channels cc ON cm.channel_id = cc.id
      WHERE cm.message_type = 'system' 
        AND cm.user_id = 'system'
        AND cm.message_text LIKE '%**%**%'  -- Matches broadcast format
      GROUP BY DATE(cm.created_at), SUBSTR(cm.message_text, 1, 50)
      ORDER BY cm.created_at DESC
      LIMIT ?
    `, [limit])

    return NextResponse.json({
      success: true,
      broadcasts: broadcasts || [],
      total: broadcasts?.length || 0
    })

  } catch (error) {
    console.error('❌ Error fetching broadcast history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}