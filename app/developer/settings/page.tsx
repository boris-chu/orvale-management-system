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
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemSettings {
  // Security Settings
  sessionTimeout: number;
  passwordMinLength: number;
  requireMFA: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  
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
  logLevel: string;
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
    logLevel: 'info'
  });
  
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [notification, setNotification] = useState<SettingsNotification | null>(null);

  useEffect(() => {
    checkPermissions();
    loadSettings();
  }, []);

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
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
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
                            <Label className="text-sm font-medium">Preset Themes</Label>
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
                                    // This would apply the preset theme
                                    console.log(`Apply theme: ${key}`);
                                  }}
                                  className="p-2 border rounded text-xs text-center hover:bg-gray-50 transition-colors"
                                >
                                  <div 
                                    className="w-full h-3 rounded mb-1" 
                                    style={{ backgroundColor: theme.color }}
                                  ></div>
                                  {theme.name}
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
                              <Label htmlFor="emergencyContact" className="text-sm">Emergency Contact</Label>
                              <Input
                                id="emergencyContact"
                                placeholder="e.g., IT Helpdesk: (555) 123-4567"
                                className="mt-1"
                              />
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
                          <div className="bg-gray-50 px-3 py-2 border-b flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Updates in real-time as you edit above</span>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 min-h-[200px]">
                            {/* Mini maintenance page preview */}
                            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-sm border p-4 text-center">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Database className="w-6 h-6 text-blue-600" />
                              </div>
                              <h3 className="font-bold text-gray-900 mb-1">ORVALE MANAGEMENT SYSTEM</h3>
                              <h4 className="text-lg font-semibold text-blue-600 mb-2">System Maintenance</h4>
                              <div className="w-6 h-0.5 bg-blue-600 mx-auto mb-3"></div>
                              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                {settings.maintenanceMessage || 'System is under maintenance. Please try again later.'}
                              </p>
                              <p className="text-xs text-gray-500 mb-3">
                                We're performing scheduled maintenance to improve your experience.
                              </p>
                              <div className="flex space-x-2 justify-center">
                                <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Refresh Page</div>
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
                    <span>Backup Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoBackupEnabled"
                      checked={settings.autoBackupEnabled}
                      onCheckedChange={(checked) => setSettings({
                        ...settings, 
                        autoBackupEnabled: checked
                      })}
                    />
                    <Label htmlFor="autoBackupEnabled">Enable Auto Backup</Label>
                  </div>
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
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">System logging verbosity level</p>
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
    </div>
  );
}