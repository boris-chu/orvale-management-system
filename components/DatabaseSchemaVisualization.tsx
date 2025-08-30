'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, ZoomIn, ZoomOut, RotateCcw, Database, Key, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  position: { x: number; y: number };
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

interface Relationship {
  from: string;
  to: string;
  fromColumn: string;
  toColumn: string;
}

interface SchemaData {
  tables: TableInfo[];
  relationships: Relationship[];
  metadata: {
    totalTables: number;
    totalRelationships: number;
    analyzedAt: string;
  };
}

interface DatabaseSchemaVisualizationProps {
  className?: string;
}

export function DatabaseSchemaVisualization({ className }: DatabaseSchemaVisualizationProps) {
  const { toast } = useToast();
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadSchema = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/database-schema', { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }

      const data = await response.json();
      setSchemaData(data.schema);
      
      toast({
        title: 'Success',
        description: `Loaded schema with ${data.schema.metadata.totalTables} tables and ${data.schema.metadata.totalRelationships} relationships`,
      });

    } catch (error) {
      console.error('Error loading schema:', error);
      toast({
        title: 'Error',
        description: 'Failed to load database schema',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedTable(null);
  };

  const getTablePosition = (tableName: string) => {
    return schemaData?.tables.find(t => t.name === tableName)?.position || { x: 0, y: 0 };
  };

  const getColumnTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('integer')) return 'bg-blue-100 text-blue-800';
    if (lowerType.includes('text') || lowerType.includes('varchar')) return 'bg-green-100 text-green-800';
    if (lowerType.includes('date') || lowerType.includes('time')) return 'bg-purple-100 text-purple-800';
    if (lowerType.includes('bool')) return 'bg-orange-100 text-orange-800';
    if (lowerType.includes('real') || lowerType.includes('float')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderRelationshipLines = () => {
    if (!schemaData) return null;

    return schemaData.relationships.map((rel, index) => {
      const fromTable = getTablePosition(rel.from);
      const toTable = getTablePosition(rel.to);
      
      // Calculate connection points (center of table boxes)
      const fromX = fromTable.x + 150; // Half of table width
      const fromY = fromTable.y + 100; // Approximate center height
      const toX = toTable.x + 150;
      const toY = toTable.y + 100;

      // Create a curved line for better visibility
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      const offset = 50;

      return (
        <g key={`rel-${index}`}>
          {/* Relationship line */}
          <path
            d={`M ${fromX} ${fromY} Q ${midX + offset} ${midY} ${toX} ${toY}`}
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
            className="hover:stroke-blue-500 transition-colors cursor-pointer"
          />
          
          {/* Arrow head */}
          <polygon
            points={`${toX-8},${toY-4} ${toX},${toY} ${toX-8},${toY+4}`}
            fill="#6b7280"
            className="hover:fill-blue-500 transition-colors"
          />
          
          {/* Relationship label */}
          <text
            x={midX}
            y={midY - 10}
            className="text-xs fill-gray-600 pointer-events-none"
            textAnchor="middle"
          >
            {rel.fromColumn} → {rel.toColumn}
          </text>
        </g>
      );
    });
  };

  const renderTables = () => {
    if (!schemaData) return null;

    return schemaData.tables.map((table) => (
      <g key={table.name}>
        {/* Table box */}
        <rect
          x={table.position.x}
          y={table.position.y}
          width="300"
          height={Math.max(150, 30 + table.columns.length * 25)}
          fill={selectedTable === table.name ? "#dbeafe" : "#ffffff"}
          stroke={selectedTable === table.name ? "#3b82f6" : "#d1d5db"}
          strokeWidth={selectedTable === table.name ? "2" : "1"}
          rx="8"
          className="hover:stroke-blue-400 cursor-pointer transition-colors"
          onClick={() => setSelectedTable(selectedTable === table.name ? null : table.name)}
        />
        
        {/* Table header */}
        <rect
          x={table.position.x}
          y={table.position.y}
          width="300"
          height="30"
          fill={selectedTable === table.name ? "#3b82f6" : "#f3f4f6"}
          stroke="none"
          rx="8"
        />
        <rect
          x={table.position.x}
          y={table.position.y + 22}
          width="300"
          height="8"
          fill={selectedTable === table.name ? "#3b82f6" : "#f3f4f6"}
          stroke="none"
        />
        
        {/* Table name */}
        <text
          x={table.position.x + 10}
          y={table.position.y + 20}
          className={`text-sm font-semibold pointer-events-none ${
            selectedTable === table.name ? 'fill-white' : 'fill-gray-900'
          }`}
        >
          <tspan className="text-xs">📊</tspan>
          <tspan dx="5">{table.name}</tspan>
        </text>
        
        {/* Columns */}
        {table.columns.slice(0, 10).map((column, index) => (
          <g key={column.name}>
            {/* Column background */}
            <rect
              x={table.position.x + 1}
              y={table.position.y + 30 + index * 25}
              width="298"
              height="24"
              fill={column.primaryKey ? "#fef3c7" : column.foreignKey ? "#dcfce7" : "transparent"}
              className="hover:fill-gray-50"
            />
            
            {/* Column icon */}
            <text
              x={table.position.x + 8}
              y={table.position.y + 45 + index * 25}
              className="text-xs fill-gray-600 pointer-events-none"
            >
              {column.primaryKey ? '🔑' : column.foreignKey ? '🔗' : '📄'}
            </text>
            
            {/* Column name */}
            <text
              x={table.position.x + 25}
              y={table.position.y + 45 + index * 25}
              className={`text-xs pointer-events-none ${
                column.primaryKey ? 'fill-yellow-800 font-semibold' : 
                column.foreignKey ? 'fill-green-800 font-medium' : 'fill-gray-700'
              }`}
            >
              {column.name}
            </text>
            
            {/* Column type */}
            <text
              x={table.position.x + 200}
              y={table.position.y + 45 + index * 25}
              className="text-xs fill-gray-500 pointer-events-none"
            >
              {column.type}
            </text>
            
            {/* Nullable indicator */}
            {column.nullable && (
              <text
                x={table.position.x + 280}
                y={table.position.y + 45 + index * 25}
                className="text-xs fill-gray-400 pointer-events-none"
              >
                ?
              </text>
            )}
          </g>
        ))}
        
        {/* Show truncation indicator if more than 10 columns */}
        {table.columns.length > 10 && (
          <text
            x={table.position.x + 10}
            y={table.position.y + 30 + 10 * 25 + 15}
            className="text-xs fill-gray-500 pointer-events-none"
          >
            ... and {table.columns.length - 10} more columns
          </text>
        )}
      </g>
    ));
  };

  if (!schemaData) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Analyzing database schema...</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Database Schema</h3>
                <p className="text-gray-500 mb-4">Load the database schema to visualize table relationships</p>
                <Button onClick={loadSchema}>
                  <Database className="h-4 w-4 mr-2" />
                  Load Schema
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const svgWidth = Math.max(1200, Math.max(...schemaData.tables.map(t => t.position.x + 300)));
  const svgHeight = Math.max(800, Math.max(...schemaData.tables.map(t => t.position.y + 200)));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Schema Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{schemaData.metadata.totalTables} tables</Badge>
              <Badge variant="outline">{schemaData.metadata.totalRelationships} relationships</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetView}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <span className="text-sm text-gray-600">
                Zoom: {Math.round(zoom * 100)}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSchema}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export as SVG
                  const svgElement = svgRef.current;
                  if (svgElement) {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const blob = new Blob([svgData], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'database-schema.svg';
                    link.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export SVG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema Visualization */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={containerRef}
            className="relative overflow-auto bg-gray-50 border rounded-lg"
            style={{ height: '600px' }}
          >
            <svg
              ref={svgRef}
              width={svgWidth * zoom}
              height={svgHeight * zoom}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="cursor-move"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Relationship lines */}
              {renderRelationshipLines()}
              
              {/* Tables */}
              {renderTables()}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Selected Table Details */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {selectedTable}
              <Badge variant="outline">
                {schemaData?.tables.find(t => t.name === selectedTable)?.columns.length} columns
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Columns */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>📄</span>
                  Columns
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {schemaData?.tables.find(t => t.name === selectedTable)?.columns.map((column) => (
                    <div key={column.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {column.primaryKey ? '🔑' : column.foreignKey ? '🔗' : '📄'}
                        </span>
                        <span className="font-medium text-sm">{column.name}</span>
                        {column.foreignKey && (
                          <ExternalLink className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getColumnTypeColor(column.type)}`}>
                          {column.type}
                        </Badge>
                        {column.nullable && (
                          <Badge variant="secondary" className="text-xs">
                            nullable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relationships */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>🔗</span>
                  Relationships
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {schemaData?.relationships
                    .filter(rel => rel.from === selectedTable || rel.to === selectedTable)
                    .map((rel, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 text-sm">
                          {rel.from === selectedTable ? (
                            <>
                              <span className="font-medium">{rel.fromColumn}</span>
                              <span className="text-gray-500">→</span>
                              <span className="text-blue-600">{rel.to}.{rel.toColumn}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-blue-600">{rel.from}.{rel.fromColumn}</span>
                              <span className="text-gray-500">→</span>
                              <span className="font-medium">{rel.toColumn}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  {schemaData?.relationships.filter(rel => rel.from === selectedTable || rel.to === selectedTable).length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No foreign key relationships found for this table
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span>🔑</span>
              <span>Primary Key</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔗</span>
              <span>Foreign Key</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📄</span>
              <span>Regular Column</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-gray-400 border-dashed border-t-2"></span>
              <span>Relationship</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}