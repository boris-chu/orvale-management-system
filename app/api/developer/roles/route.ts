import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return available roles
    const roles = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: [
          'ticket.view_all', 'ticket.assign_any', 'ticket.delete',
          'user.view_all', 'user.create', 'user.update', 'user.deactivate',
          'queue.view_all', 'queue.manage',
          'system.manage_settings', 'reporting.view_all',
          'admin.manage_users', 'admin.view_users',
          'admin.manage_teams', 'admin.view_teams',
          'admin.manage_organization', 'admin.view_organization',
          'admin.manage_categories', 'admin.view_categories',
          'admin.view_analytics', 'admin.system_settings'
        ]
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Team management and reporting capabilities',
        permissions: [
          'ticket.view_team', 'ticket.assign_within_team', 'ticket.escalate',
          'queue.view_team', 'reporting.view_team_metrics',
          'ticket.view_own', 'ticket.update_own', 'ticket.comment_own',
          'queue.view_own_team', 'system.view_basic_info'
        ]
      },
      {
        id: 'it_user',
        name: 'IT User',
        description: 'Standard IT staff member with basic permissions',
        permissions: [
          'ticket.view_own', 'ticket.update_own', 'ticket.comment_own',
          'queue.view_own_team', 'system.view_basic_info'
        ]
      }
    ];

    return NextResponse.json(roles);

  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}