/**
 * API Security Middleware
 * Comprehensive security controls for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import rateLimit from 'express-rate-limit';
import { verifyAuth } from '@/lib/auth-utils';
import validator from 'validator';

/**
 * Rate limiting configuration
 */
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // Default 100 requests per window
    message: options.message || 'Too many requests from this IP, please try again later',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: options.message || 'Too many requests',
        retryAfter: Math.round(options.windowMs! / 1000) || 900
      });
    }
  });
};

/**
 * Different rate limiters for different endpoint types
 */
export const rateLimiters = {
  // General API endpoints
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'API rate limit exceeded'
  }),

  // Authentication endpoints (stricter)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later',
    skipSuccessfulRequests: true
  }),

  // File upload endpoints
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Upload rate limit exceeded'
  }),

  // Admin endpoints
  admin: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50,
    message: 'Admin API rate limit exceeded'
  })
};

/**
 * Input validation schemas
 */
export const validators = {
  employeeNumber: (input: string): string => {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Employee number is required');
    }
    if (!validator.isAlphanumeric(input.replace(/[_-]/g, ''))) {
      throw new ValidationError('Employee number contains invalid characters');
    }
    if (input.length > 20) {
      throw new ValidationError('Employee number too long');
    }
    return validator.escape(input);
  },

  ticketId: (input: any): number => {
    const id = parseInt(input);
    if (!validator.isNumeric(input.toString()) || id <= 0) {
      throw new ValidationError('Invalid ticket ID');
    }
    return id;
  },

  email: (input: string): string => {
    if (!validator.isEmail(input)) {
      throw new ValidationError('Invalid email format');
    }
    return validator.normalizeEmail(input) || input;
  },

  username: (input: string): string => {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Username is required');
    }
    if (!validator.isAlphanumeric(input.replace(/[._-]/g, ''))) {
      throw new ValidationError('Username contains invalid characters');
    }
    if (input.length < 3 || input.length > 50) {
      throw new ValidationError('Username must be 3-50 characters');
    }
    return validator.escape(input);
  },

  password: (input: string): string => {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('Password is required');
    }
    if (input.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (input.length > 128) {
      throw new ValidationError('Password too long');
    }
    // Don't escape passwords as they may contain special characters intentionally
    return input;
  },

  textInput: (input: string, maxLength: number = 1000): string => {
    if (typeof input !== 'string') {
      throw new ValidationError('Text input must be a string');
    }
    if (input.length > maxLength) {
      throw new ValidationError(`Text input exceeds maximum length of ${maxLength}`);
    }
    return validator.escape(input);
  },

  url: (input: string): string => {
    if (!validator.isURL(input, { require_protocol: true })) {
      throw new ValidationError('Invalid URL format');
    }
    return input;
  },

  ipAddress: (input: string): string => {
    if (!validator.isIP(input)) {
      throw new ValidationError('Invalid IP address');
    }
    return input;
  }
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * CORS configuration
 */
export const getCorsHeaders = (origin?: string) => {
  const allowedOrigins = [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:3000',
    'https://internal.company.com',
    // Add your internal domain patterns here
  ];

  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith('.company.com')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-inline/eval needed for Next.js dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'"
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

/**
 * Enhanced authentication middleware with security features
 */
export const authenticateAndAuthorize = (requiredPermissions: string[] = []) => {
  return async (request: NextRequest) => {
    try {
      // Extract and validate JWT token
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        );
      }

      // Verify authentication
      const authResult = await verifyAuth(request);
      if (!authResult.success || !authResult.user) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }

      const user = authResult.user;

      // Check if user account is active
      if (!user.active) {
        return NextResponse.json(
          { error: 'Account is inactive' },
          { status: 403 }
        );
      }

      // Check required permissions
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(
          permission => user.permissions?.includes(permission)
        );

        if (!hasPermission) {
          // Log permission denial
          console.warn('🔒 Permission denied:', {
            username: user.username,
            requiredPermissions,
            userPermissions: user.permissions,
            endpoint: request.nextUrl.pathname,
            timestamp: new Date().toISOString()
          });

          return NextResponse.json(
            { 
              error: 'Insufficient permissions',
              required: requiredPermissions,
              missing: requiredPermissions.filter(p => !user.permissions?.includes(p))
            },
            { status: 403 }
          );
        }
      }

      return { success: true, user };
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication check failed' },
        { status: 500 }
      );
    }
  };
};

