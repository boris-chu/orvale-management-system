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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {column ? 'Edit Column' : 'Add New Column'}
            {selectedColumnType && <span className="text-lg">{selectedColumnType.icon}</span>}
          </DialogTitle>
          <DialogDescription>
            {column ? 'Update the column definition' : 'Create a new column definition'} for the {tableIdentifier.replace('_', ' ')} table.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Column Key */}
          <div className="space-y-2">
            <Label htmlFor="column_key">Column Key *</Label>
            <Input
              id="column_key"
              value={formData.column_key}
              onChange={(e) => setFormData({ ...formData, column_key: e.target.value })}
              placeholder="e.g., user_id, created_at, status"
              className={errors.column_key ? 'border-red-500' : ''}
              disabled={!!column} // Don't allow changing key for existing columns
            />
            {errors.column_key && <p className="text-sm text-red-500">{errors.column_key}</p>}
            {!!column && (
              <p className="text-xs text-gray-500">Column key cannot be changed for existing columns</p>
            )}
          </div>

          {/* Column Label */}
          <div className="space-y-2">
            <Label htmlFor="column_label">Display Label *</Label>
            <Input
              id="column_label"
              value={formData.column_label}
              onChange={(e) => setFormData({ ...formData, column_label: e.target.value })}
              placeholder="e.g., User ID, Created Date, Status"
              className={errors.column_label ? 'border-red-500' : ''}
            />
            {errors.column_label && <p className="text-sm text-red-500">{errors.column_label}</p>}
          </div>

          {/* Column Type */}
          <div className="space-y-2">
            <Label htmlFor="column_type">Column Type</Label>
            <Select value={formData.column_type} onValueChange={(value) => setFormData({ ...formData, column_type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select column type" />
              </SelectTrigger>
              <SelectContent>
                {columnTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              max="1000"
            />
            <p className="text-xs text-gray-500">Lower numbers appear first in the table</p>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="default_visible">Default Visible</Label>
                <p className="text-xs text-gray-500">Show this column by default in table views</p>
              </div>
              <Switch
                id="default_visible"
                checked={formData.default_visible}
                onCheckedChange={(checked) => setFormData({ ...formData, default_visible: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_sortable">Sortable</Label>
                <p className="text-xs text-gray-500">Allow users to sort by this column</p>
              </div>
              <Switch
                id="is_sortable"
                checked={formData.is_sortable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_sortable: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_filterable">Filterable</Label>
                <p className="text-xs text-gray-500">Allow users to filter by this column</p>
              </div>
              <Switch
                id="is_filterable"
                checked={formData.is_filterable}
                onCheckedChange={(checked) => setFormData({ ...formData, is_filterable: checked })}
              />
            </div>
          </div>

          {/* Preview */}
          {formData.column_label && (
            <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg">{selectedColumnType?.icon}</span>
                <div>
                  <div className="font-medium">{formData.column_label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.column_key} • {selectedColumnType?.label}
                  </div>
                </div>
                <div className="flex gap-1 ml-auto">
                  {formData.default_visible && (
                    <Badge variant="outline" className="text-xs">Visible</Badge>
                  )}
                  {formData.is_sortable && (
                    <Badge variant="outline" className="text-xs">Sortable</Badge>
                  )}
                  {formData.is_filterable && (
                    <Badge variant="outline" className="text-xs">Filterable</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {column ? 'Update Column' : 'Create Column'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}