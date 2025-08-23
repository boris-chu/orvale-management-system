import { NextRequest, NextResponse } from 'next/server'
import { runAsync, queryAsync } from '@/lib/database'

// GET /api/chat/presence/cleanup - Clean up stale presence data
export async function GET(request: NextRequest) {
  try {
    console.log('🧩 Running presence cleanup...')
    
    // Get users that will be marked offline
    const usersToMarkOffline = await queryAsync(`
      SELECT user_id, status, last_active 
      FROM user_presence 
      WHERE status != 'offline' 
      AND last_active < datetime('now', '-5 minutes')
    `)
    
    console.log('🔍 Users to mark offline:', usersToMarkOffline?.length || 0, usersToMarkOffline?.map(u => `${u.user_id}(${u.status}, last_active: ${u.last_active})`).join(', ') || 'none')
    
    // Mark users as offline if they haven't been active in the last 5 minutes (more reasonable)
    const result = await runAsync(`
      UPDATE user_presence 
      SET status = 'offline' 
      WHERE status != 'offline' 
      AND last_active < datetime('now', '-5 minutes')
    `)

    console.log('✅ Cleanup complete: marked', result.changes, 'users as offline')
    
    return NextResponse.json({
      success: true,
      cleaned: result.changes,
      message: `Marked ${result.changes} inactive users as offline`
    })
  } catch (error) {
    console.error('❌ Error cleaning up presence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}