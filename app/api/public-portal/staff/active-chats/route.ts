import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import Database from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new Database.Database(dbPath);
    const dbGet = promisify(db.get.bind(db));

    return new Promise((resolve) => {
      const runQuery = async () => {
        try {
          // Get active chat sessions assigned to this staff member
          const activeChatCount = await dbGet(`
            SELECT COUNT(*) as count
            FROM public_chat_sessions 
            WHERE assigned_to = ? 
              AND status = 'active'
          `, [authResult.user.username]) as { count: number };

          // Get today's chat statistics
          const todayStats = await dbGet(`
            SELECT 
              COUNT(*) as total_today,
              AVG(CASE 
                WHEN ended_at IS NOT NULL 
                THEN (julianday(ended_at) - julianday(created_at)) * 24 * 60 
                ELSE NULL 
              END) as avg_duration_minutes
            FROM public_chat_sessions 
            WHERE assigned_to = ? 
              AND date(created_at) = date('now')
          `, [authResult.user.username]) as { 
            total_today: number; 
            avg_duration_minutes: number | null; 
          };

          // Get staff work mode settings
          const workModeInfo = await dbGet(`
            SELECT 
              current_mode,
              max_concurrent_chats,
              auto_assign_enabled,
              last_activity
            FROM staff_work_modes 
            WHERE username = ?
          `, [authResult.user.username]) as {
            current_mode: string;
            max_concurrent_chats: number;
            auto_assign_enabled: number;
            last_activity: string;
          } | undefined;

          db.close();

          resolve(NextResponse.json({
            success: true,
            activeChats: activeChatCount?.count || 0,
            maxChats: workModeInfo?.max_concurrent_chats || 3,
            todayTotal: todayStats?.total_today || 0,
            avgDuration: todayStats?.avg_duration_minutes || null,
            currentMode: workModeInfo?.current_mode || 'away',
            autoAssignEnabled: Boolean(workModeInfo?.auto_assign_enabled),
            canAcceptNewChats: workModeInfo ? 
              ((activeChatCount?.count || 0) < workModeInfo.max_concurrent_chats && 
               workModeInfo.current_mode !== 'offline' && 
               workModeInfo.current_mode !== 'break') : false,
            lastActivity: workModeInfo?.last_activity || null
          }));

        } catch (error) {
          console.error('Error in active chats query:', error);
          db.close();
          resolve(NextResponse.json(
            { 
              success: false, 
              error: 'Failed to fetch active chats',
              activeChats: 0 
            },
            { status: 500 }
          ));
        }
      };

      runQuery();
    });

  } catch (error) {
    console.error('Error fetching active chats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch active chats',
        activeChats: 0 
      },
      { status: 500 }
    );
  }
}