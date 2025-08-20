import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { queryAsync, getAsync } from './database';
import { systemLogger, createContextLogger } from './logger';

const execAsync = promisify(exec);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

const logger = createContextLogger('backup-service');

export interface BackupSettings {
  autoBackupEnabled: boolean;
  backupRetentionDays: number;
  backupLocation: string;
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'manual' | 'automatic';
}

export class BackupService {
  private defaultBackupDir: string;
  private dbPath: string;

  constructor() {
    this.defaultBackupDir = path.join(process.cwd(), 'backups');
    this.dbPath = path.join(process.cwd(), 'orvale_tickets.db');
  }

  /**
   * Get the current backup directory from settings
   */
  private async getBackupDirectory(): Promise<string> {
    try {
      const settings = await this.getBackupSettings();
      const backupLocation = settings.backupLocation || './backups';
      
      // Handle relative paths
      if (backupLocation.startsWith('./') || backupLocation.startsWith('../')) {
        return path.resolve(process.cwd(), backupLocation);
      }
      
      // Handle absolute paths
      if (path.isAbsolute(backupLocation)) {
        return backupLocation;
      }
      
      // Default to relative from app root
      return path.join(process.cwd(), backupLocation);
    } catch (error) {
      logger.logError('Failed to get backup directory, using default', error);
      return this.defaultBackupDir;
    }
  }

