import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { ticketLogger, systemLogger } from '@/lib/logger';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';

// Database setup
const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

// Upload configuration
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'tickets');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'application/zip',
  'application/x-zip-compressed'
];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Generate safe filename
function generateSafeFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  
  return `${timestamp}_${randomString}_${baseName}${extension}`;
}

// Validate file upload permissions
function hasFileUploadPermissions(userPermissions: string[]): boolean {
  const requiredPermissions = [
    'ticket.create_for_users',
    'ticket.access_internal'
  ];
  
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  ) || userPermissions.includes('admin.system_settings'); // Admin fallback
}

export async function POST(request: NextRequest) {
  let authResult: any = null;
  try {
    console.log('📎 File upload API called');
    
    // Verify authentication
    authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ Authentication successful for user:', authResult.user.username);

    // Check file upload permissions
    if (!hasFileUploadPermissions(authResult.user.permissions || [])) {
      systemLogger.warn({
        event: 'file_upload_denied',
        denied_user: authResult.user.username,
        user_permissions: authResult.user.permissions,
        reason: 'insufficient_permissions'
      }, `File upload denied for ${authResult.user.username}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to upload files' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const ticketId = formData.get('ticketId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate ticket ID if provided (for existing tickets)
    if (ticketId) {
      const ticketExists = await dbGet(
        'SELECT id FROM user_tickets WHERE id = ?',
        [ticketId]
      );
      
      if (!ticketExists) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
    }

    const uploadedFiles: any[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 10MB limit`);
          continue;
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          errors.push(`${file.name}: File type not allowed`);
          continue;
        }

        // Generate safe filename
        const safeFilename = generateSafeFilename(file.name);
        const filePath = path.join(UPLOAD_DIR, safeFilename);

        // Convert file to buffer and write to disk
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        console.log(`📁 File saved: ${safeFilename}`);

        // If this is for an existing ticket, save to database
        if (ticketId) {
          const result = await dbRun(`
            INSERT INTO ticket_attachments (
              ticket_id,
              filename,
              original_filename,
              file_size,
              mime_type,
              file_path,
              uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            ticketId,
            safeFilename,
            file.name,
            file.size,
            file.type,
            filePath,
            authResult.user.username
          ]);

          uploadedFiles.push({
            id: (result as any).lastID,
            filename: safeFilename,
            originalFilename: file.name,
            size: file.size,
            type: file.type,
            uploadStatus: 'completed'
          });
        } else {
          // For new tickets, return file info for temporary storage
          uploadedFiles.push({
            filename: safeFilename,
            originalFilename: file.name,
            size: file.size,
            type: file.type,
            filePath: filePath,
            uploadStatus: 'completed'
          });
        }

        // Log successful upload
        systemLogger.info({
          event: 'file_uploaded',
          uploaded_by: authResult.user.username,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          ticket_id: ticketId || 'new_ticket'
        }, `File uploaded: ${file.name} by ${authResult.user.username}`);

      } catch (error) {
        console.error(`❌ Error uploading file ${file.name}:`, error);
        errors.push(`${file.name}: Upload failed`);
      }
    }

    // Return results
    const response = {
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('❌ Error in file upload:', error);
    console.error('📋 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      user: authResult?.user?.username || 'unknown'
    });
    
    // Log the error for audit trail
    systemLogger.error({
      event: 'file_upload_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      user: authResult?.user?.username || 'unknown',
      stack_trace: error instanceof Error ? error.stack : undefined
    }, `File upload failed`);
    
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve ticket attachments
export async function GET(request: NextRequest) {
  let authResult: any = null;
  try {
    // Verify authentication
    authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    if (!hasFileUploadPermissions(authResult.user.permissions || [])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view attachments' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID required' },
        { status: 400 }
      );
    }

    // Get attachments for the ticket
    const attachments = await db.all(`
      SELECT 
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        uploaded_by,
        uploaded_at
      FROM ticket_attachments
      WHERE ticket_id = ?
      ORDER BY uploaded_at DESC
    `, [ticketId]);

    return NextResponse.json({
      success: true,
      attachments
    });

  } catch (error) {
    console.error('Error fetching attachments:', error);
    
    systemLogger.error({
      event: 'attachments_fetch_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      user: authResult?.user?.username || 'unknown'
    }, `Attachments fetch failed`);
    
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}