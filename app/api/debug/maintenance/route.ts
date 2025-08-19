import { NextRequest, NextResponse } from 'next/server';
import { checkMaintenanceStatus, shouldShowMaintenance } from '@/lib/maintenance';

export async function GET(request: NextRequest) {
  try {
    // Get the pathname from query params
    const { searchParams } = new URL(request.url);
    const pathname = searchParams.get('pathname') || '/';
    
    // Get maintenance status
    const status = await checkMaintenanceStatus();
    
    // Test different permission scenarios
    const scenarios = [
      {
        name: 'No permissions (logged out)',
        permissions: null,
        shouldShow: shouldShowMaintenance(pathname, status, null)
      },
      {
        name: 'Empty permissions array',
        permissions: [],
        shouldShow: shouldShowMaintenance(pathname, status, [])
      },
      {
        name: 'Basic user permissions',
        permissions: ['tickets.view', 'tickets.create'],
        shouldShow: shouldShowMaintenance(pathname, status, ['tickets.view', 'tickets.create'])
      },
      {
        name: 'Admin with maintenance override',
        permissions: ['admin.maintenance_override', 'tickets.view'],
        shouldShow: shouldShowMaintenance(pathname, status, ['admin.maintenance_override', 'tickets.view'])
      }
    ];

    return NextResponse.json({
      pathname,
      maintenanceStatus: status,
      scenarios,
      debug: {
        isSystemMaintenance: status.isSystemMaintenance,
        isPortalMaintenance: status.isPortalMaintenance,
        effectiveMode: status.effectiveMode,
        effectiveConfig: !!status.effectiveConfig
      }
    });

  } catch (error) {
    console.error('Debug maintenance error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error.message },
      { status: 500 }
    );
  }
}