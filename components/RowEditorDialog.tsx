'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Chip,
  Paper,
  Tabs,
  Tab,
  Alert
} from '@mui/material';
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

  // Check if a field contains JSON data
  const isJsonField = useCallback((fieldName: string, value: any) => {
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
  }, [tableName]);

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
  }, [row, open, columns, isJsonField]);

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>JSON Content Preview:</Typography>
              <Box
                component="pre" 
                sx={{ 
                  fontSize: '0.75rem', 
                  bgcolor: 'action.hover', 
                  p: 1, 
                  borderRadius: 1, 
                  border: 1, 
                  borderColor: 'divider',
                  overflow: 'auto', 
                  maxHeight: '8rem',
                  fontFamily: 'monospace'
                }}
              >
                {typeof value === 'string' ? formatJson(value) : JSON.stringify(value, null, 2)}
              </Box>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => setIsJsonView(prev => ({ 
                  ...prev, 
                  [column.column_key]: true 
                }))}
                startIcon={<Code className="h-3 w-3" />}
                sx={{ mt: 1 }}
              >
                Edit JSON
              </Button>
            </Paper>
          )}
          
          {hasJsonError && (
            <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle className="h-4 w-4" />
                <span>{hasJsonError}</span>
              </Box>
            </Alert>
          )}
        </Box>
      );
    }

    // Regular field types
    switch (column.column_type) {
      case 'date':
        return (
          <TextField
            label={column.column_label}
            type="datetime-local"
            value={value ? new Date(value).toISOString().slice(0, 16) : ''}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        );
      
      case 'number':
        return (
          <TextField
            label={column.column_label}
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            fullWidth
            size="small"
          />
        );
      
      case 'badge':
        const badgeOptions = ['pending', 'in_progress', 'completed', 'cancelled', 'open', 'closed', 'active', 'inactive'];
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{column.column_label}</InputLabel>
            <Select 
              value={value || ''} 
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
              label={column.column_label}
            >
              {badgeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  <Chip label={option} variant="outlined" size="small" />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      
      default:
        // Multi-line for description fields or long text
        if (column.column_key.includes('description') || 
            column.column_key.includes('notes') || 
            column.column_key.includes('comment')) {
          return (
            <TextField
              label={column.column_label}
              value={value || ''}
              onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
              multiline
              rows={3}
              fullWidth
              size="small"
            />
          );
        }
        
        return (
          <TextField
            label={column.column_label}
            value={value || ''}
            onChange={(e) => handleFieldChange(column.column_key, e.target.value)}
            placeholder={`Enter ${column.column_label.toLowerCase()}...`}
            fullWidth
            size="small"
          />
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

  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Code className="h-5 w-5" />
        Edit Row Data
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Editing record from {tableName.replace('_', ' ')} table
          {row.id && ` (ID: ${row.id})`}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label={`Main Fields (${visibleColumns.length})`} />
            <Tab label={`Advanced Fields (${hiddenColumns.length})`} />
          </Tabs>
        </Box>
        
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '60vh', overflowY: 'auto' }}>
            {visibleColumns.map((column) => (
              <Box key={column.column_key}>
                {renderFieldInput(column)}
              </Box>
            ))}
          </Box>
        )}
        
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '60vh', overflowY: 'auto' }}>
            {hiddenColumns.length > 0 ? (
              hiddenColumns.map((column) => (
                <Box key={column.column_key}>
                  {renderFieldInput(column)}
                </Box>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <Typography>No advanced fields configured for this table</Typography>
              </Box>
            )}
          </Box>
        )}

      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleCancel} 
          disabled={saving}
          startIcon={<X className="h-4 w-4" />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving || Object.keys(jsonErrors).some(key => jsonErrors[key])}
          variant="contained"
          startIcon={saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}