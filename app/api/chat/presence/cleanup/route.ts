import { NextRequest, NextResponse } from 'next/server'
import { runAsync } from '@/lib/database'

// GET /api/chat/presence/cleanup - Clean up stale presence data
export async function GET(request: NextRequest) {
  try {
    // Mark users as offline if they haven't been active in the last 2 minutes
    const result = await runAsync(`
      UPDATE user_presence 
      SET status = 'offline' 
      WHERE status != 'offline' 
      AND last_active < datetime('now', '-2 minutes')
    `)

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