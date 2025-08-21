import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { queryAsync, runAsync } from '@/lib/database';
import { createContextLogger } from '@/lib/logger';

const logger = createContextLogger('tables-views-api');

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
    const viewType = url.searchParams.get('type'); // 'personal', 'team', 'public'

    // Get saved views
    let query = `
      SELECT 
        tsv.*,
        u.display_name as created_by_name
      FROM table_saved_views tsv
      LEFT JOIN users u ON tsv.created_by = u.username
      WHERE (
        tsv.view_type = 'public' 
        OR tsv.created_by = ?
        OR (tsv.view_type = 'team' AND tsv.shared_with LIKE '%"${authResult.user.username}"%')
      )
    `;
    const params: any[] = [authResult.user.username];

    // Filter by table identifier if provided
    if (tableIdentifier) {
      query += ' AND tsv.table_identifier = ?';
      params.push(tableIdentifier);
    }

    // Filter by view type if provided
    if (viewType && ['personal', 'team', 'public'].includes(viewType)) {
      query += ' AND tsv.view_type = ?';
      params.push(viewType);
    }

    query += ' ORDER BY tsv.is_default DESC, tsv.last_used_at DESC, tsv.created_at DESC';

    const views = await queryAsync(query, params);

    // Parse JSON configurations and shared_with
    const formattedViews = views.map((view: any) => ({
      ...view,
      configuration: JSON.parse(view.configuration),
      shared_with: view.shared_with ? JSON.parse(view.shared_with) : null
    }));

    logger.info({
      userId: authResult.user.id,
      tableIdentifier,
      viewType,
      viewCount: views.length,
      event: 'views_retrieved'
    }, 'Table views retrieved successfully');

    return NextResponse.json({
      success: true,
      views: formattedViews,
      data: formattedViews
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error retrieving table views');
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

    // Check if user has permission to create views
    if (!authResult.user.permissions?.includes('tables.create_views')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      table_identifier,
      view_type = 'personal',
      is_default = false,
      configuration,
      shared_with
    } = body;

    // Validate required fields
    if (!id || !name || !table_identifier || !configuration) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, table_identifier, configuration' },
        { status: 400 }
      );
    }

    // Validate view_type
    if (!['personal', 'team', 'public'].includes(view_type)) {
      return NextResponse.json(
        { error: 'Invalid view_type. Must be: personal, team, or public' },
        { status: 400 }
      );
    }

    // Check if user has permission to share views
    if (view_type !== 'personal' && !authResult.user.permissions?.includes('tables.share_views')) {
      return NextResponse.json({ error: 'Insufficient permissions to create shared views' }, { status: 403 });
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

    // Validate shared_with is valid JSON if provided
    let sharedWithJson: string | null = null;
    if (shared_with) {
      try {
        sharedWithJson = typeof shared_with === 'string' ? shared_with : JSON.stringify(shared_with);
        JSON.parse(sharedWithJson); // Validate it's valid JSON
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid shared_with JSON' },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset other personal defaults for the same table and user
    if (is_default && view_type === 'personal') {
      await runAsync(`
        UPDATE table_saved_views 
        SET is_default = 0 
        WHERE table_identifier = ? AND created_by = ? AND view_type = 'personal' AND id != ?
      `, [table_identifier, authResult.user.username, id]);
    }

    // Insert new view
    await runAsync(`
      INSERT INTO table_saved_views (
        id, name, description, table_identifier, view_type, is_default,
        configuration, created_by, shared_with, created_at, last_used_at, usage_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
    `, [
      id, name, description, table_identifier, view_type, is_default ? 1 : 0,
      configJson, authResult.user.username, sharedWithJson
    ]);

    logger.info({
      userId: authResult.user.id,
      viewId: id,
      tableIdentifier: table_identifier,
      viewType: view_type,
      isDefault: is_default,
      event: 'view_created'
    }, 'Table view created successfully');

    return NextResponse.json({
      success: true,
      message: 'View created successfully',
      id
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error creating table view');
    
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'View ID already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}