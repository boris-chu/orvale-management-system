/**
 * Admin Chat Users API
 * Provides user management capabilities for chat system
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

interface UserWithPresence {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: string;
  profile_picture?: string;
  presence_status: string;
  connection_count: number;
  socket_connections: string;
  is_chat_blocked: boolean;
  blocked_by?: string;
  blocked_at?: string;
  last_active?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    return new Promise<NextResponse>((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          resolve(NextResponse.json({ error: 'Database connection failed' }, { status: 500 }));
          return;
        }
      });

      // Get users with presence and connection data
      const query = `
        SELECT 
          u.id,
          u.username,
          u.display_name,
          u.email,
          u.role,
          u.profile_picture,
          COALESCE(up.status, 'offline') as presence_status,
          COALESCE(up.connection_count, 0) as connection_count,
          COALESCE(up.socket_connections, '[]') as socket_connections,
          COALESCE(up.is_chat_blocked, 0) as is_chat_blocked,
          up.blocked_by,
          up.blocked_at,
          up.last_active
        FROM users u
        LEFT JOIN user_presence up ON u.username = up.user_id
        WHERE u.active = 1
        ORDER BY 
          CASE up.status
            WHEN 'online' THEN 1
            WHEN 'away' THEN 2  
            WHEN 'busy' THEN 3
            WHEN 'offline' THEN 4
            ELSE 5
          END,
          u.display_name ASC
      `;

      db.all(query, [], (err, rows: UserWithPresence[]) => {
        if (err) {
          console.error('Query error:', err);
          db.close();
          resolve(NextResponse.json({ error: 'Query failed' }, { status: 500 }));
          return;
        }

        // Process the data
        const users = rows.map(user => ({
          ...user,
          is_chat_blocked: Boolean(user.is_chat_blocked),
          socket_connections: user.socket_connections || '[]'
        }));

        // Calculate statistics
        const onlineCount = users.filter(u => u.presence_status === 'online').length;
        const awayCount = users.filter(u => u.presence_status === 'away').length;
        const busyCount = users.filter(u => u.presence_status === 'busy').length;
        const offlineCount = users.filter(u => u.presence_status === 'offline').length;
        const blockedCount = users.filter(u => u.is_chat_blocked).length;
        const multiTabCount = users.filter(u => u.connection_count > 1).length;

        db.close();
        
        resolve(NextResponse.json({
          success: true,
          users,
          statistics: {
            total: users.length,
            online: onlineCount,
            away: awayCount, 
            busy: busyCount,
            offline: offlineCount,
            blocked: blockedCount,
            multiTab: multiTabCount
          }
        }));
      });
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}