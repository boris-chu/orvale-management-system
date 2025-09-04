import { NextRequest, NextResponse } from 'next/server';
import { systemLogger, createContextLogger, ticketLogger, authLogger, apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const logger = createContextLogger('test-pino');
    
    console.log('🧪 === PINO LOGGER TEST STARTING ===');
    
    // Test all logger types with various levels
    systemLogger.info({ test: 'pino_enabled', endpoint: '/api/test-pino' }, 'Testing Pino system logger');
    logger.logInfo('Testing context logger info', { data: 'test_info', timestamp: new Date().toISOString() });
    logger.logError('Testing context logger error', { error: 'test_error', severity: 'low' });
    
    ticketLogger.created('PINO-TEST-001', 'test_user', 'TEST_TEAM');
    authLogger.login('pino_test_user', '127.0.0.1', true);
    apiLogger.request('GET', '/api/test-pino', '127.0.0.1', 'test_user');
    
    // Test debug level
    logger.debug({ debug_data: 'pino_debug_test' }, 'Testing debug level logging');
    
    // Test warning level
    systemLogger.warn({ warning: 'pino_test_warning' }, 'Testing warning level logging');
    
    console.log('🧪 === PINO LOGGER TEST COMPLETED ===');

    return NextResponse.json({
      success: true,
      message: 'Pino logger test completed',
      instructions: [
        '1. Check the console output above for log entries',
        '2. Check logs/app.log for file output (if production mode)',
        '3. Look for structured JSON logs vs simple console logs',
        '4. Verify timestamp formatting and structured data'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in Pino test endpoint:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error },
      { status: 500 }
    );
  }
}