import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { backupService } from '@/lib/backup';

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
    const action = url.searchParams.get('action');

    switch (action) {
      case 'list':
        const backups = await backupService.listBackups();
        return NextResponse.json({
          success: true,
          backups: backups.map(backup => ({
            ...backup,
            sizeMB: Math.round(backup.size / 1024 / 1024 * 100) / 100
          }))
        });

      case 'stats':
        const stats = await backupService.getBackupStats();
        return NextResponse.json({
          success: true,
          stats: {
            ...stats,
            totalSizeMB: Math.round(stats.totalSize / 1024 / 1024 * 100) / 100
          }
        });

      case 'settings':
        const settings = await backupService.getBackupSettings();
        return NextResponse.json({
          success: true,
          settings
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: list, stats, or settings' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in backup GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, backupFilename } = body;

    switch (action) {
      case 'create':
        const backup = await backupService.createBackup('manual', authResult.user.username);
        return NextResponse.json({
          success: true,
          message: 'Manual backup created successfully',
          backup: {
            ...backup,
            sizeMB: Math.round(backup.size / 1024 / 1024 * 100) / 100
          }
        });

      case 'cleanup':
        const cleanupResult = await backupService.cleanupOldBackups();
        return NextResponse.json({
          success: true,
          message: `Cleanup completed - deleted ${cleanupResult.deleted} old backup files`,
          deleted: cleanupResult.deleted,
          errors: cleanupResult.errors
        });

      case 'restore':
        if (!backupFilename) {
          return NextResponse.json(
            { error: 'backupFilename is required for restore action' },
            { status: 400 }
          );
        }

        await backupService.restoreFromBackup(backupFilename, authResult.user.username);
        return NextResponse.json({
          success: true,
          message: `Database restored successfully from ${backupFilename}`,
          warning: 'Application may need to be restarted for changes to take effect'
        });

      case 'auto':
        const autoBackup = await backupService.performAutomaticBackup();
        if (!autoBackup) {
          return NextResponse.json({
            success: false,
            message: 'Automatic backup is disabled in settings'
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Automatic backup completed successfully',
          backup: {
            ...autoBackup,
            sizeMB: Math.round(autoBackup.size / 1024 / 1024 * 100) / 100
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, cleanup, restore, or auto' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in backup POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}