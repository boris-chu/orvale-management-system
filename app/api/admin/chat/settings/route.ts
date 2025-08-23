import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has chat admin permissions
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings');
    
    if (!hasChatAdminAccess) {
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

    // Get chat settings from system_settings table (using correct column names)
    const settings = await queryAsync(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key LIKE 'chat_%'
    `);

    // Database row interface
    interface SettingRow {
      setting_key: string;
      setting_value: string;
    }

    // Chat settings interface
    interface ChatSettings {
      fileShareEnabled: boolean;
      fileTypes: string;
      giphyEnabled: boolean;
      giphyApiKey: string;
      deletedMessageVisible: boolean;
      notificationsEnabled: boolean;
      maxFileSize: number;
      retentionDays: number;
      connectionMode: 'auto' | 'socket' | 'polling';
      socketUrl: string;
      pollingInterval: number;
    }

    // Convert settings array to object with defaults
    const settingsObj: ChatSettings = {
      fileShareEnabled: true,
      fileTypes: 'all',
      giphyEnabled: true,
      giphyApiKey: process.env.NEXT_PUBLIC_GIPHY_API_KEY || '',
      deletedMessageVisible: false,
      notificationsEnabled: true,
      maxFileSize: 10,
      retentionDays: 365,
      // Real-time connection defaults
      connectionMode: 'auto',
      socketUrl: 'http://localhost:4000',
      pollingInterval: 2000
    };

    // Override with database values if they exist
    (settings as SettingRow[]).forEach((setting: SettingRow) => {
      let key = setting.setting_key.replace('chat_', '');
      let value = setting.setting_value;
      
      // Handle special key mappings for connection settings
      if (key === 'connection_mode') key = 'connectionMode';
      else if (key === 'socket_url') key = 'socketUrl';
      else if (key === 'polling_interval') key = 'pollingInterval';
      
      // Parse JSON values (since system_settings stores as JSON)
      let parsedValue: string | number | boolean = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // If not JSON, keep as string and try boolean/numeric parsing
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = parseInt(value, 10);
      }
      
      // Type-safe assignment based on key
      if (key === 'fileShareEnabled' || key === 'giphyEnabled' || key === 'deletedMessageVisible' || key === 'notificationsEnabled') {
        (settingsObj as any)[key] = Boolean(parsedValue);
      } else if (key === 'maxFileSize' || key === 'retentionDays' || key === 'pollingInterval') {
        (settingsObj as any)[key] = Number(parsedValue);
      } else if (key === 'connectionMode' && (parsedValue === 'auto' || parsedValue === 'socket' || parsedValue === 'polling')) {
        settingsObj.connectionMode = parsedValue;
      } else {
        (settingsObj as any)[key] = String(parsedValue);
      }
    });

    return NextResponse.json(settingsObj);

  } catch (error) {
    console.error('❌ Error fetching chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has chat admin permissions
    const hasChatAdminAccess = authResult.user.permissions?.includes('chat.admin_access') ||
                              authResult.user.permissions?.includes('admin.system_settings');
    
    if (!hasChatAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Request body interface
    interface ChatSettingsUpdateRequest {
      fileShareEnabled?: boolean;
      fileTypes?: string;
      giphyEnabled?: boolean;
      giphyApiKey?: string;
      deletedMessageVisible?: boolean;
      notificationsEnabled?: boolean;
      maxFileSize?: number;
      retentionDays?: number;
      connectionMode?: 'auto' | 'socket' | 'polling';
      socketUrl?: string;
      pollingInterval?: number;
    }

    const body = await request.json() as ChatSettingsUpdateRequest;
    const {
      fileShareEnabled,
      fileTypes,
      giphyEnabled,
      giphyApiKey,
      deletedMessageVisible,
      notificationsEnabled,
      maxFileSize,
      retentionDays,
      // Real-time connection settings
      connectionMode,
      socketUrl,
      pollingInterval
    } = body;

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

    // Setting interface for database
    interface SettingToSave {
      name: string;
      value: string | number | boolean;
    }

    // Save each setting to the system_settings table
    const settingsToSave: SettingToSave[] = [
      { name: 'chat_fileShareEnabled', value: fileShareEnabled },
      { name: 'chat_fileTypes', value: fileTypes },
      { name: 'chat_giphyEnabled', value: giphyEnabled },
      { name: 'chat_giphyApiKey', value: giphyApiKey },
      { name: 'chat_deletedMessageVisible', value: deletedMessageVisible },
      { name: 'chat_notificationsEnabled', value: notificationsEnabled },
      { name: 'chat_maxFileSize', value: maxFileSize },
      { name: 'chat_retentionDays', value: retentionDays },
      // Real-time connection settings
      { name: 'chat_connection_mode', value: connectionMode },
      { name: 'chat_socket_url', value: socketUrl },
      { name: 'chat_polling_interval', value: pollingInterval }
    ].filter((setting): setting is SettingToSave => setting.value !== undefined); // Only save settings that are provided

    for (const setting of settingsToSave) {
      await runAsync(`
        INSERT INTO system_settings (setting_key, setting_value, updated_by) 
        VALUES (?, ?, ?)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_by = excluded.updated_by,
          updated_at = CURRENT_TIMESTAMP
      `, [setting.name, JSON.stringify(setting.value), authResult.user.username]);
    }

    // Log the admin action
    console.log(`🔧 Chat settings updated by ${authResult.user.display_name} (${authResult.user.username})`);

    return NextResponse.json({ 
      success: true, 
      message: 'Chat settings saved successfully' 
    });

  } catch (error) {
    console.error('❌ Error saving chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}