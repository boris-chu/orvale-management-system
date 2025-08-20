'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  ArrowLeft,
  Save,
  RefreshCw,
  TestTube,
  RotateCcw,
  Shield,
  Mail,
  Palette,
  FormInput,
  Zap,
  Lock,
  ChevronDown,
  LogOut,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  Database,
  Bell,
  Eye,
  Heart,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PortalSettings {
  form_fields: {
    name_required: boolean;
    email_required: boolean;
    phone_required: boolean;
    employee_number_required: boolean;
    office_required: boolean;
    section_required: boolean;
    location_required: boolean;
    priority_enabled: boolean;
    attachments_enabled: boolean;
    max_attachments: number;
    max_file_size: number;
    allowed_file_types: string[];
  };
  display: {
    portal_title: string;
    portal_description: string;
    theme_color: string;
    logo_url: string;
    show_category_descriptions: boolean;
    show_estimated_response_time: boolean;
    enable_dark_mode: boolean;
    items_per_page: number;
  };
  notifications: {
    send_confirmation_email: boolean;
    send_status_updates: boolean;
    send_completion_notification: boolean;
    email_template_confirmation: string;
    email_template_status_update: string;
    email_template_completion: string;
    sla_response_time_hours: number;
    sla_resolution_time_hours: number;
    escalation_enabled: boolean;
    escalation_threshold_hours: number;
  };
  integrations: {
    enable_api_access: boolean;
    api_rate_limit: number;
    webhook_url: string;
    enable_webhook: boolean;
    external_knowledge_base_url: string;
    enable_chat_support: boolean;
    enable_remote_assistance: boolean;
  };
  security: {
    enable_captcha: boolean;
    enable_file_scanning: boolean;
    allowed_domains: string[];
    blocked_domains: string[];
    enable_ip_restrictions: boolean;
    allowed_ip_ranges: string[];
    session_timeout_minutes: number;
    max_login_attempts: number;
    enable_audit_logging: boolean;
  };
  user_experience: {
    enable_form_data_caching: boolean;
    form_cache_duration_days: number;
    enable_auto_save_drafts: boolean;
    enable_form_progress_indicator: boolean;
    enable_smart_form_completion: boolean;
  };
  advanced: {
    enable_auto_assignment: boolean;
    enable_smart_routing: boolean;
    enable_duplicate_detection: boolean;
    auto_close_resolved_after_days: number;
    enable_satisfaction_survey: boolean;
    enable_knowledge_base_suggestions: boolean;
    enable_priority_escalation: boolean;
    portal_maintenance_mode: boolean;
    portal_maintenance_message: string;
    portal_maintenance_contact: string;
    portal_maintenance_estimated_end: string;
    allow_queue_access_during_maintenance: boolean;
    show_system_status_page: boolean;
  };
}

