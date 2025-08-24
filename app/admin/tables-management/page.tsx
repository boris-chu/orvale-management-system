'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// Use Material-UI for Dialog + Select compatibility (avoid focus management issues)
import { 
  Dialog, 
  DialogTitle, 
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography
} from '@mui/material';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Table as TableIcon,
  Columns,
  Save,
  RefreshCw,
  Users,
  Share2,
  LogOut,
  User,
  Play,
  Database,
  ArrowLeft
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { ConfigurableDataTableDemo } from '@/components/ConfigurableDataTableDemo';
import { DragDropColumnManager } from '@/components/DragDropColumnManager';
import { ColumnEditorDialog } from '@/components/ColumnEditorDialog';
import { RowEditorDialog } from '@/components/RowEditorDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types
interface ColumnConfig {
  visible_columns?: string[];
  column_widths?: Record<string, number>;
  column_order?: string[];
}

interface FilterConfig {
  filters?: Array<{
    column: string;
    operator: string;
    value: string | number | boolean;
  }>;
  search?: string;
}

interface SortConfig {
  column?: string;
  direction?: 'asc' | 'desc';
}

interface DisplayConfig {
  page_size?: number;
  show_search?: boolean;
  show_filters?: boolean;
  compact_mode?: boolean;
}

interface TableConfiguration {
  id: number;
  table_identifier: string;
  configuration_name: string;
  description: string;
  column_config: ColumnConfig;
  filter_config: FilterConfig;
  sort_config: SortConfig;
  display_config: DisplayConfig;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

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

interface ViewConfiguration {
  columns?: string[];
  filters?: FilterConfig;
  sort?: SortConfig;
  display?: DisplayConfig;
}

interface SavedView {
  id: number;
  view_name: string;
  table_identifier: string;
  view_type: 'personal' | 'team' | 'public';
  configuration: ViewConfiguration;
  created_by: string;
  created_at: string;
}

export default function TablesManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  // State
  const [configurations, setConfigurations] = useState<TableConfiguration[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>('tickets_queue');
  
  // Dialog states
  const [createConfigOpen, setCreateConfigOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<TableConfiguration | null>(null);
  const [selectedTableForColumns, setSelectedTableForColumns] = useState<string>('tickets_queue');
  
  // Form states
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');
  
  // User menu states
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Table browser states
  const [selectedBrowserTable, setSelectedBrowserTable] = useState<string>('user_tickets');
  const [availableTables] = useState([
    { name: 'user_tickets', label: 'User Tickets', description: 'All ticket records with details' },
    { name: 'users', label: 'Users', description: 'System users and authentication' },
    { name: 'roles', label: 'Roles', description: 'User roles and permissions' },
    { name: 'teams', label: 'Teams', description: 'Internal teams for ticket processing' },
    { name: 'support_teams', label: 'Support Teams', description: 'Public portal team options' },
    { name: 'ticket_categories', label: 'Ticket Categories', description: 'Main ticket categories' },
    { name: 'request_types', label: 'Request Types', description: 'Types for each category' },
    { name: 'subcategories', label: 'Subcategories', description: 'Detailed subcategories' },
    { name: 'dpss_offices', label: 'DPSS Offices', description: 'Top-level office structure' },
    { name: 'dpss_bureaus', label: 'DPSS Bureaus', description: 'Bureau organizational level' },
    { name: 'dpss_divisions', label: 'DPSS Divisions', description: 'Division organizational level' },
    { name: 'dpss_sections', label: 'DPSS Sections', description: 'Section organizational level' },
    { name: 'portal_settings', label: 'Portal Settings', description: 'Public portal configuration' },
    { name: 'system_settings', label: 'System Settings', description: 'System-wide settings' }
  ]);

  // Table Editor states
  const [selectedEditorTable, setSelectedEditorTable] = useState<string>('user_tickets');
  const [editorColumns, setEditorColumns] = useState<ColumnDefinition[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnDefinition | null>(null);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ open: boolean; columnId?: string; columnName?: string }>({ open: false });
  const [showDeleteRowConfirm, setShowDeleteRowConfirm] = useState<{ open: boolean; rowId?: string | number; rowLabel?: string }>({ open: false });
  
  // Available tables for editor (actual database tables)
  const [editorTables] = useState([
    { name: 'user_tickets', label: 'User Tickets', description: 'Main ticket records from the system', table_id: 'tickets_queue' },
    { name: 'users', label: 'Users', description: 'System users and authentication data', table_id: 'users_list' },
    { name: 'teams', label: 'Teams', description: 'Internal teams for ticket processing', table_id: 'teams_list' },
    { name: 'support_teams', label: 'Support Teams', description: 'Public portal team options', table_id: 'support_teams' },
    { name: 'ticket_categories', label: 'Ticket Categories', description: 'Main ticket categories', table_id: 'categories_list' },
    { name: 'dpss_offices', label: 'DPSS Offices', description: 'Top-level office structure', table_id: 'offices_list' },
    { name: 'portal_settings', label: 'Portal Settings', description: 'Public portal configuration', table_id: 'portal_config' },
    { name: 'system_settings', label: 'System Settings', description: 'System-wide settings', table_id: 'system_config' }
  ]);
  
  // Table data for editor
  type TableRowData = Record<string, string | number | boolean | null>;
  const [editorTableData, setEditorTableData] = useState<TableRowData[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string | number; field: string; value: string | number | boolean | null } | null>(null);
  const [editingRow, setEditingRow] = useState<TableRowData | null>(null);
  const [showRowEditor, setShowRowEditor] = useState(false);

  // Check permissions with debugging
  console.log('🔍 Tables Management Debug:', {
    user: user,
    role: user?.role,
    permissionsCount: user?.permissions?.length,
    hasTablesViewConfig: user?.permissions?.includes('tables.view_config'),
    firstFewPermissions: user?.permissions?.slice(0, 5)
  });
  
  // SECURITY: Only rely on database permissions - no role-based fallbacks
  const hasViewPermission = user?.permissions?.includes('tables.view_config');
  const hasManagePermission = user?.permissions?.includes('tables.manage_columns');
  const hasCreatePermission = user?.permissions?.includes('tables.create_views');
  
  console.log('🔍 Permission Check Results:', {
    hasViewPermission,
    hasManagePermission,
    hasCreatePermission
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get auth token for API calls
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Load configurations
      const configResponse = await fetch('/api/admin/tables-configs', { headers });
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfigurations(configData.configurations || []);
      }

      // Load column definitions
      const columnsResponse = await fetch('/api/admin/tables-columns', { headers });
      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json();
        setColumnDefinitions(columnsData.columns || []);
      }

      // Load saved views
      const viewsResponse = await fetch('/api/admin/tables-views', { headers });
      if (viewsResponse.ok) {
        const viewsData = await viewsResponse.json();
        setSavedViews(viewsData.views || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tables management data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (hasViewPermission) {
      loadData();
    }
  }, [hasViewPermission, loadData]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleCreateConfiguration = async () => {
    if (!newConfigName.trim()) {
      toast({
        title: 'Error',
        description: 'Configuration name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/tables-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_identifier: selectedTable,
          configuration_name: newConfigName,
          description: newConfigDescription,
          column_config: {
            visible_columns: [],
            column_order: [],
            column_widths: {}
          },
          filter_config: {},
          sort_config: {},
          display_config: {
            row_height: 'medium',
            show_borders: true,
            striped_rows: false
          }
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration created successfully',
        });
        setCreateConfigOpen(false);
        setNewConfigName('');
        setNewConfigDescription('');
        loadData();
      } else {
        throw new Error('Failed to create configuration');
      }
    } catch (error) {
      console.error('Error creating configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to create configuration',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfiguration = async (configId: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tables-configs/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Configuration deleted successfully',
        });
        loadData();
      } else {
        throw new Error('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete configuration',
        variant: 'destructive',
      });
    }
  };

  const getTableTypeLabel = (identifier: string) => {
    switch (identifier) {
      case 'tickets_queue': return 'Tickets Queue';
      case 'users_list': return 'Users Management';
      case 'helpdesk_queue': return 'Helpdesk Queue';
      case 'public_portal': return 'Public Portal';
      case 'support_teams': return 'Support Teams';
      case 'support_team_groups': return 'Support Team Groups';
      default: return identifier;
    }
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

  // Table Editor Functions
  const loadEditorColumns = useCallback(async (tableIdentifier: string) => {
    try {
      setEditorLoading(true);
      console.log('🔍 Loading editor data for table:', tableIdentifier);
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Load actual table data instead of column definitions
      const response = await fetch(`/api/admin/table-data?table=${tableIdentifier}&limit=25`, {
        headers,
      });

      console.log('🔍 API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 API Error response:', errorText);
        throw new Error(`Failed to fetch table data: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('🔍 API Response data:', data);
      
      const tableData = data.data?.rows || [];
      const columnInfo = data.data?.columns || [];
      
      console.log('🔍 Extracted data for', tableIdentifier, ':', tableData.length, 'rows');
      
      // Convert column info to our format
      interface RawColumnInfo {
        name: string;
        type: string;
        pk: boolean;
      }
      const columns = columnInfo.map((col: RawColumnInfo, index: number) => ({
        id: `${tableIdentifier}_${col.name}`,
        table_identifier: tableIdentifier,
        column_key: col.name,
        column_label: col.name.charAt(0).toUpperCase() + col.name.slice(1).replace(/_/g, ' '),
        column_type: col.type.toLowerCase().includes('int') ? 'number' : 
                    col.type.toLowerCase().includes('date') || col.type.toLowerCase().includes('time') ? 'date' :
                    col.name.includes('status') || col.name.includes('priority') ? 'badge' :
                    col.name.includes('user') || col.name.includes('assigned') ? 'user' :
                    col.name.includes('team') ? 'team' : 'text',
        is_sortable: true,
        is_filterable: !col.pk,
        default_visible: true,
        display_order: index
      }));
      
      setEditorColumns(columns);
      setEditorTableData(tableData);
      
      toast({
        title: 'Success',
        description: `Loaded ${tableData.length} rows and ${columns.length} columns for ${tableIdentifier}`,
      });
      
    } catch (error) {
      console.error('🔍 Error loading editor data:', error);
      toast({
        title: 'Error',
        description: `Failed to load table data for editing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setEditorLoading(false);
    }
  }, [toast]);

  const handleSaveColumn = async (columnData: Partial<ColumnDefinition>) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response;
      if (editingColumn) {
        // Update existing column
        response = await fetch(`/api/admin/tables-columns/${editingColumn.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            ...columnData,
            table_identifier: selectedEditorTable,
          }),
        });
      } else {
        // Create new column
        response = await fetch('/api/admin/tables-columns', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...columnData,
            table_identifier: selectedEditorTable,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to save column: ${response.statusText}`);
      }

      toast({
        title: 'Success',
        description: editingColumn ? 'Column updated successfully' : 'Column created successfully',
      });

      // Reload columns
      loadEditorColumns(selectedEditorTable);
      setEditingColumn(null);
      setShowAddColumnDialog(false);
      
    } catch (error) {
      console.error('Error saving column:', error);
      toast({
        title: 'Error',
        description: 'Failed to save column',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/tables-columns/${columnId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete column: ${response.statusText}`);
      }

      toast({
        title: 'Success',
        description: 'Column deleted successfully',
      });

      // Reload columns
      loadEditorColumns(selectedEditorTable);
      setShowDeleteConfirm({ open: false });
      
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete column',
        variant: 'destructive',
      });
    }
  };

  // Handle cell edit
  const handleCellEdit = async (rowId: string | number, field: string, newValue: string | number | boolean | null) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/table-data', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          table: selectedEditorTable,
          rowId,
          field,
          value: newValue,
          primaryKey: 'id'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update cell: ${response.statusText}`);
      }

      // Update local data
      const updatedData = editorTableData.map(row => 
        row.id === rowId ? { ...row, [field]: newValue } : row
      );
      setEditorTableData(updatedData);

      toast({
        title: 'Success',
        description: `Updated ${field} successfully`,
      });

    } catch (error) {
      console.error('Error updating cell:', error);
      toast({
        title: 'Error',
        description: 'Failed to update cell value',
        variant: 'destructive',
      });
    }
  };

  // Handle full row save
  const handleRowSave = async (rowData: TableRowData) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const isNewRow = typeof rowData.id === 'string' && rowData.id.startsWith('new_');

      if (isNewRow) {
        // Create new row
        const response = await fetch('/api/admin/table-data', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            table: selectedEditorTable,
            rowData
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create row: ${response.statusText}`);
        }

        // Reload table data to get the new row with proper ID
        await loadEditorColumns(selectedEditorTable);
        
        toast({
          title: 'Success',
          description: 'New row created successfully',
        });
        
      } else {
        // Update existing row - multiple fields at once
        const promises = Object.entries(rowData)
          .filter(([field, value]) => editingRow && editingRow[field] !== value)
          .map(([field, value]) => 
            fetch('/api/admin/table-data', {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                table: selectedEditorTable,
                rowId: rowData.id || rowData.ID,
                field,
                value,
                primaryKey: 'id'
              }),
            })
          );

        await Promise.all(promises);

        // Update local data with all changes
        const updatedData = editorTableData.map(row => 
          row.id === rowData.id || row.ID === rowData.id ? { ...row, ...rowData } : row
        );
        setEditorTableData(updatedData);
        
        toast({
          title: 'Success',
          description: 'Row updated successfully',
        });
      }

    } catch (error) {
      console.error('Error saving row:', error);
      throw error; // Re-throw for the dialog to handle
    }
  };

  // Handle row deletion
  const handleDeleteRow = async (rowId: string | number) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/admin/table-data', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          table: selectedEditorTable,
          rowId,
          primaryKey: 'id'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete row: ${response.statusText}`);
      }

      // Remove row from local data
      const updatedData = editorTableData.filter(row => 
        (row.id || row.ID) !== rowId
      );
      setEditorTableData(updatedData);

      toast({
        title: 'Success',
        description: 'Row deleted successfully',
      });

      setShowDeleteRowConfirm({ open: false });

    } catch (error) {
      console.error('Error deleting row:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete row',
        variant: 'destructive',
      });
    }
  };

  // Load editor columns when selected table changes
  useEffect(() => {
    if (selectedEditorTable && hasManagePermission) {
      loadEditorColumns(selectedEditorTable);
    }
  }, [selectedEditorTable, hasManagePermission, loadEditorColumns]);

  // SECURITY: Pure permission-based access control - no overrides
  if (!hasViewPermission) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-500">
                You don&apos;t have permission to view tables management.
              </p>
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-left">
                <strong>Debug Info:</strong><br/>
                Role: {user?.role || 'none'}<br/>
                Username: {user?.username || 'none'}<br/>
                Permissions count: {user?.permissions?.length || 0}<br/>
                Has tables.view_config: {user?.permissions?.includes('tables.view_config') ? 'Yes' : 'No'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/developer')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
          
          <div className="h-6 border-l border-gray-300"></div>
          
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tables Management</h1>
              <p className="text-sm text-gray-500">Configure and customize data tables across the system</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {hasManagePermission && (
            <Button
              variant="outline"
              onClick={() => setColumnManagerOpen(true)}
            >
              <Columns className="h-4 w-4 mr-2" />
              Manage Columns
            </Button>
          )}
          
          {hasCreatePermission && (
            <>
              <Button onClick={() => setCreateConfigOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Configuration
              </Button>
              <Dialog open={createConfigOpen} onClose={() => setCreateConfigOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Table Configuration</DialogTitle>
                <DialogContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Create a new table layout configuration
                  </Typography>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="table-select">Table</Label>
                    <FormControl fullWidth size="small">
                      <InputLabel>Table</InputLabel>
                      <Select 
                        value={selectedTable} 
                        onChange={(e) => setSelectedTable(e.target.value)}
                        label="Table"
                      >
                        <MenuItem value="tickets_queue">Tickets Queue</MenuItem>
                        <MenuItem value="users_list">Users Management</MenuItem>
                        <MenuItem value="helpdesk_queue">Helpdesk Queue</MenuItem>
                        <MenuItem value="public_portal">Public Portal</MenuItem>
                        <MenuItem value="support_teams">Support Teams</MenuItem>
                        <MenuItem value="support_team_groups">Support Team Groups</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="config-name">Configuration Name</Label>
                    <Input
                      id="config-name"
                      value={newConfigName}
                      onChange={(e) => setNewConfigName(e.target.value)}
                      placeholder="Enter configuration name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="config-description">Description</Label>
                    <Textarea
                      id="config-description"
                      value={newConfigDescription}
                      onChange={(e) => setNewConfigDescription(e.target.value)}
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>
                </div>
                </DialogContent>
                <DialogActions>
                  <Button variant="outline" onClick={() => setCreateConfigOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateConfiguration}>
                    Create Configuration
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserMenu(!showUserMenu);
                    }}
                    className="flex items-center space-x-2 rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <UserAvatar 
                      user={user || { display_name: 'Unknown', username: 'unknown', email: 'unknown' }}
                      size="md"
                      showOnlineIndicator={true}
                      className="border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>User Menu</p>
                </TooltipContent>
              </Tooltip>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center space-x-3">
                        <UserAvatar 
                          user={user || { display_name: 'Unknown', username: 'unknown', email: 'unknown' }}
                          size="lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user?.display_name}</p>
                          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user?.role || 'User'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-150"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Edit Profile</span>
                      </button>
                      
                      <hr className="my-1 border-gray-100" />
                      
                      <button
                        onClick={() => {
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('currentUser');
                          window.location.href = '/';
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors duration-150"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TooltipProvider>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="configurations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1">
          <TabsTrigger value="configurations" className="flex items-center gap-2 px-3 py-2 text-sm">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Configurations</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="columns" className="flex items-center gap-2 px-3 py-2 text-sm">
            <Columns className="h-4 w-4" />
            <span className="hidden sm:inline">Column Definitions</span>
            <span className="sm:hidden">Columns</span>
          </TabsTrigger>
          <TabsTrigger value="browser" className="flex items-center gap-2 px-3 py-2 text-sm">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Table Browser</span>
            <span className="sm:hidden">Browser</span>
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2 px-3 py-2 text-sm">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Saved Views</span>
            <span className="sm:hidden">Views</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2 px-3 py-2 text-sm">
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Table Editor</span>
            <span className="sm:hidden">Editor</span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2 px-3 py-2 text-sm">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Live Demo</span>
            <span className="sm:hidden">Demo</span>
          </TabsTrigger>
        </TabsList>

        {/* Configurations Tab */}
        <TabsContent value="configurations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Table Configurations</CardTitle>
              <CardDescription>
                Manage visual layouts and settings for system tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Loading configurations...</p>
                </div>
              ) : configurations.length === 0 ? (
                <div className="text-center py-8">
                  <TableIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Configurations</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first table configuration to get started.
                  </p>
                  {hasCreatePermission && (
                    <Button onClick={() => setCreateConfigOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Configuration
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configurations.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.configuration_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTableTypeLabel(config.table_identifier)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {config.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          {config.is_default ? (
                            <Badge>Default</Badge>
                          ) : (
                            <Badge variant="secondary">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(config.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedConfig(config);
                                setPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasManagePermission && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConfig(config);
                                    setPreviewOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteConfiguration(config.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Column Definitions Tab */}
        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Column Definitions</CardTitle>
              <CardDescription>
                Available columns for each table type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {columnDefinitions.length === 0 ? (
                <div className="text-center py-8">
                  <Columns className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Column Definitions</h3>
                  <p className="text-gray-500">
                    Column definitions will appear here once loaded.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {['tickets_queue', 'users_list', 'helpdesk_queue', 'public_portal', 'support_teams', 'support_team_groups'].map((tableId) => {
                    const tableColumns = columnDefinitions.filter(
                      col => col.table_identifier === tableId
                    );
                    
                    if (tableColumns.length === 0) return null;

                    return (
                      <div key={tableId}>
                        <h4 className="text-lg font-semibold mb-3">
                          {getTableTypeLabel(tableId)} ({tableColumns.length} columns)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tableColumns.map((column) => (
                            <Card key={column.id} className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {getColumnTypeIcon(column.column_type)}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {column.column_label}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {column.column_type}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                Key: {column.column_key}
                              </div>
                              <div className="flex gap-2">
                                {column.is_sortable && (
                                  <Badge variant="secondary" className="text-xs">
                                    Sortable
                                  </Badge>
                                )}
                                {column.is_filterable && (
                                  <Badge variant="secondary" className="text-xs">
                                    Filterable
                                  </Badge>
                                )}
                                {column.default_visible && (
                                  <Badge variant="default" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Browser Tab */}
        <TabsContent value="browser" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Table Browser</CardTitle>
              <CardDescription>
                Explore database tables and their column structures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
                {/* Left Panel - Table List */}
                <div className="lg:col-span-1">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Database Tables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-1">
                        {availableTables.map((table) => (
                          <motion.div
                            key={table.name}
                            whileHover={{ x: 2 }}
                            className={`cursor-pointer p-3 mx-3 rounded-lg border transition-all duration-200 ${
                              selectedBrowserTable === table.name
                                ? 'bg-blue-50 border-blue-200 shadow-sm'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedBrowserTable(table.name)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-medium truncate ${
                                  selectedBrowserTable === table.name ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  {table.label}
                                </h4>
                                <p className={`text-xs mt-1 ${
                                  selectedBrowserTable === table.name ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                  {table.description}
                                </p>
                                <div className="flex items-center mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {table.name}
                                  </Badge>
                                </div>
                              </div>
                              {selectedBrowserTable === table.name && (
                                <div className="ml-2 flex-shrink-0">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Table Details */}
                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <TableIcon className="h-4 w-4" />
                          {availableTables.find(t => t.name === selectedBrowserTable)?.label || selectedBrowserTable}
                        </CardTitle>
                        <Badge variant="default" className="text-xs">
                          {selectedBrowserTable}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {availableTables.find(t => t.name === selectedBrowserTable)?.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Column Information */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Column Structure</h3>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Refresh
                          </Button>
                        </div>
                        
                        {/* Columns Display */}
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="text-xs font-semibold">Column Name</TableHead>
                                <TableHead className="text-xs font-semibold">Type</TableHead>
                                <TableHead className="text-xs font-semibold">Properties</TableHead>
                                <TableHead className="text-xs font-semibold">Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Show columns from columnDefinitions for the selected table */}
                              {columnDefinitions
                                .filter(col => {
                                  // Map our column definitions to actual table names
                                  const tableMapping: { [key: string]: string[] } = {
                                    'user_tickets': ['tickets_queue'],
                                    'users': ['users_list'],
                                    'teams': ['helpdesk_queue'],
                                    'support_teams': ['support_teams'],
                                    'support_team_groups': ['support_team_groups'],
                                    'portal_settings': ['public_portal']
                                  };
                                  const mappedTables = tableMapping[selectedBrowserTable] || [selectedBrowserTable];
                                  return mappedTables.some(table => col.table_identifier === table);
                                })
                                .slice(0, 10) // Show first 10 columns
                                .map((column, index) => (
                                  <TableRow key={index} className="hover:bg-gray-50">
                                    <TableCell className="text-sm font-medium">
                                      {column.column_label || column.column_key}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">
                                        {column.column_type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1 flex-wrap">
                                        {column.is_sortable && <Badge variant="secondary" className="text-xs">Sortable</Badge>}
                                        {column.is_filterable && <Badge variant="secondary" className="text-xs">Filterable</Badge>}
                                        {column.default_visible && <Badge variant="default" className="text-xs">Visible</Badge>}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-600">
                                      {column.column_key}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              
                              {/* Show placeholder if no columns found */}
                              {columnDefinitions.filter(col => {
                                const tableMapping: { [key: string]: string[] } = {
                                  'user_tickets': ['tickets_queue'],
                                  'users': ['users_list'],
                                  'teams': ['helpdesk_queue'],
                                  'support_teams': ['support_teams'],
                                  'support_team_groups': ['support_team_groups'],
                                  'portal_settings': ['public_portal']
                                };
                                const mappedTables = tableMapping[selectedBrowserTable] || [selectedBrowserTable];
                                return mappedTables.some(table => col.table_identifier === table);
                              }).length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-8">
                                    <Database className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">
                                      No column definitions found for this table.
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      This may be a system table not configured for display.
                                    </p>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Table Statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                          <Card className="p-3">
                            <div className="text-xs text-gray-600">Table Type</div>
                            <div className="text-sm font-semibold mt-1">
                              {selectedBrowserTable.includes('dpss') ? 'Organization' :
                               selectedBrowserTable.includes('ticket') ? 'Tickets' :
                               selectedBrowserTable.includes('user') || selectedBrowserTable.includes('team') ? 'Users & Teams' :
                               selectedBrowserTable.includes('setting') ? 'Configuration' : 'System'}
                            </div>
                          </Card>
                          <Card className="p-3">
                            <div className="text-xs text-gray-600">Columns</div>
                            <div className="text-sm font-semibold mt-1">
                              {columnDefinitions.filter(col => {
                                const tableMapping: { [key: string]: string[] } = {
                                  'user_tickets': ['tickets_queue'],
                                  'users': ['users_list'],
                                  'teams': ['helpdesk_queue'],
                                  'support_teams': ['support_teams'],
                                  'support_team_groups': ['support_team_groups'],
                                  'portal_settings': ['public_portal']
                                };
                                const mappedTables = tableMapping[selectedBrowserTable] || [selectedBrowserTable];
                                return mappedTables.some(table => col.table_identifier === table);
                              }).length}
                            </div>
                          </Card>
                          <Card className="p-3">
                            <div className="text-xs text-gray-600">Filterable</div>
                            <div className="text-sm font-semibold mt-1">
                              {columnDefinitions.filter(col => {
                                const tableMapping: { [key: string]: string[] } = {
                                  'user_tickets': ['tickets_queue'],
                                  'users': ['users_list'],
                                  'teams': ['helpdesk_queue'],
                                  'support_teams': ['support_teams'],
                                  'support_team_groups': ['support_team_groups'],
                                  'portal_settings': ['public_portal']
                                };
                                const mappedTables = tableMapping[selectedBrowserTable] || [selectedBrowserTable];
                                return mappedTables.some(table => col.table_identifier === table) && col.is_filterable;
                              }).length}
                            </div>
                          </Card>
                          <Card className="p-3">
                            <div className="text-xs text-gray-600">Default Visible</div>
                            <div className="text-sm font-semibold mt-1">
                              {columnDefinitions.filter(col => {
                                const tableMapping: { [key: string]: string[] } = {
                                  'user_tickets': ['tickets_queue'],
                                  'users': ['users_list'],
                                  'teams': ['helpdesk_queue'],
                                  'support_teams': ['support_teams'],
                                  'support_team_groups': ['support_team_groups'],
                                  'portal_settings': ['public_portal']
                                };
                                const mappedTables = tableMapping[selectedBrowserTable] || [selectedBrowserTable];
                                return mappedTables.some(table => col.table_identifier === table) && col.default_visible;
                              }).length}
                            </div>
                          </Card>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Views Tab */}
        <TabsContent value="views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Views</CardTitle>
              <CardDescription>
                Personal, team, and public saved table views
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedViews.length === 0 ? (
                <div className="text-center py-8">
                  <Save className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Views</h3>
                  <p className="text-gray-500">
                    Saved views will appear here when users create them.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>View Name</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedViews.map((view) => (
                      <TableRow key={view.id}>
                        <TableCell className="font-medium">
                          {view.view_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTableTypeLabel(view.table_identifier)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              view.view_type === 'public' ? 'default' :
                              view.view_type === 'team' ? 'secondary' : 'outline'
                            }
                          >
                            {view.view_type === 'public' && <Share2 className="h-3 w-3 mr-1" />}
                            {view.view_type === 'team' && <Users className="h-3 w-3 mr-1" />}
                            {view.view_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{view.created_by}</TableCell>
                        <TableCell>
                          {new Date(view.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Table Column Editor
              </CardTitle>
              <CardDescription>
                Edit table column definitions with live data from the system database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasManagePermission ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Panel - Table Selection */}
                  <div className="lg:col-span-1">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Select Table to Edit</Label>
                        <div className="space-y-2 mt-2">
                          {editorTables.map((table) => (
                            <motion.div
                              key={table.name}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                selectedEditorTable === table.name 
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800' 
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
                              }`}
                              onClick={() => setSelectedEditorTable(table.name)}
                            >
                              <div className="flex items-center gap-3">
                                <Database className={`h-4 w-4 ${
                                  selectedEditorTable === table.name ? 'text-blue-600' : 'text-gray-500'
                                }`} />
                                <div className="flex-1">
                                  <div className={`font-medium text-sm ${
                                    selectedEditorTable === table.name ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                                  }`}>
                                    {table.label}
                                  </div>
                                  <div className={`text-xs ${
                                    selectedEditorTable === table.name ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {table.description}
                                  </div>
                                </div>
                                {selectedEditorTable === table.name && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right Panel - Live Table Data */}
                  <div className="lg:col-span-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">
                            Data in {editorTables.find(t => t.name === selectedEditorTable)?.label}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {editorTableData.length} record{editorTableData.length !== 1 ? 's' : ''} • {editorColumns.length} column{editorColumns.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              // Create a new empty row for editing
                              const newRow = editorColumns.reduce((acc, col) => {
                                acc[col.column_key] = col.column_type === 'date' ? new Date().toISOString() : '';
                                return acc;
                              }, {} as TableRowData);
                              newRow.id = `new_${Date.now()}`;
                              setEditingRow(newRow);
                              setShowRowEditor(true);
                            }}
                            disabled={editorLoading}
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Row
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowAddColumnDialog(true)}
                            disabled={editorLoading}
                            size="sm"
                          >
                            <Columns className="h-4 w-4 mr-2" />
                            Add Column
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => loadEditorColumns(selectedEditorTable)}
                            disabled={editorLoading}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${editorLoading ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                      </div>

                      {editorLoading ? (
                        <div className="space-y-3">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                          ))}
                        </div>
                      ) : editorTableData.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          {editorColumns.length > 8 && (
                            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                              <span>📱</span>
                              Showing all {editorColumns.length} columns • Scroll horizontally to view more →
                            </div>
                          )}
                          <div className="overflow-x-auto max-h-[600px]">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-800">
                                  {editorColumns.map((column) => ( // Show all columns
                                    <TableHead key={column.column_key} className="font-semibold min-w-32 max-w-64">
                                      <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs">{getColumnTypeIcon(column.column_type)}</span>
                                          {column.column_label}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm"
                                                  className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingColumn(column);
                                                  }}
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Edit Column</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm"
                                                  className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm({
                                                      open: true,
                                                      columnId: column.id?.toString(),
                                                      columnName: column.column_label
                                                    });
                                                  }}
                                                >
                                                  <Trash2 className="h-3 w-3 text-red-600" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Delete Column</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </div>
                                    </TableHead>
                                  ))}
                                  <TableHead className="w-20">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {editorTableData.slice(0, 50).map((row, index) => (
                                  <TableRow key={row.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    {editorColumns.map((column) => (
                                      <TableCell key={column.column_key} className="min-w-32 max-w-64">
                                        <div className="truncate">
                                          {editingCell?.rowId === row.id && editingCell?.field === column.column_key ? (
                                            <Input
                                              value={editingCell.value}
                                              onChange={(e) => setEditingCell({
                                                ...editingCell,
                                                value: e.target.value
                                              })}
                                              onBlur={() => {
                                                handleCellEdit(row.id, column.column_key, editingCell.value);
                                                setEditingCell(null);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  handleCellEdit(row.id, column.column_key, editingCell.value);
                                                  setEditingCell(null);
                                                } else if (e.key === 'Escape') {
                                                  setEditingCell(null);
                                                }
                                              }}
                                              className="h-8"
                                              autoFocus
                                            />
                                          ) : (
                                            <div
                                              onClick={() => setEditingCell({
                                                rowId: row.id,
                                                field: column.column_key,
                                                value: row[column.column_key] || ''
                                              })}
                                              className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded px-2 py-1 min-h-6"
                                            >
                                              {column.column_type === 'date' && row[column.column_key] ? (
                                                new Date(row[column.column_key]).toLocaleDateString()
                                              ) : column.column_type === 'badge' ? (
                                                <Badge variant="outline" className="text-xs">
                                                  {row[column.column_key] || 'N/A'}
                                                </Badge>
                                              ) : (
                                                row[column.column_key]?.toString() || <span className="text-gray-400">NULL</span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                    ))}
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                  setEditingRow(row);
                                                  setShowRowEditor(true);
                                                }}
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Edit Row</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                  setShowDeleteRowConfirm({
                                                    open: true,
                                                    rowId: row.id || row.ID,
                                                    rowLabel: row.title || row.name || row.username || `Row ${row.id || row.ID}`
                                                  });
                                                }}
                                                className="hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
                                              >
                                                <Trash2 className="h-3 w-3 text-red-600" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Delete Row</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          {editorTableData.length > 50 && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t text-center text-sm text-gray-600 dark:text-gray-400">
                              Showing first 50 of {editorTableData.length} records
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No data found in this table</p>
                          <p className="text-sm">The table may be empty or you may need appropriate permissions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Insufficient Permissions
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You need &apos;tables.manage_columns&apos; permission to edit table columns.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Demo Tab */}
        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ConfigurableDataTable Live Demo</CardTitle>
              <CardDescription>
                Interactive demonstration of the configurable data table component with sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigurableDataTableDemo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Configuration Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedConfig?.configuration_name} - {getTableTypeLabel(selectedConfig?.table_identifier || '')}
          </Typography>
          <div className="py-4">
            {selectedConfig && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Description:</strong> {selectedConfig.description || 'No description'}
                  </div>
                  <div>
                    <strong>Created:</strong> {new Date(selectedConfig.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-2">Configuration Details</h4>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                    {JSON.stringify({
                      column_config: selectedConfig.column_config,
                      filter_config: selectedConfig.filter_config,
                      sort_config: selectedConfig.sort_config,
                      display_config: selectedConfig.display_config
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={user}
        onProfileUpdate={(updatedUser) => {
          // Update the AuthContext user data
          if (updatedUser) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            // You might want to update the AuthContext state here too
            window.location.reload(); // Simple refresh to update user data
          }
        }}
      />

      {/* Column Manager Modal */}
      <Dialog open={columnManagerOpen} onClose={() => setColumnManagerOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Columns className="h-5 w-5" />
          Column Manager
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure column layout for {getTableTypeLabel(selectedTableForColumns)}
          </Typography>
          
          {/* Table Selector */}
          <div className="mb-4">
            <Label htmlFor="table-selector" className="text-sm font-medium mb-2 block">
              Select Table Type:
            </Label>
            <FormControl size="small" sx={{ minWidth: 256 }}>
              <InputLabel>Select Table Type</InputLabel>
              <Select 
                value={selectedTableForColumns} 
                onChange={(e) => setSelectedTableForColumns(e.target.value)}
                label="Select Table Type"
              >
                <MenuItem value="tickets_queue">Tickets Queue</MenuItem>
                <MenuItem value="users_list">Users Management</MenuItem>
                <MenuItem value="helpdesk_queue">Helpdesk Queue</MenuItem>
                <MenuItem value="public_portal">Public Portal</MenuItem>
                <MenuItem value="support_teams">Support Teams</MenuItem>
                <MenuItem value="support_team_groups">Support Team Groups</MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Column Manager */}
          <div className="flex-1 overflow-hidden">
            <DragDropColumnManager
              tableIdentifier={selectedTableForColumns}
              onConfigurationChange={(columnConfig) => {
                console.log('Column configuration changed:', columnConfig);
              }}
              onSave={async (configuration) => {
                try {
                  const token = localStorage.getItem('authToken');
                  const response = await fetch('/api/admin/tables-configs', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      table_identifier: selectedTableForColumns,
                      configuration_name: `Custom ${getTableTypeLabel(selectedTableForColumns)} Layout`,
                      description: `Custom column configuration for ${getTableTypeLabel(selectedTableForColumns)}`,
                      column_config: configuration.columns,
                      filter_config: configuration.filters,
                      sort_config: configuration.sorting,
                      display_config: {
                        row_height: 'medium',
                        show_borders: true,
                        striped_rows: false
                      }
                    }),
                  });

                  if (response.ok) {
                    toast({
                      title: 'Success',
                      description: 'Column configuration saved successfully',
                    });
                    loadData(); // Refresh the configurations list
                  } else {
                    throw new Error('Failed to save configuration');
                  }
                } catch (error) {
                  console.error('Error saving configuration:', error);
                  throw error; // Re-throw so the component can handle it
                }
              }}
              className="h-[60vh] overflow-y-auto"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnManagerOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Column Editor Dialog */}
      <ColumnEditorDialog
        open={showAddColumnDialog || !!editingColumn}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddColumnDialog(false);
            setEditingColumn(null);
          }
        }}
        column={editingColumn}
        onSave={handleSaveColumn}
        tableIdentifier={selectedEditorTable}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteConfirm.open} 
        onClose={() => setShowDeleteConfirm({ open: false, columnId: '', columnName: '' })}
      >
        <DialogTitle>Delete Column</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the column &quot;{showDeleteConfirm.columnName}&quot;? 
            This action cannot be undone and may affect existing table configurations.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteConfirm({ open: false, columnId: '', columnName: '' })}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => showDeleteConfirm.columnId && handleDeleteColumn(showDeleteConfirm.columnId)}
          >
            Delete Column
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Row Confirmation Dialog */}
      <Dialog 
        open={showDeleteRowConfirm.open} 
        onClose={() => setShowDeleteRowConfirm({ open: false, rowId: '', rowLabel: '' })}
      >
        <DialogTitle>Delete Row</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete &quot;{showDeleteRowConfirm.rowLabel}&quot;? 
            This action cannot be undone and will permanently remove the data from the database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteRowConfirm({ open: false, rowId: '', rowLabel: '' })}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => showDeleteRowConfirm.rowId && handleDeleteRow(showDeleteRowConfirm.rowId)}
          >
            Delete Row
          </Button>
        </DialogActions>
      </Dialog>

      {/* Row Editor Dialog */}
      <RowEditorDialog
        open={showRowEditor}
        onOpenChange={(open) => {
          setShowRowEditor(open);
          if (!open) {
            setEditingRow(null);
          }
        }}
        row={editingRow}
        columns={editorColumns}
        tableName={selectedEditorTable}
        onSave={handleRowSave}
      />
    </div>
  );
}