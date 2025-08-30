import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { queryAsync } from '@/lib/database';
import { SecurityService } from '@/lib/security-service';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';

interface DashboardMetrics {
  ticketsGenerated: number;
  ticketsTrend: number;
  responseTimeImprovement: number;
  templatesUsed: number;
  currentStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyActivity: Array<{ date: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number; color: string }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon: string;
    progress?: number;
  }>;
  level: number;
  xp: number;
  xpToNextLevel: number;
  // Chat metrics
  chatMetrics: {
    usersHelped: number;
    averageRating: number;
    ticketsFromChats: number;
    avgResponseTime: number; // in minutes
    totalChatSessions: number;
    activeChatChannels: number;
  };
}

const categoryColors = {
  'Hardware': '#3b82f6',
  'Software': '#10b981', 
  'Network': '#f59e0b',
  'Infrastructure': '#ef4444',
  'Security': '#8b5cf6',
  'Application Support': '#06b6d4',
  'Access Management': '#f97316',
  'Database': '#84cc16',
  'Other': '#6b7280'
};

// GET: Personal dashboard metrics (with enhanced security)
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['portal.view_dashboard'], // Require dashboard viewing permission
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const userContext = SecurityService.createAccessContext(user);
    const clientIP = getClientIP(request);
    
    console.log('📊 Dashboard API called');
    console.log('🔐 Authenticated user:', { username: user.username, role: user.role });
    
    // Log dashboard access
    auditLogger.logSecurityEvent({
      type: 'dashboard_access',
      username: user.username,
      ip: clientIP,
      endpoint: '/api/dashboard/personal',
      success: true
    });

    const username = user.username;
    console.log('👤 Loading metrics for user:', username);

    // Get total tickets accessible by user (with row-level security)
    const ticketFilter = SecurityService.getTicketAccessFilter(userContext);
    const totalTicketsResult = await queryAsync(
      `SELECT COUNT(*) as count FROM user_tickets WHERE ${ticketFilter.condition}`,
      ticketFilter.params
    );
    const ticketsGenerated = totalTicketsResult[0]?.count || 0;

    // Get tickets trend (current month vs last month)
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(currentMonthStart.getTime() - 1);

    const currentMonthTickets = await queryAsync(
      `SELECT COUNT(*) as count FROM user_tickets WHERE (${ticketFilter.condition}) AND submitted_at >= ?`,
      [...ticketFilter.params, currentMonthStart.toISOString()]
    );

    const lastMonthTickets = await queryAsync(
      `SELECT COUNT(*) as count FROM user_tickets WHERE (${ticketFilter.condition}) AND submitted_at >= ? AND submitted_at <= ?`,
      [...ticketFilter.params, lastMonthStart.toISOString(), lastMonthEnd.toISOString()]
    );

    const ticketsTrend = (currentMonthTickets[0]?.count || 0) - (lastMonthTickets[0]?.count || 0);

    // Get weekly progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyTickets = await queryAsync(
      `SELECT COUNT(*) as count FROM user_tickets WHERE (${ticketFilter.condition}) AND submitted_at >= ?`,
      [...ticketFilter.params, weekStart.toISOString()]
    );
    const weeklyProgress = weeklyTickets[0]?.count || 0;

    // Get monthly activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await queryAsync(`
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as count
      FROM user_tickets 
      WHERE (${ticketFilter.condition}) AND submitted_at >= ?
      GROUP BY DATE(submitted_at)
      ORDER BY date
    `, [...ticketFilter.params, thirtyDaysAgo.toISOString()]);

    // Fill in missing dates with 0 count
    const monthlyActivity = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const existing = dailyActivity.find(d => d.date === dateStr);
      monthlyActivity.push({
        date: date.toISOString(),
        count: existing ? existing.count : 0
      });
    }

    // Get category breakdown
    const categoryData = await queryAsync(`
      SELECT 
        COALESCE(category, 'Other') as category,
        COUNT(*) as count
      FROM user_tickets 
      WHERE (${ticketFilter.condition})
      GROUP BY category
      ORDER BY count DESC
      LIMIT 8
    `, ticketFilter.params);

    const categoryBreakdown = categoryData.map((item: any) => ({
      category: item.category || 'Other',
      count: item.count,
      color: categoryColors[item.category as keyof typeof categoryColors] || categoryColors.Other
    }));

    // Calculate current streak
    const recentDays = await queryAsync(`
      SELECT DISTINCT DATE(submitted_at) as date
      FROM user_tickets 
      WHERE (${ticketFilter.condition})
      ORDER BY date DESC
      LIMIT 30
    `, ticketFilter.params);

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Check if user has activity today or yesterday to start streak count
    if (recentDays.length > 0) {
      const latestDate = recentDays[0].date;
      if (latestDate === today || latestDate === yesterday) {
        currentStreak = 1;
        
        // Count consecutive days backward
        for (let i = 1; i < recentDays.length; i++) {
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - currentStreak);
          const expectedDateStr = expectedDate.toISOString().split('T')[0];
          
          if (recentDays[i].date === expectedDateStr) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Mock achievements for now - would come from user_achievements table
    const achievements = [
      {
        id: '1',
        name: 'First Steps',
        description: 'Generated your first ticket',
        unlockedAt: '2024-01-15T10:30:00Z',
        rarity: 'common' as const,
        icon: '🎯'
      },
      {
        id: '2', 
        name: 'Consistent Contributor',
        description: 'Maintained a 7-day streak',
        unlockedAt: '2024-01-22T14:45:00Z',
        rarity: 'uncommon' as const,
        icon: '🔥'
      },
      {
        id: '3',
        name: 'Problem Solver', 
        description: 'Addressed tickets across 5+ categories',
        unlockedAt: '2024-02-01T09:15:00Z',
        rarity: 'rare' as const,
        icon: '🧩'
      }
    ];

    // Get chat metrics for the user (if they are staff)
    let chatMetrics = {
      usersHelped: 0,
      averageRating: 0,
      ticketsFromChats: 0,
      avgResponseTime: 0,
      totalChatSessions: 0,
      activeChatChannels: 0
    };

    try {
      // Get chat sessions handled by this user
      const chatSessionsResult = await queryAsync(`
        SELECT COUNT(*) as count
        FROM public_chat_sessions 
        WHERE assigned_to = ? AND status = 'ended'
      `, [username]);

      chatMetrics.usersHelped = chatSessionsResult[0]?.count || 0;
      chatMetrics.totalChatSessions = chatSessionsResult[0]?.count || 0;

      // Get average rating for this user's chat sessions
      const ratingsResult = await queryAsync(`
        SELECT AVG(r.rating) as avg_rating
        FROM public_chat_session_ratings r
        JOIN public_chat_sessions s ON r.session_id = s.session_id
        WHERE s.assigned_to = ?
      `, [username]);

      chatMetrics.averageRating = parseFloat(ratingsResult[0]?.avg_rating || '0');

      // Get average response time for this user's chat sessions
      const responseTimeResult = await queryAsync(`
        SELECT AVG(first_response_time) as avg_response_time
        FROM public_chat_sessions 
        WHERE assigned_to = ? AND first_response_time IS NOT NULL
      `, [username]);

      chatMetrics.avgResponseTime = Math.round((responseTimeResult[0]?.avg_response_time || 0) / 60);

      // Get tickets created from chats
      const ticketsFromChatResult = await queryAsync(`
        SELECT COUNT(*) as count
        FROM user_tickets 
        WHERE submitted_by = ? AND request_details LIKE '%[Created from chat%'
      `, [username]);

      chatMetrics.ticketsFromChats = ticketsFromChatResult[0]?.count || 0;

      // Get active channels user participates in
      const activeChannelsResult = await queryAsync(`
        SELECT COUNT(DISTINCT cm.channel_id) as count
        FROM chat_channel_members cm
        JOIN chat_channels cc ON cm.channel_id = cc.id
        WHERE cm.user_id = ? AND cc.is_active = 1
      `, [username]);

      chatMetrics.activeChatChannels = activeChannelsResult[0]?.count || 0;

    } catch (chatError) {
      console.warn('Error fetching chat metrics:', chatError);
      // Keep default values if chat metrics fail
    }

    // Mock level/XP calculation based on tickets + chat activity
    const level = Math.floor((ticketsGenerated + chatMetrics.usersHelped) / 20) + 1;
    const xp = ticketsGenerated * 10 + currentStreak * 50 + chatMetrics.usersHelped * 15;
    const xpToNextLevel = level * 200;

    const metrics: DashboardMetrics = {
      ticketsGenerated,
      ticketsTrend,
      responseTimeImprovement: Math.floor(ticketsGenerated * 0.3), // Mock time saved
      templatesUsed: Math.floor(ticketsGenerated * 0.15), // Mock template usage
      currentStreak,
      weeklyGoal: 15, // Mock weekly goal
      weeklyProgress,
      monthlyActivity,
      categoryBreakdown,
      achievements,
      level,
      xp,
      xpToNextLevel,
      chatMetrics
    };

    console.log(`📊 Loaded dashboard metrics for ${username}:`, {
      tickets: ticketsGenerated,
      trend: ticketsTrend,
      streak: currentStreak,
      level: level,
      usersHelped: chatMetrics.usersHelped,
      avgRating: chatMetrics.averageRating
    });

    return NextResponse.json({
      success: true,
      metrics
    });

    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
      return NextResponse.json({ 
        error: 'Failed to load dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  });
}