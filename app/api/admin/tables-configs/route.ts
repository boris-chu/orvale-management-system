import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { queryAsync, getAsync, runAsync } from '@/lib/database';

// GET: Return table configurations from database
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.view_config')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Load real table configurations from database
    const rawConfigurations = await queryAsync(`
      SELECT 
        id,
        name as configuration_name,
        description,
        table_identifier,
        configuration,
        is_default,
        created_by,
        created_at,
        updated_at
      FROM table_configurations 
      WHERE is_active = 1
      ORDER BY is_default DESC, created_at DESC
    `);

    // Parse JSON configuration and transform to UI format
    const configurations = rawConfigurations.map((config: any) => {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(config.configuration || '{}');
      } catch (error) {
        console.warn('Failed to parse configuration JSON for', config.id, ':', error);
        parsedConfig = {};
      }

      const dbConfig = parsedConfig as any;

      // Transform database format to UI format
      return {
        id: config.id,
        configuration_name: config.configuration_name,
        description: config.description,
        table_identifier: config.table_identifier,
        column_config: {
          visible_columns: (dbConfig.columns || []).filter((col: any) => col.visible).map((col: any) => col.key),
          column_order: (dbConfig.columns || []).sort((a: any, b: any) => a.order - b.order).map((col: any) => col.key),
          column_widths: (dbConfig.columns || []).reduce((acc: any, col: any) => {
            if (col.width) acc[col.key] = col.width;
            return acc;
          }, {})
        },
        filter_config: {
          default_filters: Object.entries(dbConfig.filters || {}).map(([field, value]) => ({
            field,
            operator: '=',
            value
          }))
        },
        sort_config: {
          default_sort: (dbConfig.sorting || []).map((sort: any) => ({
            field: sort.column,
            direction: sort.direction
          }))
        },
        display_config: {
          row_height: 'medium',
          show_borders: true,
          striped_rows: true,
          page_size: dbConfig.pagination?.pageSize || 25
        },
        is_default: config.is_default === 1,
        created_by: config.created_by,
        created_at: config.created_at,
        updated_at: config.updated_at
      };
    });

    console.log('🗄️ Loaded', configurations.length, 'table configurations from database');

    return NextResponse.json({
      success: true,
      configurations
    });

  } catch (error) {
    console.error('Error loading table configurations:', error);
    return NextResponse.json({ 
      error: 'Failed to load table configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Create new table configuration
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.create_views')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { table_identifier, configuration_name, description, column_config, filter_config, sort_config, display_config } = body;

    if (!table_identifier || !configuration_name) {
      return NextResponse.json({ 
        error: 'Table identifier and configuration name are required' 
      }, { status: 400 });
    }

    // Generate unique ID for the configuration
    const configId = `cfg_${table_identifier}_${Date.now()}`;
    
    // Transform UI format to database format
    const fullConfiguration = {
      columns: (column_config?.visible_columns || []).map((columnKey: string, index: number) => ({
        key: columnKey,
        visible: true,
        width: column_config?.column_widths?.[columnKey] || 120,
        order: column_config?.column_order?.indexOf(columnKey) ?? index
      })),
      pagination: {
        pageSize: display_config?.page_size || 25
      },
      sorting: (sort_config?.default_sort || []).map((sort: any) => ({
        column: sort.field,
        direction: sort.direction
      })),
      filters: (filter_config?.default_filters || []).reduce((acc: any, filter: any) => {
        acc[filter.field] = filter.value;
        return acc;
      }, {})
    };

    // Insert into database
    const result = await runAsync(`
      INSERT INTO table_configurations (
        id, name, description, table_identifier, configuration, 
        is_active, is_default, is_shared, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      configId,
      configuration_name,
      description || '',
      table_identifier,
      JSON.stringify(fullConfiguration),
      1, // is_active
      0, // is_default (new configs are not default)
      0, // is_shared (not shared by default)
      authResult.user.username
    ]);

    if (result.changes === 0) {
      return NextResponse.json({ 
        error: 'Failed to create configuration' 
      }, { status: 500 });
    }

    // Return the created configuration
    const createdConfig = await getAsync(
      'SELECT * FROM table_configurations WHERE id = ?',
      [configId]
    );

    console.log('✅ Created table configuration:', configId);

    return NextResponse.json({
      success: true,
      message: 'Table configuration created successfully',
      configuration: {
        id: createdConfig.id,
        configuration_name: createdConfig.name,
        description: createdConfig.description,
        table_identifier: createdConfig.table_identifier,
        column_config: JSON.parse(createdConfig.configuration).column_config,
        filter_config: JSON.parse(createdConfig.configuration).filter_config,
        sort_config: JSON.parse(createdConfig.configuration).sort_config,
        display_config: JSON.parse(createdConfig.configuration).display_config,
        is_default: createdConfig.is_default,
        created_by: createdConfig.created_by,
        created_at: createdConfig.created_at,
        updated_at: createdConfig.updated_at
      }
    });

  } catch (error) {
    console.error('Error creating table configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to create table configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Update existing table configuration
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, configuration_name, description, column_config, filter_config, sort_config, display_config } = body;

    if (!id || !configuration_name) {
      return NextResponse.json({ 
        error: 'Configuration ID and name are required' 
      }, { status: 400 });
    }

    // Check if configuration exists and user can edit it
    const existingConfig = await getAsync(
      'SELECT * FROM table_configurations WHERE id = ? AND is_active = 1',
      [id]
    );

    if (!existingConfig) {
      return NextResponse.json({ 
        error: 'Configuration not found' 
      }, { status: 404 });
    }

    // Transform UI format to database format
    const fullConfiguration = {
      columns: (column_config?.visible_columns || []).map((columnKey: string, index: number) => ({
        key: columnKey,
        visible: true,
        width: column_config?.column_widths?.[columnKey] || 120,
        order: column_config?.column_order?.indexOf(columnKey) ?? index
      })),
      pagination: {
        pageSize: display_config?.page_size || 25
      },
      sorting: (sort_config?.default_sort || []).map((sort: any) => ({
        column: sort.field,
        direction: sort.direction
      })),
      filters: (filter_config?.default_filters || []).reduce((acc: any, filter: any) => {
        acc[filter.field] = filter.value;
        return acc;
      }, {})
    };

    // Update in database
    const result = await runAsync(`
      UPDATE table_configurations 
      SET 
        name = ?,
        description = ?,
        configuration = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_active = 1
    `, [
      configuration_name,
      description || '',
      JSON.stringify(fullConfiguration),
      authResult.user.username,
      id
    ]);

    if (result.changes === 0) {
      return NextResponse.json({ 
        error: 'Failed to update configuration' 
      }, { status: 500 });
    }

    console.log('✅ Updated table configuration:', id);

    return NextResponse.json({
      success: true,
      message: 'Table configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating table configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to update table configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Remove table configuration
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!authResult.user.permissions?.includes('tables.manage_columns')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json({ 
        error: 'Configuration ID is required' 
      }, { status: 400 });
    }

    // Check if configuration exists and is not default
    const existingConfig = await getAsync(
      'SELECT * FROM table_configurations WHERE id = ? AND is_active = 1',
      [configId]
    );

    if (!existingConfig) {
      return NextResponse.json({ 
        error: 'Configuration not found' 
      }, { status: 404 });
    }

    if (existingConfig.is_default) {
      return NextResponse.json({ 
        error: 'Cannot delete default configuration' 
      }, { status: 400 });
    }

    // Soft delete - mark as inactive
    const result = await runAsync(
      'UPDATE table_configurations SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [configId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete configuration' 
      }, { status: 500 });
    }

    console.log('✅ Deleted table configuration:', configId);

    return NextResponse.json({
      success: true,
      message: 'Table configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting table configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to delete table configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}