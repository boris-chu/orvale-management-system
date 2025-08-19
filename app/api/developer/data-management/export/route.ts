import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, getAsync } from '@/lib/database';
import { categories } from '@/config/categories/main-categories';
import { requestTypes } from '@/config/categories/request-types';
import { subcategories } from '@/config/categories/ticket-categories';
import { organizationalData } from '@/config/organizational-data';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('portal.export_data') && 
        !authResult.user.permissions?.includes('admin.manage_data')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { exportType, dataType } = await request.json();

    if (exportType === 'single' && dataType) {
      // Export single data type
      return await handleSingleExport(dataType, authResult.user);
    } else if (exportType === 'full') {
      // Export all data
      return await handleFullExport(authResult.user);
    } else {
      return NextResponse.json({ error: 'Invalid export parameters' }, { status: 400 });
    }

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleSingleExport(dataType: string, user: any) {
  try {
    let data: any = {};

    switch (dataType) {
      case 'categories':
        data = {
          categories: categories,
          requestTypes: requestTypes,
          subcategories: subcategories,
          metadata: {
            exportDate: new Date().toISOString(),
            exportedBy: user.username,
            dataType: 'categories',
            totalCategories: categories.length,
            totalSubcategories: Object.keys(subcategories).length
          }
        };
        break;

      case 'support-teams':
        // Get support team assignments from database
        const teamAssignments = await queryAsync(
          'SELECT * FROM support_team_assignments ORDER BY category, subcategory'
        );
        data = {
          supportTeamAssignments: teamAssignments,
          metadata: {
            exportDate: new Date().toISOString(),
            exportedBy: user.username,
            dataType: 'support-teams',
            totalAssignments: teamAssignments.length
          }
        };
        break;

      case 'organization':
        data = {
          organizationStructure: organizationalData,
          metadata: {
            exportDate: new Date().toISOString(),
            exportedBy: user.username,
            dataType: 'organization',
            totalOffices: organizationalData.offices.length,
            totalSections: organizationalData.offices.reduce((total: number, office: any) => 
              total + office.sections.length, 0)
          }
        };
        break;

      case 'portal-settings':
        // Get portal settings from database
        const portalSettings = await getAsync(
          'SELECT settings_json FROM portal_settings WHERE id = ?',
          ['default']
        );
        data = {
          portalSettings: portalSettings ? JSON.parse(portalSettings.settings_json) : null,
          metadata: {
            exportDate: new Date().toISOString(),
            exportedBy: user.username,
            dataType: 'portal-settings'
          }
        };
        break;

      case 'templates':
        // Get response templates from database (placeholder - implement when templates table exists)
        data = {
          responseTemplates: [],
          slaConfigurations: [],
          metadata: {
            exportDate: new Date().toISOString(),
            exportedBy: user.username,
            dataType: 'templates',
            note: 'Templates functionality not yet implemented'
          }
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

    console.log(`📤 Data export: ${dataType} by ${user.username}`);
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Single export error for ${dataType}:`, error);
    throw error;
  }
}

async function handleFullExport(user: any) {
  try {
    // Get all data types
    const supportTeamAssignments = await queryAsync(
      'SELECT * FROM support_team_assignments ORDER BY category, subcategory'
    ).catch(() => []);

    const portalSettingsRaw = await getAsync(
      'SELECT settings_json FROM portal_settings WHERE id = ?',
      ['default']
    ).catch(() => null);

    const portalSettings = portalSettingsRaw ? 
      JSON.parse(portalSettingsRaw.settings_json) : null;

    // Get user statistics
    const userStats = await queryAsync(
      'SELECT COUNT(*) as total FROM users WHERE active = TRUE'
    ).catch(() => [{ total: 0 }]);

    // Get ticket statistics
    const ticketStats = await queryAsync(
      'SELECT COUNT(*) as total FROM tickets'
    ).catch(() => [{ total: 0 }]);

    const exportData = {
      categories: {
        mainCategories: categories,
        requestTypes: requestTypes,
        subcategories: subcategories
      },
      supportTeamAssignments: supportTeamAssignments,
      organizationStructure: organizationalData,
      portalSettings: portalSettings,
      responseTemplates: [], // Placeholder for future implementation
      statistics: {
        totalUsers: userStats[0].total,
        totalTickets: ticketStats[0].total,
        totalCategories: categories.length,
        totalSubcategories: Object.keys(subcategories).length,
        totalOffices: organizationalData.offices.length,
        totalSections: organizationalData.offices.reduce((total: number, office: any) => 
          total + office.sections.length, 0)
      },
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: user.username,
        exportType: 'full',
        version: '1.0.0',
        systemVersion: 'Orvale Management System v1.0'
      }
    };

    console.log(`📤 Full data export by ${user.username}`);
    return NextResponse.json(exportData);

  } catch (error) {
    console.error('Full export error:', error);
    throw error;
  }
}