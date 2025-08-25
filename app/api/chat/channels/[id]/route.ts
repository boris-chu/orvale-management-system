/**
 * Individual Channel API
 * PUT /api/chat/channels/[id] - Update channel
 * DELETE /api/chat/channels/[id] - Delete channel
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const channelId = params.id;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { name, description, is_read_only, allow_posting } = body;

    // Check if user has permission to manage channels or is channel admin/owner
    const hasPermission = user.permissions?.includes('chat.manage_channels');
    
    if (!hasPermission) {
      // Check if user is admin/owner of this specific channel
      const roleQuery = `
        SELECT role FROM chat_channel_members 
        WHERE channel_id = ? AND user_id = ? AND role IN ('admin', 'owner', 'moderator')
      `;
      
      const userRole: any = await new Promise((resolve) => {
        db.get(roleQuery, [channelId, user.username], (err, row) => {
          resolve(err ? null : row);
        });
      });

      if (!userRole) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Update channel
    const updateQuery = `
      UPDATE chat_channels 
      SET name = COALESCE(?, name), 
          description = COALESCE(?, description),
          is_read_only = COALESCE(?, is_read_only),
          allow_posting = COALESCE(?, allow_posting),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND active = 1
    `;

    return new Promise((resolve) => {
      db.run(updateQuery, [name, description, is_read_only, allow_posting, channelId], function(err) {
        if (err) {
          console.error('Database error updating channel:', err);
          resolve(NextResponse.json({ error: 'Failed to update channel' }, { status: 500 }));
          return;
        }

        if (this.changes === 0) {
          resolve(NextResponse.json({ error: 'Channel not found' }, { status: 404 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Channel updated successfully',
          changes: this.changes
        }));
      });
    });
  } catch (error) {
    console.error('Error in PUT /api/chat/channels/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const channelId = params.id;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions for channel deletion
    if (!authResult.user.permissions?.includes('chat.manage_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { user } = authResult;

    // Soft delete channel (set active = 0)
    const deleteQuery = `
      UPDATE chat_channels 
      SET active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND active = 1
    `;

    return new Promise((resolve) => {
      db.run(deleteQuery, [channelId], function(err) {
        if (err) {
          console.error('Database error deleting channel:', err);
          resolve(NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 }));
          return;
        }

        if (this.changes === 0) {
          resolve(NextResponse.json({ error: 'Channel not found' }, { status: 404 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Channel deleted successfully',
          channelId: parseInt(channelId)
        }));
      });
    });
  } catch (error) {
    console.error('Error in DELETE /api/chat/channels/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}