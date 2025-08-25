/**
 * User Theme Preferences API
 * Manages individual user theme preferences and accessibility settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const db = new Database.Database(path.join(process.cwd(), 'orvale_tickets.db'));

// GET /api/chat/user-theme-preferences - Get user's theme preferences
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authResult.user.username;

    // Get user's theme preferences
    const preferences = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          internal_chat_theme,
          public_queue_theme,
          custom_theme_json,
          high_contrast_mode,
          reduce_animations,
          font_size_multiplier,
          last_theme_change,
          theme_change_count
        FROM user_theme_preferences
        WHERE username = ?
      `, [username], (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!preferences) {
      // Return defaults for new user
      return NextResponse.json({
        internal_chat_theme: 'inherit',
        public_queue_theme: 'inherit',
        custom_theme_json: '{}',
        high_contrast_mode: false,
        reduce_animations: false,
        font_size_multiplier: 1.0,
        last_theme_change: null,
        theme_change_count: 0
      });
    }

    const prefs = preferences as any;

    return NextResponse.json({
      internal_chat_theme: prefs.internal_chat_theme || 'inherit',
      public_queue_theme: prefs.public_queue_theme || 'inherit',
      custom_theme_json: prefs.custom_theme_json || '{}',
      high_contrast_mode: prefs.high_contrast_mode === 1,
      reduce_animations: prefs.reduce_animations === 1,
      font_size_multiplier: prefs.font_size_multiplier || 1.0,
      last_theme_change: prefs.last_theme_change,
      theme_change_count: prefs.theme_change_count || 0
    });

  } catch (error) {
    console.error('Error fetching user theme preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/chat/user-theme-preferences - Update user's theme preferences
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = authResult.user.username;

    // Check if user customization is allowed
    const adminSettings = await new Promise((resolve, reject) => {
      db.get(`
        SELECT allow_user_customization, force_theme_compliance 
        FROM chat_ui_settings 
        WHERE id = 1
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const settings = adminSettings as any;
    if (settings && settings.allow_user_customization === 0) {
      return NextResponse.json({ 
        error: 'Theme customization is disabled by administrator' 
      }, { status: 403 });
    }

    // Parse request body
    const updates = await request.json();
    
    // Validate theme names
    const validThemes = ['inherit', 'light', 'iphone', 'darcula', 'github', 'slack'];
    if (updates.internal_chat_theme && !validThemes.includes(updates.internal_chat_theme)) {
      return NextResponse.json({ error: 'Invalid internal chat theme' }, { status: 400 });
    }
    if (updates.public_queue_theme && !validThemes.includes(updates.public_queue_theme)) {
      return NextResponse.json({ error: 'Invalid public queue theme' }, { status: 400 });
    }

    // Validate font size multiplier
    if (updates.font_size_multiplier !== undefined) {
      const size = parseFloat(updates.font_size_multiplier);
      if (isNaN(size) || size < 0.8 || size > 1.5) {
        return NextResponse.json({ 
          error: 'Font size multiplier must be between 0.8 and 1.5' 
        }, { status: 400 });
      }
    }

    // Check if user preferences record exists
    const existingRecord = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id FROM user_theme_preferences WHERE username = ?
      `, [username], (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingRecord) {
      // Create new record
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO user_theme_preferences (
            username,
            internal_chat_theme,
            public_queue_theme,
            custom_theme_json,
            high_contrast_mode,
            reduce_animations,
            font_size_multiplier,
            last_theme_change,
            theme_change_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
        `, [
          username,
          updates.internal_chat_theme || 'inherit',
          updates.public_queue_theme || 'inherit',
          updates.custom_theme_json || '{}',
          updates.high_contrast_mode ? 1 : 0,
          updates.reduce_animations ? 1 : 0,
          updates.font_size_multiplier || 1.0
        ], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    } else {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (updates.internal_chat_theme !== undefined) {
        updateFields.push('internal_chat_theme = ?');
        updateValues.push(updates.internal_chat_theme);
      }
      if (updates.public_queue_theme !== undefined) {
        updateFields.push('public_queue_theme = ?');
        updateValues.push(updates.public_queue_theme);
      }
      if (updates.custom_theme_json !== undefined) {
        updateFields.push('custom_theme_json = ?');
        updateValues.push(updates.custom_theme_json);
      }
      if (updates.high_contrast_mode !== undefined) {
        updateFields.push('high_contrast_mode = ?');
        updateValues.push(updates.high_contrast_mode ? 1 : 0);
      }
      if (updates.reduce_animations !== undefined) {
        updateFields.push('reduce_animations = ?');
        updateValues.push(updates.reduce_animations ? 1 : 0);
      }
      if (updates.font_size_multiplier !== undefined) {
        updateFields.push('font_size_multiplier = ?');
        updateValues.push(updates.font_size_multiplier);
      }

      if (updateFields.length > 0) {
        updateFields.push('last_theme_change = CURRENT_TIMESTAMP');
        updateFields.push('theme_change_count = theme_change_count + 1');
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        updateValues.push(username);

        // Execute update
        await new Promise((resolve, reject) => {
          db.run(`
            UPDATE user_theme_preferences 
            SET ${updateFields.join(', ')}
            WHERE username = ?
          `, updateValues, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          });
        });
      }
    }

    // Log the theme change
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO user_theme_change_log (
          username,
          old_theme,
          new_theme,
          interface_type,
          change_reason
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        username,
        'previous', // Would need to track previous theme
        updates.internal_chat_theme || updates.public_queue_theme || 'unknown',
        updates.internal_chat_theme ? 'internal_chat' : 'public_queue',
        'user_preference'
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    console.log(`User ${username} updated theme preferences:`, updates);

    return NextResponse.json({ 
      success: true, 
      message: 'Theme preferences updated successfully' 
    });

  } catch (error) {
    console.error('Error updating user theme preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}