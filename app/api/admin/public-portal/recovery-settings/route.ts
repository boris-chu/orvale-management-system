import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch recovery settings
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
        'SELECT * FROM public_portal_recovery_settings WHERE id = 1',
        (err, row) => {
          db.close();
          
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          resolve(NextResponse.json(row || {
            auto_requeue_enabled: true,
            requeue_position: 'priority_boost',
            priority_boost_amount: 1,
            staff_disconnect_timeout: 30,
            grace_period_seconds: 60,
            auto_reassign_after_seconds: 120,
            notify_guest_on_staff_disconnect: true,
            staff_disconnect_message: 'Your support agent has been disconnected. We are connecting you with another agent.',
            reassignment_message: 'You have been connected with a new support agent.',
            escalate_on_multiple_disconnects: true,
            max_disconnects_before_escalation: 2,
            escalation_priority: 'urgent',
            guest_inactivity_timeout: 10,
            auto_end_abandoned_sessions: true
          }));
        }
      );
    });
  } catch (error) {
    console.error('Recovery settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update recovery settings  
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
        INSERT OR REPLACE INTO public_portal_recovery_settings (
          id, auto_requeue_enabled, requeue_position, priority_boost_amount,
          staff_disconnect_timeout, grace_period_seconds, auto_reassign_after_seconds,
          notify_guest_on_staff_disconnect, staff_disconnect_message, reassignment_message,
          escalate_on_multiple_disconnects, max_disconnects_before_escalation, escalation_priority,
          guest_inactivity_timeout, auto_end_abandoned_sessions,
          updated_by, updated_at
        ) VALUES (
          1, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, CURRENT_TIMESTAMP
        )
      `;

      const params = [
        settings.auto_requeue_enabled !== undefined ? settings.auto_requeue_enabled : true,
        settings.requeue_position || 'priority_boost',
        settings.priority_boost_amount !== undefined ? settings.priority_boost_amount : 1,
        settings.staff_disconnect_timeout !== undefined ? settings.staff_disconnect_timeout : 30,
        settings.grace_period_seconds !== undefined ? settings.grace_period_seconds : 60,
        settings.auto_reassign_after_seconds !== undefined ? settings.auto_reassign_after_seconds : 120,
        settings.notify_guest_on_staff_disconnect !== undefined ? settings.notify_guest_on_staff_disconnect : true,
        settings.staff_disconnect_message || 'Your support agent has been disconnected. We are connecting you with another agent.',
        settings.reassignment_message || 'You have been connected with a new support agent.',
        settings.escalate_on_multiple_disconnects !== undefined ? settings.escalate_on_multiple_disconnects : true,
        settings.max_disconnects_before_escalation !== undefined ? settings.max_disconnects_before_escalation : 2,
        settings.escalation_priority || 'urgent',
        settings.guest_inactivity_timeout !== undefined ? settings.guest_inactivity_timeout : 10,
        settings.auto_end_abandoned_sessions !== undefined ? settings.auto_end_abandoned_sessions : true,
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
          message: 'Recovery settings updated successfully' 
        }));
      });
    });
  } catch (error) {
    console.error('Recovery settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}