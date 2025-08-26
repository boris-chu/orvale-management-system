import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch work mode system settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('public_portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      db.get(
        'SELECT * FROM staff_work_mode_settings WHERE id = 1',
        (err, row) => {
          db.close();
          
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          resolve(NextResponse.json(row || {
            auto_assignment_enabled: true,
            ready_mode_auto_accept: true,
            work_mode_auto_accept: false,
            ticketing_mode_auto_accept: false,
            max_queue_time_minutes: 10,
            escalate_unassigned_chats: true,
            break_timeout_minutes: 30,
            away_timeout_minutes: 60,
            work_mode_descriptions: JSON.stringify({
              ready: "Available for new chats",
              work_mode: "Focused work - manual chat accept", 
              ticketing_mode: "Ticket work - no new chats",
              away: "Not available",
              break: "On break - return soon"
            })
          }));
        }
      );
    });
  } catch (error) {
    console.error('Work mode settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update work mode system settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('public_portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const settings = await request.json();
    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      const sql = `
        INSERT OR REPLACE INTO staff_work_mode_settings (
          id, auto_assignment_enabled, ready_mode_auto_accept, work_mode_auto_accept,
          ticketing_mode_auto_accept, max_queue_time_minutes, escalate_unassigned_chats,
          break_timeout_minutes, away_timeout_minutes, work_mode_descriptions,
          updated_by, updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )
      `;

      const params = [
        settings.auto_assignment_enabled !== undefined ? settings.auto_assignment_enabled : true,
        settings.ready_mode_auto_accept !== undefined ? settings.ready_mode_auto_accept : true,
        settings.work_mode_auto_accept !== undefined ? settings.work_mode_auto_accept : false,
        settings.ticketing_mode_auto_accept !== undefined ? settings.ticketing_mode_auto_accept : false,
        settings.max_queue_time_minutes || 10,
        settings.escalate_unassigned_chats !== undefined ? settings.escalate_unassigned_chats : true,
        settings.break_timeout_minutes || 30,
        settings.away_timeout_minutes || 60,
        typeof settings.work_mode_descriptions === 'string' 
          ? settings.work_mode_descriptions 
          : JSON.stringify(settings.work_mode_descriptions || {
              ready: "Available for new chats",
              work_mode: "Focused work - manual chat accept", 
              ticketing_mode: "Ticket work - no new chats",
              away: "Not available",
              break: "On break - return soon"
            }),
        authResult.user.username
      ];

      db.run(sql, params, function(err) {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          success: true, 
          message: 'Work mode settings updated successfully' 
        }));
      });
    });
  } catch (error) {
    console.error('Work mode settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}