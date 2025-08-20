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
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ArrowLeft,
  Users,
  Building,
  CheckCircle,
  XCircle,
  RefreshCw,
  Workflow,
  TreePine,
  ChevronRight,
  AlertTriangle,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Section {
  id: string;
  name: string;
  description: string;
  parent_section_id?: string;
  parent_section_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  team_count: number;
  user_count: number;
}

export default function OrganizationalManagement() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
    parent_section_id: '',
    active: true
  });

  useEffect(() => {
    checkPermissions();
    loadSections();
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        if (!user.permissions?.includes('admin.manage_organization') && !user.permissions?.includes('admin.view_organization')) {
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

  const loadSections = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/sections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const sectionData = await response.json();
        setSections(sectionData);
      } else {
        showNotification('Failed to load sections', 'error');
      }
    } catch (error) {
      console.error('Failed to load sections:', error);
      showNotification('Error loading sections', 'error');
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

  const handleCreateSection = async () => {
    if (!currentUser?.permissions?.includes('admin.manage_organization')) {
      showNotification('Insufficient permissions to create sections', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/sections', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showNotification('Section created successfully', 'success');
        setShowCreateModal(false);
        setFormData({
          id: '',
          name: '',
          description: '',
          parent_section_id: '',
          active: true
        });
        loadSections();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to create section', 'error');
      }
    } catch (error) {
      console.error('Error creating section:', error);
      showNotification('Error creating section', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSection = async () => {
    if (!selectedSection || !currentUser?.permissions?.includes('admin.manage_organization')) {
      showNotification('Insufficient permissions to edit sections', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/sections', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, id: selectedSection.id })
      });

      if (response.ok) {
        showNotification('Section updated successfully', 'success');
        setShowEditModal(false);
        setSelectedSection(null);
        loadSections();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to update section', 'error');
      }
    } catch (error) {
      console.error('Error updating section:', error);
      showNotification('Error updating section', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!currentUser?.permissions?.includes('admin.manage_organization')) {
      showNotification('Insufficient permissions to delete sections', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/sections?id=${sectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('Section deleted successfully', 'success');
        loadSections();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to delete section', 'error');
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      showNotification('Error deleting section', 'error');
    }
  };

  const openEditModal = (section: Section) => {
    setSelectedSection(section);
    setFormData({
      id: section.id,
      name: section.name,
      description: section.description,
      parent_section_id: section.parent_section_id || '',
      active: section.active
    });
    setShowEditModal(true);
  };

  // Build hierarchical structure for tree view
  const buildHierarchy = (sections: Section[]): Section[] => {
    const rootSections = sections.filter(s => !s.parent_section_id);
    const childSections = sections.filter(s => s.parent_section_id);
    
    const addChildren = (section: Section): any => {
      const children = childSections.filter(c => c.parent_section_id === section.id);
      return {
        ...section,
        children: children.map(addChildren)
      };
    };
    
    return rootSections.map(addChildren);
  };

  const filteredSections = sections.filter(section => 
    section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hierarchicalSections = buildHierarchy(filteredSections);

  const canManage = currentUser?.permissions?.includes('admin.manage_organization');
  const canView = currentUser?.permissions?.includes('admin.view_organization');

  // Recursive component for tree view
  const TreeNode = ({ section, level = 0 }: { section: any; level?: number }) => (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{section.name}</h3>
                  <code className="text-xs bg-gray-100 px-1 rounded">{section.id}</code>
                  {section.active ? (
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
                
                {section.description && (
                  <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>{section.team_count} teams</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{section.user_count} users</span>
                  </div>
                </div>
              </div>
              
              {canManage && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(section)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSection(section.id)}
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
      
      {section.children && section.children.length > 0 && (
        <div className="space-y-2">
          {section.children.map((child: any) => (
            <TreeNode key={child.id} section={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading organizational structure...</p>
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
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Organizational Structure</h1>
                  <p className="text-sm text-gray-500">{sections.length} sections</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {canManage && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Section</span>
                </Button>
              )}

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
        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search sections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'tree' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('tree')}
                    className="flex items-center space-x-1"
                  >
                    <TreePine className="h-4 w-4" />
                    <span>Tree</span>
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="flex items-center space-x-1"
                  >
                    <Workflow className="h-4 w-4" />
                    <span>Grid</span>
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Showing {filteredSections.length} of {sections.length} sections</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Views */}
        {viewMode === 'tree' ? (
          // Tree View
          <div className="space-y-4">
            {hierarchicalSections.length > 0 ? (
              hierarchicalSections.map((section) => (
                <TreeNode key={section.id} section={section} />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500">No sections found matching your criteria.</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map((section) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full"
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                          {section.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mb-2">
                          <code className="text-xs bg-gray-100 px-1 rounded">{section.id}</code>
                          {section.parent_section_name && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <ChevronRight className="h-3 w-3" />
                              <span>{section.parent_section_name}</span>
                            </div>
                          )}
                        </div>
                        {section.description && (
                          <p className="text-sm text-gray-600 mb-3">{section.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        {section.active ? (
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
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Statistics */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-600">Teams:</span>
                          <span className="font-medium">{section.team_count}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span className="text-gray-600">Users:</span>
                          <span className="font-medium">{section.user_count}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {canManage && (
                        <div className="flex justify-end space-x-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(section)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSection(section.id)}
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
        )}
      </div>

      {/* Create Section Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New Section</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="section_id">Section ID</Label>
              <Input
                id="section_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder="IT_DEPT"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier (e.g., IT_DEPT, HR_ADMIN)</p>
            </div>
            
            <div>
              <Label htmlFor="section_name">Section Name</Label>
              <Input
                id="section_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Information Technology Department"
              />
            </div>
            
            <div>
              <Label htmlFor="section_description">Description</Label>
              <Textarea
                id="section_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the section's responsibilities"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="parent_section">Parent Section (Optional)</Label>
              <FormControl fullWidth size="small">
                <InputLabel>Select Parent Section</InputLabel>
                <Select
                  value={formData.parent_section_id}
                  label="Select Parent Section"
                  onChange={(e) => setFormData({...formData, parent_section_id: e.target.value as string})}
                >
                  <MenuItem value="">No Parent (Root Level)</MenuItem>
                  {sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name} ({section.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                onClick={handleCreateSection}
                disabled={saving || !formData.id || !formData.name}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Section'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Section Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Section</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_section_id">Section ID</Label>
              <Input
                id="edit_section_id"
                value={formData.id}
                disabled
                className="font-mono bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Section ID cannot be changed</p>
            </div>
            
            <div>
              <Label htmlFor="edit_section_name">Section Name</Label>
              <Input
                id="edit_section_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Information Technology Department"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_section_description">Description</Label>
              <Textarea
                id="edit_section_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the section's responsibilities"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_parent_section">Parent Section</Label>
              <FormControl fullWidth size="small">
                <InputLabel>Select Parent Section</InputLabel>
                <Select
                  value={formData.parent_section_id}
                  label="Select Parent Section"
                  onChange={(e) => setFormData({...formData, parent_section_id: e.target.value as string})}
                >
                  <MenuItem value="">No Parent (Root Level)</MenuItem>
                  {sections.filter(s => s.id !== selectedSection?.id).map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name} ({section.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_section_active"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="edit_section_active">Active section</Label>
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
                onClick={handleEditSection}
                disabled={saving || !formData.name}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Section'
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
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}