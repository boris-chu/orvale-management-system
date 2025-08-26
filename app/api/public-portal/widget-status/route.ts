import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Check if public chat widget is enabled (public endpoint, no auth required)
export async function GET(request: NextRequest) {
  try {
    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      db.get(`
        SELECT 
          enabled,
          business_hours_enabled,
          timezone,
          schedule_json,
          widget_shape,
          widget_color,
          widget_size,
          widget_position,
          widget_text,
          widget_animation,
          animation_duration,
          animation_delay,
          welcome_message,
          offline_message,
          business_hours_message
        FROM public_portal_widget_settings 
        WHERE id = 1
      `, (err, row) => {
        db.close();
        
        if (err) {
          console.error('Widget status query error:', err);
          resolve(NextResponse.json({ 
            enabled: false,
            error: 'Database error' 
          }, { status: 500 }));
          return;
        }

        if (!row) {
          // Default to disabled if no settings exist
          resolve(NextResponse.json({ 
            enabled: false,
            message: 'Widget not configured'
          }));
          return;
        }

        // Check if chat is enabled
        if (!row.enabled) {
          resolve(NextResponse.json({
            enabled: false,
            message: 'Live chat is currently disabled by administrators'
          }));
          return;
        }

        // Check business hours if enabled
        if (row.business_hours_enabled) {
          const now = new Date();
          const schedule = row.schedule_json ? JSON.parse(row.schedule_json) : {};
          const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
          const daySchedule = schedule[dayOfWeek];

          if (!daySchedule || !daySchedule.enabled) {
            resolve(NextResponse.json({
              enabled: false,
              outsideBusinessHours: true,
              message: row.business_hours_message || 'Live chat is currently outside business hours',
              schedule: schedule
            }));
            return;
          }

          // Check if current time is within business hours
          const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
          if (currentTime < daySchedule.open || currentTime > daySchedule.close) {
            resolve(NextResponse.json({
              enabled: false,
              outsideBusinessHours: true,
              message: row.business_hours_message || 'Live chat is currently outside business hours',
              schedule: schedule,
              nextAvailable: `${daySchedule.open} - ${daySchedule.close}`
            }));
            return;
          }
        }

        // Chat is enabled and within business hours
        resolve(NextResponse.json({
          enabled: true,
          widget: {
            shape: row.widget_shape || 'circle',
            color: row.widget_color || '#1976d2',
            size: row.widget_size || 'medium',
            position: row.widget_position || 'bottom-right',
            text: row.widget_text || 'Chat with us',
            animation: row.widget_animation || 'pulse',
            animationDuration: row.animation_duration || 2000,
            animationDelay: row.animation_delay || 5000
          },
          messages: {
            welcome: row.welcome_message || 'Hi! How can we help you today?',
            offline: row.offline_message || 'We are currently offline. Please submit a ticket.'
          }
        }));
      });
    });
  } catch (error) {
    console.error('Widget status check error:', error);
    return NextResponse.json({ 
      enabled: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}