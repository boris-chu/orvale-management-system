'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { 
  Box, 
  Typography, 
  Alert, 
  Skeleton, 
  Chip, 
  Avatar, 
  Button, 
  Menu, 
  MenuItem, 
  FormControlLabel, 
  Checkbox, 
  TextField, 
  Select, 
  FormControl, 
  InputLabel, 
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  FilterList, 
  ViewColumn, 
  FileDownload, 
  Refresh, 
  Settings,
  MoreVert,
  Search,
  Clear,
  Tune
} from '@mui/icons-material';
import { FilterBuilder, FilterGroup } from './FilterBuilder';

// Type definitions
interface TableColumn {
  id: string;
  table_identifier: string;
  column_key: string;
  column_type: 'text' | 'number' | 'date' | 'badge' | 'user' | 'team' | 'custom';
  display_name: string;
  data_source: string;
  is_system_column: boolean;
  default_visible: boolean;
  default_width?: number;
  sortable: boolean;
  filterable: boolean;
  groupable: boolean;
  exportable: boolean;
  render_component?: string;
}

interface TableConfiguration {
  id: string;
  name: string;
  description?: string;
  table_identifier: string;
  is_active: boolean;
  is_default: boolean;
  is_shared: boolean;
  configuration: {
    columns: Array<{
      key: string;
      visible: boolean;
      width?: number;
      order: number;
    }>;
    pagination?: {
      pageSize: number;
    };
    sorting?: Array<{
      field: string;
      sort: 'asc' | 'desc';
    }>;
    filters?: any;
  };
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

interface ConfigurableDataTableProps {
  tableIdentifier: string;
  data?: any[];
  loading?: boolean;
  onRowClick?: (params: GridRowParams) => void;
  onConfigurationChange?: (config: TableConfiguration) => void;
  refreshKey?: string | number;
  className?: string;
  height?: number | string;
  enableSelection?: boolean;
  onSelectionChange?: (selectedIds: GridRowSelectionModel) => void;
}

// Column type renderers
const StatusBadge: React.FC<{ value: string; type?: string }> = ({ value, type = 'status' }) => {
  const getVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'new':
      case 'active':
        return 'default';
      case 'in_progress':
      case 'assigned':
      case 'working':
        return 'secondary';
      case 'closed':
      case 'resolved':
      case 'completed':
        return 'outline';
      case 'escalated':
      case 'urgent':
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(value)} className="text-xs">
      {value || 'Unknown'}
    </Badge>
  );
};

const UserRenderer: React.FC<{ value: string; displayName?: string; avatar?: string }> = ({ 
  value, 
  displayName, 
  avatar 
}) => {
  if (!value && !displayName) return <span className="text-muted-foreground">Unassigned</span>;
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Avatar
        sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
        src={avatar}
      >
        {(displayName || value)?.charAt(0).toUpperCase()}
      </Avatar>
      <Typography variant="body2" noWrap>
        {displayName || value}
      </Typography>
    </Box>
  );
};

const TeamRenderer: React.FC<{ value: string; teamName?: string }> = ({ value, teamName }) => {
  if (!value && !teamName) return <span className="text-muted-foreground">No Team</span>;
  
  return (
    <Chip
      label={teamName || value}
      size="small"
      variant="outlined"
      sx={{ height: 24, fontSize: '0.75rem' }}
    />
  );
};

const DateRenderer: React.FC<{ value: string | Date }> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;
  
  const date = new Date(value);
  const isValid = !isNaN(date.getTime());
  
  if (!isValid) return <span className="text-muted-foreground">Invalid Date</span>;
  
  return (
    <Typography variant="body2" noWrap>
      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </Typography>
  );
};

