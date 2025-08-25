/**
 * Chat Search API
 * GET /api/chat/search - Search messages, people, channels, files
 */

import { NextRequest, NextResponse } from 'next/server';
import Database from 'sqlite3';
import { verifyAuth } from '@/lib/auth';

const db = new Database.Database('./orvale_tickets.db');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'messages', 'people', 'channels', 'files', or null for all
    const channelId = searchParams.get('channelId'); // Search within specific channel
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    const searchTerm = `%${query.trim()}%`;
    const results: any = {
      messages: [],
      people: [],
      channels: [],
      files: []
    };

    // Search Messages
    if (!type || type === 'messages') {
      let messageQuery = `
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
          -- Snippet with highlighted term (simplified)
          SUBSTR(m.message_text, 
            MAX(1, INSTR(LOWER(m.message_text), LOWER(?)) - 20),
            100
          ) as snippet
        FROM chat_messages m
        JOIN chat_channels c ON m.channel_id = c.id
        JOIN users u ON m.user_id = u.username
        WHERE m.is_deleted = 0 
          AND c.active = 1
          AND LOWER(m.message_text) LIKE LOWER(?)
      `;

      const messageParams = [query.trim(), searchTerm];

      // Add channel filter if specified
      if (channelId) {
        messageQuery += ` AND m.channel_id = ?`;
        messageParams.push(channelId);
      }

      // Add access control for private channels
      messageQuery += `
        AND (
          c.type = 'public_channel' 
          OR EXISTS (
            SELECT 1 FROM chat_channel_members cm 
            WHERE cm.channel_id = c.id AND cm.user_id = ?
          )
        )
      `;
      messageParams.push(user.username);

      messageQuery += ` ORDER BY m.created_at DESC LIMIT ?`;
      messageParams.push(String(limit));

      const messages: any[] = await new Promise((resolve) => {
        db.all(messageQuery, messageParams, (err, rows) => {
          resolve(err ? [] : rows);
        });
      });

      results.messages = messages;
    }

    // Search People
    if (!type || type === 'people') {
      const peopleQuery = `
        SELECT 
          u.username,
          u.display_name,
          u.role,
          p.status,
          p.custom_status,
          -- Check if user has DM with this person
          (
            SELECT c.id 
            FROM chat_channels c
            JOIN chat_channel_members cm1 ON c.id = cm1.channel_id AND cm1.user_id = u.username
            JOIN chat_channel_members cm2 ON c.id = cm2.channel_id AND cm2.user_id = ?
            WHERE c.type = 'direct_message' AND c.active = 1
            LIMIT 1
          ) as existing_dm_id
        FROM users u
        LEFT JOIN user_presence p ON u.username = p.user_id
        WHERE u.active = 1 
          AND u.username != ?
          AND (
            LOWER(u.display_name) LIKE LOWER(?) 
            OR LOWER(u.username) LIKE LOWER(?)
          )
        ORDER BY 
          CASE WHEN LOWER(u.display_name) LIKE LOWER(?) THEN 1 ELSE 2 END,
          u.display_name
        LIMIT ?
      `;

      const exactMatch = `${query.trim()}%`;
      const people: any[] = await new Promise((resolve) => {
        db.all(peopleQuery, [
          user.username, user.username, 
          searchTerm, searchTerm, 
          exactMatch, limit
        ], (err, rows) => {
          resolve(err ? [] : rows);
        });
      });

      results.people = people;
    }

    // Search Channels
    if (!type || type === 'channels') {
      const channelQuery = `
        SELECT 
          c.id,
          c.name,
          c.description,
          c.type,
          c.created_by,
          u.display_name as creator_name,
          (
            SELECT COUNT(*) 
            FROM chat_channel_members cm 
            WHERE cm.channel_id = c.id
          ) as member_count,
          -- Check if user is already a member
          EXISTS (
            SELECT 1 FROM chat_channel_members cm 
            WHERE cm.channel_id = c.id AND cm.user_id = ?
          ) as is_member
        FROM chat_channels c
        JOIN users u ON c.created_by = u.username
        WHERE c.active = 1 
          AND c.type IN ('public_channel', 'private_channel')
          AND (
            LOWER(c.name) LIKE LOWER(?) 
            OR LOWER(c.description) LIKE LOWER(?)
          )
        ORDER BY 
          CASE WHEN LOWER(c.name) LIKE LOWER(?) THEN 1 ELSE 2 END,
          c.name
        LIMIT ?
      `;

      const exactMatch = `${query.trim()}%`;
      const channels: any[] = await new Promise((resolve) => {
        db.all(channelQuery, [
          user.username, 
          searchTerm, searchTerm,
          exactMatch, limit
        ], (err, rows) => {
          resolve(err ? [] : rows);
        });
      });

      results.channels = channels;
    }

    // Search Files (if chat_files table exists and is populated)
    if (!type || type === 'files') {
      const fileQuery = `
        SELECT 
          f.id,
          f.message_id,
          f.original_filename,
          f.file_size,
          f.mime_type,
          f.is_image,
          f.uploaded_at,
          m.channel_id,
          c.name as channel_name,
          c.type as channel_type,
          u.display_name as uploaded_by_name
        FROM chat_files f
        JOIN chat_messages m ON f.message_id = m.id
        JOIN chat_channels c ON m.channel_id = c.id
        JOIN users u ON f.user_id = u.username
        WHERE c.active = 1
          AND LOWER(f.original_filename) LIKE LOWER(?)
          AND (
            c.type = 'public_channel' 
            OR EXISTS (
              SELECT 1 FROM chat_channel_members cm 
              WHERE cm.channel_id = c.id AND cm.user_id = ?
            )
          )
        ORDER BY f.uploaded_at DESC
        LIMIT ?
      `;

      const files: any[] = await new Promise((resolve) => {
        db.all(fileQuery, [searchTerm, user.username, limit], (err, rows) => {
          resolve(err ? [] : rows);
        });
      });

      results.files = files;
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum: number, items: any[]) => sum + items.length, 0);

    return NextResponse.json({
      query: query.trim(),
      results,
      totalResults,
      hasMore: totalResults === limit * (type ? 1 : 4) // Rough estimate
    });
  } catch (error) {
    console.error('Error in GET /api/chat/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}