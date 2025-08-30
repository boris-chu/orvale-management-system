import { NextRequest, NextResponse } from 'next/server';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';
import { queryAsync } from '@/lib/database';

// GET: Achievement statistics for admin dashboard
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      // Get total achievements
      const totalResult = await queryAsync('SELECT COUNT(*) as count FROM achievements');
      const totalAchievements = totalResult[0]?.count || 0;

      // Get active achievements
      const activeResult = await queryAsync('SELECT COUNT(*) as count FROM achievements WHERE active = TRUE');
      const activeAchievements = activeResult[0]?.count || 0;

      // Get total unlocks
      const unlocksResult = await queryAsync('SELECT COUNT(*) as count FROM user_achievements WHERE unlocked_at IS NOT NULL');
      const totalUnlocks = unlocksResult[0]?.count || 0;

      // Get users with achievements
      const usersResult = await queryAsync('SELECT COUNT(DISTINCT user_id) as count FROM user_achievements WHERE unlocked_at IS NOT NULL');
      const activeUsers = usersResult[0]?.count || 0;

      // Log stats access
      auditLogger.logSecurityEvent({
        type: 'achievement_stats_viewed',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements/stats',
        success: true
      });

      return NextResponse.json({
        totalAchievements,
        activeAchievements,
        totalUnlocks,
        activeUsers
      });
    } catch (error) {
      console.error('Error fetching achievement stats:', error);
      
      auditLogger.logSecurityEvent({
        type: 'achievement_stats_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements/stats',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }
  });
}