/**
 * Chat Management System - Admin Dashboard
 * Features:
 * - Dashboard Tab: System health, Socket.io status, user presence  
 * - UI Customization Tab: Chat interface styling, badge settings, widget configuration
 * - Users Management Tab: Online status, force logout, blocking
 * - Monitor Tab: Message monitoring with download capabilities
 */

'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  MessageSquare,
  Wifi,
  WifiOff,
  User,
  Clock,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserPlus,
  UserMinus,
  Hash,
  Check,
  Upload,
  Minimize2,
  Download,
  Filter,
  FileText,
  Database
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
import { cn } from '@/lib/utils';
import { ThemeSystemProvider, useThemeSystem, PRESET_THEMES } from '@/hooks/useThemeSystem';

interface ChatSettings {
  // Chat UI Settings
  widget_enabled: boolean;
  widget_position: 'bottom-right' | 'bottom-left';
  widget_shape: 'round' | 'square' | 'rounded-square';
  widget_primary_color: string;
  widget_secondary_color: string;
  widget_theme: 'light' | 'dark' | 'auto';
  widget_button_image: string;
  widget_default_state: 'open' | 'minimized';
  
  // System Settings
  chat_system_enabled: boolean;
  notification_sounds_enabled: boolean;
  read_receipts_enabled: boolean;
  file_sharing_enabled: boolean;
  gif_picker_enabled: boolean;
  
