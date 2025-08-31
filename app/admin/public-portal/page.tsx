'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import {
  Box, Card, CardContent, CardHeader, Typography, Tabs, Tab,
  Switch, Select, MenuItem, TextField, FormControl, FormControlLabel, 
  InputLabel, Button, Divider, Chip, Grid, Alert, 
  Paper, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Slider,
  Tooltip, Badge, CircularProgress, Avatar, AppBar, Toolbar
} from '@mui/material';
import {
  Palette, Settings, Schedule, Message, Analytics,
  ExpandMore, Edit, Delete, Add, ColorLens, Business,
  AccessTime, Language, Star, Help, Visibility, VisibilityOff,
  NotificationsActive, VolumeUp, ChatBubble, Phone, Email,
  Refresh, Warning, CheckCircle, Error, Speed, Timer,
  TrendingUp, Security, RestoreFromTrash, PriorityHigh,
  ArrowBack, SupportAgent, People, ChatBubbleOutline, Save
} from '@mui/icons-material';
import { ColorPicker } from '@/components/shared/ColorPicker';
import OnlinePresenceTracker from '@/components/shared/OnlinePresenceTracker';
import { Button as ShadcnButton } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { 
  Tooltip as ShadcnTooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
  </div>
);

const PublicPortalAdmin = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    // Master Control
    enabled: false,
    
    // Business Hours
    business_hours_enabled: true,
    ignore_business_hours: false,
    timezone: 'America/New_York',
    schedule: {
      monday: { enabled: true, open: '07:00', close: '18:00' },
      tuesday: { enabled: true, open: '07:00', close: '18:00' },
      wednesday: { enabled: true, open: '07:00', close: '18:00' },
      thursday: { enabled: true, open: '07:00', close: '18:00' },
      friday: { enabled: true, open: '07:00', close: '18:00' },
      saturday: { enabled: false, open: '09:00', close: '17:00' },
      sunday: { enabled: false, open: '09:00', close: '17:00' }
    },
    holidays: [] as any[],
    
    // Widget Appearance
    widget_theme: 'classic', // Add theme option: classic, modern
    widget_shape: 'circle',
    widget_color: '#1976d2',
    widget_size: 'medium',
    widget_position: 'bottom-right',
    widget_position_x: 0,
    widget_position_y: 0,
    widget_text: 'Chat with us',
    widget_icon: 'chat', // Default icon
    widget_image: '',
    
    // Animation Settings
    widget_animation: 'pulse',
    animation_duration: 2000,
    animation_delay: 5000,
    
    // Messages
    welcome_message: 'Hi! How can we help you today?',
    offline_message: 'We are currently offline. Please submit a ticket.',
    business_hours_message: 'Live chat available Monday-Friday, 7:00 AM - 6:00 PM EST.',
    queue_message: 'You are in queue. Please wait for the next available agent.',
    staff_disconnect_message: 'Your support agent has been disconnected. We are connecting you with another agent.',
    
    // Pre-chat Form
    require_name: true,
    require_email: true,
    require_phone: false,
    require_department: false,
    custom_fields: [] as any[],
    
    // Functionality
    show_agent_typing: true,
    show_queue_position: true,
    enable_file_uploads: true,
    enable_screenshot_sharing: false,
    max_file_size_mb: 5,
    allowed_file_types: ['image/*', 'application/pdf', 'text/plain'],
    
    // Typing & Read Receipts
    typing_indicators_enabled: true,
    typing_timeout_seconds: 3,
    show_staff_typing_to_guests: true,
    show_guest_typing_to_staff: true,
    typing_indicator_text: 'is typing...',
    typing_indicator_style: 'dots',
    read_receipts_enabled: true,
    show_delivery_status: true,
    show_guest_read_status_to_staff: true,
    show_staff_read_status_to_guests: false,
    read_receipt_style: 'checkmarks',
    delivery_status_icons: {
      sent: '✓',
      delivered: '✓✓',
      read: '✓✓'
    },
    
    // Session & Recovery
    session_recovery_enabled: true,
    session_recovery_minutes: 5,
    auto_ticket_creation: true,
    
    // Page Visibility
    enabled_pages: [] as string[],
    disabled_pages: [] as string[],
    
    // Recovery & Disconnect Settings
    auto_requeue_enabled: true,
    requeue_position: 'priority_boost',
    priority_boost_amount: 1,
    staff_disconnect_timeout: 30,
    grace_period_seconds: 60,
    auto_reassign_after_seconds: 120,
    notify_guest_on_staff_disconnect: true,
    staff_disconnect_message: 'Your support agent has been disconnected. We are connecting you with another agent.',
    reassignment_message: 'You have been connected with a new support agent.',
    escalate_on_multiple_disconnects: true,
    max_disconnects_before_escalation: 2,
    escalation_priority: 'urgent',
    guest_inactivity_timeout: 10,
    auto_end_abandoned_sessions: true,
    
    // Staff Work Mode Settings
    work_mode_auto_assignment_enabled: true,
    work_mode_ready_auto_accept: true,
    
    // WebSocket Connection Settings
    websocket_unlimited_mode: false,
    work_mode_work_auto_accept: false,
    work_mode_ticketing_auto_accept: false,
    work_mode_max_queue_time_minutes: 10,
    work_mode_escalate_unassigned: true,
    work_mode_break_timeout_minutes: 30,
    work_mode_away_timeout_minutes: 60,
    work_mode_descriptions: {
      ready: "Available for new chats",
      work_mode: "Focused work - manual chat accept", 
      ticketing_mode: "Ticket work - no new chats",
      away: "Not available",
      break: "On break - return soon"
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    checkAuthentication();
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

  // Check authentication and permissions
  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setAuthError('Authentication required. Please log in to access this page.');
        setLoading(false);
        return;
      }

      const result = await apiClient.getCurrentUser();
      const user = result.data;
      setCurrentUser(user);
        
        // Check if user has permission to manage public portal settings
        if (!user.permissions?.includes('public_portal.manage_settings') && 
            !user.permissions?.includes('admin.system_settings')) {
          setAuthError('Insufficient permissions. You need "public_portal.manage_settings" permission to access this page.');
          setLoading(false);
          return;
        }
        
        // User is authorized, load settings
        loadSettings();
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Authentication error. Please try again.');
      setLoading(false);
    }
  };

  // Load WebSocket system settings separately
  const loadWebSocketSettings = async () => {
    try {
      const result = await apiClient.getWebsocketSettings();
      setSettings(prev => ({ 
        ...prev, 
        websocket_unlimited_mode: Boolean(result.data.websocket_unlimited_mode) 
      }));
    } catch (error) {
      console.error('Failed to load WebSocket settings:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await apiClient.getPortalSettings();
      const data = result.data;
        if (data.schedule_json) {
          data.schedule = JSON.parse(data.schedule_json);
        }
        if (data.holidays_json) {
          data.holidays = JSON.parse(data.holidays_json);
        }
        if (data.custom_fields_json) {
          data.custom_fields = JSON.parse(data.custom_fields_json);
        }
        if (data.allowed_file_types_json) {
          data.allowed_file_types = JSON.parse(data.allowed_file_types_json);
        }
        if (data.enabled_pages) {
          data.enabled_pages = JSON.parse(data.enabled_pages);
        }
        if (data.disabled_pages) {
          data.disabled_pages = JSON.parse(data.disabled_pages);
        }
        if (data.delivery_status_icons) {
          data.delivery_status_icons = JSON.parse(data.delivery_status_icons);
        }
        // Ensure boolean values are properly set (convert null/undefined to false)
        const sanitizedData = {
          ...data,
          enabled: Boolean(data.enabled),
          widget_theme: data.widget_theme || 'classic',
          business_hours_enabled: data.business_hours_enabled ?? true,
          ignore_business_hours: Boolean(data.ignore_business_hours),
          require_name: data.require_name ?? true,
          require_email: data.require_email ?? true,
          require_phone: Boolean(data.require_phone),
          require_department: Boolean(data.require_department),
          show_agent_typing: data.show_agent_typing ?? true,
          show_queue_position: data.show_queue_position ?? true,
          enable_file_uploads: data.enable_file_uploads ?? true,
          enable_screenshot_sharing: Boolean(data.enable_screenshot_sharing),
          typing_indicators_enabled: data.typing_indicators_enabled ?? true,
          show_staff_typing_to_guests: data.show_staff_typing_to_guests ?? true,
          show_guest_typing_to_staff: data.show_guest_typing_to_staff ?? true,
          read_receipts_enabled: data.read_receipts_enabled ?? true,
          show_delivery_status: data.show_delivery_status ?? true,
          show_guest_read_status_to_staff: data.show_guest_read_status_to_staff ?? true,
          show_staff_read_status_to_guests: Boolean(data.show_staff_read_status_to_guests),
          session_recovery_enabled: data.session_recovery_enabled ?? true,
          auto_ticket_creation: data.auto_ticket_creation ?? true,
          show_agent_avatars: data.show_agent_avatars ?? true,
          agent_avatar_anonymity: data.agent_avatar_anonymity ?? true
        };
        setSettings({ ...settings, ...sanitizedData });
      }

      // Also load WebSocket settings
      await loadWebSocketSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      console.log('🔄 Saving settings:', settings);
      
      const settingsToSave = {
        ...settings,
        schedule_json: JSON.stringify(settings.schedule),
        holidays_json: JSON.stringify(settings.holidays),
        custom_fields_json: JSON.stringify(settings.custom_fields),
        allowed_file_types_json: JSON.stringify(settings.allowed_file_types),
        enabled_pages: JSON.stringify(settings.enabled_pages),
        disabled_pages: JSON.stringify(settings.disabled_pages),
        delivery_status_icons: JSON.stringify(settings.delivery_status_icons)
      };
      
      const result = await apiClient.updatePortalSettings(settingsToSave);
      console.log('💾 Save response:', result);
      
      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000); // Hide success after 2 seconds
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      alert(`Failed to save settings: ${error.message || 'Network error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Save WebSocket system settings immediately
  const saveWebSocketSettings = async (websocketUnlimitedMode: boolean) => {
    try {
      const result = await apiClient.updateWebsocketSettings({
        websocket_unlimited_mode: websocketUnlimitedMode
      });
      const data = result.data;
      console.log('✅ WebSocket settings saved:', data.message);
      return true;
    } catch (error) {
      console.error('❌ Error saving WebSocket settings:', error);
      return false;
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateWebSocketSetting = async (key: string, value: any) => {
    // Update local state immediately
    setSettings(prev => ({ ...prev, [key]: value }));

    // Save WebSocket settings immediately to system_settings
    if (key === 'websocket_unlimited_mode') {
      await saveWebSocketSettings(value);
    }
  };

  const updateSchedule = (day: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading Public Portal Settings...</Typography>
      </Box>
    );
  }

  if (authError) {
    return (
      <Box p={4} maxWidth="600px" mx="auto">
        <Alert severity="error" sx={{ mb: 2 }}>
          {authError}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.href = '/'}
          sx={{ mr: 2 }}
        >
          Go to Home
        </Button>
        <Button
          variant="outlined"
          onClick={() => window.location.href = '/tickets'}
        >
          Go to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onClick={() => setShowUserMenu(false)}
    >
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <ShadcnButton 
                variant="ghost" 
                onClick={() => window.location.href = '/admin'}
                className="flex items-center space-x-2"
              >
                <ArrowBack className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </ShadcnButton>
              
              <div className="h-6 border-l border-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <SupportAgent className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Public Portal Live Chat Settings</h1>
                  <p className="text-sm text-gray-500">Configure the public chat widget, business hours, and customer support features</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Profile Menu */}
              {currentUser && (
                <TooltipProvider>
                  <div className="relative">
                    <ShadcnTooltip>
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
                    </ShadcnTooltip>

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
                          {/* User Info Header */}
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
                            <button
                              onClick={() => {
                                localStorage.removeItem('authToken');
                                localStorage.removeItem('currentUser');
                                window.location.href = '/';
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                            >
                              <LogOut className="h-4 w-4" />
                              <span>Sign out</span>
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

      <Box sx={{ width: '100%', px: 4, py: 3, bgcolor: 'gray.50', minHeight: 'calc(100vh - 120px)' }}>

      {/* Widget Visibility Control */}
      <Alert 
        severity={settings.enabled ? 'success' : 'error'} 
        sx={{ mb: 2 }}
        action={
          <FormControlLabel
            control={
              <Switch 
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
                color={settings.enabled ? 'success' : 'warning'}
              />
            }
            label={settings.enabled ? 'Widget Visible' : 'Widget Hidden'}
            labelPlacement="start"
          />
        }
      >
        <Typography component="div">
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {settings.enabled 
              ? '✅ Public live chat widget is VISIBLE on website pages'
              : '❌ Public live chat widget is HIDDEN from all website pages'
            }
          </Typography>
          <Typography variant="body2">
            {settings.enabled 
              ? 'The chat widget appears on public pages. Use the business hours override below to control availability.' 
              : 'The chat widget will not appear anywhere on the website. Enable this first to show the widget.'
            }
          </Typography>
        </Typography>
      </Alert>

      {/* Business Hours Override Control */}
      {settings.enabled && (
        <Alert 
          severity={settings.ignore_business_hours ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
          action={
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.ignore_business_hours}
                  onChange={(e) => updateSetting('ignore_business_hours', e.target.checked)}
                  color={settings.ignore_business_hours ? 'success' : 'warning'}
                />
              }
              label={settings.ignore_business_hours ? 'Always Available' : 'Business Hours Only'}
              labelPlacement="start"
            />
          }
        >
          <Typography component="div">
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              {settings.ignore_business_hours 
                ? '🌍 Public live chat is ALWAYS AVAILABLE (ignoring business hours)'
                : '🕒 Public live chat respects BUSINESS HOURS schedule'
              }
            </Typography>
            <Typography variant="body2">
              {settings.ignore_business_hours 
                ? 'Chat is available 24/7. Perfect for testing or global support. Business hours settings below are ignored.' 
                : 'Chat is only available during configured business hours. Outside hours, visitors see offline message with ticket submission option.'
              }
            </Typography>
          </Typography>
        </Alert>
      )}

      {/* Demo Link */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            Test Widget: <a 
              href="/public-chat-demo" 
              target="_blank" 
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              View widget behavior on demo page →
            </a>
          </Typography>
        </Typography>
      </Alert>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<ChatBubble />} label="Widget Settings" />
          <Tab icon={<Schedule />} label="Business Hours" />
          <Tab icon={<Message />} label="Messages & Text" />
          <Tab icon={<Settings />} label="Functionality" />
          <Tab icon={<Palette />} label="Communication" />
          <Tab icon={<Refresh />} label="Recovery & Disconnects" />
          <Tab icon={<People />} label="Staff Work Modes" />
          <Tab icon={<Speed />} label="WebSocket Management" />
          <Tab icon={<Analytics />} label="Analytics" />
        </Tabs>

        {/* Widget Settings Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box p={3} className="space-y-6">
            {/* Widget Appearance */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <ColorLens className="w-5 h-5" />
                    Widget Appearance
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Widget Theme</InputLabel>
                      <Select
                        value={settings.widget_theme}
                        label="Widget Theme"
                        onChange={(e) => updateSetting('widget_theme', e.target.value)}
                      >
                        <MenuItem value="classic">Classic</MenuItem>
                        <MenuItem value="modern">Modern</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Widget Shape</InputLabel>
                      <Select
                        value={settings.widget_shape}
                        label="Widget Shape"
                        onChange={(e) => updateSetting('widget_shape', e.target.value)}
                      >
                        <MenuItem value="circle">Circle</MenuItem>
                        <MenuItem value="square">Square</MenuItem>
                        <MenuItem value="rounded">Rounded Square</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Widget Size</InputLabel>
                      <Select
                        value={settings.widget_size}
                        label="Widget Size"
                        onChange={(e) => updateSetting('widget_size', e.target.value)}
                      >
                        <MenuItem value="small">Small</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="large">Large</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box className="space-y-2">
                      <Typography variant="subtitle2">Widget Color</Typography>
                      <Box className="flex items-center gap-3">
                        <Box
                          sx={{ 
                            width: 40, 
                            height: 40, 
                            backgroundColor: settings.widget_color,
                            borderRadius: 1,
                            border: '1px solid #ccc',
                            cursor: 'pointer'
                          }}
                          onClick={() => setColorPickerOpen(true)}
                        />
                        <TextField
                          size="small"
                          value={settings.widget_color}
                          onChange={(e) => updateSetting('widget_color', e.target.value)}
                          placeholder="#1976d2"
                        />
                      </Box>
                      
                      {/* Color Presets */}
                      <Typography variant="caption" color="text.secondary" display="block">
                        Quick Colors:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {[
                          { name: 'Transparent', value: 'transparent' },
                          { name: 'Blue', value: '#1976d2' },
                          { name: 'Green', value: '#2e7d32' },
                          { name: 'Orange', value: '#f57c00' },
                          { name: 'Purple', value: '#7b1fa2' },
                          { name: 'Red', value: '#d32f2f' },
                          { name: 'Teal', value: '#00796b' },
                          { name: 'Black', value: '#424242' }
                        ].map((color) => (
                          <Chip
                            key={color.value}
                            size="small"
                            label={color.name}
                            onClick={() => updateSetting('widget_color', color.value)}
                            variant={settings.widget_color === color.value ? 'filled' : 'outlined'}
                            sx={{
                              backgroundColor: color.value === 'transparent' ? 
                                (settings.widget_color === 'transparent' ? '#e3f2fd' : 'transparent') :
                                settings.widget_color === color.value ? color.value : 'transparent',
                              color: settings.widget_color === color.value ? 
                                (color.value === 'transparent' || color.value === '#f57c00' ? 'black' : 'white') : 
                                'inherit',
                              border: color.value === 'transparent' ? 
                                '1px dashed #ccc' : 
                                `1px solid ${color.value}`,
                              '&:hover': {
                                backgroundColor: color.value === 'transparent' ? '#f5f5f5' : color.value,
                                color: color.value === 'transparent' || color.value === '#f57c00' ? 'black' : 'white'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Widget Position</InputLabel>
                      <Select
                        value={settings.widget_position}
                        label="Widget Position"
                        onChange={(e) => updateSetting('widget_position', e.target.value)}
                      >
                        <MenuItem value="bottom-right">Bottom Right</MenuItem>
                        <MenuItem value="bottom-left">Bottom Left</MenuItem>
                        <MenuItem value="top-right">Top Right</MenuItem>
                        <MenuItem value="top-left">Top Left</MenuItem>
                        <MenuItem value="custom">Custom (Free Floating)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Custom Position Controls */}
                {settings.widget_position === 'custom' && (
                  <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Custom Position (pixels from left/top)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <TextField
                          fullWidth
                          type="number"
                          size="small"
                          label="X Position (Left)"
                          value={settings.widget_position_x || 0}
                          onChange={(e) => updateSetting('widget_position_x', parseInt(e.target.value) || 0)}
                          inputProps={{ min: 0, max: 2000 }}
                          helperText="Distance from left edge"
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          fullWidth
                          type="number"
                          size="small"
                          label="Y Position (Top)"
                          value={settings.widget_position_y || 0}
                          onChange={(e) => updateSetting('widget_position_y', parseInt(e.target.value) || 0)}
                          inputProps={{ min: 0, max: 2000 }}
                          helperText="Distance from top edge"
                        />
                      </Grid>
                    </Grid>
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Visitors can drag the widget to reposition it. The values above are the initial position.
                    </Alert>
                  </Box>
                )}

                <TextField
                  fullWidth
                  size="small"
                  label="Widget Text"
                  value={settings.widget_text || ''}
                  onChange={(e) => updateSetting('widget_text', e.target.value)}
                  placeholder="Chat with us"
                />

                {/* Widget Image Upload */}
                <Box className="space-y-2">
                  <Typography variant="subtitle2">Custom Widget Image (Optional)</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Upload an image to replace the widget button. Image will be displayed as a "brooch" style within the widget shape.
                  </Typography>
                  
                  {settings.widget_image && (
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: settings.widget_shape === 'circle' ? '50%' : '8px',
                          backgroundColor: settings.widget_color || '#1976d2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={settings.widget_image}
                          alt="Widget Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                  
                  {/* Upload Area */}
                  {!settings.widget_image && (
                    <Box
                      sx={{ 
                        position: 'relative',
                        width: '100%',
                        height: 200,
                        border: '2px dashed #ccc',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: '#1976d2'
                        }
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Click to upload widget image
                      </Typography>
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    size="small"
                    label="Widget Image URL (optional)"
                    value={settings.widget_image || ''}
                    onChange={(e) => updateSetting('widget_image', e.target.value)}
                    placeholder="https://example.com/image.png"
                  />
                  
                  {!settings.widget_image && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Recommended: Square images 64x64px or larger. PNG with transparency works best.
                    </Typography>
                  )}
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label="Widget Animation"
                  select
                  value={settings.widget_animation || 'pulse'}
                  onChange={(e) => updateSetting('widget_animation', e.target.value)}
                >
                  <MenuItem value="none">No Animation</MenuItem>
                  <MenuItem value="pulse">Pulse</MenuItem>
                  <MenuItem value="bounce">Bounce</MenuItem>
                  <MenuItem value="shake">Shake</MenuItem>
                  <MenuItem value="glow">Glow</MenuItem>
                </TextField>

                {/* Animation Duration Slider */}
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Animation Duration: {settings.animation_duration}ms
                  </Typography>
                  <Slider
                    value={settings.animation_duration}
                    onChange={(e, newValue) => updateSetting('animation_duration', newValue)}
                    min={500}
                    max={5000}
                    step={100}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 1000, label: '1s' },
                      { value: 2000, label: '2s' },
                      { value: 3000, label: '3s' }
                    ]}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Messages Section */}
            <Box className="space-y-6">
              <Typography variant="h6">Messages</Typography>
              
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Welcome Message"
                value={settings.welcome_message || ''}
                onChange={(e) => updateSetting('welcome_message', e.target.value)}
                placeholder="Hi! How can we help you today?"
              />
              
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Offline Message"
                value={settings.offline_message || ''}
                onChange={(e) => updateSetting('offline_message', e.target.value)}
                placeholder="We are currently offline. Please submit a ticket."
              />
              
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Business Hours Message"
                value={settings.business_hours_message || ''}
                onChange={(e) => updateSetting('business_hours_message', e.target.value)}
                placeholder="Live chat available Monday-Friday, 7:00 AM - 6:00 PM EST."
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Additional tabs would go here */}
        
        </Paper>
      </Box>

      {/* Save Button */}
      <motion.div
        animate={saveSuccess ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={saveSettings}
          disabled={saving || saveSuccess}
          sx={{
            minWidth: 200,
            py: 1.5,
            backgroundColor: saveSuccess ? '#4caf50' : undefined,
            color: saveSuccess ? 'white' : undefined,
            '&:hover': {
              backgroundColor: saveSuccess ? '#45a049' : undefined,
            }
          }}
          startIcon={
            <AnimatePresence mode="wait">
              {saving ? (
                <CircularProgress
                  key="loading"
                  size={20}
                  color="inherit"
                />
              ) : saveSuccess ? (
                <motion.div
                  key="success"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <CheckCircle />
                </motion.div>
              ) : (
                <Save
                  key={saving ? 'saving' : saveSuccess ? 'success' : 'default'}
                />
              )}
            </AnimatePresence>
          }
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={saving ? 'saving' : saveSuccess ? 'success' : 'default'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {saving ? 'Saving...' : saveSuccess ? 'Saved Successfully!' : 'Save All Settings'}
            </motion.span>
          </AnimatePresence>
        </Button>
      </motion.div>
    </div>
  );
};

export default PublicPortalAdmin;
