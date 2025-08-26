/**
 * Chat System Statistics API
 * GET - Retrieve real-time chat system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const db = new sqlite3.Database('./orvale_tickets.db');
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions for chat management
    if (!authResult.user.permissions?.includes('chat.manage_system') && 
        !authResult.user.permissions?.includes('admin.system_settings') &&
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get Socket.io server status
    let socketioStatus = 'disconnected';
    let socketioUptime = '0m';
    
    try {
      // Try to check if Socket.io server is running by making a connection test
      // For now, we'll simulate this data - in production this would check actual Socket.io server
      const response = await fetch('http://localhost:3001/health', { 
        signal: AbortSignal.timeout(2000) 
      }).catch(() => null);
      
      if (response && response.ok) {
        socketioStatus = 'connected';
        socketioUptime = '2h 15m'; // This would be calculated from server start time
      }
    } catch {
      // Socket.io server not running
      socketioStatus = 'disconnected';
    }

    // Get real user presence statistics from user_presence table
    // Also consider users who have been inactive for more than 15 minutes as offline
    const presenceQuery = `
      SELECT 
        CASE 
          WHEN status = 'online' AND last_active >= datetime('now', '-15 minutes') THEN 'online'
          WHEN status = 'away' AND last_active >= datetime('now', '-1 hour') THEN 'away'
          WHEN status = 'busy' AND last_active >= datetime('now', '-1 hour') THEN 'busy'
          ELSE 'offline'
        END as effective_status,
        COUNT(*) as count
      FROM user_presence 
      GROUP BY effective_status
    `;
    const presenceResults = await dbAll(presenceQuery) as Array<{ effective_status: string; count: number }>;
    
    const presenceStats = {
      users_online: 0,
      users_away: 0, 
      users_busy: 0,
      users_offline: 0
    };
    
    presenceResults.forEach((row) => {
      switch(row.effective_status) {
        case 'online':
          presenceStats.users_online = row.count;
          break;
        case 'away':
          presenceStats.users_away = row.count;
          break;
        case 'busy':
          presenceStats.users_busy = row.count;
          break;
        case 'offline':
          presenceStats.users_offline = row.count;
          break;
      }
    });

    // Get active users (users who have sent messages in last 24 hours)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM chat_messages 
      WHERE created_at >= datetime('now', '-24 hours')
        AND is_deleted = FALSE
    `;
    const activeUsersResult = await dbGet(activeUsersQuery) as { count: number };
    const activeUsers = activeUsersResult?.count || 0;

    // Get channel statistics
    const totalChannelsQuery = `SELECT COUNT(*) as count FROM chat_channels`;
    const channelsResult = await dbGet(totalChannelsQuery) as { count: number };
    const totalChannels = channelsResult?.count || 0;

    // Calculate messages per hour (last 24 hours average)
    const messagesPerHourQuery = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) / 24.0 as messages_per_hour
      FROM chat_messages 
      WHERE created_at >= datetime('now', '-24 hours')
        AND is_deleted = FALSE
    `;
    const messagesResult = await dbGet(messagesPerHourQuery) as { total_messages: number; messages_per_hour: number };
    const messagesPerHour = Math.round(messagesResult?.messages_per_hour || 0);

    // Calculate storage usage (database + file attachments)
    let storageUsedMb = 0;
    
    try {
      // Get database file size
      const dbPath = './orvale_tickets.db';
      if (fs.existsSync(dbPath)) {
        const dbStats = fs.statSync(dbPath);
        storageUsedMb += dbStats.size / (1024 * 1024); // Convert to MB
      }
      
      // Get chat files storage size
      const filesQuery = `SELECT SUM(file_size) as total_size FROM chat_files`;
      const filesResult = await dbGet(filesQuery) as { total_size: number };
      if (filesResult?.total_size) {
        storageUsedMb += filesResult.total_size / (1024 * 1024); // Convert to MB
      }
      
      // Get public chat files if they exist
      const publicFilesQuery = `
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name='public_chat_files'
      `;
      const publicTableExists = await dbGet(publicFilesQuery) as { count: number };
      
      if (publicTableExists?.count > 0) {
        const publicFilesQuery = `SELECT SUM(file_size) as total_size FROM public_chat_files`;
        const publicFilesResult = await dbGet(publicFilesQuery) as { total_size: number };
        if (publicFilesResult?.total_size) {
          storageUsedMb += publicFilesResult.total_size / (1024 * 1024); // Convert to MB
        }
      }
      
      storageUsedMb = Math.round(storageUsedMb * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.warn('Error calculating storage usage:', error);
      storageUsedMb = 0;
    }

    // Additional debug info about message activity
    const recentMessagesQuery = `
      SELECT COUNT(*) as count
      FROM chat_messages 
      WHERE created_at >= datetime('now', '-1 hour')
        AND is_deleted = FALSE
    `;
    const recentMessagesResult = await dbGet(recentMessagesQuery) as { count: number };
    const messagesLastHour = recentMessagesResult?.count || 0;

    const stats = {
      socketio_status: socketioStatus,
      socketio_port: 3001,
      socketio_uptime: socketioUptime,
      ...presenceStats,
      active_users: activeUsers,
      total_channels: totalChannels,
      messages_per_hour: messagesPerHour,
      messages_last_hour: messagesLastHour, // Current hour activity
      storage_used_mb: storageUsedMb,
      // Debug info for troubleshooting
      debug_info: {
        total_messages_in_db: messagesResult?.total_messages || 0,
        calculation_method: 'real_database_queries',
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/admin/chat/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}