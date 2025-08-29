import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import path from 'path';

// Initialize database connection
const db = new sqlite3.Database(path.join(process.cwd(), 'orvale_tickets.db'));

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.error('Authentication failed:', authResult.error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Auth successful for user:', authResult.user.username, 'role:', authResult.user.role);
    console.log('User permissions:', authResult.user.permissions);

    // Check if user has permission to manage public portal queue
    // Admin role should have all permissions
    const hasPermission = authResult.user.role === 'admin' || 
                         authResult.user.permissions?.includes('public_portal.manage_queue') || 
                         authResult.user.permissions?.includes('admin.system_settings');

    console.log('Has permission check:', hasPermission);
    console.log('Role check (admin):', authResult.user.role === 'admin');
    console.log('Checking permissions:', authResult.user.permissions?.includes('public_portal.manage_queue'), authResult.user.permissions?.includes('admin.system_settings'));

    if (!hasPermission) {
      console.error('Permission denied for user:', authResult.user.username, 'with permissions:', authResult.user.permissions);
      return NextResponse.json({ 
        error: 'Insufficient permissions to remove sessions from queue' 
      }, { status: 403 });
    }

    const { sessionId, reason } = await request.json();

    console.log('🗑️ Attempting to remove session ID:', sessionId, 'Reason:', reason);

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // First check if session exists in database
    const sessionExists = await new Promise<any>((resolve) => {
      db.get(
        'SELECT session_id, visitor_name, status FROM public_chat_sessions WHERE session_id = ?',
        [sessionId],
        (err, row) => {
          if (err) {
            console.error('Error checking session:', err);
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    });

    console.log('🔍 Session lookup result:', sessionExists);

    if (!sessionExists) {
      return NextResponse.json({ 
        error: 'Session not found in database' 
      }, { status: 404 });
    }

    if (!['waiting', 'active'].includes(sessionExists.status)) {
      return NextResponse.json({ 
        error: `Session is in '${sessionExists.status}' state and cannot be removed` 
      }, { status: 400 });
    }

    // Remove session from queue by marking as abandoned
    const result = await new Promise<boolean>((resolve) => {
      db.run(
        `UPDATE public_chat_sessions 
         SET status = 'abandoned', 
             ended_at = datetime('now')
         WHERE session_id = ? AND status IN ('waiting', 'active')`,
        [sessionId],
        function(err) {
          if (err) {
            console.error('Error removing session from queue:', err);
            resolve(false);
          } else {
            console.log('🗑️ Database update result - changes:', this.changes);
            resolve(this.changes > 0);
          }
        }
      );
    });

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Session removed from queue successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Session not found or already processed' 
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error removing session from queue:', error);
    return NextResponse.json(
      { error: 'Failed to remove session from queue' },
      { status: 500 }
    );
  }
}