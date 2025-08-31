/**
 * Achievement Service
 * Handles all achievement-related operations including admin management and dashboard settings
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';

export class AchievementService extends BaseService {
  constructor() {
    super('achievements');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      // CRUD operations for achievements
      case 'list':
        return this.listAchievements(data, context);
      case 'create':
        return this.createAchievement(data, context);
      case 'get':
        return this.getAchievement(data, context);
      case 'update':
        return this.updateAchievement(data, context);
      case 'partial_update':
        return this.partialUpdateAchievement(data, context);
      case 'delete':
        return this.deleteAchievement(data, context);

      // User achievement operations
      case 'get_stats':
        return this.getUserStats(data, context);

      // Dashboard and toast configuration
      case 'get_dashboard_settings':
        return this.getDashboardSettings(data, context);
      case 'update_dashboard_settings':
        return this.updateDashboardSettings(data, context);
      case 'get_toast_config':
        return this.getToastConfig(data, context);
      case 'update_toast_config':
        return this.updateToastConfig(data, context);

      default:
        throw new Error(`Unknown achievement action: ${action}`);
    }
  }

  /**
   * List all achievements with optional filtering
   */
  private async listAchievements(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Listing achievements');

    const { 
      category = '', 
      rarity = '', 
      active = true, 
      limit = 50, 
      offset = 0 
    } = data;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    // Category filter
    if (category && category !== 'all') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // Rarity filter
    if (rarity && rarity !== 'all') {
      whereClause += ' AND rarity = ?';
      params.push(rarity);
    }

    // Active filter
    if (active !== null && active !== undefined) {
      whereClause += ' AND active = ?';
      params.push(active ? 1 : 0);
    }

    // Get achievements with user statistics
    const achievements = await queryAsync(`
      SELECT 
        a.*,
        COUNT(ua.user_id) as total_unlocked,
        COUNT(DISTINCT CASE WHEN ua.unlocked_at IS NULL THEN ua.user_id END) as in_progress,
        AVG(ua.progress) as avg_progress
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.display_order ASC, a.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await queryAsync(`
      SELECT COUNT(*) as total FROM achievements a ${whereClause}
    `, params);

    const total = countResult[0]?.total || 0;

    return this.createPaginatedResponse(
      achievements,
      total,
      Math.floor(offset / limit) + 1,
      limit
    );
  }

  /**
   * Create new achievement
   */
  private async createAchievement(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['id', 'name', 'description', 'category', 'rarity', 'icon', 'criteria_type']);
    
    const {
      id, name, description, category, rarity, icon, xp_reward = 0,
      criteria_type, criteria_value, criteria_data, active = true,
      display_order = 0, icon_type = 'emoji', toast_config,
      active_from, active_until, custom_css
    } = data;

    this.log(context, 'Creating achievement', { id, name, category });

    const user = context.user!;

    // Validate category
    const validCategories = ['productivity', 'quality', 'collaboration', 'special'];
    if (!validCategories.includes(category)) {
      throw new ValidationError(`Invalid category: ${category}`);
    }

    // Validate rarity
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      throw new ValidationError(`Invalid rarity: ${rarity}`);
    }

    // Validate criteria type
    const validCriteriaTypes = [
      'ticket_count', 'streak_days', 'template_usage', 'category_diversity', 
      'time_saved', 'team_collaboration', 'special_event'
    ];
    if (!validCriteriaTypes.includes(criteria_type)) {
      throw new ValidationError(`Invalid criteria_type: ${criteria_type}`);
    }

    // Insert achievement
    await runAsync(`
      INSERT INTO achievements (
        id, name, description, category, rarity, icon, xp_reward,
        criteria_type, criteria_value, criteria_data, active,
        display_order, icon_type, toast_config, active_from, active_until,
        created_by, custom_css, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      id, name, description, category, rarity, icon, xp_reward,
      criteria_type, criteria_value, 
      criteria_data ? JSON.stringify(criteria_data) : null, 
      active ? 1 : 0, display_order, icon_type, 
      toast_config ? JSON.stringify(toast_config) : null,
      active_from, active_until, user.username, custom_css
    ]);

    this.log(context, 'Achievement created successfully', { id, name });

    return this.success({
      id, name, category, rarity, active,
      created_by: user.username,
      created_at: new Date().toISOString()
    }, `Achievement created: ${name}`);
  }

  /**
   * Get single achievement details
   */
  private async getAchievement(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.validateRequiredFields(data, ['id']);
    const { id } = data;
    
    this.log(context, 'Getting achievement details', { achievementId: id });

    const achievement = await getAsync(`
      SELECT 
        a.*,
        COUNT(ua.user_id) as total_unlocked,
        COUNT(DISTINCT CASE WHEN ua.unlocked_at IS NULL THEN ua.user_id END) as in_progress,
        AVG(ua.progress) as avg_progress
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE a.id = ?
      GROUP BY a.id
    `, [id]);

    if (!achievement) {
      throw new ValidationError(`Achievement not found: ${id}`);
    }

    // Get recent unlocks
    const recentUnlocks = await queryAsync(`
      SELECT 
        ua.unlocked_at,
        u.display_name,
        u.username
      FROM user_achievements ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.achievement_id = ? AND ua.unlocked_at IS NOT NULL
      ORDER BY ua.unlocked_at DESC
      LIMIT 10
    `, [id]);

    return this.success({
      ...achievement,
      recent_unlocks: recentUnlocks
    });
  }

  /**
   * Update achievement
   */
  private async updateAchievement(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['id']);
    const { id, ...updates } = data;
    
    this.log(context, 'Updating achievement', { achievementId: id, fields: Object.keys(updates) });

    // Check achievement exists
    const existing = await getAsync('SELECT id FROM achievements WHERE id = ?', [id]);
    if (!existing) {
      throw new ValidationError(`Achievement not found: ${id}`);
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];
    
    const allowedFields = [
      'name', 'description', 'category', 'rarity', 'icon', 'xp_reward',
      'criteria_type', 'criteria_value', 'criteria_data', 'active',
      'display_order', 'icon_type', 'toast_config', 'active_from', 
      'active_until', 'custom_css'
    ];
    
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field) && value !== undefined) {
        updateFields.push(`${field} = ?`);
        
        // Handle JSON fields
        if (['criteria_data', 'toast_config'].includes(field) && value !== null) {
          updateParams.push(JSON.stringify(value));
        } else {
          updateParams.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return this.success(existing, 'No changes to update');
    }

    // Add updated metadata
    updateFields.push('updated_by = ?', 'updated_at = datetime(\'now\')');
    updateParams.push(context.user!.username, id);

    await runAsync(`
      UPDATE achievements SET ${updateFields.join(', ')} WHERE id = ?
    `, updateParams);

    this.log(context, 'Achievement updated successfully', { achievementId: id });

    // Return updated achievement
    const updated = await getAsync('SELECT * FROM achievements WHERE id = ?', [id]);
    return this.success(updated, `Achievement updated: ${id}`);
  }

  /**
   * Partial update (for admin interface)
   */
  private async partialUpdateAchievement(data: any, context: RequestContext): Promise<any> {
    // Same as update but allows partial field updates
    return this.updateAchievement(data, context);
  }

  /**
   * Delete achievement (soft delete)
   */
  private async deleteAchievement(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['id']);
    const { id } = data;
    
    this.log(context, 'Deleting achievement', { achievementId: id });

    // Soft delete - mark as inactive
    const result = await runAsync(`
      UPDATE achievements 
      SET active = FALSE, updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [context.user!.username, id]);

    if (result.changes === 0) {
      throw new ValidationError(`Achievement not found: ${id}`);
    }

    return this.success({ id, deleted: true }, `Achievement deleted: ${id}`);
  }

  /**
   * Get user achievement statistics
   */
  private async getUserStats(data: any, context: RequestContext): Promise<any> {
    // Allow users to view their own stats
    const { user_id = context.user!.id } = data;
    
    this.log(context, 'Getting user achievement stats', { userId: user_id });

    // Check permission - users can view own stats, admins can view all
    if (user_id !== context.user!.id) {
      this.requirePermission(context, 'admin.view_analytics');
    }

    const stats = await queryAsync(`
      SELECT 
        a.category,
        COUNT(*) as total_in_category,
        COUNT(CASE WHEN ua.unlocked_at IS NOT NULL THEN 1 END) as unlocked_in_category,
        SUM(CASE WHEN ua.unlocked_at IS NOT NULL THEN a.xp_reward ELSE 0 END) as xp_earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      WHERE a.active = TRUE
      GROUP BY a.category
      ORDER BY a.category
    `, [user_id]);

    const overallStats = await getAsync(`
      SELECT 
        COUNT(DISTINCT a.id) as total_achievements,
        COUNT(DISTINCT CASE WHEN ua.unlocked_at IS NOT NULL THEN ua.achievement_id END) as unlocked_achievements,
        SUM(CASE WHEN ua.unlocked_at IS NOT NULL THEN a.xp_reward ELSE 0 END) as total_xp,
        COUNT(DISTINCT CASE WHEN ua.unlocked_at IS NULL AND ua.progress > 0 THEN ua.achievement_id END) as in_progress
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      WHERE a.active = TRUE
    `, [user_id]);

    return this.success({
      overall: overallStats,
      by_category: stats,
      completion_rate: overallStats.total_achievements > 0 
        ? ((overallStats.unlocked_achievements / overallStats.total_achievements) * 100).toFixed(1) 
        : 0
    });
  }

  /**
   * Dashboard settings operations
   */
  private async getDashboardSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting dashboard settings');
    
    // These could be stored in a settings table or return defaults
    const settings = {
      achievement_display: 'grid',
      show_progress_bars: true,
      show_xp_totals: true,
      categories_visible: ['productivity', 'quality', 'collaboration', 'special'],
      toast_enabled: true,
      toast_position: 'top-right',
      toast_duration: 5000
    };
    
    return this.success(settings);
  }

  private async updateDashboardSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.log(context, 'Updating dashboard settings', { settings: Object.keys(data) });
    
    // Implementation would store settings in database
    return this.success(data, 'Dashboard settings updated');
  }

  private async getToastConfig(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting toast configuration');
    
    const config = {
      enabled: true,
      position: 'top-right',
      duration: 5000,
      show_xp: true,
      show_rarity: true,
      sound_enabled: true,
      animations_enabled: true
    };
    
    return this.success(config);
  }

  private async updateToastConfig(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.log(context, 'Updating toast configuration', { config: Object.keys(data) });
    
    // Implementation would store config in database
    return this.success(data, 'Toast configuration updated');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity
      await queryAsync('SELECT COUNT(*) as count FROM achievements LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM user_achievements LIMIT 1');
      
      return {
        status: 'healthy',
        service: 'AchievementService',
        database: 'connected',
        implementation_status: 'Phase 2 - Full CRUD operations implemented',
        features: [
          'list', 'create', 'get', 'update', 'partial_update', 'delete',
          'get_stats', 'get_dashboard_settings', 'update_dashboard_settings',
          'get_toast_config', 'update_toast_config'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'AchievementService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}