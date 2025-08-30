import { queryAsync, runAsync, getAsync } from './database';
import { systemLogger } from './logger';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'quality' | 'collaboration' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: string;
  xp_reward: number;
  criteria_type: 'ticket_count' | 'streak_days' | 'template_usage' | 'category_diversity' | 'time_saved' | 'team_collaboration' | 'special_event';
  criteria_value: number;
  criteria_data?: string;
  progress?: number;
  max_progress?: number;
  unlocked_at?: string;
}

export interface UserProgress {
  ticketsGenerated: number;
  streakDays: number;
  templatesUsed: number;
  categoriesTouched: number;
  timeSavedMinutes: number;
  collaborationPoints: number;
}

export class AchievementService {
  /**
   * Check and unlock achievements for a user based on their current progress
   */
  static async checkAchievements(userId: number, username: string): Promise<Achievement[]> {
    try {
      const newlyUnlocked: Achievement[] = [];
      
      // Get user's current progress
      const progress = await this.getUserProgress(userId, username);
      
      // Get all active achievements
      const achievements = await queryAsync(`
        SELECT a.*, ua.progress, ua.max_progress, ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        WHERE a.active = TRUE
        ORDER BY a.rarity, a.name
      `, [userId]);

      for (const achievement of achievements) {
        // Skip if already unlocked
        if (achievement.unlocked_at) continue;

        const shouldUnlock = await this.evaluateAchievement(achievement, progress, userId, username);
        
        if (shouldUnlock) {
          await this.unlockAchievement(userId, achievement.id, achievement.xp_reward);
          
          // Add to newly unlocked list
          newlyUnlocked.push({
            ...achievement,
            unlocked_at: new Date().toISOString()
          });

          systemLogger.info('achievement_unlocked', `🏆 Achievement unlocked: ${achievement.name} for user ${username}`);
        } else {
          // Update progress for tracking achievements
          await this.updateAchievementProgress(userId, achievement, progress);
        }
      }

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievements:', error);
      systemLogger.error('Error checking achievements', `userId: ${userId}, username: ${username}, error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get user's comprehensive progress metrics
   */
  static async getUserProgress(userId: number, username: string): Promise<UserProgress> {
    try {
      // Get total tickets generated
      const ticketsResult = await getAsync(`
        SELECT COUNT(*) as count 
        FROM user_tickets 
        WHERE submitted_by = ? OR assigned_to = ?
      `, [username, username]);

      // Get current streak
      const streakResult = await this.calculateStreak(username);

      // Get template usage (mock for now - would need template tracking)
      const templatesUsed = Math.floor((ticketsResult?.count || 0) * 0.3);

      // Get category diversity
      const categoriesResult = await getAsync(`
        SELECT COUNT(DISTINCT category) as count
        FROM user_tickets 
        WHERE (submitted_by = ? OR assigned_to = ?) AND category IS NOT NULL
      `, [username, username]);

      // Get time saved (estimated from template usage)
      const timeSavedMinutes = templatesUsed * 15; // 15 minutes saved per template

      return {
        ticketsGenerated: ticketsResult?.count || 0,
        streakDays: streakResult,
        templatesUsed: templatesUsed,
        categoriesTouched: categoriesResult?.count || 0,
        timeSavedMinutes: timeSavedMinutes,
        collaborationPoints: 0 // Would track actual collaboration
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      return {
        ticketsGenerated: 0,
        streakDays: 0,
        templatesUsed: 0,
        categoriesTouched: 0,
        timeSavedMinutes: 0,
        collaborationPoints: 0
      };
    }
  }

  /**
   * Calculate user's current streak
   */
  static async calculateStreak(username: string): Promise<number> {
    try {
      const recentDays = await queryAsync(`
        SELECT DISTINCT DATE(submitted_at) as date
        FROM user_tickets 
        WHERE submitted_by = ? OR assigned_to = ?
        ORDER BY date DESC
        LIMIT 30
      `, [username, username]);

      if (recentDays.length === 0) return 0;

      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Check if user has activity today or yesterday to start streak count
      const latestDate = recentDays[0].date;
      if (latestDate === today || latestDate === yesterday) {
        streak = 1;
        
        // Count consecutive days backward
        for (let i = 1; i < recentDays.length; i++) {
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - streak);
          const expectedDateStr = expectedDate.toISOString().split('T')[0];
          
          if (recentDays[i].date === expectedDateStr) {
            streak++;
          } else {
            break;
          }
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  /**
   * Evaluate if an achievement should be unlocked
   */
  static async evaluateAchievement(
    achievement: any, 
    progress: UserProgress, 
    userId: number, 
    username: string
  ): Promise<boolean> {
    switch (achievement.criteria_type) {
      case 'ticket_count':
        return progress.ticketsGenerated >= achievement.criteria_value;
      
      case 'streak_days':
        return progress.streakDays >= achievement.criteria_value;
      
      case 'template_usage':
        return progress.templatesUsed >= achievement.criteria_value;
      
      case 'category_diversity':
        return progress.categoriesTouched >= achievement.criteria_value;
      
      case 'time_saved':
        return progress.timeSavedMinutes >= achievement.criteria_value;
      
      case 'team_collaboration':
        return progress.collaborationPoints >= achievement.criteria_value;
      
      case 'special_event':
        // Special achievements require custom logic
        if (achievement.id === 'early_adopter') {
          // Check if user is among first N users (criteria_value)
          const userCount = await getAsync('SELECT COUNT(*) as count FROM users WHERE active = TRUE');
          return (userCount?.count || 0) <= 50; // First 50 users
        }
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Update achievement progress for tracking achievements
   */
  static async updateAchievementProgress(userId: number, achievement: any, progress: UserProgress): Promise<void> {
    try {
      let currentProgress = 0;
      let maxProgress = achievement.criteria_value || 100;

      switch (achievement.criteria_type) {
        case 'ticket_count':
          currentProgress = progress.ticketsGenerated;
          break;
        case 'streak_days':
          currentProgress = progress.streakDays;
          break;
        case 'template_usage':
          currentProgress = progress.templatesUsed;
          break;
        case 'category_diversity':
          currentProgress = progress.categoriesTouched;
          break;
        case 'time_saved':
          currentProgress = progress.timeSavedMinutes;
          break;
        case 'team_collaboration':
          currentProgress = progress.collaborationPoints;
          break;
        default:
          return;
      }

      await runAsync(`
        INSERT OR REPLACE INTO user_achievements 
        (user_id, achievement_id, progress, max_progress, created_at)
        VALUES (?, ?, ?, ?, DATETIME('now'))
      `, [userId, achievement.id, currentProgress, maxProgress]);
    } catch (error) {
      console.error('Error updating achievement progress:', error);
    }
  }

  /**
   * Unlock an achievement for a user
   */
  static async unlockAchievement(userId: number, achievementId: string, xpReward: number): Promise<void> {
    try {
      await runAsync(`
        INSERT OR REPLACE INTO user_achievements 
        (user_id, achievement_id, progress, max_progress, unlocked_at, created_at)
        VALUES (?, ?, 100, 100, DATETIME('now'), DATETIME('now'))
      `, [userId, achievementId]);

      // Award XP (this would integrate with the leveling system)
      systemLogger.info('xp_awarded', `XP awarded: ${xpReward} for achievement ${achievementId}`);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      throw error;
    }
  }

  /**
   * Get all achievements with user progress
   */
  static async getUserAchievements(userId: number): Promise<Achievement[]> {
    try {
      const achievements = await queryAsync(`
        SELECT 
          a.*,
          ua.progress,
          ua.max_progress,
          ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        WHERE a.active = TRUE
        ORDER BY 
          CASE 
            WHEN ua.unlocked_at IS NOT NULL THEN 0 
            ELSE 1 
          END,
          a.rarity,
          a.name
      `, [userId]);

      return achievements.map((ach: any) => ({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        rarity: ach.rarity,
        icon: ach.icon,
        xp_reward: ach.xp_reward,
        criteria_type: ach.criteria_type,
        criteria_value: ach.criteria_value,
        criteria_data: ach.criteria_data,
        progress: ach.progress || 0,
        max_progress: ach.max_progress || ach.criteria_value || 100,
        unlocked_at: ach.unlocked_at
      }));
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Get recently unlocked achievements for a user (for dashboard display)
   */
  static async getRecentAchievements(userId: number, limit: number = 5): Promise<Achievement[]> {
    try {
      const achievements = await queryAsync(`
        SELECT 
          a.*,
          ua.unlocked_at
        FROM achievements a
        JOIN user_achievements ua ON a.id = ua.achievement_id
        WHERE ua.user_id = ? AND ua.unlocked_at IS NOT NULL
        ORDER BY ua.unlocked_at DESC
        LIMIT ?
      `, [userId, limit]);

      return achievements.map((ach: any) => ({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        rarity: ach.rarity,
        icon: ach.icon,
        xp_reward: ach.xp_reward,
        criteria_type: ach.criteria_type,
        criteria_value: ach.criteria_value,
        unlocked_at: ach.unlocked_at
      }));
    } catch (error) {
      console.error('Error getting recent achievements:', error);
      return [];
    }
  }

  /**
   * Trigger achievement check after ticket events
   */
  static async onTicketEvent(userId: number, username: string, eventType: 'created' | 'updated' | 'completed'): Promise<Achievement[]> {
    // Check achievements and return any newly unlocked ones
    return await this.checkAchievements(userId, username);
  }
}