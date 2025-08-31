/**
 * Single API Gateway - Unified Endpoint
 * Routes all API requests through service-based architecture
 * 
 * POST /api/v1
 * {
 *   "service": "tickets",
 *   "action": "create", 
 *   "data": { title: "New ticket", ... },
 *   "options": { include_history: true }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestContext } from '@/lib/api-gateway/context';
import { ServiceRegistry } from '@/lib/api-gateway/registry';
import { validateRequest } from '@/lib/api-gateway/validation';
import { handleGatewayError } from '@/lib/api-gateway/error-handler';
import { systemLogger } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Create unified request context
    const context = await createRequestContext(request);
    
    // Parse and validate request
    const { service, action, data, options } = await validateRequest(request);
    
    context.logger.info(`Gateway request: ${service}.${action}`, {
      service,
      action,
      hasData: !!data,
      hasOptions: !!options,
      requestId: context.requestId,
      user: context.user?.username
    });
    
    // Route to appropriate service
    const serviceInstance = ServiceRegistry.get(service);
    const result = await serviceInstance.handle(action, data, options, context);
    
    const executionTime = Date.now() - startTime;
    
    // Log successful request
    context.logger.info(`Gateway success: ${service}.${action}`, {
      executionTimeMs: executionTime,
      resultType: typeof result,
      hasResult: !!result
    });
    
    return NextResponse.json({
      success: true,
      service,
      action,
      data: result,
      metadata: {
        request_id: context.requestId,
        execution_time_ms: executionTime,
        user: context.user?.username,
        timestamp: new Date().toISOString(),
        api_version: '1.0.0'
      }
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    systemLogger.error('Gateway request failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs: executionTime,
      url: request.url,
      method: request.method
    });
    
    return handleGatewayError(error, request);
  }
}

// Health check endpoint
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const availableServices = ServiceRegistry.list();
    
    return NextResponse.json({
      success: true,
      message: 'API Gateway is operational',
      version: '1.0.0',
      services: availableServices,
      timestamp: new Date().toISOString(),
      endpoint_count: availableServices.length
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Gateway health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// OPTIONS for CORS support
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}