import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

/**
 * POST /api/tickets/[id]/comments/read
 * Mark all comments for a ticket as read by the current user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission to view comments
    if (!authResult.user.permissions?.includes('ticket.view') && 
        !authResult.user.permissions?.includes('ticket.view_all') &&
        !authResult.user.permissions?.includes('ticket.view_own') &&
        !authResult.user.permissions?.includes('ticket.view_team')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view comments' },
        { status: 403 }
      );
    }

    // Get all comments for the ticket that the user hasn't read yet
    const unreadComments = await queryAsync(`
      SELECT tc.id 
      FROM ticket_comments tc
      LEFT JOIN comment_read_status crs ON tc.id = crs.comment_id 
        AND crs.user_id = ?
      WHERE tc.ticket_id = ? 
        AND crs.id IS NULL
    `, [authResult.user.username, ticketId]);

    if (!unreadComments || (unreadComments as any[]).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unread comments to mark',
        marked_count: 0
      });
    }

    // Mark all unread comments as read
    const commentIds = (unreadComments as any[]).map(c => c.id);
    
    // Insert read status for each unread comment
    for (const commentId of commentIds) {
      await runAsync(`
        INSERT OR IGNORE INTO comment_read_status (comment_id, user_id)
        VALUES (?, ?)
      `, [commentId, authResult.user.username]);
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${commentIds.length} comments as read`,
      marked_count: commentIds.length
    });

  } catch (error) {
    console.error('Error marking comments as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark comments as read' },
      { status: 500 }
    );
  }
}