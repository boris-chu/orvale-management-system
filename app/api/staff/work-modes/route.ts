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
        SELECT 
          swm.*,
          swms.work_mode_descriptions,
          swms.auto_assignment_enabled,
          swms.ready_mode_auto_accept,
          swms.work_mode_auto_accept,
          swms.ticketing_mode_auto_accept
        FROM staff_work_modes swm
        CROSS JOIN staff_work_mode_settings swms
        WHERE swm.username = ?
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
              user_id, username, work_mode, auto_accept_chats
            ) VALUES (?, ?, 'away', 0)
          `, [authResult.user.id, authResult.user.username], function(insertErr) {
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
              user_id: authResult.user.id,
              username: authResult.user.username,
              work_mode: 'away',
              status_message: '',
              auto_accept_chats: 0,
              max_concurrent_chats: 3,
              work_mode_descriptions: JSON.stringify({
                ready: "Available for new chats",
                work_mode: "Focused work - manual chat accept", 
                ticketing_mode: "Ticket work - no new chats",
                away: "Not available",
                break: "On break - return soon"
              }),
              auto_assignment_enabled: true,
              ready_mode_auto_accept: true,
              work_mode_auto_accept: false,
              ticketing_mode_auto_accept: false
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
    const { work_mode, status_message, auto_accept_chats, max_concurrent_chats } = data;

    // Validate work mode
    const validModes = ['ready', 'work_mode', 'ticketing_mode', 'away', 'break'];
    if (work_mode && !validModes.includes(work_mode)) {
      return NextResponse.json({ error: 'Invalid work mode' }, { status: 400 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // First get current mode for history tracking
      db.get(
        'SELECT work_mode FROM staff_work_modes WHERE username = ?',
        [authResult.user.username],
        (err, currentRow) => {
          const oldMode = currentRow?.work_mode || 'away';

          // Update or create work mode
          db.run(`
            INSERT OR REPLACE INTO staff_work_modes (
              user_id, username, work_mode, status_message, 
              auto_accept_chats, max_concurrent_chats, 
              last_activity, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            authResult.user.id,
            authResult.user.username,
            work_mode || 'away',
            status_message || '',
            auto_accept_chats !== undefined ? auto_accept_chats : 1,
            max_concurrent_chats || 3
          ], function(updateErr) {
            if (updateErr) {
              db.close();
              console.error('Error updating work mode:', updateErr);
              resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
              return;
            }

            // Log mode change to history if mode changed
            if (work_mode && work_mode !== oldMode) {
              db.run(`
                INSERT INTO staff_work_mode_history (
                  username, old_mode, new_mode, changed_at
                ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
              `, [authResult.user.username, oldMode, work_mode], (historyErr) => {
                // Don't fail if history logging fails, just log error
                if (historyErr) {
                  console.error('Error logging work mode history:', historyErr);
                }
                db.close();
                resolve(NextResponse.json({ 
                  success: true, 
                  message: 'Work mode updated successfully',
                  work_mode: work_mode || oldMode
                }));
              });
            } else {
              db.close();
              resolve(NextResponse.json({ 
                success: true, 
                message: 'Work mode settings updated successfully'
              }));
            }
          });
        }
      );
    });
  } catch (error) {
    console.error('Work mode update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}