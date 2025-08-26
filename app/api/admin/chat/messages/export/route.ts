/**
 * Chat Message Export API
 * GET - Export messages as CSV or JSON
 * Requires 'chat.monitor_all' permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbAll = promisify(db.all.bind(db));

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check monitor permission
    if (!authResult.user.permissions?.includes('chat.monitor_all') && 
        !authResult.user.permissions?.includes('chat.view_all_messages') && 
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'json'
    const channel_id = searchParams.get('channel_id');
    const user_id = searchParams.get('user_id');
    const time_range = searchParams.get('time_range') || '24h';

    // Build time filter
    let timeFilter = '';
    switch (time_range) {
      case '1h':
        timeFilter = "AND m.created_at >= datetime('now', '-1 hours')";
        break;
      case '24h':
        timeFilter = "AND m.created_at >= datetime('now', '-24 hours')";
        break;
      case '7d':
        timeFilter = "AND m.created_at >= datetime('now', '-7 days')";
        break;
      case '30d':
        timeFilter = "AND m.created_at >= datetime('now', '-30 days')";
        break;
      case 'all':
      default:
        timeFilter = '';
        break;
    }

    // Build where conditions
    let whereConditions = ['m.is_deleted = FALSE'];
    let queryParams: any[] = [];

    if (channel_id) {
      whereConditions.push('m.channel_id = ?');
      queryParams.push(channel_id);
    }

    if (user_id) {
      whereConditions.push('m.user_id = ?');
      queryParams.push(user_id);
    }

    // Query all matching messages (no limit for export)
    const messagesQuery = `
      SELECT 
        m.id,
        m.channel_id,
        c.name as channel_name,
        c.type as channel_type,
        m.user_id,
        u.display_name as user_display_name,
        m.message_text,
        m.message_type,
        m.created_at,
        m.edited_at,
        m.file_attachment,
        CASE 
          WHEN c.type = 'direct_message' THEN 'DM'
          WHEN c.type = 'group_chat' THEN 'Group'
          ELSE '#' || c.name
        END as display_channel
      FROM chat_messages m
      LEFT JOIN chat_channels c ON m.channel_id = c.id
      LEFT JOIN users u ON m.user_id = u.username
      WHERE ${whereConditions.join(' AND ')} ${timeFilter}
      ORDER BY m.created_at ASC
    `;

    const messages = await dbAll(messagesQuery, queryParams) as Array<{
      id: number;
      channel_id: number;
      channel_name: string;
      channel_type: string;
      user_id: string;
      user_display_name: string;
      message_text: string;
      message_type: string;
      created_at: string;
      edited_at?: string;
      file_attachment?: string;
      display_channel: string;
    }>;

    if (format === 'json') {
      // Export as JSON
      const exportData = {
        export_info: {
          generated_at: new Date().toISOString(),
          generated_by: authResult.user.username,
          total_messages: messages.length,
          filters: {
            channel_id,
            user_id,
            time_range
          }
        },
        messages: messages.map(msg => ({
          id: msg.id,
          timestamp: msg.created_at,
          channel: msg.display_channel,
          channel_type: msg.channel_type,
          user: msg.user_display_name || msg.user_id,
          message: msg.message_text,
          type: msg.message_type,
          edited: msg.edited_at ? new Date(msg.edited_at).toISOString() : null,
          has_attachment: !!msg.file_attachment
        }))
      };

      const filename = `chat_messages_${time_range}_${Date.now()}.json`;
      
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });

    } else {
      // Export as CSV
      const csvHeader = 'Timestamp,Channel,Channel Type,User,Message,Type,Edited,Has Attachment\n';
      const csvRows = messages.map(msg => {
        const timestamp = new Date(msg.created_at).toLocaleString();
        const edited = msg.edited_at ? new Date(msg.edited_at).toLocaleString() : '';
        const hasAttachment = msg.file_attachment ? 'Yes' : 'No';
        
        // Escape CSV values
        const escapeCSV = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return '"' + value.replace(/"/g, '""') + '"';
          }
          return value;
        };

        return [
          escapeCSV(timestamp),
          escapeCSV(msg.display_channel),
          escapeCSV(msg.channel_type),
          escapeCSV(msg.user_display_name || msg.user_id),
          escapeCSV(msg.message_text),
          escapeCSV(msg.message_type),
          escapeCSV(edited),
          escapeCSV(hasAttachment)
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const filename = `chat_messages_${time_range}_${Date.now()}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

  } catch (error) {
    console.error('Error in GET /api/admin/chat/messages/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}