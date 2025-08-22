import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

interface TicketComment {
  id: number;
  ticket_id: number;
  comment_text: string;
  commented_by: string;
  commented_by_name: string;
  created_at: string;
  updated_at: string;
  is_internal: boolean;
}

/**
 * GET /api/tickets/[id]/comments
 * Get all comments for a ticket
 */
export async function GET(
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

    // Check if user has permission to view ticket comments
    if (!authResult.user.permissions?.includes('ticket.view') && 
        !authResult.user.permissions?.includes('ticket.view_all') &&
        !authResult.user.permissions?.includes('ticket.view_own') &&
        !authResult.user.permissions?.includes('ticket.view_team')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view comments' },
        { status: 403 }
      );
    }

    // Get ticket comments
    const comments = await queryAsync(`
      SELECT 
        tc.id,
        tc.ticket_id,
        tc.comment_text,
        tc.commented_by,
        tc.commented_by_name,
        tc.created_at,
        tc.updated_at,
        tc.is_internal
      FROM ticket_comments tc
      WHERE tc.ticket_id = ?
      ORDER BY tc.created_at ASC
    `, [ticketId]) as TicketComment[];

    return NextResponse.json({
      success: true,
      comments
    });

  } catch (error) {
    console.error('Error fetching ticket comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets/[id]/comments
 * Add a new comment to a ticket
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

    // Check if user has permission to add comments
    if (!authResult.user.permissions?.includes('ticket.comment_own') && 
        !authResult.user.permissions?.includes('ticket.edit') &&
        !authResult.user.permissions?.includes('ticket.view')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add comments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { comment_text } = body;

    if (!comment_text || comment_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    // Check if ticket exists
    const ticket = await queryAsync(
      'SELECT id FROM user_tickets WHERE id = ?',
      [ticketId]
    );

    if (!ticket || (ticket as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Insert comment
    const result = await runAsync(`
      INSERT INTO ticket_comments (
        ticket_id,
        comment_text,
        commented_by,
        commented_by_name,
        is_internal
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      ticketId,
      comment_text.trim(),
      authResult.user.username,
      authResult.user.display_name || authResult.user.username,
      1 // All comments are internal for now
    ]);

    // Get the newly created comment
    const newComment = await queryAsync(`
      SELECT 
        id,
        ticket_id,
        comment_text,
        commented_by,
        commented_by_name,
        created_at,
        updated_at,
        is_internal
      FROM ticket_comments 
      WHERE id = ?
    `, [(result as any).lastID]) as TicketComment[];

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      comment: newComment[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding ticket comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}