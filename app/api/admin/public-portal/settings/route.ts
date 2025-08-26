import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch current public portal settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check public portal management permissions
    if (!authResult.user.permissions?.includes('public_portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // Load both widget settings and recovery settings
      db.get(
        `SELECT 
          pws.*,
          prs.auto_requeue_enabled,
          prs.requeue_position,
          prs.priority_boost_amount,
          prs.staff_disconnect_timeout,
          prs.grace_period_seconds,
          prs.auto_reassign_after_seconds,
          prs.notify_guest_on_staff_disconnect,
          prs.staff_disconnect_message,
          prs.reassignment_message,
          prs.escalate_on_multiple_disconnects,
          prs.max_disconnects_before_escalation,
          prs.escalation_priority,
          prs.guest_inactivity_timeout,
          prs.auto_end_abandoned_sessions,
          swms.auto_assignment_enabled as work_mode_auto_assignment_enabled,
          swms.ready_mode_auto_accept as work_mode_ready_auto_accept,
          swms.work_mode_auto_accept as work_mode_work_auto_accept,
          swms.ticketing_mode_auto_accept as work_mode_ticketing_auto_accept,
          swms.max_queue_time_minutes as work_mode_max_queue_time_minutes,
          swms.escalate_unassigned_chats as work_mode_escalate_unassigned,
          swms.break_timeout_minutes as work_mode_break_timeout_minutes,
          swms.away_timeout_minutes as work_mode_away_timeout_minutes,
          swms.work_mode_descriptions
        FROM public_portal_widget_settings pws
        LEFT JOIN public_portal_recovery_settings prs ON prs.id = 1
        LEFT JOIN staff_work_mode_settings swms ON swms.id = 1
        WHERE pws.id = 1`,
        (err, row) => {
          db.close();
          
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          if (!row) {
            // Return default settings if no record exists
            const defaultSettings = {
              enabled: false,
              business_hours_enabled: true,
              timezone: 'America/New_York',
              schedule_json: JSON.stringify({
                monday: { enabled: true, open: '07:00', close: '18:00' },
                tuesday: { enabled: true, open: '07:00', close: '18:00' },
                wednesday: { enabled: true, open: '07:00', close: '18:00' },
                thursday: { enabled: true, open: '07:00', close: '18:00' },
                friday: { enabled: true, open: '07:00', close: '18:00' },
                saturday: { enabled: false, open: '09:00', close: '17:00' },
                sunday: { enabled: false, open: '09:00', close: '17:00' }
              }),
              holidays_json: JSON.stringify([]),
              widget_shape: 'circle',
              widget_color: '#1976d2',
              widget_size: 'medium',
              widget_position: 'bottom-right',
              widget_position_x: 0,
              widget_position_y: 0,
              widget_text: 'Chat with us',
              widget_image: '',
              widget_animation: 'pulse',
              animation_duration: 2000,
              animation_delay: 5000,
              welcome_message: 'Hi! How can we help you today?',
              offline_message: 'We are currently offline. Please submit a ticket.',
              business_hours_message: 'Live chat available Monday-Friday, 7:00 AM - 6:00 PM EST.',
              queue_message: 'You are in queue. Please wait for the next available agent.',
              staff_disconnect_message: 'Your support agent has been disconnected. We are connecting you with another agent.',
              require_name: true,
              require_email: true,
              require_phone: false,
              require_department: false,
              custom_fields_json: JSON.stringify([]),
              show_agent_typing: true,
              show_queue_position: true,
              enable_file_uploads: true,
              enable_screenshot_sharing: false,
              max_file_size_mb: 5,
              allowed_file_types_json: JSON.stringify(['image/*', 'application/pdf', 'text/plain']),
              typing_indicators_enabled: true,
              typing_timeout_seconds: 3,
              show_staff_typing_to_guests: true,
              show_guest_typing_to_staff: true,
              typing_indicator_text: 'is typing...',
              typing_indicator_style: 'dots',
              read_receipts_enabled: true,
              show_delivery_status: true,
              show_guest_read_status_to_staff: true,
              show_staff_read_status_to_guests: false,
              read_receipt_style: 'checkmarks',
              delivery_status_icons: JSON.stringify({
                sent: '✓',
                delivered: '✓✓',
                read: '✓✓'
              }),
              session_recovery_enabled: true,
              session_recovery_minutes: 5,
              auto_ticket_creation: true,
              enabled_pages: JSON.stringify([]),
              disabled_pages: JSON.stringify([]),
              // Recovery settings defaults
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
              auto_end_abandoned_sessions: true,
              // Work mode settings defaults
              work_mode_auto_assignment_enabled: true,
              work_mode_ready_auto_accept: true,
              work_mode_work_auto_accept: false,
              work_mode_ticketing_auto_accept: false,
              work_mode_max_queue_time_minutes: 10,
              work_mode_escalate_unassigned: true,
              work_mode_break_timeout_minutes: 30,
              work_mode_away_timeout_minutes: 60,
              work_mode_descriptions: JSON.stringify({
                ready: "Available for new chats",
                work_mode: "Focused work - manual chat accept", 
                ticketing_mode: "Ticket work - no new chats",
                away: "Not available",
                break: "On break - return soon"
              })
            };
            resolve(NextResponse.json(defaultSettings));
          } else {
            resolve(NextResponse.json(row));
          }
        }
      );
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update public portal settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check public portal management permissions
    if (!authResult.user.permissions?.includes('public_portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const settings = await request.json();
    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // First update widget settings
      const widgetSql = `
        INSERT OR REPLACE INTO public_portal_widget_settings (
          id, enabled, business_hours_enabled, timezone, schedule_json, holidays_json,
          widget_shape, widget_color, widget_size, widget_position, widget_position_x, widget_position_y, widget_image, widget_text,
          widget_animation, animation_duration, animation_delay,
          welcome_message, offline_message, business_hours_message, queue_message, staff_disconnect_message,
          require_name, require_email, require_phone, require_department, custom_fields_json,
          show_agent_typing, show_queue_position, enable_file_uploads, enable_screenshot_sharing,
          max_file_size_mb, allowed_file_types_json,
          typing_indicators_enabled, typing_timeout_seconds, show_staff_typing_to_guests, 
          show_guest_typing_to_staff, typing_indicator_text, typing_indicator_style,
          read_receipts_enabled, show_delivery_status, show_guest_read_status_to_staff,
          show_staff_read_status_to_guests, read_receipt_style, delivery_status_icons,
          session_recovery_enabled, session_recovery_minutes, auto_ticket_creation,
          enabled_pages, disabled_pages, updated_by, updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, 
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, CURRENT_TIMESTAMP
        )
      `;

      const params = [
        settings.enabled || false,
        settings.business_hours_enabled || true,
        settings.timezone || 'America/New_York',
        settings.schedule_json || '{}',
        settings.holidays_json || '[]',
        settings.widget_shape || 'circle',
        settings.widget_color || '#1976d2',
        settings.widget_size || 'medium',
        settings.widget_position || 'bottom-right',
        settings.widget_position_x || 0,
        settings.widget_position_y || 0,
        settings.widget_image || '',
        settings.widget_text || 'Chat with us',
        settings.widget_animation || 'pulse',
        settings.animation_duration || 2000,
        settings.animation_delay || 5000,
        settings.welcome_message || 'Hi! How can we help you today?',
        settings.offline_message || 'We are currently offline. Please submit a ticket.',
        settings.business_hours_message || 'Live chat available Monday-Friday, 7:00 AM - 6:00 PM EST.',
        settings.queue_message || 'You are in queue. Please wait for the next available agent.',
        settings.staff_disconnect_message || 'Your support agent has been disconnected. We are connecting you with another agent.',
        settings.require_name || true,
        settings.require_email || true,
        settings.require_phone || false,
        settings.require_department || false,
        settings.custom_fields_json || '[]',
        settings.show_agent_typing || true,
        settings.show_queue_position || true,
        settings.enable_file_uploads || true,
        settings.enable_screenshot_sharing || false,
        settings.max_file_size_mb || 5,
        settings.allowed_file_types_json || '["image/*", "application/pdf", "text/plain"]',
        settings.typing_indicators_enabled || true,
        settings.typing_timeout_seconds || 3,
        settings.show_staff_typing_to_guests || true,
        settings.show_guest_typing_to_staff || true,
        settings.typing_indicator_text || 'is typing...',
        settings.typing_indicator_style || 'dots',
        settings.read_receipts_enabled || true,
        settings.show_delivery_status || true,
        settings.show_guest_read_status_to_staff || true,
        settings.show_staff_read_status_to_guests || false,
        settings.read_receipt_style || 'checkmarks',
        settings.delivery_status_icons || '{"sent":"✓","delivered":"✓✓","read":"✓✓"}',
        settings.session_recovery_enabled || true,
        settings.session_recovery_minutes || 5,
        settings.auto_ticket_creation || true,
        settings.enabled_pages || '[]',
        settings.disabled_pages || '[]',
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
          message: 'Public portal settings updated successfully' 
        }));
      });
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}