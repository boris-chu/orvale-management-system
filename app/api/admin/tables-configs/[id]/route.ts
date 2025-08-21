import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';
import { createContextLogger } from '@/lib/logger';

const logger = createContextLogger('tables-config-detail-api');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const configId = resolvedParams.id;

    // Get specific configuration
    const configurations = await queryAsync(`
      SELECT 
        tc.*,
        u.display_name as created_by_name,
        u2.display_name as updated_by_name
      FROM table_configurations tc
      LEFT JOIN users u ON tc.created_by = u.username
      LEFT JOIN users u2 ON tc.updated_by = u2.username
      WHERE tc.id = ?
    `, [configId]);

    if (configurations.length === 0) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const config = configurations[0];
    const formattedConfig = {
      ...config,
      configuration: JSON.parse(config.configuration)
    };

    logger.info({
      userId: authResult.user.id,
      configId,
      event: 'configuration_retrieved'
    }, 'Table configuration retrieved successfully');

    return NextResponse.json({
      success: true,
      data: formattedConfig
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error retrieving table configuration');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const configId = resolvedParams.id;
    const body = await request.json();

    // Check if configuration exists
    const existingConfigs = await queryAsync(
      'SELECT id, table_identifier FROM table_configurations WHERE id = ?',
      [configId]
    );

    if (existingConfigs.length === 0) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const existingConfig = existingConfigs[0];

    const {
      name,
      description,
      is_active,
      is_default,
      is_shared,
      configuration
    } = body;

    // Validate configuration is valid JSON if provided
    let configJson: string | undefined;
    if (configuration !== undefined) {
      try {
        configJson = typeof configuration === 'string' ? configuration : JSON.stringify(configuration);
        JSON.parse(configJson); // Validate it's valid JSON
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid configuration JSON' },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset other defaults for the same table
    if (is_default) {
      await runAsync(`
        UPDATE table_configurations 
        SET is_default = 0 
        WHERE table_identifier = ? AND id != ?
      `, [existingConfig.table_identifier, configId]);
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }
    if (is_default !== undefined) {
      updateFields.push('is_default = ?');
      updateValues.push(is_default ? 1 : 0);
    }
    if (is_shared !== undefined) {
      updateFields.push('is_shared = ?');
      updateValues.push(is_shared ? 1 : 0);
    }
    if (configJson !== undefined) {
      updateFields.push('configuration = ?');
      updateValues.push(configJson);
    }

    // Always update updated_by and updated_at
    updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
    updateValues.push(authResult.user.username);

    // Add WHERE clause parameter
    updateValues.push(configId);

    if (updateFields.length === 2) { // Only updated_by and updated_at
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Execute update
    await runAsync(`
      UPDATE table_configurations 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    logger.info({
      userId: authResult.user.id,
      configId,
      updatedFields: updateFields,
      event: 'configuration_updated'
    }, 'Table configuration updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error updating table configuration');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication and permissions
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to reset defaults (highest level permission)
    if (!authResult.user.permissions?.includes('tables.reset_defaults')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const configId = resolvedParams.id;

    // Check if configuration exists and get details
    const existingConfigs = await queryAsync(
      'SELECT id, name, is_default, table_identifier FROM table_configurations WHERE id = ?',
      [configId]
    );

    if (existingConfigs.length === 0) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const config = existingConfigs[0];

    // Prevent deletion of default configurations
    if (config.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default configuration' },
        { status: 400 }
      );
    }

    // Delete the configuration
    await runAsync('DELETE FROM table_configurations WHERE id = ?', [configId]);

    // Also delete any related saved views
    await runAsync(`
      DELETE FROM table_saved_views 
      WHERE table_identifier = ? AND configuration LIKE '%"config_id":"${configId}"%'
    `, [config.table_identifier]);

    logger.info({
      userId: authResult.user.id,
      configId,
      configName: config.name,
      tableIdentifier: config.table_identifier,
      event: 'configuration_deleted'
    }, 'Table configuration deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully'
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error deleting table configuration');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}