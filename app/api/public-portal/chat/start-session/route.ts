/**
 * Public Portal Chat Session Start API
 * POST - Start a new public chat session
 */

import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    console.log('🔍 Start session request body:', JSON.stringify(requestBody, null, 2));

    // Handle both direct format and nested guest_info format for backwards compatibility
    let name, email, phone, department, customFields, initialMessage;
    
    if (requestBody.guest_info) {
      // New nested format from PublicChatWidget
      const { guest_info, initial_message } = requestBody;
      name = guest_info.name;
      email = guest_info.email;
      phone = guest_info.phone;
      department = guest_info.department;
      initialMessage = initial_message;
      customFields = requestBody.customFields;
    } else {
      // Legacy direct format
      ({ name, email, phone, department, customFields } = requestBody);
      initialMessage = requestBody.initialMessage || requestBody.initial_message;
    }

    console.log('📝 Extracted data:', { name, email, phone, department, initialMessage });

    // Basic validation
    if (!name || !email) {
      console.log('❌ Validation failed: name or email missing');
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Email validation failed:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if chat is enabled
    const settingsResult = await dbGet(
      'SELECT enabled FROM public_chat_settings WHERE id = 1'
    ) as { enabled: number } | undefined;

    if (!settingsResult || !settingsResult.enabled) {
      return NextResponse.json(
        { 
          error: 'Chat is currently disabled',
          message: 'Please submit a ticket instead' 
        },
        { status: 503 }
      );
    }

    // Generate session ID
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const recoveryToken = `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    // Create session in database
    await dbRun(
      `INSERT INTO public_chat_sessions 
       (session_id, guest_name, guest_email, guest_phone, department, 
        custom_fields, recovery_token, start_time, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'initializing')`,
      [
        sessionId,
        name,
        email,
        phone || null,
        department || null,
        JSON.stringify(customFields || {}),
        recoveryToken
      ]
    );

    // Check current queue status
    const queueResult = await dbGet(
      `SELECT COUNT(*) as count FROM public_chat_sessions 
       WHERE status IN ('waiting', 'active') 
       AND date(start_time) = date('now')`
    ) as { count: number };

    const queuePosition = queueResult.count + 1;
    const estimatedWaitTime = queuePosition * 2; // 2 minutes per person estimate

    // Check for available agents
    const availableAgentsResult = await dbGet(
      `SELECT COUNT(*) as count FROM public_queue_status 
       WHERE work_mode IN ('available', 'auto') 
       AND is_online = 1`
    ) as { count: number };

    const hasAvailableAgents = availableAgentsResult.count > 0;

    return NextResponse.json({
      success: true,
      sessionId,
      recoveryToken,
      queuePosition,
      estimatedWaitTime,
      hasAvailableAgents,
      message: hasAvailableAgents 
        ? 'Connecting you to an agent...' 
        : 'All agents are currently busy. You are in queue.'
    });

  } catch (error) {
    console.error('Error starting chat session:', error);
    return NextResponse.json(
      { error: 'Failed to start chat session' },
      { status: 500 }
    );
  }
}

// GET - Get session status (for recovery)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const recoveryToken = searchParams.get('token');

    if (!sessionId || !recoveryToken) {
      return NextResponse.json(
        { error: 'Session ID and recovery token are required' },
        { status: 400 }
      );
    }

    // Verify session exists and token matches
    const sessionResult = await dbGet(
      `SELECT * FROM public_chat_sessions 
       WHERE session_id = ? AND recovery_token = ?`,
      [sessionId, recoveryToken]
    ) as any;

    if (!sessionResult) {
      return NextResponse.json(
        { error: 'Invalid session or recovery token' },
        { status: 404 }
      );
    }

    // Get queue position if still waiting
    let queuePosition = 0;
    if (sessionResult.status === 'waiting') {
      const positionResult = await dbGet(
        `SELECT COUNT(*) as position FROM public_chat_sessions 
         WHERE status = 'waiting' 
         AND start_time < (SELECT start_time FROM public_chat_sessions WHERE session_id = ?)`,
        [sessionId]
      ) as { position: number };
      
      queuePosition = positionResult.position + 1;
    }

    // Get assigned agent info if active
    let agentInfo = null;
    if (sessionResult.assigned_agent_id) {
      const agentResult = await dbGet(
        `SELECT u.username, u.display_name, u.profile_picture 
         FROM users u 
         WHERE u.username = ?`,
        [sessionResult.assigned_agent_id]
      ) as any;
      
      agentInfo = agentResult;
    }

    // Get message history
    const messages = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM public_chat_messages 
         WHERE session_id = ? 
         ORDER BY created_at ASC 
         LIMIT 100`,
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    return NextResponse.json({
      success: true,
      session: {
        ...sessionResult,
        queuePosition,
        agentInfo,
        messages
      }
    });

  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}