import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

/**
 * Reconnect to Previous Chat Session API
 * 
 * Searches for previous sessions within a time window based on guest name/email
 * and restores the session if found.
 */
export async function POST(request: NextRequest) {
  try {
    const { guestName, guestEmail, searchWindowHours = 2 } = await request.json();

    // Validate input
    if (!guestName || !guestEmail) {
      return NextResponse.json(
        { success: false, error: 'Guest name and email are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching for session to reconnect - Name: ${guestName}, Email: ${guestEmail}, Window: ${searchWindowHours}h`);

    const db = new Database.Database(dbPath);

    // Search for recent sessions matching guest info
    const searchResult = await new Promise<any>((resolve, reject) => {
      const timeWindowMs = searchWindowHours * 60 * 60 * 1000;
      const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();

      const sql = `
        SELECT 
          session_id,
          visitor_name,
          visitor_email,
          status,
          assigned_to,
          created_at,
          ended_at,
          queue_position,
          priority_level,
          staff_disconnect_count,
          previously_assigned_to
        FROM public_chat_sessions 
        WHERE 
          LOWER(visitor_name) = LOWER(?) AND 
          LOWER(visitor_email) = LOWER(?) AND
          created_at > ? AND
          status IN ('waiting', 'active', 'staff_disconnected', 'abandoned')
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      db.get(sql, [guestName, guestEmail, cutoffTime], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });

    if (!searchResult) {
      console.log('❌ No recoverable session found');
      db.close();
      return NextResponse.json({
        success: false,
        message: 'No recent session found with the provided name and email'
      });
    }

    console.log(`✅ Found recoverable session: ${searchResult.session_id} (Status: ${searchResult.status})`);

    // Get message history for the session
    const messages = await new Promise<any[]>((resolve, reject) => {
      const sql = `
        SELECT 
          sender_type,
          message,
          created_at,
          message_type
        FROM public_chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC
      `;

      db.all(sql, [searchResult.session_id], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows || []);
      });
    });

    // Update session status to active and reset disconnect info
    await new Promise<void>((resolve, reject) => {
      const sql = `
        UPDATE public_chat_sessions 
        SET 
          status = 'waiting',
          staff_disconnect_count = COALESCE(staff_disconnect_count, 0),
          recovery_attempts = COALESCE(recovery_attempts, 0) + 1,
          last_recovered_at = CURRENT_TIMESTAMP,
          queue_position = CASE 
            WHEN status = 'abandoned' THEN 1  -- Priority boost for abandoned sessions
            WHEN status = 'staff_disconnected' THEN 2  -- High priority for staff disconnects
            ELSE COALESCE(queue_position, 999)  -- Keep original position if possible
          END
        WHERE session_id = ?
      `;

      db.run(sql, [searchResult.session_id], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    // Add recovery message to chat history
    await new Promise<void>((resolve, reject) => {
      const sql = `
        INSERT INTO public_chat_messages (session_id, sender_type, message, message_type, created_at)
        VALUES (?, 'system', ?, 'info', CURRENT_TIMESTAMP)
      `;

      const recoveryMessage = `Session reconnected after ${Math.round((Date.now() - new Date(searchResult.created_at).getTime()) / (1000 * 60))} minutes`;

      db.run(sql, [searchResult.session_id, recoveryMessage], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    db.close();

    // Format messages for frontend
    const formattedMessages = messages.map((msg, index) => ({
      id: index,
      sender: msg.sender_type === 'guest' ? 'guest' as const :
              msg.sender_type === 'agent' ? 'agent' as const :
              'system' as const,
      text: msg.message,
      timestamp: new Date(msg.created_at),
      type: msg.message_type || 'text'
    }));

    // Prepare session data
    const sessionData = {
      id: searchResult.session_id,
      status: 'waiting', // Updated status
      queue_position: searchResult.status === 'abandoned' ? 1 :
                     searchResult.status === 'staff_disconnected' ? 2 :
                     searchResult.queue_position,
      assigned_agent_name: searchResult.assigned_to,
      priority_level: searchResult.priority_level || 'normal',
      recovery_count: (searchResult.recovery_attempts || 0) + 1
    };

    console.log(`🔄 Session ${searchResult.session_id} restored with ${formattedMessages.length} messages`);

    return NextResponse.json({
      success: true,
      session: sessionData,
      messages: formattedMessages,
      recoveredFrom: searchResult.status,
      recoveredAfterMinutes: Math.round((Date.now() - new Date(searchResult.created_at).getTime()) / (1000 * 60))
    });

  } catch (error) {
    console.error('❌ Error in session reconnection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during session recovery' },
      { status: 500 }
    );
  }
}