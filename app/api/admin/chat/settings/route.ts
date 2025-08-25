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
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = 'SELECT setting_key, setting_value, setting_type, description, category FROM chat_system_settings';
    const params: any[] = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, setting_key';

    const settings = await dbAll(query, params) as any[];

    // Convert to key-value object
    const settingsObject: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObject[setting.setting_key] = setting.setting_value;
    });

    return NextResponse.json(settingsObject);
  } catch (error) {
    console.error('Failed to retrieve chat settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a specific chat setting
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
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { setting_key, setting_value, setting_type = 'string' } = body;

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: setting_key and setting_value' 
      }, { status: 400 });
    }

    // Validate setting types
    const validTypes = ['string', 'number', 'boolean', 'json'];
    if (!validTypes.includes(setting_type)) {
      return NextResponse.json({ error: 'Invalid setting_type' }, { status: 400 });
    }

    // Special validation for Giphy settings
    if (setting_key.startsWith('giphy_')) {
      if (setting_key === 'giphy_content_rating') {
        const validRatings = ['g', 'pg', 'pg-13', 'r'];
        if (!validRatings.includes(setting_value)) {
          return NextResponse.json({ 
            error: 'Invalid content rating. Must be g, pg, pg-13, or r' 
          }, { status: 400 });
        }
      }

      if (setting_key === 'giphy_search_limit' || setting_key === 'giphy_rate_limit') {
        const numValue = parseInt(setting_value);
        if (isNaN(numValue) || numValue < 1 || numValue > 200) {
          return NextResponse.json({ 
            error: 'Numeric values must be between 1 and 200' 
          }, { status: 400 });
        }
      }
    }

    // Update or insert setting
    await dbRun(
      `INSERT OR REPLACE INTO chat_system_settings 
       (setting_key, setting_value, setting_type, updated_by, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [setting_key, setting_value.toString(), setting_type, authResult.user.username]
    );

    // Get the updated setting with metadata
    const updatedSetting = await dbGet(
      'SELECT * FROM chat_system_settings WHERE setting_key = ?',
      [setting_key]
    ) as any;

    return NextResponse.json({
      message: 'Setting updated successfully',
      setting: updatedSetting
    });

  } catch (error) {
    console.error('Failed to update chat setting:', error);
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