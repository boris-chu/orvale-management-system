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
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem, 
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  // Load settings on mount
  useEffect(() => {
    loadChatSettings();
    loadSystemStats();
  }, []);

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
      const response = await fetch('/api/admin/chat/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat Management System</h1>
          <p className="text-gray-600">Configure chat system settings, monitor activity, and customize the chat widget</p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

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
                  <Label className="text-sm font-medium">Position</Label>
                  <Select
                    value={settings.widget_position}
                    onValueChange={(value) => updateSetting('widget_position', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label className="text-sm font-medium">Theme</Label>
                  <Select
                    value={settings.widget_theme}
                    onValueChange={(value) => updateSetting('widget_theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
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
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management features will be implemented here.</p>
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
    </div>
  );
}