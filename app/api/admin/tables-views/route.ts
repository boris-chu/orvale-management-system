import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';

// GET: Return saved views
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

    // Mock saved views
    const views = [
      {
        id: 1,
        view_name: 'My Urgent Tickets',
        table_identifier: 'tickets_queue',
        view_type: 'personal',
        configuration: {
          filters: [
            { field: 'priority', operator: 'in', value: ['urgent', 'high'] },
            { field: 'assigned_to', operator: '=', value: authResult.user.username }
          ],
          sort: [{ field: 'created_at', direction: 'desc' }],
          columns: ['id', 'title', 'priority', 'status', 'created_at']
        },
        created_by: authResult.user.username,
        created_at: '2025-08-21T09:30:00Z'
      },
      {
        id: 2,
        view_name: 'Team Performance View',
        table_identifier: 'tickets_queue',
        view_type: 'team',
        configuration: {
          groupBy: 'assigned_team',
          columns: ['assigned_team', 'status', 'priority', 'assigned_to', 'resolution_time'],
          filters: [
            { field: 'created_at', operator: '>=', value: '2025-08-01' }
          ]
        },
        created_by: 'manager_user',
        created_at: '2025-08-20T14:15:00Z'
      },
      {
        id: 3,
        view_name: 'Active Users Directory',
        table_identifier: 'users_list',
        view_type: 'public',
        configuration: {
          filters: [
            { field: 'active', operator: '=', value: true }
          ],
          sort: [{ field: 'display_name', direction: 'asc' }],
          columns: ['display_name', 'email', 'role', 'created_at']
        },
        created_by: 'admin_user',
        created_at: '2025-08-19T11:00:00Z'
      }
    ];

    return NextResponse.json({
      success: true,
      views
    });

  } catch (error) {
    console.error('Error loading saved views:', error);
    return NextResponse.json({ 
      error: 'Failed to load saved views',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Create new saved view
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
    console.log('Creating saved view:', body);

    // Mock successful creation
    const newView = {
      id: Date.now(), // Mock ID
      ...body,
      created_by: authResult.user.username,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Saved view created successfully',
      view: newView
    });

  } catch (error) {
    console.error('Error creating saved view:', error);
    return NextResponse.json({ 
      error: 'Failed to create saved view',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}