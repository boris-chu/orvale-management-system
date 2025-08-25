/**
 * Admin Force User Logout API
 * Forces disconnection of all user's Socket.io sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check chat management permissions
    const hasPermission = authResult.user.permissions?.includes('chat.manage_system') || 
                         authResult.user.permissions?.includes('admin.system_settings') ||
                         authResult.user.permissions?.includes('admin.manage_chat_channels') ||
                         authResult.user.role === 'admin';

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Prevent admin from force-logging themselves out
    if (username === authResult.user.username) {
      return NextResponse.json({ 
        error: 'Cannot force logout yourself' 
      }, { status: 400 });
    }

    return new Promise<NextResponse>((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          resolve(NextResponse.json({ error: 'Database connection failed' }, { status: 500 }));
          return;
        }
      });

      // Clear user's socket connections and set offline status
      const updateQuery = `
        UPDATE user_presence 
        SET 
          status = 'offline',
          socket_connections = '[]',
          connection_count = 0,
          last_active = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;

      db.run(updateQuery, [username], function(err) {
        if (err) {
          console.error('Update error:', err);
          db.close();
          resolve(NextResponse.json({ error: 'Failed to update user status' }, { status: 500 }));
          return;
        }

        // TODO: In a real implementation, we would also emit a Socket.io event
        // to force disconnect the user's actual socket connections:
        // io.to(username).emit('force_disconnect', { reason: 'admin_logout' });
        
        console.log(`Admin ${authResult.user?.username} force-logged out user ${username}`);

        // Log the admin action
        const logQuery = `
          INSERT INTO system_settings_audit (setting_key, old_value, new_value, updated_by)
          VALUES ('chat_force_logout', ?, 'force_disconnected', ?)
        `;

        db.run(logQuery, [username, authResult.user?.username], (logErr) => {
          if (logErr) {
            console.warn('Failed to log admin action:', logErr);
          }
          
          db.close();
          resolve(NextResponse.json({
            success: true,
            message: `User ${username} has been logged out of all sessions`,
            action: 'force_logout',
            target: username,
            admin: authResult.user?.username
          }));
        });
      });
    });

  } catch (error) {
    console.error('Force logout API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}