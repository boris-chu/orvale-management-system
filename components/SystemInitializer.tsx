/**
 * System Initializer Component
 * Triggers background service initialization when the app loads
 */

'use client';

import { useEffect } from 'react';

export default function SystemInitializer() {
  useEffect(() => {
    // Initialize system services
    const initializeSystem = async () => {
      try {
        console.log('🔄 Initializing Orvale Management System...');
        
        const response = await fetch('/api/system/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ System initialized:', result.message);
        } else {
          const error = await response.json();
          console.warn('⚠️ System initialization warning:', error.error);
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