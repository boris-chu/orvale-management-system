import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

interface StaffMember {
  username: string;
  display_name: string;
  current_mode: string;
  auto_assign_enabled: number;
  max_concurrent_chats: number;
  accept_vip_chats: number;
  accept_escalated_chats: number;
  preferred_departments: string;
  active_chats: number;
  last_activity: string;
  presence_status: string;
}

interface ChatSession {
  id: number;
  session_id: string;
  visitor_name: string;
  visitor_email: string;
  session_data: string;
  priority?: 'normal' | 'high' | 'urgent' | 'vip';
  department?: string;
  is_escalated?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, priority = 'normal', department = null, isEscalated = false } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const db = new Database.Database(dbPath);
    const dbGet = promisify(db.get.bind(db));
    const dbAll = promisify(db.all.bind(db));
    const dbRun = promisify(db.run.bind(db));

    return new Promise((resolve) => {
      const runAutoAssignment = async () => {
        try {
          console.log(`🎯 Auto-assignment request for session ${sessionId} (${priority}, ${department || 'any dept'}, escalated: ${isEscalated})`);

          // Get the chat session details
          const chatSession = await dbGet(`
            SELECT * FROM public_chat_sessions 
            WHERE session_id = ? AND status = 'waiting'
          `, [sessionId]) as ChatSession | undefined;

          if (!chatSession) {
            db.close();
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Chat session not found or not available for assignment' 
            }, { status: 404 }));
            return;
          }

          // Parse session data for department preference
          let sessionData: any = {};
          try {
            sessionData = JSON.parse(chatSession.session_data || '{}');
          } catch (e) {
            console.log('Could not parse session data:', e);
          }

          const chatDepartment = department || sessionData.department || 'General Support';

          // Find available staff members
          const availableStaff = await dbAll(`
            SELECT 
              swm.username,
              u.display_name,
              swm.current_mode,
              swm.auto_assign_enabled,
              swm.max_concurrent_chats,
              swm.accept_vip_chats,
              swm.accept_escalated_chats,
              swm.preferred_departments,
              swm.last_activity,
              up.status as presence_status,
              COUNT(pcs.id) as active_chats
            FROM staff_work_modes swm
            INNER JOIN users u ON swm.username = u.username
            LEFT JOIN user_presence up ON u.username = up.user_id
            LEFT JOIN public_chat_sessions pcs ON pcs.assigned_to = swm.username AND pcs.status = 'active'
            WHERE u.active = 1
              AND swm.current_mode IN ('ready', 'work_mode')
              AND swm.auto_assign_enabled = 1
              AND (up.status IN ('online', 'away') OR up.status IS NULL)
            GROUP BY swm.username, u.display_name, swm.current_mode, swm.auto_assign_enabled,
                     swm.max_concurrent_chats, swm.accept_vip_chats, swm.accept_escalated_chats,
                     swm.preferred_departments, swm.last_activity, up.status
            HAVING active_chats < swm.max_concurrent_chats
            ORDER BY 
              CASE swm.current_mode WHEN 'ready' THEN 1 WHEN 'work_mode' THEN 2 ELSE 3 END,
              active_chats ASC,
              swm.last_activity ASC
          `, []) as StaffMember[];

          console.log(`📋 Found ${availableStaff.length} available staff members`);

          if (availableStaff.length === 0) {
            db.close();
            resolve(NextResponse.json({
              success: false,
              error: 'No staff members available for auto-assignment',
              message: 'All agents are currently busy. You will be assigned to the next available agent.'
            }));
            return;
          }

          // Select the best available staff member (simplified selection)
          const selectedStaff = availableStaff[0]; // Take the first (best) available staff

          // Assign the chat session to the selected staff member
          const result = await dbRun(`
            UPDATE public_chat_sessions 
            SET assigned_to = ?, status = 'active'
            WHERE session_id = ?
          `, [selectedStaff.username, sessionId]);

          if (!result || (result as any).changes === 0) {
            db.close();
            resolve(NextResponse.json({ 
              success: false, 
              error: 'Failed to assign chat session' 
            }, { status: 500 }));
            return;
          }

          // Update staff last activity
          await dbRun(`
            UPDATE staff_work_modes 
            SET last_activity = datetime('now')
            WHERE username = ?
          `, [selectedStaff.username]);

          console.log(`🎉 Assigned session ${sessionId} to ${selectedStaff.display_name} (${selectedStaff.username})`);

          db.close();
          resolve(NextResponse.json({
            success: true,
            assignedTo: {
              username: selectedStaff.username,
              displayName: selectedStaff.display_name,
              mode: selectedStaff.current_mode
            },
            message: `Connected to ${selectedStaff.display_name}`,
            assignmentTime: new Date().toISOString()
          }));

        } catch (error) {
          console.error('Auto-assignment error:', error);
          db.close();
          resolve(NextResponse.json(
            { 
              success: false, 
              error: 'Auto-assignment failed',
              message: 'Unable to assign agent automatically. You will remain in queue.'
            },
            { status: 500 }
          ));
        }
      };

      runAutoAssignment();
    });

  } catch (error) {
    console.error('Auto-assignment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Auto-assignment failed',
        message: 'Unable to assign agent automatically. You will remain in queue.'
      },
      { status: 500 }
    );
  }
}