/**
 * Request validation middleware
 */
export const validateRequest = (schema: Record<string, (input: any) => any>) => {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validated: Record<string, any> = {};

      for (const [field, validator] of Object.entries(schema)) {
        if (body[field] !== undefined) {
          validated[field] = validator(body[field]);
        }
      }

      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: `Validation failed: ${error.message}` },
          { status: 400 }
        );
      }
      
      console.error('Request validation error:', error);
      return NextResponse.json(
        { error: 'Request validation failed' },
        { status: 400 }
      );
    }
  };
};

/**
 * Create a secure API handler with all security middleware applied
 */
export const createSecureHandler = (options: {
  requiredPermissions?: string[];
  validationSchema?: Record<string, (input: any) => any>;
  rateLimitType?: keyof typeof rateLimiters;
}) => {
  return async (request: NextRequest, handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    try {
      // Apply CORS headers
      const origin = request.headers.get('origin');
      const corsHeaders = getCorsHeaders(origin);

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { 
          status: 200,
          headers: corsHeaders
        });
      }

      // Apply security headers
      const headers = new Headers({
        ...corsHeaders,
        ...securityHeaders
      });

      // Check authentication
      if (options.requiredPermissions || options.validationSchema) {
        const authResult = await authenticateAndAuthorize(options.requiredPermissions || [])(request);
        
        if (authResult instanceof NextResponse) {
          // Add security headers to error responses
          Object.entries(headers).forEach(([key, value]) => {
            authResult.headers.set(key, value);
          });
          return authResult;
        }

        // Add user to request context
        (request as any).user = authResult.user;
      }

      // Validate request body if schema provided
      if (options.validationSchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const validationResult = await validateRequest(options.validationSchema)(request);
        
        if (validationResult instanceof NextResponse) {
          Object.entries(headers).forEach(([key, value]) => {
            validationResult.headers.set(key, value);
          });
          return validationResult;
        }

        // Add validated data to request context
        (request as any).validatedData = validationResult.data;
      }

      // Call the actual handler
      const response = await handler(request, { user: (request as any).user });

      // Apply security headers to successful responses
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      console.error('Secure handler error:', error);
      
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );

      // Apply security headers to error responses
      Object.entries(securityHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });

      return errorResponse;
    }
  };
};

/**
 * IP address extraction utility
 */
export const getClientIP = (request: NextRequest): string => {
  // Check various headers for the real IP address
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
  
  // Fallback to connection IP
  return request.ip || 'unknown';
};

/**
 * Security audit logging
 */
export const auditLogger = {
  logSecurityEvent: (event: {
    type: string;
    username?: string;
    ip?: string;
    endpoint?: string;
    success?: boolean;
    details?: any;
  }) => {
    console.log('🛡️ Security Event:', {
      timestamp: new Date().toISOString(),
      ...event
    });
  },

  logAuthAttempt: (username: string, success: boolean, ip: string, userAgent?: string) => {
    auditLogger.logSecurityEvent({
      type: 'auth_attempt',
      username,
      success,
      ip,
      details: { userAgent }
    });
  },

  logPermissionDenied: (username: string, endpoint: string, requiredPermissions: string[], ip: string) => {
    auditLogger.logSecurityEvent({
      type: 'permission_denied',
      username,
      endpoint,
      ip,
      success: false,
      details: { requiredPermissions }
    });
  },

  logRateLimitExceeded: (ip: string, endpoint: string) => {
    auditLogger.logSecurityEvent({
      type: 'rate_limit_exceeded',
      ip,
      endpoint,
      success: false
    });
  }
};