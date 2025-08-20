import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { backupService } from '@/lib/backup';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'filename parameter is required' },
        { status: 400 }
      );
    }

    // Validate filename for security
    if (!filename.startsWith('orvale_backup_') || !filename.endsWith('.db')) {
      return NextResponse.json(
        { error: 'Invalid backup filename' },
        { status: 400 }
      );
    }

    // Get backup directory from settings
    const settings = await backupService.getBackupSettings();
    const backupLocation = settings.backupLocation || './backups';
    
    let backupDir: string;
    if (backupLocation.startsWith('./') || backupLocation.startsWith('../')) {
      backupDir = path.resolve(process.cwd(), backupLocation);
    } else if (path.isAbsolute(backupLocation)) {
      backupDir = backupLocation;
    } else {
      backupDir = path.join(process.cwd(), backupLocation);
    }
    
    const backupPath = path.join(backupDir, filename);

    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        { error: 'Backup file not found' },
        { status: 404 }
      );
    }

    // Get file stats
    const stats = fs.statSync(backupPath);
    
    // Read the file
    const fileBuffer = fs.readFileSync(backupPath);

    // Return file as download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading backup:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}