/**
 * Public Service
 * Handles public portal operations including chat widget functionality
 */

import { BaseService } from '@/lib/api-gateway/base-service';
import { RequestContext, ValidationError } from '@/lib/api-gateway/context';
import { queryAsync, runAsync, getAsync } from '@/lib/database';

export class PublicService extends BaseService {
  constructor() {
    super('public');
  }

  protected async executeAction(action: string, data: any, options: any, context: RequestContext): Promise<any> {
    switch (action) {
      case 'get_widget_settings':
        return this.getWidgetSettings(data, context);
      case 'get_widget_status':
        return this.getWidgetStatus(data, context);
      case 'get_available_agents':
        return this.getAvailableAgents(data, context);
      case 'start_chat_session':
        return this.startChatSession(data, context);
      case 'get_chat_messages':
        return this.getChatMessages(data, context);
      case 'send_chat_message':
        return this.sendChatMessage(data, context);
      case 'auto_assign_agent':
        return this.autoAssignAgent(data, context);
      case 'reconnect_session':
        return this.reconnectSession(data, context);
      case 'return_to_queue':
        return this.returnToQueue(data, context);
      case 'get_guest_queue':
        return this.getGuestQueue(data, context);
      case 'remove_from_queue':
        return this.removeFromQueue(data, context);
      default:
        throw new Error(`Unknown public action: ${action}`);
    }
  }

