import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';
import { createContextLogger } from '@/lib/logger';

const logger = createContextLogger('tables-configs-api');

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view table configurations
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const tableIdentifier = url.searchParams.get('table');

    // Get table configurations
    let query = `
      SELECT 
        tc.*,
        u.display_name as created_by_name,
        u2.display_name as updated_by_name
      FROM table_configurations tc
      LEFT JOIN users u ON tc.created_by = u.username
      LEFT JOIN users u2 ON tc.updated_by = u2.username
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by table identifier if provided
    if (tableIdentifier) {
      query += ' AND tc.table_identifier = ?';
      params.push(tableIdentifier);
    }

    query += ' ORDER BY tc.is_default DESC, tc.created_at DESC';

    const configurations = await queryAsync(query, params);

    // Parse JSON configurations
    const formattedConfigurations = configurations.map((config: any) => ({
      ...config,
      configuration: JSON.parse(config.configuration)
    }));

    logger.info({
      userId: authResult.user.id,
      tableIdentifier,
      configCount: configurations.length,
      event: 'configurations_retrieved'
    }, 'Table configurations retrieved successfully');

    return NextResponse.json({
      success: true,
      configurations: formattedConfigurations,
      data: formattedConfigurations
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error retrieving table configurations');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage table configurations
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      table_identifier,
      is_active = false,
      is_default = false,
      is_shared = false,
      configuration
    } = body;

    // Validate required fields
    if (!id || !name || !table_identifier || !configuration) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, table_identifier, configuration' },
        { status: 400 }
      );
    }

    // Validate configuration is valid JSON
    let configJson: string;
    try {
      configJson = typeof configuration === 'string' ? configuration : JSON.stringify(configuration);
      JSON.parse(configJson); // Validate it's valid JSON
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid configuration JSON' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for the same table
    if (is_default) {
      await runAsync(`
        UPDATE table_configurations 
        SET is_default = 0 
        WHERE table_identifier = ? AND id != ?
      `, [table_identifier, id]);
    }

    // Insert new configuration
    await runAsync(`
      INSERT INTO table_configurations (
        id, name, description, table_identifier, is_active, is_default, is_shared,
        configuration, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      id, name, description, table_identifier, is_active ? 1 : 0,
      is_default ? 1 : 0, is_shared ? 1 : 0, configJson, authResult.user.username
    ]);

    logger.info({
      userId: authResult.user.id,
      configId: id,
      tableIdentifier: table_identifier,
      isDefault: is_default,
      event: 'configuration_created'
    }, 'Table configuration created successfully');

    return NextResponse.json({
      success: true,
      message: 'Configuration created successfully',
      id
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error creating table configuration');
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Configuration ID already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}