/**
 * Admin Service
 * Handles all admin-related operations including chat settings, user management, and system configuration
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';

export class AdminService extends BaseService {
  constructor() {
    super('admin');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      // Chat management operations
      case 'get_chat_settings':
        return this.getChatSettings(data, context);
      case 'update_chat_settings':
        return this.updateChatSettings(data, context);
      case 'get_chat_stats':
        return this.getChatStats(data, context);
      case 'get_chat_users':
        return this.getChatUsers(data, context);
      case 'force_logout_user':
        return this.forceLogoutUser(data, context);
      case 'block_user':
        return this.blockUser(data, context);
      case 'get_all_messages':
        return this.getAllMessages(data, context);
      case 'export_messages':
        return this.exportMessages(data, context);

      // Widget and UI settings
      case 'get_widget_settings':
        return this.getWidgetSettings(data, context);
      case 'update_widget_settings':
        return this.updateWidgetSettings(data, context);
      case 'get_websocket_settings':
        return this.getWebsocketSettings(data, context);
      case 'update_websocket_settings':
        return this.updateWebsocketSettings(data, context);

      // Theme management
      case 'get_theme_settings':
        return this.getThemeSettings(data, context);
      case 'update_theme_settings':
        return this.updateThemeSettings(data, context);
      case 'get_theme_analytics':
        return this.getThemeAnalytics(data, context);
      case 'force_theme_compliance':
        return this.forceThemeCompliance(data, context);

      // Portal and system settings
      case 'get_portal_settings':
        return this.getPortalSettings(data, context);
      case 'update_portal_settings':
        return this.updatePortalSettings(data, context);
      case 'get_recovery_settings':
        return this.getRecoverySettings(data, context);
      case 'get_work_mode_settings':
        return this.getWorkModeSettings(data, context);
      case 'update_work_mode_settings':
        return this.updateWorkModeSettings(data, context);

      // Table configuration
      case 'get_table_configs':
        return this.getTableConfigs(data, context);
      case 'get_table_views':
        return this.getTableViews(data, context);
      case 'get_table_data':
        return this.getTableData(data, context);

      default:
        throw new Error(`Unknown admin action: ${action}`);
    }
  }

  /**
   * Chat Settings Management
   */
  private async getChatSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.manage_chat_settings');
    
    this.log(context, 'Getting chat settings');
    
    // Get chat system settings from database
    const settings = await queryAsync(`
      SELECT setting_key, setting_value, description, category 
      FROM chat_system_settings 
      ORDER BY category, setting_key
    `);
    
    // Transform to key-value object
    const chatSettings: any = {
      general: {},
      moderation: {},
      features: {},
      limits: {}
    };
    
    settings.forEach((setting: any) => {
      const category = setting.category || 'general';
      if (!chatSettings[category]) {
        chatSettings[category] = {};
      }
      chatSettings[category][setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });
    
    return this.success(chatSettings);
  }

  private async updateChatSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.manage_chat_settings');
    
    this.validateRequiredFields(data, ['settings']);
    const { settings } = data;
    
    this.log(context, 'Updating chat settings', { settingsCount: Object.keys(settings).length });
    
    const user = context.user!;
    const updatePromises = [];
    
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [settingName, settingData] of Object.entries(categorySettings as any)) {
        updatePromises.push(
          runAsync(`
            INSERT OR REPLACE INTO chat_system_settings 
            (setting_key, setting_value, category, description, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `, [
            settingName,
            typeof settingData === 'object' ? (settingData as any).value : settingData,
            category,
            typeof settingData === 'object' ? (settingData as any).description : null,
            user.username
          ])
        );
      }
    }
    
    await Promise.all(updatePromises);
    
    return this.success({ updated: true, settings_count: updatePromises.length }, 'Chat settings updated');
  }

  private async getChatStats(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting chat statistics');
    
    const { period = '7d' } = data;
    
    // Calculate date range based on period
    let dateFilter = '';
    switch (period) {
      case '24h':
        dateFilter = "AND created_at >= datetime('now', '-1 day')";
        break;
      case '7d':
        dateFilter = "AND created_at >= datetime('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "AND created_at >= datetime('now', '-30 days')";
        break;
    }
    
    // Get comprehensive chat statistics
    const [messageStats, channelStats, userStats, publicChatStats] = await Promise.all([
      // Message statistics
      queryAsync(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(DISTINCT channel_id) as active_channels,
          AVG(LENGTH(message_text)) as avg_message_length
        FROM chat_messages 
        WHERE is_deleted = FALSE ${dateFilter}
      `),
      
      // Channel statistics  
      queryAsync(`
        SELECT 
          c.type,
          COUNT(*) as channel_count,
          AVG(member_count) as avg_members
        FROM chat_channels c
        LEFT JOIN (
          SELECT channel_id, COUNT(*) as member_count 
          FROM chat_channel_members 
          GROUP BY channel_id
        ) cm ON c.id = cm.channel_id
        WHERE c.active = TRUE
        GROUP BY c.type
      `),
      
      // User activity statistics
      queryAsync(`
        SELECT 
          COUNT(DISTINCT cm.user_id) as total_chat_users,
          COUNT(DISTINCT CASE WHEN up.status = 'online' THEN up.user_id END) as online_users
        FROM chat_messages cm
        LEFT JOIN user_presence up ON cm.user_id = up.user_id
        WHERE cm.is_deleted = FALSE ${dateFilter}
      `),
      
      // Public chat statistics
      queryAsync(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_sessions,
          AVG(total_chat_duration) as avg_duration,
          AVG(first_response_time) as avg_response_time
        FROM public_chat_sessions 
        WHERE created_at >= datetime('now', '-7 days')
      `)
    ]);
    
    return this.success({
      period,
      messages: messageStats[0] || {},
      channels: channelStats,
      users: userStats[0] || {},
      public_chat: publicChatStats[0] || {}
    });
  }

  private async getChatUsers(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.manage_chat_settings');
    
    this.log(context, 'Getting chat users');
    
    const { limit = 50, offset = 0, status = 'all' } = data;
    
    let statusFilter = '';
    if (status !== 'all') {
      statusFilter = 'AND up.status = ?';
    }
    
    const params = status !== 'all' ? [status, limit, offset] : [limit, offset];
    
    const users = await queryAsync(`
      SELECT 
        u.username,
        u.display_name,
        u.role,
        up.status as presence_status,
        up.last_active as last_seen,
        COUNT(DISTINCT cm.id) as message_count,
        COUNT(DISTINCT ccm.channel_id) as channels_joined
      FROM users u
      LEFT JOIN user_presence up ON u.username = up.user_id
      LEFT JOIN chat_messages cm ON u.username = cm.user_id AND cm.created_at >= datetime('now', '-7 days')
      LEFT JOIN chat_channel_members ccm ON u.username = ccm.user_id
      WHERE u.active = TRUE ${statusFilter}
      GROUP BY u.username, u.display_name, u.role, up.status, up.last_active
      ORDER BY message_count DESC, u.display_name
      LIMIT ? OFFSET ?
    `, params);
    
    const totalCount = await queryAsync(`
      SELECT COUNT(DISTINCT u.username) as total
      FROM users u
      LEFT JOIN user_presence up ON u.username = up.user_id
      WHERE u.active = TRUE ${statusFilter}
    `, status !== 'all' ? [status] : []);
    
    return this.createPaginatedResponse(
      users,
      totalCount[0]?.total || 0,
      Math.floor(offset / limit) + 1,
      limit
    );
  }

  /**
   * User Management Operations
   */
  private async forceLogoutUser(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.manage_users');
    
    this.validateRequiredFields(data, ['username']);
    const { username, reason = 'Administrative action' } = data;
    
    this.log(context, 'Force logging out user', { targetUser: username, reason });
    
    // Update user presence to offline
    await runAsync(`
      UPDATE user_presence 
      SET status = 'offline', last_active = datetime('now')
      WHERE user_id = ?
    `, [username]);
    
    // Log the action (table may not exist, so handle gracefully)
    try {
      await runAsync(`
        INSERT INTO admin_actions (action_type, target_user, performed_by, reason, created_at)
        VALUES ('force_logout', ?, ?, ?, datetime('now'))
      `, [username, context.user!.username, reason]);
    } catch (error) {
      // Admin actions table doesn't exist, continue without logging
      this.log(context, 'Admin actions table not found, skipping audit log');
    }
    
    return this.success({ 
      username, 
      action: 'force_logout', 
      performed_by: context.user!.username 
    }, `User ${username} has been logged out`);
  }

  private async blockUser(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.manage_users');
    
    this.validateRequiredFields(data, ['username']);
    const { username, duration_hours = 24, reason = 'Administrative action' } = data;
    
    this.log(context, 'Blocking user', { targetUser: username, durationHours: duration_hours, reason });
    
    const blockUntil = new Date(Date.now() + (duration_hours * 60 * 60 * 1000)).toISOString();
    
    // Block user from posting in all channels
    await runAsync(`
      UPDATE chat_channel_members 
      SET can_post = FALSE, 
          blocked_from_posting_by = ?, 
          blocked_from_posting_at = datetime('now')
      WHERE user_id = ?
    `, [context.user!.username, username]);
    
    // Log the action (table may not exist, so handle gracefully)
    try {
      await runAsync(`
        INSERT INTO admin_actions (action_type, target_user, performed_by, reason, metadata, created_at)
        VALUES ('block_user', ?, ?, ?, ?, datetime('now'))
      `, [username, context.user!.username, reason, JSON.stringify({ duration_hours, block_until: blockUntil })]);
    } catch (error) {
      // Admin actions table doesn't exist, continue without logging
      this.log(context, 'Admin actions table not found, skipping audit log');
    }
    
    return this.success({
      username,
      action: 'blocked',
      duration_hours,
      block_until: blockUntil,
      performed_by: context.user!.username
    }, `User ${username} has been blocked for ${duration_hours} hours`);
  }

  /**
   * Portal and System Settings
   */
  private async getPortalSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_settings');
    
    this.log(context, 'Getting portal settings');
    
    // Portal settings are stored as JSON in a single row
    const settingsRow = await getAsync(`
      SELECT id, settings_json, updated_by, updated_at
      FROM portal_settings
      WHERE id = 'main'
    `);
    
    if (settingsRow) {
      const settings = JSON.parse(settingsRow.settings_json);
      return this.success({
        settings,
        updated_by: settingsRow.updated_by,
        updated_at: settingsRow.updated_at
      });
    }
    
    // Return default settings if none exist
    return this.success({
      settings: {
        general: {
          site_title: 'Orvale Management System',
          maintenance_mode: false
        },
        branding: {
          logo_url: '/logo.png',
          theme_color: '#2563eb'
        }
      },
      updated_by: null,
      updated_at: null
    });
  }

  private async updatePortalSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.manage_settings');
    
    this.validateRequiredFields(data, ['settings']);
    const { settings } = data;
    
    this.log(context, 'Updating portal settings', { categories: Object.keys(settings) });
    
    const user = context.user!;
    
    // Update or insert portal settings as JSON
    await runAsync(`
      INSERT OR REPLACE INTO portal_settings 
      (id, settings_json, updated_by, updated_at)
      VALUES ('main', ?, ?, datetime('now'))
    `, [JSON.stringify(settings), user.username]);
    
    return this.success({ 
      updated: true, 
      settings_count: Object.keys(settings).length 
    }, 'Portal settings updated successfully');
  }

  /**
   * Placeholder methods for remaining operations
   */
  private async getAllMessages(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get all messages - Implementation pending' });
  }

  private async exportMessages(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Export messages - Implementation pending' });
  }

  private async getWidgetSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get widget settings - Implementation pending' });
  }

  private async updateWidgetSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    return this.success({ message: 'Update widget settings - Implementation pending' });
  }

  private async getWebsocketSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get websocket settings - Implementation pending' });
  }

  private async updateWebsocketSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    return this.success({ message: 'Update websocket settings - Implementation pending' });
  }

  private async getThemeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get theme settings - Implementation pending' });
  }

  private async updateThemeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    return this.success({ message: 'Update theme settings - Implementation pending' });
  }

  private async getThemeAnalytics(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get theme analytics - Implementation pending' });
  }

  private async forceThemeCompliance(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    return this.success({ message: 'Force theme compliance - Implementation pending' });
  }

  private async getRecoverySettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get recovery settings - Implementation pending' });
  }

  private async getWorkModeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get work mode settings - Implementation pending' });
  }

  private async updateWorkModeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    return this.success({ message: 'Update work mode settings - Implementation pending' });
  }

  private async getTableConfigs(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get table configs - Implementation pending' });
  }

  private async getTableViews(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get table views - Implementation pending' });
  }

  private async getTableData(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    return this.success({ message: 'Get table data - Implementation pending' });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity for admin tables
      await queryAsync('SELECT COUNT(*) as count FROM users LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM chat_system_settings LIMIT 1');
      
      return {
        status: 'healthy',
        service: 'AdminService', 
        database: 'connected',
        implementation_status: 'Phase 3 - Core admin operations implemented',
        features: [
          'get_chat_settings', 'update_chat_settings', 'get_chat_stats',
          'get_chat_users', 'force_logout_user', 'block_user', 
          'get_portal_settings', 'update_portal_settings'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'AdminService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}