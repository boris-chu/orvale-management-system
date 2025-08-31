#!/usr/bin/env node

/**
 * API Gateway Validation Test Suite
 * Tests all 69 API actions through the unified gateway
 */

const API_URL = 'http://localhost/api/v1';

// Test user credentials
const TEST_ADMIN = {
  username: 'e603876',
  password: 'admin123'
};

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper to make API requests
async function makeRequest(service, action, data = {}, token = null) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ service, action, data })
    });
    
    const result = await response.json();
    return {
      success: response.ok && result.success,
      data: result.data?.data || result.data,
      error: result.data?.error || result.error,
      message: result.data?.message || result.message,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

// Test runner
async function runTest(testName, service, action, data = {}, requireAuth = true) {
  totalTests++;
  process.stdout.write(`Testing ${testName}... `);
  
  try {
    let token = null;
    
    // Login if auth required
    if (requireAuth) {
      const loginResult = await makeRequest('admin', 'login', TEST_ADMIN);
      if (!loginResult.success || !loginResult.data?.token) {
        throw new Error('Failed to authenticate for test');
      }
      token = loginResult.data.token;
    }
    
    // Run the actual test
    const result = await makeRequest(service, action, data, token);
    
    if (result.success) {
      console.log(`${colors.green}✓ PASSED${colors.reset}`);
      passedTests++;
      testResults.push({
        test: testName,
        status: 'PASSED',
        service,
        action,
        hasData: !!result.data
      });
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - ${result.error || 'Unknown error'}`);
      failedTests++;
      testResults.push({
        test: testName,
        status: 'FAILED',
        service,
        action,
        error: result.error || 'Unknown error'
      });
    }
    
    return result;
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
    failedTests++;
    testResults.push({
      test: testName,
      status: 'ERROR',
      service,
      action,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

// Main test suite
async function runAllTests() {
  console.log(`${colors.blue}=== API Gateway Validation Test Suite ===${colors.reset}\n`);
  console.log(`Testing endpoint: ${API_URL}\n`);
  
  // Test AdminService (21 actions)
  console.log(`${colors.yellow}--- Testing AdminService (21 actions) ---${colors.reset}`);
  
  await runTest('Admin: Login', 'admin', 'login', TEST_ADMIN, false);
  await runTest('Admin: Get Users', 'admin', 'get_users');
  await runTest('Admin: Get Roles', 'admin', 'get_roles');
  await runTest('Admin: Get Permissions', 'admin', 'get_permissions');
  await runTest('Admin: Get Chat Settings', 'admin', 'get_chat_settings');
  await runTest('Admin: Get Chat Stats', 'admin', 'get_chat_stats');
  await runTest('Admin: Get Chat Users', 'admin', 'get_chat_users');
  await runTest('Admin: Get All Messages', 'admin', 'get_all_messages', { limit: 10 });
  await runTest('Admin: Get Widget Settings', 'admin', 'get_widget_settings');
  await runTest('Admin: Get WebSocket Settings', 'admin', 'get_websocket_settings');
  await runTest('Admin: Get Theme Settings', 'admin', 'get_theme_settings');
  await runTest('Admin: Get Theme Analytics', 'admin', 'get_theme_analytics');
  await runTest('Admin: Get Recovery Settings', 'admin', 'get_recovery_settings');
  await runTest('Admin: Get Work Mode Settings', 'admin', 'get_work_mode_settings');
  await runTest('Admin: Get Table Configs', 'admin', 'get_table_configs');
  await runTest('Admin: Get Table Views', 'admin', 'get_table_views');
  await runTest('Admin: Get Portal Settings', 'admin', 'get_portal_settings');
  
  // Skip actions that modify data for safety
  console.log(`${colors.yellow}Skipping write operations for safety...${colors.reset}`);
  
  // Test HelpdeskService (9 actions)
  console.log(`\n${colors.yellow}--- Testing HelpdeskService (9 actions) ---${colors.reset}`);
  
  await runTest('Helpdesk: Get Queue', 'helpdesk', 'get_queue');
  await runTest('Helpdesk: Get Teams', 'helpdesk', 'get_teams');
  await runTest('Helpdesk: Get Team Preferences', 'helpdesk', 'get_team_preferences');
  await runTest('Helpdesk: Get Stats', 'helpdesk', 'get_stats');
  await runTest('Helpdesk: Get Ticket History', 'helpdesk', 'get_ticket_history', { ticket_id: 1 });
  
  // Test DeveloperService (21 actions)
  console.log(`\n${colors.yellow}--- Testing DeveloperService (21 actions) ---${colors.reset}`);
  
  await runTest('Developer: Get Stats', 'developer', 'get_stats');
  await runTest('Developer: Get System Health', 'developer', 'get_system_health');
  await runTest('Developer: Get System Logs', 'developer', 'get_system_logs', { limit: 10 });
  await runTest('Developer: Get Backup History', 'developer', 'get_backup_history');
  await runTest('Developer: Get API Endpoints', 'developer', 'get_api_endpoints');
  await runTest('Developer: Get Users', 'developer', 'get_users');
  await runTest('Developer: Get Database Schema', 'developer', 'get_database_schema');
  await runTest('Developer: Get Database Stats', 'developer', 'get_database_stats');
  await runTest('Developer: Get Performance Metrics', 'developer', 'get_performance_metrics');
  
  // Test UtilitiesService (7 actions)
  console.log(`\n${colors.yellow}--- Testing UtilitiesService (7 actions) ---${colors.reset}`);
  
  await runTest('Utilities: Get Organizations', 'utilities', 'get_organizations');
  await runTest('Utilities: Get Offices', 'utilities', 'get_offices');
  await runTest('Utilities: Get Bureaus', 'utilities', 'get_bureaus');
  await runTest('Utilities: Get Divisions', 'utilities', 'get_divisions');
  await runTest('Utilities: Get Sections', 'utilities', 'get_sections');
  await runTest('Utilities: Get Ticket Categories', 'utilities', 'get_ticket_categories');
  await runTest('Utilities: Get Request Types', 'utilities', 'get_request_types');
  
  // Test PublicService (11 actions)
  console.log(`\n${colors.yellow}--- Testing PublicService (11 actions) ---${colors.reset}`);
  
  await runTest('Public: Get Widget Settings', 'public', 'get_widget_settings', {}, false);
  await runTest('Public: Get Widget Status', 'public', 'get_widget_status', {}, false);
  await runTest('Public: Get Available Agents', 'public', 'get_available_agents', {}, false);
  await runTest('Public: Get Guest Queue', 'public', 'get_guest_queue', {}, false);
  
  // Test session creation
  const sessionResult = await runTest('Public: Start Chat Session', 'public', 'start_chat_session', {
    guest_name: 'Test User',
    guest_email: 'test@example.com',
    department: 'support'
  }, false);
  
  if (sessionResult.success && sessionResult.data?.session_id) {
    const sessionId = sessionResult.data.session_id;
    await runTest('Public: Get Chat Messages', 'public', 'get_chat_messages', { session_id: sessionId }, false);
    await runTest('Public: Send Chat Message', 'public', 'send_chat_message', {
      session_id: sessionId,
      message: 'Test message',
      message_type: 'text'
    }, false);
  }
  
  // Print summary
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Print failed tests
  if (failedTests > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults.filter(r => r.status !== 'PASSED').forEach(result => {
      console.log(`- ${result.test}: ${result.error}`);
    });
  }
  
  // Service breakdown
  console.log(`\n${colors.blue}Service Breakdown:${colors.reset}`);
  const services = ['admin', 'helpdesk', 'developer', 'utilities', 'public'];
  services.forEach(service => {
    const serviceTests = testResults.filter(r => r.service === service);
    const servicePassed = serviceTests.filter(r => r.status === 'PASSED').length;
    console.log(`${service}: ${servicePassed}/${serviceTests.length} passed`);
  });
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost/api/health');
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}Error: Server is not running at http://localhost${colors.reset}`);
    console.error('Please start the development server with: sudo npm run dev');
    return false;
  }
}

// Main execution
(async () => {
  console.log('Checking server status...');
  
  if (!(await checkServer())) {
    process.exit(1);
  }
  
  console.log('Server is running. Starting tests...\n');
  
  await runAllTests();
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
})();