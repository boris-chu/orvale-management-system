import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { runAsync } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions for user management
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings') ||
                              authResult.user.role === 'admin';
    
    if (!hasChatAdminAccess) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `User ${authResult.user.username} needs chat.admin_access permission`
      }, { status: 403 });
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'username is required'
      }, { status: 400 });
    }

    console.log(`🔌 Admin ${authResult.user.username} forcing disconnect for user: ${username}`);

    // Update user presence to offline in database
    await runAsync(`
      UPDATE user_presence 
      SET status = 'offline',
          last_active = datetime('now'),
          admin_override = 'forced_disconnect',
          override_reason = 'Admin forced disconnect',
          override_by = ?,
          override_at = datetime('now')
      WHERE user_id = ?
    `, [authResult.user.username, username]);

    // Log audit trail
    await runAsync(`
      INSERT INTO system_settings_audit (
        setting_key, old_value, new_value, updated_by
      ) VALUES (?, ?, ?, ?)
    `, [
      `user_disconnect_${username}`,
      'connected',
      'forced_disconnect',
      authResult.user.username
    ]);

    // Send disconnect command to Socket.IO server
    let socketResult = { success: false, message: 'Socket.IO server not available' };
    
    try {
      const socketResponse = await fetch('http://localhost:4000/admin/force-disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Admin-Token'
        },
        body: JSON.stringify({
          username,
          reason: 'admin_forced_disconnect',
          adminUser: authResult.user.username
        })
      });

      if (socketResponse.ok) {
        const result = await socketResponse.json();
        socketResult = result;
        console.log(`✅ Socket.IO server disconnected user ${username}:`, result);
      } else {
        throw new Error(`Socket.IO server returned ${socketResponse.status}`);
      }
    } catch (socketError) {
      console.warn(`⚠️ Could not reach Socket.IO server to disconnect ${username}:`, socketError);
      // Continue anyway - user will be marked offline in database
    }

    return NextResponse.json({
      success: true,
      message: 'User disconnect command sent',
      username,
      socketResult,
      changedBy: authResult.user.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error forcing user disconnect:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}