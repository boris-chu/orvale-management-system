import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';

// Default SLA configurations
const DEFAULT_SLA_CONFIGS = [
  {
    name: 'Standard Response Time',
    category: 'Application Support',
    priority: 'medium',
    response_time_hours: 24,
    resolution_time_hours: 72,
    escalation_time_hours: 48,
    business_hours_only: true,
    active: true
  },
  {
    name: 'Urgent Response Time',
    category: 'Application Support',
    priority: 'urgent',
    response_time_hours: 4,
    resolution_time_hours: 24,
    escalation_time_hours: 8,
    business_hours_only: false,
    active: true
  },
  {
    name: 'Hardware Standard',
    category: 'Hardware',
    priority: 'medium',
    response_time_hours: 8,
    resolution_time_hours: 48,
    escalation_time_hours: 24,
    business_hours_only: true,
    active: true
  },
  {
    name: 'Infrastructure Critical',
    category: 'Infrastructure',
    priority: 'urgent',
    response_time_hours: 1,
    resolution_time_hours: 8,
    escalation_time_hours: 4,
    business_hours_only: false,
    active: true
  },
  {
    name: 'Security Incident',
    category: 'Security',
    priority: 'urgent',
    response_time_hours: 0.5,
    resolution_time_hours: 4,
    escalation_time_hours: 2,
    business_hours_only: false,
    active: true
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
      CREATE TABLE IF NOT EXISTS sla_configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        response_time_hours REAL NOT NULL,
        resolution_time_hours REAL NOT NULL,
        escalation_time_hours REAL NOT NULL,
        business_hours_only BOOLEAN DEFAULT TRUE,
        active BOOLEAN DEFAULT TRUE,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if SLA configs exist, if not, insert defaults
    const existingConfigs = await queryAsync('SELECT COUNT(*) as count FROM sla_configurations');
    if (existingConfigs[0].count === 0) {
      console.log('⏰ Initializing default SLA configurations...');
      for (const config of DEFAULT_SLA_CONFIGS) {
        await runAsync(
          `INSERT INTO sla_configurations (name, category, priority, response_time_hours, resolution_time_hours, 
                                         escalation_time_hours, business_hours_only, active, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            config.name,
            config.category,
            config.priority,
            config.response_time_hours,
            config.resolution_time_hours,
            config.escalation_time_hours,
            config.business_hours_only,
            config.active,
            'system'
          ]
        );
      }
    }

    // Get all SLA configurations
    const slaConfigs = await queryAsync(`
      SELECT id, name, category, priority, response_time_hours, resolution_time_hours, 
             escalation_time_hours, business_hours_only, active, created_by, created_at, updated_by, updated_at
      FROM sla_configurations
      ORDER BY category, priority, name
    `);

    return NextResponse.json({
      success: true,
      slaConfigurations: slaConfigs
    });

  } catch (error) {
    console.error('Error fetching SLA configurations:', error);
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

    const { 
      name, category, priority, response_time_hours, resolution_time_hours, 
      escalation_time_hours, business_hours_only, active 
    } = await request.json();

    // Validate required fields
    if (!name || !category || !priority || response_time_hours === undefined || 
        resolution_time_hours === undefined || escalation_time_hours === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create SLA configuration
    const result = await runAsync(
      `INSERT INTO sla_configurations (name, category, priority, response_time_hours, resolution_time_hours, 
                                     escalation_time_hours, business_hours_only, active, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category,
        priority,
        response_time_hours,
        resolution_time_hours,
        escalation_time_hours,
        business_hours_only !== false,
        active !== false,
        authResult.user.username
      ]
    );

    console.log(`⏰ SLA configuration created: "${name}" by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'SLA configuration created successfully',
      slaId: result.lastID
    });

  } catch (error) {
    console.error('Error creating SLA configuration:', error);
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

    const { 
      id, name, category, priority, response_time_hours, resolution_time_hours, 
      escalation_time_hours, business_hours_only, active 
    } = await request.json();

    // Validate required fields
    if (!id || !name || !category || !priority || response_time_hours === undefined || 
        resolution_time_hours === undefined || escalation_time_hours === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update SLA configuration
    await runAsync(
      `UPDATE sla_configurations 
       SET name = ?, category = ?, priority = ?, response_time_hours = ?, resolution_time_hours = ?, 
           escalation_time_hours = ?, business_hours_only = ?, active = ?, 
           updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        category,
        priority,
        response_time_hours,
        resolution_time_hours,
        escalation_time_hours,
        business_hours_only !== false,
        active !== false,
        authResult.user.username,
        id
      ]
    );

    console.log(`⏰ SLA configuration updated: "${name}" by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'SLA configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating SLA configuration:', error);
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
      return NextResponse.json({ error: 'SLA configuration ID required' }, { status: 400 });
    }

    // Delete SLA configuration
    await runAsync('DELETE FROM sla_configurations WHERE id = ?', [id]);

    console.log(`🗑️ SLA configuration deleted: ID ${id} by ${authResult.user.username}`);

    return NextResponse.json({
      success: true,
      message: 'SLA configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting SLA configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}