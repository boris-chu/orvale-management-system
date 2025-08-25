/**
 * Admin User Block/Unblock API
 * Blocks or unblocks users from accessing the chat system
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
    if (!authResult.user.permissions?.includes('chat.admin_dashboard') && 
        !authResult.user.permissions?.includes('chat.manage_users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { username, blocked } = await request.json();
    if (!username || typeof blocked !== 'boolean') {
      return NextResponse.json({ 
        error: 'Username and blocked status are required' 
      }, { status: 400 });
    }

    // Prevent admin from blocking themselves
    if (username === authResult.user.username) {
      return NextResponse.json({ 
        error: 'Cannot block yourself' 
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

      // First, check if user exists
      const checkUserQuery = `SELECT id, username, display_name FROM users WHERE username = ? AND active = 1`;
      
      db.get(checkUserQuery, [username], (err, user: any) => {
        if (err) {
          console.error('User check error:', err);
          db.close();
          resolve(NextResponse.json({ error: 'Database query failed' }, { status: 500 }));
          return;
        }

        if (!user) {
          db.close();
          resolve(NextResponse.json({ error: 'User not found' }, { status: 404 }));
          return;
        }

        // Create user_presence record if it doesn't exist, then update
        const upsertQuery = `
          INSERT INTO user_presence (
            user_id, 
            status,
            is_chat_blocked, 
            blocked_by, 
            blocked_at,
            socket_connections,
            connection_count
          ) 
          VALUES (?, 'offline', ?, ?, ?, '[]', 0)
          ON CONFLICT(user_id) DO UPDATE SET
            is_chat_blocked = EXCLUDED.is_chat_blocked,
            blocked_by = EXCLUDED.blocked_by,
            blocked_at = EXCLUDED.blocked_at,
            status = CASE 
              WHEN EXCLUDED.is_chat_blocked = 1 THEN 'offline'
              ELSE status 
            END,
            socket_connections = CASE 
              WHEN EXCLUDED.is_chat_blocked = 1 THEN '[]'
              ELSE socket_connections 
            END,
            connection_count = CASE 
              WHEN EXCLUDED.is_chat_blocked = 1 THEN 0
              ELSE connection_count 
            END
        `;

        const params = [
          username,
          blocked ? 1 : 0,
          blocked ? authResult.user?.username : null,
          blocked ? new Date().toISOString() : null
        ];

        db.run(upsertQuery, params, function(err) {
          if (err) {
            console.error('Block/unblock error:', err);
            db.close();
            resolve(NextResponse.json({ error: 'Failed to update user block status' }, { status: 500 }));
            return;
          }

          const action = blocked ? 'blocked' : 'unblocked';
          console.log(`Admin ${authResult.user?.username} ${action} user ${username} from chat`);

          // Log the admin action
          const logQuery = `
            INSERT INTO system_settings_audit (setting_key, old_value, new_value, updated_by)
            VALUES ('chat_user_block', ?, ?, ?)
          `;

          db.run(logQuery, [
            `${username}:${!blocked}`,
            `${username}:${blocked}`,
            authResult.user?.username
          ], (logErr) => {
            if (logErr) {
              console.warn('Failed to log admin action:', logErr);
            }

            // TODO: In a real implementation, if blocking, we would also emit 
            // a Socket.io event to disconnect the user:
            // if (blocked) {
            //   io.to(username).emit('chat_blocked', { 
            //     reason: 'blocked_by_admin',
            //     message: 'You have been blocked from the chat system'
            //   });
            // }
            
            db.close();
            resolve(NextResponse.json({
              success: true,
              message: `User ${username} has been ${action}`,
              action: blocked ? 'block' : 'unblock',
              target: username,
              admin: authResult.user?.username,
              user_display_name: user.display_name
            }));
          });
        });
      });
    });

  } catch (error) {
    console.error('User block API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}