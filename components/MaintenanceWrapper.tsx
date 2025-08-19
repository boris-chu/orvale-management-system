'use client';

import { useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import MaintenancePage from './MaintenancePage';

interface MaintenanceStatus {
  isSystemMaintenance: boolean;
  isPortalMaintenance: boolean;
  effectiveMode: 'system' | 'portal' | 'none';
  effectiveConfig: any;
}

// Client-side function to check if maintenance should be shown
function shouldShowMaintenance(
  pathname: string, 
  status: MaintenanceStatus,
  userPermissions: string[] | null | undefined
): boolean {
  // If user has override permission, never show maintenance
  if (userPermissions && userPermissions.includes('admin.maintenance_override')) {
    return false;
  }

  // System maintenance affects everything except admin routes
  if (status.isSystemMaintenance) {
    return !pathname.startsWith('/admin') && !pathname.startsWith('/developer');
  }

  // Portal maintenance only affects public-facing pages
  if (status.isPortalMaintenance) {
    return pathname === '/' || pathname.startsWith('/public-portal');
  }

  return false;
}

interface MaintenanceWrapperProps {
  children: ReactNode;
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    checkMaintenanceStatusOnMount();
  }, []);

  const checkMaintenanceStatusOnMount = async () => {
    try {
      // Check maintenance status
      const response = await fetch('/api/maintenance/status');
      const status: MaintenanceStatus & { userHasOverride: boolean } = await response.json();
      
      setMaintenanceStatus(status);

      // Get user permissions if authenticated
      try {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          const user = JSON.parse(currentUser);
          setUserPermissions(user.permissions || []);
        }
      } catch (error) {
        // User not authenticated or invalid data
        setUserPermissions(null);
      }

    } catch (error) {
      console.error('Failed to check maintenance status:', error);
      // If we can't check maintenance status, assume no maintenance
      setMaintenanceStatus({
        isSystemMaintenance: false,
        isPortalMaintenance: false,
        effectiveMode: 'none',
        effectiveConfig: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if we should show maintenance page
  if (maintenanceStatus && shouldShowMaintenance(pathname, maintenanceStatus, userPermissions)) {
    return <MaintenancePage config={maintenanceStatus.effectiveConfig || undefined} />;
  }

  // Normal content
  return <>{children}</>;
}