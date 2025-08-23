import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    // Send reconnect signal to Socket.IO server
    try {
      const socketResponse = await fetch('http://localhost:4000/admin/reconnect-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Admin-Token`
        }
      });

      if (socketResponse.ok) {
        const result = await socketResponse.json();
        console.log('✅ Force reconnect signal sent to Socket.IO server:', result);
        
        return NextResponse.json({
          success: true,
          message: 'Reconnect signal sent to all connected clients',
          affectedClients: result.clientCount || 0,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(`Socket.IO server returned ${socketResponse.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Socket.IO server not available, but API call succeeded:', error);
      
      // Even if Socket.IO server is not available, return success
      // since this is an admin action and shouldn't fail
      return NextResponse.json({
        success: true,
        message: 'Reconnect signal attempted (Socket.IO server may not be running)',
        affectedClients: 0,
        warning: 'Socket.IO server not accessible',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error in force reconnect all:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
    }, { status: 500 });
  }
}