'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ArrowLeft,
  Building,
  Folder,
  CheckCircle,
  XCircle,
  RefreshCw,
  Hash,
  FileText,
  Building2,
  Users,
  ChevronRight,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TicketCategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  request_type_count: number;
}

interface RequestType {
  id: string;
  category_id: string;
  name: string;
  description: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  subcategory_count: number;
}

interface Subcategory {
  id: string;
  request_type_id: string;
  name: string;
  description: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  request_type_name: string;
  category_id: string;
  category_name: string;
}

interface DpssOrgItem {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  sort_order: number;
  office_id?: string;
  office_name?: string;
  bureau_id?: string;
  bureau_name?: string;
  division_id?: string;
  division_name?: string;
  user_count?: number;
  bureau_count?: number;
  division_count?: number;
  section_count?: number;
}

export default function CategoryManagement() {
  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [dpssOffices, setDpssOffices] = useState<DpssOrgItem[]>([]);
  const [dpssBureaus, setDpssBureaus] = useState<DpssOrgItem[]>([]);
  const [dpssDivisions, setDpssDivisions] = useState<DpssOrgItem[]>([]);
  const [dpssSections, setDpssSections] = useState<DpssOrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');
  const [ticketSubTab, setTicketSubTab] = useState('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'request_type' | 'subcategory' | 'office' | 'bureau' | 'division' | 'section'>('category');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    parent_id: '',
    category_id: '',
    request_type_id: '',
    sort_order: 0,
    active: true
  });

  useEffect(() => {
    checkPermissions();
    loadData();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const checkPermissions = async () => {
    try {
      const result = await apiClient.getCurrentUser();
      const user = result.data?.user || result.data;
      
      if (!user) {
        window.location.href = '/';
        return;
      }
      
      if (!user.permissions?.includes('admin.manage_categories') && !user.permissions?.includes('admin.view_categories') &&
          !user.permissions?.includes('admin.manage_organization') && !user.permissions?.includes('admin.view_organization')) {
        window.location.href = '/developer';
        return;
      }
      
      setCurrentUser(user);
    } catch (error) {
      console.error('Permission check failed:', error);
      window.location.href = '/';
    }
  };

  const loadData = async () => {
    try {
      // Load ticket categories
      const categoriesResult = await apiClient.getDeveloperCategories();
      if (categoriesResult.success) {
        setTicketCategories(categoriesResult.data);
      }

      // Load request types
      const requestTypesResult = await apiClient.getDeveloperRequestTypes();
      if (requestTypesResult.success) {
        setRequestTypes(requestTypesResult.data);
      }

      // Load subcategories
      const subcategoriesResult = await apiClient.getDeveloperSubcategories();
      if (subcategoriesResult.success) {
        setSubcategories(subcategoriesResult.data);
      }

      // Load DPSS organizational data
      const dpssResult = await apiClient.getDeveloperDpssOrg();
      if (dpssResult.success) {
        const dpssData = dpssResult.data;
        setDpssOffices(dpssData.offices || []);
        setDpssBureaus(dpssData.bureaus || []);
        setDpssDivisions(dpssData.divisions || []);
        setDpssSections(dpssData.sections || []);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
      showNotification('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  // Handle profile update
  const handleProfileUpdate = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    // Also update localStorage
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      const userData = JSON.parse(currentUserData);
      localStorage.setItem('currentUser', JSON.stringify({ ...userData, ...updatedUser }));
    }
  };

  const handleCreateItem = async () => {
    const hasPermission = ['category', 'request_type', 'subcategory'].includes(modalType)
      ? currentUser?.permissions?.includes('admin.manage_categories')
      : currentUser?.permissions?.includes('admin.manage_organization');

    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      let endpoint, body;
      
      switch (modalType) {
        case 'category':
          endpoint = '/api/developer/categories';
          body = formData;
          break;
        case 'request_type':
          endpoint = '/api/developer/request-types';
          body = { ...formData, category_id: formData.category_id };
          break;
        case 'subcategory':
          endpoint = '/api/developer/subcategories';
          body = { ...formData, request_type_id: formData.request_type_id };
          break;
        default:
          endpoint = '/api/developer/dpss-org';
          body = { ...formData, type: modalType, parent_id: formData.parent_id || undefined };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showNotification(`${modalType.replace('_', ' ')} created successfully`, 'success');
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || `Failed to create ${modalType.replace('_', ' ')}`, 'error');
      }
    } catch (error) {
      console.error(`Error creating ${modalType}:`, error);
      showNotification(`Error creating ${modalType.replace('_', ' ')}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = async () => {
    const hasPermission = ['category', 'request_type', 'subcategory'].includes(modalType)
      ? currentUser?.permissions?.includes('admin.manage_categories')
      : currentUser?.permissions?.includes('admin.manage_organization');

    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      let endpoint, body;
      
      switch (modalType) {
        case 'category':
          endpoint = '/api/developer/categories';
          body = formData;
          break;
        case 'request_type':
          endpoint = '/api/developer/request-types';
          body = { ...formData, category_id: formData.category_id };
          break;
        case 'subcategory':
          endpoint = '/api/developer/subcategories';
          body = { ...formData, request_type_id: formData.request_type_id };
          break;
        default:
          endpoint = '/api/developer/dpss-org';
          body = { ...formData, type: modalType, parent_id: formData.parent_id || undefined };
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showNotification(`${modalType.replace('_', ' ')} updated successfully`, 'success');
        setShowEditModal(false);
        setSelectedItem(null);
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || `Failed to update ${modalType.replace('_', ' ')}`, 'error');
      }
    } catch (error) {
      console.error(`Error updating ${modalType}:`, error);
      showNotification(`Error updating ${modalType.replace('_', ' ')}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, type: string) => {
    const hasPermission = ['category', 'request_type', 'subcategory'].includes(type)
      ? currentUser?.permissions?.includes('admin.manage_categories')
      : currentUser?.permissions?.includes('admin.manage_organization');

    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      let endpoint;
      
      switch (type) {
        case 'category':
          endpoint = `/api/developer/categories?id=${itemId}`;
          break;
        case 'request_type':
          endpoint = `/api/developer/request-types?id=${itemId}`;
          break;
        case 'subcategory':
          endpoint = `/api/developer/subcategories?id=${itemId}`;
          break;
        default:
          endpoint = `/api/developer/dpss-org?type=${type}&id=${itemId}`;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification(`${type} deleted successfully`, 'success');
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || `Failed to delete ${type}`, 'error');
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      showNotification(`Error deleting ${type}`, 'error');
    }
  };

  const openCreateModal = (type: string) => {
    setModalType(type as any);
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (item: any, type: string) => {
    setSelectedItem(item);
    setModalType(type as any);
    setFormData({
      id: item.id,
      name: item.name,
      description: item.description || '',
      parent_id: item.office_id || item.bureau_id || item.division_id || '',
      category_id: item.category_id || '',
      request_type_id: item.request_type_id || '',
      sort_order: item.sort_order || 0,
      active: item.active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      parent_id: '',
      category_id: '',
      request_type_id: '',
      sort_order: 0,
      active: true
    });
  };

  // Auto-generate ID from name
  const generateId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  const getParentOptions = () => {
    switch (modalType) {
      case 'request_type':
        return ticketCategories.map(category => ({ id: category.id, name: category.name }));
      case 'subcategory':
        return requestTypes.map(requestType => ({ id: requestType.id, name: `${requestType.category_name} > ${requestType.name}` }));
      case 'bureau':
        return dpssOffices.map(office => ({ id: office.id, name: office.name }));
      case 'division':
        return dpssBureaus.map(bureau => ({ id: bureau.id, name: bureau.name }));
      case 'section':
        return dpssDivisions.map(division => ({ id: division.id, name: division.name }));
      default:
        return [];
    }
  };


  const canManageCategories = currentUser?.permissions?.includes('admin.manage_categories');
  const canViewCategories = currentUser?.permissions?.includes('admin.view_categories');
  const canManageOrg = currentUser?.permissions?.includes('admin.manage_organization');
  const canViewOrg = currentUser?.permissions?.includes('admin.view_organization');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading category and organizational data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/developer'}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <Tag className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Category & Organization Management</h1>
                  <p className="text-sm text-gray-500">Manage ticket categories and DPSS organizational structure</p>
                </div>
              </div>
            </div>
            
            {/* User Profile Menu */}
            {currentUser && (
              <TooltipProvider>
                <div className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <UserAvatar 
                          user={currentUser}
                          size="lg"
                          showOnlineIndicator={true}
                          className="border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>User Menu</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Enhanced User Dropdown Menu */}
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* User Info Section */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="flex items-center space-x-3">
                            <UserAvatar 
                              user={currentUser}
                              size="lg"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.display_name}</p>
                              <p className="text-xs text-gray-600 truncate">{currentUser?.email}</p>
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {currentUser?.role_id}
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
                          <button
                            onClick={handleLogout}
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
                </div>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <Alert className={`${notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <AlertDescription className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {notification.message}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tickets" className="flex items-center space-x-2">
              <Tag className="h-4 w-4" />
              <span>Ticket Categories</span>
            </TabsTrigger>
            <TabsTrigger value="dpss" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>DPSS Organization</span>
            </TabsTrigger>
          </TabsList>

          {/* Ticket Categories Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Ticket Categories System</h2>
                <p className="text-sm text-gray-500">Manage the complete hierarchical ticket classification system</p>
              </div>
            </div>

            {/* Sub-tabs for Ticket Categories */}
            <Tabs value={ticketSubTab} onValueChange={setTicketSubTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="categories" className="flex items-center space-x-2">
                  <Folder className="h-4 w-4" />
                  <span>Main Categories</span>
                </TabsTrigger>
                <TabsTrigger value="request_types" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Request Types</span>
                </TabsTrigger>
                <TabsTrigger value="subcategories" className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>Subcategories</span>
                </TabsTrigger>
              </TabsList>

              {/* Main Categories Sub-tab */}
              <TabsContent value="categories" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Main Categories</h3>
                    <p className="text-sm text-gray-500">Top-level ticket categories (9 categories)</p>
                  </div>
                  {canManageCategories && (
                    <Button onClick={() => openCreateModal('category')} className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Create Category</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ticketCategories.filter(cat => 
                    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((category) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full"
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                                {category.name}
                              </CardTitle>
                              <code className="text-xs bg-gray-100 px-1 rounded mb-2 inline-block">{category.id}</code>
                              {category.description && (
                                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                              )}
                            </div>
                            {category.active ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-sm">
                              <Folder className="h-4 w-4 text-blue-600" />
                              <span className="text-gray-600">Request Types:</span>
                              <span className="font-medium">{category.request_type_count}</span>
                            </div>
                            
                            {canManageCategories && (
                              <div className="flex justify-end space-x-2 pt-2 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(category, 'category')}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(category.id, 'category')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* Request Types Sub-tab */}
              <TabsContent value="request_types" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Request Types</h3>
                    <p className="text-sm text-gray-500">Specific request types within each category ({requestTypes.length} types)</p>
                  </div>
                  {canManageCategories && (
                    <Button onClick={() => openCreateModal('request_type')} className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Create Request Type</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {requestTypes.filter(rt => 
                    rt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    rt.category_name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((requestType) => (
                    <motion.div
                      key={requestType.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{requestType.name}</h4>
                              <code className="text-xs bg-gray-100 px-1 rounded mb-2 inline-block">{requestType.id}</code>
                              <div className="text-xs text-gray-500 flex items-center mb-2">
                                <ChevronRight className="h-3 w-3" />
                                <span>{requestType.category_name}</span>
                              </div>
                            </div>
                            {canManageCategories && (
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditModal(requestType, 'request_type')}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(requestType.id, 'request_type')} className="text-red-600">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Hash className="h-3 w-3 text-orange-600" />
                            <span className="text-gray-600">Subcategories:</span>
                            <span className="font-medium">{requestType.subcategory_count}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* Subcategories Sub-tab */}
              <TabsContent value="subcategories" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Subcategories</h3>
                    <p className="text-sm text-gray-500">Detailed subcategories for specific issues ({subcategories.length} subcategories)</p>
                  </div>
                  {canManageCategories && (
                    <Button onClick={() => openCreateModal('subcategory')} className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Create Subcategory</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subcategories.filter(sc => 
                    sc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sc.request_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sc.category_name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((subcategory) => (
                    <motion.div
                      key={subcategory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:shadow-md transition-shadow border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm mb-1">{subcategory.name}</h4>
                              <code className="text-xs bg-gray-100 px-1 rounded mb-1 inline-block">{subcategory.id}</code>
                              <div className="text-xs text-gray-500 space-y-1">
                                <div className="flex items-center">
                                  <ChevronRight className="h-3 w-3" />
                                  <span>{subcategory.category_name}</span>
                                </div>
                                <div className="flex items-center ml-3">
                                  <ChevronRight className="h-3 w-3" />
                                  <span>{subcategory.request_type_name}</span>
                                </div>
                              </div>
                            </div>
                            {canManageCategories && (
                              <div className="flex space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditModal(subcategory, 'subcategory')}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(subcategory.id, 'subcategory')} className="text-red-600">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* DPSS Organization Tab */}
          <TabsContent value="dpss" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">DPSS Organizational Structure</h2>
                <p className="text-sm text-gray-500">Manage departmental hierarchy for ticket submitters</p>
              </div>
            </div>

            {/* Offices */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>Offices</span>
                  <Badge variant="outline" className="ml-2">Used in Public Portal & Ticket Forms</Badge>
                </CardTitle>
                {canManageOrg && (
                  <Button size="sm" onClick={() => openCreateModal('office')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Office
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dpssOffices.map((office) => (
                    <Card key={office.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{office.name}</h4>
                          {canManageOrg && (
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(office, 'office')}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(office.id, 'office')} className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <code className="text-xs bg-gray-100 px-1 rounded">{office.id}</code>
                        <div className="mt-2 text-sm text-gray-600">
                          Physical location
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bureaus */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <span>Bureaus</span>
                  <Badge variant="outline" className="ml-2">Used in Ticket Forms</Badge>
                </CardTitle>
                {canManageOrg && (
                  <Button size="sm" onClick={() => openCreateModal('bureau')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Bureau
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dpssBureaus.map((bureau) => (
                    <Card key={bureau.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{bureau.name}</h4>
                          {canManageOrg && (
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(bureau, 'bureau')}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(bureau.id, 'bureau')} className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <code className="text-xs bg-gray-100 px-1 rounded mb-1 inline-block">{bureau.id}</code>
                        {bureau.office_name && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <ChevronRight className="h-3 w-3" />
                            {bureau.office_name}
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-600">
                          Organizational unit
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Divisions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <span>Divisions</span>
                  <Badge variant="outline" className="ml-2">Used in Ticket Forms</Badge>
                </CardTitle>
                {canManageOrg && (
                  <Button size="sm" onClick={() => openCreateModal('division')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Division
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dpssDivisions.map((division) => (
                    <Card key={division.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{division.name}</h4>
                          {canManageOrg && (
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(division, 'division')}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(division.id, 'division')} className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <code className="text-xs bg-gray-100 px-1 rounded mb-1 inline-block">{division.id}</code>
                        <div className="text-xs text-gray-500 space-y-1">
                          {division.office_name && (
                            <div className="flex items-center">
                              <ChevronRight className="h-3 w-3" />
                              {division.office_name}
                            </div>
                          )}
                          {division.bureau_name && (
                            <div className="flex items-center ml-3">
                              <ChevronRight className="h-3 w-3" />
                              {division.bureau_name}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Departmental division
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <span>Sections</span>
                  <Badge variant="outline" className="ml-2">Used in Public Portal & Ticket Forms</Badge>
                </CardTitle>
                {canManageOrg && (
                  <Button size="sm" onClick={() => openCreateModal('section')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Section
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dpssSections.map((section) => (
                    <Card key={section.id} className="hover:shadow-md transition-shadow border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{section.name}</h4>
                          {canManageOrg && (
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(section, 'section')}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(section.id, 'section')} className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <code className="text-xs bg-gray-100 px-1 rounded mb-1 inline-block">{section.id}</code>
                        <div className="text-xs text-gray-500 space-y-1">
                          {section.office_name && (
                            <div className="flex items-center">
                              <ChevronRight className="h-3 w-3" />
                              {section.office_name}
                            </div>
                          )}
                          {section.bureau_name && (
                            <div className="flex items-center ml-3">
                              <ChevronRight className="h-3 w-3" />
                              {section.bureau_name}
                            </div>
                          )}
                          {section.division_name && (
                            <div className="flex items-center ml-6">
                              <ChevronRight className="h-3 w-3" />
                              {section.division_name}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600 flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>Work section</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Create New {modalType}</span>
        </DialogTitle>
        <DialogContent>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_name">{modalType} Name</Label>
              <Input
                id="item_name"
                value={formData.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const generatedId = generateId(newName);
                  setFormData({
                    ...formData, 
                    name: newName,
                    id: generatedId
                  });
                }}
                placeholder={
                  modalType === 'category' ? 'Application Support' :
                  modalType === 'request_type' ? 'Network Connectivity' :
                  modalType === 'subcategory' ? 'Application Issue' : 'Main Office'
                }
              />
            </div>

            <div>
              <Label htmlFor="item_id">{modalType} ID (Auto-generated, editable)</Label>
              <Input
                id="item_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder={
                  modalType === 'category' ? 'app_support' :
                  modalType === 'request_type' ? 'network_connectivity' :
                  modalType === 'subcategory' ? 'application_issue' : 'office_main'
                }
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Generated automatically from name, but you can edit it</p>
            </div>
            
            <div>
              <Label htmlFor="item_description">Description</Label>
              <Textarea
                id="item_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            
            {getParentOptions().length > 0 && (
              <div>
                <FormControl fullWidth size="small">
                  <InputLabel>Select {modalType === 'request_type' ? 'Category' : modalType === 'subcategory' ? 'Request Type' : 'Parent'}</InputLabel>
                  <Select
                    value={(() => {
                      if (modalType === 'request_type') return formData.category_id || '';
                      if (modalType === 'subcategory') return formData.request_type_id || '';
                      return formData.parent_id || '';
                    })()} 
                    label={`Select ${modalType === 'request_type' ? 'Category' : modalType === 'subcategory' ? 'Request Type' : 'Parent'}`}
                    onChange={(e) => {
                      const value = e.target.value as string;
                      console.log('Select changed:', { modalType, value, currentFormData: formData });
                      if (modalType === 'request_type') {
                        setFormData(prev => ({ ...prev, category_id: value }));
                      } else if (modalType === 'subcategory') {
                        setFormData(prev => ({ ...prev, request_type_id: value }));
                      } else {
                        setFormData(prev => ({ ...prev, parent_id: value }));
                      }
                    }}
                  >
                    {getParentOptions().map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}
            
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateItem}
            disabled={saving || !formData.id || !formData.name || 
              (modalType === 'request_type' && !formData.category_id) || 
              (modalType === 'subcategory' && !formData.request_type_id)}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${modalType}`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal - Similar structure to Create Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center space-x-2">
          <Edit className="h-5 w-5" />
          <span>Edit {modalType}</span>
        </DialogTitle>
        <DialogContent>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_item_id">{modalType} ID</Label>
              <Input
                id="edit_item_id"
                value={formData.id}
                disabled
                className="font-mono bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">ID cannot be changed</p>
            </div>
            
            <div>
              <Label htmlFor="edit_item_name">{modalType} Name</Label>
              <Input
                id="edit_item_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'category' ? 'Application Support' : 'Main Office'}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_item_description">Description</Label>
              <Textarea
                id="edit_item_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            
            {getParentOptions().length > 0 && (
              <div>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Parent</InputLabel>
                  <Select
                    value={formData.parent_id || ''}
                    label="Select Parent"
                    onChange={(e) => {
                      const value = e.target.value as string;
                      console.log('Edit Select changed:', { value, currentParentId: formData.parent_id });
                      setFormData(prev => ({ ...prev, parent_id: value }));
                    }}
                  >
                    {getParentOptions().map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            )}
            
            <div>
              <Label htmlFor="edit_sort_order">Sort Order</Label>
              <Input
                id="edit_sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                placeholder="0"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_active"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="edit_active">Active</Label>
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowEditModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEditItem}
            disabled={saving || !formData.name}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              `Update ${modalType}`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={currentUser}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}