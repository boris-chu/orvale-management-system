import { NextRequest, NextResponse } from 'next/server'
import { runAsync, queryAsync } from '@/lib/database'

// POST /api/chat/presence/force-cleanup - Force cleanup stale presence data immediately
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Force presence cleanup initiated...')
    
    // Get users that will be marked offline (more aggressive - 2 minutes)
    const usersToMarkOffline = await queryAsync(`
      SELECT user_id, status, last_active 
      FROM user_presence 
      WHERE status != 'offline' 
      AND last_active < datetime('now', '-2 minutes')
    `)
    
    console.log('🔍 Users to mark offline (force):', usersToMarkOffline?.length || 0, usersToMarkOffline?.map(u => `${u.user_id}(${u.status}, last_active: ${u.last_active})`).join(', ') || 'none')
    
    // Mark users as offline if they haven't been active in the last 2 minutes (more aggressive)
    const result = await runAsync(`
      UPDATE user_presence 
      SET status = 'offline' 
      WHERE status != 'offline' 
      AND last_active < datetime('now', '-2 minutes')
    `)

    console.log('✅ Force cleanup complete: marked', result.changes, 'users as offline')
    
    return NextResponse.json({
      success: true,
      cleaned: result.changes,
      users_affected: usersToMarkOffline?.map(u => u.user_id) || [],
      message: `Force cleanup: marked ${result.changes} inactive users as offline`
    })
  } catch (error) {
    console.error('❌ Error in force cleanup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}