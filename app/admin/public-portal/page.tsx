'use client';

import { useState, useEffect } from 'react';
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
  ArrowBack, SupportAgent, People, ChatBubbleOutline
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
    widget_shape: 'circle',
    widget_color: '#1976d2',
    widget_size: 'medium',
    widget_position: 'bottom-right',
    widget_position_x: 0,
    widget_position_y: 0,
    widget_text: 'Chat with us',
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

      const response = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const user = await response.json();
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
      } else {
        setAuthError('Authentication failed. Please log in again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Authentication error. Please try again.');
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/public-portal/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
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
        setSettings({ ...settings, ...data });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/public-portal/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          schedule_json: JSON.stringify(settings.schedule),
          holidays_json: JSON.stringify(settings.holidays),
          custom_fields_json: JSON.stringify(settings.custom_fields),
          allowed_file_types_json: JSON.stringify(settings.allowed_file_types),
          enabled_pages: JSON.stringify(settings.enabled_pages),
          disabled_pages: JSON.stringify(settings.disabled_pages),
          delivery_status_icons: JSON.stringify(settings.delivery_status_icons)
        })
      });
      
      if (response.ok) {
        // Show success notification
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
    <div className="min-h-screen bg-gray-50">
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
                          onClick={() => setShowUserMenu(!showUserMenu)}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <UserAvatar 
                            user={currentUser}
                            size="sm"
                          />
                          <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.display_name || currentUser?.username}</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600 truncate">{currentUser?.role}</span>
                              <OnlinePresenceTracker username={currentUser.username} />
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View profile and settings</p>
                      </TooltipContent>
                    </ShadcnTooltip>

                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                        <div className="p-4 border-b">
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
                                  {currentUser?.role}
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
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <User className="mr-3 h-4 w-4" />
                            Edit Profile
                          </button>
                          <button
                            onClick={() => {
                              localStorage.removeItem('authToken');
                              localStorage.removeItem('currentUser');
                              window.location.href = '/';
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <LogOut className="mr-3 h-4 w-4" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
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
                          value={settings.widget_position_x}
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
                          value={settings.widget_position_y}
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

                <TextField
                  fullWidth
                  size="small"
                  label="Widget Image URL (optional)"
                  value={settings.widget_image || ''}
                  onChange={(e) => updateSetting('widget_image', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </CardContent>
            </Card>

            {/* Animation Settings */}
            <Card>
              <CardHeader title="Animation Settings" />
              <CardContent className="space-y-4">
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Animation Type</InputLabel>
                      <Select
                        value={settings.widget_animation}
                        label="Animation Type"
                        onChange={(e) => updateSetting('widget_animation', e.target.value)}
                      >
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="bounce">Bounce</MenuItem>
                        <MenuItem value="pulse">Pulse</MenuItem>
                        <MenuItem value="shake">Shake</MenuItem>
                        <MenuItem value="glow">Glow</MenuItem>
                        <MenuItem value="slide-in">Slide In</MenuItem>
                        <MenuItem value="rotation">Rotation</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box className="space-y-2">
                      <Typography variant="subtitle2">Animation Duration (ms)</Typography>
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
                  </Grid>
                </Grid>
                <Box className="space-y-2">
                  <Typography variant="subtitle2">Animation Delay (ms)</Typography>
                  <Slider
                    value={settings.animation_delay}
                    onChange={(e, newValue) => updateSetting('animation_delay', newValue)}
                    min={0}
                    max={10000}
                    step={500}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: 0, label: '0s' },
                      { value: 5000, label: '5s' },
                      { value: 10000, label: '10s' }
                    ]}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Widget Preview */}
            <Card>
              <CardHeader title="Widget Preview" />
              <CardContent>
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
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <Typography color="text.secondary">
                    Widget preview will appear here
                  </Typography>
                  
                  {/* Mock widget */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      width: settings.widget_size === 'large' ? 80 : settings.widget_size === 'medium' ? 64 : 48,
                      height: settings.widget_size === 'large' ? 80 : settings.widget_size === 'medium' ? 64 : 48,
                      backgroundColor: settings.widget_color,
                      borderRadius: settings.widget_shape === 'circle' ? '50%' : settings.widget_shape === 'rounded' ? 2 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <ChatBubble sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Business Hours Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box p={3} className="space-y-6">
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <Business className="w-5 h-5" />
                    Business Hours Configuration
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.business_hours_enabled}
                      onChange={(e) => updateSetting('business_hours_enabled', e.target.checked)}
                    />
                  }
                  label="Enable Business Hours (widget only available during business hours)"
                />

                {settings.business_hours_enabled && (
                  <>
                    <FormControl size="small" className="min-w-48">
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={settings.timezone}
                        label="Timezone"
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                      >
                        <MenuItem value="America/New_York">Eastern Time</MenuItem>
                        <MenuItem value="America/Chicago">Central Time</MenuItem>
                        <MenuItem value="America/Denver">Mountain Time</MenuItem>
                        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                      </Select>
                    </FormControl>

                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Weekly Schedule</Typography>
                    
                    {Object.entries(settings.schedule).map(([day, daySettings]) => (
                      <Card key={day} variant="outlined">
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid size={2}>
                              <FormControlLabel
                                control={
                                  <Switch 
                                    checked={daySettings.enabled}
                                    onChange={(e) => updateSchedule(day, 'enabled', e.target.checked)}
                                  />
                                }
                                label={day.charAt(0).toUpperCase() + day.slice(1)}
                              />
                            </Grid>
                            {daySettings.enabled && (
                              <>
                                <Grid size={3}>
                                  <TextField
                                    type="time"
                                    size="small"
                                    label="Open"
                                    value={daySettings.open}
                                    onChange={(e) => updateSchedule(day, 'open', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                </Grid>
                                <Grid size={3}>
                                  <TextField
                                    type="time"
                                    size="small"
                                    label="Close"
                                    value={daySettings.close}
                                    onChange={(e) => updateSchedule(day, 'close', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                </Grid>
                              </>
                            )}
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}

                    <Box className="flex justify-between items-center mt-4">
                      <Typography variant="h6">Holidays</Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => setHolidayDialogOpen(true)}
                      >
                        Add Holiday
                      </Button>
                    </Box>

                    <List>
                      {settings.holidays.map((holiday: any, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={holiday.name}
                            secondary={holiday.date}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" onClick={() => {
                              const newHolidays = [...settings.holidays];
                              newHolidays.splice(index, 1);
                              updateSetting('holidays', newHolidays);
                            }}>
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Messages & Text Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box p={3} className="space-y-6">
            <Card>
              <CardHeader title="Customizable Messages" />
              <CardContent className="space-y-4">
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
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Queue Message"
                  value={settings.queue_message || ''}
                  onChange={(e) => updateSetting('queue_message', e.target.value)}
                  placeholder="You are in queue. Please wait for the next available agent."
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Staff Disconnect Message"
                  value={settings.staff_disconnect_message || ''}
                  onChange={(e) => updateSetting('staff_disconnect_message', e.target.value)}
                  placeholder="Your support agent has been disconnected. We are connecting you with another agent."
                />
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Functionality Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box p={3} className="space-y-6">
            {/* Pre-chat Form */}
            <Card>
              <CardHeader title="Pre-chat Form Settings" />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.require_name}
                      onChange={(e) => updateSetting('require_name', e.target.checked)}
                    />
                  }
                  label="Require visitor name"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.require_email}
                      onChange={(e) => updateSetting('require_email', e.target.checked)}
                    />
                  }
                  label="Require visitor email"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.require_phone}
                      onChange={(e) => updateSetting('require_phone', e.target.checked)}
                    />
                  }
                  label="Require visitor phone number"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.require_department}
                      onChange={(e) => updateSetting('require_department', e.target.checked)}
                    />
                  }
                  label="Require department selection"
                />
              </CardContent>
            </Card>

            {/* Chat Features */}
            <Card>
              <CardHeader title="Chat Features" />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.show_agent_typing}
                      onChange={(e) => updateSetting('show_agent_typing', e.target.checked)}
                    />
                  }
                  label="Show agent typing indicators"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.show_queue_position}
                      onChange={(e) => updateSetting('show_queue_position', e.target.checked)}
                    />
                  }
                  label="Show queue position to visitors"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.enable_file_uploads}
                      onChange={(e) => updateSetting('enable_file_uploads', e.target.checked)}
                    />
                  }
                  label="Enable file uploads"
                />
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.enable_screenshot_sharing}
                      onChange={(e) => updateSetting('enable_screenshot_sharing', e.target.checked)}
                    />
                  }
                  label="Enable screenshot sharing"
                />

                {settings.enable_file_uploads && (
                  <>
                    <TextField
                      type="number"
                      size="small"
                      label="Max File Size (MB)"
                      value={settings.max_file_size_mb}
                      onChange={(e) => updateSetting('max_file_size_mb', parseInt(e.target.value))}
                      inputProps={{ min: 1, max: 50 }}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Session Settings */}
            <Card>
              <CardHeader title="Session & Recovery" />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.session_recovery_enabled}
                      onChange={(e) => updateSetting('session_recovery_enabled', e.target.checked)}
                    />
                  }
                  label="Enable session recovery"
                />
                
                {settings.session_recovery_enabled && (
                  <TextField
                    type="number"
                    size="small"
                    label="Session Recovery Time (minutes)"
                    value={settings.session_recovery_minutes}
                    onChange={(e) => updateSetting('session_recovery_minutes', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 30 }}
                  />
                )}

                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.auto_ticket_creation}
                      onChange={(e) => updateSetting('auto_ticket_creation', e.target.checked)}
                    />
                  }
                  label="Auto-create tickets from chat sessions"
                />
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Communication Tab */}
        <TabPanel value={activeTab} index={4}>
          <Box p={3} className="space-y-6">
            {/* Include the typing detection and read receipts UI from the documentation */}
            {/* This would be the content from Public_Portal_Typing_ReadReceipts_AdminUI.md */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <Message className="w-5 h-5" />
                    Communication Features
                  </Typography>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Configure typing indicators, read receipts, and other communication features
                </Typography>
                <Box mt={2}>
                  <Alert severity="info">
                    Communication features configuration panel will be implemented here based on the detailed specifications.
                  </Alert>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Recovery & Disconnects Tab */}
        <TabPanel value={activeTab} index={5}>
          <Box p={3} className="space-y-6">
            {/* Auto-Requeue Settings */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <RestoreFromTrash className="w-5 h-5" />
                    Auto-Requeue Settings
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.auto_requeue_enabled}
                      onChange={(e) => updateSetting('auto_requeue_enabled', e.target.checked)}
                    />
                  }
                  label="Enable automatic requeue when staff disconnects"
                />

                {settings.auto_requeue_enabled && (
                  <>
                    <FormControl fullWidth size="small">
                      <InputLabel>Requeue Position Strategy</InputLabel>
                      <Select
                        value={settings.requeue_position}
                        label="Requeue Position Strategy"
                        onChange={(e) => updateSetting('requeue_position', e.target.value)}
                      >
                        <MenuItem value="front">Front of Queue (Highest Priority)</MenuItem>
                        <MenuItem value="priority_boost">Priority Boost (Recommended)</MenuItem>
                        <MenuItem value="original">Original Position</MenuItem>
                        <MenuItem value="end">End of Queue</MenuItem>
                      </Select>
                    </FormControl>

                    <Box className="space-y-2">
                      <Typography variant="subtitle2">Priority Boost Amount</Typography>
                      <Slider
                        value={settings.priority_boost_amount}
                        onChange={(e, newValue) => updateSetting('priority_boost_amount', newValue)}
                        min={0}
                        max={3}
                        step={1}
                        valueLabelDisplay="auto"
                        marks={[
                          { value: 0, label: 'None' },
                          { value: 1, label: '+1 Level' },
                          { value: 2, label: '+2 Levels' },
                          { value: 3, label: 'Max Priority' }
                        ]}
                      />
                      <Typography variant="caption" color="text.secondary">
                        How many priority levels to boost (Normal → High → Urgent → VIP)
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Staff Disconnect Detection */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <Timer className="w-5 h-5" />
                    Staff Disconnect Detection
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="Disconnect Timeout (seconds)"
                      value={settings.staff_disconnect_timeout}
                      onChange={(e) => updateSetting('staff_disconnect_timeout', parseInt(e.target.value))}
                      inputProps={{ min: 10, max: 300 }}
                      helperText="Time before considering staff disconnected"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="Grace Period (seconds)"
                      value={settings.grace_period_seconds}
                      onChange={(e) => updateSetting('grace_period_seconds', parseInt(e.target.value))}
                      inputProps={{ min: 30, max: 300 }}
                      helperText="Time to wait for staff reconnection"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="Auto-Reassign Timeout (seconds)"
                      value={settings.auto_reassign_after_seconds}
                      onChange={(e) => updateSetting('auto_reassign_after_seconds', parseInt(e.target.value))}
                      inputProps={{ min: 60, max: 600 }}
                      helperText="Max time before forcing reassignment"
                    />
                  </Grid>
                </Grid>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Flow:</strong> Staff disconnect detected → Grace period → Auto-requeue with priority boost → Auto-reassign timeout → Force end session
                  </Typography>
                </Alert>
              </CardContent>
            </Card>

            {/* Guest Notifications */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <NotificationsActive className="w-5 h-5" />
                    Guest Notification Settings
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.notify_guest_on_staff_disconnect}
                      onChange={(e) => updateSetting('notify_guest_on_staff_disconnect', e.target.checked)}
                    />
                  }
                  label="Notify guests when their agent disconnects"
                />

                {settings.notify_guest_on_staff_disconnect && (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Staff Disconnect Message"
                      value={settings.staff_disconnect_message || ''}
                      onChange={(e) => updateSetting('staff_disconnect_message', e.target.value)}
                      placeholder="Your support agent has been disconnected. We are connecting you with another agent."
                      helperText="Message shown to guest when staff disconnects"
                    />

                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Reassignment Message"
                      value={settings.reassignment_message || ''}
                      onChange={(e) => updateSetting('reassignment_message', e.target.value)}
                      placeholder="You have been connected with a new support agent."
                      helperText="Message shown when guest is connected to new staff"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Escalation Settings */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <PriorityHigh className="w-5 h-5" />
                    Escalation & Priority Management
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.escalate_on_multiple_disconnects}
                      onChange={(e) => updateSetting('escalate_on_multiple_disconnects', e.target.checked)}
                    />
                  }
                  label="Escalate sessions after multiple staff disconnects"
                />

                {settings.escalate_on_multiple_disconnects && (
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        label="Max Disconnects Before Escalation"
                        value={settings.max_disconnects_before_escalation}
                        onChange={(e) => updateSetting('max_disconnects_before_escalation', parseInt(e.target.value))}
                        inputProps={{ min: 1, max: 5 }}
                        helperText="Number of disconnects that trigger escalation"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Escalation Priority Level</InputLabel>
                        <Select
                          value={settings.escalation_priority}
                          label="Escalation Priority Level"
                          onChange={(e) => updateSetting('escalation_priority', e.target.value)}
                        >
                          <MenuItem value="urgent">Urgent</MenuItem>
                          <MenuItem value="vip">VIP</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            {/* Session Abandonment */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <Warning className="w-5 h-5" />
                    Session Abandonment Detection
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Guest Inactivity Timeout (minutes)"
                  value={settings.guest_inactivity_timeout}
                  onChange={(e) => updateSetting('guest_inactivity_timeout', parseInt(e.target.value))}
                  inputProps={{ min: 5, max: 60 }}
                  helperText="Minutes of guest inactivity before considering session abandoned"
                />

                <FormControlLabel
                  control={
                    <Switch 
                      checked={settings.auto_end_abandoned_sessions}
                      onChange={(e) => updateSetting('auto_end_abandoned_sessions', e.target.checked)}
                    />
                  }
                  label="Automatically end abandoned sessions"
                />

                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>Caution:</strong> Abandoned sessions are automatically closed to free up staff resources. Guests can always start a new chat session.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>

            {/* Recovery Statistics Preview */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6" className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recovery Statistics (Live Preview)
                  </Typography>
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">24</Typography>
                      <Typography variant="caption">Sessions Recovered Today</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main">89%</Typography>
                      <Typography variant="caption">Recovery Success Rate</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="warning.main">3.2m</Typography>
                      <Typography variant="caption">Avg Recovery Time</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="info.main">5</Typography>
                      <Typography variant="caption">Staff Disconnects Today</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Analytics Tab */}
        {/* Staff Work Modes Tab */}
        <TabPanel value={activeTab} index={6}>
          <Box p={3}>
            {/* Permission Check */}
            {(!currentUser?.permissions?.includes('public_portal.manage_work_modes') && 
              !currentUser?.permissions?.includes('admin.system_settings')) ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  You need "public_portal.manage_work_modes" permission to access this section.
                </Typography>
              </Alert>
            ) : (
              <Box className="space-y-6">
                {/* Work Mode System Settings */}
                <Card>
                  <CardHeader
                    title={
                      <Typography variant="h6" className="flex items-center gap-2">
                        <Settings />
                        Work Mode System Settings
                      </Typography>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      {/* Auto Assignment */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.work_mode_auto_assignment_enabled}
                              onChange={(e) => updateSetting('work_mode_auto_assignment_enabled', e.target.checked)}
                            />
                          }
                          label="Enable Automatic Chat Assignment"
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          Automatically assign new chats to available staff
                        </Typography>
                      </Grid>

                      {/* Queue Timeout */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Max Queue Time (minutes)"
                          type="number"
                          value={settings.work_mode_max_queue_time_minutes}
                          onChange={(e) => updateSetting('work_mode_max_queue_time_minutes', parseInt(e.target.value))}
                          helperText="Time before escalating unassigned chats"
                          fullWidth
                        />
                      </Grid>

                      {/* Escalation */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.work_mode_escalate_unassigned}
                              onChange={(e) => updateSetting('work_mode_escalate_unassigned', e.target.checked)}
                            />
                          }
                          label="Escalate Unassigned Chats"
                        />
                        <Typography variant="caption" color="text.secondary" display="block">
                          Escalate chats that remain unassigned after timeout
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Work Mode Auto-Accept Settings */}
                <Card>
                  <CardHeader
                    title={
                      <Typography variant="h6" className="flex items-center gap-2">
                        <ChatBubbleOutline />
                        Auto-Accept Chat Settings
                      </Typography>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.work_mode_ready_auto_accept}
                              onChange={(e) => updateSetting('work_mode_ready_auto_accept', e.target.checked)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">🟢 Ready Mode</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Auto-accept new chats
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 4 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.work_mode_work_auto_accept}
                              onChange={(e) => updateSetting('work_mode_work_auto_accept', e.target.checked)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">🟡 Work Mode</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Manual chat acceptance
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 4 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.work_mode_ticketing_auto_accept}
                              onChange={(e) => updateSetting('work_mode_ticketing_auto_accept', e.target.checked)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">🔵 Ticketing Mode</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Focus on tickets, no chats
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Work Mode Timeout Settings */}
                <Card>
                  <CardHeader
                    title={
                      <Typography variant="h6" className="flex items-center gap-2">
                        <AccessTime />
                        Auto-Timeout Settings
                      </Typography>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Break Timeout (minutes)"
                          type="number"
                          value={settings.work_mode_break_timeout_minutes}
                          onChange={(e) => updateSetting('work_mode_break_timeout_minutes', parseInt(e.target.value))}
                          helperText="Automatically change from 'Break' to 'Away' after timeout"
                          fullWidth
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Away Timeout (minutes)"
                          type="number"
                          value={settings.work_mode_away_timeout_minutes}
                          onChange={(e) => updateSetting('work_mode_away_timeout_minutes', parseInt(e.target.value))}
                          helperText="Time before marking inactive staff as 'Away'"
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Work Mode Descriptions */}
                <Card>
                  <CardHeader
                    title={
                      <Typography variant="h6" className="flex items-center gap-2">
                        <Edit />
                        Customize Work Mode Labels & Descriptions
                      </Typography>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      {Object.entries(settings.work_mode_descriptions || {}).map(([mode, description]) => (
                        <Grid size={{ xs: 12, md: 6 }} key={mode}>
                          <TextField
                            label={`${mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ')} Description`}
                            value={(description as string) || ''}
                            onChange={(e) => updateSetting('work_mode_descriptions', {
                              ...(settings.work_mode_descriptions || {}),
                              [mode]: e.target.value
                            })}
                            multiline
                            rows={2}
                            fullWidth
                            helperText={`Description shown to staff for ${mode.replace('_', ' ')} mode`}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={7}>
          <Box p={3} className="space-y-6">
            <Card>
              <CardHeader title="Analytics & Reporting" />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Chat analytics and performance metrics will be displayed here
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Paper>

      {/* Save Button */}
      <Box mt={4} className="flex justify-end">
        <Button 
          variant="contained" 
          onClick={saveSettings}
          disabled={saving}
          size="large"
          className="px-8"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </Box>

      {/* Color Picker Dialog */}
      <Dialog open={colorPickerOpen} onClose={() => setColorPickerOpen(false)}>
        <DialogTitle>Choose Widget Color</DialogTitle>
        <DialogContent>
          <ColorPicker
            color={settings.widget_color}
            onChange={(color) => updateSetting('widget_color', color)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorPickerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={currentUser}
        onProfileUpdate={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }}
      />
      </Box>
    </div>
  );
};

export default PublicPortalAdmin;