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

// Get log level from database settings or environment
async function getLogLevel(): Promise<LogLevel> {
  try {
    // Try to get log level from database settings
    const settings = await queryAsync(
      'SELECT log_level FROM system_settings WHERE id = 1'
    );
    
    if (settings.length > 0 && settings[0].log_level) {
      const dbLevel = settings[0].log_level.toLowerCase();
      if (dbLevel in LOG_LEVELS) {
        return dbLevel as LogLevel;
      }
    }
  } catch (error) {
    // Database might not be ready yet, fall back to environment
  }
  
  // Fallback to environment variable or default
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
  return (envLevel in LOG_LEVELS) ? envLevel as LogLevel : 'info';
}

// Create logger configuration
const createLoggerConfig = (level: LogLevel) => {
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

// Initialize logger with default level
let currentLevel: LogLevel = 'info';
let logger = pino(createLoggerConfig(currentLevel));

// Function to update logger level dynamically
const updateLogLevel = async (): Promise<void> => {
  try {
    const newLevel = await getLogLevel();
    if (newLevel !== currentLevel) {
      currentLevel = newLevel;
      logger = pino(createLoggerConfig(newLevel));
      logger.info({ 
        event: 'log_level_changed', 
        old_level: currentLevel, 
        new_level: newLevel 
      }, `Log level updated to: ${newLevel}`);
    }
  } catch (error) {
    logger.error({ error, event: 'log_level_update_failed' }, 'Failed to update log level');
  }
};

// Enhanced logger with context and structured logging
export const createContextLogger = (context: string) => {
  return {
    error: (obj: any, msg?: string) => logger.error({ ...obj, context }, msg),
    warn: (obj: any, msg?: string) => logger.warn({ ...obj, context }, msg),
    info: (obj: any, msg?: string) => logger.info({ ...obj, context }, msg),
    debug: (obj: any, msg?: string) => logger.debug({ ...obj, context }, msg),
    
    // Convenience methods for simple logging
    logError: (message: string, error?: any) => 
      logger.error({ error, context, event: 'error' }, message),
    logInfo: (message: string, data?: any) => 
      logger.info({ ...data, context, event: 'info' }, message),
    logDebug: (message: string, data?: any) => 
      logger.debug({ ...data, context, event: 'debug' }, message),
  };
};

// Ticket-specific logger with structured fields
export const ticketLogger = {
  created: (ticketId: string, submittedBy: string, team: string) =>
    logger.info({ 
      event: 'ticket_created', 
      ticket_id: ticketId, 
      submitted_by: submittedBy, 
      assigned_team: team 
    }, `Ticket created: ${ticketId}`),
    
  updated: (ticketId: string, updatedBy: string, changes: any) =>
    logger.info({ 
      event: 'ticket_updated', 
      ticket_id: ticketId, 
      updated_by: updatedBy, 
      changes 
    }, `Ticket updated: ${ticketId}`),
    
  assigned: (ticketId: string, assignedTo: string, assignedBy: string) =>
    logger.info({ 
      event: 'ticket_assigned', 
      ticket_id: ticketId, 
      assigned_to: assignedTo, 
      assigned_by: assignedBy 
    }, `Ticket assigned: ${ticketId} → ${assignedTo}`),
    
  escalated: (ticketId: string, escalatedBy: string, reason: string) =>
    logger.warn({ 
      event: 'ticket_escalated', 
      ticket_id: ticketId, 
      escalated_by: escalatedBy, 
      reason 
    }, `Ticket escalated: ${ticketId}`),
    
  completed: (ticketId: string, completedBy: string, notes?: string) =>
    logger.info({ 
      event: 'ticket_completed', 
      ticket_id: ticketId, 
      completed_by: completedBy, 
      notes 
    }, `Ticket completed: ${ticketId}`),
    
  deleted: (ticketId: string, deletedBy: string, reason?: string) =>
    logger.warn({ 
      event: 'ticket_deleted', 
      ticket_id: ticketId, 
      deleted_by: deletedBy, 
      reason 
    }, `Ticket deleted: ${ticketId}`),
};

// Authentication logger
export const authLogger = {
  login: (username: string, ip?: string, success: boolean = true) =>
    logger.info({ 
      event: 'user_login', 
      username, 
      ip_address: ip, 
      success 
    }, `Login ${success ? 'successful' : 'failed'}: ${username}`),
    
  logout: (username: string, ip?: string) =>
    logger.info({ 
      event: 'user_logout', 
      username, 
      ip_address: ip 
    }, `User logged out: ${username}`),
    
  tokenExpired: (username: string) =>
    logger.warn({ 
      event: 'token_expired', 
      username 
    }, `Token expired for user: ${username}`),
    
  permissionDenied: (username: string, action: string, resource?: string) =>
    logger.warn({ 
      event: 'permission_denied', 
      username, 
      action, 
      resource 
    }, `Permission denied: ${username} attempted ${action}`),
};

// System logger for general application events
export const systemLogger = {
  startup: (port?: number) =>
    logger.info({ 
      event: 'system_startup', 
      port, 
      node_env: process.env.NODE_ENV 
    }, 'System starting up'),
    
  shutdown: (reason?: string) =>
    logger.info({ 
      event: 'system_shutdown', 
      reason 
    }, 'System shutting down'),
    
  databaseConnected: () =>
    logger.info({ 
      event: 'database_connected' 
    }, 'Database connection established'),
    
  databaseError: (error: any) =>
    logger.error({ 
      event: 'database_error', 
      error 
    }, 'Database error occurred'),
    
  configUpdated: (setting: string, updatedBy: string) =>
    logger.info({ 
      event: 'config_updated', 
      setting, 
      updated_by: updatedBy 
    }, `System configuration updated: ${setting}`),
};

// API request logger
export const apiLogger = {
  request: (method: string, path: string, ip?: string, userId?: string) =>
    logger.debug({ 
      event: 'api_request', 
      method, 
      path, 
      ip_address: ip, 
      user_id: userId 
    }, `${method} ${path}`),
    
  response: (method: string, path: string, status: number, duration?: number) =>
    logger.debug({ 
      event: 'api_response', 
      method, 
      path, 
      status_code: status, 
      duration_ms: duration 
    }, `${method} ${path} → ${status}`),
    
  error: (method: string, path: string, error: any, userId?: string) =>
    logger.error({ 
      event: 'api_error', 
      method, 
      path, 
      error, 
      user_id: userId 
    }, `API error: ${method} ${path}`),
};

// Initialize logger on module load
getLogLevel().then(level => {
  currentLevel = level;
  logger = pino(createLoggerConfig(level));
  systemLogger.startup();
});

// Export default logger and utilities
export default logger;
export { updateLogLevel, LOG_LEVELS };
export type { LogLevel };