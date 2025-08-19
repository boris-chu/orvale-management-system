import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

// Default system settings
const DEFAULT_SETTINGS = {
  // Security Settings
  sessionTimeout: 60,
  passwordMinLength: 8,
  requireMFA: false,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  
  // System Behavior
  autoAssignment: false,
  defaultPriority: 'medium',
  emailNotifications: true,
  ticketNumberPrefix: 'TKT',
  maxTicketsPerUser: 50,
  
  // Email Configuration
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: true,
  smtpUser: '',
  fromEmail: '',
  fromName: 'Orvale Support System',
  
  // Maintenance
  enableMaintenance: false,
  maintenanceMessage: 'System is under maintenance. Please try again later.',
  autoBackupEnabled: true,
  backupRetentionDays: 30,
  logLevel: 'info'
};

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create system_settings table if it doesn't exist
    await runAsync(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all settings
    const settingsRows = await queryAsync(`
      SELECT setting_key, setting_value FROM system_settings
    `);

    // Convert to object format
    const settings = { ...DEFAULT_SETTINGS };
    settingsRows.forEach((row: any) => {
      try {
        settings[row.setting_key as keyof typeof settings] = JSON.parse(row.setting_value);
      } catch (error) {
        console.warn(`Failed to parse setting ${row.setting_key}:`, row.setting_value);
      }
    });

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const settings = await request.json();

    // Validate settings
    const validationResult = validateSettings(settings);
    if (!validationResult.valid) {
      return NextResponse.json({ 
        error: 'Invalid settings', 
        details: validationResult.errors 
      }, { status: 400 });
    }

    // Create system_settings table if it doesn't exist
    await runAsync(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit log table if it doesn't exist
    await runAsync(`
      CREATE TABLE IF NOT EXISTS system_settings_audit (
        id INTEGER PRIMARY KEY,
        setting_key TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update each setting
    const updatePromises = Object.entries(settings).map(async ([key, value]) => {
      // Get old value for audit log
      const oldSetting = await getAsync(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        [key]
      );

      // Update or insert setting
      await runAsync(`
        INSERT INTO system_settings (setting_key, setting_value, updated_by) 
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [key, JSON.stringify(value), authResult.user.username]);

      // Log change for audit
      await runAsync(`
        INSERT INTO system_settings_audit (setting_key, old_value, new_value, updated_by)
        VALUES (?, ?, ?, ?)
      `, [
        key, 
        oldSetting ? oldSetting.setting_value : null,
        JSON.stringify(value),
        authResult.user.username
      ]);
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function validateSettings(settings: any) {
  const errors: string[] = [];

  // Validate security settings
  if (settings.sessionTimeout < 5 || settings.sessionTimeout > 1440) {
    errors.push('Session timeout must be between 5 and 1440 minutes');
  }

  if (settings.passwordMinLength < 6 || settings.passwordMinLength > 50) {
    errors.push('Password minimum length must be between 6 and 50 characters');
  }

  if (settings.maxLoginAttempts < 3 || settings.maxLoginAttempts > 10) {
    errors.push('Max login attempts must be between 3 and 10');
  }

  if (settings.lockoutDuration < 5 || settings.lockoutDuration > 1440) {
    errors.push('Lockout duration must be between 5 and 1440 minutes');
  }

  // Validate system settings
  if (settings.maxTicketsPerUser < 1 || settings.maxTicketsPerUser > 1000) {
    errors.push('Max tickets per user must be between 1 and 1000');
  }

  if (!settings.ticketNumberPrefix || settings.ticketNumberPrefix.length > 10) {
    errors.push('Ticket number prefix is required and must be 10 characters or less');
  }

  // Validate email settings if email notifications are enabled
  if (settings.emailNotifications) {
    if (!settings.smtpHost) {
      errors.push('SMTP host is required when email notifications are enabled');
    }

    if (!settings.smtpPort || settings.smtpPort < 1 || settings.smtpPort > 65535) {
      errors.push('SMTP port must be between 1 and 65535');
    }

    if (!settings.fromEmail || !isValidEmail(settings.fromEmail)) {
      errors.push('Valid from email is required when email notifications are enabled');
    }
  }

  // Validate maintenance settings
  if (settings.backupRetentionDays < 1 || settings.backupRetentionDays > 365) {
    errors.push('Backup retention days must be between 1 and 365');
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(settings.logLevel)) {
    errors.push('Log level must be one of: error, warn, info, debug');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}