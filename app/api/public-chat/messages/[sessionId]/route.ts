import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import path from 'path';

// Initialize database connection
const db = new sqlite3.Database(path.join(process.cwd(), 'orvale_tickets.db'));

interface MessageRow {
  id: number;
  session_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string;
  message_text: string;
  message_type: string;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = params.sessionId;

    // Get messages for this session
    const messages = await new Promise<MessageRow[]>((resolve, reject) => {
      db.all(
        `SELECT id, session_id, sender_type, sender_id, sender_name, 
                message_text, message_type, created_at
         FROM public_chat_messages 
         WHERE session_id = ?
         ORDER BY created_at ASC`,
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as MessageRow[]);
        }
      );
    });

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: `msg_${msg.id}`,
      sender: msg.sender_type,
      message: msg.message_text,
      timestamp: msg.created_at,
      senderName: msg.sender_name,
      type: msg.message_type || 'text'
    }));

    return NextResponse.json({ messages: formattedMessages });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}