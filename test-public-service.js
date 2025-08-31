#!/usr/bin/env node

const API_URL = 'http://localhost/api/v1';
const AUTH_URL = 'http://localhost/api/auth/login';

async function getToken() {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'e603876', password: 'admin123' })
  });
  const data = await response.json();
  return data.token;
}

async function testPublicAction(action, data = {}, description, requireAuth = true) {
  console.log(`\n=== Testing: ${description || action} ===`);
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    
    if (requireAuth) {
      const token = await getToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        service: 'public',
        action,
        data
      })
    });
    
    const result = await response.json();
    
    // Handle nested API gateway response structure
    const isSuccess = result.success && (result.data?.success !== false);
    const actualData = result.data?.data || result.data;
    const actualMessage = result.data?.message || result.message;
    const actualError = result.data?.error || result.error;
    
    // Debug session creation issue
    if (action === 'start_chat_session') {
      console.log('   [DEBUG] Result success:', result.success);
      console.log('   [DEBUG] Data success:', result.data?.success);
      console.log('   [DEBUG] Is success:', isSuccess);
      console.log('   [DEBUG] Has session ID:', !!actualData?.session_id);
      console.log('   [DEBUG] Error:', actualError);
    }
    
    if (isSuccess) {
      console.log('✅ Success:', actualMessage || 'Operation completed');
      if (actualData) {
        // Show summary of results based on action type
        if (action === 'get_widget_settings') {
          const settings = actualData.widget_settings || {};
          console.log(`   Widget: ${settings.enabled ? 'Enabled' : 'Disabled'}, Theme: ${settings.theme || 'default'}`);
          console.log(`   Title: "${settings.title || 'N/A'}", Position: ${settings.position || 'default'}`);
        } else if (action === 'get_widget_status') {
          console.log(`   Status: ${actualData.status || 'unknown'}, Agents: ${actualData.available_agents || 0}`);
          console.log(`   Queue: ${actualData.queue_size || 0}, Wait: ${actualData.estimated_wait_minutes || 0} min`);
        } else if (action === 'get_available_agents') {
          console.log(`   Available Agents: ${actualData.total_available || 0}`);
          if (actualData.agents && actualData.agents.length > 0) {
            console.log(`   First Agent: ${actualData.agents[0].display_name || 'Unknown'} (${actualData.agents[0].status || 'unknown'})`);
          }
        } else if (action === 'start_chat_session') {
          console.log(`   Session: ${actualData.session_id || 'unknown'}, Status: ${actualData.status || 'unknown'}`);
          console.log(`   Queue Position: ${actualData.queue_position || 0}, Guest: ${actualData.guest_name || 'unknown'}`);
          global.testSessionId = actualData.session_id; // Store for later tests
        } else if (action === 'get_chat_messages') {
          console.log(`   Messages: ${actualData.message_count || 0}, Session Status: ${actualData.session_status || 'unknown'}`);
        } else if (action === 'send_chat_message') {
          console.log(`   Message ID: ${actualData.message_id || 'unknown'}, Status: ${actualData.status || 'unknown'}`);
        } else if (action === 'auto_assign_agent') {
          console.log(`   Assigned: ${actualData.agent_display_name || 'unknown'}, Status: ${actualData.session_status || 'unknown'}`);
        } else if (action === 'reconnect_session') {
          console.log(`   Session: ${actualData.status || 'unknown'}, Messages: ${actualData.recent_messages?.length || 0}`);
        } else if (action === 'get_guest_queue') {
          console.log(`   Queue Size: ${actualData.total_waiting || 0}, Current Page: ${actualData.queue?.length || 0} items`);
        } else if (action === 'remove_from_queue') {
          console.log(`   Removed: ${actualData.session_id || 'unknown'}, Status: ${actualData.status || 'unknown'}`);
        } else {
          console.log(`   Result keys:`, Object.keys(actualData).slice(0, 5).join(', '));
        }
      }
    } else {
      console.log('❌ Failed:', actualError);
      if (result.data?.details || result.details) {
        console.log('   Details:', result.data?.details || result.details);
      }
    }
    
    return result;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function runPublicTests() {
  console.log('Starting PublicService tests...');
  
  // Test 1: Get Widget Settings (no auth required)
  await testPublicAction('get_widget_settings', {}, 'Get Widget Settings - Public', false);
  
  // Test 2: Get Widget Status (no auth required)
  await testPublicAction('get_widget_status', {}, 'Get Widget Status - Public', false);
  
  // Test 3: Get Available Agents (no auth required)
  await testPublicAction('get_available_agents', {
    include_details: false
  }, 'Get Available Agents - Basic', false);
  
  // Test 4: Get Available Agents with Details (no auth required)
  await testPublicAction('get_available_agents', {
    include_details: true
  }, 'Get Available Agents - With Details', false);
  
  // Test 5: Start Chat Session (no auth required)
  const sessionResult = await testPublicAction('start_chat_session', {
    guest_name: 'Test User',
    guest_email: 'test@example.com',
    initial_message: 'Hello, I need help with my account',
    department: 'support'
  }, 'Start Chat Session - Guest', false);
  
  const sessionId = sessionResult?.data?.data?.session_id || sessionResult?.data?.session_id;
  
  if (sessionId) {
    // Test 6: Get Chat Messages (no auth required for own session)
    await testPublicAction('get_chat_messages', {
      session_id: sessionId,
      include_system_messages: true
    }, 'Get Chat Messages - Guest Session', false);
    
    // Test 7: Send Chat Message (no auth required for own session)
    await testPublicAction('send_chat_message', {
      session_id: sessionId,
      message: 'This is a test message from the guest',
      sender_name: 'Test User',
      sender_type: 'guest',
      message_type: 'text'
    }, 'Send Chat Message - Guest', false);
    
    // Test 8: Auto Assign Agent (requires auth)
    const assignResult = await testPublicAction('auto_assign_agent', {
      session_id: sessionId,
      preferred_agent: null
    }, 'Auto Assign Agent - Staff Action', true);
    
    // Test 9: Send Agent Message (requires auth)
    await testPublicAction('send_chat_message', {
      session_id: sessionId,
      message: 'Hello! How can I help you today?',
      sender_name: 'Support Agent',
      sender_type: 'agent',
      message_type: 'text'
    }, 'Send Chat Message - Agent', true);
    
    // Test 10: Get Chat Messages After Agent Assignment
    await testPublicAction('get_chat_messages', {
      session_id: sessionId,
      include_system_messages: true,
      limit: 10
    }, 'Get Chat Messages - After Assignment', false);
    
    // Test 11: Reconnect Session (no auth required for guest)
    await testPublicAction('reconnect_session', {
      session_id: sessionId,
      guest_name: 'Test User'
    }, 'Reconnect Session - Guest', false);
    
    // Test 12: Return to Queue (requires auth)
    await testPublicAction('return_to_queue', {
      session_id: sessionId,
      reason: 'Agent needs to transfer to specialist'
    }, 'Return to Queue - Staff Action', true);
    
    // Test 13: Remove from Queue (no auth required for guest to leave)
    await testPublicAction('remove_from_queue', {
      session_id: sessionId,
      reason: 'Guest left chat'
    }, 'Remove from Queue - Guest Action', false);
  } else {
    console.log('\n⚠️ Skipping session-dependent tests - no session ID available');
  }
  
  // Test 14: Get Guest Queue (requires auth)
  await testPublicAction('get_guest_queue', {
    limit: 10,
    offset: 0,
    include_messages: true
  }, 'Get Guest Queue - Staff View', true);
  
  // Test 15: Start Second Session for Queue Testing
  const secondSession = await testPublicAction('start_chat_session', {
    guest_name: 'Queue Test User',
    guest_email: 'queue@example.com',
    initial_message: 'Testing queue functionality'
  }, 'Start Second Chat Session', false);
  
  // Test 16: Get Guest Queue with Multiple Sessions
  await testPublicAction('get_guest_queue', {
    limit: 5,
    offset: 0,
    include_messages: false
  }, 'Get Guest Queue - Multiple Sessions', true);
  
  // Test 17: Reconnect with Wrong Guest Name (should fail)
  if (sessionId) {
    await testPublicAction('reconnect_session', {
      session_id: sessionId,
      guest_name: 'Wrong User Name'
    }, 'Reconnect Session - Wrong Name (Should Fail)', false);
  }
  
  // Test 18: Try to get messages for non-existent session (should fail)
  await testPublicAction('get_chat_messages', {
    session_id: 'non_existent_session_123',
    limit: 10
  }, 'Get Messages - Invalid Session (Should Fail)', false);
  
  // Test 19: Try to send message to non-existent session (should fail)
  await testPublicAction('send_chat_message', {
    session_id: 'non_existent_session_123',
    message: 'This should fail',
    sender_name: 'Test User'
  }, 'Send Message - Invalid Session (Should Fail)', false);
  
  console.log('\n✅ All PublicService tests completed!');
}

runPublicTests().catch(console.error);