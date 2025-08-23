import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions for presence management
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
    const { username, settings } = body;

    if (!username || !settings) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'username and settings are required'
      }, { status: 400 });
    }

    console.log(`🔧 Admin ${authResult.user.username} managing presence for ${username}:`, settings);

    // Validate target user exists
    const targetUser = await queryAsync(
      'SELECT username, display_name, role FROM users WHERE username = ? AND active = 1',
      [username]
    );

    if (targetUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        details: `User ${username} does not exist or is inactive`
      }, { status: 404 });
    }

    // Apply presence settings
    const updates = [];
    const auditActions = [];

    // Ensure user_presence record exists
    await runAsync(`
      INSERT OR IGNORE INTO user_presence (user_id, status, last_active)
      VALUES (?, 'offline', datetime('now'))
    `, [username]);

    if (settings.forceInvisible !== undefined) {
      if (settings.forceInvisible) {
        await runAsync(`
          UPDATE user_presence 
          SET status = 'invisible', 
              admin_override = 'invisible',
              override_reason = 'Admin forced invisible',
              override_by = ?,
              override_at = datetime('now')
          WHERE user_id = ?
        `, [authResult.user.username, username]);
        
        auditActions.push('Forced user invisible');
        console.log(`👻 User ${username} forced invisible by ${authResult.user.username}`);
      }
    }

    if (settings.allowPresenceDisplay !== undefined) {
      const field = settings.allowPresenceDisplay ? null : 'hidden';
      await runAsync(`
        UPDATE user_presence 
        SET visibility_override = ?,
            override_reason = ?,
            override_by = ?,
            override_at = datetime('now')
        WHERE user_id = ?
      `, [
        field,
        settings.allowPresenceDisplay ? null : 'Admin disabled presence display',
        authResult.user.username,
        username
      ]);
      
      auditActions.push(settings.allowPresenceDisplay ? 'Enabled presence display' : 'Disabled presence display');
      console.log(`👁️ User ${username} presence display ${settings.allowPresenceDisplay ? 'enabled' : 'disabled'} by ${authResult.user.username}`);
    }

    if (settings.presenceOverride) {
      await runAsync(`
        UPDATE user_presence 
        SET status = ?,
            admin_override = ?,
            override_reason = 'Admin status override',
            override_by = ?,
            override_at = datetime('now')
        WHERE user_id = ?
      `, [settings.presenceOverride, settings.presenceOverride, authResult.user.username, username]);
      
      auditActions.push(`Status overridden to ${settings.presenceOverride}`);
      console.log(`🔄 User ${username} status overridden to ${settings.presenceOverride} by ${authResult.user.username}`);
    }

    // Log audit trail
    if (auditActions.length > 0) {
      await runAsync(`
        INSERT INTO system_settings_audit (
          setting_key, old_value, new_value, changed_by, changed_at, change_reason
        ) VALUES (?, ?, ?, ?, datetime('now'), ?)
      `, [
        `user_presence_${username}`,
        'previous_settings',
        JSON.stringify(settings),
        authResult.user.username,
        `Admin presence management: ${auditActions.join(', ')}`
      ]);
    }

    // Notify Socket.IO server of presence changes if available
    try {
      await fetch('http://localhost:4000/admin/presence-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Admin-Token'
        },
        body: JSON.stringify({
          username,
          settings,
          changedBy: authResult.user.username
        })
      });
      console.log(`📡 Notified Socket.IO server of presence changes for ${username}`);
    } catch (socketError) {
      console.warn('⚠️ Could not notify Socket.IO server of presence changes:', socketError);
    }

    return NextResponse.json({
      success: true,
      message: 'User presence settings updated successfully',
      username,
      actionsApplied: auditActions,
      changedBy: authResult.user.username,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error managing user presence:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}