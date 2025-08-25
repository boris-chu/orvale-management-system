/**
 * Public Chat Widget Settings API
 * GET - Retrieve widget configuration for display (no admin permissions required)
 */

import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbAll = promisify(db.all.bind(db));

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // This endpoint is public - no authentication required
    // It only returns widget display settings, not sensitive admin data
    
    // Get widget settings from chat_system_settings table
    const settings = await dbAll(
      `SELECT setting_key, setting_value, setting_type 
       FROM chat_system_settings 
       WHERE setting_key LIKE 'widget_%' 
       ORDER BY setting_key`,
      []
    ) as Array<{ setting_key: string; setting_value: string; setting_type: string }>;

    // Convert to widget settings format
    const widgetSettings = {
      enabled: false, // Default to disabled
      position: 'bottom-right',
      theme: 'light',
      shape: 'rounded-square', 
      primaryColor: '#1976d2',
      secondaryColor: '#6c757d'
    };

    // Apply database settings
    settings.forEach(setting => {
      const key = setting.setting_key.replace('widget_', '');
      let value: string | boolean = setting.setting_value;
      
      // Convert types
      if (setting.setting_type === 'boolean') {
        value = value === 'true';
      }

      // Map to widget settings
      if (key === 'enabled') {
        widgetSettings.enabled = value as boolean;
      } else if (key === 'position') {
        widgetSettings.position = value as string;
      } else if (key === 'theme') {
        widgetSettings.theme = value as string;
      } else if (key === 'shape') {
        widgetSettings.shape = value as string;
      } else if (key === 'primary_color') {
        widgetSettings.primaryColor = value as string;
      } else if (key === 'secondary_color') {
        widgetSettings.secondaryColor = value as string;
      }
    });

    return NextResponse.json(widgetSettings);
  } catch (error) {
    console.error('Error in GET /api/chat/widget-settings:', error);
    
    // Return defaults on error - widget should still work
    return NextResponse.json({
      enabled: false, // Safe default
      position: 'bottom-right',
      theme: 'light',
      shape: 'rounded-square',
      primaryColor: '#1976d2',
      secondaryColor: '#6c757d'
    });
  }
}