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

async function testDeveloperAction(action, data = {}, description) {
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
        service: 'developer',
        action,
        data
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success:', result.message || 'Operation completed');
      if (result.data) {
        // Show summary of results based on action type
        if (action === 'get_analytics') {
          const metrics = result.data.analytics || {};
          console.log(`   Tickets: ${metrics.ticket_metrics?.total_tickets || 0}, Users: ${metrics.user_metrics?.total_users || 0}`);
          console.log(`   Chat: ${metrics.chat_metrics?.total_messages || 0} messages, ${metrics.chat_metrics?.total_channels || 0} channels`);
        } else if (action === 'get_stats') {
          const stats = result.data.statistics || {};
          console.log(`   Users: ${stats.active_users || 0}, Tickets: ${stats.total_tickets || 0}, DB: ${stats.database_size_mb || 0}MB`);
        } else if (action === 'get_users') {
          console.log(`   Found ${result.data.items?.length || 0} users (total: ${result.data.pagination?.total_items || 0})`);
        } else if (action === 'get_roles') {
          console.log(`   Roles: ${result.data.roles?.length || 0}`);
        } else if (action === 'get_teams') {
          console.log(`   Teams: ${result.data.teams?.length || 0} (${result.data.active_teams || 0} active)`);
        } else if (action === 'get_settings') {
          console.log(`   Settings: ${result.data.total_settings || 0} across ${result.data.categories?.length || 0} categories`);
        } else if (action === 'export_data') {
          const exported = result.data.export || {};
          console.log(`   Exported ${exported.tables?.length || 0} tables: ${Object.values(exported.record_counts || {}).reduce((a, b) => a + b, 0)} total records`);
        } else if (action === 'get_backup_status') {
          const backup = result.data.backup_status || {};
          console.log(`   Backups: ${backup.backup_count || 0}, DB size: ${result.data.storage_info?.database_size_mb || 0}MB`);
        } else if (action === 'get_dpss_org') {
          const org = result.data.organization || {};
          console.log(`   DPSS: ${org.offices?.length || 0} offices, ${org.bureaus?.length || 0} bureaus, ${org.divisions?.length || 0} divisions`);
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

async function runDeveloperTests() {
  console.log('Starting DeveloperService tests...');
  
  // Test 1: Get Analytics
  await testDeveloperAction('get_analytics', {
    date_from: '2024-01-01',
    date_to: '2025-12-31',
    metric_type: 'all'
  }, 'Get Analytics - Full System');
  
  // Test 2: Get Stats (quick)
  await testDeveloperAction('get_stats', {}, 'Get Stats - Quick Overview');
  
  // Test 3: Get Settings (all)
  await testDeveloperAction('get_settings', {
    category: 'all'
  }, 'Get Settings - All Categories');
  
  // Test 4: Get Settings (specific category)
  await testDeveloperAction('get_settings', {
    category: 'chat'
  }, 'Get Settings - Chat Category');
  
  // Test 5: Update Settings
  await testDeveloperAction('update_settings', {
    category: 'developer_test',
    settings: {
      test_setting: 'test_value',
      numeric_setting: 123,
      boolean_setting: true,
      json_setting: { key: 'value' }
    }
  }, 'Update Settings - Test Category');
  
  // Test 6: Test Email Config
  await testDeveloperAction('test_email_config', {
    test_address: 'test@example.com'
  }, 'Test Email Configuration');
  
  // Test 7: Get Backup Status
  await testDeveloperAction('get_backup_status', {}, 'Get Backup Status');
  
  // Test 8: Create Backup
  await testDeveloperAction('create_backup', {
    backup_name: 'test_backup_' + Date.now(),
    include_chat_data: true,
    include_logs: false
  }, 'Create Backup');
  
  // Test 9: Export Data
  await testDeveloperAction('export_data', {
    tables: ['users', 'roles'],
    format: 'json'
  }, 'Export Data - Users and Roles');
  
  // Test 10: Import Data (dry run)
  await testDeveloperAction('import_data', {
    import_data: {
      test_table: [{ id: 1, name: 'test' }]
    },
    dry_run: true
  }, 'Import Data - Dry Run');
  
  // Test 11: Get Users
  await testDeveloperAction('get_users', {
    active_only: true,
    include_permissions: false,
    limit: 10
  }, 'Get Users - Active Only');
  
  // Test 12: Get Users with Permissions
  await testDeveloperAction('get_users', {
    include_permissions: true,
    limit: 5
  }, 'Get Users - With Permissions');
  
  // Test 13: Create User
  await testDeveloperAction('create_user', {
    username: 'test_user_' + Date.now(),
    display_name: 'Test User',
    email: 'test@example.com',
    role_id: 'user',
    active: true
  }, 'Create User');
  
  // Test 14: Get Roles
  await testDeveloperAction('get_roles', {
    include_permissions: true
  }, 'Get Roles - With Permissions');
  
  // Test 15: Get Teams
  await testDeveloperAction('get_teams', {
    active_only: true,
    include_stats: true
  }, 'Get Teams - Active with Stats');
  
  // Test 16: Get Categories
  await testDeveloperAction('get_categories', {}, 'Get Categories');
  
  // Test 17: Get Sections
  await testDeveloperAction('get_sections', {}, 'Get Sections');
  
  // Test 18: Get DPSS Organization
  await testDeveloperAction('get_dpss_org', {}, 'Get DPSS Organization');
  
  // Test 19: Get Request Types
  await testDeveloperAction('get_request_types', {}, 'Get Request Types');
  
  // Test 20: Get Subcategories
  await testDeveloperAction('get_subcategories', {}, 'Get Subcategories');
  
  // Test 21: Invalid table export (should fail)
  await testDeveloperAction('export_data', {
    tables: ['invalid_table'],
    format: 'json'
  }, 'Export Data - Invalid Table (Should Fail)');
  
  console.log('\n✅ All DeveloperService tests completed!');
}

runDeveloperTests().catch(console.error);