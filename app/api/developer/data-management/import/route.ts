import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { runAsync, queryAsync } from '@/lib/database';

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

    const importData = await request.json();

    // Validate import data structure
    if (!importData || typeof importData !== 'object') {
      return NextResponse.json({ error: 'Invalid import data format' }, { status: 400 });
    }

    const importResults = {
      supportTeamAssignments: { success: false, count: 0, error: null },
      portalSettings: { success: false, error: null },
      statistics: { processed: 0, errors: 0 }
    };

    // Import support team assignments if present
    if (importData.supportTeamAssignments && Array.isArray(importData.supportTeamAssignments)) {
      try {
        // Create table if it doesn't exist
        await runAsync(`
          CREATE TABLE IF NOT EXISTS support_team_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            subcategory TEXT NOT NULL,
            support_team TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Clear existing assignments
        await runAsync('DELETE FROM support_team_assignments');

        // Insert new assignments
        for (const assignment of importData.supportTeamAssignments) {
          if (assignment.category && assignment.subcategory && assignment.support_team) {
            await runAsync(
              'INSERT INTO support_team_assignments (category, subcategory, support_team) VALUES (?, ?, ?)',
              [assignment.category, assignment.subcategory, assignment.support_team]
            );
            importResults.supportTeamAssignments.count++;
          }
        }

        importResults.supportTeamAssignments.success = true;
        importResults.statistics.processed++;
      } catch (error) {
        importResults.supportTeamAssignments.error = error instanceof Error ? error.message : 'Unknown error';
        importResults.statistics.errors++;
        console.error('Support team assignments import error:', error);
      }
    }

    // Import portal settings if present
    if (importData.portalSettings) {
      try {
        // Create table if it doesn't exist
        await runAsync(`
          CREATE TABLE IF NOT EXISTS portal_settings (
            id TEXT PRIMARY KEY,
            settings_json TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Update or insert portal settings
        const settingsJson = JSON.stringify(importData.portalSettings);
        await runAsync(
          'INSERT OR REPLACE INTO portal_settings (id, settings_json, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          ['default', settingsJson, authResult.user.username]
        );

        importResults.portalSettings.success = true;
        importResults.statistics.processed++;
      } catch (error) {
        importResults.portalSettings.error = error instanceof Error ? error.message : 'Unknown error';
        importResults.statistics.errors++;
        console.error('Portal settings import error:', error);
      }
    }

    // Import organization structure (static data - would need file system updates)
    if (importData.organizationStructure) {
      // Note: Organization structure is currently static data in assets/
      // To implement this, you'd need to create a database table or update files
      console.log('⚠️ Organization structure import not implemented - static data');
    }

    // Import categories (static data - would need file system updates)
    if (importData.categories) {
      // Note: Categories are currently static data in assets/
      // To implement this, you'd need to create a database table or update files
      console.log('⚠️ Categories import not implemented - static data');
    }

    // Log the import activity
    console.log(`📥 Data import by ${authResult.user.username}:`, {
      processed: importResults.statistics.processed,
      errors: importResults.statistics.errors
    });

    // Record import in audit log if table exists
    try {
      await runAsync(`
        CREATE TABLE IF NOT EXISTS data_import_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          imported_by TEXT NOT NULL,
          import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          data_types TEXT NOT NULL,
          results TEXT NOT NULL,
          success BOOLEAN NOT NULL
        )
      `);

      await runAsync(
        'INSERT INTO data_import_log (imported_by, data_types, results, success) VALUES (?, ?, ?, ?)',
        [
          authResult.user.username,
          Object.keys(importData).join(', '),
          JSON.stringify(importResults),
          importResults.statistics.errors === 0
        ]
      );
    } catch (logError) {
      console.error('Failed to log import activity:', logError);
    }

    const success = importResults.statistics.errors === 0;
    const message = success ? 
      'Data imported successfully' : 
      `Import completed with ${importResults.statistics.errors} errors`;

    return NextResponse.json({
      success,
      message,
      results: importResults,
      metadata: {
        importDate: new Date().toISOString(),
        importedBy: authResult.user.username,
        totalProcessed: importResults.statistics.processed,
        totalErrors: importResults.statistics.errors
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}