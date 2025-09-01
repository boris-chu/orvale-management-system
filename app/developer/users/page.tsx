'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog as RadixDialog, DialogContent as RadixDialogContent, DialogHeader as RadixDialogHeader, DialogTitle as RadixDialogTitle, DialogTrigger as RadixDialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  ArrowLeft,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw,
  Key,
  AlertTriangle,
  User,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  Typography
} from '@mui/material';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatRegularTime } from '@/lib/time-utils';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  team_id?: string;
  team_name?: string;
  section_id?: string;
  section_name?: string;
  role_id: string;
  active: boolean;
  created_at: string;
  last_login?: string;
  profile_picture?: string;
}

interface Team {
  id: string;
  name: string;
  section_id: string;
  section_name: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    email: '',
    password: '',
    team_id: '',
    role_id: '',
    active: true
  });

  useEffect(() => {
    checkPermissions();
    loadUsers();
    loadTeams();
    loadRoles();
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
        if (!user.permissions?.includes('admin.manage_users') && !user.permissions?.includes('admin.view_users')) {
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

  const loadUsers = async () => {
    try {
      const result = await apiClient.getDeveloperUsers();
      setUsers(result.data.items || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      showNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/teams', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const teamData = await response.json();
        setTeams(teamData);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/roles', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const roleData = await response.json();
        setRoles(roleData);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateUser = async () => {
    if (!currentUser?.permissions?.includes('admin.manage_users')) {
      showNotification('Insufficient permissions to create users', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiClient.createDeveloperUser(formData);
      showNotification('User created successfully', 'success');
      setShowCreateModal(false);
      setFormData({
        username: '',
        display_name: '',
        email: '',
        password: '',
        team_id: '',
        role_id: '',
        active: true
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification(error.message || 'Error creating user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !currentUser?.permissions?.includes('admin.manage_users')) {
      showNotification('Insufficient permissions to edit users', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiClient.updateDeveloperUser(selectedUser.id, formData);
      showNotification('User updated successfully', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification(error.message || 'Error updating user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!currentUser?.permissions?.includes('admin.manage_users')) {
      showNotification('Insufficient permissions to delete users', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteDeveloperUser(userId);
      showNotification('User deleted successfully', 'success');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification(error.message || 'Error deleting user', 'error');
    }
  };

  const openPasswordResetModal = (user: User) => {
    setSelectedUser(user);
    setResetPassword('');
    setShowPasswordResetModal(true);
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !currentUser?.permissions?.includes('admin.manage_users')) {
      showNotification('Insufficient permissions to reset passwords', 'error');
      return;
    }

    if (!resetPassword) {
      showNotification('Please enter a new password', 'error');
      return;
    }

    if (resetPassword.length < 6) {
      showNotification('Password must be at least 6 characters long', 'error');
      return;
    }

    setSaving(true);
    try {
      // Use the updateDeveloperUser method to update just the password
      await apiClient.updateDeveloperUser(selectedUser.id, { password: resetPassword });
      showNotification('Password reset successfully', 'success');
      setShowPasswordResetModal(false);
      setSelectedUser(null);
      setResetPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      showNotification(error.message || 'Error resetting password', 'error');
    } finally {
      setSaving(false);
    }
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

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      password: '', // Don't populate password
      team_id: user.team_id || '',
      role_id: user.role_id,
      active: user.active
    });
    setShowEditModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterActive === 'all' || 
                         (filterActive === 'active' && user.active) ||
                         (filterActive === 'inactive' && !user.active);
    
    return matchesSearch && matchesFilter;
  });

  const canManage = currentUser?.permissions?.includes('admin.manage_users');
  const canView = currentUser?.permissions?.includes('admin.view_users');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading users...</p>
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
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                  <p className="text-sm text-gray-500">{users.length} total users</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {canManage && (
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create User</span>
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
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <FormControl size="small" className="w-32">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterActive}
                    label="Status"
                    onChange={(e) => setFilterActive(e.target.value as any)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Showing {filteredUsers.length} of {users.length} users</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Team</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Last Login</th>
                    {canManage && <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <UserAvatar 
                            user={user}
                            size="lg"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{user.display_name}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm text-gray-900">{user.team_name || 'No team'}</p>
                          <p className="text-xs text-gray-500">{user.section_name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {user.role_id}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {user.active ? (
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
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {user.last_login ? formatRegularTime(user.last_login) : 'Never'}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPasswordResetModal(user)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your criteria.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Modal */}
      <Dialog 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <UserPlus className="h-5 w-5" />
            <Typography variant="h6">Create New User</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="john.doe"
              size="small"
            />
            
            <TextField
              fullWidth
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              placeholder="John Doe"
              size="small"
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john.doe@example.com"
              size="small"
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter password"
              size="small"
            />
            
            <FormControl fullWidth size="small">
              <InputLabel>Select Team</InputLabel>
              <Select
                value={formData.team_id}
                label="Select Team"
                onChange={(e) => setFormData({...formData, team_id: e.target.value as string})}
              >
                <MenuItem value="">No Team</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name} ({team.section_name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small">
              <InputLabel>Select Role</InputLabel>
              <Select
                value={formData.role_id}
                label="Select Role"
                onChange={(e) => setFormData({...formData, role_id: e.target.value as string})}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                />
              }
              label="Active user"
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            variant="outline" 
            onClick={() => setShowCreateModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog 
        open={showEditModal} 
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Edit className="h-5 w-5" />
            <Typography variant="h6">Edit User</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="john.doe"
              size="small"
            />
            
            <TextField
              fullWidth
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              placeholder="John Doe"
              size="small"
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john.doe@example.com"
              size="small"
            />
            
            <TextField
              fullWidth
              label="New Password (leave blank to keep current)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter new password"
              size="small"
            />
            
            <FormControl fullWidth size="small">
              <InputLabel>Select Team</InputLabel>
              <Select
                value={formData.team_id}
                label="Select Team"
                onChange={(e) => setFormData({...formData, team_id: e.target.value as string})}
              >
                <MenuItem value="">No Team</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name} ({team.section_name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth size="small">
              <InputLabel>Select Role</InputLabel>
              <Select
                value={formData.role_id}
                label="Select Role"
                onChange={(e) => setFormData({...formData, role_id: e.target.value as string})}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                />
              }
              label="Active user"
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            variant="outline" 
            onClick={() => setShowEditModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleEditUser}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update User'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog 
        open={showPasswordResetModal} 
        onClose={() => {
          setShowPasswordResetModal(false);
          setSelectedUser(null);
          setResetPassword('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Key className="h-5 w-5" />
            <Typography variant="h6">Reset Password</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} sx={{ mt: 1 }}>
            <Box 
              sx={{ 
                p: 2, 
                backgroundColor: '#fefce8', 
                border: '1px solid #fde047', 
                borderRadius: 1 
              }}
            >
              <Box display="flex" alignItems="flex-start" gap={1}>
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400e' }}>
                    Password Reset
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a16207', mt: 0.5 }}>
                    You are about to reset the password for <strong>{selectedUser?.display_name}</strong> (@{selectedUser?.username}).
                  </Typography>
                </Box>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              size="small"
              helperText="Password must be at least 6 characters long"
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowPasswordResetModal(false);
              setSelectedUser(null);
              setResetPassword('');
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePasswordReset}
            disabled={saving || !resetPassword}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </>
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