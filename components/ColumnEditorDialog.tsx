'use client';

import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Chip,
  Paper
} from '@mui/material';
import { Save, X } from 'lucide-react';

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

interface ColumnEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: ColumnDefinition | null;
  onSave: (columnData: Partial<ColumnDefinition>) => void;
  tableIdentifier: string;
}

export function ColumnEditorDialog({
  open,
  onOpenChange,
  column,
  onSave,
  tableIdentifier
}: ColumnEditorDialogProps) {
  const [formData, setFormData] = useState({
    column_key: '',
    column_label: '',
    column_type: 'text',
    is_sortable: false,
    is_filterable: false,
    default_visible: true,
    display_order: 0
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Column type options
  const columnTypes = [
    { value: 'text', label: 'Text', icon: '📄', description: 'Plain text data' },
    { value: 'number', label: 'Number', icon: '🔢', description: 'Numeric values' },
    { value: 'date', label: 'Date', icon: '📅', description: 'Date and time values' },
    { value: 'badge', label: 'Badge', icon: '🏷️', description: 'Status or category badges' },
    { value: 'user', label: 'User', icon: '👤', description: 'User references with avatars' },
    { value: 'team', label: 'Team', icon: '👥', description: 'Team or group references' },
  ];

  // Initialize form data when dialog opens or column changes
  useEffect(() => {
    if (column) {
      setFormData({
        column_key: column.column_key || '',
        column_label: column.column_label || '',
        column_type: column.column_type || 'text',
        is_sortable: column.is_sortable || false,
        is_filterable: column.is_filterable || false,
        default_visible: column.default_visible !== false,
        display_order: column.display_order || 0
      });
    } else {
      // Reset for new column
      setFormData({
        column_key: '',
        column_label: '',
        column_type: 'text',
        is_sortable: false,
        is_filterable: false,
        default_visible: true,
        display_order: 0
      });
    }
    setErrors({});
  }, [column, open]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.column_key.trim()) {
      newErrors.column_key = 'Column key is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.column_key)) {
      newErrors.column_key = 'Column key must start with letter/underscore and contain only letters, numbers, and underscores';
    }

    if (!formData.column_label.trim()) {
      newErrors.column_label = 'Column label is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onSave({
      ...formData,
      table_identifier: tableIdentifier
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
    setErrors({});
  };

  const selectedColumnType = columnTypes.find(type => type.value === formData.column_type);

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {column ? 'Edit Column' : 'Add New Column'}
        {selectedColumnType && <span style={{ fontSize: '1.2rem' }}>{selectedColumnType.icon}</span>}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {column ? 'Update the column definition' : 'Create a new column definition'} for the {tableIdentifier.replace('_', ' ')} table.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* Column Key */}
          <TextField
            label="Column Key *"
            value={formData.column_key}
            onChange={(e) => setFormData({ ...formData, column_key: e.target.value })}
            placeholder="e.g., user_id, created_at, status"
            error={!!errors.column_key}
            helperText={errors.column_key || (column ? 'Column key cannot be changed for existing columns' : '')}
            disabled={!!column}
            fullWidth
            size="small"
          />

          {/* Column Label */}
          <TextField
            label="Display Label *"
            value={formData.column_label}
            onChange={(e) => setFormData({ ...formData, column_label: e.target.value })}
            placeholder="e.g., User ID, Created Date, Status"
            error={!!errors.column_label}
            helperText={errors.column_label}
            fullWidth
            size="small"
          />

          {/* Column Type */}
          <FormControl fullWidth size="small">
            <InputLabel>Column Type</InputLabel>
            <Select 
              value={formData.column_type} 
              onChange={(e) => setFormData({ ...formData, column_type: e.target.value })}
              label="Column Type"
            >
              {columnTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{type.icon}</span>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{type.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{type.description}</Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Display Order */}
          <TextField
            label="Display Order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            placeholder="0"
            inputProps={{ min: 0, max: 1000 }}
            helperText="Lower numbers appear first in the table"
            fullWidth
            size="small"
          />

          {/* Feature Toggles */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.default_visible}
                  onChange={(e) => setFormData({ ...formData, default_visible: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Default Visible</Typography>
                  <Typography variant="caption" color="text.secondary">Show this column by default in table views</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_sortable}
                  onChange={(e) => setFormData({ ...formData, is_sortable: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Sortable</Typography>
                  <Typography variant="caption" color="text.secondary">Allow users to sort by this column</Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_filterable}
                  onChange={(e) => setFormData({ ...formData, is_filterable: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Filterable</Typography>
                  <Typography variant="caption" color="text.secondary">Allow users to filter by this column</Typography>
                </Box>
              }
            />
          </Box>

          {/* Preview */}
          {formData.column_label && (
            <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>Preview</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span style={{ fontSize: '1.2rem' }}>{selectedColumnType?.icon}</span>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{formData.column_label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formData.column_key} • {selectedColumnType?.label}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {formData.default_visible && (
                    <Chip label="Visible" variant="outlined" size="small" />
                  )}
                  {formData.is_sortable && (
                    <Chip label="Sortable" variant="outlined" size="small" />
                  )}
                  {formData.is_filterable && (
                    <Chip label="Filterable" variant="outlined" size="small" />
                  )}
                </Box>
              </Box>
            </Paper>
          )}
        </Box>

      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleCancel}
          startIcon={<X className="h-4 w-4" />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          startIcon={<Save className="h-4 w-4" />}
        >
          {column ? 'Update Column' : 'Create Column'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}