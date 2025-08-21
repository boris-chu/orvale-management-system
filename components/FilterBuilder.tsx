'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  TextField,
  Chip,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Add,
  Delete,
  DragIndicator,
  ExpandMore,
  ExpandLess,
  FilterList,
  Clear,
  Save,
  PlayArrow
} from '@mui/icons-material';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Types for filter conditions
export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: any;
  enabled: boolean;
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
  enabled: boolean;
}

export interface FilterBuilderProps {
  columns: Array<{
    column_key: string;
    display_name: string;
    column_type: 'text' | 'number' | 'date' | 'badge' | 'user' | 'team';
    is_filterable: boolean;
  }>;
  initialFilter?: FilterGroup;
  onFilterChange: (filter: FilterGroup) => void;
  onApplyFilter: (filter: FilterGroup) => void;
  className?: string;
}

// Operator definitions for different column types
const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'greater_than_equal', label: 'Greater than or equal' },
    { value: 'less_than', label: 'Less than' },
    { value: 'less_than_equal', label: 'Less than or equal' },
    { value: 'between', label: 'Between' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' }
  ],
  date: [
    { value: 'equals', label: 'On date' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'last_days', label: 'Last N days' },
    { value: 'next_days', label: 'Next N days' },
    { value: 'this_week', label: 'This week' },
    { value: 'this_month', label: 'This month' },
    { value: 'this_year', label: 'This year' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' }
  ],
  badge: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does not equal' },
    { value: 'in', label: 'Is one of' },
    { value: 'not_in', label: 'Is not one of' }
  ],
  user: [
    { value: 'equals', label: 'Is user' },
    { value: 'not_equals', label: 'Is not user' },
    { value: 'in', label: 'Is one of users' },
    { value: 'not_in', label: 'Is not one of users' },
    { value: 'is_empty', label: 'Unassigned' },
    { value: 'is_not_empty', label: 'Assigned' }
  ],
  team: [
    { value: 'equals', label: 'Is team' },
    { value: 'not_equals', label: 'Is not team' },
    { value: 'in', label: 'Is one of teams' },
    { value: 'not_in', label: 'Is not one of teams' }
  ]
};

