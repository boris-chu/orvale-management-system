import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { queryAsync } from '@/lib/database';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  position?: { x: number; y: number };
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  foreignKey?: string;
}

interface ForeignKeyInfo {
  from: string;
  to: string;
  toTable: string;
  fromTable: string;
}

// GET: Analyze database schema and return table relationships
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

    // Get all tables in the database
    const tables = await queryAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log('🗄️ Found', tables.length, 'tables for schema analysis');

    const schemaData: TableInfo[] = [];

    // Analyze each table
    for (const table of tables) {
      const tableName = table.name;
      
      // Get table schema info
      const tableInfo = await queryAsync(`PRAGMA table_info(${tableName})`);
      
      // Get foreign key info
      const foreignKeys = await queryAsync(`PRAGMA foreign_key_list(${tableName})`);
      
      const columns: ColumnInfo[] = tableInfo.map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        primaryKey: col.pk === 1,
        foreignKey: foreignKeys.find((fk: any) => fk.from === col.name)?.table
      }));

      const foreignKeyRelations: ForeignKeyInfo[] = foreignKeys.map((fk: any) => ({
        from: fk.from,
        to: fk.to,
        toTable: fk.table,
        fromTable: tableName
      }));

      schemaData.push({
        name: tableName,
        columns,
        foreignKeys: foreignKeyRelations
      });
    }

    // Calculate table positions for layout (simple grid layout)
    const gridCols = Math.ceil(Math.sqrt(schemaData.length));
    schemaData.forEach((table, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;
      table.position = {
        x: col * 350 + 50,
        y: row * 200 + 50
      };
    });

    // Create relationships array for easier rendering
    const relationships = schemaData.flatMap(table => 
      table.foreignKeys.map(fk => ({
        from: table.name,
        to: fk.toTable,
        fromColumn: fk.from,
        toColumn: fk.to
      }))
    );

    console.log('🔗 Found', relationships.length, 'foreign key relationships');

    return NextResponse.json({
      success: true,
      schema: {
        tables: schemaData,
        relationships,
        metadata: {
          totalTables: schemaData.length,
          totalRelationships: relationships.length,
          analyzedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing database schema:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze database schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}