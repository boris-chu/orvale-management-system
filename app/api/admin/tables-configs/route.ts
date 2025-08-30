import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

// GET: Return table configurations
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Mock table configurations
    const configurations = [
      {
        id: 1,
        table_identifier: 'tickets_queue',
        configuration_name: 'Default Ticket Queue View',
        description: 'Standard view for IT support ticket management',
        column_config: {
          visible_columns: ['id', 'title', 'status', 'priority', 'assigned_to', 'created_at'],
          column_order: ['id', 'title', 'status', 'priority', 'assigned_to', 'created_at'],
          column_widths: { 'id': 100, 'title': 300, 'status': 120, 'priority': 100, 'assigned_to': 150, 'created_at': 150 }
        },
        filter_config: {
          default_filters: [
            { field: 'status', operator: '!=', value: 'completed' }
          ]
        },
        sort_config: {
          default_sort: [{ field: 'priority', direction: 'desc' }, { field: 'created_at', direction: 'desc' }]
        },
        display_config: {
          row_height: 'medium',
          show_borders: true,
          striped_rows: true
        },
        is_default: true,
        created_by: 'system',
        created_at: '2025-08-21T10:00:00Z',
        updated_at: '2025-08-21T10:00:00Z'
      },
      {
        id: 2,
        table_identifier: 'users_list',
        configuration_name: 'User Directory View',
        description: 'Clean view of system users for administration',
        column_config: {
          visible_columns: ['username', 'display_name', 'email', 'role', 'active'],
          column_order: ['username', 'display_name', 'email', 'role', 'active'],
          column_widths: { 'username': 150, 'display_name': 200, 'email': 250, 'role': 120, 'active': 80 }
        },
        filter_config: {
          default_filters: []
        },
        sort_config: {
          default_sort: [{ field: 'display_name', direction: 'asc' }]
        },
        display_config: {
          row_height: 'medium',
          show_borders: true,
          striped_rows: false
        },
        is_default: true,
        created_by: 'system',
        created_at: '2025-08-21T10:00:00Z',
        updated_at: '2025-08-21T10:00:00Z'
      }
    ];

    return NextResponse.json({
      success: true,
      configurations
    });

  } catch (error) {
    console.error('Error loading table configurations:', error);
    return NextResponse.json({ 
      error: 'Failed to load table configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Create new table configuration
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.create_views')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Creating table configuration:', body);

    // Mock successful creation
    const newConfig = {
      id: Date.now(), // Mock ID
      ...body,
      is_default: false,
      created_by: authResult.user.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Table configuration created successfully',
      configuration: newConfig
    });

  } catch (error) {
    console.error('Error creating table configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to create table configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}