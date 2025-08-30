import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

// GET: Return available columns for all tables (mock data matching interface)
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

    // Mock column definitions that match the existing interface
    const columns = [
      // Tickets Queue Columns
      { id: 1, table_identifier: 'tickets_queue', column_key: 'id', column_label: 'Ticket ID', column_type: 'number', is_sortable: true, is_filterable: true, default_visible: true, display_order: 1 },
      { id: 2, table_identifier: 'tickets_queue', column_key: 'title', column_label: 'Title', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 2 },
      { id: 3, table_identifier: 'tickets_queue', column_key: 'status', column_label: 'Status', column_type: 'badge', is_sortable: true, is_filterable: true, default_visible: true, display_order: 3 },
      { id: 4, table_identifier: 'tickets_queue', column_key: 'priority', column_label: 'Priority', column_type: 'badge', is_sortable: true, is_filterable: true, default_visible: true, display_order: 4 },
      { id: 5, table_identifier: 'tickets_queue', column_key: 'assigned_to', column_label: 'Assigned To', column_type: 'user', is_sortable: true, is_filterable: true, default_visible: true, display_order: 5 },
      { id: 6, table_identifier: 'tickets_queue', column_key: 'assigned_team', column_label: 'Team', column_type: 'team', is_sortable: true, is_filterable: true, default_visible: true, display_order: 6 },
      { id: 7, table_identifier: 'tickets_queue', column_key: 'created_at', column_label: 'Created', column_type: 'date', is_sortable: true, is_filterable: true, default_visible: true, display_order: 7 },
      { id: 8, table_identifier: 'tickets_queue', column_key: 'updated_at', column_label: 'Updated', column_type: 'date', is_sortable: true, is_filterable: true, default_visible: false, display_order: 8 },

      // Users List Columns  
      { id: 10, table_identifier: 'users_list', column_key: 'id', column_label: 'User ID', column_type: 'number', is_sortable: true, is_filterable: true, default_visible: false, display_order: 1 },
      { id: 11, table_identifier: 'users_list', column_key: 'username', column_label: 'Username', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 2 },
      { id: 12, table_identifier: 'users_list', column_key: 'display_name', column_label: 'Display Name', column_type: 'user', is_sortable: true, is_filterable: true, default_visible: true, display_order: 3 },
      { id: 13, table_identifier: 'users_list', column_key: 'email', column_label: 'Email', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 4 },
      { id: 14, table_identifier: 'users_list', column_key: 'role', column_label: 'Role', column_type: 'badge', is_sortable: true, is_filterable: true, default_visible: true, display_order: 5 },
      { id: 15, table_identifier: 'users_list', column_key: 'active', column_label: 'Active', column_type: 'badge', is_sortable: true, is_filterable: true, default_visible: true, display_order: 6 },
      { id: 16, table_identifier: 'users_list', column_key: 'created_at', column_label: 'Created', column_type: 'date', is_sortable: true, is_filterable: true, default_visible: false, display_order: 7 },

      // Teams List Columns
      { id: 20, table_identifier: 'helpdesk_queue', column_key: 'id', column_label: 'Team ID', column_type: 'number', is_sortable: true, is_filterable: true, default_visible: false, display_order: 1 },
      { id: 21, table_identifier: 'helpdesk_queue', column_key: 'name', column_label: 'Team Name', column_type: 'team', is_sortable: true, is_filterable: true, default_visible: true, display_order: 2 },
      { id: 22, table_identifier: 'helpdesk_queue', column_key: 'description', column_label: 'Description', column_type: 'text', is_sortable: false, is_filterable: true, default_visible: true, display_order: 3 },
      { id: 23, table_identifier: 'helpdesk_queue', column_key: 'lead_user_id', column_label: 'Team Lead', column_type: 'user', is_sortable: true, is_filterable: true, default_visible: true, display_order: 4 },
      { id: 24, table_identifier: 'helpdesk_queue', column_key: 'active', column_label: 'Active', column_type: 'badge', is_sortable: true, is_filterable: true, default_visible: true, display_order: 5 },

      // Support Teams Columns
      { id: 30, table_identifier: 'support_teams', column_key: 'id', column_label: 'ID', column_type: 'number', is_sortable: true, is_filterable: true, default_visible: false, display_order: 1 },
      { id: 31, table_identifier: 'support_teams', column_key: 'name', column_label: 'Team Name', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 2 },
      { id: 32, table_identifier: 'support_teams', column_key: 'label', column_label: 'Display Label', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 3 },
      { id: 33, table_identifier: 'support_teams', column_key: 'email', column_label: 'Email', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 4 },
      { id: 34, table_identifier: 'support_teams', column_key: 'active', column_label: 'Active', column_type: 'badge', is_sortable: true, is_filterable: true, default_visible: true, display_order: 5 },

      // Public Portal Columns
      { id: 40, table_identifier: 'public_portal', column_key: 'id', column_label: 'Setting ID', column_type: 'number', is_sortable: true, is_filterable: true, default_visible: false, display_order: 1 },
      { id: 41, table_identifier: 'public_portal', column_key: 'setting_key', column_label: 'Setting Key', column_type: 'text', is_sortable: true, is_filterable: true, default_visible: true, display_order: 2 },
      { id: 42, table_identifier: 'public_portal', column_key: 'setting_value', column_label: 'Value', column_type: 'text', is_sortable: false, is_filterable: true, default_visible: true, display_order: 3 },
      { id: 43, table_identifier: 'public_portal', column_key: 'updated_at', column_label: 'Last Updated', column_type: 'date', is_sortable: true, is_filterable: true, default_visible: true, display_order: 4 },
    ];

    return NextResponse.json({
      success: true,
      columns
    });

  } catch (error) {
    console.error('Error loading column definitions:', error);
    return NextResponse.json({ 
      error: 'Failed to load column definitions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Create new column definition
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Creating column:', body);

    // Mock successful creation
    return NextResponse.json({
      success: true,
      message: 'Column definition created successfully',
      column: {
        id: Date.now(), // Mock ID
        ...body,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating column definition:', error);
    return NextResponse.json({ 
      error: 'Failed to create column definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}