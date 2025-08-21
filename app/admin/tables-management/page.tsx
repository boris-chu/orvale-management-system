'use client';

import React, { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  Upload,
  Table as TableIcon,
  Columns,
  Filter,
  Save,
  RefreshCw,
  Users,
  Share2,
  LogOut,
  User
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types
interface TableConfiguration {
  id: number;
  table_identifier: string;
  configuration_name: string;
  description: string;
  column_config: any;
  filter_config: any;
  sort_config: any;
  display_config: any;
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

interface SavedView {
  id: number;
  view_name: string;
  table_identifier: string;
  view_type: 'personal' | 'team' | 'public';
  configuration: any;
  created_by: string;
  created_at: string;
}

export default function TablesManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [configurations, setConfigurations] = useState<TableConfiguration[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>('tickets_queue');
  
  // Dialog states
  const [createConfigOpen, setCreateConfigOpen] = useState(false);
  const [editConfigOpen, setEditConfigOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<TableConfiguration | null>(null);
  
  // Form states
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');
  
  // User menu states
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  useEffect(() => {
    if (hasViewPermission) {
      loadData();
    }
  }, [hasViewPermission]);

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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get auth token for API calls
      const token = localStorage.getItem('authToken');
      const headers: any = {
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
  };

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
                You don't have permission to view tables management.
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tables Management</h1>
          <p className="text-gray-500 mt-1">
            Configure and customize data tables across the system
          </p>
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
          
          {hasCreatePermission && (
            <Dialog open={createConfigOpen} onOpenChange={setCreateConfigOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Configuration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Table Configuration</DialogTitle>
                  <DialogDescription>
                    Create a new table layout configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="table-select">Table</Label>
                    <Select value={selectedTable} onValueChange={setSelectedTable}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tickets_queue">Tickets Queue</SelectItem>
                        <SelectItem value="users_list">Users Management</SelectItem>
                        <SelectItem value="helpdesk_queue">Helpdesk Queue</SelectItem>
                      </SelectContent>
                    </Select>
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateConfigOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateConfiguration}>
                    Create Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                      user={user}
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
                          user={user}
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configurations" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Configurations
          </TabsTrigger>
          <TabsTrigger value="columns" className="flex items-center gap-2">
            <Columns className="h-4 w-4" />
            Column Definitions
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Saved Views
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
                                    setEditConfigOpen(true);
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
                  {['tickets_queue', 'users_list', 'helpdesk_queue'].map((tableId) => {
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
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Configuration Preview</DialogTitle>
            <DialogDescription>
              {selectedConfig?.configuration_name} - {getTableTypeLabel(selectedConfig?.table_identifier || '')}
            </DialogDescription>
          </DialogHeader>
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
    </div>
  );
}