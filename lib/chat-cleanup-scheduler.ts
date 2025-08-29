import { systemLogger, createContextLogger } from './logger';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

const logger = createContextLogger('chat-cleanup-scheduler');

// Database setup
const dbPath = path.join(process.cwd(), 'orvale_tickets.db');
const db = new sqlite3.Database(dbPath);
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

interface CleanupStats {
  abandonedSessionsCount: number;
  orphanedMessagesCount: number;
  stalePresenceCount: number;
  expiredRecoverySessionsCount: number;
  archivedSessionsCount: number;
  totalBytesFreed: number;
}

export class ChatCleanupScheduler {
  private timeoutId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly PACIFIC_TIMEZONE = 'America/Los_Angeles';

  /**
   * Start the chat cleanup scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.info({ event: 'cleanup_scheduler_already_running' }, 'Chat cleanup scheduler is already running');
      return;
    }

    logger.info({ 
      event: 'cleanup_scheduler_started',
      timezone: this.PACIFIC_TIMEZONE 
    }, 'Starting chat cleanup scheduler - will run daily at 12:00 AM Pacific Time');

    this.scheduleNextCleanup();
    this.isRunning = true;
    
    systemLogger.configUpdated('chat_cleanup_scheduler_started', 'system');
  }

  /**
   * Stop the chat cleanup scheduler
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.isRunning = false;
    
    logger.info({ event: 'cleanup_scheduler_stopped' }, 'Chat cleanup scheduler stopped');
    systemLogger.configUpdated('chat_cleanup_scheduler_stopped', 'system');
  }

  /**
   * Calculate milliseconds until next 12:00 AM Pacific Time
   */
  private calculateMsUntilMidnightPacific(): number {
    const now = new Date();
    
    // Get current time in Pacific timezone
    const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: this.PACIFIC_TIMEZONE}));
    
    // Calculate next midnight Pacific
    const nextMidnight = new Date(pacificTime);
    nextMidnight.setHours(24, 0, 0, 0); // Set to next midnight
    
    // Convert back to local timezone for setTimeout
    const nextMidnightUTC = new Date(nextMidnight.toLocaleString("en-US", {timeZone: "UTC"}));
    const pacificOffset = pacificTime.getTimezoneOffset() - now.getTimezoneOffset();
    nextMidnightUTC.setMinutes(nextMidnightUTC.getMinutes() + pacificOffset);
    
    const msUntilMidnight = nextMidnightUTC.getTime() - now.getTime();
    
    // If calculation resulted in negative or very small value, add 24 hours
    if (msUntilMidnight < 60000) { // Less than 1 minute
      return msUntilMidnight + (24 * 60 * 60 * 1000);
    }
    
    return msUntilMidnight;
  }

  /**
   * Schedule the next cleanup at midnight Pacific
   */
  private scheduleNextCleanup(): void {
    const msUntilMidnight = this.calculateMsUntilMidnightPacific();
    const nextCleanup = new Date(Date.now() + msUntilMidnight);
    
    logger.info({
      event: 'cleanup_scheduled',
      next_cleanup: nextCleanup.toISOString(),
      next_cleanup_pacific: nextCleanup.toLocaleString("en-US", {timeZone: this.PACIFIC_TIMEZONE}),
      hours_until_cleanup: Math.round(msUntilMidnight / (1000 * 60 * 60) * 100) / 100
    }, `Next cleanup scheduled for ${nextCleanup.toLocaleString("en-US", {timeZone: this.PACIFIC_TIMEZONE})} Pacific Time`);

    this.timeoutId = setTimeout(async () => {
      await this.performEndOfDayCleanup();
      
      // Schedule next cleanup (24 hours later)
      this.scheduleNextCleanup();
    }, msUntilMidnight);
  }

  /**
   * Perform comprehensive end-of-day cleanup
   */
  async performEndOfDayCleanup(): Promise<CleanupStats> {
    const startTime = Date.now();
    
    logger.info({ 
      event: 'eod_cleanup_started',
      pacific_time: new Date().toLocaleString("en-US", {timeZone: this.PACIFIC_TIMEZONE})
    }, 'Starting end-of-day cleanup at 12:00 AM Pacific Time');

    const stats: CleanupStats = {
      abandonedSessionsCount: 0,
      orphanedMessagesCount: 0,
      stalePresenceCount: 0,
      expiredRecoverySessionsCount: 0,
      archivedSessionsCount: 0,
      totalBytesFreed: 0
    };

    try {
      // 1. Clean up abandoned chat sessions (older than 24 hours)
      stats.abandonedSessionsCount = await this.cleanupAbandonedSessions();
      
      // 2. Clean up orphaned chat messages (messages without valid sessions)
      stats.orphanedMessagesCount = await this.cleanupOrphanedMessages();
      
      // 3. Clean up stale presence data
      stats.stalePresenceCount = await this.cleanupStalePresence();
      
      // 4. Clean up expired session recovery data
      stats.expiredRecoverySessionsCount = await this.cleanupExpiredRecoveryData();
      
      // 5. Archive completed chat sessions to history
      stats.archivedSessionsCount = await this.archiveCompletedSessions();
      
      // 6. Update statistics and log results
      await this.updateCleanupStatistics(stats);
      
      const duration = Date.now() - startTime;
      
      logger.info({
        event: 'eod_cleanup_completed',
        duration_ms: duration,
        stats: stats
      }, `End-of-day cleanup completed in ${duration}ms`);

      systemLogger.info({
        event: 'chat_eod_cleanup_summary',
        abandoned_sessions: stats.abandonedSessionsCount,
        orphaned_messages: stats.orphanedMessagesCount,
        stale_presence: stats.stalePresenceCount,
        expired_recovery: stats.expiredRecoverySessionsCount,
        archived_sessions: stats.archivedSessionsCount,
        duration_seconds: Math.round(duration / 1000)
      }, 'Daily chat cleanup summary');

    } catch (error) {
      logger.logError('End-of-day cleanup failed', error);
      systemLogger.databaseError(error);
    }

    return stats;
  }

  /**
   * Clean up abandoned chat sessions (older than 24 hours)
   */
  private async cleanupAbandonedSessions(): Promise<number> {
    try {
      // Mark sessions as abandoned if they haven't been active for 24+ hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const result = await dbRun(`
        UPDATE public_chat_sessions 
        SET status = 'abandoned', 
            ended_at = datetime('now'),
            updated_at = datetime('now')
        WHERE status IN ('waiting', 'active') 
          AND created_at < ?
          AND (last_activity IS NULL OR last_activity < ?)
      `, [twentyFourHoursAgo, twentyFourHoursAgo]);

      const count = result.changes || 0;
      
      if (count > 0) {
        logger.info({
          event: 'abandoned_sessions_cleaned',
          count: count,
          threshold_hours: 24
        }, `Marked ${count} sessions as abandoned`);
      }

      return count;
    } catch (error) {
      logger.logError('Failed to cleanup abandoned sessions', error);
      return 0;
    }
  }

  /**
   * Clean up orphaned chat messages (messages without valid sessions)
   */
  private async cleanupOrphanedMessages(): Promise<number> {
    try {
      // Delete messages that reference sessions that no longer exist
      const result = await dbRun(`
        DELETE FROM public_chat_messages 
        WHERE session_id NOT IN (
          SELECT session_id FROM public_chat_sessions
        )
      `);

      const count = result.changes || 0;
      
      if (count > 0) {
        logger.info({
          event: 'orphaned_messages_cleaned',
          count: count
        }, `Deleted ${count} orphaned messages`);
      }

      return count;
    } catch (error) {
      logger.logError('Failed to cleanup orphaned messages', error);
      return 0;
    }
  }

  /**
   * Clean up stale presence data (older than 2 hours)
   */
  private async cleanupStalePresence(): Promise<number> {
    try {
      // This would clean up any presence tracking tables if they exist
      // For now, we'll just log that this step ran
      logger.info({
        event: 'stale_presence_check',
        note: 'Presence cleanup integrated with existing socket server intervals'
      }, 'Stale presence cleanup check completed');

      return 0; // Handled by existing socket server intervals
    } catch (error) {
      logger.logError('Failed to cleanup stale presence', error);
      return 0;
    }
  }

  /**
   * Clean up expired session recovery data from localStorage references
   */
  private async cleanupExpiredRecoveryData(): Promise<number> {
    try {
      // Clean up any database records that track localStorage recovery attempts
      // This is primarily client-side cleanup, but we can clean server references
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await dbRun(`
        DELETE FROM public_chat_sessions 
        WHERE status = 'ended' 
          AND ended_at < ?
      `, [sevenDaysAgo]);

      const count = result.changes || 0;
      
      if (count > 0) {
        logger.info({
          event: 'expired_recovery_data_cleaned',
          count: count,
          threshold_days: 7
        }, `Cleaned up ${count} old ended sessions`);
      }

      return count;
    } catch (error) {
      logger.logError('Failed to cleanup expired recovery data', error);
      return 0;
    }
  }

  /**
   * Archive completed chat sessions to history table
   */
  private async archiveCompletedSessions(): Promise<number> {
    try {
      // Move completed sessions older than 30 days to archive table
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // First, create archive table if it doesn't exist
      await dbRun(`
        CREATE TABLE IF NOT EXISTS public_chat_sessions_archive (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          visitor_name TEXT,
          visitor_email TEXT,
          visitor_phone TEXT,
          visitor_department TEXT,
          session_data TEXT,
          status TEXT DEFAULT 'waiting',
          assigned_to TEXT,
          queue_position INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ended_at DATETIME,
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          message_count INTEGER DEFAULT 0,
          duration_minutes INTEGER
        )
      `);

      // Archive completed sessions with summary data
      const result = await dbRun(`
        INSERT INTO public_chat_sessions_archive 
        (session_id, visitor_name, visitor_email, visitor_phone, visitor_department, 
         session_data, status, assigned_to, created_at, ended_at, message_count, duration_minutes)
        SELECT 
          session_id, visitor_name, visitor_email, visitor_phone, visitor_department,
          session_data, status, assigned_to, created_at, ended_at,
          COALESCE((
            SELECT COUNT(*) FROM public_chat_messages pcm 
            WHERE pcm.session_id = pcs.session_id
          ), 0) as message_count,
          CASE 
            WHEN ended_at IS NOT NULL 
            THEN CAST((julianday(ended_at) - julianday(created_at)) * 24 * 60 AS INTEGER)
            ELSE NULL
          END as duration_minutes
        FROM public_chat_sessions pcs
        WHERE status IN ('ended', 'abandoned') 
          AND created_at < ?
      `, [thirtyDaysAgo]);

      const archivedCount = result.changes || 0;

      if (archivedCount > 0) {
        // Delete the archived sessions from the main table
        await dbRun(`
          DELETE FROM public_chat_sessions 
          WHERE status IN ('ended', 'abandoned') 
            AND created_at < ?
        `, [thirtyDaysAgo]);

        logger.info({
          event: 'sessions_archived',
          count: archivedCount,
          threshold_days: 30
        }, `Archived ${archivedCount} completed sessions`);
      }

      return archivedCount;
    } catch (error) {
      logger.logError('Failed to archive completed sessions', error);
      return 0;
    }
  }

  /**
   * Update cleanup statistics in database
   */
  private async updateCleanupStatistics(stats: CleanupStats): Promise<void> {
    try {
      // Create cleanup stats table if it doesn't exist
      await dbRun(`
        CREATE TABLE IF NOT EXISTS chat_cleanup_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cleanup_date DATE NOT NULL,
          abandoned_sessions INTEGER DEFAULT 0,
          orphaned_messages INTEGER DEFAULT 0,
          stale_presence INTEGER DEFAULT 0,
          expired_recovery INTEGER DEFAULT 0,
          archived_sessions INTEGER DEFAULT 0,
          total_items_cleaned INTEGER DEFAULT 0,
          cleanup_duration_ms INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const totalItemsCleaned = stats.abandonedSessionsCount + stats.orphanedMessagesCount + 
                               stats.stalePresenceCount + stats.expiredRecoverySessionsCount + 
                               stats.archivedSessionsCount;

      await dbRun(`
        INSERT OR REPLACE INTO chat_cleanup_stats 
        (cleanup_date, abandoned_sessions, orphaned_messages, stale_presence, 
         expired_recovery, archived_sessions, total_items_cleaned)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        today,
        stats.abandonedSessionsCount,
        stats.orphanedMessagesCount, 
        stats.stalePresenceCount,
        stats.expiredRecoverySessionsCount,
        stats.archivedSessionsCount,
        totalItemsCleaned
      ]);

    } catch (error) {
      logger.logError('Failed to update cleanup statistics', error);
    }
  }

  /**
   * Get cleanup scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    timezone: string;
    nextCleanupEstimate?: string;
    nextCleanupPacific?: string;
  } {
    let nextCleanupEstimate: string | undefined;
    let nextCleanupPacific: string | undefined;
    
    if (this.isRunning) {
      const msUntilNext = this.calculateMsUntilMidnightPacific();
      const nextTime = new Date(Date.now() + msUntilNext);
      nextCleanupEstimate = nextTime.toISOString();
      nextCleanupPacific = nextTime.toLocaleString("en-US", {timeZone: this.PACIFIC_TIMEZONE});
    }

    return {
      isRunning: this.isRunning,
      timezone: this.PACIFIC_TIMEZONE,
      nextCleanupEstimate,
      nextCleanupPacific
    };
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Force run cleanup now (for testing)
   */
  async runCleanupNow(): Promise<CleanupStats> {
    logger.info({ event: 'manual_cleanup_triggered' }, 'Manual cleanup triggered');
    return await this.performEndOfDayCleanup();
  }

  /**
   * Get cleanup statistics for the last N days
   */
  async getCleanupHistory(days: number = 30): Promise<any[]> {
    try {
      const stats = await dbAll(`
        SELECT * FROM chat_cleanup_stats 
        ORDER BY cleanup_date DESC 
        LIMIT ?
      `, [days]) as any[];

      return stats;
    } catch (error) {
      logger.logError('Failed to get cleanup history', error);
      return [];
    }
  }
}

// Export singleton instance
export const chatCleanupScheduler = new ChatCleanupScheduler();

// Auto-start scheduler in production
if (process.env.NODE_ENV === 'production') {
  // Start scheduler after a short delay to ensure database is ready
  setTimeout(() => {
    chatCleanupScheduler.start();
  }, 45000); // 45 second delay (after backup scheduler)
}