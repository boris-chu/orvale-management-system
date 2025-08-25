/**
 * GIF Rate Limit API - Track and enforce Giphy usage limits per user
 * Prevents abuse and manages API quota consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

// Initialize rate limiting table
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

  // Create index for performance
  await dbRun('CREATE INDEX IF NOT EXISTS idx_gif_rate_limits_user_reset ON gif_rate_limits(user_id, reset_time);');
};

// GET - Check current rate limit status for user
export async function GET(request: NextRequest) {
  try {
    await initializeRateLimitTable();

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get current usage for this hour
    const usage = await dbGet(
      'SELECT gif_count, reset_time FROM gif_rate_limits WHERE user_id = ? AND reset_time = ?',
      [userId, currentHour.toISOString()]
    ) as any;

    const currentCount = usage?.gif_count || 0;
    const remaining = Math.max(0, rateLimit - currentCount);
    
    // Calculate next reset time (next hour)
    const nextReset = new Date(currentHour);
    nextReset.setHours(nextReset.getHours() + 1);

    return NextResponse.json({
      rate_limit: rateLimit,
      current_count: currentCount,
      remaining: remaining,
      reset_time: nextReset.toISOString(),
      can_send: remaining > 0
    });

  } catch (error) {
    console.error('Failed to check rate limit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}