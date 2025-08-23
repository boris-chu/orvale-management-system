import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/chat/search/test - Simplified search for testing
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test search endpoint called')
    
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'test'

    // Simple search query without complex JOINs
    const simpleQuery = `
      SELECT 
        cm.id,
        cm.channel_id,
        cm.message_text,
        cm.user_id,
        cm.created_at,
        cm.message_type
      FROM chat_messages cm
      WHERE cm.deleted_at IS NULL
        AND cm.message_text LIKE ?
      ORDER BY cm.created_at DESC 
      LIMIT 10
    `

    console.log('🔍 Testing simple search query for:', query)
    const results = await queryAsync(simpleQuery, [`%${query}%`])
    
    console.log('✅ Simple search results count:', results.length)

    return NextResponse.json({
      success: true,
      results: results,
      query: query,
      total: results.length
    })

  } catch (error) {
    console.error('❌ Test search error:', error)
    return NextResponse.json({ error: 'Test search failed', details: error.message }, { status: 500 })
  }
}