export const ConfigurableDataTable: React.FC<ConfigurableDataTableProps> = ({
  tableIdentifier,
  data = [],
  loading = false,
  onRowClick,
  onConfigurationChange,
  refreshKey,
  className,
  height = 400,
  enableSelection = false,
  onSelectionChange
}) => {
  const { user } = useAuth();
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [configuration, setConfiguration] = useState<TableConfiguration | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [sortModel, setSortModel] = useState([]);
  const [filterModel, setFilterModel] = useState({ items: [] });
  const [selectionModel, setSelectionModel] = useState([]);
  
  // UI Control States
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const [quickFilterValue, setQuickFilterValue] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Array<{ field: string; operator: string; value: any }>>([]);
  const [advancedFilter, setAdvancedFilter] = useState<FilterGroup | null>(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // Fetch table configuration and columns
  const fetchConfiguration = useCallback(async () => {
    if (!user || !tableIdentifier) return;

    try {
      setConfigLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch columns
      const columnsResponse = await fetch(`/api/admin/tables-columns?table=${tableIdentifier}`, {
        headers,
      });

      if (!columnsResponse.ok) {
        throw new Error(`Failed to fetch columns: ${columnsResponse.statusText}`);
      }

      const columnsData = await columnsResponse.json();
      console.log('Columns response:', columnsData);
      const tableColumns = columnsData.data?.grouped?.[tableIdentifier] || [];
      console.log('Table columns for', tableIdentifier, ':', tableColumns);
      setColumns(tableColumns);

      // Fetch configuration
      const configResponse = await fetch(`/api/admin/tables-configs?table=${tableIdentifier}`, {
        headers,
      });

      if (!configResponse.ok) {
        throw new Error(`Failed to fetch configuration: ${configResponse.statusText}`);
      }

      const configData = await configResponse.json();
      const configs = configData.data || [];
      
      // Find default configuration or use the first one
      const defaultConfig = configs.find((c: TableConfiguration) => c.is_default) || configs[0];
      
      if (defaultConfig) {
        setConfiguration(defaultConfig);
        
        // Apply initial pagination from config
        if (defaultConfig.configuration?.pagination?.pageSize) {
          setPaginationModel(prev => ({
            ...prev,
            pageSize: defaultConfig.configuration.pagination.pageSize
          }));
        }

        // Apply initial sorting from config
        if (defaultConfig.configuration?.sorting) {
          setSortModel(defaultConfig.configuration.sorting);
        }

        // Apply initial filters from config
        if (defaultConfig.configuration?.filters) {
          setFilterModel(defaultConfig.configuration.filters);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load table configuration';
      setError(`Error: ${errorMessage}`);
      console.error('Error fetching table configuration:', err);
    } finally {
      setConfigLoading(false);
    }
  }, [user, tableIdentifier]);

  // Fetch configuration when component mounts or dependencies change
  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration, refreshKey]);

  // Initialize visible columns from configuration
  useEffect(() => {
    if (configuration && columns.length > 0) {
      const configColumns = configuration.configuration?.columns || [];
      const visible = new Set(
        columns
          .filter(column => {
            const configColumn = configColumns.find(c => c.key === column.column_key);
            return configColumn ? configColumn.visible : column.default_visible;
          })
          .map(column => column.column_key)
      );
      setVisibleColumns(visible);
    }
  }, [configuration, columns]);

  // Build DataGrid columns from configuration
  const gridColumns = useMemo((): GridColDef[] => {
    if (!columns.length || !configuration) return [];

    const configColumns = configuration.configuration?.columns || [];
    const visibleColumns = columns
      .filter(column => {
        const configColumn = configColumns.find(c => c.key === column.column_key);
        return configColumn ? configColumn.visible : column.default_visible;
      })
      .sort((a, b) => {
        const orderA = configColumns.find(c => c.key === a.column_key)?.order ?? 999;
        const orderB = configColumns.find(c => c.key === b.column_key)?.order ?? 999;
        return orderA - orderB;
      });

    return visibleColumns.map((column): GridColDef => {
      const configColumn = configColumns.find(c => c.key === column.column_key);
      const width = configColumn?.width || column.default_width || 150;

      const baseColumn: GridColDef = {
        field: column.column_key,
        headerName: column.column_label || column.display_name,
        width,
        sortable: column.is_sortable || column.sortable,
        filterable: column.is_filterable || column.filterable,
        hideable: !column.is_system_column,
        resizable: true,
      };

      // Add custom renderers based on column type
      switch (column.column_type) {
        case 'badge':
          return {
            ...baseColumn,
            renderCell: (params) => (
              <StatusBadge value={params.value} type={column.data_source} />
            ),
          };

        case 'user':
          return {
            ...baseColumn,
            renderCell: (params) => {
              const displayName = params.row[`${column.column_key}_display_name`] || 
                                 params.row[`${column.data_source}_name`];
              const avatar = params.row[`${column.column_key}_avatar`] || 
                           params.row[`${column.data_source}_avatar`];
              return (
                <UserRenderer 
                  value={params.value} 
                  displayName={displayName}
                  avatar={avatar}
                />
              );
            },
          };

        case 'team':
          return {
            ...baseColumn,
            renderCell: (params) => {
              const teamName = params.row[`${column.column_key}_name`] || 
                             params.row[`${column.data_source}_name`];
              return (
                <TeamRenderer value={params.value} teamName={teamName} />
              );
            },
          };

        case 'date':
          return {
            ...baseColumn,
            type: 'dateTime',
            renderCell: (params) => <DateRenderer value={params.value} />,
          };

        case 'number':
          return {
            ...baseColumn,
            type: 'number',
            align: 'right',
            headerAlign: 'right',
          };

        case 'custom':
          // For custom components, you could implement a component registry
          return {
            ...baseColumn,
            renderCell: (params) => (
              <Typography variant="body2" noWrap>
                {params.value}
              </Typography>
            ),
          };

        default: // text
          return {
            ...baseColumn,
            renderCell: (params) => (
              <Typography variant="body2" noWrap title={params.value}>
                {params.value}
              </Typography>
            ),
          };
      }
    });
  }, [columns, configuration]);

  // Handle configuration changes
  const handleConfigurationUpdate = useCallback((newConfig: Partial<TableConfiguration['configuration']>) => {
    if (!configuration) return;

    const updatedConfig = {
      ...configuration,
      configuration: {
        ...configuration.configuration,
        ...newConfig,
      },
    };

    setConfiguration(updatedConfig);
    onConfigurationChange?.(updatedConfig);
  }, [configuration, onConfigurationChange]);

  // Handle column visibility toggle
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    const newVisibleColumns = new Set(visibleColumns);
    if (visible) {
      newVisibleColumns.add(columnKey);
    } else {
      newVisibleColumns.delete(columnKey);
    }
    setVisibleColumns(newVisibleColumns);
    
    // Update configuration
    if (configuration) {
      const updatedColumns = columns.map((column, index) => ({
        key: column.column_key,
        visible: newVisibleColumns.has(column.column_key),
        width: 150,
        order: index
      }));
      
      handleConfigurationUpdate({
        columns: updatedColumns
      });
    }
  };

  // Handle quick filter
  const handleQuickFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuickFilterValue(value);
    
    if (value.trim()) {
      const filterItems = [{
        field: 'quickFilter',
        operator: 'contains',
        value: value.trim()
      }];
      setFilterModel({ items: filterItems, quickFilterValues: [value.trim()] });
    } else {
      setFilterModel({ items: [] });
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setQuickFilterValue('');
    setFilterModel({ items: [] });
    setActiveFilters([]);
    setAdvancedFilter(null);
  };

  // Export functionality
  const handleExport = (format: 'csv' | 'excel') => {
    // Implementation would depend on your export requirements
    console.log(`Exporting as ${format}`);
  };

  // Advanced filter handlers
  const handleAdvancedFilterChange = (filter: FilterGroup) => {
    setAdvancedFilter(filter);
  };

  const handleApplyAdvancedFilter = (filter: FilterGroup) => {
    const activeConditions = filter.conditions.filter(c => 
      c.enabled && c.column && (c.value !== '' || ['is_empty', 'is_not_empty'].includes(c.operator))
    );
    
    if (activeConditions.length > 0) {
      setActiveFilters(activeConditions.map(c => ({
        field: c.column,
        operator: c.operator,
        value: c.value
      })));
    } else {
      setActiveFilters([]);
    }
    
    setAdvancedFilter(filter);
  };

  // Process data with filters
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    // Apply quick filter
    if (quickFilterValue.trim()) {
      const searchTerm = quickFilterValue.toLowerCase();
      filtered = filtered.filter(row => 
        Object.values(row).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm)
        )
      );
    }
    
    // Apply advanced filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(row => {
        const logic = advancedFilter?.logic || 'AND';
        
        if (logic === 'AND') {
          return activeFilters.every(filter => evaluateFilter(row, filter));
        } else {
          return activeFilters.some(filter => evaluateFilter(row, filter));
        }
      });
    }
    
    return filtered;
  }, [data, quickFilterValue, activeFilters, advancedFilter]);

  // Evaluate individual filter condition
  const evaluateFilter = (row: any, filter: { field: string; operator: string; value: any }) => {
    const cellValue = row[filter.field];
    const filterValue = filter.value;
    
    switch (filter.operator) {
      case 'equals':
        return cellValue === filterValue;
      case 'not_equals':
        return cellValue !== filterValue;
      case 'contains':
        return cellValue && cellValue.toString().toLowerCase().includes(filterValue.toLowerCase());
      case 'not_contains':
        return !cellValue || !cellValue.toString().toLowerCase().includes(filterValue.toLowerCase());
      case 'starts_with':
        return cellValue && cellValue.toString().toLowerCase().startsWith(filterValue.toLowerCase());
      case 'ends_with':
        return cellValue && cellValue.toString().toLowerCase().endsWith(filterValue.toLowerCase());
      case 'is_empty':
        return !cellValue || cellValue === '';
      case 'is_not_empty':
        return cellValue && cellValue !== '';
      case 'greater_than':
        return parseFloat(cellValue) > parseFloat(filterValue);
      case 'less_than':
        return parseFloat(cellValue) < parseFloat(filterValue);
      case 'greater_than_equal':
        return parseFloat(cellValue) >= parseFloat(filterValue);
      case 'less_than_equal':
        return parseFloat(cellValue) <= parseFloat(filterValue);
      case 'between':
        const num = parseFloat(cellValue);
        return num >= parseFloat(filterValue.min) && num <= parseFloat(filterValue.max);
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(cellValue);
      case 'not_in':
        return !Array.isArray(filterValue) || !filterValue.includes(cellValue);
      case 'before':
        return new Date(cellValue) < new Date(filterValue);
      case 'after':
        return new Date(cellValue) > new Date(filterValue);
      default:
        return true;
    }
  };

  // Show loading state
  if (configLoading) {
    return (
      <Box className={cn("w-full", className)} sx={{ height }}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box className={cn("w-full", className)} sx={{ height }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading table configuration: {error}
        </Alert>
      </Box>
    );
  }

  // Show empty state if no columns
  if (!gridColumns.length) {
    return (
      <Box className={cn("w-full", className)} sx={{ height }}>
        <Alert severity="info">
          No table configuration found for &quot;{tableIdentifier}&quot;. Please configure table columns first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={cn("w-full", className)}>
      {/* Enhanced Toolbar */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 1, 
          borderRadius: 1,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          {/* Left side - Search and Filters */}
          <Stack direction="row" spacing={2} alignItems="center" flex={1}>
            {/* Quick Search */}
            <TextField
              size="small"
              placeholder={`Search ${tableIdentifier.replace('_', ' ')}...`}
              value={quickFilterValue}
              onChange={handleQuickFilterChange}
              InputProps={{
                startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} />,
                endAdornment: quickFilterValue && (
                  <IconButton size="small" onClick={handleClearFilters}>
                    <Clear fontSize="small" />
                  </IconButton>
                )
              }}
              sx={{ minWidth: 250 }}
            />
            
            {/* Advanced Filter Button */}
            <Button
              variant={showAdvancedFilter ? "contained" : "outlined"}
              startIcon={<Tune />}
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              size="small"
            >
              Advanced {activeFilters.length > 0 && `(${activeFilters.length})`}
            </Button>
            
            {/* Active Filter Chips */}
            {activeFilters.map((filter, index) => (
              <Chip
                key={index}
                label={`${filter.field}: ${filter.value}`}
                size="small"
                onDelete={() => {
                  const newFilters = activeFilters.filter((_, i) => i !== index);
                  setActiveFilters(newFilters);
                }}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
          
          {/* Right side - Actions */}
          <Stack direction="row" spacing={1}>
            {/* Column Visibility */}
            <Tooltip title="Show/Hide Columns">
              <IconButton
                size="small"
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              >
                <ViewColumn />
              </IconButton>
            </Tooltip>
            
            {/* Export */}
            <Tooltip title="Export Data">
              <IconButton size="small" onClick={() => handleExport('csv')}>
                <FileDownload />
              </IconButton>
            </Tooltip>
            
            {/* Refresh */}
            <Tooltip title="Refresh Data">
              <IconButton size="small" onClick={() => window.location.reload()}>
                <Refresh />
              </IconButton>
            </Tooltip>
            
            {/* Settings */}
            <Tooltip title="Table Settings">
              <IconButton size="small">
                <Settings />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>
      
      {/* Advanced Filter Builder */}
      <AnimatePresence>
        {showAdvancedFilter && columns.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <Box sx={{ mb: 2 }}>
              <FilterBuilder
                columns={columns.map(col => ({
                  column_key: col.column_key,
                  display_name: col.column_label || col.display_name,
                  column_type: col.column_type,
                  is_filterable: col.is_filterable || col.filterable || false
                }))}
                initialFilter={advancedFilter || undefined}
                onFilterChange={handleAdvancedFilterChange}
                onApplyFilter={handleApplyAdvancedFilter}
              />
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* DataGrid */}
      <Box sx={{ height: typeof height === 'number' ? height : height }}>
        {gridColumns.length > 0 ? (
          <DataGrid
            rows={filteredData || []}
            columns={gridColumns}
            pagination
            paginationMode="client"
            pageSize={paginationModel.pageSize}
            page={paginationModel.page}
            onPageChange={(newPage) => setPaginationModel(prev => ({ ...prev, page: newPage }))}
            onPageSizeChange={(newPageSize) => setPaginationModel(prev => ({ ...prev, pageSize: newPageSize }))}
            rowsPerPageOptions={[10, 25, 50, 100]}
            loading={loading}
            onRowClick={onRowClick}
            checkboxSelection={enableSelection}
            disableRowSelectionOnClick={!enableSelection}
            density="comfortable"
            autoHeight={false}
            getRowId={(row) => row.id || row.ticket_id || row.username || row.title || Math.random()}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '& .MuiDataGrid-cell': {
                borderColor: 'divider',
                py: 1,
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
              '& .MuiDataGrid-row:nth-of-type(even)': {
                backgroundColor: 'rgba(0, 0, 0, 0.01)',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                borderColor: 'divider',
                fontWeight: 600,
              },
              '& .MuiDataGrid-footerContainer': {
                borderColor: 'divider',
                backgroundColor: 'background.paper',
              },
            }}
          />
        ) : (
          <Alert severity="info">
            No columns configured for this table.
          </Alert>
        )}
      </Box>
      
      {/* Column Visibility Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        PaperProps={{
          sx: { maxHeight: 400, width: 250 }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Show/Hide Columns
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {columns.map((column) => (
            <MenuItem key={column.column_key} sx={{ py: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={visibleColumns.has(column.column_key)}
                    onChange={(e) => handleColumnVisibilityChange(column.column_key, e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {column.column_label || column.display_name}
                  </Typography>
                }
                sx={{ m: 0, width: '100%' }}
              />
            </MenuItem>
          ))}
        </Box>
      </Menu>
      
    </Box>
  );
};

export default ConfigurableDataTable;