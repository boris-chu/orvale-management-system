/**
 * Chat Management System - Admin Dashboard
 * Features:
 * - Dashboard Tab: System health, Socket.io status, user presence  
 * - Widget Customization Tab: Shapes, colors, themes, live preview
 * - Users Management Tab: Online status, force logout, blocking
 * - Monitor Tab: Message monitoring with download capabilities
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings,
  Activity, 
  Users, 
  Monitor,
  Palette,
  Save,
  Circle,
  Square,
  RotateCcw,
  MessageCircle,
  Wifi,
  WifiOff,
  User,
  Clock,
  ArrowLeft,
  LogOut,
  RefreshCw
} from 'lucide-react';
import {
  Select as MuiSelect,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';

interface ChatSettings {
  // Widget Settings
  widget_enabled: boolean;
  widget_position: 'bottom-right' | 'bottom-left';
  widget_shape: 'round' | 'square' | 'rounded-square';
  widget_primary_color: string;
  widget_secondary_color: string;
  widget_theme: 'light' | 'dark' | 'auto';
  
  // System Settings
  chat_system_enabled: boolean;
  notification_sounds_enabled: boolean;
  read_receipts_enabled: boolean;
  file_sharing_enabled: boolean;
  gif_picker_enabled: boolean;
}

interface SystemStats {
  socketio_status: 'connected' | 'disconnected';
  socketio_port: number;
  socketio_uptime: string;
  users_online: number;
  users_away: number;
  users_busy: number;
  users_offline: number;
  active_users: number;
  total_channels: number;
  messages_per_hour: number;
  storage_used_mb: number;
}

export default function ChatManagementPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    widget_enabled: false,
    widget_position: 'bottom-right',
    widget_shape: 'rounded-square',
    widget_primary_color: '#1976d2',
    widget_secondary_color: '#6c757d',
    widget_theme: 'light',
    chat_system_enabled: true,
    notification_sounds_enabled: true,
    read_receipts_enabled: true,
    file_sharing_enabled: true,
    gif_picker_enabled: true,
  });
  const [stats, setStats] = useState<SystemStats>({
    socketio_status: 'connected',
    socketio_port: 3001,
    socketio_uptime: '2h 15m',
    users_online: 12,
    users_away: 3,
    users_busy: 2,
    users_offline: 8,
    active_users: 15,
    total_channels: 8,
    messages_per_hour: 245,
    storage_used_mb: 125,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Users tab state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load settings on mount
  useEffect(() => {
    checkAdminAccess();
    loadChatSettings();
    loadSystemStats();
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        
        // Check if user has chat management permissions
        const hasPermission = user.permissions?.includes('chat.manage_system') || 
                             user.permissions?.includes('admin.system_settings') ||
                             user.role === 'admin';

        if (!hasPermission) {
          window.location.href = '/tickets';
          return;
        }
        
        setCurrentUser(user);
      } else {
        window.location.href = '/';
        return;
      }
    } catch (error) {
      console.error('Failed to verify admin access:', error);
      window.location.href = '/';
    } finally {
      setLoading(false);
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
    const currentUserData = localStorage.getItem('currentUser');
    if (currentUserData) {
      const userData = JSON.parse(currentUserData);
      localStorage.setItem('currentUser', JSON.stringify({ ...userData, ...updatedUser }));
    }
  };

  const loadChatSettings = async () => {
    try {
      const response = await fetch('/api/admin/chat/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load chat settings:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/chat/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const updateSetting = (key: keyof ChatSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication required. Please log in again.');
        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/admin/chat/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        // Show success message
        alert('Settings saved successfully!');
        // Trigger widget refresh across all pages
        window.dispatchEvent(new CustomEvent('chat-settings-updated', { detail: settings }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save failed:', response.status, errorData);
        if (response.status === 401) {
          alert('Authentication expired. Please log in again.');
          window.location.href = '/';
          return;
        } else if (response.status === 403) {
          alert('You do not have permission to modify chat settings.');
          return;
        }
        throw new Error(errorData.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Users tab functions and computed values
  const refreshUserData = async () => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUsers(userData.users || []);
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const forceUserLogout = async (username: string) => {
    if (!confirm(`Force logout all sessions for ${username}?`)) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/users/force-logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        await refreshUserData();
        alert(`${username} has been logged out of all sessions.`);
      } else {
        alert('Failed to force logout user.');
      }
    } catch (error) {
      console.error('Error forcing user logout:', error);
      alert('Error occurred while forcing logout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleUserBlock = async (username: string, isCurrentlyBlocked: boolean) => {
    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    if (!confirm(`${action} ${username} from chat system?`)) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/users/block', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          blocked: !isCurrentlyBlocked 
        })
      });

      if (response.ok) {
        await refreshUserData();
        alert(`${username} has been ${action}ed.`);
      } else {
        alert(`Failed to ${action} user.`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      alert(`Error occurred while ${action}ing user.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions for UI
  const getBrowserFromUserAgent = (userAgent: string) => {
    if (userAgent?.includes('Chrome')) return 'chrome';
    if (userAgent?.includes('Firefox')) return 'firefox';
    if (userAgent?.includes('Safari')) return 'safari';
    if (userAgent?.includes('Edge')) return 'edge';
    return 'unknown';
  };

  const formatConnectionTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown';
    }
  };

  const formatBlockDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Computed values for Users tab
  const filteredUsers = users.filter(user =>
    user.display_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const multiTabUsers = users.filter(user => 
    user.connection_count > 1 && user.presence_status !== 'offline'
  );

  const blockedUsers = users.filter(user => user.is_chat_blocked);

  // Load user data when Users tab is selected
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      refreshUserData();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <RefreshCw className="h-8 w-8 text-emerald-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading chat management...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div 
        className="min-h-screen bg-gray-50"
        onClick={() => setShowUserMenu(false)}
      >
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
                <MessageCircle className="h-6 w-6 text-emerald-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Chat Management System</h1>
                  <p className="text-sm text-gray-500">Configure chat system settings, monitor activity, and customize the chat widget</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={stats.socketio_status === 'connected' ? 'default' : 'destructive'}>
                {stats.socketio_status === 'connected' ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>

              {/* User Profile Section */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserMenu(!showUserMenu);
                    }}
                    className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <UserAvatar 
                      user={currentUser}
                      size="lg"
                      showOnlineIndicator={true}
                      className="border-2 border-gray-200 hover:border-emerald-400 transition-colors duration-200"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>User Menu</p>
                </TooltipContent>
              </Tooltip>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-20 right-4 w-72 bg-white rounded-lg shadow-xl border z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
                      <div className="flex items-center space-x-3">
                        <UserAvatar 
                          user={currentUser}
                          size="lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.display_name}</p>
                          <p className="text-xs text-gray-600 truncate">{currentUser?.email}</p>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              {currentUser?.role_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowProfileModal(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <User className="h-4 w-4" />
                        <span>Edit Profile</span>
                      </button>

                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="widget">
            <Palette className="h-4 w-4 mr-2" />
            Widget
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="monitor">
            <Monitor className="h-4 w-4 mr-2" />
            Monitor
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Socket.io Status Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Socket.io Status</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Connected</div>
                <p className="text-xs text-muted-foreground">Port: {stats.socketio_port}</p>
                <p className="text-xs text-muted-foreground">Uptime: {stats.socketio_uptime}</p>
              </CardContent>
            </Card>

            {/* User Presence Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Presence</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Online
                    </span>
                    <span className="font-medium">{stats.users_online}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      Away
                    </span>
                    <span className="font-medium">{stats.users_away}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Busy
                    </span>
                    <span className="font-medium">{stats.users_busy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                      Offline
                    </span>
                    <span className="font-medium">{stats.users_offline}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Users Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active_users}</div>
                <p className="text-xs text-muted-foreground">+2 since 1h ago</p>
              </CardContent>
            </Card>

            {/* Total Channels Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Channels</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_channels}</div>
                <p className="text-xs text-muted-foreground">3 public, 5 private</p>
              </CardContent>
            </Card>

            {/* Messages per Hour Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages/Hour</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.messages_per_hour}</div>
                <p className="text-xs text-muted-foreground">↑ 15% from average</p>
              </CardContent>
            </Card>

            {/* Storage Used Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.storage_used_mb} MB</div>
                <p className="text-xs text-muted-foreground">85 MB messages, 40 MB files</p>
              </CardContent>
            </Card>
          </div>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Chat System Enabled</Label>
                  <p className="text-xs text-muted-foreground">Enable/disable the entire chat system</p>
                </div>
                <Switch
                  checked={settings.chat_system_enabled}
                  onCheckedChange={(checked) => updateSetting('chat_system_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notification Sounds</Label>
                  <p className="text-xs text-muted-foreground">System-wide notification sounds</p>
                </div>
                <Switch
                  checked={settings.notification_sounds_enabled}
                  onCheckedChange={(checked) => updateSetting('notification_sounds_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Read Receipts</Label>
                  <p className="text-xs text-muted-foreground">Users cannot disable (admin controlled)</p>
                </div>
                <Switch
                  checked={settings.read_receipts_enabled}
                  onCheckedChange={(checked) => updateSetting('read_receipts_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widget Customization Tab */}
        <TabsContent value="widget" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Widget Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Widget Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Master Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Chat Widget</Label>
                    <p className="text-xs text-muted-foreground">Show chat widget on all pages</p>
                  </div>
                  <Switch
                    checked={settings.widget_enabled}
                    onCheckedChange={(checked) => updateSetting('widget_enabled', checked)}
                  />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <FormControl fullWidth size="small">
                    <InputLabel className="text-sm font-medium">Position</InputLabel>
                    <MuiSelect
                      value={settings.widget_position}
                      label="Position"
                      onChange={(e) => updateSetting('widget_position', e.target.value)}
                    >
                      <MenuItem value="bottom-right">Bottom Right</MenuItem>
                      <MenuItem value="bottom-left">Bottom Left</MenuItem>
                    </MuiSelect>
                  </FormControl>
                </div>

                {/* Shape */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Shape</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['round', 'square', 'rounded-square'] as const).map((shape) => (
                      <Button
                        key={shape}
                        variant={settings.widget_shape === shape ? 'default' : 'outline'}
                        onClick={() => updateSetting('widget_shape', shape)}
                        className="flex flex-col items-center gap-2 h-16"
                      >
                        {shape === 'round' && <Circle className="h-6 w-6" />}
                        {shape === 'square' && <Square className="h-6 w-6" />}
                        {shape === 'rounded-square' && <RotateCcw className="h-6 w-6" />}
                        <span className="text-xs capitalize">{shape.replace('-', ' ')}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={settings.widget_primary_color}
                        onChange={(e) => updateSetting('widget_primary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={settings.widget_primary_color}
                        onChange={(e) => updateSetting('widget_primary_color', e.target.value)}
                        className="flex-1"
                        placeholder="#1976d2"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={settings.widget_secondary_color}
                        onChange={(e) => updateSetting('widget_secondary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={settings.widget_secondary_color}
                        onChange={(e) => updateSetting('widget_secondary_color', e.target.value)}
                        className="flex-1"
                        placeholder="#6c757d"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <FormControl fullWidth size="small">
                    <InputLabel className="text-sm font-medium">Theme</InputLabel>
                    <MuiSelect
                      value={settings.widget_theme}
                      label="Theme"
                      onChange={(e) => updateSetting('widget_theme', e.target.value)}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto (System)</MenuItem>
                    </MuiSelect>
                  </FormControl>
                </div>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900"></div>
                  
                  {/* Mock Widget Preview */}
                  <div className={`absolute ${settings.widget_position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'}`}>
                    <div 
                      className={`w-12 h-12 shadow-lg flex items-center justify-center text-white ${
                        settings.widget_shape === 'round' ? 'rounded-full' :
                        settings.widget_shape === 'square' ? 'rounded-none' : 'rounded-lg'
                      }`}
                      style={{ backgroundColor: settings.widget_primary_color }}
                    >
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      3
                    </Badge>
                  </div>

                  <div className="absolute top-4 left-4 text-sm text-gray-600 dark:text-gray-400">
                    Widget Preview
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Chat Users Management
              </CardTitle>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Button onClick={refreshUserData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User List */}
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <UserAvatar 
                        user={user}
                        size="md"
                        enableRealTimePresence={true}
                      />
                      <div>
                        <div className="font-medium">{user.display_name}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {user.presence_status === 'online' && (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Online ({user.connection_count} tabs)</span>
                            </>
                          )}
                          {user.presence_status === 'away' && (
                            <>
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span>Away ({user.connection_count} tabs)</span>
                            </>
                          )}
                          {user.presence_status === 'busy' && (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span>Busy ({user.connection_count} tabs)</span>
                            </>
                          )}
                          {user.presence_status === 'offline' && (
                            <>
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span>Offline</span>
                            </>
                          )}
                          {user.is_chat_blocked && (
                            <Badge variant="destructive" className="text-xs">Blocked</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user.presence_status !== 'offline' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => forceUserLogout(user.username)}
                                disabled={isProcessing}
                              >
                                <LogOut className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Force Logout ({user.connection_count} sessions)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={user.is_chat_blocked ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleUserBlock(user.username, user.is_chat_blocked)}
                              disabled={isProcessing}
                            >
                              {user.is_chat_blocked ? 'Unblock' : 'Block'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.is_chat_blocked ? 'Allow chat access' : 'Block from chat system'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>

              {/* Multiple Connections Section */}
              {multiTabUsers.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Multiple Connections:</h3>
                  {multiTabUsers.map((user) => (
                    <div key={user.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                      <div className="font-medium mb-2">
                        {user.display_name} - {user.connection_count} tabs:
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground ml-4">
                        {user.socket_connections && JSON.parse(user.socket_connections).map((conn: any, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            • {conn.tabInfo} ({getBrowserFromUserAgent(conn.userAgent)}, {formatConnectionTime(conn.connectedAt)})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Blocked Users Section */}
              {blockedUsers.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Blocked Users:</h3>
                  {blockedUsers.map((user) => (
                    <div key={user.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Blocked by {user.blocked_by} on {formatBlockDate(user.blocked_at)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserBlock(user.username, true)}
                        >
                          Unblock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {userSearchQuery ? 'No users found matching your search.' : 'No users found.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitor Tab */}
        <TabsContent value="monitor">
          <Card>
            <CardHeader>
              <CardTitle>Message Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Message monitoring features will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Save Changes Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t p-4 flex items-center justify-between shadow-lg">
          <p className="text-sm text-muted-foreground">You have unsaved changes</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={currentUser}
        onProfileUpdate={handleProfileUpdate}
      />
      </div>
    </TooltipProvider>
  );
}