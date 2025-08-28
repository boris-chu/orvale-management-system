/**
 * Public Portal Chat Messages API
 * GET - Retrieve messages for a session
 * POST - Send a message (HTTP fallback if Socket.io fails)
 */

import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// GET - Retrieve messages for a session
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const afterId = searchParams.get('afterId'); // For pagination
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Build query based on parameters
    let query = `
      SELECT 
        m.*,
        CASE 
          WHEN m.sender_type = 'agent' THEN u.display_name
          ELSE s.guest_name
        END as sender_name,
        CASE 
          WHEN m.sender_type = 'agent' THEN u.profile_picture
          ELSE null
        END as sender_avatar
      FROM public_chat_messages m
      LEFT JOIN public_chat_sessions s ON m.session_id = s.session_id
      LEFT JOIN users u ON m.sender_type = 'agent' AND m.sender_id = u.username
      WHERE m.session_id = ?
    `;

    const params: any[] = [sessionId];

    if (afterId) {
      query += ` AND m.created_at > (SELECT created_at FROM public_chat_messages WHERE message_id = ?)`;
      params.push(afterId);
    }

    query += ` ORDER BY m.created_at ASC LIMIT ?`;
    params.push(limit);

    const messages = await dbAll(query, params) as any[];

    // Get read receipts for the messages
    const messageIds = messages.map(m => m.message_id);
    let readReceipts: any[] = [];
    
    if (messageIds.length > 0) {
      readReceipts = await dbAll(
        `SELECT message_id, read_by_guest, read_by_agent, 
                guest_read_at, agent_read_at 
         FROM public_read_receipts 
         WHERE message_id IN (${messageIds.map(() => '?').join(',')})`,
        messageIds
      ) as any[];
    }

    // Merge read receipts with messages
    const messagesWithReceipts = messages.map(msg => {
      const receipt = readReceipts.find(r => r.message_id === msg.message_id);
      return {
        ...msg,
        readStatus: {
          readByGuest: receipt?.read_by_guest || false,
          readByAgent: receipt?.read_by_agent || false,
          guestReadAt: receipt?.guest_read_at,
          agentReadAt: receipt?.agent_read_at
        }
      };
    });

    return NextResponse.json({
      success: true,
      messages: messagesWithReceipts,
      hasMore: messages.length === limit
    });

  } catch (error) {
    console.error('Error retrieving messages:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve messages' },
      { status: 500 }
    );
  }
}

// POST - Send a message (HTTP fallback)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId, message, type = 'text', metadata = {} } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    // Verify session exists and is active
    const sessionResult = await dbGet(
      `SELECT * FROM public_chat_sessions WHERE session_id = ?`,
      [sessionId]
    ) as any;

    if (!sessionResult) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 404 }
      );
    }

    if (!['waiting', 'active'].includes(sessionResult.status)) {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 403 }
      );
    }

    // Generate message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save message to database
    await dbRun(
      `INSERT INTO public_chat_messages 
       (message_id, session_id, sender_type, sender_id, message_text, 
        message_type, metadata, created_at, is_read) 
       VALUES (?, ?, 'guest', ?, ?, ?, ?, datetime('now'), 0)`,
      [
        messageId,
        sessionId,
        sessionId, // Guest ID is same as session ID
        message,
        type,
        JSON.stringify(metadata)
      ]
    );

    // Create initial read receipt
    await dbRun(
      `INSERT INTO public_read_receipts 
       (message_id, session_id, read_by_guest, guest_read_at) 
       VALUES (?, ?, 1, datetime('now'))`,
      [messageId, sessionId]
    );

    // Note: In production, this should also emit a Socket.io event
    // to notify the agent in real-time. This is just the HTTP fallback.

    return NextResponse.json({
      success: true,
      messageId,
      timestamp: new Date().toISOString(),
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// DELETE - End chat session
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Update session status
    await dbRun(
      `UPDATE public_chat_sessions 
       SET status = 'ended', end_time = datetime('now') 
       WHERE session_id = ?`,
      [sessionId]
    );

    // Log session end event
    await dbRun(
      `INSERT INTO public_chat_messages 
       (message_id, session_id, sender_type, sender_id, message_text, 
        message_type, created_at) 
       VALUES (?, ?, 'system', 'system', 'Chat session ended', 'event', datetime('now'))`,
      [
        `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Chat session ended'
    });

  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}