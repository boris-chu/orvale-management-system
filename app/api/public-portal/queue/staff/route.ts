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
    console.log('🔍 Staff Queue API - Permission Debug:');
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
        staff: [], 
        message: 'Real-time queue viewing disabled for this user' 
      });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      // Get active staff members with their work modes and online presence
      db.all(
        `SELECT DISTINCT
          u.id as user_id,
          u.username,
          u.display_name,
          u.team_id as department,
          u.role,
          u.profile_picture,
          swm.current_mode as work_mode,
          swm.max_concurrent_chats,
          swm.auto_assign_enabled as auto_accept_chats,
          swm.last_activity,
          up.status as presence_status,
          up.last_active as last_seen
        FROM users u
        INNER JOIN staff_work_modes swm ON u.username = swm.username
        LEFT JOIN user_presence up ON u.username = up.user_id
        WHERE u.active = 1
          AND swm.current_mode IS NOT NULL
          AND swm.current_mode != 'offline'
        ORDER BY 
          CASE swm.current_mode 
            WHEN 'ready' THEN 1 
            WHEN 'work_mode' THEN 2 
            WHEN 'ticketing_mode' THEN 3
            WHEN 'away' THEN 4
            ELSE 5 
          END,
          u.display_name`,
        (err, staffRows) => {
          if (err) {
            db.close();
            console.error('Staff queue database error:', err.message);
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Database error: ' + err.message,
              staff: [] 
            }, { status: 500 }));
            return;
          }

          // Get active chat counts for each staff member
          db.all(
            `SELECT 
              assigned_to as assigned_staff,
              COUNT(*) as active_chats
            FROM public_chat_sessions 
            WHERE status = 'active' 
              AND assigned_to IS NOT NULL
            GROUP BY assigned_to`,
            (err2, chatCountRows) => {
              db.close();
              
              if (err2) {
                console.error('Chat count database error:', err2.message);
                resolve(NextResponse.json({ 
                  success: false, 
                  error: 'Database error: ' + err2.message,
                  staff: [] 
                }, { status: 500 }));
                return;
              }

              // Create lookup for active chat counts
              const chatCountLookup: { [key: string]: number } = {};
              (chatCountRows || []).forEach((count: any) => {
                chatCountLookup[count.assigned_staff] = count.active_chats;
              });

              // Transform data for frontend
              const staffMembers = (staffRows || []).map((member: any) => {
                const activeChatCount = chatCountLookup[member.username] || 0;
                const maxChats = member.max_concurrent_chats || 3;
                const isAvailable = member.work_mode === 'ready' && activeChatCount < maxChats;

                return {
                  user_id: member.user_id,
                  username: member.username,
                  display_name: member.display_name || member.username,
                  department: member.department || member.team_id || 'Support',
                  role: member.role,
                  profile_picture: member.profile_picture,
                  work_mode: member.work_mode,
                  status_message: member.status_message || '',
                  max_concurrent_chats: maxChats,
                  auto_accept_chats: member.auto_accept_chats || 0,
                  presence_status: member.presence_status || 'offline',
                  last_seen: member.last_seen,
                  last_activity: member.last_activity,
                  active_chats: activeChatCount,
                  available: isAvailable,
                  
                  // Additional computed fields for UI
                  status_emoji: getWorkModeEmoji(member.work_mode),
                  availability_text: isAvailable ? 'Available' : 
                                   activeChatCount >= maxChats ? 'At Capacity' : 
                                   member.work_mode === 'away' ? 'Away' : 'Busy'
                };
              });

              resolve(NextResponse.json({
                success: true,
                staff: staffMembers,
                count: staffMembers.length,
                realTimeEnabled: hasRealTimePermission,
                availableStaff: staffMembers.filter(s => s.available).length,
                totalActiveChats: Object.values(chatCountLookup).reduce((sum, count) => sum + count, 0),
                generated_at: new Date().toISOString()
              }));
            }
          );
        }
      );
    });

  } catch (error) {
    console.error('Error fetching staff queue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch staff queue',
        staff: []
      },
      { status: 500 }
    );
  }
}

// Helper function
function getWorkModeEmoji(workMode: string): string {
  switch (workMode) {
    case 'ready': return '🟢';
    case 'work_mode': return '🟡';
    case 'ticketing_mode': return '🔵';
    case 'away': return '🟠';
    case 'offline': return '⚫';
    default: return '❓';
  }
}