import { NextRequest, NextResponse } from 'next/server';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';
import { AchievementService } from '@/lib/achievement-service';
import { queryAsync } from '@/lib/database';

// GET: Get user achievements
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['portal.view_dashboard'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      // Get user ID
      const userResult = await queryAsync('SELECT id FROM users WHERE username = ?', [user.username]);
      const userId = userResult[0]?.id;

      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get all achievements with user progress
      const achievements = await AchievementService.getUserAchievements(userId);

      // Log achievement access
      auditLogger.logSecurityEvent({
        type: 'achievements_viewed',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/achievements',
        success: true
      });

      return NextResponse.json({
        success: true,
        achievements
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      
      auditLogger.logSecurityEvent({
        type: 'achievements_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/achievements',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to load achievements' }, { status: 500 });
    }
  });
}

// POST: Trigger achievement check (for testing or manual refresh)
export async function POST(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['portal.view_dashboard'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      // Get user ID
      const userResult = await queryAsync('SELECT id FROM users WHERE username = ?', [user.username]);
      const userId = userResult[0]?.id;

      if (!userId) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check and unlock any new achievements
      const newAchievements = await AchievementService.checkAchievements(userId, user.username);

      // Log achievement check
      auditLogger.logSecurityEvent({
        type: 'achievements_check_triggered',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/achievements',
        success: true,
        metadata: { newAchievements: newAchievements.length }
      });

      return NextResponse.json({
        success: true,
        newAchievements,
        message: `${newAchievements.length} new achievements unlocked`
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
      
      auditLogger.logSecurityEvent({
        type: 'achievements_check_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/achievements',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 });
    }
  });
}