import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'orvale_tickets.db');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('public_portal.manage_queue') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Optional: Check if user has real-time permission
    const hasRealTimePermission = authResult.user.permissions?.includes('public_portal.view_realtime_queue') ||
                                 authResult.user.permissions?.includes('admin.system_settings');

    if (!hasRealTimePermission) {
      return NextResponse.json({ 
        success: true, 
        staff: [], 
        message: 'Real-time queue viewing disabled for this user' 
      });
    }

    const db = new Database(dbPath, { readonly: true });

    try {
      // Get active staff members with their work modes and online presence
      const staff = db.prepare(`
        SELECT DISTINCT
          u.user_id,
          u.username,
          u.display_name,
          u.department,
          u.role,
          u.profile_picture,
          swm.work_mode,
          swm.status_message,
          swm.max_concurrent_chats,
          swm.auto_accept_chats,
          up.status as presence_status,
          up.last_seen
        FROM users u
        INNER JOIN staff_work_modes swm ON u.username = swm.username
        LEFT JOIN user_presence up ON u.username = up.username
        WHERE u.active = 1
          AND swm.work_mode IS NOT NULL
          AND swm.work_mode != 'offline'
        ORDER BY 
          CASE swm.work_mode 
            WHEN 'ready' THEN 1 
            WHEN 'work_mode' THEN 2 
            WHEN 'helping' THEN 3
            WHEN 'ticketing_mode' THEN 4
            WHEN 'away' THEN 5 
            ELSE 6 
          END,
          u.display_name
      `).all();

      // Get active chat counts for each staff member
      const activeChatCounts = db.prepare(`
        SELECT 
          assigned_staff,
          COUNT(*) as active_chats
        FROM public_chat_sessions 
        WHERE status = 'active' 
          AND assigned_staff IS NOT NULL
        GROUP BY assigned_staff
      `).all();

      // Create lookup for active chat counts
      const chatCountLookup: { [key: string]: number } = {};
      activeChatCounts.forEach((count: any) => {
        chatCountLookup[count.assigned_staff] = count.active_chats;
      });

      // Transform data for frontend
      const staffMembers = staff.map((member: any) => ({
        user_id: member.user_id,
        username: member.username,
        display_name: member.display_name || member.username,
        department: member.department || 'Support',
        role: member.role,
        profile_picture: member.profile_picture,
        work_mode: member.work_mode,
        status_message: member.status_message,
        max_concurrent_chats: member.max_concurrent_chats || 3,
        auto_accept_chats: member.auto_accept_chats || 0,
        presence_status: member.presence_status || 'offline',
        last_seen: member.last_seen,
        active_chats: chatCountLookup[member.username] || 0,
        // Calculate if staff is available for new chats
        available: member.work_mode === 'ready' && 
                  (chatCountLookup[member.username] || 0) < (member.max_concurrent_chats || 3)
      }));

      return NextResponse.json({
        success: true,
        staff: staffMembers,
        count: staffMembers.length,
        realTimeEnabled: hasRealTimePermission,
        availableStaff: staffMembers.filter(s => s.available).length
      });

    } finally {
      db.close();
    }

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