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

async function testHelpdeskAction(action, data = {}, description) {
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
        service: 'helpdesk',
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
          if (result.data.metadata?.team_statistics) {
            console.log(`   Team stats: ${result.data.metadata.team_statistics.length} teams`);
          }
        } else if (result.data.teams) {
          console.log(`   Teams: ${result.data.teams.length}, Active tickets: ${result.data.summary?.total_active_tickets || 0}`);
        } else if (result.data.preferences) {
          console.log(`   Preferences: ${Object.keys(result.data.preferences).length} settings`);
          if (result.data.preferences.preferred_teams) {
            console.log(`   Preferred teams: ${result.data.preferences.preferred_teams.length}`);
          }
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

async function runHelpdeskTests() {
  console.log('Starting HelpdeskService tests...');
  
  // Test 1: Get Queue (all tickets)
  await testHelpdeskAction('get_queue', { 
    limit: 10,
    status: 'all',
    sort_by: 'submitted_at',
    sort_order: 'DESC'
  }, 'Get Queue - All Tickets');
  
  // Test 2: Get Queue (with team filter)
  await testHelpdeskAction('get_queue', { 
    teams: ['ITTS_Region7'],
    status: 'open',
    include_history: false,
    limit: 5
  }, 'Get Queue - ITTS Region 7 Open Tickets');
  
  // Test 3: Get Queue (with search and filters)
  await testHelpdeskAction('get_queue', {
    search: 'test',
    priority: 'high',
    assigned_to: 'unassigned',
    limit: 5
  }, 'Get Queue - Search + Filters');
  
  // Test 4: Get Teams
  await testHelpdeskAction('get_teams', {
    include_stats: true,
    active_only: true
  }, 'Get Teams - With Statistics');
  
  // Test 5: Get Teams (minimal)
  await testHelpdeskAction('get_teams', {
    include_stats: false,
    active_only: true
  }, 'Get Teams - Minimal Info');
  
  // Test 6: Get Team Preferences (current user)
  await testHelpdeskAction('get_team_preferences', {}, 'Get Team Preferences - Current User');
  
  // Test 7: Update Team Preferences
  await testHelpdeskAction('update_team_preferences', {
    preferences: {
      preferred_teams: ['ITTS_Region7'],
      show_all_teams: false,
      auto_refresh_interval: 60,
      show_team_stats: true,
      notifications_enabled: true,
      sound_notifications: false
    }
  }, 'Update Team Preferences');
  
  // Test 8: Get Updated Team Preferences
  await testHelpdeskAction('get_team_preferences', {}, 'Get Updated Team Preferences');
  
  // Test 9: Test invalid team ID in preferences
  await testHelpdeskAction('update_team_preferences', {
    preferences: {
      preferred_teams: ['INVALID_TEAM_ID'],
      show_all_teams: true
    }
  }, 'Update Preferences - Invalid Team (Should Fail)');
  
  console.log('\n✅ All HelpdeskService tests completed!');
}

runHelpdeskTests().catch(console.error);