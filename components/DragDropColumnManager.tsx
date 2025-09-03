'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GripVertical,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Settings,
  Columns,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api-client';

// Types
interface ColumnDefinition {
  id: number;
  table_identifier: string;
  column_key: string;
  column_label: string;
  column_type: 'text' | 'number' | 'date' | 'badge' | 'user' | 'team' | 'custom';
  is_sortable: boolean;
  is_filterable: boolean;
  default_visible: boolean;
  display_order: number;
}

interface ColumnConfig {
  key: string;
  visible: boolean;
  width: number;
  order: number;
}

interface DragDropColumnManagerProps {
  tableIdentifier: string;
  onConfigurationChange?: (columnConfig: ColumnConfig[]) => void;
  onSave?: (configuration: any) => void;
  className?: string;
}

// Sortable Item Component
interface SortableColumnItemProps {
  column: ColumnDefinition;
  config: ColumnConfig;
  onVisibilityChange: (key: string, visible: boolean) => void;
  onWidthChange: (key: string, width: number) => void;
  isDragDisabled?: boolean;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  column,
  config,
  onVisibilityChange,
  onWidthChange,
  isDragDisabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: column.column_key,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getColumnTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'badge': return '🏷️';
      case 'user': return '👤';
      case 'team': return '👥';
      case 'date': return '📅';
      case 'number': return '🔢';
      default: return '📄';
    }
  };

  const getColumnTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'badge': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-purple-100 text-purple-800';
      case 'team': return 'bg-orange-100 text-orange-800';
      case 'date': return 'bg-indigo-100 text-indigo-800';
      case 'number': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white border rounded-lg p-4 mb-2 transition-all duration-200
        ${isDragging ? 'shadow-lg scale-105 opacity-90' : 'shadow-sm hover:shadow-md'}
        ${config.visible ? 'border-blue-200' : 'border-gray-200'}
      `}
    >
      <div className="flex items-center justify-between">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className={`
            flex items-center cursor-grab active:cursor-grabbing mr-3
            ${isDragDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        {/* Column Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getColumnTypeIcon(column.column_type)}</span>
            <h4 className="font-medium text-sm">{column.column_label}</h4>
            <Badge 
              variant="outline" 
              className={`text-xs ${getColumnTypeColor(column.column_type)}`}
            >
              {column.column_type}
            </Badge>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Key: {column.column_key}
          </div>
          <div className="flex gap-2">
            {column.is_sortable && (
              <Badge variant="secondary" className="text-xs">Sortable</Badge>
            )}
            {column.is_filterable && (
              <Badge variant="secondary" className="text-xs">Filterable</Badge>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Width Input */}
          <div className="flex items-center gap-2">
            <Label htmlFor={`width-${column.column_key}`} className="text-xs">
              Width:
            </Label>
            <Input
              id={`width-${column.column_key}`}
              type="number"
              min="50"
              max="500"
              value={config.width}
              onChange={(e) => onWidthChange(column.column_key, parseInt(e.target.value) || 150)}
              className="w-16 h-8 text-xs"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={config.visible}
              onCheckedChange={(checked) => onVisibilityChange(column.column_key, checked)}
              id={`visible-${column.column_key}`}
            />
            <Label htmlFor={`visible-${column.column_key}`} className="text-xs">
              {config.visible ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DragDropColumnManager: React.FC<DragDropColumnManagerProps> = ({
  tableIdentifier,
  onConfigurationChange,
  onSave,
  className,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load column definitions and current configuration
  useEffect(() => {
    loadColumnData();
  }, [tableIdentifier]);

  const loadColumnData = async () => {
    if (!user || !tableIdentifier) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Load column definitions
      const columnsResult = await apiClient.getTableColumns(tableIdentifier);

      if (!columnsResult.success) {
        throw new Error('Failed to load column definitions');
      }

      const tableColumns = columnsResult.data?.grouped?.[tableIdentifier] || [];
      
      // Sort by display_order
      const sortedColumns = tableColumns.sort((a: ColumnDefinition, b: ColumnDefinition) => 
        a.display_order - b.display_order
      );
      
      setColumns(sortedColumns);

      // Initialize column configurations
      const initialConfigs: ColumnConfig[] = sortedColumns.map((col: ColumnDefinition, index: number) => ({
        key: col.column_key,
        visible: col.default_visible,
        width: getDefaultWidth(col.column_type),
        order: index,
      }));

      setColumnConfigs(initialConfigs);
      setHasChanges(false);

    } catch (error) {
      console.error('Error loading column data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load column definitions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWidth = (columnType: string): number => {
    switch (columnType) {
      case 'text': return 200;
      case 'badge': return 120;
      case 'user': return 180;
      case 'team': return 150;
      case 'date': return 160;
      case 'number': return 100;
      default: return 150;
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumnConfigs((configs) => {
        const oldIndex = configs.findIndex((config) => config.key === active.id);
        const newIndex = configs.findIndex((config) => config.key === over.id);
        
        const newConfigs = arrayMove(configs, oldIndex, newIndex);
        
        // Update order values
        const updatedConfigs = newConfigs.map((config, index) => ({
          ...config,
          order: index,
        }));

        setHasChanges(true);
        onConfigurationChange?.(updatedConfigs);
        return updatedConfigs;
      });
    }
  };

  // Handle visibility change
  const handleVisibilityChange = (key: string, visible: boolean) => {
    setColumnConfigs((configs) => {
      const newConfigs = configs.map((config) =>
        config.key === key ? { ...config, visible } : config
      );
      setHasChanges(true);
      onConfigurationChange?.(newConfigs);
      return newConfigs;
    });
  };

  // Handle width change
  const handleWidthChange = (key: string, width: number) => {
    setColumnConfigs((configs) => {
      const newConfigs = configs.map((config) =>
        config.key === key ? { ...config, width } : config
      );
      setHasChanges(true);
      onConfigurationChange?.(newConfigs);
      return newConfigs;
    });
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultConfigs: ColumnConfig[] = columns.map((col, index) => ({
      key: col.column_key,
      visible: col.default_visible,
      width: getDefaultWidth(col.column_type),
      order: index,
    }));

    setColumnConfigs(defaultConfigs);
    setHasChanges(false);
    onConfigurationChange?.(defaultConfigs);
    
    toast({
      title: 'Reset Complete',
      description: 'Column configuration reset to defaults',
    });
  };

  // Save configuration
  const handleSave = async () => {
    if (!onSave) {
      toast({
        title: 'Error',
        description: 'Save function not provided',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      const configuration = {
        columns: columnConfigs.map((config) => ({
          key: config.key,
          visible: config.visible,
          width: config.width,
          order: config.order,
        })),
        pagination: { pageSize: 25 },
        sorting: [],
        filters: {},
      };

      await onSave(configuration);
      setHasChanges(false);
      
      toast({
        title: 'Success',
        description: 'Column configuration saved successfully',
      });

    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Memoized sorted columns for DnD
  const sortedColumns = useMemo(() => {
    const configMap = new Map(columnConfigs.map(config => [config.key, config]));
    return columns
      .map(col => ({ ...col, config: configMap.get(col.column_key) }))
      .sort((a, b) => (a.config?.order || 0) - (b.config?.order || 0));
  }, [columns, columnConfigs]);

  // Statistics
  const visibleCount = columnConfigs.filter(config => config.visible).length;
  const totalCount = columnConfigs.length;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Loading Column Manager...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!columns.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Column Manager
          </CardTitle>
          <CardDescription>
            No columns found for table: {tableIdentifier}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No column definitions available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              Column Manager
            </CardTitle>
            <CardDescription>
              Drag and drop to reorder columns, toggle visibility, and adjust widths
            </CardDescription>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span>Total: {totalCount} columns</span>
              <span>Visible: {visibleCount} columns</span>
              <span>Hidden: {totalCount - visibleCount} columns</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedColumns.map(col => col.column_key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              <AnimatePresence>
                {sortedColumns.map((column) => {
                  const config = columnConfigs.find(c => c.key === column.column_key);
                  if (!config) return null;

                  return (
                    <motion.div
                      key={column.column_key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SortableColumnItem
                        column={column}
                        config={config}
                        onVisibilityChange={handleVisibilityChange}
                        onWidthChange={handleWidthChange}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>

        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-amber-800">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">You have unsaved changes</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Don&apos;t forget to save your column configuration
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default DragDropColumnManager;