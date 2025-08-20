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
  // If Pino is disabled, return a minimal console logger configuration
  if (!enabled) {
    return {
      level: 'silent', // Disable all logging
      timestamp: false,
      formatters: {
        level: () => ({}),
      },
    };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Base configuration
  const config: any = {
    level: level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
  };

  // Development configuration
  if (isDevelopment) {
    config.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname,name',
        messageFormat: '{msg}',
        levelFirst: true,
        timestampKey: 'time'
      }
    };
  }
  
  // Production configuration with file outputs
  if (isProduction) {
    const logsDir = path.join(process.cwd(), 'logs');
    
    config.transport = {
      targets: [
        // Console output (for PM2/Docker logs)
        {
          target: 'pino/file',
          options: {
            destination: 1, // stdout
          },
          level: level
        },
        // Application log file
        {
          target: 'pino/file',
          options: {
            destination: path.join(logsDir, 'app.log'),
            mkdir: true
          },
          level: level
        },
        // Error-only log file
        {
          target: 'pino/file',
          options: {
            destination: path.join(logsDir, 'error.log'),
            mkdir: true
          },
          level: 'error'
        }
      ]
    };
  }

  return config;
};

// Initialize logger with default settings
let currentLevel: LogLevel = 'info';
let pinoEnabled = true;
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
  return {
    error: (obj: any, msg?: string) => pinoEnabled && logger.error({ ...obj, context }, msg),
    warn: (obj: any, msg?: string) => pinoEnabled && logger.warn({ ...obj, context }, msg),
    info: (obj: any, msg?: string) => pinoEnabled && logger.info({ ...obj, context }, msg),
    debug: (obj: any, msg?: string) => pinoEnabled && logger.debug({ ...obj, context }, msg),
    
    // Convenience methods for simple logging
    logError: (message: string, error?: any) => 
      pinoEnabled && logger.error({ error, context, event: 'error' }, message),
    logInfo: (message: string, data?: any) => 
      pinoEnabled && logger.info({ ...data, context, event: 'info' }, message),
    logDebug: (message: string, data?: any) => 
      pinoEnabled && logger.debug({ ...data, context, event: 'debug' }, message),
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

// Initialize logger on module load
getLogSettings().then(({ level, enabled }) => {
  currentLevel = level;
  pinoEnabled = enabled;
  logger = pino(createLoggerConfig(level, enabled));
  systemLogger.startup();
});

// Export default logger and utilities
export default logger;
export { updateLogLevel, LOG_LEVELS };
export type { LogLevel };