import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync } from '@/lib/database';

/**
 * GET /api/tickets/unread-counts
 * Get unread comment counts for all tickets that the user can see
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to view tickets
    if (!authResult.user.permissions?.includes('ticket.view') && 
        !authResult.user.permissions?.includes('ticket.view_all') &&
        !authResult.user.permissions?.includes('ticket.view_own') &&
        !authResult.user.permissions?.includes('ticket.view_team')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view tickets' },
        { status: 403 }
      );
    }

    // Get unread comment counts per ticket for current user
    const unreadCounts = await queryAsync(`
      SELECT 
        ut.id as ticket_id,
        ut.submission_id,
        COUNT(tc.id) as unread_count
      FROM user_tickets ut
      JOIN ticket_comments tc ON ut.id = tc.ticket_id
      LEFT JOIN comment_read_status crs ON tc.id = crs.comment_id 
        AND crs.user_id = ?
      WHERE crs.id IS NULL
      GROUP BY ut.id, ut.submission_id
    `, [authResult.user.username]);

    // Convert to object mapping ticket_id -> unread_count
    const unreadMap: { [key: string]: number } = {};
    (unreadCounts as any[]).forEach(row => {
      unreadMap[row.ticket_id] = row.unread_count;
    });

    return NextResponse.json({
      success: true,
      unread_counts: unreadMap
    });

  } catch (error) {
    console.error('Error fetching unread comment counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    );
  }
}