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
        guests: [], 
        message: 'Real-time queue viewing disabled for this user' 
      });
    }

    const db = new Database(dbPath, { readonly: true });

    try {
      // Get active guest chat sessions from database
      const guests = db.prepare(`
        SELECT 
          ps.session_id,
          ps.guest_name,
          ps.guest_email,
          ps.guest_phone,
          ps.department,
          ps.priority,
          ps.status,
          ps.initial_message,
          ps.created_at,
          ps.assigned_staff
        FROM public_chat_sessions ps
        WHERE ps.status IN ('waiting', 'active')
        ORDER BY ps.created_at ASC
      `).all();

      // Transform data for frontend
      const guestSessions = guests.map((guest: any) => ({
        session_id: guest.session_id,
        guest_name: guest.guest_name || `Guest #${guest.session_id.slice(-3)}`,
        guest_email: guest.guest_email,
        guest_phone: guest.guest_phone,
        department: guest.department || 'General Support',
        priority: guest.priority || 'normal',
        status: guest.status,
        initial_message: guest.initial_message || '',
        created_at: guest.created_at,
        assigned_staff: guest.assigned_staff,
        wait_time: Math.floor((Date.now() - new Date(guest.created_at).getTime()) / 1000)
      }));

      return NextResponse.json({
        success: true,
        guests: guestSessions,
        count: guestSessions.length,
        realTimeEnabled: hasRealTimePermission
      });

    } finally {
      db.close();
    }

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