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
import { 
  Building, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function OrganizationStructurePage() {
  const router = useRouter();
  const [dpssOffices, setDpssOffices] = useState<DpssOrgItem[]>([]);
  const [dpssSections, setDpssSections] = useState<DpssOrgItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'office' | 'section'>('office');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);

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
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const userData = await response.json();
      setCurrentUser(userData);
      
      // Check permissions for organization management
      const hasPermission = userData.role === 'admin' ||
                           userData.permissions?.includes('admin.manage_categories') ||
                           userData.permissions?.includes('portal.manage_organization');
      
      if (!hasPermission) {
        router.push('/developer/portal-management');
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/');
    }
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDpssOffices(data.dpss_offices || []);
        setDpssSections(data.dpss_sections || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Error loading organization data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/');
  };

  const canManageOrg = currentUser?.role === 'admin' ||
                      currentUser?.permissions?.includes('admin.manage_categories') ||
                      currentUser?.permissions?.includes('portal.manage_organization');

  const openCreateModal = (type: 'office' | 'section') => {
    setModalType(type);
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (item: any, type: 'office' | 'section') => {
    setSelectedItem(item);
    setModalType(type);
    setFormData({
      id: item.id,
      name: item.name,
      description: item.description || '',
      parent_id: item.office_id || '',
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

  const handleCreateItem = async () => {
    if (!canManageOrg) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, type: modalType })
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
    if (!canManageOrg) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/categories', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, type: modalType })
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
    if (!canManageOrg) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/categories?type=${type}&id=${itemId}`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onClick={() => setShowUserMenu(false)}
    >
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/developer/portal-management" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal Management
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Building className="h-8 w-8 mr-3 text-blue-600" />
                Organization Structure
              </h1>
              <p className="text-gray-600 mt-2">
                Manage DPSS offices and sections used in the public portal
              </p>
            </div>
            
            {/* User Profile Menu */}
            <TooltipProvider>
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(!showUserMenu);
                      }}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300"
                    >
                      <UserAvatar 
                        user={currentUser}
                        size="lg"
                        showOnlineIndicator={true}
                      />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.display_name}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser?.role_id}</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
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
                      className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center space-x-3">
                          <UserAvatar 
                            user={currentUser}
                            size="lg"
                            showOnlineIndicator={true}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.display_name}</p>
                            <p className="text-xs text-gray-600 truncate">{currentUser?.email}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {currentUser?.role_id}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowProfileModal(true);
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <Users className="h-4 w-4" />
                          <span>Edit Profile</span>
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={() => {
                            handleLogout();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TooltipProvider>
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

        <div className="space-y-8">
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
                      {office.active ? (
                        <Badge className="bg-green-100 text-green-800 mt-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-2">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
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
                      </div>
                      <div className="mt-2 text-sm text-gray-600 flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>Work section</span>
                      </div>
                      {section.active ? (
                        <Badge className="bg-green-100 text-green-800 mt-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mt-2">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New {modalType === 'office' ? 'Office' : 'Section'}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_id">{modalType === 'office' ? 'Office' : 'Section'} ID</Label>
              <Input
                id="item_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder={modalType === 'office' ? 'office_main' : 'section_it'}
                className="font-mono"
              />
            </div>
            
            <div>
              <Label htmlFor="item_name">{modalType === 'office' ? 'Office' : 'Section'} Name</Label>
              <Input
                id="item_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'office' ? 'Main Office' : 'Information Technology'}
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
                  `Create ${modalType === 'office' ? 'Office' : 'Section'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit {modalType === 'office' ? 'Office' : 'Section'}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_item_id">{modalType === 'office' ? 'Office' : 'Section'} ID</Label>
              <Input
                id="edit_item_id"
                value={formData.id}
                disabled
                className="font-mono bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">ID cannot be changed</p>
            </div>
            
            <div>
              <Label htmlFor="edit_item_name">{modalType === 'office' ? 'Office' : 'Section'} Name</Label>
              <Input
                id="edit_item_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'office' ? 'Main Office' : 'Information Technology'}
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
                  `Update ${modalType === 'office' ? 'Office' : 'Section'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={currentUser}
        onProfileUpdate={setCurrentUser}
      />
    </div>
  );
}