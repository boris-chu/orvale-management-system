import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

// Default response templates
const DEFAULT_TEMPLATES = [
  {
    name: 'Ticket Received - General',
    category: 'confirmation',
    subject: 'Your IT Support Request #{{ticketId}} has been received',
    body: `Dear {{userName}},

Thank you for contacting DPSS IT Support. We have received your support request and assigned it ticket number #{{ticketId}}.

**Request Details:**
- Category: {{category}}
- Priority: {{priority}}
- Submitted: {{submissionDate}}

Our support team will review your request and respond within {{slaTime}} business hours. You will receive updates via email as we work on your request.

If you need immediate assistance for urgent matters, please call our helpdesk at (213) 555-0123.

Best regards,
DPSS IT Support Team`,
    variables: ['userName', 'ticketId', 'category', 'priority', 'submissionDate', 'slaTime'],
    active: true,
    trigger: 'on_submission'
  },
  {
    name: 'Ticket Assigned',
    category: 'status_update',
    subject: 'Your IT Support Request #{{ticketId}} has been assigned',
    body: `Hello {{userName}},

Your support request #{{ticketId}} has been assigned to {{assignedTechnician}} from our {{teamName}} team.

**Assignment Details:**
- Assigned to: {{assignedTechnician}}
- Team: {{teamName}}
- Expected resolution: Within {{slaTime}} business hours

{{assignedTechnician}} will be in touch with you shortly to begin working on your request. If you have any additional information that might help resolve your issue, please reply to this email.

Thank you for your patience.

Best regards,
DPSS IT Support Team`,
    variables: ['userName', 'ticketId', 'assignedTechnician', 'teamName', 'slaTime'],
    active: true,
    trigger: 'on_assignment'
  },
  {
    name: 'Ticket In Progress',
    category: 'status_update',
    subject: 'Work has begun on your IT Support Request #{{ticketId}}',
    body: `Dear {{userName}},

This is to inform you that work has begun on your support request #{{ticketId}}.

**Current Status:**
- Status: In Progress
- Technician: {{assignedTechnician}}
- Started: {{startDate}}

{{assignedTechnician}} is actively working on your request. We will keep you updated on our progress and notify you once the issue has been resolved.

If you need to provide additional information or have questions, please reply to this email.

Best regards,
DPSS IT Support Team`,
    variables: ['userName', 'ticketId', 'assignedTechnician', 'startDate'],
    active: true,
    trigger: 'on_start_work'
  },
  {
    name: 'Ticket Completed',
    category: 'completion',
    subject: 'Your IT Support Request #{{ticketId}} has been completed',
    body: `Dear {{userName}},

Great news! Your IT support request #{{ticketId}} has been successfully completed.

**Resolution Summary:**
- Completed by: {{assignedTechnician}}
- Completed on: {{completionDate}}
- Resolution: {{resolution}}

**What was done:**
{{workPerformed}}

Your ticket is now closed. If you experience any further issues related to this request, please reply to this email within the next 7 days and we'll reopen your ticket.

We value your feedback! Please take a moment to rate your support experience: {{surveyLink}}

Thank you for using DPSS IT Support.

Best regards,
DPSS IT Support Team`,
    variables: ['userName', 'ticketId', 'assignedTechnician', 'completionDate', 'resolution', 'workPerformed', 'surveyLink'],
    active: true,
    trigger: 'on_completion'
  },
  {
    name: 'Ticket Escalated',
    category: 'escalation',
    subject: 'Your IT Support Request #{{ticketId}} has been escalated',
    body: `Dear {{userName}},

Your support request #{{ticketId}} has been escalated to our {{escalationTeam}} for further assistance.

**Escalation Details:**
- Escalated on: {{escalationDate}}
- Reason: {{escalationReason}}
- New team: {{escalationTeam}}
- New priority: {{newPriority}}

A senior technician from our {{escalationTeam}} team will review your case and contact you within {{escalationSLA}} business hours.

We apologize for any inconvenience and appreciate your patience as we work to resolve your issue.

Best regards,
DPSS IT Support Team`,
    variables: ['userName', 'ticketId', 'escalationTeam', 'escalationDate', 'escalationReason', 'newPriority', 'escalationSLA'],
    active: true,
    trigger: 'on_escalation'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('portal.view_templates') && 
        !authResult.user.permissions?.includes('portal.manage_templates')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create table if it doesn't exist
    await runAsync(`
      CREATE TABLE IF NOT EXISTS response_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        variables TEXT,
        active BOOLEAN DEFAULT TRUE,
        trigger_event TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if templates exist, if not, insert defaults
    const existingTemplates = await queryAsync('SELECT COUNT(*) as count FROM response_templates');
    if (existingTemplates[0].count === 0) {
      console.log('🔧 Initializing default response templates...');
      for (const template of DEFAULT_TEMPLATES) {
        await runAsync(
          `INSERT INTO response_templates (name, category, subject, body, variables, active, trigger_event, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            template.name,
            template.category,
            template.subject,
            template.body,
            JSON.stringify(template.variables),
            template.active,
            template.trigger,
            'system'
          ]
        );
      }
    }

    // Get all templates
    const templates = await queryAsync(`
      SELECT id, name, category, subject, body, variables, active, trigger_event, 
             created_by, created_at, updated_by, updated_at
      FROM response_templates
      ORDER BY category, name
    `);

    // Parse variables JSON
    const templatesWithParsedVariables = templates.map((template: any) => ({
      ...template,
      variables: template.variables ? JSON.parse(template.variables) : []
    }));

    return NextResponse.json({
      success: true,
      templates: templatesWithParsedVariables
    });

  } catch (error) {
    console.error('Error fetching response templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('portal.manage_templates')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { name, category, subject, body, variables, active, trigger_event } = await request.json();

    // Validate required fields
    if (!name || !category || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, subject, body' },
        { status: 400 }
      );
    }

    // Create template
    const result = await runAsync(
      `INSERT INTO response_templates (name, category, subject, body, variables, active, trigger_event, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category,
        subject,
        body,
        JSON.stringify(variables || []),
        active !== false,
        trigger_event || null,
        authResult.user.username
      ]
    );

    console.log(`📝 Response template created: "${name}" by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Response template created successfully',
      templateId: result.lastID
    });

  } catch (error) {
    console.error('Error creating response template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('portal.manage_templates')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id, name, category, subject, body, variables, active, trigger_event } = await request.json();

    // Validate required fields
    if (!id || !name || !category || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, category, subject, body' },
        { status: 400 }
      );
    }

    // Update template
    await runAsync(
      `UPDATE response_templates 
       SET name = ?, category = ?, subject = ?, body = ?, variables = ?, active = ?, trigger_event = ?, 
           updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        category,
        subject,
        body,
        JSON.stringify(variables || []),
        active !== false,
        trigger_event || null,
        authResult.user.username,
        id
      ]
    );

    console.log(`📝 Response template updated: "${name}" by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Response template updated successfully'
    });

  } catch (error) {
    console.error('Error updating response template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('portal.manage_templates')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Get template name for logging
    const template = await getAsync('SELECT name FROM response_templates WHERE id = ?', [id]);
    
    // Delete template
    await runAsync('DELETE FROM response_templates WHERE id = ?', [id]);

    console.log(`🗑️ Response template deleted: "${template?.name || id}" by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Response template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting response template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}