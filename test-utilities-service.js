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

async function testUtilitiesAction(action, data = {}, description) {
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
        service: 'utilities',
        action,
        data
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success:', result.message || 'Operation completed');
      if (result.data) {
        // Show summary of results based on action type
        if (action === 'get_organization') {
          const org = result.data.organization || {};
          console.log(`   DPSS: ${org.dpss?.offices?.length || 0} offices, ${org.dpss?.bureaus?.length || 0} bureaus`);
          console.log(`   Teams: ${org.teams?.length || 0}, Sections: ${org.sections?.length || 0}`);
        } else if (action === 'get_categories') {
          console.log(`   Categories: ${result.data.total_categories || 0}, Request Types: ${result.data.total_request_types || 0}`);
          console.log(`   Structure: ${result.data.structure || 'unknown'}`);
        } else if (action === 'get_assignable_users') {
          console.log(`   Assignable Users: ${result.data.total || 0}`);
          if (result.data.assignable_roles) {
            console.log(`   Roles: ${result.data.assignable_roles.join(', ')}`);
          }
        } else if (action === 'get_support_teams') {
          console.log(`   Support Teams: ${result.data.total_teams || 0}, Groups: ${result.data.total_groups || 0}`);
        } else if (action === 'get_simple_categories') {
          console.log(`   Simple Categories: ${result.data.total_categories || 0}, Format: ${result.data.format || 'unknown'}`);
        } else if (action === 'get_profile_picture') {
          console.log(`   User: ${result.data.username || 'unknown'}, Has Picture: ${!result.data.default_picture}`);
          if (result.data.picture_size_bytes > 0) {
            console.log(`   Size: ${result.data.picture_size_bytes} bytes`);
          }
        } else if (action === 'upload_profile_picture') {
          console.log(`   Uploaded: ${result.data.filename || 'unknown'}, Size: ${result.data.file_size_bytes || 0} bytes`);
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

async function runUtilitiesTests() {
  console.log('Starting UtilitiesService tests...');
  
  // Test 1: Get Organization - All Types
  await testUtilitiesAction('get_organization', {
    type: 'all',
    simplified: false
  }, 'Get Organization - All Types');
  
  // Test 2: Get Organization - DPSS Only (Simplified)
  await testUtilitiesAction('get_organization', {
    type: 'dpss',
    simplified: true
  }, 'Get Organization - DPSS Simplified');
  
  // Test 3: Get Organization - Teams Only
  await testUtilitiesAction('get_organization', {
    type: 'teams',
    simplified: false
  }, 'Get Organization - Teams Only');
  
  // Test 4: Get Categories - Hierarchical
  await testUtilitiesAction('get_categories', {
    include_hierarchy: true,
    active_only: true
  }, 'Get Categories - Hierarchical');
  
  // Test 5: Get Categories - Flat
  await testUtilitiesAction('get_categories', {
    include_hierarchy: false,
    active_only: true
  }, 'Get Categories - Flat');
  
  // Test 6: Get Assignable Users - All
  await testUtilitiesAction('get_assignable_users', {
    active_only: true,
    include_stats: false
  }, 'Get Assignable Users - All');
  
  // Test 7: Get Assignable Users - With Stats
  await testUtilitiesAction('get_assignable_users', {
    active_only: true,
    include_stats: true,
    role: 'admin'
  }, 'Get Assignable Users - Admin with Stats');
  
  // Test 8: Get Support Teams - All
  await testUtilitiesAction('get_support_teams', {
    active_only: true,
    include_groups: true
  }, 'Get Support Teams - All with Groups');
  
  // Test 9: Get Support Teams - Without Groups
  await testUtilitiesAction('get_support_teams', {
    active_only: true,
    include_groups: false
  }, 'Get Support Teams - Without Groups');
  
  // Test 10: Get Simple Categories - Hierarchical
  await testUtilitiesAction('get_simple_categories', {
    format: 'hierarchical'
  }, 'Get Simple Categories - Hierarchical');
  
  // Test 11: Get Simple Categories - Flat
  await testUtilitiesAction('get_simple_categories', {
    format: 'flat'
  }, 'Get Simple Categories - Flat');
  
  // Test 12: Get Profile Picture - Current User
  await testUtilitiesAction('get_profile_picture', {
    username: 'e603876'
  }, 'Get Profile Picture - Current User');
  
  // Test 13: Upload Profile Picture
  await testUtilitiesAction('upload_profile_picture', {
    username: 'e603876',
    filename: 'test_profile.jpg',
    file_data: 'mock_image_data_here'
  }, 'Upload Profile Picture');
  
  // Test 14: Get Profile Picture After Upload
  await testUtilitiesAction('get_profile_picture', {
    username: 'e603876'
  }, 'Get Profile Picture - After Upload');
  
  // Test 15: Get Profile Picture - Other User (should require permissions)
  await testUtilitiesAction('get_profile_picture', {
    username: 'nonexistent_user'
  }, 'Get Profile Picture - Other User (Should Fail)');
  
  console.log('\n✅ All UtilitiesService tests completed!');
}

runUtilitiesTests().catch(console.error);