// Generate unique IDs
const generateId = () => `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Filter condition component
const FilterConditionRow: React.FC<{
  condition: FilterCondition;
  columns: FilterBuilderProps['columns'];
  onUpdate: (condition: FilterCondition) => void;
  onDelete: () => void;
  canDelete: boolean;
}> = ({ condition, columns, onUpdate, onDelete, canDelete }) => {
  const selectedColumn = columns.find(col => col.column_key === condition.column);
  const availableOperators = selectedColumn ? OPERATORS[selectedColumn.column_type] || [] : [];

  const handleColumnChange = (columnKey: string) => {
    const column = columns.find(col => col.column_key === columnKey);
    if (column) {
      const operators = OPERATORS[column.column_type] || [];
      onUpdate({
        ...condition,
        column: columnKey,
        operator: operators[0]?.value || 'equals',
        value: ''
      });
    }
  };

  const renderValueInput = () => {
    if (!selectedColumn) return null;

    const needsValue = !['is_empty', 'is_not_empty', 'this_week', 'this_month', 'this_year'].includes(condition.operator);
    
    if (!needsValue) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200, py: 1 }}>
          No value needed
        </Typography>
      );
    }

    switch (selectedColumn.column_type) {
      case 'number':
        if (condition.operator === 'between') {
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                type="number"
                placeholder="Min"
                value={condition.value?.min || ''}
                onChange={(e) => onUpdate({
                  ...condition,
                  value: { ...condition.value, min: e.target.value }
                })}
                sx={{ width: 80 }}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                size="small"
                type="number"
                placeholder="Max"
                value={condition.value?.max || ''}
                onChange={(e) => onUpdate({
                  ...condition,
                  value: { ...condition.value, max: e.target.value }
                })}
                sx={{ width: 80 }}
              />
            </Stack>
          );
        }
        return (
          <TextField
            size="small"
            type="number"
            placeholder="Enter number"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            sx={{ minWidth: 150 }}
          />
        );

      case 'date':
        if (condition.operator === 'between') {
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                type="date"
                value={condition.value?.start || ''}
                onChange={(e) => onUpdate({
                  ...condition,
                  value: { ...condition.value, start: e.target.value }
                })}
                sx={{ width: 150 }}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                size="small"
                type="date"
                value={condition.value?.end || ''}
                onChange={(e) => onUpdate({
                  ...condition,
                  value: { ...condition.value, end: e.target.value }
                })}
                sx={{ width: 150 }}
              />
            </Stack>
          );
        }
        if (['last_days', 'next_days'].includes(condition.operator)) {
          return (
            <TextField
              size="small"
              type="number"
              placeholder="Number of days"
              value={condition.value || ''}
              onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
              sx={{ minWidth: 150 }}
            />
          );
        }
        return (
          <TextField
            size="small"
            type="date"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            sx={{ minWidth: 150 }}
          />
        );

      case 'badge':
      case 'user':
      case 'team':
        if (['in', 'not_in'].includes(condition.operator)) {
          return (
            <TextField
              size="small"
              placeholder="Enter values (comma separated)"
              value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || ''}
              onChange={(e) => {
                const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                onUpdate({ ...condition, value: values });
              }}
              sx={{ minWidth: 200 }}
            />
          );
        }
        return (
          <TextField
            size="small"
            placeholder={`Enter ${selectedColumn.column_type}`}
            value={condition.value || ''}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            sx={{ minWidth: 150 }}
          />
        );

      default: // text
        return (
          <TextField
            size="small"
            placeholder="Enter text"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            sx={{ minWidth: 150 }}
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 1, 
          border: condition.enabled ? '1px solid' : '1px dashed',
          borderColor: condition.enabled ? 'primary.light' : 'grey.300',
          opacity: condition.enabled ? 1 : 0.6
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Drag Handle */}
          <DragIndicator sx={{ color: 'text.secondary', cursor: 'grab' }} />
          
          {/* Enable/Disable Switch */}
          <Switch
            size="small"
            checked={condition.enabled}
            onChange={(e) => onUpdate({ ...condition, enabled: e.target.checked })}
          />
          
          {/* Column Selection */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Column</InputLabel>
            <Select
              value={condition.column}
              label="Column"
              onChange={(e) => handleColumnChange(e.target.value)}
            >
              {columns.filter(col => col.is_filterable).map((column) => (
                <MenuItem key={column.column_key} value={column.column_key}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{column.display_name}</Typography>
                    <Badge variant="outline" className="text-xs">
                      {column.column_type}
                    </Badge>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Operator Selection */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={condition.operator}
              label="Operator"
              onChange={(e) => onUpdate({ ...condition, operator: e.target.value })}
              disabled={!condition.column}
            >
              {availableOperators.map((op) => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Value Input */}
          <Box sx={{ flex: 1 }}>
            {renderValueInput()}
          </Box>
          
          {/* Delete Button */}
          <Tooltip title="Delete condition">
            <IconButton
              size="small"
              onClick={onDelete}
              disabled={!canDelete}
              color="error"
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    </motion.div>
  );
};

// Main FilterBuilder component
export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  columns,
  initialFilter,
  onFilterChange,
  onApplyFilter,
  className
}) => {
  const [filter, setFilter] = useState<FilterGroup>(
    initialFilter || {
      id: generateId(),
      logic: 'AND',
      conditions: [{
        id: generateId(),
        column: '',
        operator: 'equals',
        value: '',
        enabled: true
      }],
      enabled: true
    }
  );
  
  const [isExpanded, setIsExpanded] = useState(true);

  // Get filterable columns
  const filterableColumns = useMemo(() => 
    columns.filter(col => col.is_filterable), 
    [columns]
  );

  // Update filter and notify parent
  const updateFilter = useCallback((newFilter: FilterGroup) => {
    setFilter(newFilter);
    onFilterChange(newFilter);
  }, [onFilterChange]);

  // Add new condition
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: generateId(),
      column: filterableColumns[0]?.column_key || '',
      operator: 'equals',
      value: '',
      enabled: true
    };
    
    updateFilter({
      ...filter,
      conditions: [...filter.conditions, newCondition]
    });
  };

  // Update condition
  const updateCondition = (index: number, updatedCondition: FilterCondition) => {
    const newConditions = [...filter.conditions];
    newConditions[index] = updatedCondition;
    updateFilter({ ...filter, conditions: newConditions });
  };

  // Delete condition
  const deleteCondition = (index: number) => {
    if (filter.conditions.length > 1) {
      const newConditions = filter.conditions.filter((_, i) => i !== index);
      updateFilter({ ...filter, conditions: newConditions });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilter: FilterGroup = {
      id: generateId(),
      logic: 'AND',
      conditions: [{
        id: generateId(),
        column: '',
        operator: 'equals',
        value: '',
        enabled: true
      }],
      enabled: true
    };
    updateFilter(clearedFilter);
  };

  // Get active filter count
  const activeFilterCount = filter.conditions.filter(c => c.enabled && c.column && c.value).length;

  if (filterableColumns.length === 0) {
    return (
      <Alert severity="info" className={className}>
        No filterable columns available for this table.
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FilterList className="h-5 w-5" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
            >
              Clear
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => onApplyFilter(filter)}
              disabled={activeFilterCount === 0}
            >
              Apply Filters
            </Button>
            <IconButton
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4">
              {/* Logic Selection */}
              {filter.conditions.length > 1 && (
                <FormControl size="small">
                  <InputLabel>Logic</InputLabel>
                  <Select
                    value={filter.logic}
                    label="Logic"
                    onChange={(e) => updateFilter({ ...filter, logic: e.target.value as 'AND' | 'OR' })}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="AND">AND (all conditions)</MenuItem>
                    <MenuItem value="OR">OR (any condition)</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {/* Filter Conditions */}
              <AnimatePresence>
                {filter.conditions.map((condition, index) => (
                  <FilterConditionRow
                    key={condition.id}
                    condition={condition}
                    columns={filterableColumns}
                    onUpdate={(updatedCondition) => updateCondition(index, updatedCondition)}
                    onDelete={() => deleteCondition(index)}
                    canDelete={filter.conditions.length > 1}
                  />
                ))}
              </AnimatePresence>
              
              {/* Add Condition Button */}
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addCondition}
                size="small"
              >
                Add Condition
              </Button>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default FilterBuilder;