'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DataGrid, GridColDef, GridRowParams, GridSortModel, GridFilterModel, GridPaginationModel, GridRowSelectionModel, GridCallbackDetails } from '@mui/x-data-grid';
import { Box, Typography, Alert, Skeleton, Chip, Avatar } from '@mui/material';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

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
      const tableColumns = columnsData.data?.grouped?.[tableIdentifier] || [];
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
      setError(errorMessage);
      console.error('Error fetching table configuration:', err);
    } finally {
      setConfigLoading(false);
    }
  }, [user, tableIdentifier]);

  // Fetch configuration when component mounts or dependencies change
  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration, refreshKey]);

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
        headerName: column.display_name,
        width,
        sortable: column.sortable,
        filterable: column.filterable,
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

  // Handle pagination change
  const handlePaginationChange = useCallback((model: GridPaginationModel) => {
    setPaginationModel(model);
    handleConfigurationUpdate({
      pagination: { pageSize: model.pageSize }
    });
  }, [handleConfigurationUpdate]);

  // Handle sort change
  const handleSortChange = useCallback((model: GridSortModel) => {
    setSortModel(model);
    handleConfigurationUpdate({
      sorting: [...model]
    });
  }, [handleConfigurationUpdate]);

  // Handle filter change
  const handleFilterChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
    handleConfigurationUpdate({
      filters: model
    });
  }, [handleConfigurationUpdate]);

  // Handle selection change
  const handleSelectionChange = useCallback((newSelection: GridRowSelectionModel, details: GridCallbackDetails) => {
    setSelectionModel(newSelection);
    onSelectionChange?.(newSelection);
  }, [onSelectionChange]);

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
    <Box className={cn("w-full", className)} sx={{ height }}>
      <DataGrid
        rows={data}
        columns={gridColumns}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationChange}
        sortModel={sortModel}
        onSortModelChange={handleSortChange}
        filterModel={filterModel}
        onFilterModelChange={handleFilterChange}
        loading={loading}
        onRowClick={onRowClick}
        checkboxSelection={enableSelection}
        rowSelectionModel={selectionModel}
        onRowSelectionModelChange={handleSelectionChange}
        disableRowSelectionOnClick={!enableSelection}
        pageSizeOptions={[10, 25, 50, 100]}
        density="compact"
        autoHeight={false}
        getRowId={(row) => row.id || row.ticket_id || row.username || JSON.stringify(row)}
        sx={{
          border: 1,
          borderColor: 'divider',
          '& .MuiDataGrid-cell': {
            borderColor: 'divider',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'action.hover',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'background.paper',
            borderColor: 'divider',
          },
        }}
        slotProps={{
          pagination: {
            showFirstButton: true,
            showLastButton: true,
          },
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        initialState={{
          pagination: {
            paginationModel,
          },
          sorting: {
            sortModel,
          },
          filter: {
            filterModel,
          },
        }}
      />
    </Box>
  );
};

export default ConfigurableDataTable;