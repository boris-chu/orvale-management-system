import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    const hasAdminAccess = authResult.user.permissions?.includes('admin.system_settings') ||
                          authResult.user.permissions?.includes('chat.admin_access');
    
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check Socket.io server status from backend
    const socketUrl = process.env.SOCKET_URL || 'http://localhost:4000';
    
    try {
      console.log('🔍 API: Checking Socket.IO server at:', socketUrl);
      
      const response = await fetch(`${socketUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ API: Socket.IO server is healthy:', data);
        
        return NextResponse.json({
          isRunning: true,
          connectedClients: data.connectedUsers || 0,
          uptime: data.uptime || 0,
          status: data.status,
          lastCheck: new Date().toISOString(),
          serverResponse: data
        });
      } else {
        console.log('❌ API: Socket.IO server returned:', response.status, response.statusText);
        return NextResponse.json({
          isRunning: false,
          connectedClients: 0,
          uptime: 0,
          status: 'offline',
          lastCheck: new Date().toISOString(),
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      console.error('❌ API: Socket.IO server check failed:', error);
      return NextResponse.json({
        isRunning: false,
        connectedClients: 0,
        uptime: 0,
        status: 'offline',
        lastCheck: new Date().toISOString(),
        error: error.message
      });
    }

  } catch (error) {
    console.error('❌ Socket status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}