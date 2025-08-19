'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

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
  const [dpssOffices, setDpssOffices] = useState<DpssOrgItem[]>([]);
  const [dpssBureaus, setDpssBureaus] = useState<DpssOrgItem[]>([]);
  const [dpssDivisions, setDpssDivisions] = useState<DpssOrgItem[]>([]);
  const [dpssSections, setDpssSections] = useState<DpssOrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'office' | 'bureau' | 'division' | 'section'>('category');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    parent_id: '',
    sort_order: 0,
    active: true
  });

  useEffect(() => {
    checkPermissions();
    loadData();
  }, []);

  const checkPermissions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        if (!user.permissions?.includes('admin.manage_categories') && !user.permissions?.includes('admin.view_categories') &&
            !user.permissions?.includes('admin.manage_organization') && !user.permissions?.includes('admin.view_organization')) {
          window.location.href = '/developer';
          return;
        }
        setCurrentUser(user);
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      window.location.href = '/';
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Load ticket categories
      const categoriesResponse = await fetch('/api/developer/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setTicketCategories(categoriesData);
      }

      // Load DPSS organizational data
      const dpssResponse = await fetch('/api/developer/dpss-org', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (dpssResponse.ok) {
        const dpssData = await dpssResponse.json();
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

  const handleCreateItem = async () => {
    const hasPermission = modalType === 'category' 
      ? currentUser?.permissions?.includes('admin.manage_categories')
      : currentUser?.permissions?.includes('admin.manage_organization');

    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = modalType === 'category' ? '/api/developer/categories' : '/api/developer/dpss-org';
      
      const body = modalType === 'category' 
        ? formData
        : { ...formData, type: modalType, parent_id: formData.parent_id || undefined };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showNotification(`${modalType} created successfully`, 'success');
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || `Failed to create ${modalType}`, 'error');
      }
    } catch (error) {
      console.error(`Error creating ${modalType}:`, error);
      showNotification(`Error creating ${modalType}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = async () => {
    const hasPermission = modalType === 'category' 
      ? currentUser?.permissions?.includes('admin.manage_categories')
      : currentUser?.permissions?.includes('admin.manage_organization');

    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = modalType === 'category' ? '/api/developer/categories' : '/api/developer/dpss-org';
      
      const body = modalType === 'category' 
        ? formData
        : { ...formData, type: modalType, parent_id: formData.parent_id || undefined };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showNotification(`${modalType} updated successfully`, 'success');
        setShowEditModal(false);
        setSelectedItem(null);
        loadData();
      } else {
        const error = await response.json();
        showNotification(error.error || `Failed to update ${modalType}`, 'error');
      }
    } catch (error) {
      console.error(`Error updating ${modalType}:`, error);
      showNotification(`Error updating ${modalType}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string, type: string) => {
    const hasPermission = type === 'category' 
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
      const endpoint = type === 'category' 
        ? `/api/developer/categories?id=${itemId}`
        : `/api/developer/dpss-org?type=${type}&id=${itemId}`;

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
      sort_order: 0,
      active: true
    });
  };

  const getParentOptions = () => {
    switch (modalType) {
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
                <h2 className="text-xl font-semibold text-gray-900">Ticket Categories</h2>
                <p className="text-sm text-gray-500">Manage ticket issue classification system</p>
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
                          {office.bureau_count || 0} bureaus
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
                          {bureau.division_count || 0} divisions
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
                          {division.section_count || 0} sections
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
                  <Badge variant="outline" className="ml-2">Used in Ticket Forms</Badge>
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
                          <span>{section.user_count || 0} users</span>
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
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New {modalType}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_id">{modalType} ID</Label>
              <Input
                id="item_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder={modalType === 'category' ? 'app_support' : 'office_main'}
                className="font-mono"
              />
            </div>
            
            <div>
              <Label htmlFor="item_name">{modalType} Name</Label>
              <Input
                id="item_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'category' ? 'Application Support' : 'Main Office'}
              />
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
                <Label htmlFor="parent">Parent {modalType === 'bureau' ? 'Office' : modalType === 'division' ? 'Bureau' : 'Division'}</Label>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Parent</InputLabel>
                  <Select
                    value={formData.parent_id}
                    label="Select Parent"
                    onChange={(e) => setFormData({...formData, parent_id: e.target.value as string})}
                  >
                    <MenuItem value="">No Parent</MenuItem>
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
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateItem}
                disabled={saving || !formData.id || !formData.name}
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal - Similar structure to Create Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit {modalType}</span>
            </DialogTitle>
          </DialogHeader>
          
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
                <Label htmlFor="edit_parent">Parent {modalType === 'bureau' ? 'Office' : modalType === 'division' ? 'Bureau' : 'Division'}</Label>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Parent</InputLabel>
                  <Select
                    value={formData.parent_id}
                    label="Select Parent"
                    onChange={(e) => setFormData({...formData, parent_id: e.target.value as string})}
                  >
                    <MenuItem value="">No Parent</MenuItem>
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
            
            <div className="flex justify-end space-x-2 pt-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}