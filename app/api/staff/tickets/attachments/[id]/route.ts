import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { systemLogger } from '@/lib/logger';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Database setup
const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);
const dbGet = promisify(db.get.bind(db));

// Validate file access permissions
function hasFileAccessPermissions(userPermissions: string[]): boolean {
  const requiredPermissions = [
    'ticket.create_for_users',
    'ticket.access_internal',
    'ticket.view'
  ];
  
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  ) || userPermissions.includes('admin.system_settings'); // Admin fallback
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let authResult: any = null;
  try {
    const resolvedParams = await params;
    const attachmentId = resolvedParams.id;
    
    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID required' },
        { status: 400 }
      );
    }

    // Verify authentication
    authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    if (!hasFileAccessPermissions(authResult.user.permissions || [])) {
      systemLogger.warn({
        event: 'file_download_denied',
        denied_user: authResult.user.username,
        attachment_id: attachmentId,
        reason: 'insufficient_permissions'
      }, `File download denied for ${authResult.user.username}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to download files' },
        { status: 403 }
      );
    }

    // Get attachment info from database
    const attachment = await dbGet(`
      SELECT 
        ta.filename,
        ta.original_filename,
        ta.file_size,
        ta.mime_type,
        ta.file_path,
        ta.uploaded_by,
        ta.uploaded_at,
        ut.submission_id,
        ut.assigned_team
      FROM ticket_attachments ta
      JOIN user_tickets ut ON ta.ticket_id = ut.id
      WHERE ta.id = ?
    `, [attachmentId]) as any;

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this ticket's team (basic security check)
    const userTeam = authResult.user.team_id;
    const hasAdminAccess = authResult.user.permissions?.includes('admin.system_settings');
    const hasCrossTeamAccess = authResult.user.permissions?.some((perm: string) => 
      ['ticket.assign_cross_team', 'helpdesk.assign_cross_team', 'ticket.assign_any'].includes(perm)
    );

    if (!hasAdminAccess && !hasCrossTeamAccess && userTeam !== attachment.assigned_team) {
      systemLogger.warn({
        event: 'file_download_denied',
        denied_user: authResult.user.username,
        attachment_id: attachmentId,
        user_team: userTeam,
        ticket_team: attachment.assigned_team,
        reason: 'team_access_denied'
      }, `Cross-team file download denied for ${authResult.user.username}`);
      
      return NextResponse.json(
        { error: 'Access denied to this ticket\'s attachments' },
        { status: 403 }
      );
    }

    // Check if file exists on disk
    if (!fs.existsSync(attachment.file_path)) {
      systemLogger.error({
        event: 'file_not_found_on_disk',
        attachment_id: attachmentId,
        file_path: attachment.file_path,
        requested_by: authResult.user.username
      }, `File not found on disk: ${attachment.original_filename}`);
      
      return NextResponse.json(
        { error: 'File not found on server' },
        { status: 404 }
      );
    }

    // Read file from disk
    const fileBuffer = fs.readFileSync(attachment.file_path);

    // Log file download
    systemLogger.info({
      event: 'file_downloaded',
      downloaded_by: authResult.user.username,
      attachment_id: attachmentId,
      original_filename: attachment.original_filename,
      ticket_id: attachment.submission_id,
      file_size: attachment.file_size
    }, `File downloaded: ${attachment.original_filename} by ${authResult.user.username}`);

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.original_filename)}"`,
        'Content-Length': attachment.file_size.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    
    systemLogger.error({
      event: 'file_download_failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      user: authResult?.user?.username || 'unknown',
      attachment_id: params ? 'unknown' : 'unknown'
    }, `File download failed`);
    
    return NextResponse.json(
      { error: 'File download failed' },
      { status: 500 }
    );
  }
}