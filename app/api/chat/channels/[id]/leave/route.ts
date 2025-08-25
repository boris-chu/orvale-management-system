/**
 * Channel Leave API
 * POST /api/chat/channels/[id]/leave - Leave channel
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const channelId = params.id;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // Check if user is a member and get their role
    const memberQuery = `
      SELECT cm.user_id, cm.role, c.name as channel_name
      FROM chat_channel_members cm
      JOIN chat_channels c ON cm.channel_id = c.id
      WHERE cm.channel_id = ? AND cm.user_id = ?
    `;

    const membership: any = await new Promise((resolve) => {
      db.get(memberQuery, [channelId, user.username], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this channel' }, { status: 400 });
    }

    // Check if user is the owner - prevent leaving if they're the only owner
    if (membership.role === 'owner') {
      const ownerCountQuery = `
        SELECT COUNT(*) as owner_count 
        FROM chat_channel_members 
        WHERE channel_id = ? AND role = 'owner'
      `;

      const ownerCount: any = await new Promise((resolve) => {
        db.get(ownerCountQuery, [channelId], (err, row) => {
          resolve(err ? { owner_count: 0 } : row);
        });
      });

      if (ownerCount.owner_count <= 1) {
        return NextResponse.json({ 
          error: 'Cannot leave channel as the only owner. Transfer ownership first.' 
        }, { status: 400 });
      }
    }

    // Remove user from channel
    const leaveQuery = `
      DELETE FROM chat_channel_members 
      WHERE channel_id = ? AND user_id = ?
    `;

    return new Promise((resolve) => {
      db.run(leaveQuery, [channelId, user.username], function(err) {
        if (err) {
          console.error('Database error leaving channel:', err);
          resolve(NextResponse.json({ error: 'Failed to leave channel' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Successfully left channel',
          channelId: parseInt(channelId),
          channelName: membership.channel_name
        }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/chat/channels/[id]/leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}