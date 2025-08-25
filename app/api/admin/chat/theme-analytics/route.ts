/**
 * Admin Chat Theme Analytics API
 * Provides analytics on theme usage across the system
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const db = new Database.Database(path.join(process.cwd(), 'orvale_tickets.db'));

// GET /api/admin/chat/theme-analytics - Get theme usage analytics
export async function GET(request: NextRequest) {
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

    // Get total user count
    const totalUsers = await new Promise<number>((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE active = 1
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get users with custom themes (not 'inherit')
    const customThemeUsers = await new Promise<number>((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM user_theme_preferences 
        WHERE internal_chat_theme != 'inherit' 
           OR public_queue_theme != 'inherit'
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    // Get theme distribution
    const themeDistribution = await new Promise<any[]>((resolve, reject) => {
      db.all(`
        SELECT 
          CASE 
            WHEN internal_chat_theme = 'inherit' THEN 'system-default'
            ELSE internal_chat_theme 
          END as theme,
          COUNT(*) as count
        FROM user_theme_preferences
        GROUP BY theme
        UNION ALL
        SELECT 'system-default' as theme, 
               (${totalUsers} - (SELECT COUNT(*) FROM user_theme_preferences)) as count
        WHERE (SELECT COUNT(*) FROM user_theme_preferences) < ${totalUsers}
        ORDER BY count DESC
      `, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          // Filter out zero counts and merge duplicates
          const filtered = rows.filter(row => row.count > 0);
          const merged = filtered.reduce((acc, row) => {
            const existing = acc.find(item => item.theme === row.theme);
            if (existing) {
              existing.count += row.count;
            } else {
              acc.push(row);
            }
            return acc;
          }, [] as any[]);
          resolve(merged.sort((a, b) => b.count - a.count));
        }
      });
    });

    // Find most popular theme
    const mostPopularTheme = themeDistribution.length > 0 
      ? themeDistribution[0].theme 
      : 'light';

    // Get recent theme changes (last 30 days)
    const recentChanges = await new Promise<number>((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count 
        FROM user_theme_change_log 
        WHERE created_at >= datetime('now', '-30 days')
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    return NextResponse.json({
      totalUsers,
      usingCustomThemes: customThemeUsers,
      mostPopularTheme,
      themeDistribution,
      recentChanges,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching theme analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}