export default function PortalSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'warning'} | null>(null);
  const [activeTab, setActiveTab] = useState('form_fields');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadSettings();
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
      
      // Check permissions for portal settings
      const hasPermission = userData.role === 'admin' ||
                           userData.permissions?.includes('portal.manage_settings') ||
                           userData.permissions?.includes('admin.system_settings');
      
      if (!hasPermission) {
        router.push('/developer/portal-management');
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/');
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/portal-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        showNotification('Error loading portal settings', 'error');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('Error loading portal settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/portal-settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        showNotification('Portal settings saved successfully', 'success');
        setHasChanges(false);
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/portal-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'reset_to_defaults' })
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings);
        setHasChanges(false);
        showNotification('Settings reset to defaults', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to reset settings', 'error');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      showNotification('Error resetting settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfiguration = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/portal-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'test_email' })
      });

      if (response.ok) {
        showNotification('Test email sent successfully', 'success');
      } else {
        showNotification('Failed to send test email', 'error');
      }
    } catch (error) {
      console.error('Error testing email:', error);
      showNotification('Error testing email configuration', 'error');
    } finally {
      setTesting(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/');
  };

  const updateSetting = (section: keyof PortalSettings, key: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
    setHasChanges(true);
  };

  const canManageSettings = currentUser?.role === 'admin' ||
                           currentUser?.permissions?.includes('portal.manage_settings') ||
                           currentUser?.permissions?.includes('admin.system_settings');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load portal settings</p>
        </div>
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
                <Settings className="h-8 w-8 mr-3 text-blue-600" />
                Portal Settings
              </h1>
              <p className="text-gray-600 mt-2">
                Configure all aspects of the public ticket submission portal
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
              <Alert className={`${
                notification.type === 'success' ? 'bg-green-50 border-green-200' : 
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                {notification.type === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                <AlertDescription className={
                  notification.type === 'success' ? 'text-green-800' : 
                  notification.type === 'warning' ? 'text-yellow-800' :
                  'text-red-800'
                }>
                  {notification.message}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Bar */}
        {canManageSettings && (
          <div className="mb-6 flex items-center justify-between bg-white rounded-lg border p-4">
            <div className="flex items-center space-x-4">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Eye className="h-3 w-3 mr-1" />
                Live Configuration
              </Badge>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={resetToDefaults}
                disabled={saving}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset to Defaults</span>
              </Button>
              <Button
                onClick={saveSettings}
                disabled={saving || !hasChanges}
                className="flex items-center space-x-2"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="form_fields" className="flex items-center space-x-2">
              <FormInput className="h-4 w-4" />
              <span>Form Fields</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Display</span>
            </TabsTrigger>
            <TabsTrigger value="user_experience" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>User Experience</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>

          {/* Form Fields Tab */}
          <TabsContent value="form_fields" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FormInput className="h-5 w-5 text-blue-600" />
                  <span>Required Form Fields</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(settings.form_fields).filter(([key]) => key.includes('_required')).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={value as boolean}
                        onChange={(e) => updateSetting('form_fields', key, e.target.checked)}
                        className="rounded"
                        disabled={!canManageSettings}
                      />
                      <Label htmlFor={key} className="text-sm">
                        {key.replace('_required', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Toggles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="priority_enabled"
                      checked={settings.form_fields.priority_enabled}
                      onChange={(e) => updateSetting('form_fields', 'priority_enabled', e.target.checked)}
                      className="rounded"
                      disabled={!canManageSettings}
                    />
                    <Label htmlFor="priority_enabled">Enable Priority Selection</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="attachments_enabled"
                      checked={settings.form_fields.attachments_enabled}
                      onChange={(e) => updateSetting('form_fields', 'attachments_enabled', e.target.checked)}
                      className="rounded"
                      disabled={!canManageSettings}
                    />
                    <Label htmlFor="attachments_enabled">Enable File Attachments</Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="max_attachments">Max Attachments</Label>
                    <Input
                      id="max_attachments"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.form_fields.max_attachments}
                      onChange={(e) => updateSetting('form_fields', 'max_attachments', parseInt(e.target.value) || 1)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_file_size">Max File Size (MB)</Label>
                    <Input
                      id="max_file_size"
                      type="number"
                      min="1"
                      max="50"
                      value={settings.form_fields.max_file_size}
                      onChange={(e) => updateSetting('form_fields', 'max_file_size', parseInt(e.target.value) || 1)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="allowed_file_types">Allowed File Types</Label>
                    <Input
                      id="allowed_file_types"
                      value={settings.form_fields.allowed_file_types.join(', ')}
                      onChange={(e) => updateSetting('form_fields', 'allowed_file_types', 
                        e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      )}
                      placeholder="pdf, doc, jpg, png"
                      disabled={!canManageSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-purple-600" />
                  <span>Portal Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="portal_title">Portal Title</Label>
                    <Input
                      id="portal_title"
                      value={settings.display.portal_title}
                      onChange={(e) => updateSetting('display', 'portal_title', e.target.value)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="theme_color">Theme Color</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="theme_color"
                        type="color"
                        value={settings.display.theme_color}
                        onChange={(e) => updateSetting('display', 'theme_color', e.target.value)}
                        className="w-16 h-10"
                        disabled={!canManageSettings}
                      />
                      <Input
                        value={settings.display.theme_color}
                        onChange={(e) => updateSetting('display', 'theme_color', e.target.value)}
                        placeholder="#2563eb"
                        disabled={!canManageSettings}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="portal_description">Portal Description</Label>
                  <Textarea
                    id="portal_description"
                    value={settings.display.portal_description}
                    onChange={(e) => updateSetting('display', 'portal_description', e.target.value)}
                    rows={3}
                    disabled={!canManageSettings}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logo_url">Logo URL</Label>
                    <Input
                      id="logo_url"
                      value={settings.display.logo_url}
                      onChange={(e) => updateSetting('display', 'logo_url', e.target.value)}
                      placeholder="/support.ico"
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="items_per_page">Items Per Page</Label>
                    <Input
                      id="items_per_page"
                      type="number"
                      min="5"
                      max="100"
                      value={settings.display.items_per_page}
                      onChange={(e) => updateSetting('display', 'items_per_page', parseInt(e.target.value) || 10)}
                      disabled={!canManageSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Display Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['show_category_descriptions', 'Show Category Descriptions'],
                    ['show_estimated_response_time', 'Show Estimated Response Time'],
                    ['enable_dark_mode', 'Enable Dark Mode Toggle']
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={settings.display[key as keyof typeof settings.display] as boolean}
                        onChange={(e) => updateSetting('display', key, e.target.checked)}
                        className="rounded"
                        disabled={!canManageSettings}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Experience Tab */}
          <TabsContent value="user_experience" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  <span>Form Data Caching</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable_form_data_caching"
                    checked={settings.user_experience.enable_form_data_caching}
                    onChange={(e) => updateSetting('user_experience', 'enable_form_data_caching', e.target.checked)}
                    className="rounded"
                    disabled={!canManageSettings}
                  />
                  <Label htmlFor="enable_form_data_caching" className="flex-1">
                    Enable Form Data Caching
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Saves user form data locally to improve user experience</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {settings.user_experience.enable_form_data_caching && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pl-6 border-l-2 border-pink-200"
                  >
                    <div>
                      <Label htmlFor="form_cache_duration_days" className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>Cache Duration (Days)</span>
                      </Label>
                      <Input
                        id="form_cache_duration_days"
                        type="number"
                        min="1"
                        max="90"
                        value={settings.user_experience.form_cache_duration_days}
                        onChange={(e) => updateSetting('user_experience', 'form_cache_duration_days', parseInt(e.target.value) || 30)}
                        className="mt-1 max-w-32"
                        disabled={!canManageSettings}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How long to keep cached form data (1-90 days). Default: 30 days.
                      </p>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Privacy Notice:</strong> Form data is stored locally in the user's browser only. 
                        No personal information is sent to servers until form submission. 
                        Cache renews each time the user visits the portal.
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span>Enhanced User Experience</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable_auto_save_drafts"
                      checked={settings.user_experience.enable_auto_save_drafts}
                      onChange={(e) => updateSetting('user_experience', 'enable_auto_save_drafts', e.target.checked)}
                      className="rounded"
                      disabled={!canManageSettings}
                    />
                    <Label htmlFor="enable_auto_save_drafts">Auto-Save Drafts</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable_form_progress_indicator"
                      checked={settings.user_experience.enable_form_progress_indicator}
                      onChange={(e) => updateSetting('user_experience', 'enable_form_progress_indicator', e.target.checked)}
                      className="rounded"
                      disabled={!canManageSettings}
                    />
                    <Label htmlFor="enable_form_progress_indicator">Form Progress Indicator</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable_smart_form_completion"
                      checked={settings.user_experience.enable_smart_form_completion}
                      onChange={(e) => updateSetting('user_experience', 'enable_smart_form_completion', e.target.checked)}
                      className="rounded"
                      disabled={!canManageSettings}
                    />
                    <Label htmlFor="enable_smart_form_completion">Smart Form Completion</Label>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-2">User Experience Features</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• <strong>Auto-Save Drafts:</strong> Automatically saves form progress every 30 seconds</div>
                    <div>• <strong>Progress Indicator:</strong> Shows completion percentage and required fields</div>
                    <div>• <strong>Smart Completion:</strong> Suggests values based on user's previous submissions</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('/form-cache-demo', '_blank')}
                      className="flex items-center space-x-2 bg-white hover:bg-blue-50"
                    >
                      <TestTube className="h-4 w-4" />
                      <span>Test Form Caching Demo</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-green-600" />
                  <span>Email Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    ['send_confirmation_email', 'Confirmation Email'],
                    ['send_status_updates', 'Status Update Emails'],
                    ['send_completion_notification', 'Completion Notification']
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={settings.notifications[key as keyof typeof settings.notifications] as boolean}
                        onChange={(e) => updateSetting('notifications', key, e.target.checked)}
                        className="rounded"
                        disabled={!canManageSettings}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testEmailConfiguration}
                    disabled={testing || !canManageSettings}
                    className="flex items-center space-x-2"
                  >
                    {testing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    <span>{testing ? 'Testing...' : 'Test Email Config'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email_template_confirmation">Confirmation Email Template</Label>
                  <Textarea
                    id="email_template_confirmation"
                    value={settings.notifications.email_template_confirmation}
                    onChange={(e) => updateSetting('notifications', 'email_template_confirmation', e.target.value)}
                    rows={3}
                    disabled={!canManageSettings}
                  />
                  <p className="text-xs text-gray-500 mt-1">Use &#123;&#123;ticket_id&#125;&#125; for dynamic ticket ID</p>
                </div>
                
                <div>
                  <Label htmlFor="email_template_status_update">Status Update Email Template</Label>
                  <Textarea
                    id="email_template_status_update"
                    value={settings.notifications.email_template_status_update}
                    onChange={(e) => updateSetting('notifications', 'email_template_status_update', e.target.value)}
                    rows={3}
                    disabled={!canManageSettings}
                  />
                  <p className="text-xs text-gray-500 mt-1">Use &#123;&#123;ticket_id&#125;&#125; and &#123;&#123;status&#125;&#125; for dynamic values</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA & Escalation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sla_response_time_hours">Response Time (Hours)</Label>
                    <Input
                      id="sla_response_time_hours"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.notifications.sla_response_time_hours}
                      onChange={(e) => updateSetting('notifications', 'sla_response_time_hours', parseInt(e.target.value) || 24)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sla_resolution_time_hours">Resolution Time (Hours)</Label>
                    <Input
                      id="sla_resolution_time_hours"
                      type="number"
                      min="1"
                      max="720"
                      value={settings.notifications.sla_resolution_time_hours}
                      onChange={(e) => updateSetting('notifications', 'sla_resolution_time_hours', parseInt(e.target.value) || 72)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="escalation_threshold_hours">Escalation Threshold (Hours)</Label>
                    <Input
                      id="escalation_threshold_hours"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.notifications.escalation_threshold_hours}
                      onChange={(e) => updateSetting('notifications', 'escalation_threshold_hours', parseInt(e.target.value) || 48)}
                      disabled={!canManageSettings}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="escalation_enabled"
                    checked={settings.notifications.escalation_enabled}
                    onChange={(e) => updateSetting('notifications', 'escalation_enabled', e.target.checked)}
                    className="rounded"
                    disabled={!canManageSettings}
                  />
                  <Label htmlFor="escalation_enabled">Enable Automatic Escalation</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <span>API Integration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable_api_access"
                    checked={settings.integrations.enable_api_access}
                    onChange={(e) => updateSetting('integrations', 'enable_api_access', e.target.checked)}
                    className="rounded"
                    disabled={!canManageSettings}
                  />
                  <Label htmlFor="enable_api_access">Enable API Access</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api_rate_limit">API Rate Limit (requests/hour)</Label>
                    <Input
                      id="api_rate_limit"
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.integrations.api_rate_limit}
                      onChange={(e) => updateSetting('integrations', 'api_rate_limit', parseInt(e.target.value) || 100)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook_url">Webhook URL</Label>
                    <Input
                      id="webhook_url"
                      value={settings.integrations.webhook_url}
                      onChange={(e) => updateSetting('integrations', 'webhook_url', e.target.value)}
                      placeholder="https://your-app.com/webhook"
                      disabled={!canManageSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>External Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['enable_webhook', 'Enable Webhook Notifications'],
                    ['enable_chat_support', 'Enable Live Chat Support'],
                    ['enable_remote_assistance', 'Enable Remote Assistance']
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={settings.integrations[key as keyof typeof settings.integrations] as boolean}
                        onChange={(e) => updateSetting('integrations', key, e.target.checked)}
                        className="rounded"
                        disabled={!canManageSettings}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
                
                <div>
                  <Label htmlFor="external_knowledge_base_url">External Knowledge Base URL</Label>
                  <Input
                    id="external_knowledge_base_url"
                    value={settings.integrations.external_knowledge_base_url}
                    onChange={(e) => updateSetting('integrations', 'external_knowledge_base_url', e.target.value)}
                    placeholder="https://help.example.com"
                    disabled={!canManageSettings}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  <span>Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['enable_captcha', 'Enable CAPTCHA'],
                    ['enable_file_scanning', 'Enable File Scanning'],
                    ['enable_ip_restrictions', 'Enable IP Restrictions'],
                    ['enable_audit_logging', 'Enable Audit Logging']
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={settings.security[key as keyof typeof settings.security] as boolean}
                        onChange={(e) => updateSetting('security', key, e.target.checked)}
                        className="rounded"
                        disabled={!canManageSettings}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="session_timeout_minutes">Session Timeout (Minutes)</Label>
                    <Input
                      id="session_timeout_minutes"
                      type="number"
                      min="5"
                      max="480"
                      value={settings.security.session_timeout_minutes}
                      onChange={(e) => updateSetting('security', 'session_timeout_minutes', parseInt(e.target.value) || 30)}
                      disabled={!canManageSettings}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      min="1"
                      max="10"
                      value={settings.security.max_login_attempts}
                      onChange={(e) => updateSetting('security', 'max_login_attempts', parseInt(e.target.value) || 5)}
                      disabled={!canManageSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-indigo-600" />
                  <span>Advanced Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['enable_auto_assignment', 'Enable Auto Assignment'],
                    ['enable_smart_routing', 'Enable Smart Routing'],
                    ['enable_duplicate_detection', 'Enable Duplicate Detection'],
                    ['enable_satisfaction_survey', 'Enable Satisfaction Survey'],
                    ['enable_knowledge_base_suggestions', 'Enable Knowledge Base Suggestions'],
                    ['enable_priority_escalation', 'Enable Priority Escalation']
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={settings.advanced[key as keyof typeof settings.advanced] as boolean}
                        onChange={(e) => updateSetting('advanced', key, e.target.checked)}
                        className="rounded"
                        disabled={!canManageSettings}
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
                
                <div>
                  <Label htmlFor="auto_close_resolved_after_days">Auto Close Resolved Tickets (Days)</Label>
                  <Input
                    id="auto_close_resolved_after_days"
                    type="number"
                    min="1"
                    max="90"
                    value={settings.advanced.auto_close_resolved_after_days}
                    onChange={(e) => updateSetting('advanced', 'auto_close_resolved_after_days', parseInt(e.target.value) || 7)}
                    disabled={!canManageSettings}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600">Portal Maintenance Mode</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="portal_maintenance_mode"
                    checked={settings.advanced.portal_maintenance_mode}
                    onChange={(e) => updateSetting('advanced', 'portal_maintenance_mode', e.target.checked)}
                    className="rounded"
                    disabled={!canManageSettings}
                  />
                  <Label htmlFor="portal_maintenance_mode" className="text-red-600 font-medium">
                    Enable Portal Maintenance Mode
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Blocks access to ticket submission and public portal only. Queue access remains available.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {settings.advanced.portal_maintenance_mode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pl-6 border-l-2 border-red-200"
                  >
                    <div>
                      <Label htmlFor="portal_maintenance_message">Maintenance Message</Label>
                      <Textarea
                        id="portal_maintenance_message"
                        value={settings.advanced.portal_maintenance_message}
                        onChange={(e) => updateSetting('advanced', 'portal_maintenance_message', e.target.value)}
                        rows={4}
                        placeholder="Enter the message users will see during maintenance..."
                        disabled={!canManageSettings}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This message will be displayed on the main page and public portal during maintenance.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="portal_maintenance_contact">Contact Information (Optional)</Label>
                        <Input
                          id="portal_maintenance_contact"
                          value={settings.advanced.portal_maintenance_contact}
                          onChange={(e) => updateSetting('advanced', 'portal_maintenance_contact', e.target.value)}
                          placeholder="e.g., helpdesk@dpss.gov or (555) 123-4567"
                          disabled={!canManageSettings}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Alternative contact method during maintenance
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="portal_maintenance_estimated_end">Estimated End Time (Optional)</Label>
                        <Input
                          id="portal_maintenance_estimated_end"
                          type="datetime-local"
                          value={settings.advanced.portal_maintenance_estimated_end}
                          onChange={(e) => updateSetting('advanced', 'portal_maintenance_estimated_end', e.target.value)}
                          disabled={!canManageSettings}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          When maintenance is expected to complete
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allow_queue_access_during_maintenance"
                          checked={settings.advanced.allow_queue_access_during_maintenance}
                          onChange={(e) => updateSetting('advanced', 'allow_queue_access_during_maintenance', e.target.checked)}
                          className="rounded"
                          disabled={!canManageSettings}
                        />
                        <Label htmlFor="allow_queue_access_during_maintenance">
                          Allow IT Staff Queue Access During Maintenance
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="show_system_status_page"
                          checked={settings.advanced.show_system_status_page}
                          onChange={(e) => updateSetting('advanced', 'show_system_status_page', e.target.checked)}
                          className="rounded"
                          disabled={!canManageSettings}
                        />
                        <Label htmlFor="show_system_status_page">
                          Show System Status Page Link
                        </Label>
                      </div>
                    </div>

                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Portal Maintenance Active:</strong> Public ticket submission and portal access will be blocked.
                        <br />
                        <span className="text-sm">
                          • Main page "Submit Ticket" button → shows maintenance message
                          <br />
                          • /public-portal → shows maintenance page
                          <br />
                          • IT Staff queue access → {settings.advanced.allow_queue_access_during_maintenance ? 'remains available' : 'also blocked'}
                        </span>
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {!settings.advanced.portal_maintenance_mode && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-1">Portal Operating Normally</p>
                    <p className="text-sm text-green-700">
                      All portal features are available. Enable maintenance mode when performing portal updates or maintenance.
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-2">Portal vs System Maintenance</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• <strong>Portal Maintenance:</strong> Blocks public ticket submission only</div>
                    <div>• <strong>System Maintenance:</strong> Blocks all user authentication and access</div>
                    <div>• <strong>Use Case:</strong> Portal maintenance for form updates, System maintenance for server updates</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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