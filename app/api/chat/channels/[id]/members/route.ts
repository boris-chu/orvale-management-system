/**
 * Channel Members API
 * GET /api/chat/channels/[id]/members - Get channel members
 * POST /api/chat/channels/[id]/members - Add members to channel
 * DELETE /api/chat/channels/[id]/members - Remove members from channel
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: channelId } = await params;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // Check if user is a member of the channel or has manage permissions
    const memberQuery = `
      SELECT role FROM chat_channel_members 
      WHERE channel_id = ? AND user_id = ?
    `;
    
    const userRole: any = await new Promise((resolve) => {
      db.get(memberQuery, [channelId, user.username], (err, row) => {
        resolve(err ? null : row);
      });
    });

    const hasManagePermission = user.permissions?.includes('chat.manage_channels');

    if (!userRole && !hasManagePermission) {
      return NextResponse.json({ error: 'Not a member of this channel' }, { status: 403 });
    }

    // Get channel members with user information
    const membersQuery = `
      SELECT 
        u.username,
        u.display_name,
        u.profile_picture,
        u.role_id,
        cm.role as channel_role,
        cm.joined_at,
        up.status,
        up.last_active,
        up.status_message
      FROM chat_channel_members cm
      JOIN users u ON cm.user_id = u.username
      LEFT JOIN user_presence up ON u.username = up.username
      WHERE cm.channel_id = ? AND cm.active = 1
      ORDER BY 
        CASE cm.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'moderator' THEN 3 
          ELSE 4 
        END,
        u.display_name
    `;

    return new Promise<NextResponse>((resolve) => {
      db.all(membersQuery, [channelId], (err, rows) => {
        if (err) {
          console.error('Database error fetching channel members:', err);
          resolve(NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 }));
          return;
        }

        const members = (rows as any[]).map(row => ({
          username: row.username,
          display_name: row.display_name,
          profile_picture: row.profile_picture,
          role_id: row.role_id,
          channel_role: row.channel_role,
          joined_at: row.joined_at,
          presence: {
            status: row.status || 'offline',
            last_active: row.last_active,
            status_message: row.status_message
          }
        }));

        resolve(NextResponse.json({ 
          members,
          total: members.length
        }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/chat/channels/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: channelId } = await params;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { usernames, role = 'member' } = body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: 'usernames array is required' }, { status: 400 });
    }

    // Check if user has permission to add members
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

    // Add members to channel
    const addMemberQuery = `
      INSERT OR REPLACE INTO chat_channel_members 
      (channel_id, user_id, role, joined_at, active)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
    `;

    const addResults = await Promise.all(
      usernames.map(username => 
        new Promise<{ username: string; success: boolean; error?: string }>((resolve) => {
          db.run(addMemberQuery, [channelId, username, role], function(err) {
            if (err) {
              resolve({ username, success: false, error: err.message });
            } else {
              resolve({ username, success: true });
            }
          });
        })
      )
    );

    const successful = addResults.filter(r => r.success);
    const failed = addResults.filter(r => !r.success);

    return NextResponse.json({
      message: `Added ${successful.length} member(s) to channel`,
      added: successful.map(r => r.username),
      failed: failed.length > 0 ? failed : undefined
    });

  } catch (error) {
    console.error('Error in POST /api/chat/channels/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: channelId } = await params;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'username is required' }, { status: 400 });
    }

    // Check if user has permission to remove members
    const hasPermission = user.permissions?.includes('chat.manage_channels');
    
    if (!hasPermission && username !== user.username) {
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

    // Remove member from channel (soft delete)
    const removeMemberQuery = `
      UPDATE chat_channel_members 
      SET active = 0, left_at = CURRENT_TIMESTAMP
      WHERE channel_id = ? AND user_id = ? AND active = 1
    `;

    return new Promise<NextResponse>((resolve) => {
      db.run(removeMemberQuery, [channelId, username], function(err) {
        if (err) {
          console.error('Database error removing member:', err);
          resolve(NextResponse.json({ error: 'Failed to remove member' }, { status: 500 }));
          return;
        }

        if (this.changes === 0) {
          resolve(NextResponse.json({ error: 'Member not found in channel' }, { status: 404 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Member removed successfully',
          username
        }));
      });
    });

  } catch (error) {
    console.error('Error in DELETE /api/chat/channels/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}