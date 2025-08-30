'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Shield, 
  Bell, 
  Clock, 
  Database,
  Mail,
  ArrowLeft,
  RefreshCw,
  Save,
  AlertTriangle,
  Info,
  CheckCircle,
  Lock,
  Server,
  Phone,
  User,
  LogOut,
  Key,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format24Hour } from '@/lib/time-utils';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SystemSettings {
  // Security Settings
  sessionTimeout: number;
  passwordMinLength: number;
  requireMFA: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  
  // SSO/Authentication Settings
  ssoEnabled: boolean;
  adIntegrationEnabled: boolean;
  adServerUrl: string;
  adDomain: string;
  adBaseDn: string;
  adBindUser: string;
  adBindPassword: string;
  adUserSearchFilter: string;
  adGroupSearchFilter: string;
  fallbackToLocalAuth: boolean;
  autoCreateUsers: boolean;
  defaultUserRole: string;
  
  // System Behavior
  autoAssignment: boolean;
  defaultPriority: string;
  emailNotifications: boolean;
  maxTicketsPerUser: number;
  
  // Email Configuration
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromEmail: string;
  fromName: string;
  
  // Maintenance
  enableMaintenance: boolean;
  maintenanceMessage: string;
  autoBackupEnabled: boolean;
  backupRetentionDays: number;
  backupLocation: string;
  logLevel: string;
  pinoEnabled: boolean;
  
  // Presence Settings
  idleTimeoutMinutes: number;
  awayTimeoutMinutes: number;
  offlineTimeoutMinutes: number;
  enableAutoPresenceUpdates: boolean;
}

