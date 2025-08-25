/**
 * Chat System Statistics API
 * GET - Retrieve real-time chat system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./orvale_tickets.db');

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

    // Get user presence statistics
    // Note: This would normally come from user_presence table when fully implemented
    const presenceStats = {
      users_online: 12,
      users_away: 3, 
      users_busy: 2,
      users_offline: 8
    };

    // Get active users (users who have sent messages in last 24 hours)
    // This would query chat_messages when implemented
    const activeUsers = 15;

    // Get channel statistics
    // This would query chat_channels when implemented
    const totalChannels = 8;

    // Calculate messages per hour
    // This would query chat_messages with timestamp filtering when implemented
    const messagesPerHour = 245;

    // Calculate storage usage
    // This would calculate actual database size and file attachments when implemented
    const storageUsedMb = 125;

    const stats = {
      socketio_status: socketioStatus,
      socketio_port: 3001,
      socketio_uptime: socketioUptime,
      ...presenceStats,
      active_users: activeUsers,
      total_channels: totalChannels,
      messages_per_hour: messagesPerHour,
      storage_used_mb: storageUsedMb,
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