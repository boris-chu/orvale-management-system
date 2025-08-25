/**
 * Application Startup Services
 * Initializes background services when the Next.js app starts
 */

import { backupScheduler } from './backup-scheduler';
import { systemLogger } from './logger';

let isInitialized = false;

/**
 * Initialize all background services
 * Called when the Next.js app starts
 */
export function initializeAppServices() {
  if (isInitialized) {
    console.log('📋 App services already initialized');
    return;
  }

  console.log('🚀 Initializing Orvale Management System services...');

  try {
    // Initialize backup scheduler in production mode
    if (process.env.NODE_ENV === 'production') {
      console.log('📦 Starting automatic backup scheduler (production mode)');
      
      // Start with 30-second delay to allow app to fully initialize
      setTimeout(() => {
        backupScheduler.start();
        systemLogger.configUpdated('app_services_started', 'system');
      }, 30000);
    } else {
      console.log('🔧 Backup scheduler disabled in development mode');
      console.log('   Use /developer/settings to create manual backups');
    }

    // Future: Initialize other background services here
    // - Socket.io server
    // - Email service
    // - File cleanup tasks
    // - Health monitoring

    isInitialized = true;
    console.log('✅ App services initialization completed');

  } catch (error) {
    console.error('❌ Failed to initialize app services:', error);
    systemLogger.error('app_startup_failed', { error: error.message });
  }
}

/**
 * Shutdown all background services
 * Called when the app is shutting down
 */
export function shutdownAppServices() {
  if (!isInitialized) {
    return;
  }

  console.log('🛑 Shutting down app services...');

  try {
    // Stop backup scheduler
    backupScheduler.stop();
    
    // Future: Stop other services here

    isInitialized = false;
    console.log('✅ App services shutdown completed');

  } catch (error) {
    console.error('❌ Error during service shutdown:', error);
  }
}