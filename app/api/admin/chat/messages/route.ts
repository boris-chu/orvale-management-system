/**
 * Chat Message Monitoring API
 * GET - Retrieve messages for monitoring with filtering and export capabilities
 * Requires 'chat.monitor_all' permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

interface MessageFilter {
  channel_id?: string;
  user_id?: string;
  time_range?: '1h' | '24h' | '7d' | '30d' | 'all';
  message_type?: string;
  limit?: number;
  offset?: number;
}

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
    
    const filters: MessageFilter = {
      channel_id: searchParams.get('channel_id') || undefined,
      user_id: searchParams.get('user_id') || undefined,
      time_range: (searchParams.get('time_range') as MessageFilter['time_range']) || '24h',
      message_type: searchParams.get('message_type') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    // Build time filter
    let timeFilter = '';
    switch (filters.time_range) {
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

    // Build the query
    let whereConditions = ['m.is_deleted = FALSE'];
    let queryParams: any[] = [];

    if (filters.channel_id) {
      whereConditions.push('m.channel_id = ?');
      queryParams.push(filters.channel_id);
    }

    if (filters.user_id) {
      whereConditions.push('m.user_id = ?');
      queryParams.push(filters.user_id);
    }

    if (filters.message_type) {
      whereConditions.push('m.message_type = ?');
      queryParams.push(filters.message_type);
    }

    const messagesQuery = `
      SELECT 
        m.id,
        m.channel_id,
        m.user_id,
        m.message_text,
        m.message_type,
        m.created_at,
        m.edited_at,
        m.file_attachment,
        c.name as channel_name,
        c.type as channel_type,
        u.display_name as user_display_name
      FROM chat_messages m
      LEFT JOIN chat_channels c ON m.channel_id = c.id
      LEFT JOIN users u ON m.user_id = u.username
      WHERE ${whereConditions.join(' AND ')} ${timeFilter}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(filters.limit, filters.offset);

    const messages = await dbAll(messagesQuery, queryParams) as Array<{
      id: number;
      channel_id: number;
      user_id: string;
      message_text: string;
      message_type: string;
      created_at: string;
      edited_at?: string;
      file_attachment?: string;
      channel_name: string;
      channel_type: string;
      user_display_name: string;
    }>;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM chat_messages m
      LEFT JOIN chat_channels c ON m.channel_id = c.id
      WHERE ${whereConditions.join(' AND ')} ${timeFilter}
    `;

    const countResult = await dbGet(countQuery, queryParams.slice(0, -2)) as { total: number };
    const totalMessages = countResult?.total || 0;

    // Get available channels for filter dropdown
    const channelsQuery = `
      SELECT DISTINCT c.id, c.name, c.type
      FROM chat_channels c
      INNER JOIN chat_messages m ON c.id = m.channel_id
      WHERE m.is_deleted = FALSE
      ORDER BY c.name
    `;
    const channels = await dbAll(channelsQuery) as Array<{
      id: number;
      name: string;
      type: string;
    }>;

    // Get active users for filter dropdown
    const usersQuery = `
      SELECT DISTINCT u.username, u.display_name
      FROM users u
      INNER JOIN chat_messages m ON u.username = m.user_id
      WHERE m.is_deleted = FALSE ${timeFilter}
      ORDER BY u.display_name
    `;
    const users = await dbAll(usersQuery) as Array<{
      username: string;
      display_name: string;
    }>;

    return NextResponse.json({
      messages,
      pagination: {
        total: totalMessages,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < totalMessages
      },
      filters: {
        channels,
        users,
        applied: filters
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/chat/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}