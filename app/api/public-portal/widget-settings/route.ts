import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch public widget settings (no auth required for public endpoint)
export async function GET(request: NextRequest) {
  try {
    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      db.get(
        'SELECT * FROM public_portal_widget_settings WHERE id = 1',
        (err, row) => {
          db.close();
          
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          if (!row || !row.enabled) {
            // Return minimal response if disabled
            resolve(NextResponse.json({ enabled: false }));
            return;
          }

          // Calculate chat status based on business hours
          let chatStatus = 'online';
          let statusMessage = '';
          let outsideHours = false;

          // Check business hours if enabled and not overridden
          if (row.business_hours_enabled && !row.ignore_business_hours) {
            const now = new Date();
            const schedule = row.schedule_json ? JSON.parse(row.schedule_json) : {};
            const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
            const daySchedule = schedule[dayOfWeek];

            if (!daySchedule || !daySchedule.enabled) {
              chatStatus = 'outside_hours';
              statusMessage = row.business_hours_message || 'Live chat is currently outside business hours';
              outsideHours = true;
            } else {
              // Check if current time is within business hours
              const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
              if (currentTime < daySchedule.open || currentTime > daySchedule.close) {
                chatStatus = 'outside_hours';
                statusMessage = row.business_hours_message || 'Live chat is currently outside business hours';
                outsideHours = true;
              }
            }
          }

          // Return public-safe settings (exclude internal fields)
          const publicSettings = {
            enabled: row.enabled,
            status: chatStatus,
            message: statusMessage,
            outsideBusinessHours: outsideHours,
            business_hours_enabled: row.business_hours_enabled,
            ignore_business_hours: row.ignore_business_hours,
            timezone: row.timezone,
            schedule_json: row.schedule_json,
            holidays_json: row.holidays_json,
            widget_theme: row.widget_theme,
            widget_shape: row.widget_shape,
            widget_color: row.widget_color,
            widget_size: row.widget_size,
            widget_position: row.widget_position,
            widget_position_x: row.widget_position_x,
            widget_position_y: row.widget_position_y,
            widget_icon: row.widget_icon,
            widget_image: row.widget_image,
            widget_text: row.widget_text,
            widget_animation: row.widget_animation,
            animation_duration: row.animation_duration,
            animation_delay: row.animation_delay,
            welcome_message: row.welcome_message,
            offline_message: row.offline_message,
            business_hours_message: row.business_hours_message,
            queue_message: row.queue_message,
            staff_disconnect_message: row.staff_disconnect_message,
            require_name: row.require_name,
            require_email: row.require_email,
            require_phone: row.require_phone,
            require_department: row.require_department,
            custom_fields_json: row.custom_fields_json,
            show_agent_typing: row.show_agent_typing,
            show_queue_position: row.show_queue_position,
            enable_file_uploads: row.enable_file_uploads,
            enable_screenshot_sharing: row.enable_screenshot_sharing,
            max_file_size_mb: row.max_file_size_mb,
            allowed_file_types_json: row.allowed_file_types_json,
            typing_indicators_enabled: row.typing_indicators_enabled,
            typing_timeout_seconds: row.typing_timeout_seconds,
            show_staff_typing_to_guests: row.show_staff_typing_to_guests,
            show_guest_typing_to_staff: row.show_guest_typing_to_staff,
            typing_indicator_text: row.typing_indicator_text,
            typing_indicator_style: row.typing_indicator_style,
            read_receipts_enabled: row.read_receipts_enabled,
            show_delivery_status: row.show_delivery_status,
            show_guest_read_status_to_staff: row.show_guest_read_status_to_staff,
            show_staff_read_status_to_guests: row.show_staff_read_status_to_guests,
            read_receipt_style: row.read_receipt_style,
            delivery_status_icons: row.delivery_status_icons,
            session_recovery_enabled: row.session_recovery_enabled,
            session_recovery_minutes: row.session_recovery_minutes,
            auto_ticket_creation: row.auto_ticket_creation
          };

          // Set cache headers for performance
          const headers = new Headers();
          headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
          
          resolve(new NextResponse(JSON.stringify(publicSettings), { headers }));
        }
      );
    });
  } catch (error) {
    console.error('Widget settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}