interface SettingsNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export default function SystemSettings() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    // Security defaults
    sessionTimeout: 60,
    passwordMinLength: 8,
    requireMFA: false,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    
    // SSO/Authentication defaults
    ssoEnabled: false,
    adIntegrationEnabled: false,
    adServerUrl: '',
    adDomain: '',
    adBaseDn: '',
    adBindUser: '',
    adBindPassword: '',
    adUserSearchFilter: '(sAMAccountName={0})',
    adGroupSearchFilter: '(member={0})',
    fallbackToLocalAuth: true,
    autoCreateUsers: false,
    defaultUserRole: 'user',
    
    // System behavior defaults
    autoAssignment: false,
    defaultPriority: 'medium',
    emailNotifications: true,
    maxTicketsPerUser: 50,
    
    // Email defaults
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    fromEmail: '',
    fromName: 'Orvale Support System',
    
    // Maintenance defaults
    enableMaintenance: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.',
    autoBackupEnabled: true,
    backupRetentionDays: 30,
    backupLocation: './backups',
    logLevel: 'info',
    pinoEnabled: true,
    
    // Presence defaults
    idleTimeoutMinutes: 10,
    awayTimeoutMinutes: 30,
    offlineTimeoutMinutes: 60,
    enableAutoPresenceUpdates: true
  });
  
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [notification, setNotification] = useState<SettingsNotification | null>(null);
  const [emergencyContactValue, setEmergencyContactValue] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('orvale-default');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Backup-related state
  const [backupLoading, setBackupLoading] = useState(false);
  const [showBackupHistory, setShowBackupHistory] = useState(false);
  const [backupList, setBackupList] = useState<any[]>([]);
  const [backupStats, setBackupStats] = useState<any>(null);
  
  // Preview state (separate from form state)
  const [previewData, setPreviewData] = useState({
    message: 'System is under maintenance. Please try again later.',
    emergencyContact: '',
    selectedTheme: 'orvale-default',
    lastUpdated: null as Date | null
  });

  // Theme color mappings
  const THEME_COLORS = {
    'orvale-default': { primary: '#2563eb', bg: '#f8fafc', text: '#475569' },
    'government-official': { primary: '#166534', bg: '#f0f9ff', text: '#374151' },
    'maintenance-orange': { primary: '#ea580c', bg: '#fff7ed', text: '#451a03' },
    'emergency-red': { primary: '#dc2626', bg: '#fef2f2', text: '#7f1d1d' },
    'dark-mode': { primary: '#3b82f6', bg: '#0f172a', text: '#e2e8f0' }
  };

  // Phone number formatting utility
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format based on length
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return phoneNumber;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    }
    // Limit to 10 digits and format
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  // Extract numbers only from formatted phone
  const extractPhoneNumbers = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Validate phone number (10 digits)
  const isValidPhoneNumber = (value: string): boolean => {
    const numbers = extractPhoneNumbers(value);
    return numbers.length === 10;
  };

  // Refresh preview with current form values
  const refreshPreview = () => {
    setPreviewData({
      message: settings.maintenanceMessage || 'System is under maintenance. Please try again later.',
      emergencyContact: emergencyContactValue,
      selectedTheme: selectedTheme,
      lastUpdated: new Date()
    });
  };

  useEffect(() => {
    checkPermissions();
    loadSettings();
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
      if (!token) {
        window.location.href = '/';
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const user = await response.json();
        
        // Check for system settings permission
        if (!user.permissions?.includes('admin.system_settings')) {
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

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const settingsData = await response.json();
        setSettings(settingsData);
        setOriginalSettings({ ...settingsData });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showNotification('Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setOriginalSettings({ ...settings });
        showNotification('Settings saved successfully', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
      showNotification('Settings reset to last saved values', 'info');
    }
  };

  const showNotification = (message: string, type: SettingsNotification['type']) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const hasUnsavedChanges = () => {
    return originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);
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

  const testEmailConnection = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/settings/test-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpSecure: settings.smtpSecure,
          smtpUser: settings.smtpUser
        })
      });
      
      if (response.ok) {
        showNotification('Email connection test successful', 'success');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Email connection failed', 'error');
      }
    } catch (error) {
      showNotification('Email connection test failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Backup functions
  const createManualBackup = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'create' })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        showNotification(`Manual backup created successfully: ${result.backup.filename}`, 'success');
        // Refresh backup list if it's open
        if (showBackupHistory) {
          loadBackupHistory();
        }
      } else {
        showNotification(result.error || 'Failed to create backup', 'error');
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      showNotification('Failed to create backup. Please try again.', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const loadBackupHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const [listResponse, statsResponse] = await Promise.all([
        fetch('/api/developer/backup?action=list', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/developer/backup?action=stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (listResponse.ok && statsResponse.ok) {
        const listData = await listResponse.json();
        const statsData = await statsResponse.json();
        
        setBackupList(listData.backups || []);
        setBackupStats(statsData.stats || null);
      } else {
        showNotification('Failed to load backup history', 'error');
      }
    } catch (error) {
      console.error('Failed to load backup history:', error);
      showNotification('Failed to load backup history', 'error');
    }
  };

  const toggleBackupHistory = async () => {
    if (!showBackupHistory) {
      setShowBackupHistory(true);
      await loadBackupHistory();
    } else {
      setShowBackupHistory(false);
    }
  };

  const cleanOldBackups = async () => {
    setBackupLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cleanup' })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        showNotification(`Cleanup completed - deleted ${result.deleted} old backup files`, 'success');
        // Refresh backup list if it's open
        if (showBackupHistory) {
          loadBackupHistory();
        }
      } else {
        showNotification(result.error || 'Failed to cleanup backups', 'error');
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
      showNotification('Failed to cleanup backups. Please try again.', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/developer/backup/download?filename=${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification(`Backup downloaded: ${filename}`, 'success');
      } else {
        showNotification('Failed to download backup', 'error');
      }
    } catch (error) {
      console.error('Download failed:', error);
      showNotification('Failed to download backup', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Settings className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading system settings...</p>
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
                <Settings className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                  <p className="text-sm text-gray-500">Configure system-wide settings and behaviors</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges() && (
                <Button variant="outline" onClick={resetSettings}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button 
                onClick={saveSettings} 
                disabled={saving || !hasUnsavedChanges()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>

              {/* User Profile Menu */}
              {currentUser && (
                <div className="relative">
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
                          className="border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
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
            <Alert className={`${
              notification.type === 'success' ? 'bg-green-50 border-green-200' : 
              notification.type === 'error' ? 'bg-red-50 border-red-200' :
              notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {notification.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {notification.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
              {notification.type === 'info' && <Info className="h-4 w-4" />}
              <AlertDescription className={
                notification.type === 'success' ? 'text-green-800' : 
                notification.type === 'error' ? 'text-red-800' :
                notification.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }>
                {notification.message}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasUnsavedChanges() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-800">
                You have unsaved changes. Make sure to save your settings before leaving this page.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="sso">SSO & Auth</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="presence">Presence</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        min="5"
                        max="1440"
                        value={settings.sessionTimeout}
                        onChange={(e) => setSettings({
                          ...settings, 
                          sessionTimeout: parseInt(e.target.value) || 60
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">How long users stay logged in without activity</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                      <Input
                        id="passwordMinLength"
                        type="number"
                        min="6"
                        max="50"
                        value={settings.passwordMinLength}
                        onChange={(e) => setSettings({
                          ...settings, 
                          passwordMinLength: parseInt(e.target.value) || 8
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">Required minimum characters for passwords</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                      <Input
                        id="maxLoginAttempts"
                        type="number"
                        min="3"
                        max="10"
                        value={settings.maxLoginAttempts}
                        onChange={(e) => setSettings({
                          ...settings, 
                          maxLoginAttempts: parseInt(e.target.value) || 5
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">Failed attempts before account lockout</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                      <Input
                        id="lockoutDuration"
                        type="number"
                        min="5"
                        max="1440"
                        value={settings.lockoutDuration}
                        onChange={(e) => setSettings({
                          ...settings, 
                          lockoutDuration: parseInt(e.target.value) || 30
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">How long accounts remain locked</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requireMFA"
                      checked={settings.requireMFA}
                      onCheckedChange={(checked) => setSettings({
                        ...settings, 
                        requireMFA: checked
                      })}
                    />
                    <Label htmlFor="requireMFA">Require Multi-Factor Authentication</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="system" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="h-5 w-5" />
                    <span>System Behavior</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Ticket Numbering System</Label>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium mb-2">Team-Based Prefixes (Auto-Generated)</p>
                        <p className="text-sm text-blue-700">
                          Tickets automatically receive prefixes based on assigned team:
                        </p>
                        <div className="mt-2 text-sm text-blue-600 font-mono">
                          • ITTS_Region7 → R7-YYMMDD-###<br/>
                          • HELPDESK → HE-YYMMDD-###<br/>
                          • ITTS_Main → IM-YYMMDD-###
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="maxTicketsPerUser">Max Tickets Per User</Label>
                      <Input
                        id="maxTicketsPerUser"
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.maxTicketsPerUser}
                        onChange={(e) => setSettings({
                          ...settings, 
                          maxTicketsPerUser: parseInt(e.target.value) || 50
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">Maximum open tickets per user</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoAssignment"
                        checked={settings.autoAssignment}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          autoAssignment: checked
                        })}
                      />
                      <Label htmlFor="autoAssignment">Enable Auto-Assignment</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="emailNotifications"
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          emailNotifications: checked
                        })}
                      />
                      <Label htmlFor="emailNotifications">Enable Email Notifications</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SSO & Authentication Settings */}
            <TabsContent value="sso" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>Single Sign-On Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ssoEnabled"
                        checked={settings.ssoEnabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          ssoEnabled: checked
                        })}
                      />
                      <Label htmlFor="ssoEnabled">Enable Single Sign-On (SSO)</Label>
                    </div>
                    
                    {settings.ssoEnabled && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-blue-800 font-medium">SSO Active</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Users will be redirected to SSO provider for authentication. Local authentication remains available as fallback.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="fallbackToLocalAuth"
                        checked={settings.fallbackToLocalAuth}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          fallbackToLocalAuth: checked
                        })}
                        disabled={!settings.ssoEnabled}
                      />
                      <Label htmlFor="fallbackToLocalAuth">Allow Local Authentication Fallback</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoCreateUsers"
                        checked={settings.autoCreateUsers}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          autoCreateUsers: checked
                        })}
                        disabled={!settings.ssoEnabled}
                      />
                      <Label htmlFor="autoCreateUsers">Automatically Create New Users</Label>
                    </div>

                    <div>
                      <Label htmlFor="defaultUserRole">Default Role for New Users</Label>
                      <select
                        id="defaultUserRole"
                        className="w-full mt-1 rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        value={settings.defaultUserRole}
                        onChange={(e) => setSettings({
                          ...settings, 
                          defaultUserRole: e.target.value
                        })}
                        disabled={!settings.ssoEnabled || !settings.autoCreateUsers}
                      >
                        <option value="user">User</option>
                        <option value="support">Support Agent</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Role assigned to automatically created users
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Active Directory Integration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Coming Soon:</strong> Active Directory integration is planned for future release. Configure these settings to prepare for AD authentication.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="adIntegrationEnabled"
                        checked={settings.adIntegrationEnabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          adIntegrationEnabled: checked
                        })}
                        disabled={!settings.ssoEnabled}
                      />
                      <Label htmlFor="adIntegrationEnabled">Enable Active Directory Integration</Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="adServerUrl">AD Server URL</Label>
                        <Input
                          id="adServerUrl"
                          type="text"
                          placeholder="ldaps://ad.company.com:636"
                          value={settings.adServerUrl}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adServerUrl: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">LDAP/LDAPS server URL</p>
                      </div>

                      <div>
                        <Label htmlFor="adDomain">AD Domain</Label>
                        <Input
                          id="adDomain"
                          type="text"
                          placeholder="company.com"
                          value={settings.adDomain}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adDomain: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">Active Directory domain</p>
                      </div>

                      <div>
                        <Label htmlFor="adBaseDn">Base DN</Label>
                        <Input
                          id="adBaseDn"
                          type="text"
                          placeholder="DC=company,DC=com"
                          value={settings.adBaseDn}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adBaseDn: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">Base distinguished name</p>
                      </div>

                      <div>
                        <Label htmlFor="adBindUser">Bind User DN</Label>
                        <Input
                          id="adBindUser"
                          type="text"
                          placeholder="CN=service,OU=Service Accounts,DC=company,DC=com"
                          value={settings.adBindUser}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adBindUser: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">Service account for AD binding</p>
                      </div>

                      <div>
                        <Label htmlFor="adBindPassword">Bind User Password</Label>
                        <Input
                          id="adBindPassword"
                          type="password"
                          placeholder="••••••••"
                          value={settings.adBindPassword}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adBindPassword: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">Service account password</p>
                      </div>

                      <div>
                        <Label htmlFor="adUserSearchFilter">User Search Filter</Label>
                        <Input
                          id="adUserSearchFilter"
                          type="text"
                          placeholder="(sAMAccountName={0})"
                          value={settings.adUserSearchFilter}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adUserSearchFilter: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">LDAP filter for user lookup</p>
                      </div>

                      <div>
                        <Label htmlFor="adGroupSearchFilter">Group Search Filter</Label>
                        <Input
                          id="adGroupSearchFilter"
                          type="text"
                          placeholder="(member={0})"
                          value={settings.adGroupSearchFilter}
                          onChange={(e) => setSettings({
                            ...settings, 
                            adGroupSearchFilter: e.target.value
                          })}
                          disabled={!settings.adIntegrationEnabled}
                        />
                        <p className="text-sm text-gray-500 mt-1">LDAP filter for group membership</p>
                      </div>
                    </div>

                    {settings.adIntegrationEnabled && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium mb-2">AD Integration Requirements</p>
                        <ul className="text-sm text-blue-600 space-y-1">
                          <li>• Ensure network connectivity to Active Directory server</li>
                          <li>• Service account must have read permissions on user objects</li>
                          <li>• SSL/TLS certificate must be valid for LDAPS connections</li>
                          <li>• Test connection before enabling in production</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      disabled={!settings.adIntegrationEnabled}
                      className="flex items-center space-x-2"
                    >
                      <Server className="h-4 w-4" />
                      <span>Test Connection</span>
                    </Button>
                    <Button
                      variant="outline" 
                      disabled={!settings.adIntegrationEnabled}
                      className="flex items-center space-x-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Test User Login</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Settings */}
            <TabsContent value="email" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="h-5 w-5" />
                    <span>Email Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="smtpHost">SMTP Host</Label>
                      <Input
                        id="smtpHost"
                        value={settings.smtpHost}
                        onChange={(e) => setSettings({
                          ...settings, 
                          smtpHost: e.target.value
                        })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="smtpPort">SMTP Port</Label>
                      <Input
                        id="smtpPort"
                        type="number"
                        value={settings.smtpPort}
                        onChange={(e) => setSettings({
                          ...settings, 
                          smtpPort: parseInt(e.target.value) || 587
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="smtpUser">SMTP Username</Label>
                      <Input
                        id="smtpUser"
                        value={settings.smtpUser}
                        onChange={(e) => setSettings({
                          ...settings, 
                          smtpUser: e.target.value
                        })}
                        placeholder="username@domain.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input
                        id="fromEmail"
                        type="email"
                        value={settings.fromEmail}
                        onChange={(e) => setSettings({
                          ...settings, 
                          fromEmail: e.target.value
                        })}
                        placeholder="support@company.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="fromName">From Name</Label>
                      <Input
                        id="fromName"
                        value={settings.fromName}
                        onChange={(e) => setSettings({
                          ...settings, 
                          fromName: e.target.value
                        })}
                        placeholder="Support Team"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="smtpSecure"
                      checked={settings.smtpSecure}
                      onCheckedChange={(checked) => setSettings({
                        ...settings, 
                        smtpSecure: checked
                      })}
                    />
                    <Label htmlFor="smtpSecure">Use Secure Connection (TLS)</Label>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={testEmailConnection} variant="outline" disabled={saving}>
                      <Mail className="h-4 w-4 mr-2" />
                      {saving ? 'Testing...' : 'Test Connection'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Presence Settings */}
            <TabsContent value="presence" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>User Presence Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="enableAutoPresenceUpdates"
                      checked={settings.enableAutoPresenceUpdates}
                      onCheckedChange={(checked) => setSettings({
                        ...settings, 
                        enableAutoPresenceUpdates: checked
                      })}
                    />
                    <Label htmlFor="enableAutoPresenceUpdates">Enable Automatic Presence Updates</Label>
                  </div>
                  
                  {settings.enableAutoPresenceUpdates && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-800 font-medium">Automatic Presence Updates Active</span>
                      </div>
                      <p className="text-green-700 text-sm">
                        User presence status will automatically update based on activity and the timeout settings below.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="idleTimeoutMinutes">Idle Timeout (minutes)</Label>
                      <Input
                        id="idleTimeoutMinutes"
                        type="number"
                        min="1"
                        max="120"
                        value={settings.idleTimeoutMinutes}
                        onChange={(e) => setSettings({
                          ...settings, 
                          idleTimeoutMinutes: parseInt(e.target.value) || 10
                        })}
                        disabled={!settings.enableAutoPresenceUpdates}
                      />
                      <p className="text-sm text-gray-500 mt-1">Time of inactivity before user is marked as idle</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">Orange indicator - "Idle"</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="awayTimeoutMinutes">Away Timeout (minutes)</Label>
                      <Input
                        id="awayTimeoutMinutes"
                        type="number"
                        min="5"
                        max="240"
                        value={settings.awayTimeoutMinutes}
                        onChange={(e) => setSettings({
                          ...settings, 
                          awayTimeoutMinutes: parseInt(e.target.value) || 30
                        })}
                        disabled={!settings.enableAutoPresenceUpdates}
                      />
                      <p className="text-sm text-gray-500 mt-1">Time before idle users are marked as away</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Yellow indicator - "Away"</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="offlineTimeoutMinutes">Offline Timeout (minutes)</Label>
                      <Input
                        id="offlineTimeoutMinutes"
                        type="number"
                        min="15"
                        max="480"
                        value={settings.offlineTimeoutMinutes}
                        onChange={(e) => setSettings({
                          ...settings, 
                          offlineTimeoutMinutes: parseInt(e.target.value) || 60
                        })}
                        disabled={!settings.enableAutoPresenceUpdates}
                      />
                      <p className="text-sm text-gray-500 mt-1">Time before away users are marked as offline</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">Gray indicator - "Offline"</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Flow Diagram */}
                  <div>
                    <Label>Presence Status Flow</Label>
                    <div className="mt-2 p-4 bg-gray-50 border rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">Online</span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                          <span className="font-medium">Idle</span>
                          <span className="text-xs text-gray-500">({settings.idleTimeoutMinutes}min)</span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="font-medium">Away</span>
                          <span className="text-xs text-gray-500">({settings.awayTimeoutMinutes}min)</span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span className="font-medium">Offline</span>
                          <span className="text-xs text-gray-500">({settings.offlineTimeoutMinutes}min)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Status Indicators */}
                  <div>
                    <Label>Manual Status Options</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium">Busy</span>
                        </div>
                        <p className="text-xs text-gray-600">User-set status</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">In Call</span>
                        </div>
                        <p className="text-xs text-gray-600">Audio call active</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">In Meeting</span>
                        </div>
                        <p className="text-xs text-gray-600">Video call active</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">Presenting</span>
                        </div>
                        <p className="text-xs text-gray-600">Screen sharing</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Manual statuses (Busy, In Call, In Meeting, Presenting) override automatic timeouts and require manual reset.
                    </p>
                  </div>

                  {/* Information Alert */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-blue-800">
                      <strong>Note:</strong> These settings control automatic presence updates. Users can manually set their status to Busy, In Call, In Meeting, or Presenting at any time, which will override automatic timeouts until manually changed.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Settings */}
            <TabsContent value="maintenance" className="space-y-6 mt-6">
              {/* System Maintenance Mode */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>System Maintenance Mode</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableMaintenance"
                      checked={settings.enableMaintenance}
                      onCheckedChange={(checked) => setSettings({
                        ...settings, 
                        enableMaintenance: checked
                      })}
                    />
                    <Label htmlFor="enableMaintenance">Enable System-wide Maintenance</Label>
                  </div>
                  
                  {settings.enableMaintenance && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-800 font-medium">System Maintenance Active</span>
                      </div>
                      <p className="text-red-700 text-sm">
                        All users except those with maintenance override permission will see the maintenance page.
                      </p>
                    </div>
                  )}
                  
                  {settings.enableMaintenance && (
                    <>
                      {/* Maintenance Message */}
                      <div>
                        <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                        <Textarea
                          id="maintenanceMessage"
                          value={settings.maintenanceMessage}
                          onChange={(e) => setSettings({
                            ...settings, 
                            maintenanceMessage: e.target.value
                          })}
                          rows={4}
                          placeholder="Enter the message users will see during maintenance..."
                          className="font-mono"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Supports basic HTML formatting and line breaks
                        </p>
                      </div>

                      {/* Theme Customization */}
                      <div>
                        <Label>Theme Customization</Label>
                        <div className="mt-2 p-4 border rounded-lg space-y-4">
                          {/* Preset Themes */}
                          <div>
                            <Label className="text-sm font-medium">
                              Preset Themes 
                              <span className="text-xs text-gray-500 ml-2">
                                (Selected: {selectedTheme.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())})
                              </span>
                            </Label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                              {Object.entries({
                                'orvale-default': { name: 'Orvale Default', color: '#2563eb' },
                                'government-official': { name: 'Government', color: '#166534' },
                                'maintenance-orange': { name: 'Maintenance', color: '#ea580c' },
                                'emergency-red': { name: 'Emergency', color: '#dc2626' },
                                'dark-mode': { name: 'Dark Mode', color: '#3b82f6' }
                              }).map(([key, theme]) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    setSelectedTheme(key);
                                    // In the future, this would also update the actual theme in preview
                                    console.log(`Applied theme: ${key}`);
                                  }}
                                  className={`p-2 border rounded text-xs text-center transition-colors ${
                                    selectedTheme === key 
                                      ? 'border-blue-500 bg-blue-50 border-2' 
                                      : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                  }`}
                                >
                                  <div className="relative">
                                    <div 
                                      className="w-full h-3 rounded mb-1" 
                                      style={{ backgroundColor: theme.color }}
                                    ></div>
                                    {selectedTheme === key && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                        <CheckCircle size={10} className="text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <span className={selectedTheme === key ? 'font-medium' : ''}>
                                    {theme.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Custom Colors */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs">Primary Color</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <input type="color" defaultValue="#2563eb" className="w-8 h-8 border rounded" />
                                <span className="text-sm text-gray-600">#2563eb</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Background</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <input type="color" defaultValue="#f8fafc" className="w-8 h-8 border rounded" />
                                <span className="text-sm text-gray-600">#f8fafc</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Text Color</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <input type="color" defaultValue="#475569" className="w-8 h-8 border rounded" />
                                <span className="text-sm text-gray-600">#475569</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Options */}
                      <div>
                        <Label>Advanced Options</Label>
                        <div className="mt-2 p-4 border rounded-lg space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="estimatedReturn" className="text-sm">Estimated Return Time</Label>
                              <Input
                                id="estimatedReturn"
                                type="datetime-local"
                                className="mt-1"
                                placeholder="Optional"
                              />
                            </div>
                            <div>
                              <Label htmlFor="emergencyContact" className="text-sm">
                                Emergency Contact
                                {emergencyContactValue && !isValidPhoneNumber(emergencyContactValue) && (
                                  <span className="text-red-500 text-xs ml-2">Must be 10 digits</span>
                                )}
                                {emergencyContactValue && isValidPhoneNumber(emergencyContactValue) && (
                                  <span className="text-green-500 text-xs ml-2">✓ Valid</span>
                                )}
                              </Label>
                              <Input
                                id="emergencyContact"
                                value={emergencyContactValue}
                                onChange={(e) => {
                                  const formatted = formatPhoneNumber(e.target.value);
                                  setEmergencyContactValue(formatted);
                                }}
                                placeholder="(555) 123-4567"
                                className={`mt-1 ${
                                  emergencyContactValue && !isValidPhoneNumber(emergencyContactValue) 
                                    ? 'border-red-300 focus:border-red-500' 
                                    : emergencyContactValue && isValidPhoneNumber(emergencyContactValue)
                                    ? 'border-green-300 focus:border-green-500'
                                    : ''
                                }`}
                                maxLength={14} // (555) 123-4567 = 14 characters
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Enter 10-digit phone number (will auto-format)
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch id="adminOverride" defaultChecked />
                              <Label htmlFor="adminOverride" className="text-sm">Allow admin override (users with permission)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch id="showRefresh" defaultChecked />
                              <Label htmlFor="showRefresh" className="text-sm">Show refresh button for auto-recovery</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch id="logChanges" defaultChecked />
                              <Label htmlFor="logChanges" className="text-sm">Log maintenance mode changes</Label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div>
                        <Label>Live Preview</Label>
                        <div className="mt-2 border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs text-gray-600">
                                {previewData.lastUpdated 
                                  ? `Last updated: ${previewData.lastUpdated.toLocaleTimeString()}`
                                  : 'Click refresh to load current settings'
                                }
                              </span>
                            </div>
                            <Button
                              onClick={refreshPreview}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                            >
                              <RefreshCw size={12} className="mr-1" />
                              Refresh Preview
                            </Button>
                          </div>
                          <div 
                            className="p-4 min-h-[200px]"
                            style={{ 
                              backgroundColor: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.bg || '#f8fafc'
                            }}
                          >
                            {/* Mini maintenance page preview */}
                            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-sm border p-4 text-center">
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                style={{ 
                                  backgroundColor: `${THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'}20`
                                }}
                              >
                                <Database 
                                  className="w-6 h-6" 
                                  style={{ 
                                    color: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'
                                  }}
                                />
                              </div>
                              <h3 className="font-bold text-gray-900 mb-1">ORVALE MANAGEMENT SYSTEM</h3>
                              <h4 
                                className="text-lg font-semibold mb-2"
                                style={{ 
                                  color: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'
                                }}
                              >
                                System Maintenance
                              </h4>
                              <div 
                                className="w-6 h-0.5 mx-auto mb-3"
                                style={{ 
                                  backgroundColor: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'
                                }}
                              ></div>
                              
                              {/* Theme indicator */}
                              {previewData.selectedTheme !== 'orvale-default' && (
                                <div className="text-xs text-gray-400 mb-2">
                                  Theme: {previewData.selectedTheme.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </div>
                              )}
                              <p 
                                className="text-sm mb-3 leading-relaxed"
                                style={{ 
                                  color: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.text || '#475569'
                                }}
                              >
                                {previewData.message}
                              </p>
                              
                              {/* Emergency Contact in Preview */}
                              {previewData.emergencyContact && isValidPhoneNumber(previewData.emergencyContact) && (
                                <div 
                                  className="flex items-center justify-center space-x-1 p-2 rounded text-xs mb-3"
                                  style={{ 
                                    backgroundColor: `${THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'}10`,
                                    color: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'
                                  }}
                                >
                                  <Phone size={12} />
                                  <span>Emergency: {previewData.emergencyContact}</span>
                                </div>
                              )}
                              
                              <div className="flex space-x-2 justify-center">
                                <div 
                                  className="text-white px-3 py-1 rounded text-xs"
                                  style={{ 
                                    backgroundColor: THEME_COLORS[previewData.selectedTheme as keyof typeof THEME_COLORS]?.primary || '#2563eb'
                                  }}
                                >
                                  Refresh Page
                                </div>
                                <div className="border border-gray-300 px-3 py-1 rounded text-xs">Admin Login</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Backup Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Database Backup System</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Backup Configuration */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Backup Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="backupLocation">Backup Location</Label>
                        <Input
                          id="backupLocation"
                          value={settings.backupLocation}
                          onChange={(e) => setSettings({
                            ...settings, 
                            backupLocation: e.target.value
                          })}
                          placeholder="./backups"
                        />
                        <p className="text-sm text-gray-500 mt-1">Directory path where backup files will be stored (relative to application root)</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="backupRetentionDays">Backup Retention (days)</Label>
                        <Input
                          id="backupRetentionDays"
                          type="number"
                          min="1"
                          max="365"
                          value={settings.backupRetentionDays}
                          onChange={(e) => setSettings({
                            ...settings, 
                            backupRetentionDays: parseInt(e.target.value) || 30
                          })}
                        />
                        <p className="text-sm text-gray-500 mt-1">Old backups will be automatically deleted after this many days</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label>Backup Schedule</Label>
                      <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">Automatic Daily Backups</p>
                        <p className="text-sm text-blue-700 mt-1">
                          When enabled, the system will create automatic backups every 24 hours
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-4">
                      <Switch
                        id="autoBackupEnabled"
                        checked={settings.autoBackupEnabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          autoBackupEnabled: checked
                        })}
                      />
                      <Label htmlFor="autoBackupEnabled">Enable Automatic Backup</Label>
                    </div>
                    
                    {settings.autoBackupEnabled && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-800 font-medium">Automatic Backup Active</span>
                        </div>
                        <p className="text-green-700 text-sm">
                          The system will automatically create daily backups and clean up old files based on your retention settings.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual Backup Actions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Manual Backup Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="outline" 
                        onClick={createManualBackup}
                        disabled={backupLoading}
                        className="flex items-center space-x-2"
                      >
                        <Database className="h-4 w-4" />
                        <span>{backupLoading ? 'Creating...' : 'Create Manual Backup'}</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={toggleBackupHistory}
                        className="flex items-center space-x-2"
                      >
                        <Clock className="h-4 w-4" />
                        <span>{showBackupHistory ? 'Hide' : 'View'} Backup History</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={cleanOldBackups}
                        disabled={backupLoading}
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>{backupLoading ? 'Cleaning...' : 'Clean Old Backups'}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Backup History */}
                  {showBackupHistory && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Backup History</h4>
                      
                      {/* Backup Statistics */}
                      {backupStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-medium text-blue-600">Total Backups</p>
                            <p className="text-lg font-bold text-blue-900">{backupStats.totalBackups}</p>
                          </div>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-600">Manual</p>
                            <p className="text-lg font-bold text-green-900">{backupStats.manualBackups}</p>
                          </div>
                          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-sm font-medium text-purple-600">Automatic</p>
                            <p className="text-lg font-bold text-purple-900">{backupStats.automaticBackups}</p>
                          </div>
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-medium text-yellow-600">Total Size</p>
                            <p className="text-lg font-bold text-yellow-900">{backupStats.totalSizeMB} MB</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Backup List */}
                      <div className="border rounded-lg overflow-hidden">
                        {backupList.length === 0 ? (
                          <div className="p-6 text-center text-gray-500">
                            <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No backup files found</p>
                            <p className="text-sm">Create your first backup using the button above</p>
                          </div>
                        ) : (
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {backupList.map((backup, index) => (
                                  <tr key={backup.filename} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3">
                                      <span className="text-sm font-mono text-gray-900">{backup.filename}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        backup.type === 'manual' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {backup.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {backup.sizeMB} MB
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                      {format24Hour(backup.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadBackup(backup.filename)}
                                        className="text-xs"
                                      >
                                        Download
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-500">
                        <p>💡 Tip: Backup files are automatically cleaned up after {settings.backupRetentionDays} days</p>
                      </div>
                    </div>
                  )}

                  {/* Backup Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Backup Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Current Backup Location</p>
                        <p className="text-sm text-gray-900 mt-1 font-mono">{settings.backupLocation || './backups'}/</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Database Size</p>
                        <p className="text-sm text-gray-900 mt-1">~{Math.round(1.2)} MB</p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 border rounded-lg">
                        <p className="text-sm font-medium text-gray-600">Backup Format</p>
                        <p className="text-sm text-gray-900 mt-1">SQLite .db files</p>
                      </div>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Security Note:</strong> Backup files contain sensitive data. Store them securely and ensure proper access controls.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Settings */}
            <TabsContent value="advanced" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Advanced Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      <strong>Warning:</strong> Advanced settings can affect system stability. Only modify if you understand the implications.
                    </AlertDescription>
                  </Alert>
                  
                  {/* Pino Logging Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="pinoEnabled"
                        checked={settings.pinoEnabled}
                        onCheckedChange={(checked) => setSettings({
                          ...settings, 
                          pinoEnabled: checked
                        })}
                      />
                      <Label htmlFor="pinoEnabled">Enable Pino Structured Logging</Label>
                    </div>
                    
                    {settings.pinoEnabled && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-blue-800 font-medium">Pino Logging Active</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                          Structured logging is enabled. Logs will appear in the development console and production log files.
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="logLevel">Log Level</Label>
                      <select
                        id="logLevel"
                        className="w-full mt-1 rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                        value={settings.logLevel}
                        onChange={(e) => setSettings({
                          ...settings, 
                          logLevel: e.target.value
                        })}
                        disabled={!settings.pinoEnabled}
                      >
                        <option value="error">Error</option>
                        <option value="warn">Warning</option>
                        <option value="info">Info</option>
                        <option value="debug">Debug</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        {settings.pinoEnabled 
                          ? "System logging verbosity level" 
                          : "Enable Pino logging to configure log level"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Log Location Information Box */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium mb-2">Log File Locations</p>
                    <div className="mt-2 text-sm text-green-600 font-mono space-y-1">
                      <div><strong>Development:</strong> Console output only</div>
                      <div><strong>Production:</strong></div>
                      <div className="ml-4">• ./logs/app.log (All logs)</div>
                      <div className="ml-4">• ./logs/error.log (Errors only)</div>
                      <div className="ml-4">• Console/PM2 logs (All levels)</div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      View logs: <code>tail -f logs/app.log</code> or <code>tail -f logs/error.log</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

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