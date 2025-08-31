/**
 * Request Validation System
 * Validates and parses API gateway requests
 */

import { NextRequest } from 'next/server';
import { ValidationError } from './context';

export interface GatewayRequest {
  service: string;
  action: string;
  data?: any;
  options?: any;
}

export async function validateRequest(request: NextRequest): Promise<GatewayRequest> {
  let body: any;
  
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
  
  // Validate required fields
  if (!body.service || typeof body.service !== 'string') {
    throw new ValidationError('Missing or invalid "service" field');
  }
  
  if (!body.action || typeof body.action !== 'string') {
    throw new ValidationError('Missing or invalid "action" field');
  }
  
  // Validate service name format
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(body.service)) {
    throw new ValidationError('Service name must contain only letters, numbers, hyphens, and underscores');
  }
  
  // Validate action name format
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(body.action)) {
    throw new ValidationError('Action name must contain only letters, numbers, hyphens, and underscores');
  }
  
  // Validate service name against allowed services
  const allowedServices = [
    'tickets',
    'chat', 
    'achievements',
    'auth',
    'admin',
    'staff',
    'helpdesk',
    'developer',
    'system',
    'utilities',
    'public'
  ];
  
  if (!allowedServices.includes(body.service)) {
    throw new ValidationError(`Unknown service: ${body.service}. Allowed services: ${allowedServices.join(', ')}`);
  }
  
  // Validate data field (optional)
  if (body.data !== undefined && body.data !== null) {
    if (typeof body.data !== 'object') {
      throw new ValidationError('Data field must be an object');
    }
  }
  
  // Validate options field (optional)
  if (body.options !== undefined && body.options !== null) {
    if (typeof body.options !== 'object') {
      throw new ValidationError('Options field must be an object');
    }
  }
  
  return {
    service: body.service.toLowerCase(),
    action: body.action.toLowerCase(),
    data: body.data || {},
    options: body.options || {}
  };
}

export function validateServiceAction(service: string, action: string): void {
  // Service-specific action validation
  const serviceActions: Record<string, string[]> = {
    tickets: [
      'list', 'create', 'get', 'update', 'delete',
      'get_history', 'get_comments', 'add_comment', 'delete_comment',
      'get_unread_counts', 'mark_comments_read', 'get_public_status'
    ],
    chat: [
      'get_channels', 'create_channel', 'update_channel', 'delete_channel',
      'join_channel', 'leave_channel', 'get_messages', 'send_message',
      'edit_message', 'delete_message', 'get_direct_messages', 'create_direct_message',
      'get_users', 'get_presence', 'update_presence', 'upload_file', 'get_file',
      'search_gifs', 'get_ui_settings', 'get_widget_settings', 'get_theme_preferences',
      'update_theme_preferences', 'get_gif_usage', 'check_gif_rate_limit'
    ],
    achievements: [
      'list', 'create', 'get', 'update', 'partial_update', 'delete',
      'get_stats', 'get_dashboard_settings', 'update_dashboard_settings',
      'get_toast_config', 'update_toast_config'
    ],
    auth: [
      'login', 'logout', 'get_current_user', 'verify_token'
    ],
    admin: [
      'get_chat_settings', 'update_chat_settings', 'get_chat_stats',
      'get_chat_users', 'force_logout_user', 'block_user', 'get_all_messages',
      'export_messages', 'get_widget_settings', 'update_widget_settings',
      'get_websocket_settings', 'update_websocket_settings', 'get_theme_settings',
      'update_theme_settings', 'get_theme_analytics', 'force_theme_compliance',
      'get_portal_settings', 'update_portal_settings', 'get_recovery_settings',
      'get_work_mode_settings', 'update_work_mode_settings', 'get_table_configs',
      'get_table_views', 'get_table_data'
    ],
    staff: [
      'get_work_mode', 'update_work_mode', 'get_all_work_modes', 'get_ticket_users'
    ],
    helpdesk: [
      'get_queue', 'get_teams', 'get_team_preferences', 'update_team_preferences'
    ],
    developer: [
      'get_analytics', 'get_stats', 'get_settings', 'update_settings',
      'test_email_config', 'get_backup_status', 'create_backup',
      'export_data', 'import_data', 'get_users', 'create_user', 'update_user',
      'reset_password', 'get_roles', 'get_teams', 'get_categories',
      'get_sections', 'get_dpss_org', 'get_request_types', 'get_subcategories'
    ],
    system: [
      'get_health', 'get_system_info', 'get_maintenance_status',
      'update_maintenance_status', 'get_socket_server_status',
      'restart_socket_server', 'create_data_backup', 'get_system_stats'
    ],
    utilities: [
      'get_organization', 'get_categories', 'get_assignable_users',
      'get_support_teams', 'get_simple_categories', 'get_profile_picture',
      'upload_profile_picture'
    ],
    public: [
      'get_widget_settings', 'get_widget_status', 'get_available_agents',
      'start_chat_session', 'get_chat_messages', 'send_chat_message',
      'auto_assign_agent', 'reconnect_session', 'return_to_queue',
      'get_guest_queue', 'remove_from_queue'
    ]
  };
  
  const allowedActions = serviceActions[service];
  if (!allowedActions) {
    throw new ValidationError(`Unknown service: ${service}`);
  }
  
  if (!allowedActions.includes(action)) {
    throw new ValidationError(
      `Unknown action "${action}" for service "${service}". ` +
      `Allowed actions: ${allowedActions.join(', ')}`
    );
  }
}

export function sanitizeInput(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // Basic HTML/script tag removal for security
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}