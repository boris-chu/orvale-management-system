import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin role bypass or specific permissions
    console.log('🔍 Guest Queue API - Permission Debug:');
    console.log('  User:', authResult.user.username);
    console.log('  Role:', authResult.user.role);
    console.log('  Permissions Count:', authResult.user.permissions?.length || 0);
    
    // Admin role has all permissions automatically
    if (authResult.user.role === 'admin') {
      console.log('✅ Admin role - bypassing permission check');
    } else {
      // Check specific permissions for non-admin users
      const hasManageQueue = authResult.user.permissions?.includes('public_portal.manage_queue');
      const hasSystemSettings = authResult.user.permissions?.includes('admin.system_settings');
      
      console.log('  Has manage_queue:', hasManageQueue);
      console.log('  Has system_settings:', hasSystemSettings);
      
      if (!hasManageQueue && !hasSystemSettings) {
        console.log('❌ Permission denied - missing required permissions');
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }
    
    console.log('✅ Permission check passed');

    // Check if user has real-time permission - Admin bypass
    let hasRealTimePermission = false;
    if (authResult.user.role === 'admin') {
      hasRealTimePermission = true;
      console.log('✅ Admin role - has all real-time permissions');
    } else {
      hasRealTimePermission = authResult.user.permissions?.includes('public_portal.view_realtime_queue') ||
                             authResult.user.permissions?.includes('admin.system_settings');
    }

    if (!hasRealTimePermission) {
      return NextResponse.json({ 
        success: true, 
        guests: [], 
        message: 'Real-time queue viewing disabled for this user' 
      });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // Get active guest chat sessions from database
      db.all(
        `SELECT 
          pcs.id,
          pcs.session_id,
          pcs.visitor_name,
          pcs.visitor_email,
          pcs.session_data,
          pcs.status,
          pcs.assigned_to,
          pcs.queue_position,
          pcs.created_at,
          pcs.ended_at,
          
          -- Get the initial message from session data or first chat message
          COALESCE(
            json_extract(pcs.session_data, '$.initial_message'),
            (SELECT pcm.message_text 
             FROM public_chat_messages pcm 
             WHERE pcm.session_id = pcs.session_id 
               AND pcm.sender_type = 'guest'
             ORDER BY pcm.created_at ASC 
             LIMIT 1)
          ) as initial_message,
          
          -- Get department from session data
          json_extract(pcs.session_data, '$.department') as department,
          
          -- Calculate priority based on wait time and session data
          CASE 
            WHEN json_extract(pcs.session_data, '$.priority') = 'urgent' THEN 'urgent'
            WHEN json_extract(pcs.session_data, '$.priority') = 'high' THEN 'high'
            WHEN json_extract(pcs.session_data, '$.vip') = 1 THEN 'vip'
            WHEN (julianday('now') - julianday(pcs.created_at)) * 24 * 60 > 15 THEN 'high'
            ELSE 'normal'
          END as priority,
          
          -- Calculate wait time in seconds
          CAST((julianday('now') - julianday(pcs.created_at)) * 24 * 60 * 60 AS INTEGER) as wait_time_seconds,
          
          -- Get assigned staff info if any
          u.display_name as assigned_staff_name,
          u.profile_picture as assigned_staff_avatar
          
        FROM public_chat_sessions pcs
        LEFT JOIN users u ON pcs.assigned_to = u.username
        WHERE pcs.status IN ('waiting', 'active')
        ORDER BY 
          CASE pcs.status
            WHEN 'active' THEN 1
            WHEN 'waiting' THEN 2
            ELSE 3
          END,
          CASE 
            WHEN json_extract(pcs.session_data, '$.priority') = 'urgent' THEN 1
            WHEN json_extract(pcs.session_data, '$.priority') = 'high' THEN 2
            WHEN json_extract(pcs.session_data, '$.vip') = 1 THEN 3
            ELSE 4
          END,
          pcs.created_at ASC`,
        (err, rows) => {
          db.close();
          
          if (err) {
            console.error('Queue guests database error:', err.message);
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Database error: ' + err.message,
              guests: [] 
            }, { status: 500 }));
            return;
          }

          // Transform the data for frontend consumption
          const guests = (rows || []).map((row: any) => {
            // Parse session data if it exists
            let sessionData = {};
            try {
              if (row.session_data) {
                sessionData = JSON.parse(row.session_data);
              }
            } catch (e) {
              console.warn('Failed to parse session data for session:', row.session_id);
            }

            return {
              id: row.session_id,
              session_id: row.session_id,
              guest_name: row.visitor_name || sessionData.name || `Guest #${row.session_id.slice(-3)}`,
              guest_email: row.visitor_email || sessionData.email,
              guest_phone: sessionData.phone || null,
              department: row.department || sessionData.department || 'General Support',
              initial_message: row.initial_message || sessionData.message || '',
              
              status: row.status,
              priority: row.priority,
              wait_time_seconds: row.wait_time_seconds,
              queue_position: row.queue_position,
              
              created_at: row.created_at,
              joined_at: row.created_at, // Alias for compatibility
              ended_at: row.ended_at,
              
              // Assignment info
              assigned_to: row.assigned_to,
              assigned_staff_name: row.assigned_staff_name,
              assigned_staff_avatar: row.assigned_staff_avatar,
              
              // Additional metadata
              browser_info: sessionData.browser_info || null,
              pre_chat_answers: sessionData.pre_chat_answers || null,
              
              // Computed fields for UI
              wait_time: Math.floor(row.wait_time_seconds), // Alias for compatibility
              wait_time_formatted: formatWaitTime(row.wait_time_seconds),
              priority_emoji: getPriorityEmoji(row.priority, row.status),
              status_label: getStatusLabel(row.status)
            };
          });

          resolve(NextResponse.json({
            success: true,
            guests,
            total_guests: guests.length,
            count: guests.length, // Alias for compatibility
            waiting_count: guests.filter(g => g.status === 'waiting').length,
            active_count: guests.filter(g => g.status === 'active').length,
            has_urgent: guests.some(g => g.priority === 'urgent'),
            longest_wait_seconds: guests.length > 0 ? Math.max(...guests.map(g => g.wait_time_seconds)) : 0,
            realTimeEnabled: hasRealTimePermission,
            generated_at: new Date().toISOString()
          }));
        }
      );
    });

  } catch (error) {
    console.error('Error fetching guest queue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch guest queue',
        guests: []
      },
      { status: 500 }
    );
  }
}

// Helper functions
function formatWaitTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getPriorityEmoji(priority: string, status: string): string {
  if (status === 'abandoned') return '❌';
  if (status === 'ended') return '✅';
  
  switch (priority) {
    case 'urgent': return '🔥';
    case 'high': return '⚡';
    case 'vip': return '👑';
    default: return '⏳';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'waiting': return 'Waiting';
    case 'active': return 'Active Chat';
    case 'ended': return 'Ended';
    case 'abandoned': return 'Abandoned';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
}