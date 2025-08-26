/**
 * Admin Chat Settings API - Manage Giphy and other chat system settings
 * Handles configurable API keys, content filtering, rate limits, and feature toggles
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

// Ensure chat_system_settings table exists
const initializeDatabase = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS chat_system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT CHECK(setting_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
      description TEXT,
      category TEXT DEFAULT 'general',
      requires_restart BOOLEAN DEFAULT FALSE,
      updated_by TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(username)
    );
  `;

  await dbRun(createTableSQL);

  // Insert default Giphy settings if they don't exist
  const defaultSettings = [
    {
      key: 'giphy_enabled',
      value: 'false',
      type: 'boolean',
      description: 'Enable/disable GIF functionality system-wide',
      category: 'giphy'
    },
    {
      key: 'giphy_api_key',
      value: '',
      type: 'string',
      description: 'Giphy API key for GIF integration',
      category: 'giphy'
    },
    {
      key: 'giphy_content_rating',
      value: 'g',
      type: 'string',
      description: 'Content rating filter (g, pg, pg-13, r)',
      category: 'giphy'
    },
    {
      key: 'giphy_search_limit',
      value: '20',
      type: 'number',
      description: 'Maximum GIFs returned per search',
      category: 'giphy'
    },
    {
      key: 'giphy_trending_limit',
      value: '12',
      type: 'number',
      description: 'Maximum trending GIFs to display',
      category: 'giphy'
    },
    {
      key: 'giphy_rate_limit',
      value: '50',
      type: 'number',
      description: 'Max GIFs per user per hour',
      category: 'giphy'
    },
    {
      key: 'giphy_enable_search',
      value: 'true',
      type: 'boolean',
      description: 'Allow users to search for GIFs',
      category: 'giphy'
    },
    {
      key: 'giphy_enable_trending',
      value: 'true',
      type: 'boolean',
      description: 'Show trending GIFs tab',
      category: 'giphy'
    },
    {
      key: 'giphy_enable_categories',
      value: 'true',
      type: 'boolean',
      description: 'Show GIF categories',
      category: 'giphy'
    }
  ];

  for (const setting of defaultSettings) {
    try {
      await dbRun(
        `INSERT OR IGNORE INTO chat_system_settings 
         (setting_key, setting_value, setting_type, description, category, updated_by) 
         VALUES (?, ?, ?, ?, ?, 'system')`,
        [setting.key, setting.value, setting.type, setting.description, setting.category]
      );
    } catch (error) {
      console.error(`Failed to insert default setting ${setting.key}:`, error);
    }
  }
};

// GET - Retrieve chat settings
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for chat settings
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings') &&
        !authResult.user.permissions?.includes('chat.manage_system') &&
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = 'SELECT setting_key, setting_value, setting_type, description, category FROM chat_system_settings';
    const params: string[] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, setting_key';

    const settings = await dbAll(query, params) as Array<{ setting_key: string; setting_value: string; setting_type: string; description: string; category: string }>;

    // Convert to format expected by Chat Management System
    const managementSettings = {
      // Widget Settings
      widget_enabled: false,
      widget_position: 'bottom-right',
      widget_shape: 'round', // Updated default
      widget_primary_color: '#1976d2',
      widget_secondary_color: '#6c757d',
      widget_theme: 'light',
      widget_button_image: '',
      widget_default_state: 'minimized', // Default state when loading
      
      // System Settings
      chat_system_enabled: true,
      notification_sounds_enabled: true,
      read_receipts_enabled: true,
      file_sharing_enabled: true,
      gif_picker_enabled: false, // Default to false until Giphy is configured
      
      // UI Settings
      show_unread_badges: true,
      unread_badge_color: '#dc3545',
      unread_badge_text_color: '#ffffff',
      unread_badge_style: 'rounded',
      unread_badge_position: 'right',
      show_zero_counts: false,
      show_channel_member_count: false,
      show_typing_indicators: true,
      show_online_status: true,
      message_grouping_enabled: true,
      timestamp_format: 'relative',
    };

    // Apply database settings over defaults
    settings.forEach(setting => {
      const key = setting.setting_key;
      let value = setting.setting_value;
      
      // Convert string values to appropriate types for the management system
      let convertedValue: string | boolean | number = value;
      if (setting.setting_type === 'boolean') {
        convertedValue = value === 'true';
      } else if (setting.setting_type === 'number') {
        convertedValue = parseInt(value);
      }

      // Map Giphy settings to management format
      if (key === 'giphy_enabled') {
        managementSettings.gif_picker_enabled = convertedValue as boolean;
      } else if (managementSettings.hasOwnProperty(key)) {
        managementSettings[key as keyof typeof managementSettings] = convertedValue as never;
      }
    });

    return NextResponse.json(managementSettings);
  } catch (error) {
    console.error('Failed to retrieve chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Bulk update chat management settings
export async function PUT(request: NextRequest) {
  try {
    await initializeDatabase();

    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for chat settings
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings') &&
        !authResult.user.permissions?.includes('chat.manage_system') &&
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const settings = await request.json();

    // Map Chat Management System settings to database format
    const settingsToUpdate = [];

    // Widget settings
    if (settings.widget_enabled !== undefined) {
      settingsToUpdate.push({ key: 'widget_enabled', value: settings.widget_enabled, type: 'boolean' });
    }
    if (settings.widget_position !== undefined) {
      settingsToUpdate.push({ key: 'widget_position', value: settings.widget_position, type: 'string' });
    }
    if (settings.widget_shape !== undefined) {
      settingsToUpdate.push({ key: 'widget_shape', value: settings.widget_shape, type: 'string' });
    }
    if (settings.widget_primary_color !== undefined) {
      settingsToUpdate.push({ key: 'widget_primary_color', value: settings.widget_primary_color, type: 'string' });
    }
    if (settings.widget_secondary_color !== undefined) {
      settingsToUpdate.push({ key: 'widget_secondary_color', value: settings.widget_secondary_color, type: 'string' });
    }
    if (settings.widget_theme !== undefined) {
      settingsToUpdate.push({ key: 'widget_theme', value: settings.widget_theme, type: 'string' });
    }
    if (settings.widget_default_state !== undefined) {
      settingsToUpdate.push({ key: 'widget_default_state', value: settings.widget_default_state, type: 'string' });
    }

    // System settings
    if (settings.chat_system_enabled !== undefined) {
      settingsToUpdate.push({ key: 'chat_system_enabled', value: settings.chat_system_enabled, type: 'boolean' });
    }
    if (settings.notification_sounds_enabled !== undefined) {
      settingsToUpdate.push({ key: 'notification_sounds_enabled', value: settings.notification_sounds_enabled, type: 'boolean' });
    }
    if (settings.read_receipts_enabled !== undefined) {
      settingsToUpdate.push({ key: 'read_receipts_enabled', value: settings.read_receipts_enabled, type: 'boolean' });
    }
    if (settings.file_sharing_enabled !== undefined) {
      settingsToUpdate.push({ key: 'file_sharing_enabled', value: settings.file_sharing_enabled, type: 'boolean' });
    }
    if (settings.gif_picker_enabled !== undefined) {
      settingsToUpdate.push({ key: 'giphy_enabled', value: settings.gif_picker_enabled, type: 'boolean' });
    }

    // UI Settings
    if (settings.show_unread_badges !== undefined) {
      settingsToUpdate.push({ key: 'show_unread_badges', value: settings.show_unread_badges, type: 'boolean' });
    }
    if (settings.unread_badge_color !== undefined) {
      settingsToUpdate.push({ key: 'unread_badge_color', value: settings.unread_badge_color, type: 'string' });
    }
    if (settings.unread_badge_text_color !== undefined) {
      settingsToUpdate.push({ key: 'unread_badge_text_color', value: settings.unread_badge_text_color, type: 'string' });
    }
    if (settings.unread_badge_style !== undefined) {
      settingsToUpdate.push({ key: 'unread_badge_style', value: settings.unread_badge_style, type: 'string' });
    }
    if (settings.unread_badge_position !== undefined) {
      settingsToUpdate.push({ key: 'unread_badge_position', value: settings.unread_badge_position, type: 'string' });
    }
    if (settings.show_zero_counts !== undefined) {
      settingsToUpdate.push({ key: 'show_zero_counts', value: settings.show_zero_counts, type: 'boolean' });
    }
    if (settings.show_channel_member_count !== undefined) {
      settingsToUpdate.push({ key: 'show_channel_member_count', value: settings.show_channel_member_count, type: 'boolean' });
    }
    if (settings.show_typing_indicators !== undefined) {
      settingsToUpdate.push({ key: 'show_typing_indicators', value: settings.show_typing_indicators, type: 'boolean' });
    }
    if (settings.show_online_status !== undefined) {
      settingsToUpdate.push({ key: 'show_online_status', value: settings.show_online_status, type: 'boolean' });
    }
    if (settings.message_grouping_enabled !== undefined) {
      settingsToUpdate.push({ key: 'message_grouping_enabled', value: settings.message_grouping_enabled, type: 'boolean' });
    }
    if (settings.timestamp_format !== undefined) {
      settingsToUpdate.push({ key: 'timestamp_format', value: settings.timestamp_format, type: 'string' });
    }
    if (settings.widget_button_image !== undefined) {
      settingsToUpdate.push({ key: 'widget_button_image', value: settings.widget_button_image, type: 'string' });
    }

    // Update all settings in database
    for (const setting of settingsToUpdate) {
      await dbRun(
        `INSERT OR REPLACE INTO chat_system_settings 
         (setting_key, setting_value, setting_type, updated_by, updated_at, category)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [
          setting.key, 
          setting.value.toString(), 
          setting.type, 
          authResult.user.username,
          setting.key.startsWith('widget_') ? 'widget' :
          setting.key.startsWith('unread_badge_') || setting.key.startsWith('show_') || setting.key.includes('_format') || setting.key.includes('grouping') ? 'ui' :
          'system'
        ]
      );
    }

    return NextResponse.json({
      message: 'Chat settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('Failed to update chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Bulk update multiple settings
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for chat settings
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ 
        error: 'Settings must be an array of {key, value, type} objects' 
      }, { status: 400 });
    }

    const updatePromises = settings.map(async (setting: any) => {
      const { key, value, type = 'string' } = setting;
      
      if (!key || value === undefined) {
        throw new Error(`Invalid setting: ${JSON.stringify(setting)}`);
      }

      return dbRun(
        `INSERT OR REPLACE INTO chat_system_settings 
         (setting_key, setting_value, setting_type, updated_by, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [key, value.toString(), type, authResult.user.username]
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: `Successfully updated ${settings.length} settings` 
    });

  } catch (error) {
    console.error('Failed to bulk update chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Reset settings to defaults
export async function DELETE(request: NextRequest) {
  try {
    await initializeDatabase();

    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for chat settings
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (category) {
      // Reset specific category to defaults
      await dbRun(
        'DELETE FROM chat_system_settings WHERE category = ?',
        [category]
      );
      
      // Re-initialize defaults for that category
      await initializeDatabase();
      
      return NextResponse.json({ 
        message: `Reset ${category} settings to defaults` 
      });
    } else {
      return NextResponse.json({ 
        error: 'Category parameter required for reset' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to reset chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}