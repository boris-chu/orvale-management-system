'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { UserAvatar } from '@/components/UserAvatar';

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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      } else {
        showNotification('Failed to load users', 'error');
      }
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
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
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showNotification('Error creating user', 'error');
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, id: selectedUser.id })
      });

      if (response.ok) {
        showNotification('User updated successfully', 'success');
        setShowEditModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showNotification('Error updating user', 'error');
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showNotification('User deleted successfully', 'success');
        loadUsers();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('Error deleting user', 'error');
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
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword: resetPassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        setShowPasswordResetModal(false);
        setSelectedUser(null);
        setResetPassword('');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to reset password', 'error');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showNotification('Error resetting password', 'error');
    } finally {
      setSaving(false);
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
            
            {canManage && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Create User</span>
              </Button>
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
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
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
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Create New User</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="john.doe"
              />
            </div>
            
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter password"
              />
            </div>
            
            <div>
              <Label htmlFor="team">Team</Label>
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
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
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
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="active">Active user</Label>
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit User</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_username">Username</Label>
              <Input
                id="edit_username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="john.doe"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_display_name">Display Name</Label>
              <Input
                id="edit_display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit_password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_team">Team</Label>
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
            </div>
            
            <div>
              <Label htmlFor="edit_role">Role</Label>
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
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit_active"
                checked={formData.active}
                onChange={(e) => setFormData({...formData, active: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="edit_active">Active user</Label>
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={showPasswordResetModal} onOpenChange={setShowPasswordResetModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Reset Password</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Password Reset</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You are about to reset the password for <strong>{selectedUser?.display_name}</strong> (@{selectedUser?.username}).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}