/**
 * GIF Usage Tracking API - Log GIF sends for rate limiting and analytics
 * Tracks which GIFs are sent by users and enforces hourly limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

// Initialize usage tracking table
const initializeUsageTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS gif_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      gif_id TEXT NOT NULL,
      gif_url TEXT,
      gif_title TEXT,
      channel_id TEXT, -- Which chat channel/DM the GIF was sent to
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(username)
    );
  `;

  await dbRun(createTableSQL);

  // Create indexes for performance
  await dbRun('CREATE INDEX IF NOT EXISTS idx_gif_usage_user_time ON gif_usage_log(user_id, sent_at);');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_gif_usage_gif_id ON gif_usage_log(gif_id);');
};

const initializeRateLimitTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS gif_rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      gif_count INTEGER DEFAULT 0,
      reset_time TIMESTAMP NOT NULL,
      last_gif_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(username),
      UNIQUE(user_id, reset_time)
    );
  `;

  await dbRun(createTableSQL);
};

// POST - Log a GIF send and update rate limits
export async function POST(request: NextRequest) {
  try {
    await initializeUsageTable();
    await initializeRateLimitTable();

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gif_id, gif_url, gif_title, channel_id } = body;

    if (!gif_id) {
      return NextResponse.json({ error: 'gif_id is required' }, { status: 400 });
    }

    const userId = authResult.user.username;
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0); // Round to current hour

    // Get current rate limit setting
    const rateLimitSetting = await dbGet(
      'SELECT setting_value FROM chat_system_settings WHERE setting_key = ?',
      ['giphy_rate_limit']
    ) as any;

    const rateLimit = parseInt(rateLimitSetting?.setting_value || '50');

    // Check current usage for this hour
    const currentUsage = await dbGet(
      'SELECT gif_count FROM gif_rate_limits WHERE user_id = ? AND reset_time = ?',
      [userId, currentHour.toISOString()]
    ) as any;

    const currentCount = currentUsage?.gif_count || 0;

    // Check if user has exceeded rate limit
    if (currentCount >= rateLimit) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        rate_limit: rateLimit,
        current_count: currentCount,
        reset_time: new Date(currentHour.getTime() + 60 * 60 * 1000).toISOString()
      }, { status: 429 });
    }

    // Get client info for logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log the GIF usage
    await dbRun(
      `INSERT INTO gif_usage_log 
       (user_id, gif_id, gif_url, gif_title, channel_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, gif_id, gif_url || '', gif_title || '', channel_id || '', clientIP, userAgent]
    );

    // Update or create rate limit entry
    await dbRun(
      `INSERT OR REPLACE INTO gif_rate_limits 
       (user_id, gif_count, reset_time, last_gif_id, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, currentCount + 1, currentHour.toISOString(), gif_id]
    );

    const remaining = Math.max(0, rateLimit - (currentCount + 1));

    return NextResponse.json({
      success: true,
      message: 'GIF usage logged successfully',
      rate_limit_status: {
        rate_limit: rateLimit,
        current_count: currentCount + 1,
        remaining: remaining,
        reset_time: new Date(currentHour.getTime() + 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to log GIF usage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Retrieve GIF usage analytics (admin only)
export async function GET(request: NextRequest) {
  try {
    await initializeUsageTable();

    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for analytics
    if (!authResult.user.permissions?.includes('admin.view_chat_analytics') && 
        !authResult.user.permissions?.includes('admin.manage_chat_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const userId = searchParams.get('user_id');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let whereClause = 'WHERE sent_at >= ? AND sent_at <= ?';
    const params: any[] = [startDate.toISOString(), endDate.toISOString()];

    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    // Get usage statistics
    const totalUsage = await dbGet(
      `SELECT COUNT(*) as total_gifs, COUNT(DISTINCT user_id) as unique_users
       FROM gif_usage_log ${whereClause}`,
      params
    ) as any;

    // Get top GIFs
    const topGifs = await dbAll(
      `SELECT gif_id, gif_title, COUNT(*) as usage_count
       FROM gif_usage_log ${whereClause}
       GROUP BY gif_id, gif_title
       ORDER BY usage_count DESC
       LIMIT 10`,
      params
    ) as any[];

    // Get top users
    const topUsers = await dbAll(
      `SELECT user_id, COUNT(*) as gif_count
       FROM gif_usage_log ${whereClause}
       GROUP BY user_id
       ORDER BY gif_count DESC
       LIMIT 10`,
      params
    ) as any[];

    // Get hourly distribution
    const hourlyDistribution = await dbAll(
      `SELECT 
         strftime('%H', sent_at) as hour,
         COUNT(*) as count
       FROM gif_usage_log ${whereClause}
       GROUP BY strftime('%H', sent_at)
       ORDER BY hour`,
      params
    ) as any[];

    // Get daily distribution
    const dailyDistribution = await dbAll(
      `SELECT 
         DATE(sent_at) as date,
         COUNT(*) as count
       FROM gif_usage_log ${whereClause}
       GROUP BY DATE(sent_at)
       ORDER BY date`,
      params
    ) as any[];

    return NextResponse.json({
      period: {
        days: days,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      },
      summary: {
        total_gifs: totalUsage.total_gifs,
        unique_users: totalUsage.unique_users,
        avg_gifs_per_user: totalUsage.unique_users > 0 ? 
          Math.round(totalUsage.total_gifs / totalUsage.unique_users * 100) / 100 : 0
      },
      top_gifs: topGifs,
      top_users: topUsers,
      hourly_distribution: hourlyDistribution,
      daily_distribution: dailyDistribution
    });

  } catch (error) {
    console.error('Failed to retrieve GIF analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}