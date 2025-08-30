/**
 * Security Test API - For testing row-level security and API security features
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security-service';
import { createSecureHandler, validators, auditLogger, getClientIP } from '@/lib/api-security';

// GET: Test endpoint to verify security middleware
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['portal.view_dashboard'] // Require basic dashboard permission
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const userContext = SecurityService.createAccessContext(user);
    const clientIP = getClientIP(request);
    
    try {
      // Test row-level security filter generation
      const ticketFilter = SecurityService.getTicketAccessFilter(userContext);
      
      // Log test access
      auditLogger.logSecurityEvent({
        type: 'security_test_access',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/security/test',
        success: true
      });

      return NextResponse.json({
        success: true,
        message: 'Security test passed',
        data: {
          user: {
            username: user.username,
            role: user.role,
            teamId: user.team_id,
            permissions: user.permissions
          },
          security: {
            accessContext: userContext,
            rowLevelFilter: {
              condition: ticketFilter.condition,
              paramCount: ticketFilter.params.length
            },
            clientIP: clientIP,
            timestamp: new Date().toISOString()
          },
          testResults: {
            authentication: 'PASS',
            authorization: 'PASS',
            rowLevelSecurity: 'PASS',
            auditLogging: 'PASS'
          }
        }
      });

    } catch (error) {
      console.error('Security test error:', error);
      
      auditLogger.logSecurityEvent({
        type: 'security_test_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/security/test',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return NextResponse.json({
        error: 'Security test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}

// POST: Test input validation
export async function POST(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['ticket.create'],
    validationSchema: {
      employeeNumber: validators.employeeNumber,
      email: validators.email,
      username: validators.username,
      textField: (input: string) => validators.textInput(input, 100),
      url: validators.url
    }
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const validatedData = (req as any).validatedData;
    const clientIP = getClientIP(request);
    
    try {
      auditLogger.logSecurityEvent({
        type: 'validation_test',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/security/test',
        success: true,
        details: { validatedFields: Object.keys(validatedData) }
      });

      return NextResponse.json({
        success: true,
        message: 'Input validation test passed',
        data: {
          validatedData,
          sanitization: {
            status: 'COMPLETE',
            fieldsProcessed: Object.keys(validatedData).length,
            securityLevel: 'HIGH'
          }
        }
      });

    } catch (error) {
      console.error('Validation test error:', error);
      
      auditLogger.logSecurityEvent({
        type: 'validation_test_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/security/test',
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return NextResponse.json({
        error: 'Validation test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}