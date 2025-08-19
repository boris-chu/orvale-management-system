import { NextRequest, NextResponse } from 'next/server';
import { checkMaintenanceStatus, hasMaintenanceOverride } from '@/lib/maintenance';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get maintenance status
    const status = await checkMaintenanceStatus();
    
    // Debug logging
    console.log('🔍 Maintenance API Debug:', {
      isSystemMaintenance: status.isSystemMaintenance,
      isPortalMaintenance: status.isPortalMaintenance,
      effectiveMode: status.effectiveMode,
      hasSystemConfig: !!status.systemConfig,
      hasPortalConfig: !!status.portalConfig
    });

    // Check if user has override permission
    let hasOverride = false;
    try {
      const authResult = await verifyAuth(request);
      if (authResult.success && authResult.user?.permissions) {
        hasOverride = hasMaintenanceOverride(authResult.user.permissions);
      }
    } catch (error) {
      // Auth check failed, user is not authenticated
      hasOverride = false;
    }

    // Include override status in response
    return NextResponse.json({
      ...status,
      userHasOverride: hasOverride
    });

  } catch (error) {
    console.error('Error checking maintenance status:', error);
    
    // Return safe defaults
    return NextResponse.json({
      isSystemMaintenance: false,
      isPortalMaintenance: false,
      effectiveMode: 'none',
      effectiveConfig: null,
      userHasOverride: false
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint is for admin override check
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasOverride = hasMaintenanceOverride(authResult.user.permissions || []);
    
    return NextResponse.json({
      hasOverride,
      username: authResult.user.username
    });

  } catch (error) {
    console.error('Error checking maintenance override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}