  /**
   * Get chat widget configuration and appearance settings
   */
  private async getWidgetSettings(data: any, context: RequestContext): Promise<any> {
    // Public endpoint - no auth required for basic widget settings
    
    this.log(context, 'Getting widget settings');
    
    try {
      // Get chat system settings
      const chatSettings = await queryAsync(`
        SELECT setting_key, setting_value 
        FROM system_settings 
        WHERE setting_key LIKE 'chat_%' OR setting_key LIKE 'widget_%'
      `);
      
      const settings: any = {
        enabled: true,
        title: 'Chat Support',
        subtitle: 'How can we help you today?',
        theme: 'light',
        position: 'bottom-right',
        show_agent_info: true,
        allow_file_upload: false,
        max_message_length: 1000,
        queue_position_visible: true,
        estimated_wait_time_visible: true,
        business_hours_enabled: false,
        auto_greetings_enabled: true,
        branding_enabled: true
      };
      
      // Apply database settings
      chatSettings.forEach((setting: any) => {
        try {
          const value = JSON.parse(setting.setting_value);
          settings[setting.setting_key.replace(/^(chat_|widget_)/, '')] = value;
        } catch {
          settings[setting.setting_key.replace(/^(chat_|widget_)/, '')] = setting.setting_value;
        }
      });
      
      return this.success({
        widget_settings: settings,
        version: '1.0',
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      this.log(context, 'Widget settings unavailable', { error: error.message });
      return this.success({
        widget_settings: {
          enabled: false,
          title: 'Chat Support',
          subtitle: 'Service temporarily unavailable'
        },
        version: '1.0',
        last_updated: new Date().toISOString()
      });
    }
  }

  /**
   * Get current widget status (online/offline, agent availability)
   */
  private async getWidgetStatus(data: any, context: RequestContext): Promise<any> {
    // Public endpoint - no auth required
    
    this.log(context, 'Getting widget status');
    
    try {
      // Get available staff count
      const staffCount = await queryAsync(`
        SELECT COUNT(*) as available_agents
        FROM staff_work_modes swm
        JOIN users u ON swm.username = u.username
        WHERE swm.status = 'ready' 
          AND u.active = 1
          AND u.role IN ('admin', 'manager', 'support', 'helpdesk')
      `);
      
      // Get queue statistics
      const queueStats = await queryAsync(`
        SELECT 
          COUNT(*) as waiting_guests,
          AVG(CASE 
            WHEN status = 'waiting' 
            THEN (julianday('now') - julianday(created_at)) * 24 * 60 
          END) as avg_wait_minutes
        FROM public_chat_sessions
        WHERE status = 'waiting'
      `);
      
      const availableAgents = staffCount[0]?.available_agents || 0;
      const waitingGuests = queueStats[0]?.waiting_guests || 0;
      const avgWaitMinutes = Math.round(queueStats[0]?.avg_wait_minutes || 0);
      
      // Determine widget status
      let status = 'online';
      let statusMessage = 'Available now';
      
      if (availableAgents === 0) {
        status = 'busy';
        statusMessage = 'All agents are currently busy';
      } else if (waitingGuests > availableAgents * 3) {
        status = 'busy';
        statusMessage = `High volume - estimated wait: ${Math.max(avgWaitMinutes, 5)} minutes`;
      } else if (waitingGuests > 0) {
        statusMessage = `Estimated wait: ${Math.max(avgWaitMinutes, 1)} minutes`;
      }
      
      return this.success({
        status,
        status_message: statusMessage,
        available_agents: availableAgents,
        queue_size: waitingGuests,
        estimated_wait_minutes: avgWaitMinutes,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      this.log(context, 'Widget status check failed', { error: error.message });
      return this.success({
        status: 'offline',
        status_message: 'Chat service temporarily unavailable',
        available_agents: 0,
        queue_size: 0,
        estimated_wait_minutes: 0,
        last_updated: new Date().toISOString()
      });
    }
  }

  /**
   * Get list of available agents for chat
   */
  private async getAvailableAgents(data: any, context: RequestContext): Promise<any> {
    // Public endpoint - limited info for privacy
    
    const { include_details = false } = data;
    
    this.log(context, 'Getting available agents', { include_details });
    
    try {
      const agents = await queryAsync(`
        SELECT 
          u.username,
          u.display_name,
          swm.status,
          swm.last_activity
        FROM staff_work_modes swm
        JOIN users u ON swm.username = u.username
        WHERE swm.status IN ('ready', 'work_mode')
          AND u.active = 1
          AND u.role IN ('admin', 'manager', 'support', 'helpdesk')
        ORDER BY swm.last_activity DESC
      `);
      
      // Get agent statistics if requested
      let agentStats = {};
      if (include_details) {
        const stats = await queryAsync(`
          SELECT 
            pcs.assigned_to,
            COUNT(*) as active_sessions,
            AVG(pcsr.rating) as avg_rating
          FROM public_chat_sessions pcs
          LEFT JOIN public_chat_session_ratings pcsr ON pcs.session_id = pcsr.session_id
          WHERE pcs.status = 'active'
            AND pcs.assigned_to IS NOT NULL
          GROUP BY pcs.assigned_to
        `);
        
        stats.forEach((stat: any) => {
          agentStats[stat.assigned_to] = {
            active_sessions: stat.active_sessions,
            avg_rating: parseFloat(stat.avg_rating || 0).toFixed(1)
          };
        });
      }
      
      const formattedAgents = agents.map((agent: any) => ({
        id: agent.username,
        display_name: agent.display_name,
        status: agent.status,
        last_activity: agent.last_activity,
        ...(include_details ? {
          active_sessions: agentStats[agent.username]?.active_sessions || 0,
          rating: agentStats[agent.username]?.avg_rating || '0.0'
        } : {})
      }));
      
      return this.success({
        agents: formattedAgents,
        total_available: formattedAgents.length,
        include_details
      });
    } catch (error) {
      this.log(context, 'Available agents query failed', { error: error.message });
      return this.success({
        agents: [],
        total_available: 0,
        include_details
      });
    }
  }

  /**
   * Start a new chat session for a guest
   */
  private async startChatSession(data: any, context: RequestContext): Promise<any> {
    // Public endpoint - no auth required, but validate guest info
    
    this.validateRequiredFields(data, ['guest_name']);
    const { 
      guest_name, 
      guest_email = null, 
      initial_message = null,
      preferred_agent = null,
      department = null 
    } = data;
    
    this.log(context, 'Starting chat session', { guest_name, guest_email });
    
    try {
      // Generate unique session ID
      const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      
      // Create chat session
      await runAsync(`
        INSERT INTO public_chat_sessions 
        (session_id, visitor_name, visitor_email, status, created_at)
        VALUES (?, ?, ?, 'waiting', datetime('now'))
      `, [sessionId, guest_name, guest_email]);
      
      // Add initial message if provided
      if (initial_message) {
        await runAsync(`
          INSERT INTO public_chat_messages 
          (session_id, sender_type, sender_name, message_content, message_type, created_at)
          VALUES (?, 'guest', ?, ?, 'text', ?)
        `, [sessionId, guest_name, initial_message, timestamp]);
      }
      
      // Get queue position
      const queuePosition = await queryAsync(`
        SELECT COUNT(*) as position
        FROM public_chat_sessions
        WHERE status = 'waiting'
      `);
      
      return this.success({
        session_id: sessionId,
        status: 'waiting',
        queue_position: queuePosition[0]?.position || 1,
        estimated_wait_minutes: Math.max(queuePosition[0]?.position * 2, 1),
        created_at: timestamp,
        guest_name,
        guest_email
      }, 'Chat session started successfully');
    } catch (error) {
      this.log(context, 'Failed to start chat session', { error: error.message });
      throw new ValidationError('Failed to start chat session');
    }
  }

  /**
   * Get messages for a chat session
   */
  private async getChatMessages(data: any, context: RequestContext): Promise<any> {
    this.validateRequiredFields(data, ['session_id']);
    const { 
      session_id, 
      since = null, 
      limit = 50,
      include_system_messages = true 
    } = data;
    
    this.log(context, 'Getting chat messages', { session_id, limit });
    
    try {
      // Verify session exists
      const session = await queryAsync(`
        SELECT * FROM public_chat_sessions WHERE session_id = ?
      `, [session_id]);
      
      if (session.length === 0) {
        throw new ValidationError('Chat session not found');
      }
      
      // Build message query
      let messageQuery = `
        SELECT 
          id, session_id, sender_type, sender_name, message_content, 
          message_type, created_at, is_system_message
        FROM public_chat_messages 
        WHERE session_id = ?
      `;
      const queryParams = [session_id];
      
      if (since) {
        messageQuery += ' AND created_at > ?';
        queryParams.push(since);
      }
      
      if (!include_system_messages) {
        messageQuery += ' AND is_system_message = 0';
      }
      
      messageQuery += ' ORDER BY created_at ASC LIMIT ?';
      queryParams.push(limit);
      
      const messages = await queryAsync(messageQuery, queryParams);
      
      return this.success({
        session_id,
        messages,
        message_count: messages.length,
        session_status: session[0].status,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.log(context, 'Failed to get chat messages', { error: error.message });
      throw new ValidationError('Failed to retrieve chat messages');
    }
  }

  /**
   * Send a message in a chat session
   */
  private async sendChatMessage(data: any, context: RequestContext): Promise<any> {
    this.validateRequiredFields(data, ['session_id', 'message', 'sender_name']);
    const { 
      session_id, 
      message, 
      sender_name,
      sender_type = 'guest',
      message_type = 'text' 
    } = data;
    
    this.log(context, 'Sending chat message', { session_id, sender_type, message_type });
    
    try {
      // Verify session exists and is active
      const session = await queryAsync(`
        SELECT * FROM public_chat_sessions 
        WHERE session_id = ? AND status IN ('waiting', 'active')
      `, [session_id]);
      
      if (session.length === 0) {
        throw new ValidationError('Chat session not found or not active');
      }
      
      // Validate message content
      if (message.length > 1000) {
        throw new ValidationError('Message too long (max 1000 characters)');
      }
      
      const timestamp = new Date().toISOString();
      
      // Insert message
      const result = await runAsync(`
        INSERT INTO public_chat_messages 
        (session_id, sender_type, sender_name, message_content, message_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [session_id, sender_type, sender_name, message, message_type, timestamp]);
      
      const messageId = (result as any).lastID;
      
      // Update session activity
      await runAsync(`
        UPDATE public_chat_sessions 
        SET guest_last_seen = ?
        WHERE session_id = ?
      `, [timestamp, session_id]);
      
      return this.success({
        message_id: messageId,
        session_id,
        sender_type,
        sender_name,
        message_content: message,
        message_type,
        created_at: timestamp,
        status: 'sent'
      }, 'Message sent successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.log(context, 'Failed to send chat message', { error: error.message });
      throw new ValidationError('Failed to send message');
    }
  }

  /**
   * Auto-assign an available agent to a waiting session
   */
  private async autoAssignAgent(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.manage_chat');
    
    this.validateRequiredFields(data, ['session_id']);
    const { session_id, preferred_agent = null } = data;
    
    this.log(context, 'Auto-assigning agent', { session_id, preferred_agent });
    
    try {
      // Verify session is waiting
      const session = await queryAsync(`
        SELECT * FROM public_chat_sessions 
        WHERE session_id = ? AND status = 'waiting'
      `, [session_id]);
      
      if (session.length === 0) {
        throw new ValidationError('Session not found or not waiting for assignment');
      }
      
      // Find available agent
      let assignedAgent = null;
      
      // Try preferred agent first
      if (preferred_agent) {
        const preferredCheck = await queryAsync(`
          SELECT u.username, u.display_name
          FROM staff_work_modes swm
          JOIN users u ON swm.username = u.username
          WHERE u.username = ? 
            AND swm.status = 'ready'
            AND u.active = 1
        `, [preferred_agent]);
        
        if (preferredCheck.length > 0) {
          assignedAgent = preferredCheck[0];
        }
      }
      
      // If no preferred agent or preferred not available, find any available
      if (!assignedAgent) {
        const availableAgents = await queryAsync(`
          SELECT u.username, u.display_name,
            COUNT(pcs.id) as active_sessions
          FROM staff_work_modes swm
          JOIN users u ON swm.username = u.username
          LEFT JOIN public_chat_sessions pcs ON u.username = pcs.assigned_to 
            AND pcs.status = 'active'
          WHERE swm.status = 'ready'
            AND u.active = 1
            AND u.role IN ('admin', 'manager', 'support', 'helpdesk')
          GROUP BY u.username, u.display_name
          ORDER BY active_sessions ASC, swm.last_activity ASC
          LIMIT 1
        `);
        
        if (availableAgents.length > 0) {
          assignedAgent = availableAgents[0];
        }
      }
      
      if (!assignedAgent) {
        throw new ValidationError('No agents available for assignment');
      }
      
      const timestamp = new Date().toISOString();
      
      // Assign agent and update session
      await runAsync(`
        UPDATE public_chat_sessions 
        SET 
          assigned_to = ?,
          status = 'active',
          assigned_at = ?
        WHERE session_id = ?
      `, [assignedAgent.username, timestamp, session_id]);
      
      // Add system message about assignment
      await runAsync(`
        INSERT INTO public_chat_messages 
        (session_id, sender_type, sender_name, message_content, message_type, is_system_message, created_at)
        VALUES (?, 'system', 'System', ?, 'system', 1, ?)
      `, [session_id, `${assignedAgent.display_name} has joined the chat`, timestamp]);
      
      return this.success({
        session_id,
        assigned_agent: assignedAgent.username,
        agent_display_name: assignedAgent.display_name,
        assignment_time: timestamp,
        session_status: 'active'
      }, 'Agent assigned successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.log(context, 'Auto-assignment failed', { error: error.message });
      throw new ValidationError('Failed to assign agent');
    }
  }

  /**
   * Reconnect to an existing chat session
   */
  private async reconnectSession(data: any, context: RequestContext): Promise<any> {
    this.validateRequiredFields(data, ['session_id']);
    const { session_id, guest_name } = data;
    
    this.log(context, 'Reconnecting to session', { session_id, guest_name });
    
    try {
      // Find and verify session
      const session = await queryAsync(`
        SELECT * FROM public_chat_sessions 
        WHERE session_id = ? 
          AND status IN ('waiting', 'active', 'ended')
          AND created_at > datetime('now', '-24 hours')
      `, [session_id]);
      
      if (session.length === 0) {
        throw new ValidationError('Session not found or expired');
      }
      
      const sessionData = session[0];
      
      // Verify guest name matches (simple security check)
      if (guest_name && sessionData.visitor_name !== guest_name) {
        throw new ValidationError('Invalid session credentials');
      }
      
      // Update last activity if session is still active
      if (sessionData.status === 'active') {
        await runAsync(`
          UPDATE public_chat_sessions 
          SET guest_last_seen = ?
          WHERE session_id = ?
        `, [new Date().toISOString(), session_id]);
      }
      
      // Get recent messages
      const recentMessages = await queryAsync(`
        SELECT 
          sender_type, sender_name, message_content, 
          message_type, created_at, is_system_message
        FROM public_chat_messages 
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `, [session_id]);
      
      return this.success({
        session_id,
        status: sessionData.status,
        assigned_agent: sessionData.assigned_to,
        guest_name: sessionData.visitor_name,
        created_at: sessionData.created_at,
        last_activity: sessionData.guest_last_seen,
        recent_messages: recentMessages.reverse(),
        reconnected_at: new Date().toISOString()
      }, 'Reconnected to chat session');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.log(context, 'Session reconnection failed', { error: error.message });
      throw new ValidationError('Failed to reconnect to session');
    }
  }

  /**
   * Return a session back to the queue
   */
  private async returnToQueue(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.manage_chat');
    
    this.validateRequiredFields(data, ['session_id']);
    const { session_id, reason = 'Returned to queue' } = data;
    
    this.log(context, 'Returning session to queue', { session_id, reason });
    
    try {
      // Verify session is active
      const session = await queryAsync(`
        SELECT * FROM public_chat_sessions 
        WHERE session_id = ? AND status = 'active'
      `, [session_id]);
      
      if (session.length === 0) {
        throw new ValidationError('Session not found or not active');
      }
      
      const timestamp = new Date().toISOString();
      
      // Update session back to waiting status
      await runAsync(`
        UPDATE public_chat_sessions 
        SET 
          status = 'waiting',
          assigned_to = NULL,
          guest_last_seen = ?
        WHERE session_id = ?
      `, [timestamp, session_id]);
      
      // Add system message
      await runAsync(`
        INSERT INTO public_chat_messages 
        (session_id, sender_type, sender_name, message_content, message_type, is_system_message, created_at)
        VALUES (?, 'system', 'System', ?, 'system', 1, ?)
      `, [session_id, `Chat returned to queue. ${reason}`, timestamp]);
      
      // Calculate new queue position
      const queuePosition = await queryAsync(`
        SELECT COUNT(*) + 1 as position
        FROM public_chat_sessions
        WHERE status = 'waiting' AND guest_last_seen < ?
      `, [timestamp]);
      
      return this.success({
        session_id,
        status: 'waiting',
        queue_position: queuePosition[0]?.position || 1,
        returned_at: timestamp,
        reason
      }, 'Session returned to queue');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.log(context, 'Failed to return session to queue', { error: error.message });
      throw new ValidationError('Failed to return session to queue');
    }
  }

  /**
   * Get current guest queue status
   */
  private async getGuestQueue(data: any, context: RequestContext): Promise<any> {
    this.requirePermission(context, 'portal.view_chat');
    
    const { limit = 20, offset = 0, include_messages = false } = data;
    
    this.log(context, 'Getting guest queue', { limit, offset, include_messages });
    
    try {
      // Get waiting sessions
      const queue = await queryAsync(`
        SELECT 
          session_id, visitor_name, visitor_email, created_at, guest_last_seen,
          (julianday('now') - julianday(created_at)) * 24 * 60 as wait_minutes
        FROM public_chat_sessions
        WHERE status = 'waiting'
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      // Get total queue size
      const queueSize = await queryAsync(`
        SELECT COUNT(*) as total FROM public_chat_sessions WHERE status = 'waiting'
      `);
      
      // Get recent messages for each session if requested
      if (include_messages && queue.length > 0) {
        const sessionIds = queue.map(s => s.session_id);
        const messages = await queryAsync(`
          SELECT 
            session_id, sender_type, sender_name, 
            message_content, created_at
          FROM public_chat_messages 
          WHERE session_id IN (${sessionIds.map(() => '?').join(',')})
            AND is_system_message = 0
          ORDER BY session_id, created_at DESC
        `, sessionIds);
        
        // Group messages by session
        const messagesBySession: any = {};
        messages.forEach((msg: any) => {
          if (!messagesBySession[msg.session_id]) {
            messagesBySession[msg.session_id] = [];
          }
          messagesBySession[msg.session_id].push(msg);
        });
        
        // Add messages to queue items
        queue.forEach((session: any) => {
          session.recent_messages = messagesBySession[session.session_id]?.slice(0, 3) || [];
        });
      }
      
      return this.success({
        queue,
        total_waiting: queueSize[0]?.total || 0,
        queue_position_start: offset + 1,
        include_messages,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      this.log(context, 'Failed to get guest queue', { error: error.message });
      return this.success({
        queue: [],
        total_waiting: 0,
        queue_position_start: offset + 1,
        include_messages,
        last_updated: new Date().toISOString()
      });
    }
  }

  /**
   * Remove a guest from the queue (abandon session)
   */
  private async removeFromQueue(data: any, context: RequestContext): Promise<any> {
    this.validateRequiredFields(data, ['session_id']);
    const { session_id, reason = 'Left queue' } = data;
    
    this.log(context, 'Removing session from queue', { session_id, reason });
    
    try {
      // Verify session exists and is in queue
      const session = await queryAsync(`
        SELECT * FROM public_chat_sessions 
        WHERE session_id = ? AND status = 'waiting'
      `, [session_id]);
      
      if (session.length === 0) {
        throw new ValidationError('Session not found in queue');
      }
      
      const timestamp = new Date().toISOString();
      
      // Update session to abandoned
      await runAsync(`
        UPDATE public_chat_sessions 
        SET 
          status = 'abandoned',
          ended_at = ?
        WHERE session_id = ?
      `, [timestamp, session_id]);
      
      // Add system message
      await runAsync(`
        INSERT INTO public_chat_messages 
        (session_id, sender_type, sender_name, message_content, message_type, is_system_message, created_at)
        VALUES (?, 'system', 'System', ?, 'system', 1, ?)
      `, [session_id, `Session abandoned: ${reason}`, timestamp]);
      
      return this.success({
        session_id,
        status: 'abandoned',
        removed_at: timestamp,
        reason
      }, 'Session removed from queue');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      this.log(context, 'Failed to remove session from queue', { error: error.message });
      throw new ValidationError('Failed to remove session from queue');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Test database connectivity for public chat tables
      let chatTablesAvailable = false;
      let sessionCount = 0;
      
      try {
        const result = await queryAsync('SELECT COUNT(*) as count FROM public_chat_sessions LIMIT 1');
        chatTablesAvailable = true;
        sessionCount = result[0]?.count || 0;
      } catch (error) {
        // Public chat tables not available
      }
      
      // Test staff work modes table
      let workModesAvailable = false;
      try {
        await queryAsync('SELECT COUNT(*) as count FROM staff_work_modes LIMIT 1');
        workModesAvailable = true;
      } catch (error) {
        // Work modes table not available
      }
      
      return {
        status: 'healthy',
        service: 'PublicService', 
        database: 'connected',
        implementation_status: 'Phase 3 - Fully implemented',
        available_features: {
          chat_sessions: chatTablesAvailable,
          staff_work_modes: workModesAvailable,
          widget_settings: true
        },
        session_count: sessionCount,
        features: [
          'get_widget_settings', 'get_widget_status', 'get_available_agents',
          'start_chat_session', 'get_chat_messages', 'send_chat_message',
          'auto_assign_agent', 'reconnect_session', 'return_to_queue',
          'get_guest_queue', 'remove_from_queue'
        ]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'PublicService',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}