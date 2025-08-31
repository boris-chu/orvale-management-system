/**
 * Gateway Error Handler
 * Unified error handling for API gateway
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemLogger } from '@/lib/logger';
import { 
  UnauthorizedError, 
  ForbiddenError, 
  ValidationError 
} from './context';
import { 
  ServiceNotFoundError, 
  ActionNotFoundError, 
  PermissionDeniedError 
} from './base-service';

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  request_id?: string;
  timestamp: string;
}

export function handleGatewayError(error: any, request: NextRequest): NextResponse {
  const timestamp = new Date().toISOString();
  
  // Determine error type and appropriate response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'An internal error occurred';
  let details: any = undefined;
  
  // Handle specific error types
  if (error instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = error.message;
    
  } else if (error instanceof UnauthorizedError) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    errorMessage = error.message;
    
  } else if (error instanceof ForbiddenError || error instanceof PermissionDeniedError) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    errorMessage = error.message;
    
  } else if (error instanceof ServiceNotFoundError) {
    statusCode = 404;
    errorCode = 'SERVICE_NOT_FOUND';
    errorMessage = error.message;
    
  } else if (error instanceof ActionNotFoundError) {
    statusCode = 400;
    errorCode = 'ACTION_NOT_FOUND';
    errorMessage = error.message;
    
  } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    errorMessage = 'Invalid JSON in request body';
    
  } else if (error?.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    errorCode = 'CONSTRAINT_VIOLATION';
    errorMessage = 'Data constraint violation';
    details = { constraint: error.message };
    
  } else if (error?.code === 'SQLITE_ERROR') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    errorMessage = 'Database operation failed';
    details = { database_error: error.message };
    
  } else if (error instanceof Error) {
    // Generic error handling
    errorMessage = error.message || 'Unknown error occurred';
    details = {
      error_type: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
  
  // Create error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: errorMessage,
    code: errorCode,
    details,
    timestamp
  };
  
  // Log error with context
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  systemLogger[logLevel]('Gateway error response', {
    statusCode,
    errorCode,
    errorMessage,
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    clientIP: getClientIP(request),
    errorType: error?.constructor?.name,
    hasDetails: !!details
  });
  
  return NextResponse.json(errorResponse, { 
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Code': errorCode,
      'X-Error-Timestamp': timestamp
    }
  });
}

/**
 * Handle specific database errors
 */
export function handleDatabaseError(error: any): never {
  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new ValidationError('Duplicate entry - record already exists');
  }
  
  if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    throw new ValidationError('Foreign key constraint violation');
  }
  
  if (error?.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    throw new ValidationError('Required field cannot be null');
  }
  
  if (error?.code?.startsWith('SQLITE_CONSTRAINT')) {
    throw new ValidationError('Data constraint violation');
  }
  
  if (error?.code?.startsWith('SQLITE_')) {
    systemLogger.error('Database error', {
      code: error.code,
      message: error.message,
      sql: error.sql
    });
    throw new Error('Database operation failed');
  }
  
  // Re-throw unknown errors
  throw error;
}

/**
 * Create a standardized API error
 */
export function createApiError(
  message: string, 
  code: string = 'API_ERROR', 
  statusCode: number = 400,
  details?: any
): Error & { statusCode: number; code: string; details?: any } {
  const error = new Error(message) as Error & { statusCode: number; code: string; details?: any };
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Validate and handle async operations
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    systemLogger.error(errorMessage, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIP) {
    return xRealIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return request.ip || 'unknown';
}