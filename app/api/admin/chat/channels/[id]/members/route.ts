/**
 * Channel Members Management API
 * GET /api/admin/chat/channels/[id]/members - Get channel members
 * POST /api/admin/chat/channels/[id]/members - Add member to channel
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get channel members with user details
    const query = `
      SELECT 
        cm.user_id,
        cm.role,
        cm.joined_at,
        u.display_name,
        u.email,
        u.active,
        u.role as user_role
      FROM chat_channel_members cm
      JOIN users u ON cm.user_id = u.username
      WHERE cm.channel_id = ?
      ORDER BY cm.joined_at DESC
    `;

    return new Promise<Response>((resolve) => {
      db.all(query, [channelId], (err, members) => {
        if (err) {
          console.error('Database error fetching channel members:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          members,
          channel_id: channelId,
          member_count: members.length
        }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/admin/chat/channels/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const body = await request.json();
    const { user_id, role = 'member' } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user exists and is active
    const userCheckQuery = 'SELECT username, active FROM users WHERE username = ?';
    
    return new Promise<Response>((resolve) => {
      db.get(userCheckQuery, [user_id], (err, user: any) => {
        if (err) {
          console.error('Database error checking user:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        if (!user) {
          resolve(NextResponse.json({ error: 'User not found' }, { status: 404 }));
          return;
        }

        if (!user.active) {
          resolve(NextResponse.json({ error: 'User is inactive' }, { status: 400 }));
          return;
        }

        // Check if user is already a member
        const memberCheckQuery = 'SELECT user_id FROM chat_channel_members WHERE channel_id = ? AND user_id = ?';
        
        db.get(memberCheckQuery, [channelId, user_id], (checkErr, existingMember) => {
          if (checkErr) {
            console.error('Database error checking membership:', checkErr);
            resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
            return;
          }

          if (existingMember) {
            resolve(NextResponse.json({ error: 'User is already a member of this channel' }, { status: 409 }));
            return;
          }

          // Add user to channel
          const insertQuery = `
            INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `;

          db.run(insertQuery, [channelId, user_id, role], function(insertErr) {
            if (insertErr) {
              console.error('Database error adding member:', insertErr);
              resolve(NextResponse.json({ error: 'Failed to add member' }, { status: 500 }));
              return;
            }

            resolve(NextResponse.json({ 
              message: 'Member added successfully',
              channel_id: channelId,
              user_id: user_id,
              role: role
            }, { status: 201 }));
          });
        });
      });
    });
  } catch (error) {
    console.error('Error in POST /api/admin/chat/channels/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}