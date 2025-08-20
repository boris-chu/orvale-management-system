import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { systemLogger, createContextLogger, ticketLogger, authLogger, apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const logger = createContextLogger('test-logging');
    
    // Test all logger types
    console.log('🧪 Manual Console Log: Testing Pino logging functionality...');
    
    systemLogger.configUpdated('test_logging', authResult.user.username);
    logger.info({ test: true, user: authResult.user.username }, 'Test system logger');
    
    ticketLogger.created('TEST-001', authResult.user.username, 'TEST_TEAM');
    authLogger.login(authResult.user.username, '127.0.0.1', true);
    apiLogger.request('GET', '/api/test-logging', '127.0.0.1', authResult.user.username);
    
    logger.logError('Test error message', { error: 'This is a test error' });
    logger.logInfo('Test info message', { data: 'Test info data' });
    logger.logDebug('Test debug message', { debug: 'Test debug data' });

    return NextResponse.json({
      success: true,
      message: 'Test logging completed - check your console/logs for output',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in test logging endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}