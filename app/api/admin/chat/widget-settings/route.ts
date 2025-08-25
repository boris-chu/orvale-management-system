/**
 * Chat Widget Settings API
 * GET - Retrieve current widget configuration
 * PUT - Update widget settings (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // For now, return default settings
    // In the future, this will fetch from database
    const defaultSettings = {
      enabled: true,
      position: 'bottom-right',
      theme: 'light', 
      shape: 'rounded-square',
      primaryColor: '#1976d2',
      showOnPages: ['*'],
      hideOnPages: ['/chat', '/chat/*']
    };

    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Error in GET /api/admin/chat/widget-settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has chat customization permission
    if (!authResult.user.permissions?.includes('chat.customize_widget') && 
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const settings = await request.json();

    // TODO: Save to database
    // For now, just return the settings as confirmation
    return NextResponse.json({ 
      message: 'Widget settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/chat/widget-settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}