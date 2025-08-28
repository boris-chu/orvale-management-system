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
      'SELECT enabled FROM public_portal_widget_settings WHERE id = 1'
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
    const sessionData = JSON.stringify({
      phone: phone || null,
      department: department || null,
      initialMessage,
      customFields: customFields || {}
    });

    await dbRun(
      `INSERT INTO public_chat_sessions 
       (session_id, visitor_name, visitor_email, session_data, recovery_token, 
        recovery_expires_at, status) 
       VALUES (?, ?, ?, ?, ?, datetime('now', '+1 hour'), 'waiting')`,
      [
        sessionId,
        name,
        email,
        sessionData,
        recoveryToken
      ]
    );

    // Check current queue status
    const queueResult = await dbGet(
      `SELECT COUNT(*) as count FROM public_chat_sessions 
       WHERE status IN ('waiting', 'active') 
       AND date(created_at) = date('now')`
    ) as { count: number };

    const queuePosition = queueResult.count + 1;
    const estimatedWaitTime = queuePosition * 2; // 2 minutes per person estimate

    // Check for available agents
    const availableAgentsResult = await dbGet(
      `SELECT COUNT(*) as count FROM staff_work_modes swm
       INNER JOIN users u ON swm.username = u.username
       WHERE swm.current_mode IN ('ready', 'work_mode') 
       AND u.active = 1`
    ) as { count: number };

    const hasAvailableAgents = availableAgentsResult.count > 0;

    // Attempt auto-assignment if agents are available
    let assignmentResult = null;
    if (hasAvailableAgents) {
      try {
        console.log(`🎯 Attempting auto-assignment for session ${sessionId}`);
        
        const autoAssignResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:80'}/api/public-portal/chat/auto-assign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            priority: 'normal', // Could be enhanced to use actual priority from session data
            department: department || null,
            isEscalated: false
          })
        });

        if (autoAssignResponse.ok) {
          assignmentResult = await autoAssignResponse.json();
          console.log(`✅ Auto-assignment result:`, assignmentResult.success ? 'Success' : 'No assignment');
        } else {
          console.log(`⚠️ Auto-assignment failed with status: ${autoAssignResponse.status}`);
        }
      } catch (error) {
        console.error('Auto-assignment error:', error);
      }
    }

    // Return response based on assignment result
    if (assignmentResult?.success) {
      return NextResponse.json({
        success: true,
        sessionId,
        recoveryToken,
        queuePosition: 0, // Assigned immediately
        estimatedWaitTime: 0,
        hasAvailableAgents: true,
        assigned: true,
        assignedAgent: assignmentResult.assignedTo,
        message: assignmentResult.message || 'Connected to an agent!'
      });
    } else {
      return NextResponse.json({
        success: true,
        sessionId,
        recoveryToken,
        queuePosition,
        estimatedWaitTime,
        hasAvailableAgents,
        assigned: false,
        message: assignmentResult?.message || (hasAvailableAgents 
          ? 'All agents are currently busy. You are in queue.' 
          : 'All agents are currently offline. You are in queue.')
      });
    }

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