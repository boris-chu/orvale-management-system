import { NextRequest, NextResponse } from 'next/server';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';
import { queryAsync, runAsync } from '@/lib/database';

// Default toast configuration
const defaultToastConfig = {
  duration: 5000,
  position: 'top-right',
  animation: {
    entry: 'slide',
    exit: 'slide',
    duration: 400
  },
  style: {
    borderRadius: 8,
    shadow: 'lg',
    blur: false,
    glow: false,
    gradient: 'from-blue-500 to-purple-600'
  },
  sound: {
    enabled: true,
    volume: 50,
    file: 'achievement.mp3'
  }
};

// GET: Get toast configuration
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    try {
      // Get configuration from system_settings
      const configResult = await queryAsync(`
        SELECT setting_value 
        FROM system_settings 
        WHERE setting_key = 'achievement_toast_config'
        AND active = TRUE
      `);

      let config = defaultToastConfig;
      
      if (configResult.length > 0) {
        try {
          config = JSON.parse(configResult[0].setting_value);
        } catch (parseError) {
          console.error('Error parsing toast config, using defaults:', parseError);
        }
      }

      return NextResponse.json({
        success: true,
        config: config
      });
    } catch (error) {
      console.error('Error fetching toast configuration:', error);
      return NextResponse.json({ error: 'Failed to load toast configuration' }, { status: 500 });
    }
  });
}

// POST: Save toast configuration
export async function POST(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      const toastConfig = await request.json();
      
      // Validate configuration structure
      const requiredFields = ['duration', 'position', 'animation', 'style', 'sound'];
      for (const field of requiredFields) {
        if (!toastConfig[field]) {
          return NextResponse.json({ 
            error: `Invalid configuration: missing ${field}` 
          }, { status: 400 });
        }
      }

      // Validate position values
      const validPositions = ['top-right', 'top-center', 'top-left', 'bottom-right', 'bottom-center', 'bottom-left'];
      if (!validPositions.includes(toastConfig.position)) {
        return NextResponse.json({ 
          error: 'Invalid position value' 
        }, { status: 400 });
      }

      // Validate animation types
      const validAnimations = ['slide', 'fade', 'scale', 'bounce'];
      if (!validAnimations.includes(toastConfig.animation.entry) || 
          !validAnimations.includes(toastConfig.animation.exit)) {
        return NextResponse.json({ 
          error: 'Invalid animation type' 
        }, { status: 400 });
      }

      // Check if setting exists
      const existing = await queryAsync(`
        SELECT id FROM system_settings 
        WHERE setting_key = 'achievement_toast_config'
      `);

      if (existing.length > 0) {
        // Update existing configuration
        await runAsync(`
          UPDATE system_settings SET
            setting_value = ?,
            updated_by = ?,
            updated_at = DATETIME('now')
          WHERE setting_key = 'achievement_toast_config'
        `, [JSON.stringify(toastConfig), user.username]);
      } else {
        // Insert new configuration
        await runAsync(`
          INSERT INTO system_settings (setting_key, setting_value, description, category, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'achievement_toast_config',
          JSON.stringify(toastConfig),
          'Toast notification configuration for achievements',
          'achievements',
          user.username,
          user.username
        ]);
      }

      // Log configuration update
      auditLogger.logSecurityEvent({
        type: 'toast_config_updated',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements/toast-config',
        success: true,
        metadata: { 
          position: toastConfig.position,
          duration: toastConfig.duration,
          soundEnabled: toastConfig.sound.enabled
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Toast configuration saved successfully'
      });
    } catch (error) {
      console.error('Error saving toast configuration:', error);
      
      auditLogger.logSecurityEvent({
        type: 'toast_config_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements/toast-config',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to save toast configuration' }, { status: 500 });
    }
  });
}