import pino from 'pino';
import path from 'path';
import { queryAsync } from './database';

// Log levels mapping
const LOG_LEVELS = {
  'error': 'error',
  'warn': 'warn', 
  'info': 'info',
  'debug': 'debug'
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get log level and pino enabled status from database settings or environment
async function getLogSettings(): Promise<{ level: LogLevel; enabled: boolean }> {
  try {
    // Try to get settings from database
    const settings = await queryAsync(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?)',
      ['logLevel', 'pinoEnabled']
    );
    
    let level: LogLevel = 'info';
    let enabled = true; // Default enabled
    
    settings.forEach((row: any) => {
      try {
        const value = JSON.parse(row.setting_value);
        if (row.setting_key === 'logLevel' && value in LOG_LEVELS) {
          level = value as LogLevel;
        } else if (row.setting_key === 'pinoEnabled') {
          enabled = Boolean(value);
        }
      } catch (error) {
        // Invalid JSON, ignore
      }
    });
    
    return { level, enabled };
  } catch (error) {
    // Database might not be ready yet, fall back to environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    return {
      level: (envLevel in LOG_LEVELS) ? envLevel as LogLevel : 'info',
      enabled: process.env.PINO_ENABLED !== 'false'
    };
  }
}

// Create logger configuration
const createLoggerConfig = (level: LogLevel, enabled: boolean) => {
  // Always return minimal configuration to prevent worker thread issues
  // Pino is disabled across all environments due to Next.js compatibility issues
  return {
    level: enabled ? level : 'silent', // Respect level but disable if not enabled
    timestamp: false, // Disable timestamp to prevent worker thread spawning
    // No transport configuration to prevent any worker thread creation
  };
};

// Initialize logger with default settings
let currentLevel: LogLevel = 'info';
// Completely disable Pino to prevent worker thread issues across all environments
// Use console fallback logging which is more reliable in Next.js
let pinoEnabled = false;
let logger = pino(createLoggerConfig(currentLevel, pinoEnabled));

// Function to update logger settings dynamically
const updateLogLevel = async (): Promise<void> => {
  try {
    const { level: newLevel, enabled: newEnabled } = await getLogSettings();
    if (newLevel !== currentLevel || newEnabled !== pinoEnabled) {
      const oldLevel = currentLevel;
      const oldEnabled = pinoEnabled;
      
      currentLevel = newLevel;
      pinoEnabled = newEnabled;
      logger = pino(createLoggerConfig(newLevel, newEnabled));
      
      // Only log if logging is enabled
      if (newEnabled) {
        logger.info({ 
          event: 'logger_settings_changed', 
          old_level: oldLevel,
          new_level: newLevel,
          old_enabled: oldEnabled,
          new_enabled: newEnabled
        }, `Logger settings updated - Level: ${newLevel}, Enabled: ${newEnabled}`);
      }
    }
  } catch (error) {
    // Only log error if logging is enabled
    if (pinoEnabled) {
      logger.error({ error, event: 'logger_update_failed' }, 'Failed to update logger settings');
    }
  }
};

// Enhanced logger with context and structured logging
export const createContextLogger = (context: string) => {
  const safeLog = (level: string, logFn: Function, obj: any, msg?: string) => {
    if (!pinoEnabled) {
      // Use console logging when Pino is disabled
      console.log(`[${level.toUpperCase()}] ${context}:`, msg || '', obj);
      return;
    }
    try {
      logFn({ ...obj, context }, msg);
    } catch (error) {
      // Fallback to console logging if Pino fails
      console.log(`[${level.toUpperCase()}] ${context}:`, msg || '', obj);
    }
  };

  return {
    error: (obj: any, msg?: string) => safeLog('error', logger.error.bind(logger), obj, msg),
    warn: (obj: any, msg?: string) => safeLog('warn', logger.warn.bind(logger), obj, msg),
    info: (obj: any, msg?: string) => safeLog('info', logger.info.bind(logger), obj, msg),
    debug: (obj: any, msg?: string) => safeLog('debug', logger.debug.bind(logger), obj, msg),
    
    // Convenience methods for simple logging
    logError: (message: string, error?: any) => 
      safeLog('error', logger.error.bind(logger), { error, event: 'error' }, message),
    logInfo: (message: string, data?: any) => 
      safeLog('info', logger.info.bind(logger), { ...data, event: 'info' }, message),
    logDebug: (message: string, data?: any) => 
      safeLog('debug', logger.debug.bind(logger), { ...data, event: 'debug' }, message),
  };
};

