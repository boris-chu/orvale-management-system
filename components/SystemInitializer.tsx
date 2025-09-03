/**
 * System Initializer Component
 * Triggers background service initialization when the app loads
 */

'use client';

import { useEffect } from 'react';
import apiClient from '@/lib/api-client';

export default function SystemInitializer() {
  useEffect(() => {
    // Initialize system services
    const initializeSystem = async () => {
      try {
        console.log('🔄 Initializing Orvale Management System...');
        
        const result = await apiClient.systemInit();

        if (result.success) {
          console.log('✅ System initialized:', result.message);
        } else {
          console.warn('⚠️ System initialization warning:', result.message);
        }
      } catch (error) {
        console.error('❌ System initialization failed:', error);
      }
    };

    // Initialize with a small delay to ensure app is ready
    const timer = setTimeout(initializeSystem, 1000);
    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything visible
  return null;
}