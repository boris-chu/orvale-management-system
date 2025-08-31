/**
 * Chat Service
 * Handles all chat-related operations for real-time messaging
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';

export class ChatService extends BaseService {
  constructor() {
    super('chat');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      // Channel operations (mapped to expected action names)
      case 'get_channels':
        return this.listChannels(data, context);
      case 'create_channel':
        return this.createChannel(data, context);
      case 'update_channel':
        return this.updateChannel(data, context);
      case 'delete_channel':
        return this.deleteChannel(data, context);
      case 'join_channel':
        return this.joinChannel(data, context);
      case 'leave_channel':
        return this.leaveChannel(data, context);

      // Message operations
      case 'get_messages':
        return this.getMessages(data, context);
      case 'send_message':
        return this.sendMessage(data, context);
      case 'edit_message':
        return this.editMessage(data, context);
      case 'delete_message':
        return this.deleteMessage(data, context);

      // Direct message operations
      case 'get_direct_messages':
        return this.listDirectMessages(data, context);
      case 'create_direct_message':
        return this.createDirectMessage(data, context);

      // User and presence operations
      case 'get_users':
        return this.getUsers(data, context);
      case 'get_presence':
        return this.getUserPresence(data, context);
      case 'update_presence':
        return this.updateUserPresence(data, context);

      // File operations
      case 'upload_file':
        return this.uploadFile(data, context);
      case 'get_file':
        return this.getFile(data, context);

      // GIF operations
      case 'search_gifs':
        return this.searchGifs(data, context);
      case 'get_gif_usage':
        return this.getGifUsage(data, context);
      case 'check_gif_rate_limit':
        return this.checkGifRateLimit(data, context);

      // Settings and preferences
      case 'get_ui_settings':
        return this.getUiSettings(data, context);
      case 'get_widget_settings':
        return this.getWidgetSettings(data, context);
      case 'get_theme_preferences':
        return this.getThemePreferences(data, context);
      case 'update_theme_preferences':
        return this.updateThemePreferences(data, context);

      default:
        throw new Error(`Unknown chat action: ${action}`);
    }
  }

  /**
   * List channels accessible to user
   */
  private async listChannels(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    
    this.log(context, 'Listing channels for user');
    
    const user = context.user!;
    
    // Get channels user is a member of or public channels
    const channels = await queryAsync(`
      SELECT 
        c.*,
        ccm.role as user_role,
        ccm.last_read_at,
        (
          SELECT COUNT(*) FROM chat_messages cm 
          WHERE cm.channel_id = c.id 
            AND cm.created_at > COALESCE(ccm.last_read_at, '1970-01-01')
            AND cm.is_deleted = FALSE
        ) as unread_count,
        (
          SELECT COUNT(*) FROM chat_channel_members ccm2 
          WHERE ccm2.channel_id = c.id
        ) as member_count,
        (
          SELECT cm.message_text FROM chat_messages cm 
          WHERE cm.channel_id = c.id AND cm.is_deleted = FALSE 
          ORDER BY cm.created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT cm.created_at FROM chat_messages cm 
          WHERE cm.channel_id = c.id AND cm.is_deleted = FALSE 
          ORDER BY cm.created_at DESC LIMIT 1
        ) as last_message_at
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.active = TRUE 
        AND (
          c.type = 'public_channel' 
          OR ccm.user_id IS NOT NULL 
          OR c.created_by = ?
        )
      ORDER BY 
        CASE WHEN ccm.user_id IS NOT NULL THEN 0 ELSE 1 END,
        last_message_at DESC NULLS LAST,
        c.created_at DESC
    `, [user.username, user.username]);

    return this.success({
      channels,
      total: channels.length,
      user_channels: channels.filter(c => c.user_role).length
    });
  }

  /**
   * Create new channel
   */
  private async createChannel(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.create_channels');
    
    this.validateRequiredFields(data, ['name', 'type']);
    const { name, description, type, team_id, is_read_only = false } = data;
    
    this.log(context, 'Creating channel', { name, type });
    
    const user = context.user!;
    
    // Validate channel type
    const validTypes = ['public_channel', 'private_channel', 'direct_message', 'group'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid channel type: ${type}`);
    }
    
    // Insert channel
    const result = await runAsync(`
      INSERT INTO chat_channels (name, description, type, created_by, team_id, is_read_only, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [name, description, type, user.username, team_id, is_read_only ? 1 : 0]);
    
    const channelId = result.lastID;
    
    // Add creator as owner
    await runAsync(`
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at)
      VALUES (?, ?, 'owner', datetime('now'))
    `, [channelId, user.username]);
    
    this.log(context, 'Channel created successfully', { channelId, name });
    
    return this.success({
      channel_id: channelId,
      name,
      type,
      created_by: user.username,
      member_count: 1
    }, `Channel created: ${name}`);
  }

  /**
   * Get channel details
   */
  private async getChannel(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    
    this.validateRequiredFields(data, ['channel_id']);
    const { channel_id } = data;
    
    this.log(context, 'Getting channel details', { channelId: channel_id });
    
    const user = context.user!;
    
    const channel = await getAsync(`
      SELECT 
        c.*,
        ccm.role as user_role,
        ccm.last_read_at,
        (
          SELECT COUNT(*) FROM chat_channel_members ccm2 
          WHERE ccm2.channel_id = c.id
        ) as member_count
      FROM chat_channels c
      LEFT JOIN chat_channel_members ccm ON c.id = ccm.channel_id AND ccm.user_id = ?
      WHERE c.id = ? AND c.active = TRUE
    `, [user.username, channel_id]);
    
    if (!channel) {
      throw new ValidationError(`Channel not found: ${channel_id}`);
    }
    
    // Check access permissions
    const hasAccess = channel.type === 'public_channel' || 
                     channel.user_role || 
                     channel.created_by === user.username;
    
    if (!hasAccess) {
      throw new ValidationError('Access denied to this channel');
    }
    
    // Get channel members
    const members = await queryAsync(`
      SELECT 
        ccm.user_id,
        ccm.role,
        ccm.joined_at,
        u.display_name,
        u.profile_picture
      FROM chat_channel_members ccm
      JOIN users u ON ccm.user_id = u.username
      WHERE ccm.channel_id = ?
      ORDER BY 
        CASE WHEN ccm.role = 'owner' THEN 0
             WHEN ccm.role = 'admin' THEN 1
             WHEN ccm.role = 'moderator' THEN 2
             ELSE 3 END,
        ccm.joined_at
    `, [channel_id]);
    
    return this.success({
      ...channel,
      members,
      member_count: members.length
    });
  }

  /**
   * Send message to channel
   */
  private async sendMessage(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.send_messages');
    
    this.validateRequiredFields(data, ['channel_id', 'message']);
    const { 
      channel_id, 
      message, 
      message_type = 'text', 
      reply_to_id, 
      ticket_reference,
      file_attachment 
    } = data;
    
    this.log(context, 'Sending message', { channelId: channel_id, messageType: message_type });
    
    const user = context.user!;
    
    // Verify user can post to channel
    const membership = await getAsync(`
      SELECT ccm.*, c.allow_posting, c.active
      FROM chat_channel_members ccm
      JOIN chat_channels c ON ccm.channel_id = c.id
      WHERE ccm.channel_id = ? AND ccm.user_id = ? AND c.active = TRUE
    `, [channel_id, user.username]);
    
    if (!membership) {
      throw new ValidationError('Access denied: Not a member of this channel');
    }
    
    if (!membership.can_post || !membership.allow_posting) {
      throw new ValidationError('Posting disabled for this channel or user');
    }
    
    // Insert message
    const result = await runAsync(`
      INSERT INTO chat_messages (
        channel_id, user_id, message_text, message_type, 
        reply_to_id, ticket_reference, file_attachment, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      channel_id, user.username, message, message_type,
      reply_to_id, ticket_reference, 
      file_attachment ? JSON.stringify(file_attachment) : null
    ]);
    
    const messageId = result.lastID;
    
    // Update channel updated_at
    await runAsync(`
      UPDATE chat_channels SET updated_at = datetime('now') WHERE id = ?
    `, [channel_id]);
    
    this.log(context, 'Message sent successfully', { messageId, channelId: channel_id });
    
    return this.success({
      message_id: messageId,
      channel_id,
      user_id: user.username,
      message,
      message_type,
      created_at: new Date().toISOString()
    }, 'Message sent successfully');
  }

  /**
   * Get messages from channel with pagination
   */
  private async getMessages(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    
    this.validateRequiredFields(data, ['channel_id']);
    const { channel_id, limit = 50, offset = 0, before_id } = data;
    
    this.log(context, 'Getting messages', { channelId: channel_id, limit, offset });
    
    const user = context.user!;
    
    // Verify access
    const hasAccess = await getAsync(`
      SELECT 1 FROM chat_channel_members ccm
      JOIN chat_channels c ON ccm.channel_id = c.id
      WHERE ccm.channel_id = ? AND ccm.user_id = ? AND c.active = TRUE
      UNION
      SELECT 1 FROM chat_channels c
      WHERE c.id = ? AND c.type = 'public_channel' AND c.active = TRUE
    `, [channel_id, user.username, channel_id]);
    
    if (!hasAccess) {
      throw new ValidationError('Access denied to this channel');
    }
    
    let whereClause = 'WHERE cm.channel_id = ? AND cm.is_deleted = FALSE';
    const params = [channel_id];
    
    if (before_id) {
      whereClause += ' AND cm.id < ?';
      params.push(before_id);
    }
    
    const messages = await queryAsync(`
      SELECT 
        cm.*,
        u.display_name as user_display_name,
        u.profile_picture as user_avatar,
        reply_msg.message_text as reply_to_text,
        reply_user.display_name as reply_to_user
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.username
      LEFT JOIN chat_messages reply_msg ON cm.reply_to_id = reply_msg.id
      LEFT JOIN users reply_user ON reply_msg.user_id = reply_user.username
      ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    return this.success({
      messages: messages.reverse(), // Return in chronological order
      total: messages.length,
      has_more: messages.length === limit
    });
  }

  /**
   * Create direct message channel
   */
  private async createDirectMessage(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    
    this.validateRequiredFields(data, ['target_user']);
    const { target_user } = data;
    
    this.log(context, 'Creating direct message', { targetUser: target_user });
    
    const user = context.user!;
    
    if (target_user === user.username) {
      throw new ValidationError('Cannot create DM with yourself');
    }
    
    // Check if DM already exists
    const existing = await getAsync(`
      SELECT c.id FROM chat_channels c
      JOIN chat_channel_members ccm1 ON c.id = ccm1.channel_id AND ccm1.user_id = ?
      JOIN chat_channel_members ccm2 ON c.id = ccm2.channel_id AND ccm2.user_id = ?
      WHERE c.type = 'direct_message' AND c.active = TRUE
    `, [user.username, target_user]);
    
    if (existing) {
      return this.success({
        channel_id: existing.id,
        existing: true
      }, 'Direct message channel already exists');
    }
    
    // Verify target user exists
    const targetUserExists = await getAsync(`
      SELECT 1 FROM users WHERE username = ? AND active = TRUE
    `, [target_user]);
    
    if (!targetUserExists) {
      throw new ValidationError(`User not found: ${target_user}`);
    }
    
    // Create DM channel
    const result = await runAsync(`
      INSERT INTO chat_channels (type, created_by, created_at)
      VALUES ('direct_message', ?, datetime('now'))
    `, [user.username]);
    
    const channelId = result.lastID;
    
    // Add both users as members
    await runAsync(`
      INSERT INTO chat_channel_members (channel_id, user_id, role, joined_at) VALUES
      (?, ?, 'member', datetime('now')),
      (?, ?, 'member', datetime('now'))
    `, [channelId, user.username, channelId, target_user]);
    
    this.log(context, 'Direct message created', { channelId, targetUser: target_user });
    
    return this.success({
      channel_id: channelId,
      participants: [user.username, target_user],
      created: true
    }, 'Direct message channel created');
  }

  /**
   * Get unread message counts
   */
  private async getUnreadCounts(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    
    this.log(context, 'Getting unread counts');
    
    const user = context.user!;
    
    const counts = await queryAsync(`
      SELECT 
        c.id as channel_id,
        c.name,
        c.type,
        COUNT(cm.id) as unread_count
      FROM chat_channels c
      JOIN chat_channel_members ccm ON c.id = ccm.channel_id
      LEFT JOIN chat_messages cm ON c.id = cm.channel_id 
        AND cm.created_at > COALESCE(ccm.last_read_at, '1970-01-01')
        AND cm.is_deleted = FALSE
        AND cm.user_id != ?
      WHERE ccm.user_id = ? AND c.active = TRUE
      GROUP BY c.id, c.name, c.type
      HAVING COUNT(cm.id) > 0
      ORDER BY unread_count DESC
    `, [user.username, user.username]);
    
    const total = counts.reduce((sum, channel) => sum + channel.unread_count, 0);
    
    return this.success({
      channels: counts,
      total_unread: total
    });
  }

  /**
   * Mark channel as read
   */
  private async markAsRead(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    
    this.validateRequiredFields(data, ['channel_id']);
    const { channel_id } = data;
    
    this.log(context, 'Marking channel as read', { channelId: channel_id });
    
    const user = context.user!;
    
    // Update last_read_at
    await runAsync(`
      UPDATE chat_channel_members 
      SET last_read_at = datetime('now')
      WHERE channel_id = ? AND user_id = ?
    `, [channel_id, user.username]);
    
    return this.success({
      channel_id,
      marked_read_at: new Date().toISOString()
    }, 'Channel marked as read');
  }

  /**
   * Placeholder methods for remaining operations
   */
  private async updateChannel(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.manage_channels');
    return this.success({ message: 'Update channel - Implementation pending' });
  }

  private async deleteChannel(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.manage_channels');
    return this.success({ message: 'Delete channel - Implementation pending' });
  }

  private async joinChannel(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    return this.success({ message: 'Join channel - Implementation pending' });
  }

  private async leaveChannel(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    return this.success({ message: 'Leave channel - Implementation pending' });
  }

  private async editMessage(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.send_messages');
    return this.success({ message: 'Edit message - Implementation pending' });
  }

  private async deleteMessage(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.send_messages');
    return this.success({ message: 'Delete message - Implementation pending' });
  }

  private async listDirectMessages(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.access');
    return this.success({ message: 'List direct messages - Implementation pending' });
  }

  private async createGroup(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.create_groups');
    return this.success({ message: 'Create group - Implementation pending' });
  }

  private async addToGroup(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.manage_groups');
    return this.success({ message: 'Add to group - Implementation pending' });
  }

  private async removeFromGroup(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.manage_groups');
    return this.success({ message: 'Remove from group - Implementation pending' });
  }

  private async getUsers(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_users');
    return this.success({ message: 'Get users - Implementation pending' });
  }

  private async getUserPresence(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_presence');
    return this.success({ message: 'Get user presence - Implementation pending' });
  }

  private async updateUserPresence(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.update_presence');
    return this.success({ message: 'Update user presence - Implementation pending' });
  }

  private async uploadFile(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.upload_files');
    return this.success({ message: 'Upload file - Implementation pending' });
  }

  private async getFile(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_files');
    return this.success({ message: 'Get file - Implementation pending' });
  }

  private async searchGifs(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.use_gifs');
    return this.success({ message: 'Search GIFs - Implementation pending' });
  }

  private async getGifUsage(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_gif_usage');
    return this.success({ message: 'Get GIF usage - Implementation pending' });
  }

  private async checkGifRateLimit(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.use_gifs');
    return this.success({ message: 'Check GIF rate limit - Implementation pending' });
  }

  private async getUiSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_settings');
    return this.success({ message: 'Get UI settings - Implementation pending' });
  }

  private async getWidgetSettings(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_widget_settings');
    return this.success({ message: 'Get widget settings - Implementation pending' });
  }

  private async getThemePreferences(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.view_preferences');
    return this.success({ message: 'Get theme preferences - Implementation pending' });
  }

  private async updateThemePreferences(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'chat.update_preferences');
    return this.success({ message: 'Update theme preferences - Implementation pending' });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity
      await queryAsync('SELECT COUNT(*) as count FROM chat_channels LIMIT 1');
      await queryAsync('SELECT COUNT(*) as count FROM chat_messages LIMIT 1');
      
      return {
        status: 'healthy',
        service: 'ChatService',
        database: 'connected',
        implementation_status: 'Phase 2 - Core operations implemented',
        features: [
          'list_channels', 'create_channel', 'get_channel', 'send_message', 
          'get_messages', 'create_direct_message', 'get_unread_counts', 'mark_as_read'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'ChatService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}