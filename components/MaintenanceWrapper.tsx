'use client';

import { useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import MaintenancePage from './MaintenancePage';
import { checkMaintenanceStatus, shouldShowMaintenance } from '@/lib/maintenance';
import type { MaintenanceStatus } from '@/lib/maintenance';

interface MaintenanceWrapperProps {
  children: ReactNode;
}

export default function MaintenanceWrapper({ children }: MaintenanceWrapperProps) {
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
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
        setUserPermissions([]);
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