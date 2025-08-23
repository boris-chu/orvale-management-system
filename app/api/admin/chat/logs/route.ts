import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings') ||
                              authResult.user.role === 'admin';
    
    if (!hasChatAdminAccess) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: `User ${authResult.user.username} needs chat.admin_access permission`
      }, { status: 403 });
    }

    // Try to get logs from Socket.IO server first
    let logs: string[] = [];
    
    try {
      const socketResponse = await fetch('http://localhost:4000/admin/logs', {
        headers: {
          'Authorization': `Admin-Token`
        }
      });

      if (socketResponse.ok) {
        const result = await socketResponse.json();
        logs = result.logs || [];
        console.log(`✅ Retrieved ${logs.length} log entries from Socket.IO server`);
      } else {
        throw new Error(`Socket.IO server returned ${socketResponse.status}`);
      }
    } catch (socketError) {
      console.warn('⚠️ Socket.IO server logs not available, trying local log files:', socketError);
      
      // Fallback: Try to read local log files
      try {
        const logPaths = [
          '/tmp/socket-server-debug.log',
          './socket-server.log',
          './logs/socket-server.log'
        ];
        
        for (const logPath of logPaths) {
          try {
            if (fs.existsSync(logPath)) {
              const logContent = fs.readFileSync(logPath, 'utf8');
              logs = logContent.split('\n')
                .filter(line => line.trim().length > 0)
                .slice(-100) // Last 100 lines
                .map(line => {
                  // Format log lines to be more readable
                  if (line.includes('→')) {
                    return line.split('→')[1]?.trim() || line;
                  }
                  return line;
                });
              console.log(`✅ Retrieved ${logs.length} log entries from ${logPath}`);
              break;
            }
          } catch (fileError) {
            console.log(`Could not read log file ${logPath}:`, fileError);
          }
        }
      } catch (fileSystemError) {
        console.error('❌ Could not read local log files:', fileSystemError);
      }
    }

    // If no logs found, provide some helpful information
    if (logs.length === 0) {
      logs = [
        '📝 No Socket.IO server logs available',
        '💡 Logs will appear here when the Socket.IO server is running',
        '🚀 Start the server with: npm run socket-server',
        '📊 Socket.IO events and connections will be logged automatically',
        '',
        '🔧 Debug information:',
        `⏰ Timestamp: ${new Date().toISOString()}`,
        `👤 Requested by: ${authResult.user.username}`,
        `🌐 Socket URL: http://localhost:4000`,
        ''
      ];
    }

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString(),
      source: logs.length > 10 ? 'socket-server' : 'fallback'
    });

  } catch (error) {
    console.error('❌ Error fetching server logs:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}