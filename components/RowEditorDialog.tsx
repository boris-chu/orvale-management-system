'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, X, Code, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColumnDefinition {
  id: number;
  table_identifier: string;
  column_key: string;
  column_label: string;
  column_type: string;
  is_sortable: boolean;
  is_filterable: boolean;
  default_visible: boolean;
  display_order: number;
}

interface RowEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row?: any | null;
  columns: ColumnDefinition[];
  tableName: string;
  onSave: (rowData: any) => void;
}

export function RowEditorDialog({
  open,
  onOpenChange,
  row,
  columns,
  tableName,
  onSave
}: RowEditorDialogProps) {
  const [formData, setFormData] = useState<any>({});
  const [jsonErrors, setJsonErrors] = useState<{ [key: string]: string }>({});
  const [isJsonView, setIsJsonView] = useState<{ [key: string]: boolean }>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Initialize form data when dialog opens or row changes
  useEffect(() => {
    if (row && open) {
      setFormData({ ...row });
      setJsonErrors({});
      
      // Auto-detect JSON fields and set initial view modes
      const newJsonView: { [key: string]: boolean } = {};
      columns.forEach(column => {
        if (isJsonField(column.column_key, row[column.column_key])) {
          newJsonView[column.column_key] = false; // Start with form view
        }
      });
      setIsJsonView(newJsonView);
    } else {
      setFormData({});
      setJsonErrors({});
      setIsJsonView({});
    }
  }, [row, open, columns]);

  // Check if a field contains JSON data
  const isJsonField = (fieldName: string, value: any) => {
    // Settings tables typically have JSON fields
    if (tableName === 'portal_settings' || tableName === 'system_settings') {
      if (fieldName === 'setting_value' || fieldName === 'value' || fieldName === 'config') {
        return true;
      }
    }
    
    // Check if value looks like JSON
    if (typeof value === 'string' && value.trim().length > 0) {
      return (value.trim().startsWith('{') && value.trim().endsWith('}')) ||
             (value.trim().startsWith('[') && value.trim().endsWith(']'));
    }
    
    return false;
  };

  // Validate JSON for a field
  const validateJson = (fieldName: string, value: string) => {
    if (!isJsonField(fieldName, value)) return true;
    
    try {
      JSON.parse(value);
      setJsonErrors(prev => ({ ...prev, [fieldName]: '' }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON format';
      setJsonErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
      return false;
    }
  };

  // Handle field changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate JSON fields in real-time
    if (typeof value === 'string' && isJsonField(fieldName, value)) {
      validateJson(fieldName, value);
    }
  };

  // Pretty format JSON
  const formatJson = (value: string) => {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validate all JSON fields
    let hasJsonErrors = false;
    columns.forEach(column => {
      const value = formData[column.column_key];
      if (typeof value === 'string' && isJsonField(column.column_key, value)) {
        if (!validateJson(column.column_key, value)) {
          hasJsonErrors = true;
        }
      }
    });

    if (hasJsonErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fix JSON syntax errors before saving',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
      toast({
        title: 'Success',
        description: 'Row updated successfully',
      });
    } catch (error) {
      console.error('Error saving row:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
    setFormData({});
    setJsonErrors({});
    setIsJsonView({});
  };

  // Render field input based on column type
  const renderFieldInput = (column: ColumnDefinition) => {
    const value = formData[column.column_key] || '';
    const isJson = isJsonField(column.column_key, value);
    const hasJsonError = jsonErrors[column.column_key];

    if (isJson) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={column.column_key} className="flex items-center gap-2">
              {column.column_label}
              <Badge variant="outline" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                JSON
              </Badge>
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsJsonView(prev => ({ 
                  ...prev, 
                  [column.column_key]: !prev[column.column_key] 
                }))}
              >
                {isJsonView[column.column_key] ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Form View
                  </>
                ) : (
                  <>
                    <Code className="h-3 w-3 mr-1" />
                    JSON View
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {isJsonView[column.column_key] ? (
            <Textarea
              id={column.column_key}
              value={typeof value === 'string' ? formatJson(value) : JSON.stringify(value, null, 2)}
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
              className={`font-mono text-sm ${hasJsonError ? 'border-red-500' : ''}`}
              rows={8}
              placeholder="Enter valid JSON..."
            />
          ) : (
            <Card className="p-3">
              <div className="text-xs text-gray-600 mb-2">JSON Content Preview:</div>
              <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded border overflow-auto max-h-32">
                {typeof value === 'string' ? formatJson(value) : JSON.stringify(value, null, 2)}
              </pre>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setIsJsonView(prev => ({ 
                  ...prev, 
                  [column.column_key]: true 
                }))}
              >
                <Code className="h-3 w-3 mr-1" />
                Edit JSON
              </Button>
            </Card>
          )}
          
          {hasJsonError && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{hasJsonError}</span>
            </div>
          )}
        </div>
      );
    }

    // Regular field types
    switch (column.column_type) {
      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={column.column_key}>{column.column_label}</Label>
            <Input
              id={column.column_key}
              type="datetime-local"
              value={value ? new Date(value).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            />
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={column.column_key}>{column.column_label}</Label>
            <Input
              id={column.column_key}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            />
          </div>
        );
      
      case 'badge':
        const badgeOptions = ['pending', 'in_progress', 'completed', 'cancelled', 'open', 'closed', 'active', 'inactive'];
        return (
          <div className="space-y-2">
            <Label htmlFor={column.column_key}>{column.column_label}</Label>
            <Select value={value} onValueChange={(v) => handleFieldChange(column.column_key, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {badgeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    <Badge variant="outline" className="text-xs">
                      {option}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      default:
        // Multi-line for description fields or long text
        if (column.column_key.includes('description') || 
            column.column_key.includes('notes') || 
            column.column_key.includes('comment')) {
          return (
            <div className="space-y-2">
              <Label htmlFor={column.column_key}>{column.column_label}</Label>
              <Textarea
                id={column.column_key}
                value={value}
                onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
                rows={3}
              />
            </div>
          );
        }
        
        return (
          <div className="space-y-2">
            <Label htmlFor={column.column_key}>{column.column_label}</Label>
            <Input
              id={column.column_key}
              value={value}
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
              placeholder={`Enter ${column.column_label.toLowerCase()}...`}
            />
          </div>
        );
    }
  };

  if (!row) return null;

  const visibleColumns = columns
    .filter(col => col.default_visible)
    .sort((a, b) => a.display_order - b.display_order);

  const hiddenColumns = columns
    .filter(col => !col.default_visible)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Edit Row Data
          </DialogTitle>
          <DialogDescription>
            Editing record from {tableName.replace('_', ' ')} table
            {row.id && ` (ID: ${row.id})`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="main" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main">Main Fields ({visibleColumns.length})</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Fields ({hiddenColumns.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="main" className="flex-1 overflow-auto">
              <div className="space-y-4 pr-2">
                {visibleColumns.map((column) => (
                  <div key={column.column_key}>
                    {renderFieldInput(column)}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="flex-1 overflow-auto">
              <div className="space-y-4 pr-2">
                {hiddenColumns.length > 0 ? (
                  hiddenColumns.map((column) => (
                    <div key={column.column_key}>
                      {renderFieldInput(column)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No advanced fields configured for this table</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || Object.keys(jsonErrors).some(key => jsonErrors[key])}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}