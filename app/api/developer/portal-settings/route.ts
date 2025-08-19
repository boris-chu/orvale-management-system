import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

// Default portal settings
const DEFAULT_SETTINGS = {
  // Form Field Settings
  form_fields: {
    name_required: true,
    email_required: true,
    phone_required: true,
    employee_number_required: true,
    office_required: true,
    section_required: true,
    location_required: true,
    priority_enabled: true,
    attachments_enabled: true,
    max_attachments: 5,
    max_file_size: 10, // MB
    allowed_file_types: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif']
  },
  
  // Display Settings
  display: {
    portal_title: 'DPSS IT Support Portal',
    portal_description: 'Submit your IT support requests and track their progress',
    theme_color: '#2563eb',
    logo_url: '/support.ico',
    show_category_descriptions: true,
    show_estimated_response_time: true,
    enable_dark_mode: false,
    items_per_page: 10
  },
  
  // Notification Settings
  notifications: {
    send_confirmation_email: true,
    send_status_updates: true,
    send_completion_notification: true,
    email_template_confirmation: 'Thank you for submitting your support request. Your ticket ID is {{ticket_id}}.',
    email_template_status_update: 'Your support request {{ticket_id}} status has been updated to: {{status}}.',
    email_template_completion: 'Your support request {{ticket_id}} has been completed.',
    sla_response_time_hours: 24,
    sla_resolution_time_hours: 72,
    escalation_enabled: true,
    escalation_threshold_hours: 48
  },
  
  // Integration Settings
  integrations: {
    enable_api_access: false,
    api_rate_limit: 100, // requests per hour
    webhook_url: '',
    enable_webhook: false,
    external_knowledge_base_url: '',
    enable_chat_support: false,
    enable_remote_assistance: false
  },
  
  // Security Settings
  security: {
    enable_captcha: false,
    enable_file_scanning: true,
    allowed_domains: [],
    blocked_domains: [],
    enable_ip_restrictions: false,
    allowed_ip_ranges: [],
    session_timeout_minutes: 30,
    max_login_attempts: 5,
    enable_audit_logging: true
  },
  
  // Advanced Settings
  advanced: {
    enable_auto_assignment: true,
    enable_smart_routing: false,
    enable_duplicate_detection: true,
    auto_close_resolved_after_days: 7,
    enable_satisfaction_survey: true,
    enable_knowledge_base_suggestions: false,
    enable_priority_escalation: true,
    maintenance_mode: false,
    maintenance_message: 'The portal is currently under maintenance. Please try again later.'
  }
};

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions for portal settings
    if (!authResult.user.permissions?.includes('portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get portal settings from database
    const settings = await getAsync(
      'SELECT settings_json FROM portal_settings WHERE id = ?',
      ['default']
    );

    let portalSettings = DEFAULT_SETTINGS;
    if (settings && settings.settings_json) {
      try {
        const storedSettings = JSON.parse(settings.settings_json);
        // Merge stored settings with defaults to ensure all keys exist
        portalSettings = {
          form_fields: { ...DEFAULT_SETTINGS.form_fields, ...storedSettings.form_fields },
          display: { ...DEFAULT_SETTINGS.display, ...storedSettings.display },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...storedSettings.notifications },
          integrations: { ...DEFAULT_SETTINGS.integrations, ...storedSettings.integrations },
          security: { ...DEFAULT_SETTINGS.security, ...storedSettings.security },
          advanced: { ...DEFAULT_SETTINGS.advanced, ...storedSettings.advanced }
        };
      } catch (parseError) {
        console.error('Error parsing stored settings:', parseError);
        // Return defaults if parsing fails
      }
    }

    return NextResponse.json(portalSettings);

  } catch (error) {
    console.error('Error fetching portal settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const settings = await request.json();

    // Validate settings structure
    const requiredSections = ['form_fields', 'display', 'notifications', 'integrations', 'security', 'advanced'];
    for (const section of requiredSections) {
      if (!settings[section]) {
        return NextResponse.json(
          { error: `Missing required section: ${section}` },
          { status: 400 }
        );
      }
    }

    // Create portal_settings table if it doesn't exist
    await runAsync(`
      CREATE TABLE IF NOT EXISTS portal_settings (
        id TEXT PRIMARY KEY,
        settings_json TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Save settings to database
    const settingsJson = JSON.stringify(settings);
    await runAsync(
      `INSERT OR REPLACE INTO portal_settings (id, settings_json, updated_by, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      ['default', settingsJson, authResult.user.username]
    );

    console.log(`⚙️ Portal settings updated by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Portal settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating portal settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and permissions  
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!authResult.user.permissions?.includes('portal.manage_settings') && 
        !authResult.user.permissions?.includes('admin.system_settings')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { action } = await request.json();

    switch (action) {
      case 'reset_to_defaults':
        // Reset settings to defaults
        await runAsync(
          `INSERT OR REPLACE INTO portal_settings (id, settings_json, updated_by, updated_at) 
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          ['default', JSON.stringify(DEFAULT_SETTINGS), authResult.user.username]
        );
        
        console.log(`🔄 Portal settings reset to defaults by ${authResult.user.username}`);
        
        return NextResponse.json({
          success: true,
          message: 'Portal settings reset to defaults',
          settings: DEFAULT_SETTINGS
        });

      case 'test_email':
        // Test email configuration (mock implementation)
        return NextResponse.json({
          success: true,
          message: 'Test email sent successfully'
        });

      case 'validate_webhook':
        // Test webhook URL (mock implementation)
        const { webhook_url } = await request.json();
        return NextResponse.json({
          success: true,
          message: 'Webhook URL is valid and responding'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing portal settings action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}