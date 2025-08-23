import { NextRequest, NextResponse } from 'next/server'
import { queryAsync } from '@/lib/database'

// GET /api/debug/presence - Debug presence data
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking presence table...')
    
    // Check if table exists
    const tableCheck = await queryAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='user_presence'
    `)
    
    console.log('📋 Table exists:', tableCheck.length > 0)
    
    if (tableCheck.length === 0) {
      return NextResponse.json({
        error: 'user_presence table does not exist',
        suggestion: 'Need to create presence table'
      })
    }
    
    // Get all presence data
    const allPresence = await queryAsync(`
      SELECT 
        up.user_id,
        up.status,
        up.last_active,
        u.display_name
      FROM user_presence up
      LEFT JOIN users u ON up.user_id = u.username
      ORDER BY up.last_active DESC
    `)
    
    console.log('👥 All presence records:', allPresence.length)
    
    return NextResponse.json({
      success: true,
      table_exists: true,
      total_records: allPresence.length,
      presence_data: allPresence,
      summary: {
        online: allPresence.filter(p => p.status === 'online').length,
        away: allPresence.filter(p => p.status === 'away').length,
        busy: allPresence.filter(p => p.status === 'busy').length,
        offline: allPresence.filter(p => p.status === 'offline').length
      }
    })
    
  } catch (error) {
    console.error('❌ Debug presence error:', error)
    return NextResponse.json({ 
      error: 'Database error',
      details: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}