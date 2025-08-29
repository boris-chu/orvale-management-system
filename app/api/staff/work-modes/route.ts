import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch current user's work mode
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // Get user's current work mode, creating default if doesn't exist
      db.get(`
        SELECT * FROM staff_work_modes WHERE username = ?
      `, [authResult.user.username], (err, row) => {
        if (err) {
          db.close();
          console.error('Database error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        if (!row) {
          // Create default work mode for user
          db.run(`
            INSERT INTO staff_work_modes (
              username, current_mode, auto_assign_enabled
            ) VALUES (?, 'offline', 1)
          `, [authResult.user.username], function(insertErr) {
            if (insertErr) {
              db.close();
              console.error('Error creating default work mode:', insertErr);
              resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
              return;
            }

            // Return default values
            db.close();
            resolve(NextResponse.json({
              id: this.lastID,
              username: authResult.user.username,
              current_mode: 'offline',
              auto_assign_enabled: true,
              max_concurrent_chats: 3,
              accept_vip_chats: true,
              accept_escalated_chats: true,
              preferred_departments: '[]',
              auto_offline_after_minutes: 30,
              work_mode_timeout_enabled: true
            }));
          });
        } else {
          db.close();
          resolve(NextResponse.json(row));
        }
      });
    });
  } catch (error) {
    console.error('Work mode fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user's work mode
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { current_mode, auto_assign_enabled, max_concurrent_chats, accept_vip_chats, accept_escalated_chats } = data;

    // Validate work mode
    const validModes = ['ready', 'work_mode', 'ticketing_mode', 'offline'];
    if (current_mode && !validModes.includes(current_mode)) {
      return NextResponse.json({ error: 'Invalid work mode' }, { status: 400 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // First get current mode for history tracking
      db.get(
        'SELECT current_mode FROM staff_work_modes WHERE username = ?',
        [authResult.user.username],
        (err, currentRow: any) => {
          const oldMode = currentRow?.current_mode || 'offline';

          // Update or create work mode
          db.run(`
            INSERT OR REPLACE INTO staff_work_modes (
              username, current_mode, auto_assign_enabled, 
              max_concurrent_chats, accept_vip_chats, accept_escalated_chats,
              last_activity, updated_at, mode_changed_at, mode_changed_by
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
          `, [
            authResult.user.username,
            current_mode || 'offline',
            auto_assign_enabled !== undefined ? auto_assign_enabled : true,
            max_concurrent_chats || 3,
            accept_vip_chats !== undefined ? accept_vip_chats : true,
            accept_escalated_chats !== undefined ? accept_escalated_chats : true,
            authResult.user.username
          ], function(updateErr) {
            if (updateErr) {
              db.close();
              console.error('Error updating work mode:', updateErr);
              resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
              return;
            }

            // No history logging for now - just respond with success
            db.close();
            resolve(NextResponse.json({ 
              success: true, 
              message: 'Work mode updated successfully',
              current_mode: current_mode || oldMode
            }));
          });
        }
      );
    });
  } catch (error) {
    console.error('Work mode update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}