  // UI Settings
  show_unread_badges: boolean;
  unread_badge_color: string;
  unread_badge_text_color: string;
  unread_badge_style: 'rounded' | 'square' | 'pill';
  unread_badge_position: 'right' | 'left' | 'top-right';
  show_zero_counts: boolean;
  show_channel_member_count: boolean;
  show_typing_indicators: boolean;
  show_online_status: boolean;
  message_grouping_enabled: boolean;
  timestamp_format: 'relative' | 'absolute' | 'both';
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

interface MonitoredMessage {
  id: number;
  channel_id: number;
  channel_name: string;
  channel_type: string;
  user_id: string;
  user_display_name: string;
  message_text: string;
  message_type: string;
  created_at: string;
  edited_at?: string;
  file_attachment?: string;
}

interface MessageFilters {
  channel_id: string;
  user_id: string;
  time_range: '1h' | '24h' | '7d' | '30d' | 'all';
  message_type: string;
}

// Theme Management Tab Component
interface ThemeManagementTabProps {
  settings: ChatSettings;
  updateSetting: (key: keyof ChatSettings, value: string | boolean) => void;
  currentUser: any;
}

function ThemeManagementTab({ settings, updateSetting, currentUser }: ThemeManagementTabProps) {
  const {
    adminSettings,
    userPreferences,
    updateAdminSettings,
    adminLoading,
    getAvailableThemes,
    canUserCustomize,
    resolveTheme
  } = useThemeSystem();
  
  // Apply resolved theme CSS to demonstrate theme system
  const currentInternalTheme = resolveTheme('internal_chat');
  const currentPublicQueueTheme = resolveTheme('public_queue');
  
  useEffect(() => {
    // Inject current theme CSS variables for demonstration
    const root = document.documentElement;
    
    // Apply internal chat theme variables
    Object.entries(currentInternalTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--chat-${key.replace('_', '-')}`, value);
    });
    
    // Apply public queue theme variables  
    Object.entries(currentPublicQueueTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--queue-${key.replace('_', '-')}`, value);
    });
    
    // Apply other theme properties
    root.style.setProperty('--chat-border-radius', currentInternalTheme.border_radius || '8px');
    root.style.setProperty('--chat-font-family', currentInternalTheme.font_family || 'Inter, system-ui, sans-serif');
    root.style.setProperty('--chat-font-size-base', currentInternalTheme.font_size_base || '14px');
    
  }, [currentInternalTheme, currentPublicQueueTheme]);
  
  const [activeThemeTab, setActiveThemeTab] = useState('system-defaults');
  const [previewTheme, setPreviewTheme] = useState('light');
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [themeStats, setThemeStats] = useState({
    totalUsers: 0,
    usingCustomThemes: 0,
    mostPopularTheme: 'light',
    themeDistribution: [] as any[]
  });

  // Load theme usage analytics
  useEffect(() => {
    loadThemeAnalytics();
  }, []);

  const loadThemeAnalytics = async () => {
    try {
      const result = await apiClient.getThemeAnalytics('7d');
      setThemeStats(result.data);
    } catch (error) {
      console.error('Failed to load theme analytics:', error);
    }
  };

  // Handle admin theme setting updates
  const handleAdminThemeUpdate = async (updates: any) => {
    try {
      await updateAdminSettings(updates);
      await loadThemeAnalytics(); // Refresh stats
    } catch (error) {
      console.error('Failed to update admin theme settings:', error);
      alert('Failed to update theme settings. Please try again.');
    }
  };

  // Force theme compliance
  const handleForceCompliance = async () => {
    if (!confirm('This will override all user theme preferences with the system default. Continue?')) return;
    
    try {
      await apiClient.forceThemeCompliance({
        internal_chat_theme: adminSettings?.internal_chat_theme || 'light',
        public_queue_theme: adminSettings?.public_queue_theme || 'light'
      });
      
      alert('Theme compliance enforced successfully!');
      await loadThemeAnalytics();
    } catch (error) {
      console.error('Failed to force theme compliance:', error);
      alert('Failed to enforce theme compliance. Please try again.');
    }
  };

  const themePresets = [
    { name: 'light', displayName: 'Light', colors: PRESET_THEMES.light.internal_chat.colors },
    { name: 'iphone', displayName: 'iPhone', colors: PRESET_THEMES.iphone.internal_chat.colors },
    { name: 'darcula', displayName: 'Darcula', colors: PRESET_THEMES.darcula.internal_chat.colors },
    { name: 'github', displayName: 'GitHub', colors: PRESET_THEMES.github.internal_chat.colors },
    { name: 'slack', displayName: 'Slack', colors: PRESET_THEMES.slack.internal_chat.colors }
  ];

  return (
    <div className="space-y-6">
      {/* Current Theme Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900">Active Theme Configuration</h4>
            <p className="text-sm text-blue-700 mt-1">
              Internal Chat: <span className="font-medium capitalize">{adminSettings?.internal_chat_theme || 'light'}</span> • 
              Public Queue: <span className="font-medium capitalize">{adminSettings?.public_queue_theme || 'light'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border border-blue-300" 
              style={{ backgroundColor: currentInternalTheme.colors.primary }}
              title="Internal Chat Primary Color"
            />
            <div 
              className="w-4 h-4 rounded-full border border-blue-300" 
              style={{ backgroundColor: currentPublicQueueTheme.colors.primary }}
              title="Public Queue Primary Color"
            />
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveThemeTab('system-defaults')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeThemeTab === 'system-defaults'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            System Defaults
          </button>
          <button
            onClick={() => setActiveThemeTab('user-management')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeThemeTab === 'user-management'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveThemeTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeThemeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Theme Analytics
          </button>
          <button
            onClick={() => setActiveThemeTab('live-preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeThemeTab === 'live-preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Live Preview
          </button>
        </nav>
      </div>

      {/* System Defaults Tab */}
      {activeThemeTab === 'system-defaults' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                System Theme Defaults
              </CardTitle>
              <CardDescription>
                Configure default themes that will be applied system-wide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Internal Chat Theme */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Internal Chat Default Theme</Label>
                <div className="grid grid-cols-5 gap-3">
                  {themePresets.map(theme => (
                    <Card 
                      key={theme.name}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        adminSettings?.internal_chat_theme === theme.name 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : ''
                      }`}
                      onClick={() => handleAdminThemeUpdate({ internal_chat_theme: theme.name })}
                    >
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="flex justify-center gap-1 mb-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: theme.colors.primary }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: theme.colors.sidebar }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: theme.colors.surface }}
                            />
                          </div>
                          <p className="text-sm font-medium">{theme.displayName}</p>
                          {adminSettings?.internal_chat_theme === theme.name && (
                            <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Public Queue Theme */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Public Queue Default Theme</Label>
                <div className="grid grid-cols-5 gap-3">
                  {themePresets.map(theme => (
                    <Card 
                      key={theme.name}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        adminSettings?.public_queue_theme === theme.name 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : ''
                      }`}
                      onClick={() => handleAdminThemeUpdate({ public_queue_theme: theme.name })}
                    >
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="flex justify-center gap-1 mb-2">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: theme.colors.primary }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: theme.colors.sidebar }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: theme.colors.surface }}
                            />
                          </div>
                          <p className="text-sm font-medium">{theme.displayName}</p>
                          {adminSettings?.public_queue_theme === theme.name && (
                            <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management Tab */}
      {activeThemeTab === 'user-management' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Customization Policy */}
            <Card>
              <CardHeader>
                <CardTitle>User Customization Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Allow User Theme Customization</Label>
                    <p className="text-xs text-muted-foreground">Users can choose their preferred themes</p>
                  </div>
                  <Switch
                    checked={adminSettings?.allow_user_customization ?? true}
                    onCheckedChange={(checked) => 
                      handleAdminThemeUpdate({ allow_user_customization: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Force Theme Compliance</Label>
                    <p className="text-xs text-muted-foreground">Override all user preferences with system default</p>
                  </div>
                  <Switch
                    checked={adminSettings?.force_theme_compliance ?? false}
                    onCheckedChange={(checked) => 
                      handleAdminThemeUpdate({ force_theme_compliance: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Available Themes</Label>
                  <div className="flex flex-wrap gap-2">
                    {themePresets.map(theme => (
                      <div
                        key={theme.name}
                        className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                          adminSettings?.available_themes?.includes(theme.name)
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                          const current = adminSettings?.available_themes || [];
                          const updated = current.includes(theme.name)
                            ? current.filter(t => t !== theme.name)
                            : [...current, theme.name];
                          handleAdminThemeUpdate({ available_themes: updated });
                        }}
                      >
                        {theme.displayName}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click themes to toggle availability for users
                  </p>
                </div>

                <div className="pt-4">
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={handleForceCompliance}
                    className="w-full"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Force Compliance for All Users
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme Change Frequency */}
            <Card>
              <CardHeader>
                <CardTitle>Theme Change Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Change Frequency Limit</Label>
                  <FormControl fullWidth size="small">
                    <InputLabel>Frequency</InputLabel>
                    <MuiSelect
                      value={adminSettings?.theme_change_frequency_limit || 'daily'}
                      label="Frequency"
                      onChange={(e) => 
                        handleAdminThemeUpdate({ theme_change_frequency_limit: e.target.value })
                      }
                    >
                      <MenuItem value="none">No Limit</MenuItem>
                      <MenuItem value="hourly">Once per Hour</MenuItem>
                      <MenuItem value="daily">Once per Day</MenuItem>
                      <MenuItem value="weekly">Once per Week</MenuItem>
                      <MenuItem value="monthly">Once per Month</MenuItem>
                    </MuiSelect>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Prevent excessive theme switching that could impact performance
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeThemeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Theme Usage Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{themeStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Active chat users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Custom Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{themeStats.usingCustomThemes}</div>
                <p className="text-xs text-muted-foreground mt-1">Users with custom themes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Most Popular</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 capitalize">
                  {themeStats.mostPopularTheme}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Preferred theme</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {adminSettings?.force_theme_compliance ? '100%' : '---'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {adminSettings?.force_theme_compliance ? 'Enforced' : 'Optional'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Theme Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Theme Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {themeStats.themeDistribution.length > 0 ? (
                <div className="space-y-3">
                  {themeStats.themeDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {themePresets.find(t => t.name === item.theme)?.colors && (
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ 
                                backgroundColor: themePresets.find(t => t.name === item.theme)?.colors.primary 
                              }}
                            />
                          )}
                        </div>
                        <span className="capitalize font-medium">{item.theme}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(item.count / themeStats.totalUsers) * 100}%` }}
                          >
                          </div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {item.count}
                        </span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {Math.round((item.count / themeStats.totalUsers) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No theme usage data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Preview Tab */}
      {activeThemeTab === 'live-preview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Theme Preview</CardTitle>
              <CardDescription>
                Preview how different themes will look in the chat interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview Theme</Label>
                  <FormControl size="small">
                    <InputLabel>Theme</InputLabel>
                    <MuiSelect
                      value={previewTheme}
                      label="Theme"
                      onChange={(e) => setPreviewTheme(e.target.value)}
                      className="w-48"
                    >
                      {themePresets.map(theme => (
                        <MenuItem key={theme.name} value={theme.name}>
                          {theme.displayName}
                        </MenuItem>
                      ))}
                    </MuiSelect>
                  </FormControl>
                </div>
              </div>

              {/* Live Preview Panel */}
              <div className="border rounded-lg overflow-hidden">
                <div 
                  className="h-96 p-4 transition-all duration-500"
                  style={{
                    backgroundColor: themePresets.find(t => t.name === previewTheme)?.colors.background,
                    color: themePresets.find(t => t.name === previewTheme)?.colors.text_primary
                  }}
                >
                  {/* Mock Chat Interface */}
                  <div className="flex h-full">
                    {/* Sidebar */}
                    <div 
                      className="w-1/3 border-r p-3 space-y-2"
                      style={{
                        backgroundColor: themePresets.find(t => t.name === previewTheme)?.colors.sidebar,
                        borderColor: themePresets.find(t => t.name === previewTheme)?.colors.border
                      }}
                    >
                      <div className="text-sm font-medium mb-3">Channels</div>
                      {['general', 'development', 'support'].map(channel => (
                        <div key={channel} className="flex items-center gap-2 p-2 rounded text-sm">
                          <Hash className="w-4 h-4 text-green-500" />
                          <span>{channel}</span>
                        </div>
                      ))}
                      
                      <div className="text-sm font-medium mb-3 mt-6">Direct Messages</div>
                      {['John Doe', 'Jane Smith'].map(user => (
                        <div key={user} className="flex items-center gap-2 p-2 rounded text-sm">
                          <div className="w-6 h-6 rounded-full bg-gray-400"></div>
                          <span>{user}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col">
                      <div className="border-b p-3" style={{ borderColor: themePresets.find(t => t.name === previewTheme)?.colors.border }}>
                        <div className="font-medium">#general</div>
                        <div className="text-xs text-gray-500">3 members</div>
                      </div>
                      
                      <div className="flex-1 p-3 space-y-3">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex-shrink-0"></div>
                          <div>
                            <div className="font-medium text-sm">John Doe</div>
                            <div className="text-sm">Welcome to the preview! This is how messages will look in the {previewTheme} theme.</div>
                            <div className="text-xs text-gray-500 mt-1">2:45 PM</div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-400 flex-shrink-0"></div>
                          <div>
                            <div className="font-medium text-sm">Admin</div>
                            <div className="text-sm">Theme colors and spacing look great!</div>
                            <div className="text-xs text-gray-500 mt-1">2:46 PM</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t p-3" style={{ borderColor: themePresets.find(t => t.name === previewTheme)?.colors.border }}>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Type a message..."
                            className="flex-1 p-2 border rounded text-sm"
                            style={{
                              backgroundColor: themePresets.find(t => t.name === previewTheme)?.colors.surface,
                              borderColor: themePresets.find(t => t.name === previewTheme)?.colors.border
                            }}
                          />
                          <Button size="sm" style={{ backgroundColor: themePresets.find(t => t.name === previewTheme)?.colors.primary }}>Send</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Widget Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Chat Widget Settings</CardTitle>
                <CardDescription>Configure the floating chat widget behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Master Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Internal Chat Widget</Label>
                    <p className="text-xs text-muted-foreground">Show floating chat widget on internal admin/staff pages (excludes public portal)</p>
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

                {/* Widget Shape */}
                <div className="space-y-2">
                  <FormControl fullWidth size="small">
                    <InputLabel className="text-sm font-medium">Widget Shape</InputLabel>
                    <MuiSelect
                      value={settings.widget_shape}
                      label="Widget Shape"
                      onChange={(e) => updateSetting('widget_shape', e.target.value)}
                    >
                      <MenuItem value="round">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          Round
                        </div>
                      </MenuItem>
                      <MenuItem value="rounded-square">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-lg"></div>
                          Rounded Square
                        </div>
                      </MenuItem>
                      <MenuItem value="square">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded-none"></div>
                          Square
                        </div>
                      </MenuItem>
                    </MuiSelect>
                  </FormControl>
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
                </div>

                {/* Widget Button Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Widget Button Image</Label>
                  <p className="text-xs text-muted-foreground mb-3">Custom image for the floating chat widget button (replaces default chat icon)</p>
                  <div className="flex items-center gap-4">
                    {/* Current Widget Icon Preview */}
                    <div className="flex-shrink-0">
                      <div 
                        className={`w-10 h-10 border-2 border-gray-300 flex items-center justify-center text-white ${
                          settings.widget_shape === 'round' ? 'rounded-full' :
                          settings.widget_shape === 'square' ? 'rounded-none' : 'rounded-lg'
                        }`}
                        style={{ backgroundColor: settings.widget_primary_color }}
                      >
                        {settings.widget_button_image ? (
                          <img 
                            src={settings.widget_button_image} 
                            alt="Widget icon preview" 
                            className="w-6 h-6 object-cover"
                            style={{
                              borderRadius: settings.widget_shape === 'round' ? '50%' :
                                          settings.widget_shape === 'square' ? '0' : '4px'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling!.style.display = 'inline';
                            }}
                          />
                        ) : null}
                        <MessageCircle 
                          className="h-6 w-6" 
                          style={{ display: settings.widget_button_image ? 'none' : 'inline' }}
                        />
                      </div>
                    </div>

                    {/* Widget Image URL Input & File Upload */}
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Enter widget button image URL or paste data URL"
                        value={settings.widget_button_image || ''}
                        onChange={(e) => updateSetting('widget_button_image', e.target.value)}
                        className="w-full"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;

                            // Validate file type
                            if (!file.type.startsWith('image/')) {
                              alert('Please select a valid image file.');
                              return;
                            }

                            // Validate file size (max 2MB)
                            const maxSize = 2 * 1024 * 1024; // 2MB
                            if (file.size > maxSize) {
                              alert('Image size must be less than 2MB.');
                              return;
                            }

                            // Convert to data URL
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              const dataUrl = e.target?.result as string;
                              if (dataUrl) {
                                updateSetting('widget_button_image', dataUrl);
                              }
                            };
                            reader.onerror = () => {
                              alert('Error reading the image file.');
                            };
                            reader.readAsDataURL(file);

                            // Clear the input so the same file can be uploaded again
                            event.target.value = '';
                          }}
                          className="hidden"
                          id="widget-image-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('widget-image-upload')?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Image
                        </Button>
                        <span className="text-xs text-muted-foreground">Or enter URL above</span>
                      </div>
                    </div>

                    {/* Clear Widget Image Button */}
                    {settings.widget_button_image && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateSetting('widget_button_image', '')}
                        className="flex-shrink-0"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> Use a square image (100x100px or larger) for best results. 
                    Upload a file (max 2MB) or enter an image URL. This replaces the default chat bubble icon.
                  </div>
                </div>

                {/* Widget Default State */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Widget Default State</Label>
                  <p className="text-xs text-muted-foreground mb-3">Choose whether the widget loads expanded or minimized when users visit pages</p>
                  <FormControl fullWidth size="small">
                    <InputLabel>Default State</InputLabel>
                    <MuiSelect
                      value={settings.widget_default_state || 'minimized'}
                      onChange={(e) => updateSetting('widget_default_state', e.target.value)}
                      label="Default State"
                    >
                      <MenuItem value="minimized">
                        <div className="flex items-center gap-2">
                          <Minimize2 className="h-4 w-4" />
                          Minimized - Show as floating button
                        </div>
                      </MenuItem>
                      <MenuItem value="open">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Open - Show expanded chat widget
                        </div>
                      </MenuItem>
                    </MuiSelect>
                  </FormControl>
                  <div className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> "Minimized" is less intrusive and recommended for most websites. 
                    "Open" shows the full chat widget immediately but may distract users.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Widget Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Widget Preview</CardTitle>
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
                      {settings.widget_button_image ? (
                        <img 
                          src={settings.widget_avatar_image} 
                          alt="Widget button preview" 
                          className="w-7 h-7 object-cover"
                          style={{
                            borderRadius: settings.widget_shape === 'round' ? '50%' :
                                        settings.widget_shape === 'square' ? '0' : '6px'
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'inline';
                          }}
                        />
                      ) : null}
                      <MessageCircle 
                        className="h-6 w-6" 
                        style={{ display: settings.widget_avatar_image ? 'none' : 'inline' }}
                      />
                    </div>
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      3
                    </Badge>
                  </div>

                  <div className="absolute top-4 left-4 text-sm text-gray-600 dark:text-gray-400">
                    Widget Preview
                  </div>
                  
                  <div className="absolute bottom-16 left-4 right-4 text-xs text-gray-500 text-center">
                    Theme: {previewTheme} • Position: {settings.widget_position}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
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
    widget_shape: 'round',
    widget_primary_color: '#1976d2',
    widget_secondary_color: '#6c757d',
    widget_theme: 'light',
    widget_button_image: '',
    chat_system_enabled: true,
    notification_sounds_enabled: true,
    read_receipts_enabled: true,
    file_sharing_enabled: true,
    gif_picker_enabled: true,
    show_unread_badges: true,
    unread_badge_color: '#dc3545',
    unread_badge_text_color: '#ffffff',
    unread_badge_style: 'rounded',
    unread_badge_position: 'right',
    show_zero_counts: false,
    show_channel_member_count: false,
    show_typing_indicators: true,
    show_online_status: true,
    message_grouping_enabled: true,
    timestamp_format: 'relative',
  });
  // Initialize with empty state - real data will be loaded from API
  const [stats, setStats] = useState<SystemStats>({
    socketio_status: 'disconnected',
    socketio_port: 3001,
    socketio_uptime: '0m',
    users_online: 0,
    users_away: 0,
    users_busy: 0,
    users_offline: 0,
    active_users: 0,
    total_channels: 0,
    messages_per_hour: 0,
    storage_used_mb: 0,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Users tab state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Channels tab state
  const [channels, setChannels] = useState<any[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [newChannelData, setNewChannelData] = useState({
    name: '',
    description: '',
    type: 'public_channel',
    is_read_only: false,
    members: [] as string[],
    broadcast_permissions: [] as string[]
  });
  
  // Member management state
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberManagement, setShowMemberManagement] = useState(false);

  // Monitor tab state
  const [monitoredMessages, setMonitoredMessages] = useState<MonitoredMessage[]>([]);
  const [messageFilters, setMessageFilters] = useState<MessageFilters>({
    channel_id: '',
    user_id: '',
    time_range: '24h',
    message_type: ''
  });
  const [filterChannels, setFilterChannels] = useState<Array<{id: number; name: string; type: string}>>([]);
  const [filterUsers, setFilterUsers] = useState<Array<{username: string; display_name: string}>>([]);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorPagination, setMonitorPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });

  // Load settings on mount
  useEffect(() => {
    checkAdminAccess();
    loadChatSettings();
    loadSystemStats();
    loadWidgetSettings();
    loadChannels();
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

      const result = await apiClient.getCurrentUser();
      const user = result.data?.user || result.data;
      
      console.log('🔍 Chat Management - checking permissions for:', user?.display_name);
      console.log('🔍 Chat Management - permissions:', user?.permissions?.length, 'total');
      console.log('🔍 Chat Management - role:', user?.role);
        
        // Check if user has chat management permissions
        const hasPermission = user?.permissions?.includes('chat.manage_system') || 
                             user?.permissions?.includes('admin.system_settings') ||
                             user?.permissions?.includes('admin.manage_chat_channels') ||
                             user?.role === 'admin';

        console.log('🔍 Chat Management - has permission:', hasPermission);

        if (!hasPermission) {
          console.log('❌ Chat Management - insufficient permissions, redirecting to access denied');
          window.location.href = '/access-denied?requested=Chat Management System';
          return;
        }
        
        console.log('✅ Chat Management - access granted');
        
        setCurrentUser(user);
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
      const result = await apiClient.getChatSettings();
      // Merge with existing settings to preserve widget settings loaded separately
      setSettings(prev => ({ ...prev, ...result.data }));
    } catch (error) {
      console.error('Failed to load chat settings:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const result = await apiClient.getChatStats('24h');
      console.log('🔢 Real metrics loaded:', result.data);
      setStats(result.data);
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const loadWidgetSettings = async () => {
    try {
      const result = await apiClient.getWidgetSettings();
      const data = result.data;
        // Map API response to our settings structure
        setSettings(prev => ({
          ...prev,
          widget_enabled: data.enabled,
          widget_position: data.position,
          widget_shape: data.shape,
          widget_primary_color: data.primaryColor,
          widget_theme: data.theme
        }));
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }
  };

  const updateSetting = (key: keyof ChatSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };


  const saveWidgetSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const widgetPayload = {
        enabled: settings.widget_enabled,
        position: settings.widget_position,
        shape: settings.widget_shape,
        primaryColor: settings.widget_primary_color,
        theme: settings.widget_theme
      };

      const response = await fetch('/api/admin/chat/widget-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(widgetPayload),
      });

      if (!response.ok) {
        console.error('Failed to save widget settings:', response.status);
      }
    } catch (error) {
      console.error('Error saving widget settings:', error);
    }
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

      // Save both chat settings and widget settings
      const [chatResponse] = await Promise.all([
        fetch('/api/admin/chat/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(settings),
        }),
        saveWidgetSettings()
      ]);

      if (chatResponse.ok) {
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
      const result = await apiClient.getChatUsers();
      setUsers(result.data.users || []);
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

  // Channel management functions
  const loadChannels = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/channels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const createChannel = async () => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: (newChannelData.name || 'unnamed').toLowerCase().replace(/\s+/g, '-'),
          description: newChannelData.description,
          type: newChannelData.type,
          is_read_only: newChannelData.is_read_only
        })
      });

      if (response.ok) {
        await loadChannels();
        setShowCreateChannelModal(false);
        setNewChannelData({
          name: '',
          description: '',
          type: 'public_channel',
          is_read_only: false,
          members: [],
          broadcast_permissions: []
        });
        alert('Channel created successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to create channel: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Error occurred while creating channel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateChannel = async () => {
    if (!selectedChannel) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/chat/channels/${selectedChannel.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: (selectedChannel.name || 'unnamed').toLowerCase().replace(/\s+/g, '-'),
          description: selectedChannel.description,
          is_read_only: selectedChannel.is_read_only
        })
      });

      if (response.ok) {
        await loadChannels();
        setShowEditChannelModal(false);
        setSelectedChannel(null);
        alert('Channel updated successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to update channel: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating channel:', error);
      alert('Error occurred while updating channel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Delete channel #${channelName}? This action cannot be undone.`)) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/chat/channels/${channelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadChannels();
        alert(`Channel #${channelName} deleted successfully!`);
      } else {
        const error = await response.json();
        alert(`Failed to delete channel: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
      alert('Error occurred while deleting channel.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Channel member management functions
  const loadChannelMembers = async (channelId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/chat/channels/${channelId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setChannelMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading channel members:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading available users:', error);
    }
  };

  const addChannelMember = async (channelId: string, userId: string) => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/chat/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          role: 'member'
        })
      });

      if (response.ok) {
        await loadChannelMembers(channelId);
        await loadChannels(); // Refresh channel list to update member counts
        alert('Member added successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to add member: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding channel member:', error);
      alert('Error occurred while adding member.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeChannelMember = async (channelId: string, userId: string) => {
    if (!confirm('Remove this member from the channel?')) return;
    
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/chat/channels/${channelId}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadChannelMembers(channelId);
        await loadChannels(); // Refresh channel list to update member counts
        alert('Member removed successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to remove member: ${error.error}`);
      }
    } catch (error) {
      console.error('Error removing channel member:', error);
      alert('Error occurred while removing member.');
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
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleTimeString('en-US', {
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
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Message monitoring functions
  const loadMonitoredMessages = async (loadMore = false) => {
    if (!currentUser?.permissions?.includes('chat.monitor_all') && 
        !currentUser?.permissions?.includes('chat.view_all_messages') && 
        currentUser?.role !== 'admin') {
      return; // No permission
    }

    try {
      setMonitorLoading(true);
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams({
        limit: monitorPagination.limit.toString(),
        offset: loadMore ? monitorPagination.offset.toString() : '0',
        time_range: messageFilters.time_range
      });

      if (messageFilters.channel_id) params.append('channel_id', messageFilters.channel_id);
      if (messageFilters.user_id) params.append('user_id', messageFilters.user_id);
      if (messageFilters.message_type) params.append('message_type', messageFilters.message_type);

      const response = await fetch(`/api/admin/chat/messages?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (loadMore) {
          setMonitoredMessages(prev => [...prev, ...data.messages]);
        } else {
          setMonitoredMessages(data.messages);
          setFilterChannels(data.filters.channels);
          setFilterUsers(data.filters.users);
        }

        setMonitorPagination({
          total: data.pagination.total,
          limit: data.pagination.limit,
          offset: loadMore ? monitorPagination.offset + data.pagination.limit : data.pagination.offset,
          hasMore: data.pagination.hasMore
        });
      } else {
        console.error('Failed to load monitored messages:', response.status);
      }
    } catch (error) {
      console.error('Error loading monitored messages:', error);
    } finally {
      setMonitorLoading(false);
    }
  };

  const handleFilterChange = (key: keyof MessageFilters, value: string) => {
    setMessageFilters(prev => ({ ...prev, [key]: value }));
    setMonitorPagination(prev => ({ ...prev, offset: 0 })); // Reset offset when filtering
  };

  const exportMessages = async (format: 'csv' | 'json') => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        format,
        time_range: messageFilters.time_range
      });

      if (messageFilters.channel_id) params.append('channel_id', messageFilters.channel_id);
      if (messageFilters.user_id) params.append('user_id', messageFilters.user_id);

      const response = await fetch(`/api/admin/chat/messages/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition ? 
          contentDisposition.split('filename=')[1].replace(/"/g, '') : 
          `chat_messages.${format}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export messages');
      }
    } catch (error) {
      console.error('Error exporting messages:', error);
      alert('Error occurred while exporting messages');
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Unknown';
    }
  };

  const getChannelDisplayName = (message: MonitoredMessage) => {
    if (message.channel_type === 'direct_message') {
      return `DM: ${message.channel_name}`;
    } else if (message.channel_type === 'group_chat') {
      return `Group: ${message.channel_name}`;
    } else {
      return `#${message.channel_name}`;
    }
  };

  // Safe date formatting for admin interface
  const safeFormatDate = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString();
    } catch (error) {
      console.warn('Invalid timestamp in admin chat management:', timestamp, error);
      return 'Unknown';
    }
  };

  // Computed values for Users tab
  const filteredUsers = users.filter(user =>
    (user.display_name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(userSearchQuery.toLowerCase())
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

  // Load monitored messages when filters change
  useEffect(() => {
    if (currentUser?.permissions?.includes('chat.monitor_all') || 
        currentUser?.permissions?.includes('chat.view_all_messages') || 
        currentUser?.role === 'admin') {
      loadMonitoredMessages();
    }
  }, [messageFilters, currentUser]);

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
    <ThemeSystemProvider>
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
        <TabsList className="flex w-full justify-start space-x-1">
          <TabsTrigger value="dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="widget">
            <Palette className="h-4 w-4 mr-2" />
            UI Customization
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="channels" 
            className={!currentUser?.permissions?.includes('admin.manage_chat_channels') ? 'hidden' : ''}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Channels
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
                <div className="flex items-center gap-3 mb-2">
                  <Badge 
                    variant={stats.socketio_status === 'connected' ? 'default' : 'destructive'}
                    className="flex items-center gap-1"
                  >
                    {stats.socketio_status === 'connected' ? (
                      <>
                        <Wifi className="h-3 w-3" />
                        Connected
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </div>
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
                  <Label className="text-sm font-medium">Internal Chat System Enabled</Label>
                  <p className="text-xs text-muted-foreground">Master toggle for all internal chat functionality (Socket.io, messaging, channels)</p>
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

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Typing Indicators</Label>
                  <p className="text-xs text-muted-foreground">Show when users are typing messages</p>
                </div>
                <Switch
                  checked={settings.show_typing_indicators}
                  onCheckedChange={(checked) => updateSetting('show_typing_indicators', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Health & Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                System Health & Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date/Timestamp Validation</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    All chat components now use safe date formatting to prevent "Invalid time value" errors.
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Protected against invalid timestamps</span>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Error Monitoring</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Invalid timestamps are logged to console with warnings for debugging.
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Check browser console for timestamp warnings</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <Label className="text-sm font-medium">Components Updated</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <div className="text-xs flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    ChatWidget (safe date formatting)
                  </div>
                  <div className="text-xs flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    MessageArea (timestamp validation)
                  </div>
                  <div className="text-xs flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    Admin Chat Management (safe formatting)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Customization Tab */}
        <TabsContent value="widget" className="space-y-6">
          <ThemeManagementTab 
            settings={settings}
            updateSetting={updateSetting}
            currentUser={currentUser}
          />
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

        {/* Channels Management Tab */}
        {currentUser?.permissions?.includes('admin.manage_chat_channels') && (
          <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Channels Management
              </CardTitle>
              <Button 
                onClick={() => setShowCreateChannelModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Channel
              </Button>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-4">
                <Input
                  placeholder="Search channels..."
                  value={channelSearchQuery}
                  onChange={(e) => setChannelSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>

              {/* Channels List */}
              <div className="space-y-2">
                {channels
                  .filter(channel => 
                    (channel.name || '').toLowerCase().includes(channelSearchQuery.toLowerCase()) ||
                    (channel.description || '').toLowerCase().includes(channelSearchQuery.toLowerCase())
                  )
                  .map(channel => (
                    <div key={channel.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">#{channel.name}</h3>
                              <Badge variant={channel.type === 'public_channel' ? 'default' : 'secondary'}>
                                {channel.type === 'public_channel' ? 'Public' : 'Private'}
                              </Badge>
                              {channel.is_read_only && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Read-Only
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span>Created: {safeFormatDate(channel.created_at)}</span>
                              <span>Members: {channel.member_count || 0}</span>
                              <span>Messages: {channel.message_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedChannel(channel);
                            loadChannelMembers(channel.id);
                            loadAvailableUsers();
                            setShowMemberManagement(true);
                          }}
                          title="Manage Members"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedChannel(channel);
                            setShowEditChannelModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteChannel(channel.id, channel.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                
                {channels.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No channels found. Create your first channel to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Channel Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{channels.length}</div>
                  <div className="text-sm text-gray-600">Total Channels</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {channels.filter(c => c.type === 'public_channel').length}
                  </div>
                  <div className="text-sm text-gray-600">Public Channels</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {channels.filter(c => c.type === 'private_channel').length}
                  </div>
                  <div className="text-sm text-gray-600">Private Channels</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {channels.filter(c => c.is_read_only).length}
                  </div>
                  <div className="text-sm text-gray-600">Read-Only</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Monitor Tab */}
        <TabsContent value="monitor">
          {/* Check for monitor permission */}
          {(!currentUser?.permissions?.includes('chat.monitor_all') && 
            !currentUser?.permissions?.includes('chat.view_all_messages') && 
            currentUser?.role !== 'admin') ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Message Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">Access Denied</p>
                  <p className="text-sm text-muted-foreground">You need the <code>chat.monitor_all</code> or <code>chat.view_all_messages</code> permission to access message monitoring.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Message Monitoring Controls */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      <div>
                        <CardTitle>Message Monitoring</CardTitle>
                        <CardDescription>Monitor and export chat messages across all channels</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportMessages('csv')}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportMessages('json')}
                        className="flex items-center gap-2"
                      >
                        <Database className="h-4 w-4" />
                        Export JSON
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="font-medium text-sm">Filters:</span>
                    </div>
                    
                    {/* Channel Filter */}
                    <FormControl size="small">
                      <InputLabel>Channel</InputLabel>
                      <MuiSelect
                        value={messageFilters.channel_id}
                        onChange={(e) => handleFilterChange('channel_id', e.target.value)}
                        label="Channel"
                        className="min-w-[150px]"
                      >
                        <MenuItem value="">All Channels</MenuItem>
                        {filterChannels.map(channel => (
                          <MenuItem key={channel.id} value={channel.id.toString()}>
                            {channel.type === 'direct_message' ? `DM: ${channel.name}` : 
                             channel.type === 'group_chat' ? `Group: ${channel.name}` : 
                             `#${channel.name}`}
                          </MenuItem>
                        ))}
                      </MuiSelect>
                    </FormControl>

                    {/* Time Range Filter */}
                    <FormControl size="small">
                      <InputLabel>Time Range</InputLabel>
                      <MuiSelect
                        value={messageFilters.time_range}
                        onChange={(e) => handleFilterChange('time_range', e.target.value)}
                        label="Time Range"
                        className="min-w-[120px]"
                      >
                        <MenuItem value="1h">Last Hour</MenuItem>
                        <MenuItem value="24h">Last 24 Hours</MenuItem>
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                        <MenuItem value="all">All Time</MenuItem>
                      </MuiSelect>
                    </FormControl>

                    {/* User Filter */}
                    <FormControl size="small">
                      <InputLabel>User</InputLabel>
                      <MuiSelect
                        value={messageFilters.user_id}
                        onChange={(e) => handleFilterChange('user_id', e.target.value)}
                        label="User"
                        className="min-w-[150px]"
                      >
                        <MenuItem value="">All Users</MenuItem>
                        {filterUsers.map(user => (
                          <MenuItem key={user.username} value={user.username}>
                            {user.display_name}
                          </MenuItem>
                        ))}
                      </MuiSelect>
                    </FormControl>

                    {/* Message Type Filter */}
                    <FormControl size="small">
                      <InputLabel>Type</InputLabel>
                      <MuiSelect
                        value={messageFilters.message_type}
                        onChange={(e) => handleFilterChange('message_type', e.target.value)}
                        label="Type"
                        className="min-w-[100px]"
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <MenuItem value="text">Text</MenuItem>
                        <MenuItem value="file">File</MenuItem>
                        <MenuItem value="system">System</MenuItem>
                      </MuiSelect>
                    </FormControl>
                  </div>

                  {/* Messages List */}
                  <div className="space-y-4">
                    {monitorLoading && monitoredMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                        <p className="text-muted-foreground">Loading messages...</p>
                      </div>
                    ) : monitoredMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No messages found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground mb-4">
                          Showing {monitoredMessages.length} of {monitorPagination.total} messages
                        </div>
                        
                        {monitoredMessages.map((message) => (
                          <div key={message.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {message.channel_type === 'direct_message' ? (
                                    <Users className="h-4 w-4 text-blue-500" />
                                  ) : message.channel_type === 'group_chat' ? (
                                    <MessageSquare className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Hash className="h-4 w-4 text-gray-500" />
                                  )}
                                  <span className="font-medium text-sm">
                                    {getChannelDisplayName(message)}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {message.message_type}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <span className="font-medium text-sm">
                                {message.user_display_name || message.user_id}:
                              </span>
                              <span className="ml-2 text-sm">
                                {message.file_attachment ? (
                                  <div className="flex items-center gap-2 text-blue-600">
                                    <Upload className="h-4 w-4" />
                                    File attachment: {message.message_text}
                                  </div>
                                ) : (
                                  message.message_text
                                )}
                              </span>
                            </div>

                            {message.edited_at && (
                              <div className="text-xs text-muted-foreground">
                                Edited: {formatMessageTime(message.edited_at)}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Load More Button */}
                        {monitorPagination.hasMore && (
                          <div className="text-center pt-4">
                            <Button
                              variant="outline"
                              onClick={() => loadMonitoredMessages(true)}
                              disabled={monitorLoading}
                              className="flex items-center gap-2"
                            >
                              {monitorLoading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                  Load More
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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

      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Channel
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Channel Name</Label>
                <Input
                  id="channel-name"
                  value={newChannelData.name}
                  onChange={(e) => setNewChannelData({...newChannelData, name: e.target.value})}
                  placeholder="e.g., project-alpha"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Channel names will be converted to lowercase with dashes
                </p>
              </div>

              <div>
                <Label htmlFor="channel-description">Description</Label>
                <Input
                  id="channel-description"
                  value={newChannelData.description}
                  onChange={(e) => setNewChannelData({...newChannelData, description: e.target.value})}
                  placeholder="Brief description of the channel purpose"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="channel-type">Channel Type</Label>
                <FormControl fullWidth size="small" className="mt-1">
                  <MuiSelect
                    value={newChannelData.type}
                    onChange={(e) => setNewChannelData({...newChannelData, type: e.target.value as any})}
                  >
                    <MenuItem value="public_channel">Public Channel - Everyone can join</MenuItem>
                    <MenuItem value="private_channel">Private Channel - Invite only</MenuItem>
                  </MuiSelect>
                </FormControl>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="read-only"
                  checked={newChannelData.is_read_only}
                  onCheckedChange={(checked) => setNewChannelData({...newChannelData, is_read_only: checked})}
                />
                <Label htmlFor="read-only" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Read-Only Channel
                </Label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateChannelModal(false);
                  setNewChannelData({
                    name: '',
                    description: '',
                    type: 'public_channel',
                    is_read_only: false,
                    members: [],
                    broadcast_permissions: []
                  });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createChannel}
                disabled={!newChannelData.name.trim() || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Creating...' : 'Create Channel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {showEditChannelModal && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Channel: #{selectedChannel.name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-channel-name">Channel Name</Label>
                <Input
                  id="edit-channel-name"
                  value={selectedChannel.name}
                  onChange={(e) => setSelectedChannel({...selectedChannel, name: e.target.value})}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-channel-description">Description</Label>
                <Input
                  id="edit-channel-description"
                  value={selectedChannel.description || ''}
                  onChange={(e) => setSelectedChannel({...selectedChannel, description: e.target.value})}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-read-only"
                  checked={selectedChannel.is_read_only}
                  onCheckedChange={(checked) => setSelectedChannel({...selectedChannel, is_read_only: checked})}
                />
                <Label htmlFor="edit-read-only" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Read-Only Channel
                </Label>
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageSquare className="h-4 w-4" />
                  Channel Info
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <p>Type: {selectedChannel.type === 'public_channel' ? 'Public' : 'Private'}</p>
                  <p>Created: {safeFormatDate(selectedChannel.created_at)}</p>
                  <p>Members: {selectedChannel.member_count || 0}</p>
                  <p>Messages: {selectedChannel.message_count || 0}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditChannelModal(false);
                  setSelectedChannel(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={updateChannel}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Updating...' : 'Update Channel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberManagement && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Manage Members: #{selectedChannel.name}
              </h2>
              <Button
                variant="outline"
                onClick={() => {
                  setShowMemberManagement(false);
                  setSelectedChannel(null);
                  setChannelMembers([]);
                  setMemberSearchQuery('');
                }}
              >
                Close
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Members */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Current Members ({channelMembers.length})
                </h3>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {channelMembers.map(member => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{member.display_name}</div>
                        <div className="text-sm text-gray-500">{member.user_id}</div>
                        <div className="text-xs text-gray-400">
                          {member.role} • Joined {safeFormatDate(member.joined_at)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeChannelMember(selectedChannel.id, member.user_id)}
                        disabled={member.role === 'owner'}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {channelMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No members in this channel yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Members */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Add Members</h3>
                
                <div className="mb-4">
                  <Input
                    placeholder="Search users..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableUsers
                    .filter(user => 
                      user.active && 
                      !channelMembers.some(member => member.user_id === user.username) &&
                      ((user.display_name || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                       (user.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                       (user.email || '').toLowerCase().includes(memberSearchQuery.toLowerCase()))
                    )
                    .map(user => (
                      <div key={user.username} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addChannelMember(selectedChannel.id, user.username)}
                          disabled={isProcessing}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                  {availableUsers.filter(user => 
                    user.active && 
                    !channelMembers.some(member => member.user_id === user.username) &&
                    ((user.display_name || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                     (user.username || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                     (user.email || '').toLowerCase().includes(memberSearchQuery.toLowerCase()))
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{memberSearchQuery ? 'No users found matching your search.' : 'All active users are already members.'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Channel Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Channel Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> #{selectedChannel.name}</p>
                <p><strong>Type:</strong> {selectedChannel.type === 'public_channel' ? 'Public' : 'Private'}</p>
                <p><strong>Description:</strong> {selectedChannel.description || 'No description'}</p>
                <p><strong>Read-Only:</strong> {selectedChannel.is_read_only ? 'Yes' : 'No'}</p>
                <p><strong>Total Members:</strong> {channelMembers.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </TooltipProvider>
    </ThemeSystemProvider>
  );
}