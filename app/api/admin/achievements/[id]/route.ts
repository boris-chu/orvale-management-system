import { NextRequest, NextResponse } from 'next/server';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';
import { queryAsync, runAsync } from '@/lib/database';

// GET: Get specific achievement
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const { id } = params;
    
    try {
      const achievement = await queryAsync(`
        SELECT a.*, COUNT(ua.id) as unlocked_count
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.unlocked_at IS NOT NULL
        WHERE a.id = ?
        GROUP BY a.id
      `, [id]);

      if (achievement.length === 0) {
        return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        achievement: achievement[0]
      });
    } catch (error) {
      console.error('Error fetching achievement:', error);
      return NextResponse.json({ error: 'Failed to load achievement' }, { status: 500 });
    }
  });
}

// PUT: Update achievement
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    const { id } = params;
    
    try {
      const body = await request.json();
      const {
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

      // Check if achievement exists
      const existing = await queryAsync('SELECT id FROM achievements WHERE id = ?', [id]);
      if (existing.length === 0) {
        return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
      }

      // Update achievement
      await runAsync(`
        UPDATE achievements SET
          name = ?, description = ?, category = ?, rarity = ?, icon = ?, icon_type = ?,
          xp_reward = ?, criteria_type = ?, criteria_value = ?, criteria_data = ?,
          toast_config = ?, active_from = ?, active_until = ?,
          updated_by = ?, custom_css = ?, active = ?, updated_at = DATETIME('now')
        WHERE id = ?
      `, [
        name, description, category, rarity, icon, icon_type || 'emoji',
        xp_reward || 0, criteria_type, criteria_value || 0, criteria_data || '{}',
        toast_config || '{}', active_from, active_until,
        user.username, custom_css || '', active !== false, id
      ]);

      // Log update
      auditLogger.logSecurityEvent({
        type: 'achievement_updated',
        username: user.username,
        ip: clientIP,
        endpoint: `/api/admin/achievements/${id}`,
        success: true,
        metadata: { achievementId: id, name }
      });

      return NextResponse.json({
        success: true,
        message: 'Achievement updated successfully'
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      
      auditLogger.logSecurityEvent({
        type: 'achievement_update_error',
        username: user.username,
        ip: clientIP,
        endpoint: `/api/admin/achievements/${id}`,
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 });
    }
  });
}

// PATCH: Update specific fields (like active status)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    const { id } = params;
    
    try {
      const body = await request.json();
      
      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      
      Object.entries(body).forEach(([key, value]) => {
        if (key !== 'id') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      });
      
      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }
      
      updateFields.push('updated_by = ?', 'updated_at = DATETIME(\'now\')');
      updateValues.push(user.username, id);

      await runAsync(`
        UPDATE achievements SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      // Log update
      auditLogger.logSecurityEvent({
        type: 'achievement_patched',
        username: user.username,
        ip: clientIP,
        endpoint: `/api/admin/achievements/${id}`,
        success: true,
        metadata: { achievementId: id, fields: Object.keys(body) }
      });

      return NextResponse.json({
        success: true,
        message: 'Achievement updated successfully'
      });
    } catch (error) {
      console.error('Error patching achievement:', error);
      return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 });
    }
  });
}

// DELETE: Delete achievement
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    const { id } = params;
    
    try {
      // Check if achievement exists
      const existing = await queryAsync('SELECT name FROM achievements WHERE id = ?', [id]);
      if (existing.length === 0) {
        return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
      }

      // Soft delete by setting active = false
      await runAsync(`
        UPDATE achievements SET 
          active = FALSE, 
          updated_by = ?, 
          updated_at = DATETIME('now')
        WHERE id = ?
      `, [user.username, id]);

      // Log deletion
      auditLogger.logSecurityEvent({
        type: 'achievement_deleted',
        username: user.username,
        ip: clientIP,
        endpoint: `/api/admin/achievements/${id}`,
        success: true,
        metadata: { achievementId: id, name: existing[0].name }
      });

      return NextResponse.json({
        success: true,
        message: 'Achievement deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting achievement:', error);
      return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 });
    }
  });
}