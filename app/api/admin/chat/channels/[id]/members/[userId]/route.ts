/**
 * Remove Channel Member API
 * DELETE /api/admin/chat/channels/[id]/members/[userId] - Remove member from channel
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
): Promise<Response> {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.manage_chat_channels')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const channelId = params.id;
    const userId = params.userId;

    // Check if member exists in channel
    const memberCheckQuery = 'SELECT user_id, role FROM chat_channel_members WHERE channel_id = ? AND user_id = ?';
    
    return new Promise<Response>((resolve) => {
      db.get(memberCheckQuery, [channelId, userId], (err, member: any) => {
        if (err) {
          console.error('Database error checking member:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        if (!member) {
          resolve(NextResponse.json({ error: 'Member not found in this channel' }, { status: 404 }));
          return;
        }

        // Prevent removing channel owners (optional safety check)
        if (member.role === 'owner') {
          resolve(NextResponse.json({ error: 'Cannot remove channel owner. Transfer ownership first.' }, { status: 400 }));
          return;
        }

        // Remove member from channel
        const deleteQuery = 'DELETE FROM chat_channel_members WHERE channel_id = ? AND user_id = ?';
        
        db.run(deleteQuery, [channelId, userId], function(deleteErr) {
          if (deleteErr) {
            console.error('Database error removing member:', deleteErr);
            resolve(NextResponse.json({ error: 'Failed to remove member' }, { status: 500 }));
            return;
          }

          if (this.changes === 0) {
            resolve(NextResponse.json({ error: 'Member not found or already removed' }, { status: 404 }));
            return;
          }

          resolve(NextResponse.json({ 
            message: 'Member removed successfully',
            channel_id: channelId,
            user_id: userId,
            removed_by: authResult.user.username
          }));
        });
      });
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/chat/channels/[id]/members/[userId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}