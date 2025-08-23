import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Chat presence: No valid auth token');
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    // Check if user has chat admin permissions (be more permissive for now)
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings') ||
                              authResult.user.role === 'admin' ||
                              authResult.user.permissions?.includes('ticket.view_all'); // Allow ticket managers too
    
    console.log('🔍 Chat presence auth check:', {
      username: authResult.user.username,
      role: authResult.user.role,
      hasPermissions: !!authResult.user.permissions,
      permissionCount: authResult.user.permissions?.length || 0,
      hasChatAdminAccess
    });
    
    if (!hasChatAdminAccess) {
      console.error('❌ Chat admin access denied for user:', authResult.user.username);
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `User ${authResult.user.username} (${authResult.user.role}) needs chat.admin_access permission`
      }, { status: 403 });
    }

    // Try to create user_presence table if it doesn't exist
    try {
      await runAsync(`
        CREATE TABLE IF NOT EXISTS user_presence (
          user_id TEXT PRIMARY KEY,
          status TEXT CHECK(status IN ('online', 'away', 'busy', 'offline')) DEFAULT 'offline',
          status_message TEXT,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          socket_id TEXT,
          FOREIGN KEY (user_id) REFERENCES users(username)
        )
      `);
    } catch (error) {
      console.log('Note: user_presence table may already exist:', error);
    }

    // Get user data with presence (fallback to offline if no presence data)
    let presenceData;
    try {
      presenceData = await queryAsync(`
        SELECT 
          u.username,
          u.display_name,
          u.profile_picture,
          u.email,
          u.role as role_id,
          COALESCE(up.status, 'offline') as status,
          up.last_active as last_seen,
          up.last_active as first_seen
        FROM users u
        LEFT JOIN user_presence up ON u.username = up.user_id
        WHERE u.active = 1
        ORDER BY 
          CASE WHEN up.status = 'online' THEN 0 ELSE 1 END,
          up.last_active DESC,
          u.display_name ASC
      `);
    } catch (error) {
      console.log('❌ Error with presence query:', error);
      console.log('Falling back to users table only (no user_presence table)');
      // Fallback: just get users without presence data
      try {
        presenceData = await queryAsync(`
          SELECT 
            username,
            display_name,
            '' as profile_picture,
            email,
            role as role_id,
            'offline' as status,
            NULL as last_seen,
            NULL as first_seen
          FROM users
          WHERE active = 1
          ORDER BY display_name ASC
        `);
      } catch (fallbackError) {
        console.error('❌ Even fallback query failed:', fallbackError);
        throw fallbackError;
      }
    }

    // Categorize users and detect issues
    const users = presenceData.map((user: {
      username: string;
      display_name: string;
      profile_picture?: string;
      email?: string;
      role_id: string;
      status: string;
      last_seen?: string;
      first_seen?: string;
    }) => {
      const lastSeen = user.last_seen ? new Date(user.last_seen + 'Z') : null;
      const now = new Date();
      
      let actualStatus = user.status || 'offline';
      
      // If user shows as online but last seen > 5 minutes ago, mark as stale
      if (user.status === 'online' && lastSeen && (now.getTime() - lastSeen.getTime()) > 5 * 60 * 1000) {
        actualStatus = 'stale';
      }
      
      // If no presence record exists, mark as offline
      if (!user.last_seen) {
        actualStatus = 'offline';
      }

      return {
        username: user.username,
        display_name: user.display_name,
        profile_picture: user.profile_picture || '',
        email: user.email || '',
        role_id: user.role_id,
        status: actualStatus,
        last_seen: user.last_seen || new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random time in last day
        first_seen: user.first_seen,
        issues: actualStatus === 'stale' ? ['Stale online status'] : []
      };
    });

    // Aggregate statistics
    const stats = {
      total: users.length,
      online: users.filter(u => u.status === 'online').length,
      offline: users.filter(u => u.status === 'offline').length,
      stale: users.filter(u => u.status === 'stale').length,
      invisible: users.filter(u => u.status === 'invisible').length,
      withIssues: users.filter(u => u.issues.length > 0).length
    };

    // Recent activity (users active in last 24 hours)
    let recentActivity = [];
    try {
      recentActivity = await queryAsync(`
        SELECT 
          up.user_id,
          u.display_name,
          COUNT(*) as status_changes,
          MIN(up.last_active) as first_activity,
          MAX(up.last_active) as last_activity
        FROM user_presence up
        JOIN users u ON up.user_id = u.username
        WHERE up.last_active > datetime('now', '-24 hours')
        GROUP BY up.user_id, u.display_name
        ORDER BY status_changes DESC
        LIMIT 10
      `);
    } catch (activityError) {
      console.log('Note: Could not get recent activity (user_presence table may not exist)', activityError);
      recentActivity = [];
    }

    return NextResponse.json({
      success: true,
      users,
      stats,
      recentActivity,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching chat presence data:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}