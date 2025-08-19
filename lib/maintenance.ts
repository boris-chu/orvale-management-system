import { queryAsync } from './database';
import { MaintenanceConfig, MaintenanceTheme, THEME_PRESETS } from '@/components/MaintenancePage';

export interface MaintenanceStatus {
  isSystemMaintenance: boolean;
  isPortalMaintenance: boolean;
  systemMessage?: string;
  portalMessage?: string;
  systemTheme?: MaintenanceTheme;
  portalTheme?: MaintenanceTheme;
  systemConfig?: MaintenanceConfig;
  portalConfig?: MaintenanceConfig;
  effectiveMode: 'system' | 'portal' | 'none';
  effectiveConfig: MaintenanceConfig | null;
}

/**
 * Check current maintenance status from database settings
 */
export async function checkMaintenanceStatus(): Promise<MaintenanceStatus> {
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

    // Get portal maintenance settings (different table structure)
    console.log('📋 Querying portal settings...');
    const portalSettingsRaw = await queryAsync(`
      SELECT settings_json 
      FROM portal_settings 
      LIMIT 1
    `);
    console.log('✅ Portal settings query complete:', portalSettingsRaw);
    
    // Convert portal settings to same format as system settings
    let portalSettings = [];
    if (portalSettingsRaw.length > 0 && portalSettingsRaw[0].settings_json) {
      try {
        const portalData = JSON.parse(portalSettingsRaw[0].settings_json);
        portalSettings = [
          { setting_key: 'maintenance_mode', setting_value: JSON.stringify(portalData.maintenance_mode) },
          { setting_key: 'maintenance_message', setting_value: JSON.stringify(portalData.maintenance_message) },
          { setting_key: 'portal_maintenance_theme', setting_value: JSON.stringify(portalData.portal_maintenance_theme) },
          { setting_key: 'portal_estimated_return', setting_value: JSON.stringify(portalData.portal_estimated_return) },
          { setting_key: 'portal_emergency_contact', setting_value: JSON.stringify(portalData.portal_emergency_contact) }
        ].filter(item => item.setting_value !== 'undefined');
      } catch (error) {
        console.error('❌ Error parsing portal settings JSON:', error);
        portalSettings = [];
      }
    }
    console.log('📋 Portal settings converted:', portalSettings);

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

    // Debug logging
    console.log('🔍 System settings raw:', systemSettings);
    console.log('🔍 System config parsed:', systemConfig);
    console.log('🔍 Portal settings raw:', portalSettings);
    console.log('🔍 Portal config parsed:', portalConfig);

    const isSystemMaintenance = systemConfig?.enabled || false;
    const isPortalMaintenance = portalConfig?.enabled || false;
    
    console.log('🔍 Final maintenance status:', { isSystemMaintenance, isPortalMaintenance });

    // Determine effective mode (system takes priority)
    let effectiveMode: 'system' | 'portal' | 'none' = 'none';
    let effectiveConfig: MaintenanceConfig | null = null;

    if (isSystemMaintenance && systemConfig) {
      effectiveMode = 'system';
      effectiveConfig = systemConfig.config;
    } else if (isPortalMaintenance && portalConfig) {
      effectiveMode = 'portal';
      effectiveConfig = portalConfig.config;
    }

    return {
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

/**
 * Parse maintenance settings from database rows
 */
function parseMaintenanceSettings(
  settingsRows: any[], 
  type: 'system' | 'portal'
): { enabled: boolean; config: MaintenanceConfig } | null {
  try {
    const settings: Record<string, any> = {};
    
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
    let theme: MaintenanceTheme;
    if (themeData && typeof themeData === 'object' && themeData.primaryColor) {
      theme = { ...THEME_PRESETS['orvale-default'], ...themeData };
    } else {
      theme = THEME_PRESETS['orvale-default'];
    }

    const config: MaintenanceConfig = {
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

/**
 * Get default maintenance configuration
 */
export function getDefaultMaintenanceConfig(): MaintenanceConfig {
  return {
    message: 'System is under maintenance. Please try again later.',
    theme: THEME_PRESETS['orvale-default'],
    adminOverride: true,
    showRefreshButton: true,
    logChanges: true
  };
}

/**
 * Check if user has maintenance override permission
 */
export function hasMaintenanceOverride(userPermissions: string[]): boolean {
  return userPermissions.includes('admin.maintenance_override');
}

/**
 * Get effective maintenance message for display
 */
export function getEffectiveMaintenanceMessage(status: MaintenanceStatus): string {
  if (status.effectiveConfig) {
    return status.effectiveConfig.message;
  }
  return getDefaultMaintenanceConfig().message;
}

/**
 * Save maintenance configuration to database
 */
export async function saveMaintenanceConfig(
  type: 'system' | 'portal',
  config: MaintenanceConfig,
  enabled: boolean,
  updatedBy: string
): Promise<void> {
  try {
    const tableName = type === 'system' ? 'system_settings' : 'portal_settings';
    const enabledKey = type === 'system' ? 'enableMaintenance' : 'maintenance_mode';
    const messageKey = type === 'system' ? 'maintenanceMessage' : 'maintenance_message';
    const themeKey = type === 'system' ? 'maintenance_theme' : 'portal_maintenance_theme';
    const returnTimeKey = type === 'system' ? 'estimated_return_time' : 'portal_estimated_return';
    const contactKey = type === 'system' ? 'emergency_contact' : 'portal_emergency_contact';

    // Update maintenance enabled status
    await queryAsync(`
      INSERT INTO ${tableName} (setting_key, setting_value, updated_by) 
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [enabledKey, JSON.stringify(enabled), updatedBy]);

    // Update message
    await queryAsync(`
      INSERT INTO ${tableName} (setting_key, setting_value, updated_by) 
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [messageKey, JSON.stringify(config.message), updatedBy]);

    // Update theme
    await queryAsync(`
      INSERT INTO ${tableName} (setting_key, setting_value, updated_by) 
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `, [themeKey, JSON.stringify(config.theme), updatedBy]);

    // Update estimated return time if provided
    if (config.estimatedReturn) {
      await queryAsync(`
        INSERT INTO ${tableName} (setting_key, setting_value, updated_by) 
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [returnTimeKey, JSON.stringify(config.estimatedReturn), updatedBy]);
    }

    // Update emergency contact if provided
    if (config.emergencyContact) {
      await queryAsync(`
        INSERT INTO ${tableName} (setting_key, setting_value, updated_by) 
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [contactKey, JSON.stringify(config.emergencyContact), updatedBy]);
    }

    // Update admin override for system maintenance
    if (type === 'system') {
      await queryAsync(`
        INSERT INTO ${tableName} (setting_key, setting_value, updated_by) 
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, ['admin_override_enabled', JSON.stringify(config.adminOverride), updatedBy]);
    }

  } catch (error) {
    console.error(`Failed to save ${type} maintenance config:`, error);
    throw error;
  }
}

/**
 * Check if current page should be affected by maintenance mode
 */
export function shouldShowMaintenance(
  pathname: string, 
  status: MaintenanceStatus,
  userPermissions?: string[]
): boolean {
  // If user has override permission, never show maintenance
  if (userPermissions && hasMaintenanceOverride(userPermissions)) {
    return false;
  }

  // System maintenance affects everything except admin routes
  if (status.isSystemMaintenance) {
    return !pathname.startsWith('/admin') && !pathname.startsWith('/developer');
  }

  // Portal maintenance only affects public-facing pages
  if (status.isPortalMaintenance) {
    return pathname === '/' || pathname.startsWith('/public-portal');
  }

  return false;
}