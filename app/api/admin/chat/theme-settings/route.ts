/**
 * Admin Chat Theme Settings API
 * Manages system-wide theme defaults and user customization policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const db = new Database.Database(path.join(process.cwd(), 'orvale_tickets.db'));

// GET /api/admin/chat/theme-settings - Get admin theme settings
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get current theme settings
    const settings = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          theme_preset,
          custom_theme_json,
          public_queue_theme_preset,
          public_queue_custom_theme_json,
          allow_user_customization,
          available_themes_json,
          force_theme_compliance,
          theme_change_frequency_limit
        FROM chat_ui_settings 
        WHERE id = 1
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        internal_chat_theme: 'light',
        public_queue_theme: 'light',
        allow_user_customization: true,
        available_themes: ['light', 'iphone', 'darcula', 'github', 'slack'],
        force_theme_compliance: false,
        theme_change_frequency_limit: 'daily',
        custom_theme_json: '{}',
        public_queue_custom_theme_json: '{}'
      });
    }

    const settingsData = settings as any;
    
    // Parse JSON fields safely
    let availableThemes;
    try {
      availableThemes = JSON.parse(settingsData.available_themes_json || '["light","iphone","darcula","github","slack"]');
    } catch {
      availableThemes = ['light', 'iphone', 'darcula', 'github', 'slack'];
    }

    return NextResponse.json({
      internal_chat_theme: settingsData.theme_preset || 'light',
      public_queue_theme: settingsData.public_queue_theme_preset || 'light',
      allow_user_customization: settingsData.allow_user_customization !== false,
      available_themes: availableThemes,
      force_theme_compliance: settingsData.force_theme_compliance === true,
      theme_change_frequency_limit: settingsData.theme_change_frequency_limit || 'daily',
      custom_theme_json: settingsData.custom_theme_json || '{}',
      public_queue_custom_theme_json: settingsData.public_queue_custom_theme_json || '{}'
    });

  } catch (error) {
    console.error('Error fetching admin theme settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/chat/theme-settings - Update admin theme settings
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const updates = await request.json();
    
    // Validate theme names
    const validThemes = ['light', 'iphone', 'darcula', 'github', 'slack'];
    if (updates.internal_chat_theme && !validThemes.includes(updates.internal_chat_theme)) {
      return NextResponse.json({ error: 'Invalid internal chat theme' }, { status: 400 });
    }
    if (updates.public_queue_theme && !validThemes.includes(updates.public_queue_theme)) {
      return NextResponse.json({ error: 'Invalid public queue theme' }, { status: 400 });
    }

    // Validate available themes array
    if (updates.available_themes) {
      if (!Array.isArray(updates.available_themes)) {
        return NextResponse.json({ error: 'Available themes must be an array' }, { status: 400 });
      }
      for (const theme of updates.available_themes) {
        if (!validThemes.includes(theme)) {
          return NextResponse.json({ error: `Invalid theme: ${theme}` }, { status: 400 });
        }
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (updates.internal_chat_theme !== undefined) {
      updateFields.push('theme_preset = ?');
      updateValues.push(updates.internal_chat_theme);
    }
    if (updates.public_queue_theme !== undefined) {
      updateFields.push('public_queue_theme_preset = ?');
      updateValues.push(updates.public_queue_theme);
    }
    if (updates.custom_theme_json !== undefined) {
      updateFields.push('custom_theme_json = ?');
      updateValues.push(updates.custom_theme_json);
    }
    if (updates.public_queue_custom_theme_json !== undefined) {
      updateFields.push('public_queue_custom_theme_json = ?');
      updateValues.push(updates.public_queue_custom_theme_json);
    }
    if (updates.allow_user_customization !== undefined) {
      updateFields.push('allow_user_customization = ?');
      updateValues.push(updates.allow_user_customization ? 1 : 0);
    }
    if (updates.available_themes !== undefined) {
      updateFields.push('available_themes_json = ?');
      updateValues.push(JSON.stringify(updates.available_themes));
    }
    if (updates.force_theme_compliance !== undefined) {
      updateFields.push('force_theme_compliance = ?');
      updateValues.push(updates.force_theme_compliance ? 1 : 0);
    }
    if (updates.theme_change_frequency_limit !== undefined) {
      updateFields.push('theme_change_frequency_limit = ?');
      updateValues.push(updates.theme_change_frequency_limit);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    // Add updated timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    // Execute update
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE chat_ui_settings 
        SET ${updateFields.join(', ')}
        WHERE id = 1
      `, updateValues, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    // Log the change
    console.log(`Theme settings updated by admin: ${authResult.user.username}`, updates);

    return NextResponse.json({ success: true, message: 'Theme settings updated successfully' });

  } catch (error) {
    console.error('Error updating admin theme settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}