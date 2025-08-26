import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

// GET - Fetch WebSocket system settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      db.get(
        'SELECT websocket_unlimited_mode FROM system_settings WHERE id = 1',
        (err, row) => {
          db.close();
          
          if (err) {
            console.error('Database error:', err);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          const settings = {
            websocket_unlimited_mode: row?.websocket_unlimited_mode || 0
          };

          resolve(NextResponse.json(settings));
        }
      );
    });
  } catch (error) {
    console.error('WebSocket settings fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update WebSocket system settings
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { websocket_unlimited_mode } = await request.json();
    const db = new Database.Database(dbPath);

    return new Promise((resolve) => {
      const sql = `
        UPDATE system_settings 
        SET websocket_unlimited_mode = ? 
        WHERE id = 1
      `;

      db.run(sql, [websocket_unlimited_mode ? 1 : 0], function(err) {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        console.log(`🔧 WebSocket unlimited mode ${websocket_unlimited_mode ? 'ENABLED' : 'DISABLED'} by ${authResult.user.username}`);
        
        resolve(NextResponse.json({ 
          success: true, 
          message: `WebSocket unlimited mode ${websocket_unlimited_mode ? 'enabled' : 'disabled'}`,
          websocket_unlimited_mode: websocket_unlimited_mode ? 1 : 0
        }));
      });
    });
  } catch (error) {
    console.error('WebSocket settings update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}