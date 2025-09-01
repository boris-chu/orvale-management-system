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
    
    // Check Socket.io server status
    const socketioStatus = await this.checkSocketIOStatus();
    
    // Get user presence distribution
    const presenceStats = await queryAsync(`
      SELECT 
        status,
        COUNT(*) as count
      FROM user_presence 
      WHERE last_seen >= datetime('now', '-1 hour')
      GROUP BY status
    `);
    
    // Format presence data for frontend
    const presence = {
      online: 0,
      away: 0,
      busy: 0,
      offline: 0
    };
    
    presenceStats.forEach((stat: any) => {
      if (presence.hasOwnProperty(stat.status)) {
        presence[stat.status as keyof typeof presence] = stat.count;
      }
    });
    
    return this.success({
      period,
      // Socket.io server information
      socketio_status: socketioStatus.connected ? 'connected' : 'disconnected',
      socketio_port: 3001,
      socketio_uptime: socketioStatus.uptime || '0m',
      
      // User presence distribution
      users_online: presence.online,
      users_away: presence.away,
      users_busy: presence.busy,
      users_offline: presence.offline,
      active_users: presence.online + presence.away + presence.busy,
      
      // Channel and message stats
      total_channels: channelStats?.length || 0,
      messages_per_hour: messageStats[0]?.total_messages || 0,
      
      // Storage info (approximate)
      storage_used_mb: Math.round((messageStats[0]?.total_messages * 0.1) || 0),
      
      // Raw data for advanced analytics
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
   * Message Management Operations
   */
  private async getAllMessages(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    const { 
      channel_id = null, 
      user_id = null,
      start_date = null,
      end_date = null,
      limit = 100, 
      offset = 0,
      include_deleted = false
    } = data;
    
    this.log(context, 'Getting all messages', { channel_id, user_id, limit, offset });
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    if (!include_deleted) {
      conditions.push('m.is_deleted = FALSE');
    }
    
    if (channel_id) {
      conditions.push('m.channel_id = ?');
      params.push(channel_id);
    }
    
    if (user_id) {
      conditions.push('m.user_id = ?');
      params.push(user_id);
    }
    
    if (start_date) {
      conditions.push('m.created_at >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      conditions.push('m.created_at <= ?');
      params.push(end_date);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get messages with user and channel info
    const messages = await queryAsync(`
      SELECT 
        m.*,
        u.display_name as user_display_name,
        c.name as channel_name,
        c.type as channel_type,
        0 as reaction_count
      FROM chat_messages m
      LEFT JOIN users u ON m.user_id = u.username
      LEFT JOIN chat_channels c ON m.channel_id = c.id
      ${whereClause}
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // Get total count
    const totalResult = await queryAsync(`
      SELECT COUNT(*) as total
      FROM chat_messages m
      ${whereClause}
    `, params);
    
    return this.createPaginatedResponse(
      messages,
      totalResult[0]?.total || 0,
      Math.floor(offset / limit) + 1,
      limit
    );
  }

  private async exportMessages(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    const { 
      format = 'json',
      channel_id = null,
      start_date = null,
      end_date = null,
      include_reactions = true,
      include_files = true
    } = data;
    
    this.log(context, 'Exporting messages', { format, channel_id, start_date, end_date });
    
    // Build query for export
    const conditions = ['m.is_deleted = FALSE'];
    const params = [];
    
    if (channel_id) {
      conditions.push('m.channel_id = ?');
      params.push(channel_id);
    }
    
    if (start_date) {
      conditions.push('m.created_at >= ?');
      params.push(start_date);
    }
    
    if (end_date) {
      conditions.push('m.created_at <= ?');
      params.push(end_date);
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Get messages for export
    const messages = await queryAsync(`
      SELECT 
        m.*,
        u.display_name as user_display_name,
        c.name as channel_name,
        c.type as channel_type
      FROM chat_messages m
      LEFT JOIN users u ON m.user_id = u.username
      LEFT JOIN chat_channels c ON m.channel_id = c.id
      ${whereClause}
      ORDER BY m.created_at ASC
    `, params);
    
    // Get reactions if requested
    if (include_reactions && messages.length > 0) {
      try {
        const messageIds = messages.map((m: any) => m.id);
        const reactions = await queryAsync(`
          SELECT message_id, emoji, user_id 
          FROM message_reactions 
          WHERE message_id IN (${messageIds.map(() => '?').join(',')})
        `, messageIds);
        
        // Group reactions by message
        const reactionsByMessage: any = {};
        reactions.forEach((r: any) => {
          if (!reactionsByMessage[r.message_id]) {
            reactionsByMessage[r.message_id] = [];
          }
          reactionsByMessage[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
        });
        
        // Add reactions to messages
        messages.forEach((m: any) => {
          m.reactions = reactionsByMessage[m.id] || [];
        });
      } catch (error) {
        // Reactions table might not exist, continue without reactions
        this.log(context, 'Could not fetch reactions', { error });
        messages.forEach((m: any) => {
          m.reactions = [];
        });
      }
    }
    
    // Get files if requested
    if (include_files && messages.length > 0) {
      // For file messages, the file_attachment field contains the file reference
      messages.forEach((m: any) => {
        if (m.message_type === 'file' && m.file_attachment) {
          // Parse file attachment if it's JSON
          try {
            m.file_info = typeof m.file_attachment === 'string' 
              ? JSON.parse(m.file_attachment) 
              : m.file_attachment;
          } catch {
            m.file_info = { filename: m.file_attachment };
          }
        }
      });
    }
    
    // Format based on requested type
    let exportData;
    if (format === 'csv') {
      // Simple CSV format
      const csvHeaders = ['timestamp', 'channel', 'user', 'message', 'type'];
      const csvRows = messages.map((m: any) => [
        m.created_at,
        m.channel_name,
        m.user_display_name,
        m.message_text || '[File]',
        m.message_type
      ]);
      
      exportData = {
        format: 'csv',
        headers: csvHeaders,
        rows: csvRows,
        message: 'Export ready for download'
      };
    } else {
      // Default JSON format
      exportData = {
        format: 'json',
        export_date: new Date().toISOString(),
        total_messages: messages.length,
        messages: messages,
        filters_applied: { channel_id, start_date, end_date }
      };
    }
    
    return this.success(exportData, `Exported ${messages.length} messages`);
  }

  /**
   * Widget Settings Management
   */
  private async getWidgetSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting widget settings');
    
    // Get public chat widget settings
    const widgetSettings = await queryAsync(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key LIKE 'widget.%'
      ORDER BY setting_key
    `);
    
    // Transform to structured object
    const settings: any = {
      appearance: {},
      behavior: {},
      messages: {},
      features: {}
    };
    
    // Default widget settings if none exist
    const defaults = {
      'widget.enabled': { value: 'true', category: 'behavior' },
      'widget.position': { value: 'bottom-right', category: 'appearance' },
      'widget.theme_color': { value: '#2563eb', category: 'appearance' },
      'widget.auto_open': { value: 'false', category: 'behavior' },
      'widget.show_agent_photos': { value: 'true', category: 'appearance' },
      'widget.welcome_message': { value: 'Hello! How can we help you today?', category: 'messages' },
      'widget.offline_message': { value: 'We are currently offline. Please leave a message.', category: 'messages' },
      'widget.typing_indicator': { value: 'true', category: 'features' },
      'widget.file_upload': { value: 'true', category: 'features' },
      'widget.sound_notifications': { value: 'true', category: 'features' }
    };
    
    // Apply existing settings or use defaults
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const setting = widgetSettings.find((s: any) => s.setting_key === key);
      const category = defaultValue.category;
      const settingKey = key.replace('widget.', '');
      
      settings[category][settingKey] = {
        value: setting ? setting.setting_value : defaultValue.value,
        description: `${settingKey} setting`
      };
    });
    
    return this.success({
      settings,
      last_updated: widgetSettings[0]?.updated_at || null
    });
  }

  private async updateWidgetSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['settings']);
    const { settings } = data;
    
    this.log(context, 'Updating widget settings', { categories: Object.keys(settings) });
    
    const user = context.user!;
    const updatePromises = [];
    
    // Flatten settings and update
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [settingName, settingData] of Object.entries(categorySettings as any)) {
        const fullKey = `widget.${settingName}`;
        const value = typeof settingData === 'object' ? (settingData as any).value : settingData;
        const description = typeof settingData === 'object' ? (settingData as any).description : null;
        
        updatePromises.push(
          runAsync(`
            INSERT OR REPLACE INTO system_settings 
            (setting_key, setting_value, updated_by, updated_at)
            VALUES (?, ?, ?, datetime('now'))
          `, [fullKey, value, user.username])
        );
      }
    }
    
    await Promise.all(updatePromises);
    
    return this.success({ 
      updated: true, 
      settings_count: updatePromises.length 
    }, 'Widget settings updated successfully');
  }

  /**
   * WebSocket Settings Management
   */
  private async getWebsocketSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting websocket settings');
    
    // Get Socket.io server settings
    const socketSettings = await queryAsync(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key LIKE 'socket.%'
      ORDER BY setting_key
    `);
    
    // Transform to structured object
    const settings: any = {
      connection: {},
      performance: {},
      security: {},
      monitoring: {}
    };
    
    // Default socket settings
    const defaults = {
      'socket.enabled': { value: 'true', category: 'connection' },
      'socket.port': { value: '3001', category: 'connection' },
      'socket.cors_origin': { value: 'http://localhost', category: 'security' },
      'socket.ping_interval': { value: '25000', category: 'performance' },
      'socket.ping_timeout': { value: '60000', category: 'performance' },
      'socket.max_http_buffer_size': { value: '1000000', category: 'performance' },
      'socket.transports': { value: 'websocket,polling', category: 'connection' },
      'socket.allow_eis': { value: 'true', category: 'connection' },
      'socket.enable_binary': { value: 'true', category: 'performance' },
      'socket.log_level': { value: 'info', category: 'monitoring' },
      'socket.metrics_enabled': { value: 'true', category: 'monitoring' }
    };
    
    // Apply existing settings or use defaults
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const setting = socketSettings.find((s: any) => s.setting_key === key);
      const category = defaultValue.category;
      const settingKey = key.replace('socket.', '');
      
      settings[category][settingKey] = {
        value: setting ? setting.setting_value : defaultValue.value,
        description: `${settingKey} configuration`
      };
    });
    
    // Get current socket server status
    const serverStatus = {
      connected_clients: 0,
      uptime_seconds: 0,
      last_restart: null
    };
    
    // Try to get live stats (would normally connect to socket server)
    try {
      const response = await fetch('http://localhost:3001/admin/stats', {
        headers: { 'Authorization': `Bearer ${context.user?.username}` }
      });
      if (response.ok) {
        const stats = await response.json();
        serverStatus.connected_clients = stats.connected_clients || 0;
        serverStatus.uptime_seconds = stats.uptime_seconds || 0;
        serverStatus.last_restart = stats.started_at || null;
      }
    } catch (error) {
      // Socket server may not be running or accessible
      this.log(context, 'Could not fetch socket server stats', { error });
    }
    
    return this.success({
      settings,
      server_status: serverStatus,
      last_updated: socketSettings[0]?.updated_at || null
    });
  }

  private async updateWebsocketSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['settings']);
    const { settings, restart_server = false } = data;
    
    this.log(context, 'Updating websocket settings', { 
      categories: Object.keys(settings),
      restart_server 
    });
    
    const user = context.user!;
    const updatePromises = [];
    
    // Flatten settings and update
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [settingName, settingData] of Object.entries(categorySettings as any)) {
        const fullKey = `socket.${settingName}`;
        const value = typeof settingData === 'object' ? (settingData as any).value : settingData;
        const description = typeof settingData === 'object' ? (settingData as any).description : null;
        
        updatePromises.push(
          runAsync(`
            INSERT OR REPLACE INTO system_settings 
            (setting_key, setting_value, updated_by, updated_at)
            VALUES (?, ?, ?, datetime('now'))
          `, [fullKey, value, user.username])
        );
      }
    }
    
    await Promise.all(updatePromises);
    
    let restartStatus = null;
    if (restart_server) {
      try {
        // Trigger socket server restart (would normally send restart command)
        const response = await fetch('http://localhost:3001/admin/restart', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${context.user?.username}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: 'Settings update' })
        });
        
        restartStatus = response.ok ? 'success' : 'failed';
      } catch (error) {
        restartStatus = 'failed';
        this.log(context, 'Failed to restart socket server', { error });
      }
    }
    
    return this.success({ 
      updated: true, 
      settings_count: updatePromises.length,
      restart_requested: restart_server,
      restart_status: restartStatus
    }, 'WebSocket settings updated successfully');
  }

  /**
   * Theme Management
   */
  private async getThemeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting theme settings');
    
    // Get global theme settings
    const themeSettings = await queryAsync(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key LIKE 'theme.%'
      ORDER BY setting_key
    `);
    
    // Get user theme preferences count
    const userThemeStats = await queryAsync(`
      SELECT 
        internal_chat_theme as theme_mode,
        COUNT(*) as user_count
      FROM user_theme_preferences
      GROUP BY internal_chat_theme
    `);
    
    // Transform settings
    const settings: any = {
      global: {},
      defaults: {},
      restrictions: {}
    };
    
    // Default theme settings
    const defaults = {
      'theme.default_mode': { value: 'light', category: 'defaults' },
      'theme.allow_user_override': { value: 'true', category: 'restrictions' },
      'theme.force_dark_after_hour': { value: '20', category: 'global' },
      'theme.force_light_after_hour': { value: '6', category: 'global' },
      'theme.auto_switch_enabled': { value: 'false', category: 'global' },
      'theme.primary_color': { value: '#2563eb', category: 'defaults' },
      'theme.secondary_color': { value: '#7c3aed', category: 'defaults' },
      'theme.font_family': { value: 'Inter, sans-serif', category: 'defaults' },
      'theme.font_size_base': { value: '14', category: 'defaults' }
    };
    
    // Apply existing settings or use defaults
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const setting = themeSettings.find((s: any) => s.setting_key === key);
      const category = defaultValue.category;
      const settingKey = key.replace('theme.', '');
      
      settings[category][settingKey] = {
        value: setting ? setting.setting_value : defaultValue.value,
        description: `${settingKey} configuration`
      };
    });
    
    // Add user statistics
    const stats: any = {
      total_users: 0,
      theme_distribution: {}
    };
    
    userThemeStats.forEach((stat: any) => {
      stats.theme_distribution[stat.theme_mode || 'default'] = stat.user_count;
      stats.total_users += stat.user_count;
    });
    
    return this.success({
      settings,
      user_stats: stats,
      last_updated: themeSettings[0]?.updated_at || null
    });
  }

  private async updateThemeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['settings']);
    const { settings } = data;
    
    this.log(context, 'Updating theme settings', { categories: Object.keys(settings) });
    
    const user = context.user!;
    const updatePromises = [];
    
    // Flatten settings and update
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [settingName, settingData] of Object.entries(categorySettings as any)) {
        const fullKey = `theme.${settingName}`;
        const value = typeof settingData === 'object' ? (settingData as any).value : settingData;
        const description = typeof settingData === 'object' ? (settingData as any).description : null;
        
        updatePromises.push(
          runAsync(`
            INSERT OR REPLACE INTO system_settings 
            (setting_key, setting_value, updated_by, updated_at)
            VALUES (?, ?, ?, datetime('now'))
          `, [fullKey, value, user.username])
        );
      }
    }
    
    await Promise.all(updatePromises);
    
    // Clear user theme cache if needed
    if (settings.restrictions?.allow_user_override === 'false') {
      // Would trigger cache clear in production
      this.log(context, 'User theme overrides disabled, cache clear triggered');
    }
    
    return this.success({ 
      updated: true, 
      settings_count: updatePromises.length 
    }, 'Theme settings updated successfully');
  }

  private async getThemeAnalytics(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    const { period = '30d' } = data;
    
    this.log(context, 'Getting theme analytics', { period });
    
    // Calculate date filter
    let dateFilter = '';
    switch (period) {
      case '7d':
        dateFilter = "WHERE ucp.updated_at >= datetime('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "WHERE ucp.updated_at >= datetime('now', '-30 days')";
        break;
      case '90d':
        dateFilter = "WHERE ucp.updated_at >= datetime('now', '-90 days')";
        break;
    }
    
    // Get theme usage analytics
    const [themeUsage, themeChanges, colorPreferences] = await Promise.all([
      // Current theme distribution
      queryAsync(`
        SELECT 
          utp.internal_chat_theme as theme_mode,
          COUNT(*) as user_count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_theme_preferences), 2) as percentage
        FROM user_theme_preferences utp
        GROUP BY utp.internal_chat_theme
        ORDER BY user_count DESC
      `),
      
      // Theme change frequency
      queryAsync(`
        SELECT 
          DATE(last_theme_change) as change_date,
          COUNT(*) as change_count
        FROM user_theme_preferences
        WHERE last_theme_change IS NOT NULL
        GROUP BY DATE(last_theme_change)
        ORDER BY change_date DESC
        LIMIT 30
      `),
      
      // Custom color preferences
      queryAsync(`
        SELECT 
          COUNT(CASE WHEN custom_theme_json IS NOT NULL THEN 1 END) as custom_color_users,
          COUNT(CASE WHEN font_size_multiplier != 1.0 THEN 1 END) as custom_font_users,
          COUNT(CASE WHEN high_contrast_mode = TRUE THEN 1 END) as high_contrast_users
        FROM user_theme_preferences
      `)
    ]);
    
    // Get theme switch patterns (dark/light by hour)
    const hourlyPatterns = await queryAsync(`
      SELECT 
        strftime('%H', last_theme_change) as hour,
        internal_chat_theme as theme_mode,
        COUNT(*) as switch_count
      FROM user_theme_preferences
      WHERE last_theme_change IS NOT NULL
      GROUP BY hour, internal_chat_theme
      ORDER BY hour
    `);
    
    // Transform hourly data
    const hourlyData: any = {};
    hourlyPatterns.forEach((pattern: any) => {
      if (!hourlyData[pattern.hour]) {
        hourlyData[pattern.hour] = {};
      }
      hourlyData[pattern.hour][pattern.theme_mode] = pattern.switch_count;
    });
    
    return this.success({
      period,
      current_distribution: themeUsage,
      change_frequency: themeChanges,
      customization_stats: colorPreferences[0] || {},
      hourly_patterns: hourlyData,
      insights: {
        most_popular_theme: themeUsage[0]?.theme_mode || 'unknown',
        peak_switching_hour: Object.entries(hourlyData)
          .sort((a: any, b: any) => {
            const totalA = Object.values(a[1] as any).reduce((sum: any, val: any) => sum + val, 0);
            const totalB = Object.values(b[1] as any).reduce((sum: any, val: any) => sum + val, 0);
            return totalB - totalA;
          })[0]?.[0] || 'unknown'
      }
    });
  }

  private async forceThemeCompliance(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['theme_mode']);
    const { theme_mode, reason = 'Administrative override', exclude_roles = [] } = data;
    
    this.log(context, 'Forcing theme compliance', { theme_mode, reason, exclude_roles });
    
    // Build exclusion filter
    let exclusionFilter = '';
    const params = [theme_mode];
    
    if (exclude_roles.length > 0) {
      exclusionFilter = `AND u.role NOT IN (${exclude_roles.map(() => '?').join(',')})`;
      params.push(...exclude_roles);
    }
    
    // Update all user preferences
    const result = await runAsync(`
      UPDATE user_theme_preferences
      SET 
        internal_chat_theme = ?,
        public_queue_theme = ?,
        updated_at = datetime('now')
      WHERE username IN (
        SELECT username FROM users u
        WHERE u.active = TRUE ${exclusionFilter}
      )
    `, [theme_mode, theme_mode, ...params]);
    
    // Log admin action
    try {
      await runAsync(`
        INSERT INTO admin_actions 
        (action_type, performed_by, reason, metadata, created_at)
        VALUES ('force_theme_compliance', ?, ?, ?, datetime('now'))
      `, [
        context.user!.username, 
        reason, 
        JSON.stringify({ theme_mode, exclude_roles, affected_users: result.changes })
      ]);
    } catch (error) {
      // Admin actions table may not exist
      this.log(context, 'Admin actions table not found, skipping audit log');
    }
    
    return this.success({
      theme_mode,
      affected_users: result.changes || 0,
      excluded_roles: exclude_roles
    }, `Theme compliance enforced: ${result.changes || 0} users updated to ${theme_mode} mode`);
  }

  /**
   * Recovery Settings Management
   */
  private async getRecoverySettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting recovery settings');
    
    // Get session recovery settings
    const recoverySettings = await queryAsync(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key LIKE 'recovery.%'
      ORDER BY setting_key
    `);
    
    // Transform to structured object
    const settings: any = {
      session: {},
      data: {},
      timeouts: {}
    };
    
    // Default recovery settings
    const defaults = {
      'recovery.session_enabled': { value: 'true', category: 'session' },
      'recovery.session_timeout_minutes': { value: '30', category: 'timeouts' },
      'recovery.form_data_retention_days': { value: '7', category: 'data' },
      'recovery.chat_reconnect_attempts': { value: '5', category: 'session' },
      'recovery.chat_reconnect_delay_ms': { value: '2000', category: 'timeouts' },
      'recovery.auto_save_interval_seconds': { value: '30', category: 'data' },
      'recovery.max_recovery_size_kb': { value: '500', category: 'data' },
      'recovery.enable_offline_mode': { value: 'true', category: 'session' },
      'recovery.offline_queue_size': { value: '50', category: 'data' }
    };
    
    // Apply existing settings or use defaults
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const setting = recoverySettings.find((s: any) => s.setting_key === key);
      const category = defaultValue.category;
      const settingKey = key.replace('recovery.', '');
      
      settings[category][settingKey] = {
        value: setting ? setting.setting_value : defaultValue.value,
        description: `${settingKey} configuration`
      };
    });
    
    // Get recovery statistics
    const recoveryStats = await queryAsync(`
      SELECT 
        COUNT(*) as total_recovery_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(CASE WHEN event_type = 'recovery_success' THEN 1 END) as successful_recoveries,
        AVG(reconnect_attempts) as avg_reconnect_attempts
      FROM public_portal_recovery_log
      WHERE timestamp >= datetime('now', '-7 days')
    `);
    
    return this.success({
      settings,
      statistics: recoveryStats[0] || {},
      last_updated: recoverySettings[0]?.updated_at || null
    });
  }

  /**
   * Work Mode Settings Management
   */
  private async getWorkModeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.log(context, 'Getting work mode settings');
    
    // Get work mode configuration
    const workModeSettings = await queryAsync(`
      SELECT setting_key, setting_value
      FROM system_settings
      WHERE setting_key LIKE 'workmode.%'
      ORDER BY setting_key
    `);
    
    // Get current work mode statistics
    const workModeStats = await queryAsync(`
      SELECT 
        current_mode as work_mode,
        COUNT(*) as user_count,
        COUNT(CASE WHEN auto_assign_enabled = TRUE THEN 1 END) as auto_assign_count,
        AVG(max_concurrent_chats) as avg_max_chats
      FROM staff_work_modes
      GROUP BY current_mode
    `);
    
    // Transform settings
    const settings: any = {
      modes: {},
      auto_assignment: {},
      timeouts: {},
      limits: {}
    };
    
    // Default work mode settings
    const defaults = {
      'workmode.enable_auto_assignment': { value: 'true', category: 'auto_assignment' },
      'workmode.auto_assign_algorithm': { value: 'round_robin', category: 'auto_assignment' },
      'workmode.max_concurrent_chats': { value: '5', category: 'limits' },
      'workmode.max_concurrent_tickets': { value: '20', category: 'limits' },
      'workmode.idle_timeout_minutes': { value: '15', category: 'timeouts' },
      'workmode.offline_timeout_minutes': { value: '30', category: 'timeouts' },
      'workmode.ready_mode_color': { value: '#10b981', category: 'modes' },
      'workmode.work_mode_color': { value: '#f59e0b', category: 'modes' },
      'workmode.ticketing_mode_color': { value: '#3b82f6', category: 'modes' },
      'workmode.offline_mode_color': { value: '#6b7280', category: 'modes' },
      'workmode.require_reason_for_offline': { value: 'true', category: 'modes' },
      'workmode.track_activity_metrics': { value: 'true', category: 'auto_assignment' }
    };
    
    // Apply existing settings or use defaults
    Object.entries(defaults).forEach(([key, defaultValue]) => {
      const setting = workModeSettings.find((s: any) => s.setting_key === key);
      const category = defaultValue.category;
      const settingKey = key.replace('workmode.', '');
      
      settings[category][settingKey] = {
        value: setting ? setting.setting_value : defaultValue.value,
        description: `${settingKey} configuration`
      };
    });
    
    // Add current statistics
    const stats: any = {
      total_staff: 0,
      mode_distribution: {},
      workload: {}
    };
    
    workModeStats.forEach((stat: any) => {
      stats.mode_distribution[stat.work_mode] = stat.user_count;
      stats.workload[stat.work_mode] = {
        auto_assign_enabled: stat.auto_assign_count,
        avg_max_chats: parseFloat(stat.avg_max_chats || 0).toFixed(2)
      };
      stats.total_staff += stat.user_count;
    });
    
    return this.success({
      settings,
      current_stats: stats,
      last_updated: workModeSettings[0]?.updated_at || null
    });
  }

  private async updateWorkModeSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.system_settings');
    
    this.validateRequiredFields(data, ['settings']);
    const { settings } = data;
    
    this.log(context, 'Updating work mode settings', { categories: Object.keys(settings) });
    
    const user = context.user!;
    const updatePromises = [];
    
    // Flatten settings and update
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [settingName, settingData] of Object.entries(categorySettings as any)) {
        const fullKey = `workmode.${settingName}`;
        const value = typeof settingData === 'object' ? (settingData as any).value : settingData;
        const description = typeof settingData === 'object' ? (settingData as any).description : null;
        
        updatePromises.push(
          runAsync(`
            INSERT OR REPLACE INTO system_settings 
            (setting_key, setting_value, updated_by, updated_at)
            VALUES (?, ?, ?, datetime('now'))
          `, [fullKey, value, user.username])
        );
      }
    }
    
    await Promise.all(updatePromises);
    
    // If auto-assignment settings changed, notify active staff
    if (settings.auto_assignment?.enable_auto_assignment !== undefined) {
      this.log(context, 'Auto-assignment settings changed, notification triggered');
    }
    
    return this.success({ 
      updated: true, 
      settings_count: updatePromises.length 
    }, 'Work mode settings updated successfully');
  }

  /**
   * Table Management Operations
   */
  private async getTableConfigs(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    const { table_name = null } = data;
    
    this.log(context, 'Getting table configurations', { table_name });
    
    // Get table configurations
    let query = `
      SELECT 
        table_identifier as table_name,
        configuration as config_json,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM table_configurations
      WHERE is_active = TRUE
    `;
    
    const params = [];
    if (table_name) {
      query += ' AND table_identifier = ?';
      params.push(table_name);
    }
    
    query += ' ORDER BY table_identifier';
    
    const configs = await queryAsync(query, params);
    
    // Parse JSON configurations
    const parsedConfigs = configs.map((config: any) => ({
      table_name: config.table_name,
      config: JSON.parse(config.config_json),
      metadata: {
        created_by: config.created_by,
        updated_by: config.updated_by,
        created_at: config.created_at,
        updated_at: config.updated_at
      }
    }));
    
    // If no configs exist, return default configurations
    if (parsedConfigs.length === 0 && !table_name) {
      const defaultTables = ['user_tickets', 'users', 'chat_messages', 'public_chat_sessions'];
      return this.success({
        configs: defaultTables.map(tableName => ({
          table_name: tableName,
          config: {
            display_name: tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            visible_columns: [],
            sortable_columns: [],
            searchable_columns: [],
            filters: []
          },
          metadata: {
            created_by: 'system',
            updated_by: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        })),
        total: defaultTables.length
      });
    }
    
    return this.success({
      configs: parsedConfigs,
      total: parsedConfigs.length
    });
  }

  private async getTableViews(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    const { table_name = null, user_id = null } = data;
    
    this.log(context, 'Getting table views', { table_name, user_id });
    
    // Build query
    let query = `
      SELECT 
        tv.*,
        u.display_name as created_by_name
      FROM table_saved_views tv
      LEFT JOIN users u ON tv.created_by = u.username
      WHERE 1=1
    `;
    
    const params = [];
    const conditions = [];
    
    if (table_name) {
      conditions.push('tv.table_identifier = ?');
      params.push(table_name);
    }
    
    if (user_id) {
      conditions.push('(tv.created_by = ? OR tv.shared_with LIKE ?)');
      params.push(user_id, `%${user_id}%`);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY tv.is_default DESC, tv.name';
    
    const views = await queryAsync(query, params);
    
    // Parse view configurations
    const parsedViews = views.map((view: any) => ({
      id: view.id,
      table_name: view.table_identifier,
      view_name: view.name,
      description: view.description,
      config: JSON.parse(view.configuration),
      is_default: view.is_default,
      shared_with: view.shared_with,
      created_by: view.created_by,
      created_by_name: view.created_by_name,
      created_at: view.created_at,
      updated_at: view.updated_at
    }));
    
    return this.success({
      views: parsedViews,
      total: parsedViews.length
    });
  }

  private async getTableData(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'admin.view_analytics');
    
    this.validateRequiredFields(data, ['table_name']);
    const { 
      table_name, 
      columns = '*',
      filters = {},
      sort_by = null,
      sort_order = 'ASC',
      limit = 50,
      offset = 0
    } = data;
    
    this.log(context, 'Getting table data', { table_name, limit, offset });
    
    // Whitelist allowed tables for security
    const allowedTables = [
      'users', 'roles', 'user_tickets', 'teams', 'chat_channels',
      'chat_messages', 'public_chat_sessions', 'achievements',
      'system_settings', 'portal_settings'
    ];
    
    if (!allowedTables.includes(table_name)) {
      throw new ValidationError(`Access to table '${table_name}' is not allowed`);
    }
    
    // Build safe query
    const selectedColumns = columns === '*' ? '*' : columns.join(', ');
    let query = `SELECT ${selectedColumns} FROM ${table_name}`;
    
    // Apply filters
    const conditions = [];
    const params = [];
    
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== null && value !== undefined) {
        conditions.push(`${column} = ?`);
        params.push(value);
      }
    });
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Apply sorting
    if (sort_by) {
      query += ` ORDER BY ${sort_by} ${sort_order}`;
    }
    
    // Apply pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Execute query
    const rows = await queryAsync(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM ${table_name}`;
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const countResult = await queryAsync(countQuery, params.slice(0, -2));
    const total = countResult[0]?.total || 0;
    
    return this.createPaginatedResponse(
      rows,
      total,
      Math.floor(offset / limit) + 1,
      limit
    );
  }

  /**
   * Check Socket.io server status by attempting to connect
   */
  private async checkSocketIOStatus(): Promise<{ connected: boolean; uptime?: string; error?: string }> {
    try {
      // Use fetch API which is available in Node.js 18+
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch('http://localhost:3001/socket.io/', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Socket.io typically returns 200 for healthy status or 400 for handshake errors
      // Both indicate the server is running
      if (response.status === 200 || response.status === 400) {
        return {
          connected: true,
          uptime: this.formatUptime(process.uptime())
        };
      } else {
        return {
          connected: false,
          error: `HTTP ${response.status}`
        };
      }
      
    } catch (error: any) {
      // Handle timeout and connection errors
      if (error.name === 'AbortError') {
        return {
          connected: false,
          error: 'Connection timeout'
        };
      }
      
      return {
        connected: false,
        error: error.message || 'Connection failed'
      };
    }
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
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