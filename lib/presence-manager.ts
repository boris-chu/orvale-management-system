/**
 * Presence Manager - Handles automatic presence status updates
 * Based on configurable timeout settings from developer settings
 */

import { queryAsync, runAsync, getAsync } from './database';

interface PresenceSettings {
  idleTimeoutMinutes: number;
  awayTimeoutMinutes: number;
  offlineTimeoutMinutes: number;
  enableAutoPresenceUpdates: boolean;
}

interface UserActivity {
  user_id: string;
  last_active: string;
  current_status: string;
  is_manual: boolean; // true if user manually set status (busy, in_call, etc.)
}

export class PresenceManager {
  private settings: PresenceSettings | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSettings();
  }

  /**
   * Load presence settings from the database
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsRows = await queryAsync(`
        SELECT setting_key, setting_value 
        FROM system_settings 
        WHERE setting_key IN ('idleTimeoutMinutes', 'awayTimeoutMinutes', 'offlineTimeoutMinutes', 'enableAutoPresenceUpdates')
      `);

      const settings: any = {
        idleTimeoutMinutes: 10,
        awayTimeoutMinutes: 30,
        offlineTimeoutMinutes: 60,
        enableAutoPresenceUpdates: true
      };

      settingsRows.forEach((row: any) => {
        try {
          settings[row.setting_key] = JSON.parse(row.setting_value);
        } catch (error) {
          console.warn(`Failed to parse presence setting ${row.setting_key}:`, row.setting_value);
        }
      });

      this.settings = settings;
      console.log('Presence Manager: Settings loaded', this.settings);
    } catch (error) {
      console.error('Failed to load presence settings:', error);
      // Use defaults
      this.settings = {
        idleTimeoutMinutes: 10,
        awayTimeoutMinutes: 30,
        offlineTimeoutMinutes: 60,
        enableAutoPresenceUpdates: true
      };
    }
  }

  /**
   * Start the automatic presence update service
   */
  public start(): void {
    if (this.updateInterval) {
      console.log('Presence Manager: Already running');
      return;
    }

    console.log('Presence Manager: Starting automatic presence updates');
    
    // Run every minute
    this.updateInterval = setInterval(async () => {
      await this.updateUserPresence();
    }, 60000); // 60 seconds

    // Run immediately on start
    this.updateUserPresence();
  }

  /**
   * Stop the automatic presence update service
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Presence Manager: Stopped automatic presence updates');
    }
  }

  /**
   * Update user presence based on activity and timeout settings
   */
  private async updateUserPresence(): Promise<void> {
    if (!this.settings?.enableAutoPresenceUpdates) {
      return;
    }

    try {
      // Get all users with presence data
      const users = await queryAsync(`
        SELECT 
          p.user_id,
          p.status,
          p.last_active,
          p.status_message,
          p.is_manual,
          datetime(p.last_active) as last_active_datetime
        FROM user_presence p
        WHERE p.status != 'offline'
      `) as UserActivity[];

      const now = new Date();
      const updates: Array<{userId: string, newStatus: string, reason: string}> = [];

      for (const user of users) {
        // Skip users with manual status (busy, in_call, in_meeting, presenting)
        if (user.current_status === 'busy' || 
            user.current_status === 'in_call' || 
            user.current_status === 'in_meeting' || 
            user.current_status === 'presenting') {
          continue;
        }

        const lastActive = new Date(user.last_active);
        const minutesInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));

        let newStatus = user.current_status;
        let reason = '';

        // Determine new status based on inactivity time
        if (minutesInactive >= this.settings.offlineTimeoutMinutes) {
          newStatus = 'offline';
          reason = `Inactive for ${minutesInactive} minutes (offline threshold: ${this.settings.offlineTimeoutMinutes}min)`;
        } else if (minutesInactive >= this.settings.awayTimeoutMinutes) {
          newStatus = 'away';
          reason = `Inactive for ${minutesInactive} minutes (away threshold: ${this.settings.awayTimeoutMinutes}min)`;
        } else if (minutesInactive >= this.settings.idleTimeoutMinutes) {
          newStatus = 'idle';
          reason = `Inactive for ${minutesInactive} minutes (idle threshold: ${this.settings.idleTimeoutMinutes}min)`;
        }

        // Only update if status changed
        if (newStatus !== user.current_status) {
          updates.push({
            userId: user.user_id,
            newStatus,
            reason
          });
        }
      }

      // Apply updates
      for (const update of updates) {
        await runAsync(`
          UPDATE user_presence 
          SET status = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `, [update.newStatus, update.userId]);

        console.log(`Presence Manager: Updated ${update.userId} to ${update.newStatus} - ${update.reason}`);
      }

      if (updates.length > 0) {
        console.log(`Presence Manager: Updated ${updates.length} user(s) presence status`);
      }

    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }

  /**
   * Update a user's activity timestamp (call when user performs any action)
   */
  public async updateUserActivity(userId: string): Promise<void> {
    try {
      await runAsync(`
        UPDATE user_presence 
        SET last_active = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `, [userId]);
    } catch (error) {
      console.error(`Failed to update activity for user ${userId}:`, error);
    }
  }

  /**
   * Set a user's manual status (busy, in_call, in_meeting, presenting)
   */
  public async setManualStatus(userId: string, status: string, statusMessage?: string): Promise<void> {
    try {
      await runAsync(`
        UPDATE user_presence 
        SET status = ?, status_message = ?, is_manual = 1, last_active = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `, [status, statusMessage || null, userId]);

      console.log(`Presence Manager: Set manual status for ${userId} to ${status}`);
    } catch (error) {
      console.error(`Failed to set manual status for user ${userId}:`, error);
    }
  }

  /**
   * Reset a user from manual status back to automatic (online)
   */
  public async resetToAutomatic(userId: string): Promise<void> {
    try {
      await runAsync(`
        UPDATE user_presence 
        SET status = 'online', is_manual = 0, status_message = NULL, last_active = CURRENT_TIMESTAMP 
        WHERE user_id = ?
      `, [userId]);

      console.log(`Presence Manager: Reset ${userId} back to automatic presence`);
    } catch (error) {
      console.error(`Failed to reset user ${userId} to automatic:`, error);
    }
  }

  /**
   * Reload settings from database (call when settings are updated)
   */
  public async reloadSettings(): Promise<void> {
    await this.loadSettings();
    console.log('Presence Manager: Settings reloaded');
  }

  /**
   * Get current settings
   */
  public getSettings(): PresenceSettings | null {
    return this.settings;
  }
}

// Export singleton instance
export const presenceManager = new PresenceManager();