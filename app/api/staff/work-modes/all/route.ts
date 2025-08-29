import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch all staff work modes (for queue management)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions for public portal queue access
    if (!authResult.user.permissions?.includes('public_portal.manage_chats') && 
        !authResult.user.permissions?.includes('public_portal.view_queue') &&
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      db.all(`
        SELECT 
          swm.username,
          swm.work_mode,
          swm.status_message,
          swm.auto_accept_chats,
          swm.max_concurrent_chats,
          swm.last_activity,
          swm.updated_at,
          u.display_name,
          u.profile_picture,
          u.role,
          -- Count active public chat sessions
          COALESCE(active_sessions.session_count, 0) as current_chat_count
        FROM staff_work_modes swm
        JOIN users u ON swm.username = u.username
        LEFT JOIN (
          SELECT staff_username, COUNT(*) as session_count
          FROM public_chat_sessions 
          WHERE status = 'active' 
          GROUP BY staff_username
        ) active_sessions ON swm.username = active_sessions.staff_username
        WHERE u.active = 1
        ORDER BY 
          CASE swm.work_mode 
            WHEN 'ready' THEN 1
            WHEN 'work_mode' THEN 2
            WHEN 'break' THEN 3
            WHEN 'ticketing_mode' THEN 4
            WHEN 'away' THEN 5
            ELSE 6
          END,
          u.display_name
      `, (err, rows) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json(rows || []));
      });
    });
  } catch (error) {
    console.error('All work modes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}