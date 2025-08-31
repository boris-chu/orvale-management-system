/**
 * Request Context System
 * Creates unified context for all API gateway requests
 */

import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createRequestLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: string;
  team_id?: string;
  section_id?: string;
  permissions?: string[];
  accessible_queues?: string[];
}

export interface RequestContext {
  requestId: string;
  startTime: number;
  user: User | null;
  permissions: string[];
  clientIP: string;
  userAgent: string;
  logger: any;
  isAuthenticated: boolean;
  authToken?: string;
}

export async function createRequestContext(request: NextRequest): Promise<RequestContext> {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Extract client information
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  // Centralized authentication
  const auth = await verifyAuth(request);
  const user = auth.success ? auth.user : null;
  const permissions = user?.permissions || [];
  const authToken = extractAuthToken(request);
  
  // Request-scoped logger
  const logger = createRequestLogger(requestId, user?.username);
  
  // Log request start
  logger.info('Request context created', {
    requestId,
    clientIP,
    userAgent,
    isAuthenticated: !!user,
    username: user?.username,
    permissionCount: permissions.length,
    url: request.url,
    method: request.method
  });
  
  return {
    requestId,
    startTime,
    user,
    permissions,
    clientIP,
    userAgent,
    logger,
    isAuthenticated: !!user,
    authToken
  };
}

function getClientIP(request: NextRequest): string {
  // Try various headers for client IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIP) {
    return xRealIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to connection remote address
  return request.ip || 'unknown';
}

function extractAuthToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

export function requireAuthentication(context: RequestContext): void {
  if (!context.isAuthenticated || !context.user) {
    throw new UnauthorizedError('Authentication required');
  }
}

export function requirePermissions(context: RequestContext, requiredPermissions: string | string[]): void {
  if (!context.isAuthenticated || !context.user) {
    throw new UnauthorizedError('Authentication required');
  }
  
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  for (const permission of permissions) {
    if (!context.permissions.includes(permission)) {
      context.logger.warn('Permission denied', {
        username: context.user.username,
        requiredPermission: permission,
        userPermissions: context.permissions
      });
      throw new ForbiddenError(`Required permission: ${permission}`);
    }
  }
}

// Custom error classes
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}