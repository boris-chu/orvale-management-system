import { NextRequest, NextResponse } from 'next/server';
import { createSecureHandler, auditLogger, getClientIP } from '@/lib/api-security';
import { queryAsync, runAsync } from '@/lib/database';

// Default dashboard configuration
const defaultDashboardConfig = {
  layout: {
    showStatsCards: true,
    showProgressBar: true,
    showRecentAchievements: true,
    showActivityHeatmap: true,
    showLeaderboard: true,
    showUpcomingMilestones: true,
    showAchievementGallery: true,
    showPersonalStats: true
  },
  display: {
    achievementsPerPage: 12,
    animationsEnabled: true,
    showXPValues: true,
    showRarityColors: true,
    compactMode: false,
    darkModeDefault: false
  },
  privacy: {
    showPublicProfile: true,
    shareProgressWithTeam: true,
    showInLeaderboards: true,
    allowBadgeSharing: true
  },
  notifications: {
    enableAchievementNotifications: true,
    enableMilestoneAlerts: true,
    enableWeeklyDigest: false,
    enableTeamComparisons: true
  },
  customization: {
    allowThemeSelection: true,
    allowLayoutCustomization: false,
    maxCustomAchievements: 5,
    enablePersonalGoals: true
  }
};

// GET: Get dashboard configuration
export async function GET(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    try {
      // Try to get configuration from system_settings
      const configResult = await queryAsync(`
        SELECT setting_value 
        FROM system_settings 
        WHERE setting_key = 'achievement_dashboard_config'
        AND active = TRUE
      `);

      let config = defaultDashboardConfig;
      
      if (configResult.length > 0) {
        try {
          config = JSON.parse(configResult[0].setting_value);
        } catch (parseError) {
          console.error('Error parsing dashboard config, using defaults:', parseError);
        }
      }

      return NextResponse.json({
        success: true,
        config: config
      });
    } catch (error) {
      console.error('Error fetching dashboard settings:', error);
      return NextResponse.json({ error: 'Failed to load dashboard settings' }, { status: 500 });
    }
  });
}

// POST: Save dashboard configuration
export async function POST(request: NextRequest) {
  return createSecureHandler({
    requiredPermissions: ['admin.manage_users', 'admin.system_settings'],
  })(request, async (req: NextRequest, context: any) => {
    const user = context.user;
    const clientIP = getClientIP(request);
    
    try {
      const dashboardConfig = await request.json();
      
      // Validate configuration structure
      const requiredSections = ['layout', 'display', 'privacy', 'notifications', 'customization'];
      for (const section of requiredSections) {
        if (!dashboardConfig[section]) {
          return NextResponse.json({ 
            error: `Invalid configuration: missing ${section} section` 
          }, { status: 400 });
        }
      }

      // Check if setting exists
      const existing = await queryAsync(`
        SELECT id FROM system_settings 
        WHERE setting_key = 'achievement_dashboard_config'
      `);

      if (existing.length > 0) {
        // Update existing configuration
        await runAsync(`
          UPDATE system_settings SET
            setting_value = ?,
            updated_by = ?,
            updated_at = DATETIME('now')
          WHERE setting_key = 'achievement_dashboard_config'
        `, [JSON.stringify(dashboardConfig), user.username]);
      } else {
        // Insert new configuration
        await runAsync(`
          INSERT INTO system_settings (setting_key, setting_value, description, category, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'achievement_dashboard_config',
          JSON.stringify(dashboardConfig),
          'Configuration for user achievement dashboards',
          'achievements',
          user.username,
          user.username
        ]);
      }

      // Log configuration update
      auditLogger.logSecurityEvent({
        type: 'dashboard_settings_updated',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements/dashboard-settings',
        success: true,
        metadata: { 
          configSections: Object.keys(dashboardConfig),
          totalSettings: Object.values(dashboardConfig).reduce((acc: number, section: any) => acc + Object.keys(section).length, 0)
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Dashboard settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving dashboard settings:', error);
      
      auditLogger.logSecurityEvent({
        type: 'dashboard_settings_error',
        username: user.username,
        ip: clientIP,
        endpoint: '/api/admin/achievements/dashboard-settings',
        success: false,
        error: error.message
      });

      return NextResponse.json({ error: 'Failed to save dashboard settings' }, { status: 500 });
    }
  });
}