// Ticket-specific logger with structured fields
export const ticketLogger = {
  created: (ticketId: string, submittedBy: string, team: string) =>
    pinoEnabled && logger.info({ 
      event: 'ticket_created', 
      ticket_id: ticketId, 
      submitted_by: submittedBy, 
      assigned_team: team 
    }, `Ticket created: ${ticketId}`),
    
  updated: (ticketId: string, updatedBy: string, changes: any) =>
    pinoEnabled && logger.info({ 
      event: 'ticket_updated', 
      ticket_id: ticketId, 
      updated_by: updatedBy, 
      changes 
    }, `Ticket updated: ${ticketId}`),
    
  assigned: (ticketId: string, assignedTo: string, assignedBy: string) =>
    pinoEnabled && logger.info({ 
      event: 'ticket_assigned', 
      ticket_id: ticketId, 
      assigned_to: assignedTo, 
      assigned_by: assignedBy 
    }, `Ticket assigned: ${ticketId} → ${assignedTo}`),
    
  escalated: (ticketId: string, escalatedBy: string, reason: string) =>
    pinoEnabled && logger.warn({ 
      event: 'ticket_escalated', 
      ticket_id: ticketId, 
      escalated_by: escalatedBy, 
      reason 
    }, `Ticket escalated: ${ticketId}`),
    
  completed: (ticketId: string, completedBy: string, notes?: string) =>
    pinoEnabled && logger.info({ 
      event: 'ticket_completed', 
      ticket_id: ticketId, 
      completed_by: completedBy, 
      notes 
    }, `Ticket completed: ${ticketId}`),
    
  deleted: (ticketId: string, deletedBy: string, reason?: string) =>
    pinoEnabled && logger.warn({ 
      event: 'ticket_deleted', 
      ticket_id: ticketId, 
      deleted_by: deletedBy, 
      reason 
    }, `Ticket deleted: ${ticketId}`),
    
  staffCreated: (ticketId: string, createdBy: string, onBehalfOf: string, team?: string, additionalContext?: any) =>
    pinoEnabled && logger.info({ 
      event: 'ticket_staff_created',
      ticket_id: ticketId, 
      created_by_staff: createdBy,
      on_behalf_of: onBehalfOf,
      assigned_team: team,
      ticket_source: 'staff_created',
      context: additionalContext
    }, `Staff ticket created: ${ticketId} by ${createdBy} for ${onBehalfOf}`),
};

// Authentication logger
export const authLogger = {
  login: (username: string, ip?: string, success: boolean = true) =>
    pinoEnabled && logger.info({ 
      event: 'user_login', 
      username, 
      ip_address: ip, 
      success 
    }, `Login ${success ? 'successful' : 'failed'}: ${username}`),
    
  logout: (username: string, ip?: string) =>
    pinoEnabled && logger.info({ 
      event: 'user_logout', 
      username, 
      ip_address: ip 
    }, `User logged out: ${username}`),
    
  tokenExpired: (username: string) =>
    pinoEnabled && logger.warn({ 
      event: 'token_expired', 
      username 
    }, `Token expired for user: ${username}`),
    
  permissionDenied: (username: string, action: string, resource?: string) =>
    pinoEnabled && logger.warn({ 
      event: 'permission_denied', 
      username, 
      action, 
      resource 
    }, `Permission denied: ${username} attempted ${action}`),
};

// System logger for general application events
export const systemLogger = {
  startup: (port?: number) =>
    pinoEnabled && logger.info({ 
      event: 'system_startup', 
      port, 
      node_env: process.env.NODE_ENV 
    }, 'System starting up'),
    
  shutdown: (reason?: string) =>
    pinoEnabled && logger.info({ 
      event: 'system_shutdown', 
      reason 
    }, 'System shutting down'),
    
  databaseConnected: () =>
    pinoEnabled && logger.info({ 
      event: 'database_connected' 
    }, 'Database connection established'),
    
  databaseError: (error: any) =>
    pinoEnabled && logger.error({ 
      event: 'database_error', 
      error 
    }, 'Database error occurred'),
    
  configUpdated: (setting: string, updatedBy: string) =>
    pinoEnabled && logger.info({ 
      event: 'config_updated', 
      setting, 
      updated_by: updatedBy 
    }, `System configuration updated: ${setting}`),
    
  info: (data: any, message: string) =>
    pinoEnabled && logger.info(data, message),
    
  warn: (data: any, message: string) =>
    pinoEnabled && logger.warn(data, message),
    
  error: (data: any, message: string) =>
    pinoEnabled && logger.error(data, message),
};

// API request logger
export const apiLogger = {
  request: (method: string, path: string, ip?: string, userId?: string) =>
    pinoEnabled && logger.debug({ 
      event: 'api_request', 
      method, 
      path, 
      ip_address: ip, 
      user_id: userId 
    }, `${method} ${path}`),
    
  response: (method: string, path: string, status: number, duration?: number) =>
    pinoEnabled && logger.debug({ 
      event: 'api_response', 
      method, 
      path, 
      status_code: status, 
      duration_ms: duration 
    }, `${method} ${path} → ${status}`),
    
  error: (method: string, path: string, error: any, userId?: string) =>
    pinoEnabled && logger.error({ 
      event: 'api_error', 
      method, 
      path, 
      error, 
      user_id: userId 
    }, `API error: ${method} ${path}`),
};

// Initialize logger on module load with database settings
// Note: Pino is disabled by default due to Next.js worker thread compatibility issues
// Database can override this, but console fallback is recommended for stability
getLogSettings().then(({ level, enabled }) => {
  currentLevel = level;
  // Only enable Pino if explicitly enabled in database AND not in a build environment
  const isBuilding = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';
  pinoEnabled = enabled && !isBuilding;
  logger = pino(createLoggerConfig(level, pinoEnabled));
  
  // Only log startup if enabled to avoid console noise when disabled
  if (pinoEnabled) {
    systemLogger.startup();
  }
}).catch(error => {
  // If database settings fail, keep defaults but log the issue
  console.warn('Logger: Using console fallback due to database settings error:', error.message);
});

// Export default logger and utilities
export default logger;
export { updateLogLevel, LOG_LEVELS };
export type { LogLevel };