const fetch = require('node-fetch');

async function testMaintenanceAPI() {
  try {
    console.log('🔍 Testing maintenance API endpoint...\n');
    
    const response = await fetch('http://localhost/api/maintenance/status');
    const data = await response.json();
    
    console.log('📡 API Response Status:', response.status);
    console.log('📊 API Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.isSystemMaintenance) {
      console.log('\n✅ API reports maintenance mode is ACTIVE');
    } else {
      console.log('\n❌ API reports maintenance mode is INACTIVE');
      console.log('   This explains why maintenance page is not showing!');
    }
    
  } catch (error) {
    console.error('❌ Error calling maintenance API:', error.message);
    console.log('\n💡 Make sure the server is running on port 80');
    console.log('   Try: sudo npm run dev');
  }
}

testMaintenanceAPI();