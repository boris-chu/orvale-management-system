import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any admin permissions
    const adminPermissions = [
      'admin.manage_users', 'admin.view_users',
      'admin.manage_teams', 'admin.view_teams', 
      'admin.manage_organization', 'admin.view_organization',
      'admin.manage_categories', 'admin.view_categories',
      'admin.view_analytics', 'admin.system_settings'
    ];
    
    const hasAdminAccess = adminPermissions.some(perm => 
      authResult.user.permissions?.includes(perm)
    );
    
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get dashboard statistics
    const stats = {
      totalUsers: 0,
      activeUsers: 0,
      totalTeams: 0,
      totalTickets: 0,
      organizationalUnits: 0,
      categoryPaths: 0
    };

    try {
      // Get user statistics
      const userStats = await getAsync(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN active = 1 THEN 1 END) as active_users
        FROM users
      `);

      stats.totalUsers = userStats?.total_users || 0;
      stats.activeUsers = userStats?.active_users || 0;

      // Get team statistics (placeholder since teams table doesn't exist yet)
      // For now, count unique team_id values from users
      const teamStats = await getAsync(`
        SELECT COUNT(DISTINCT team_id) as total_teams 
        FROM users 
        WHERE team_id IS NOT NULL AND team_id != ''
      `);

      stats.totalTeams = teamStats?.total_teams || 0;

      // Get ticket statistics
      const ticketStats = await getAsync(`
        SELECT COUNT(*) as total_tickets FROM user_tickets
      `);

      stats.totalTickets = ticketStats?.total_tickets || 0;

      // Get organizational units count (count unique sections from tickets)
      const orgStats = await getAsync(`
        SELECT COUNT(DISTINCT section) as org_units 
        FROM user_tickets 
        WHERE section IS NOT NULL AND section != ''
      `);

      stats.organizationalUnits = orgStats?.org_units || 0;

      // Get category paths count (count unique category combinations)
      const categoryStats = await getAsync(`
        SELECT COUNT(DISTINCT category || '|' || request_type || '|' || subcategory) as category_paths
        FROM user_tickets 
        WHERE category IS NOT NULL AND category != ''
      `);

      stats.categoryPaths = categoryStats?.category_paths || 0;

    } catch (dbError) {
      console.error('Database error in stats query:', dbError);
      // Return default stats if database queries fail
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in developer stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}