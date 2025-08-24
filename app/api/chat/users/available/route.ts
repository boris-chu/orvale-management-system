import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'
import { queryAsync } from '@/lib/database'

// GET /api/chat/users/available - Get users available for adding to channels
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authResult.user.permissions?.includes('chat.access_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all users who have chat permissions (active users with chat access)
    const users = await queryAsync(`
      SELECT DISTINCT
        u.username,
        u.display_name,
        u.profile_picture,
        u.email,
        r.name as role_name,
        up.status as online_status,
        up.last_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE u.active = 1 
        AND rp.permission = 'chat.access_channels'
        AND u.username != ?
      ORDER BY 
        CASE up.status 
          WHEN 'online' THEN 1
          WHEN 'away' THEN 2  
          WHEN 'busy' THEN 3
          ELSE 4
        END,
        u.display_name ASC
    `, [authResult.user.username]) // Exclude current user

    return NextResponse.json({
      success: true,
      users: users || []
    })

  } catch (error) {
    console.error('❌ Error fetching available users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}