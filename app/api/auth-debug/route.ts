/**
 * Diagnostic endpoint to check authentication status and permissions
 * Temporary debugging tool - remove after issue resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 AUTH DEBUG: Starting authentication check...');
    
    // Check what headers we received
    const authHeader = request.headers.get('authorization');
    const cookies = request.headers.get('cookie');
    
    console.log('🔍 AUTH DEBUG: Headers received:', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : null,
      hasCookies: !!cookies,
      cookiePreview: cookies ? cookies.substring(0, 100) + '...' : null
    });
    
    // Check authentication
    const authResult = await verifyAuth(request);
    console.log('🔍 AUTH DEBUG: Auth result:', authResult.success);
    
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: authResult.error,
        timestamp: new Date().toISOString()
      });
    }
    
    const user = authResult.user;
    console.log('🔍 AUTH DEBUG: User found:', user?.username, 'Role:', user?.role);
    
    // Check for the specific permission
    const hasManageQueuePermission = user?.permissions?.includes('public_portal.manage_queue');
    const hasAdminPermission = user?.permissions?.includes('admin.system_settings');
    
    const diagnostics = {
      success: true,
      user: {
        username: user?.username,
        display_name: user?.display_name,
        role: user?.role,
        team_id: user?.team_id
      },
      permissions: {
        total_count: user?.permissions?.length || 0,
        has_manage_queue: hasManageQueuePermission,
        has_admin_settings: hasAdminPermission,
        first_10_permissions: user?.permissions?.slice(0, 10) || [],
        contains_public_portal: user?.permissions?.filter(p => p.includes('public_portal')) || []
      },
      auth_headers: {
        has_authorization: !!request.headers.get('authorization'),
        has_cookie: !!request.headers.get('cookie'),
        user_agent: request.headers.get('user-agent')?.slice(0, 100)
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 AUTH DEBUG: Diagnostics complete:', {
      username: diagnostics.user.username,
      permissionCount: diagnostics.permissions.total_count,
      hasTargetPermission: diagnostics.permissions.has_manage_queue
    });
    
    return NextResponse.json(diagnostics);
    
  } catch (error) {
    console.error('❌ AUTH DEBUG: Error during diagnostics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}