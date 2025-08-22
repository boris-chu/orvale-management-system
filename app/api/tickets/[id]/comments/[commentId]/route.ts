import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

/**
 * DELETE /api/tickets/[id]/comments/[commentId]
 * Delete a specific comment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;
    const commentId = resolvedParams.commentId;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the comment to check ownership
    const comment = await queryAsync(`
      SELECT commented_by, ticket_id
      FROM ticket_comments 
      WHERE id = ? AND ticket_id = ?
    `, [commentId, ticketId]);

    if (!comment || (comment as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const commentData = (comment as any[])[0];
    const isOwner = commentData.commented_by === authResult.user.username;

    // Check permissions
    const canDeleteOwn = authResult.user.permissions?.includes('ticket.comment_delete_own');
    const canDeleteAny = authResult.user.permissions?.includes('ticket.comment_delete_any');

    if (!canDeleteOwn && !canDeleteAny) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete comments' },
        { status: 403 }
      );
    }

    // If user can only delete own comments, check ownership
    if (!canDeleteAny && !isOwner) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment
    await runAsync(
      'DELETE FROM ticket_comments WHERE id = ? AND ticket_id = ?',
      [commentId, ticketId]
    );

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}