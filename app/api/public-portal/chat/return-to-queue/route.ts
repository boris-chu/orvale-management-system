import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Returning guest session ${sessionId} to queue`);

    // Check if session exists and is currently active or assigned
    const session = await dbGet(
      `SELECT session_id, status, assigned_to, visitor_name 
       FROM public_chat_sessions 
       WHERE session_id = ? AND status IN ('active', 'waiting')`,
      [sessionId]
    ) as any;

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or not eligible to return to queue' },
        { status: 404 }
      );
    }

    // Return session to waiting status, but preserve assignment info
    // We'll store the previous assignment in a new field for badge display
    await dbRun(
      `UPDATE public_chat_sessions 
       SET status = 'waiting',
           previously_assigned_to = assigned_to,
           assigned_to = NULL,
           queue_position = NULL
       WHERE session_id = ?`,
      [sessionId]
    );

    console.log(`✅ Session ${sessionId} returned to queue (previously handled by: ${session.assigned_to || 'none'})`);

    return NextResponse.json({
      success: true,
      message: `${session.visitor_name || 'Guest'} returned to queue`,
      sessionId,
      previouslyAssignedTo: session.assigned_to
    });

  } catch (error) {
    console.error('Error returning session to queue:', error);
    return NextResponse.json(
      { error: 'Failed to return session to queue' },
      { status: 500 }
    );
  }
}