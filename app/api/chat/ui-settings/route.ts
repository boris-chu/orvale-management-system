/**
 * Chat UI Settings API - Provides UI customization settings for chat components
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'orvale_tickets.db'));

// Default UI settings
const defaultSettings = {
  show_unread_badges: true,
  unread_badge_color: '#dc3545',
  show_channel_member_count: false,
  show_typing_indicators: true,
  show_online_status: true,
  message_grouping_enabled: true,
  timestamp_format: 'relative',
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get all UI-related settings from database
    const settings = db.prepare(`
      SELECT setting_key, setting_value 
      FROM chat_system_settings 
      WHERE setting_key IN (
        'show_unread_badges',
        'unread_badge_color', 
        'show_channel_member_count',
        'show_typing_indicators',
        'show_online_status',
        'message_grouping_enabled',
        'timestamp_format'
      )
    `).all() as Array<{ setting_key: string; setting_value: string }>;

    // Convert to object format
    const settingsObj = settings.reduce((acc, setting) => {
      const key = setting.setting_key;
      let value: any = setting.setting_value;
      
      // Parse boolean values
      if (['show_unread_badges', 'show_channel_member_count', 'show_typing_indicators', 
           'show_online_status', 'message_grouping_enabled'].includes(key)) {
        value = value === 'true';
      }
      
      acc[key] = value;
      return acc;
    }, {} as Record<string, any>);

    // Merge with defaults to ensure all keys exist
    const finalSettings = { ...defaultSettings, ...settingsObj };

    return NextResponse.json(finalSettings);
  } catch (error) {
    console.error('Error fetching UI settings:', error);
    return NextResponse.json(defaultSettings);
  }
}