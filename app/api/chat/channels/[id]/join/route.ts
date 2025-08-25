/**
 * Channel Join API
 * POST /api/chat/channels/[id]/join - Join channel
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // Check if channel exists and is active
    const channelQuery = `
      SELECT id, name, type, active FROM chat_channels 
      WHERE id = ? AND active = 1
    `;

    const channel: any = await new Promise((resolve) => {
      db.get(channelQuery, [channelId], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if user is already a member
    const memberQuery = `
      SELECT user_id FROM chat_channel_members 
      WHERE channel_id = ? AND user_id = ?
    `;

    const existingMember: any = await new Promise((resolve) => {
      db.get(memberQuery, [channelId, user.username], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member of this channel' }, { status: 400 });
    }

    // For private channels, check if user has permission or invitation
    if (channel.type === 'private_channel') {
      // For now, allow if user has channel management permission
      // In the future, this could check for invitations
      if (!user.permissions?.includes('chat.manage_channels')) {
        return NextResponse.json({ error: 'Cannot join private channel without invitation' }, { status: 403 });
      }
    }

    // Add user to channel
    const joinQuery = `
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
      VALUES (?, ?, 'member', CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve) => {
      db.run(joinQuery, [channelId, user.username], function(err) {
        if (err) {
          console.error('Database error joining channel:', err);
          resolve(NextResponse.json({ error: 'Failed to join channel' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Successfully joined channel',
          channelId: parseInt(channelId),
          channelName: channel.name,
          role: 'member'
        }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/chat/channels/[id]/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}