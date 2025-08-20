import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and analytics permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for analytics permission
    if (!authResult.user.permissions?.includes('admin.view_analytics')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const dateRange = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (dateRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    switch (type) {
      case 'trends':
        return await getTicketTrends(startDateStr, endDateStr);
      case 'categories':
        return await getCategoryDistribution(startDateStr, endDateStr);
      case 'teams':
        return await getTeamPerformance(startDateStr, endDateStr);
      case 'overview':
      default:
        return await getOverviewAnalytics(startDateStr, endDateStr);
    }

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getOverviewAnalytics(startDate: string, endDate: string) {
  try {
    // Get ticket statistics for the period
    const ticketStats = await getAsync(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tickets,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL AND submitted_at IS NOT NULL 
            THEN (julianday(completed_at) - julianday(submitted_at)) * 24 
          END
        ) as avg_resolution_time_hours
      FROM user_tickets 
      WHERE DATE(submitted_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Get user activity stats
    const userStats = await getAsync(`
      SELECT 
        COUNT(DISTINCT employee_number) as active_users,
        COUNT(*) as total_submissions
      FROM user_tickets 
      WHERE DATE(submitted_at) BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Get category breakdown
    const categoryStats = await queryAsync(`
      SELECT 
        category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_tickets WHERE DATE(submitted_at) BETWEEN ? AND ?), 1) as percentage
      FROM user_tickets 
      WHERE DATE(submitted_at) BETWEEN ? AND ?
        AND category IS NOT NULL 
        AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `, [startDate, endDate, startDate, endDate]);

    // Calculate resolution rate
    const totalTickets = ticketStats?.total_tickets || 0;
    const completedTickets = ticketStats?.completed_tickets || 0;
    const resolutionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

    const analytics = {
      summary: {
        totalTickets: totalTickets,
        completedTickets: completedTickets,
        pendingTickets: ticketStats?.pending_tickets || 0,
        inProgressTickets: ticketStats?.in_progress_tickets || 0,
        resolutionRate: resolutionRate,
        avgResolutionTime: ticketStats?.avg_resolution_time_hours ? 
          Math.round(ticketStats.avg_resolution_time_hours * 10) / 10 : 0,
        activeUsers: userStats?.active_users || 0,
        totalSubmissions: userStats?.total_submissions || 0
      },
      categoryDistribution: categoryStats || []
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error getting overview analytics:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}

async function getTicketTrends(startDate: string, endDate: string) {
  try {
    // Get daily ticket counts
    const trends = await queryAsync(`
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as tickets,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as resolved
      FROM user_tickets 
      WHERE DATE(submitted_at) BETWEEN ? AND ?
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    // Fill in missing dates with 0 counts
    const dateRange = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      const dateStr = start.toISOString().split('T')[0];
      const existingData = trends.find((t: any) => t.date === dateStr);
      
      dateRange.push({
        date: dateStr,
        tickets: existingData?.tickets || 0,
        resolved: existingData?.resolved || 0
      });
      
      start.setDate(start.getDate() + 1);
    }

    return NextResponse.json({ trends: dateRange });

  } catch (error) {
    console.error('Error getting ticket trends:', error);
    return NextResponse.json({ error: 'Failed to load trends' }, { status: 500 });
  }
}

async function getCategoryDistribution(startDate: string, endDate: string) {
  try {
    const categories = await queryAsync(`
      SELECT 
        category as name,
        COUNT(*) as value,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_tickets WHERE DATE(submitted_at) BETWEEN ? AND ?), 1) as percentage,
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL AND submitted_at IS NOT NULL 
            THEN (julianday(completed_at) - julianday(submitted_at)) * 24 
          END
        ) as avg_resolution_time
      FROM user_tickets 
      WHERE DATE(submitted_at) BETWEEN ? AND ?
        AND category IS NOT NULL 
        AND category != ''
      GROUP BY category
      ORDER BY value DESC
    `, [startDate, endDate, startDate, endDate]);

    return NextResponse.json({ 
      categories: categories.map((cat: any) => ({
        ...cat,
        avg_resolution_time: cat.avg_resolution_time ? 
          Math.round(cat.avg_resolution_time * 10) / 10 : 0
      }))
    });

  } catch (error) {
    console.error('Error getting category distribution:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

async function getTeamPerformance(startDate: string, endDate: string) {
  try {
    // Since we don't have proper team assignments yet, group by section for now
    const teams = await queryAsync(`
      SELECT 
        COALESCE(section, 'Unassigned') as teamName,
        COUNT(*) as ticketsHandled,
        AVG(
          CASE 
            WHEN completed_at IS NOT NULL AND submitted_at IS NOT NULL 
            THEN (julianday(completed_at) - julianday(submitted_at)) * 24 
          END
        ) as avgResponseTime,
        ROUND(
          COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 1
        ) as resolutionRate
      FROM user_tickets 
      WHERE DATE(submitted_at) BETWEEN ? AND ?
      GROUP BY section
      HAVING COUNT(*) >= 3
      ORDER BY ticketsHandled DESC
      LIMIT 10
    `, [startDate, endDate]);

    return NextResponse.json({ 
      teams: teams.map((team: any) => ({
        ...team,
        avgResponseTime: team.avgResponseTime ? 
          Math.round(team.avgResponseTime * 10) / 10 : 0
      }))
    });

  } catch (error) {
    console.error('Error getting team performance:', error);
    return NextResponse.json({ error: 'Failed to load team performance' }, { status: 500 });
  }
}