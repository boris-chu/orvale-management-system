/**
 * Admin Force Theme Compliance API
 * Forces all users to use system default themes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const db = new Database.Database(path.join(process.cwd(), 'orvale_tickets.db'));

// POST /api/admin/chat/force-theme-compliance - Force theme compliance
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!authResult.user.permissions?.includes('admin.manage_chat_settings') && 
        !authResult.user.permissions?.includes('chat.manage_system')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { internal_chat_theme, public_queue_theme } = await request.json();

    // Reset all user theme preferences to 'inherit'
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE user_theme_preferences 
        SET 
          internal_chat_theme = 'inherit',
          public_queue_theme = 'inherit',
          last_theme_change = CURRENT_TIMESTAMP,
          theme_change_count = theme_change_count + 1,
          updated_at = CURRENT_TIMESTAMP
      `, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    // Log compliance enforcement for each affected user
    const affectedUsers = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT username FROM user_theme_preferences 
        WHERE internal_chat_theme != 'inherit' OR public_queue_theme != 'inherit'
      `, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Log theme changes for audit
    for (const user of affectedUsers) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO user_theme_change_log (
            username,
            old_theme,
            new_theme,
            interface_type,
            change_reason,
            ip_address,
            user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          user.username,
          'custom',
          'inherit',
          'both',
          'admin_compliance_enforcement',
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown'
        ], (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    }

    // Update admin settings to enable force compliance
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE chat_ui_settings 
        SET 
          force_theme_compliance = 1,
          theme_preset = ?,
          public_queue_theme_preset = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [internal_chat_theme, public_queue_theme], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    console.log(`Theme compliance enforced by admin: ${authResult.user.username}. Affected ${affectedUsers.length} users.`);

    return NextResponse.json({ 
      success: true, 
      message: `Theme compliance enforced successfully. ${affectedUsers.length} users affected.`,
      affectedUsers: affectedUsers.length,
      enforcedThemes: {
        internal_chat: internal_chat_theme,
        public_queue: public_queue_theme
      }
    });

  } catch (error) {
    console.error('Error enforcing theme compliance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}