import { backupService } from './backup';
import { systemLogger, createContextLogger } from './logger';

const logger = createContextLogger('backup-scheduler');

export class BackupScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Default: Run every 24 hours (86400000 ms)
  private readonly DEFAULT_INTERVAL = 24 * 60 * 60 * 1000;

  /**
   * Start the backup scheduler
   */
  start(intervalMs: number = this.DEFAULT_INTERVAL): void {
    if (this.isRunning) {
      logger.info({ event: 'scheduler_already_running' }, 'Backup scheduler is already running');
      return;
    }

    logger.info({
      event: 'scheduler_started',
      interval_hours: intervalMs / (1000 * 60 * 60)
    }, `Starting backup scheduler - will run every ${intervalMs / (1000 * 60 * 60)} hours`);

    // Run initial backup check
    this.performScheduledBackup();

    // Set up recurring backup
    this.intervalId = setInterval(() => {
      this.performScheduledBackup();
    }, intervalMs);

    this.isRunning = true;
    systemLogger.configUpdated('backup_scheduler_started', 'system');
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    
    logger.info({ event: 'scheduler_stopped' }, 'Backup scheduler stopped');
    systemLogger.configUpdated('backup_scheduler_stopped', 'system');
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Perform a scheduled backup
   */
  private async performScheduledBackup(): Promise<void> {
    try {
      logger.info({ event: 'scheduled_backup_check' }, 'Checking if scheduled backup should run');

      const settings = await backupService.getBackupSettings();
      
      if (!settings.autoBackupEnabled) {
        logger.info({ event: 'scheduled_backup_skipped' }, 'Automatic backup is disabled');
        return;
      }

      // Check if we need to create a backup
      const backups = await backupService.listBackups();
      const automaticBackups = backups.filter(b => b.type === 'automatic');
      
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Check if there's already an automatic backup in the last 24 hours
      const recentBackup = automaticBackups.find(backup => 
        backup.createdAt > twentyFourHoursAgo
      );

      if (recentBackup) {
        logger.info({
          event: 'scheduled_backup_skipped',
          reason: 'recent_backup_exists',
          recent_backup: recentBackup.filename,
          created_at: recentBackup.createdAt
        }, 'Skipping scheduled backup - recent backup exists');
        return;
      }

      // Create automatic backup
      logger.info({ event: 'scheduled_backup_starting' }, 'Starting scheduled automatic backup');
      
      const backup = await backupService.performAutomaticBackup();
      
      if (backup) {
        logger.info({
          event: 'scheduled_backup_completed',
          filename: backup.filename,
          size_mb: Math.round(backup.size / 1024 / 1024 * 100) / 100
        }, `Scheduled backup completed: ${backup.filename}`);
      }

    } catch (error) {
      logger.logError('Scheduled backup failed', error);
      systemLogger.databaseError(error);
    }
  }

  /**
   * Force run a backup check (for testing)
   */
  async runBackupCheck(): Promise<void> {
    logger.info({ event: 'manual_backup_check_triggered' }, 'Manual backup check triggered');
    await this.performScheduledBackup();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    intervalHours: number;
    nextRunEstimate?: Date;
  } {
    const intervalHours = this.DEFAULT_INTERVAL / (1000 * 60 * 60);
    
    return {
      isRunning: this.isRunning,
      intervalHours,
      nextRunEstimate: this.isRunning 
        ? new Date(Date.now() + this.DEFAULT_INTERVAL) 
        : undefined
    };
  }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();

// Auto-start scheduler in production
if (process.env.NODE_ENV === 'production') {
  // Start scheduler after a short delay to ensure database is ready
  setTimeout(() => {
    backupScheduler.start();
  }, 30000); // 30 second delay
}