  /**
   * Get backup settings from database
   */
  async getBackupSettings(): Promise<BackupSettings> {
    try {
      const settings = await queryAsync(
        'SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (?, ?, ?)',
        ['autoBackupEnabled', 'backupRetentionDays', 'backupLocation']
      );

      let autoBackupEnabled = true;
      let backupRetentionDays = 30;
      let backupLocation = './backups';

      settings.forEach((row: any) => {
        try {
          const value = JSON.parse(row.setting_value);
          if (row.setting_key === 'autoBackupEnabled') {
            autoBackupEnabled = Boolean(value);
          } else if (row.setting_key === 'backupRetentionDays') {
            backupRetentionDays = parseInt(value) || 30;
          } else if (row.setting_key === 'backupLocation') {
            backupLocation = String(value) || './backups';
          }
        } catch (error) {
          logger.logError(`Failed to parse backup setting ${row.setting_key}`, error);
        }
      });

      return { autoBackupEnabled, backupRetentionDays, backupLocation };
    } catch (error) {
      logger.logError('Failed to get backup settings', error);
      return { autoBackupEnabled: true, backupRetentionDays: 30, backupLocation: './backups' };
    }
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory(): Promise<string> {
    try {
      const backupDir = await this.getBackupDirectory();
      await mkdir(backupDir, { recursive: true });
      return backupDir;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      return await this.getBackupDirectory();
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename(type: 'manual' | 'automatic' = 'manual'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `orvale_backup_${type}_${timestamp}.db`;
  }

  /**
   * Create a backup of the SQLite database
   */
  async createBackup(type: 'manual' | 'automatic' = 'manual', triggeredBy?: string): Promise<BackupInfo> {
    try {
      const backupDir = await this.ensureBackupDirectory();

      const filename = this.generateBackupFilename(type);
      const backupPath = path.join(backupDir, filename);

      logger.info({
        event: 'backup_started',
        type,
        filename,
        triggered_by: triggeredBy
      }, `Starting ${type} database backup`);

      // Method 1: Use SQLite .backup command (preferred for consistency)
      try {
        await execAsync(`sqlite3 "${this.dbPath}" ".backup '${backupPath}'"`);
        logger.info({
          event: 'backup_method',
          method: 'sqlite_backup_command'
        }, 'Using SQLite .backup command');
      } catch (sqliteError) {
        // Fallback: Copy file directly
        logger.info({
          event: 'backup_method',
          method: 'file_copy_fallback',
          sqlite_error: sqliteError
        }, 'SQLite backup command failed, using file copy');
        await copyFile(this.dbPath, backupPath);
      }

      // Get backup file info
      const stats = await stat(backupPath);
      
      const backupInfo: BackupInfo = {
        filename,
        path: backupPath,
        size: stats.size,
        createdAt: new Date(),
        type
      };

      // Log backup creation
      await this.logBackupToDatabase(backupInfo, triggeredBy);

      logger.info({
        event: 'backup_completed',
        ...backupInfo,
        size_mb: Math.round(stats.size / 1024 / 1024 * 100) / 100,
        triggered_by: triggeredBy
      }, `${type} backup completed successfully`);

      systemLogger.configUpdated('database_backup', triggeredBy || 'system');

      return backupInfo;

    } catch (error) {
      logger.logError(`Failed to create ${type} backup`, error);
      throw new Error(`Backup creation failed: ${error}`);
    }
  }

  /**
   * Log backup creation to database for audit trail
   */
  async logBackupToDatabase(backupInfo: BackupInfo, triggeredBy?: string): Promise<void> {
    try {
      // Create backup_log table if it doesn't exist
      await queryAsync(`
        CREATE TABLE IF NOT EXISTS backup_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          backup_type TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          triggered_by TEXT,
          status TEXT DEFAULT 'completed'
        )
      `);

      // Insert backup record
      await queryAsync(`
        INSERT INTO backup_log (filename, file_path, file_size, backup_type, triggered_by)
        VALUES (?, ?, ?, ?, ?)
      `, [
        backupInfo.filename,
        backupInfo.path,
        backupInfo.size,
        backupInfo.type,
        triggeredBy || 'system'
      ]);

    } catch (error) {
      logger.logError('Failed to log backup to database', error);
      // Don't throw - backup succeeded even if logging failed
    }
  }

  /**
   * Get list of all backup files
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const backupDir = await this.ensureBackupDirectory();
      
      const files = await readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('orvale_backup_') && file.endsWith('.db'));

      const backups: BackupInfo[] = [];

      for (const file of backupFiles) {
        try {
          const filePath = path.join(backupDir, file);
          const stats = await stat(filePath);
          
          // Extract type from filename
          const type = file.includes('_manual_') ? 'manual' : 'automatic';

          backups.push({
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime || stats.ctime,
            type: type as 'manual' | 'automatic'
          });
        } catch (error) {
          logger.logError(`Failed to get stats for backup file ${file}`, error);
        }
      }

      // Sort by creation date (newest first)
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      logger.logError('Failed to list backups', error);
      return [];
    }
  }

  /**
   * Clean up old backup files based on retention policy
   */
  async cleanupOldBackups(): Promise<{ deleted: number; errors: string[] }> {
    try {
      const settings = await this.getBackupSettings();
      const backups = await this.listBackups();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.backupRetentionDays);

      logger.info({
        event: 'backup_cleanup_started',
        total_backups: backups.length,
        retention_days: settings.backupRetentionDays,
        cutoff_date: cutoffDate.toISOString()
      }, 'Starting backup cleanup');

      const oldBackups = backups.filter(backup => backup.createdAt < cutoffDate);
      const deleted: string[] = [];
      const errors: string[] = [];

      for (const backup of oldBackups) {
        try {
          await unlink(backup.path);
          deleted.push(backup.filename);
          
          logger.info({
            event: 'backup_file_deleted',
            filename: backup.filename,
            age_days: Math.floor((Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          }, `Deleted old backup: ${backup.filename}`);

        } catch (error) {
          const errorMsg = `Failed to delete ${backup.filename}: ${error}`;
          errors.push(errorMsg);
          logger.logError(errorMsg, error);
        }
      }

      logger.info({
        event: 'backup_cleanup_completed',
        deleted_count: deleted.length,
        error_count: errors.length
      }, `Backup cleanup completed - deleted ${deleted.length} files`);

      return { deleted: deleted.length, errors };

    } catch (error) {
      logger.logError('Failed to cleanup old backups', error);
      throw error;
    }
  }

  /**
   * Restore database from backup file
   */
  async restoreFromBackup(backupFilename: string, restoredBy: string): Promise<void> {
    try {
      const backupDir = await this.getBackupDirectory();
      const backupPath = path.join(backupDir, backupFilename);
      
      // Verify backup file exists
      await stat(backupPath);

      // Create a backup of current database before restore
      const currentBackup = await this.createBackup('manual', `${restoredBy}_pre_restore`);

      logger.info({
        event: 'restore_started',
        backup_filename: backupFilename,
        current_backup: currentBackup.filename,
        restored_by: restoredBy
      }, `Starting database restore from ${backupFilename}`);

      // Copy backup file to replace current database
      await copyFile(backupPath, this.dbPath);

      logger.info({
        event: 'restore_completed',
        backup_filename: backupFilename,
        restored_by: restoredBy
      }, `Database restored successfully from ${backupFilename}`);

      systemLogger.configUpdated('database_restored', restoredBy);

    } catch (error) {
      logger.logError(`Failed to restore from backup ${backupFilename}`, error);
      throw new Error(`Restore failed: ${error}`);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    manualBackups: number;
    automaticBackups: number;
  }> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          manualBackups: 0,
          automaticBackups: 0
        };
      }

      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const manualBackups = backups.filter(b => b.type === 'manual').length;
      const automaticBackups = backups.filter(b => b.type === 'automatic').length;

      const sortedByDate = backups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup: sortedByDate[0]?.createdAt,
        newestBackup: sortedByDate[sortedByDate.length - 1]?.createdAt,
        manualBackups,
        automaticBackups
      };

    } catch (error) {
      logger.logError('Failed to get backup statistics', error);
      throw error;
    }
  }

  /**
   * Perform automatic backup if enabled
   */
  async performAutomaticBackup(): Promise<BackupInfo | null> {
    try {
      const settings = await this.getBackupSettings();
      
      if (!settings.autoBackupEnabled) {
        logger.info({ event: 'automatic_backup_skipped' }, 'Automatic backup is disabled');
        return null;
      }

      const backup = await this.createBackup('automatic', 'system_scheduler');
      
      // Clean up old backups after creating new one
      await this.cleanupOldBackups();
      
      return backup;

    } catch (error) {
      logger.logError('Automatic backup failed', error);
      throw error;
    }
  }
}

// Export singleton instance
export const backupService = new BackupService();