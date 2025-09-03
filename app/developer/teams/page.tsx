'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
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
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  ArrowLeft,
  Building,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Crown,
  Plus,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Team {
  id: string;
  name: string;
  description: string;
  section_id: string;
  section_name: string;
  lead_user_id?: number;
  lead_user_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  user_count: number;
}

interface Section {
  id: string;
  name: string;
  description: string;
  parent_section_id?: string;
  parent_section_name?: string;
  active: boolean;
  team_count: number;
}

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  active: boolean;
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
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
    section_id: '',
    lead_user_id: '',
    active: true
  });

  useEffect(() => {
    checkPermissions();
    loadTeams();
    loadSections();
    loadUsers();
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
      
      if (!user.permissions?.includes('admin.manage_teams') && !user.permissions?.includes('admin.view_teams')) {
        window.location.href = '/developer';
        return;
      }
      
      setCurrentUser(user);
    } catch (error) {
      console.error('Permission check failed:', error);
      window.location.href = '/';
    }
  };

  const loadTeams = async () => {
    try {
      const result = await apiClient.getTeams();
      if (result.success) {
        setTeams(result.data);
      } else {
        showNotification('Failed to load teams', 'error');
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      showNotification('Error loading teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    try {
      const result = await apiClient.getDeveloperSections();
      if (result.success) {
        setSections(result.data);
      }
    } catch (error) {
      console.error('Failed to load sections:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await apiClient.getDeveloperUsers();
      if (result.success) {
        const userData = result.data.items || result.data;
        setUsers(userData.filter((user: User) => user.active));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
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

  const handleCreateTeam = async () => {
    if (!currentUser?.permissions?.includes('admin.manage_teams')) {
      showNotification('Insufficient permissions to create teams', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.createDeveloperTeam(formData);

      if (result.success) {
        showNotification('Team created successfully', 'success');
        setShowCreateModal(false);
        setFormData({
          id: '',
          name: '',
          description: '',
          section_id: '',
          lead_user_id: '',
          active: true
        });
        loadTeams();
      } else {
        showNotification(result.message || 'Failed to create team', 'error');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      showNotification('Error creating team', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam || !currentUser?.permissions?.includes('admin.manage_teams')) {
      showNotification('Insufficient permissions to edit teams', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.updateDeveloperTeam({ ...formData, id: selectedTeam.id });

      if (result.success) {
        showNotification('Team updated successfully', 'success');
        setShowEditModal(false);
        setSelectedTeam(null);
        loadTeams();
      } else {
        showNotification(result.message || 'Failed to update team', 'error');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      showNotification('Error updating team', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!currentUser?.permissions?.includes('admin.manage_teams')) {
      showNotification('Insufficient permissions to delete teams', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiClient.deleteDeveloperTeam(teamId);

      if (result.success) {
        showNotification('Team deleted successfully', 'success');
        loadTeams();
      } else {
        showNotification(result.error || 'Failed to delete team', 'error');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      showNotification('Error deleting team', 'error');
    }
  };

  const openEditModal = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      id: team.id,
      name: team.name,
      description: team.description,
      section_id: team.section_id,
      lead_user_id: team.lead_user_id?.toString() || '',
      active: team.active
    });
    setShowEditModal(true);
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.section_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSection = filterSection === 'all' || team.section_id === filterSection;
    
    return matchesSearch && matchesSection;
  });

  const canManage = currentUser?.permissions?.includes('admin.manage_teams');
  const canView = currentUser?.permissions?.includes('admin.view_teams');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading teams...</p>
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
                <Building className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                  <p className="text-sm text-gray-500">{teams.length} total teams</p>
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
                  <span>Create Team</span>
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
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <FormControl size="small" className="w-48">
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={filterSection}
                    label="Section"
                    onChange={(e) => setFilterSection(e.target.value as string)}
                  >
                    <MenuItem value="all">All Sections</MenuItem>
                    {sections.map((section) => (
                      <MenuItem key={section.id} value={section.id}>
                        {section.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Showing {filteredTeams.length} of {teams.length} teams</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full"
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                        {team.name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mb-2">{team.section_name}</p>
                      {team.description && (
                        <p className="text-sm text-gray-600 mb-3">{team.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
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
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Team Lead */}
                    {team.lead_user_name && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Crown className="h-4 w-4 text-yellow-600" />
                        <span className="text-gray-600">Lead:</span>
                        <span className="font-medium">{team.lead_user_name}</span>
                      </div>
                    )}
                    
                    {/* User Count */}
                    <div className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-600">Members:</span>
                      <span className="font-medium">{team.user_count}</span>
                    </div>
                    
                    {/* Team ID */}
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">ID:</span>
                      <code className="font-mono text-xs bg-gray-100 px-1 rounded">{team.id}</code>
                    </div>
                    
                    {/* Actions */}
                    {canManage && (
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
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
        
        {filteredTeams.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">No teams found matching your criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Team Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New Team</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="team_id">Team ID</Label>
              <Input
                id="team_id"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder="DEV_Alpha"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Unique identifier (e.g., DEV_Alpha, NET_South)</p>
            </div>
            
            <div>
              <Label htmlFor="team_name">Team Name</Label>
              <Input
                id="team_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Development Team Alpha"
              />
            </div>
            
            <div>
              <Label htmlFor="team_description">Description</Label>
              <Textarea
                id="team_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the team's responsibilities"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="team_section">Section</Label>
              <FormControl fullWidth size="small">
                <InputLabel>Select Section</InputLabel>
                <Select
                  value={formData.section_id}
                  label="Select Section"
                  onChange={(e) => setFormData({...formData, section_id: e.target.value as string})}
                >
                  {sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                      {section.parent_section_name && ` (${section.parent_section_name})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            <div>
              <Label htmlFor="team_lead">Team Lead (Optional)</Label>
              <FormControl fullWidth size="small">
                <InputLabel>Select Team Lead</InputLabel>
                <Select
                  value={formData.lead_user_id}
                  label="Select Team Lead"
                  onChange={(e) => setFormData({...formData, lead_user_id: e.target.value as string})}
                >
                  <MenuItem value="">No Team Lead</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      {user.display_name} (@{user.username})
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
                onClick={handleCreateTeam}
                disabled={saving || !formData.id || !formData.name || !formData.section_id}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Team'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit Team</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_team_id">Team ID</Label>
              <Input
                id="edit_team_id"
                value={formData.id}
                disabled
                className="font-mono bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Team ID cannot be changed</p>
            </div>
            
            <div>
              <Label htmlFor="edit_team_name">Team Name</Label>
              <Input
                id="edit_team_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Development Team Alpha"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_team_description">Description</Label>
              <Textarea
                id="edit_team_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the team's responsibilities"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_team_section">Section</Label>
              <FormControl fullWidth size="small">
                <InputLabel>Select Section</InputLabel>
                <Select
                  value={formData.section_id}
                  label="Select Section"
                  onChange={(e) => setFormData({...formData, section_id: e.target.value as string})}
                >
                  {sections.map((section) => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                      {section.parent_section_name && ` (${section.parent_section_name})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            <div>
              <Label htmlFor="edit_team_lead">Team Lead</Label>
              <FormControl fullWidth size="small">
                <InputLabel>Select Team Lead</InputLabel>
                <Select
                  value={formData.lead_user_id}
                  label="Select Team Lead"
                  onChange={(e) => setFormData({...formData, lead_user_id: e.target.value as string})}
                >
                  <MenuItem value="">No Team Lead</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      {user.display_name} (@{user.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_team_active"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="edit_team_active">Active team</Label>
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
                onClick={handleEditTeam}
                disabled={saving || !formData.name || !formData.section_id}
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Team'
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