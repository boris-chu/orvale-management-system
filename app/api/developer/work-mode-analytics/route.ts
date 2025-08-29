import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch work mode analytics data
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has developer/analytics permissions
    if (!authResult.user.permissions?.includes('developer.view_analytics') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // Get current work mode distribution
      db.all(`
        SELECT 
          swm.work_mode,
          COUNT(*) as count,
          CASE swm.work_mode
            WHEN 'ready' THEN '#4ade80'
            WHEN 'work_mode' THEN '#fbbf24'
            WHEN 'ticketing_mode' THEN '#60a5fa'
            WHEN 'away' THEN '#f87171'
            WHEN 'break' THEN '#a78bfa'
            ELSE '#6b7280'
          END as color
        FROM staff_work_modes swm
        JOIN users u ON swm.username = u.username
        WHERE u.active = 1
        GROUP BY swm.work_mode
        ORDER BY count DESC
      `, (err, modeDistribution) => {
        if (err) {
          db.close();
          console.error('Work mode distribution query error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        // Get staff work mode details with active chat counts
        db.all(`
          SELECT 
            swm.username,
            u.display_name,
            swm.work_mode,
            swm.status_message,
            swm.last_activity,
            swm.updated_at,
            CASE swm.work_mode
              WHEN 'ready' THEN '🟢'
              WHEN 'work_mode' THEN '🟡'
              WHEN 'ticketing_mode' THEN '🔵'
              WHEN 'away' THEN '🟠'
              WHEN 'break' THEN '⏸️'
              ELSE '⚫'
            END as mode_icon,
            CASE swm.work_mode
              WHEN 'ready' THEN '#4ade80'
              WHEN 'work_mode' THEN '#fbbf24'
              WHEN 'ticketing_mode' THEN '#60a5fa'
              WHEN 'away' THEN '#f87171'
              WHEN 'break' THEN '#a78bfa'
              ELSE '#6b7280'
            END as mode_color,
            -- Count active public chat sessions
            COALESCE(active_sessions.session_count, 0) as active_chats,
            -- Count daily mode changes
            COALESCE(daily_changes.change_count, 0) as daily_mode_changes,
            -- Calculate time in current mode
            CASE 
              WHEN swm.updated_at IS NOT NULL 
              THEN CAST((julianday('now') - julianday(swm.updated_at)) * 24 * 60 AS INTEGER) 
              ELSE 0 
            END as minutes_in_mode
          FROM staff_work_modes swm
          JOIN users u ON swm.username = u.username
          LEFT JOIN (
            SELECT staff_username, COUNT(*) as session_count
            FROM public_chat_sessions 
            WHERE status = 'active' 
            GROUP BY staff_username
          ) active_sessions ON swm.username = active_sessions.staff_username
          LEFT JOIN (
            SELECT username, COUNT(*) as change_count
            FROM staff_work_mode_history 
            WHERE DATE(changed_at) = DATE('now')
            GROUP BY username
          ) daily_changes ON swm.username = daily_changes.username
          WHERE u.active = 1
          ORDER BY u.display_name
        `, (err, staffDetails) => {
          if (err) {
            db.close();
            console.error('Staff details query error:', err);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          // Get work mode history for the last 24 hours
          db.all(`
            SELECT 
              strftime('%H:00', changed_at) as hour,
              new_mode,
              COUNT(*) as changes
            FROM staff_work_mode_history 
            WHERE changed_at >= datetime('now', '-24 hours')
            GROUP BY strftime('%H:00', changed_at), new_mode
            ORDER BY hour
          `, (err, modeHistory) => {
            db.close();
            
            if (err) {
              console.error('Mode history query error:', err);
              resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
              return;
            }

            // Process the data
            const distributionData = (modeDistribution || []).map((row: any) => ({
              name: row.work_mode.charAt(0).toUpperCase() + row.work_mode.slice(1).replace('_', ' '),
              count: row.count,
              color: row.color
            }));

            const staffData = (staffDetails || []).map((row: any) => {
              const timeInMode = row.minutes_in_mode > 60 
                ? `${Math.floor(row.minutes_in_mode / 60)}h ${row.minutes_in_mode % 60}m`
                : `${row.minutes_in_mode}m`;
              
              // Mock assignment rate calculation (in real implementation, this would be based on actual chat assignments)
              const assignmentRate = row.work_mode === 'ready' 
                ? Math.floor(Math.random() * 10) + 90 // 90-100%
                : row.work_mode === 'work_mode'
                ? Math.floor(Math.random() * 20) + 70 // 70-90%
                : 0; // Ticketing mode doesn't accept chats

              return {
                username: row.username,
                displayName: row.display_name || row.username,
                currentMode: row.work_mode.charAt(0).toUpperCase() + row.work_mode.slice(1).replace('_', ' '),
                modeIcon: row.mode_icon,
                modeColor: row.mode_color,
                timeInMode,
                activeChats: row.active_chats,
                dailyModeChanges: row.daily_mode_changes,
                assignmentRate
              };
            });

            // Process history data into hourly format
            const historyMap: { [key: string]: any } = {};
            (modeHistory || []).forEach((row: any) => {
              if (!historyMap[row.hour]) {
                historyMap[row.hour] = { 
                  hour: row.hour, 
                  ready: 0, 
                  work_mode: 0, 
                  ticketing_mode: 0, 
                  away: 0, 
                  break: 0 
                };
              }
              historyMap[row.hour][row.new_mode] = row.changes;
            });

            const historyData = Object.values(historyMap);

            resolve(NextResponse.json({
              distribution: distributionData,
              staffDetails: staffData,
              history: historyData,
              metrics: {
                totalStaff: staffData.length,
                readyStaff: distributionData.find(d => d.name === 'Ready')?.count || 0,
                avgAssignmentRate: staffData.reduce((sum, s) => sum + s.assignmentRate, 0) / staffData.length || 0,
                avgResponseTime: 2.3, // Mock data - would be calculated from actual chat logs
                avgQueueTime: 18 // Mock data - would be calculated from actual queue logs
              }
            }));
          });
        });
      });
    });
  } catch (error) {
    console.error('Work mode analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}