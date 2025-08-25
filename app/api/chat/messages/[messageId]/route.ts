/**
 * Individual Message API
 * PUT /api/chat/messages/[messageId] - Edit message
 * DELETE /api/chat/messages/[messageId] - Delete message
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    // Get message info and check edit permissions
    const messageQuery = `
      SELECT 
        m.id, m.user_id, m.message_text, m.can_edit_until, m.is_deleted,
        c.type as channel_type
      FROM chat_messages m
      JOIN chat_channels c ON m.channel_id = c.id
      WHERE m.id = ?
    `;

    const messageInfo: any = await new Promise((resolve) => {
      db.get(messageQuery, [messageId], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!messageInfo) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (messageInfo.is_deleted) {
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 });
    }

    // Check if user can edit this message
    const isOwner = messageInfo.user_id === user.username;
    const canEditAny = user.permissions?.includes('chat.edit_own_messages');
    const withinTimeLimit = new Date() < new Date(messageInfo.can_edit_until);

    if (!isOwner) {
      return NextResponse.json({ error: 'Can only edit your own messages' }, { status: 403 });
    }

    if (!canEditAny) {
      return NextResponse.json({ error: 'Insufficient permissions to edit messages' }, { status: 403 });
    }

    if (!withinTimeLimit) {
      return NextResponse.json({ error: 'Message edit window has expired' }, { status: 400 });
    }

    // Update message
    const updateQuery = `
      UPDATE chat_messages 
      SET message_text = ?, edited_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return new Promise((resolve) => {
      db.run(updateQuery, [message, messageId], function(err) {
        if (err) {
          console.error('Database error updating message:', err);
          resolve(NextResponse.json({ error: 'Failed to update message' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Message updated successfully',
          messageId: parseInt(messageId)
        }));
      });
    });
  } catch (error) {
    console.error('Error in PUT /api/chat/messages/[messageId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;

    // Get message info and check delete permissions
    const messageQuery = `
      SELECT 
        m.id, m.user_id, m.message_text, m.can_edit_until, m.is_deleted,
        c.type as channel_type
      FROM chat_messages m
      JOIN chat_channels c ON m.channel_id = c.id
      WHERE m.id = ?
    `;

    const messageInfo: any = await new Promise((resolve) => {
      db.get(messageQuery, [messageId], (err, row) => {
        resolve(err ? null : row);
      });
    });

    if (!messageInfo) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (messageInfo.is_deleted) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 });
    }

    // Check if user can delete this message
    const isOwner = messageInfo.user_id === user.username;
    const canDeleteOwn = user.permissions?.includes('chat.delete_own_messages');
    const canDeleteAny = user.permissions?.includes('chat.delete_any_messages');
    const withinTimeLimit = new Date() < new Date(messageInfo.can_edit_until);

    if (isOwner) {
      if (!canDeleteOwn) {
        return NextResponse.json({ error: 'Insufficient permissions to delete messages' }, { status: 403 });
      }
      if (!withinTimeLimit) {
        return NextResponse.json({ error: 'Message delete window has expired' }, { status: 400 });
      }
    } else if (!canDeleteAny) {
      return NextResponse.json({ error: 'Can only delete your own messages' }, { status: 403 });
    }

    // Soft delete message
    const deleteQuery = `
      UPDATE chat_messages 
      SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    return new Promise((resolve) => {
      db.run(deleteQuery, [messageId], function(err) {
        if (err) {
          console.error('Database error deleting message:', err);
          resolve(NextResponse.json({ error: 'Failed to delete message' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          message: 'Message deleted successfully',
          messageId: parseInt(messageId)
        }));
      });
    });
  } catch (error) {
    console.error('Error in DELETE /api/chat/messages/[messageId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}