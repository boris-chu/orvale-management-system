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

async function testAdminAction(action, data = {}, description) {
  console.log(`\n=== Testing: ${description || action} ===`);
  
  try {
    const token = await getToken();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: 'admin',
        action,
        data
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success:', result.message || 'Operation completed');
      if (result.data) {
        // Show summary of results
        if (result.data.items) {
          console.log(`   Found ${result.data.items.length} items (total: ${result.data.pagination?.total_items || 'unknown'})`);
        } else if (result.data.settings) {
          console.log(`   Settings categories:`, Object.keys(result.data.settings));
        } else if (result.data.format) {
          console.log(`   Export format: ${result.data.format}, messages: ${result.data.total_messages}`);
        } else {
          console.log(`   Result keys:`, Object.keys(result.data).slice(0, 5).join(', '));
        }
      }
    } else {
      console.log('❌ Failed:', result.error);
      if (result.details) {
        console.log('   Details:', result.details);
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('Starting AdminService tests...');
  
  // Test get_all_messages
  await testAdminAction('get_all_messages', { limit: 5 }, 'Get All Messages');
  
  // Test export_messages
  await testAdminAction('export_messages', { format: 'json', channel_id: '1' }, 'Export Messages (JSON)');
  await testAdminAction('export_messages', { format: 'csv', channel_id: '1' }, 'Export Messages (CSV)');
  
  // Test widget settings
  await testAdminAction('get_widget_settings', {}, 'Get Widget Settings');
  await testAdminAction('update_widget_settings', {
    settings: {
      appearance: { theme_color: '#3b82f6' }
    }
  }, 'Update Widget Settings');
  
  // Test websocket settings
  await testAdminAction('get_websocket_settings', {}, 'Get WebSocket Settings');
  
  // Test theme settings
  await testAdminAction('get_theme_settings', {}, 'Get Theme Settings');
  await testAdminAction('get_theme_analytics', { period: '7d' }, 'Get Theme Analytics');
  
  // Test recovery settings
  await testAdminAction('get_recovery_settings', {}, 'Get Recovery Settings');
  
  // Test work mode settings
  await testAdminAction('get_work_mode_settings', {}, 'Get Work Mode Settings');
  
  // Test table management
  await testAdminAction('get_table_configs', {}, 'Get Table Configs');
  await testAdminAction('get_table_views', { table_name: 'user_tickets' }, 'Get Table Views');
  await testAdminAction('get_table_data', { 
    table_name: 'users', 
    limit: 3,
    sort_by: 'created_at',
    sort_order: 'DESC'
  }, 'Get Table Data (users)');
  
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);