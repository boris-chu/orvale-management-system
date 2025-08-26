/**
 * Chat File Download API
 * GET - Serve uploaded chat files
 * Requires authentication and file access permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const db = new Database.Database('./orvale_tickets.db');
const dbGet = promisify(db.get.bind(db));

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileId = params.id;

    // Get file metadata from database
    const fileRecord = await dbGet(`
      SELECT 
        cf.*,
        cc.name as channel_name,
        cc.type as channel_type
      FROM chat_files cf
      LEFT JOIN chat_channels cc ON cf.channel_id = cc.id
      WHERE cf.id = ?
    `, [fileId]) as {
      id: string;
      channel_id: number;
      user_id: string;
      original_filename: string;
      stored_filename: string;
      file_path: string;
      file_size: number;
      file_type: string;
      mime_type: string;
      upload_date: string;
      channel_name: string;
      channel_type: string;
    };

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has access to the channel
    // For now, allow access if user has chat.access_channels permission
    // TODO: Add channel-specific permission checks
    if (!authResult.user.permissions?.includes('chat.access_channels') &&
        !authResult.user.permissions?.includes('chat.send_files') &&
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if file exists on disk
    if (!fs.existsSync(fileRecord.file_path)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    // Read file and return
    const fileBuffer = fs.readFileSync(fileRecord.file_path);
    
    // Determine content disposition based on file type
    const isImage = fileRecord.mime_type.startsWith('image/');
    const disposition = isImage ? 'inline' : 'attachment';
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': fileRecord.mime_type,
        'Content-Length': fileRecord.file_size.toString(),
        'Content-Disposition': `${disposition}; filename="${fileRecord.original_filename}"`,
        'Cache-Control': 'private, max-age=86400', // Cache for 24 hours
      }
    });

  } catch (error) {
    console.error('Error in GET /api/chat/files/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}