/**
 * Chat File Upload API
 * POST - Upload files for chat messages
 * Requires 'chat.upload_files' permission
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Database from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const db = new Database.Database('./orvale_tickets.db');
const dbRun = promisify(db.run.bind(db));

// File upload configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 
  'text/plain', 'text/csv',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const UPLOAD_DIR = './uploads/chat';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check file sharing permission
    if (!authResult.user.permissions?.includes('chat.upload_files') &&
        !authResult.user.permissions?.includes('chat.send_messages') &&
        authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'File upload permission required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const channelId = formData.get('channel_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` 
      }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `File type '${file.type}' not allowed` 
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // Store file metadata in database
    const fileId = uuidv4();
    await dbRun(`
      INSERT INTO chat_files (
        id, channel_id, user_id, original_filename, stored_filename, 
        file_path, file_size, file_type, mime_type, upload_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      fileId,
      channelId,
      authResult.user.username,
      file.name,
      uniqueFilename,
      filePath,
      file.size,
      getFileCategory(file.type),
      file.type
    ]);

    // Return file metadata for frontend
    const fileMetadata = {
      id: fileId,
      filename: file.name,
      type: getFileCategory(file.type) as 'image' | 'file',
      url: `/api/chat/files/${fileId}`,
      size: file.size,
      mime_type: file.type
    };

    return NextResponse.json({
      success: true,
      file: fileMetadata
    });

  } catch (error) {
    console.error('Error in POST /api/chat/files/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  return 'file';
}