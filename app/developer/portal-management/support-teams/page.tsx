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
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface SupportTeamGroup {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
  team_count: number;
}

interface SupportTeam {
  id: string;
  group_id: string;
  name: string;
  label: string;
  email: string;
  description: string;
  sort_order: number;
  active: boolean;
  group_name: string;
}

export default function SupportTeamsManagement() {
  const [groups, setGroups] = useState<SupportTeamGroup[]>([]);
  const [teams, setTeams] = useState<SupportTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'group' | 'team'>('group');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    label: '',
    email: '',
    description: '',
    group_id: '',
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
        console.log('Support Teams - User permissions:', user.permissions);
        console.log('Support Teams - User role:', user.role);
        
        // Check for either admin support team permissions or portal management permissions
        const hasPermission = user.permissions?.includes('admin.manage_support_teams') || 
                            user.permissions?.includes('admin.view_support_teams') ||
                            user.permissions?.includes('portal.manage_teams') ||
                            user.permissions?.includes('admin.manage_categories') ||
                            user.role === 'admin';
        
        console.log('Support Teams - Has permission:', hasPermission);
        
        if (!hasPermission) {
          console.log('Support Teams - Redirecting due to insufficient permissions');
          window.location.href = '/developer/portal-management';
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
      const response = await fetch('/api/developer/support-teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Failed to load support teams:', error);
      showNotification('Error loading support teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateItem = async () => {
    const hasPermission = currentUser?.permissions?.includes('admin.manage_support_teams');
    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/support-teams', {
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
    const hasPermission = currentUser?.permissions?.includes('admin.manage_support_teams');
    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/support-teams', {
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
    const hasPermission = currentUser?.permissions?.includes('admin.manage_support_teams');
    if (!hasPermission) {
      showNotification('Insufficient permissions', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/support-teams?type=${type}&id=${itemId}`, {
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

  const openCreateModal = (type: 'group' | 'team') => {
    setModalType(type);
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (item: any, type: 'group' | 'team') => {
    setSelectedItem(item);
    setModalType(type);
    setFormData({
      id: item.id,
      name: item.name,
      label: item.label || item.name,
      email: item.email || '',
      description: item.description || '',
      group_id: item.group_id || '',
      sort_order: item.sort_order || 0,
      active: item.active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      label: '',
      email: '',
      description: '',
      group_id: '',
      sort_order: 0,
      active: true
    });
  };

  const canManage = currentUser?.permissions?.includes('admin.manage_support_teams');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading support teams...</p>
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
                onClick={() => window.location.href = '/developer/portal-management'}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Portal Management</span>
              </Button>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Support Teams Management</h1>
                  <p className="text-sm text-gray-500">Manage support team groups and individual teams</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Support Team Groups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              <span>Support Team Groups</span>
              <Badge variant="outline" className="ml-2">Subheaders in Public Portal</Badge>
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => openCreateModal('group')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Group
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{group.name}</h4>
                      {canManage && (
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(group, 'group')}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(group.id, 'group')} className="text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <code className="text-xs bg-gray-100 px-1 rounded mb-1 inline-block">{group.id}</code>
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {group.team_count} teams
                      </div>
                      {group.active ? (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Support Teams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Support Teams</span>
              <Badge variant="outline" className="ml-2">Individual Teams in Portal</Badge>
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => openCreateModal('team')}>
                <Plus className="h-4 w-4 mr-1" />
                Add Team
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{team.label}</h4>
                      {canManage && (
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(team, 'team')}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(team.id, 'team')} className="text-red-600">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <code className="text-xs bg-gray-100 px-1 rounded mb-1 inline-block">{team.id}</code>
                    <div className="text-xs text-gray-500 mb-2">
                      Group: {team.group_name}
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-blue-600 mb-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{team.email}</span>
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-600 mb-2">{team.description}</p>
                    )}
                    {team.active ? (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New {modalType === 'group' ? 'Group' : 'Team'}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_id">{modalType === 'group' ? 'Group' : 'Team'} ID</Label>
              <Input
                id="item_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder={modalType === 'group' ? 'itts_region_8' : 'support_team_id'}
                className="font-mono"
              />
            </div>
            
            <div>
              <Label htmlFor="item_name">{modalType === 'group' ? 'Group' : 'Team'} Name</Label>
              <Input
                id="item_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'group' ? 'ITTS: Region 8' : 'Support Team Name'}
              />
            </div>

            {modalType === 'team' && (
              <>
                <div>
                  <Label htmlFor="item_label">Display Label</Label>
                  <Input
                    id="item_label"
                    value={formData.label}
                    onChange={(e) => setFormData({...formData, label: e.target.value})}
                    placeholder="Crossroads Main"
                  />
                </div>

                <div>
                  <Label htmlFor="item_email">Email Address</Label>
                  <Input
                    id="item_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="support@dpss.lacounty.gov"
                  />
                </div>

                <div>
                  <Label htmlFor="group">Support Group</Label>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Group</InputLabel>
                    <Select
                      value={formData.group_id}
                      label="Select Group"
                      onChange={(e) => setFormData({...formData, group_id: e.target.value as string})}
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </>
            )}
            
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
                disabled={saving || !formData.id || !formData.name || (modalType === 'team' && (!formData.email || !formData.group_id))}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `Create ${modalType === 'group' ? 'Group' : 'Team'}`
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
              <span>Edit {modalType === 'group' ? 'Group' : 'Team'}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_item_id">{modalType === 'group' ? 'Group' : 'Team'} ID</Label>
              <Input
                id="edit_item_id"
                value={formData.id}
                disabled
                className="font-mono bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">ID cannot be changed</p>
            </div>
            
            <div>
              <Label htmlFor="edit_item_name">{modalType === 'group' ? 'Group' : 'Team'} Name</Label>
              <Input
                id="edit_item_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={modalType === 'group' ? 'ITTS: Region 8' : 'Support Team Name'}
              />
            </div>

            {modalType === 'team' && (
              <>
                <div>
                  <Label htmlFor="edit_item_label">Display Label</Label>
                  <Input
                    id="edit_item_label"
                    value={formData.label}
                    onChange={(e) => setFormData({...formData, label: e.target.value})}
                    placeholder="Crossroads Main"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_item_email">Email Address</Label>
                  <Input
                    id="edit_item_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="support@dpss.lacounty.gov"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_group">Support Group</Label>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select Group</InputLabel>
                    <Select
                      value={formData.group_id}
                      label="Select Group"
                      onChange={(e) => setFormData({...formData, group_id: e.target.value as string})}
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>
              </>
            )}
            
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
                disabled={saving || !formData.name || (modalType === 'team' && (!formData.email || !formData.group_id))}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update ${modalType === 'group' ? 'Group' : 'Team'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}