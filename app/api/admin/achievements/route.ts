import { NextRequest, NextResponse } from 'next/server';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';
import { queryAsync, runAsync } from '@/lib/database';

// GET: List all achievements with admin data
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      // Get all achievements with unlock counts
      const achievements = await queryAsync(`
        SELECT 
          a.*,
          COUNT(ua.id) as unlocked_count
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.unlocked_at IS NOT NULL
        GROUP BY a.id
        ORDER BY a.display_order, a.created_at
      `);

      // Log admin access
      auditLogger.logSecurityEvent({
        type: 'admin_achievements_viewed',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements',
        success: true
      });

      return NextResponse.json({
        success: true,
        achievements
      });
    } catch (error) {
      console.error('Error fetching admin achievements:', error);
      
      auditLogger.logSecurityEvent({
        type: 'admin_achievements_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to load achievements' }, { status: 500 });
    }
  });
}

// POST: Create new achievement
export async function POST(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      const body = await request.json();
      const {
        id,
        name,
        description,
        category,
        rarity,
        icon,
        icon_type,
        xp_reward,
        criteria_type,
        criteria_value,
        criteria_data,
        toast_config,
        active_from,
        active_until,
        custom_css,
        active
      } = body;

      // Validate required fields
      if (!id || !name || !description) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if ID already exists
      const existing = await queryAsync('SELECT id FROM achievements WHERE id = ?', [id]);
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Achievement ID already exists' }, { status: 409 });
      }

      // Get next display order
      const orderResult = await queryAsync('SELECT MAX(display_order) as max_order FROM achievements');
      const nextOrder = (orderResult[0]?.max_order || 0) + 1;

      // Create achievement
      await runAsync(`
        INSERT INTO achievements (
          id, name, description, category, rarity, icon, icon_type,
          xp_reward, criteria_type, criteria_value, criteria_data,
          toast_config, display_order, active_from, active_until,
          created_by, updated_by, custom_css, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, name, description, category, rarity, icon, icon_type || 'emoji',
        xp_reward || 0, criteria_type, criteria_value || 0, criteria_data || '{}',
        toast_config || '{}', nextOrder, active_from, active_until,
        user.username, user.username, custom_css || '', active !== false
      ]);

      // Log creation
      auditLogger.logSecurityEvent({
        type: 'achievement_created',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements',
        success: true,
        metadata: { achievementId: id, name }
      });

      return NextResponse.json({
        success: true,
        message: 'Achievement created successfully',
        id
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      
      auditLogger.logSecurityEvent({
        type: 'achievement_create_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to create achievement' }, { status: 500 });
    }
  });
}