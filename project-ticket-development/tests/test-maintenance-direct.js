// Test the maintenance function directly without going through the API
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// Mock the database query function that the maintenance service uses
const queryAsync = (query, params = []) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
      db.close();
    });
  });
};

// Import the theme presets (simplified version)
const THEME_PRESETS = {
  'orvale-default': {
    primaryColor: '#2563eb',
    backgroundColor: '#f8fafc',
    textColor: '#475569'
  }
};

// Copy the parseMaintenanceSettings function exactly
function parseMaintenanceSettings(settingsRows, type) {
  try {
    const settings = {};
    
    // Convert rows to key-value object
    settingsRows.forEach(row => {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    });

    console.log(`🔍 parseMaintenanceSettings ${type} - settings object:`, settings);

    // Check if maintenance is enabled
    const enabledKey = type === 'system' ? 'enableMaintenance' : 'maintenance_mode';
    const enabledValue = settings[enabledKey];
    const enabled = enabledValue === true;
    
    console.log(`🔍 parseMaintenanceSettings ${type} - enabledKey: ${enabledKey}, value: ${enabledValue} (type: ${typeof enabledValue}), enabled: ${enabled}`);

    if (!enabled) {
      return { enabled: false, config: getDefaultMaintenanceConfig() };
    }

    // Build maintenance config
    const messageKey = type === 'system' ? 'maintenanceMessage' : 'maintenance_message';
    const themeKey = type === 'system' ? 'maintenance_theme' : 'portal_maintenance_theme';
    const returnTimeKey = type === 'system' ? 'estimated_return_time' : 'portal_estimated_return';
    const contactKey = type === 'system' ? 'emergency_contact' : 'portal_emergency_contact';

    const message = settings[messageKey] || getDefaultMaintenanceConfig().message;
    const themeData = settings[themeKey] || {};
    const estimatedReturn = settings[returnTimeKey];
    const emergencyContact = settings[contactKey];
    const adminOverride = type === 'system' ? (settings['admin_override_enabled'] !== false) : false;

    // Parse theme or use default
    let theme;
    if (themeData && typeof themeData === 'object' && themeData.primaryColor) {
      theme = { ...THEME_PRESETS['orvale-default'], ...themeData };
    } else {
      theme = THEME_PRESETS['orvale-default'];
    }

    const config = {
      message,
      theme,
      estimatedReturn,
      emergencyContact,
      adminOverride,
      showRefreshButton: true,
      logChanges: true
    };

    return { enabled: true, config };

  } catch (error) {
    console.error(`Failed to parse ${type} maintenance settings:`, error);
    return null;
  }
}

function getDefaultMaintenanceConfig() {
  return {
    message: 'System is under maintenance. Please try again later.',
    theme: THEME_PRESETS['orvale-default'],
    adminOverride: true,
    showRefreshButton: true,
    logChanges: true
  };
}

// Copy the checkMaintenanceStatus function exactly
async function checkMaintenanceStatus() {
  console.log('🚀 checkMaintenanceStatus called');
  try {
    // Get system maintenance settings
    console.log('📋 Querying system settings...');
    const systemSettings = await queryAsync(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN (
        'enableMaintenance', 
        'maintenanceMessage', 
        'maintenance_theme',
        'estimated_return_time',
        'emergency_contact',
        'admin_override_enabled'
      )
    `);
    console.log('✅ System settings query complete:', systemSettings);

    // Get portal maintenance settings
    console.log('📋 Querying portal settings...');
    const portalSettings = await queryAsync(`
      SELECT setting_key, setting_value 
      FROM portal_settings 
      WHERE setting_key IN (
        'maintenance_mode',
        'maintenance_message', 
        'portal_maintenance_theme',
        'portal_estimated_return',
        'portal_emergency_contact'
      )
    `);
    console.log('✅ Portal settings query complete:', portalSettings);

    // Parse system settings
    console.log('🔧 Parsing system settings...');
    let systemConfig;
    try {
      systemConfig = parseMaintenanceSettings(systemSettings, 'system');
      console.log('✅ System config parsed:', systemConfig);
    } catch (error) {
      console.error('❌ Error parsing system settings:', error);
      systemConfig = null;
    }
    
    console.log('🔧 Parsing portal settings...');
    let portalConfig;
    try {
      portalConfig = parseMaintenanceSettings(portalSettings, 'portal');
      console.log('✅ Portal config parsed:', portalConfig);
    } catch (error) {
      console.error('❌ Error parsing portal settings:', error);
      portalConfig = null;
    }

    const isSystemMaintenance = systemConfig?.enabled || false;
    const isPortalMaintenance = portalConfig?.enabled || false;
    
    console.log('🔍 Final maintenance status:', { isSystemMaintenance, isPortalMaintenance });

    // Determine effective mode (system takes priority)
    let effectiveMode = 'none';
    let effectiveConfig = null;

    if (isSystemMaintenance && systemConfig) {
      effectiveMode = 'system';
      effectiveConfig = systemConfig.config;
    } else if (isPortalMaintenance && portalConfig) {
      effectiveMode = 'portal';
      effectiveConfig = portalConfig.config;
    }

    const result = {
      isSystemMaintenance,
      isPortalMaintenance,
      systemMessage: systemConfig?.config.message,
      portalMessage: portalConfig?.config.message,
      systemTheme: systemConfig?.config.theme,
      portalTheme: portalConfig?.config.theme,
      systemConfig: systemConfig?.config,
      portalConfig: portalConfig?.config,
      effectiveMode,
      effectiveConfig
    };

    console.log('🎯 FINAL RESULT:', result);
    return result;

  } catch (error) {
    console.error('Failed to check maintenance status:', error);
    
    // Return safe defaults in case of error
    return {
      isSystemMaintenance: false,
      isPortalMaintenance: false,
      effectiveMode: 'none',
      effectiveConfig: null
    };
  }
}

// Run the test
checkMaintenanceStatus()
  .then(result => {
    console.log('\n🏁 Test completed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
  });