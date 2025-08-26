'use client';

import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, CardHeader, Typography, Tabs, Tab,
  Switch, Select, MenuItem, TextField, FormControl, FormControlLabel, 
  InputLabel, Button, Divider, Chip, Grid, Alert, 
  Paper, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Slider,
  Tooltip, Badge, CircularProgress
} from '@mui/material';
import {
  Palette, Settings, Schedule, Message, Analytics,
  ExpandMore, Edit, Delete, Add, ColorLens, Business,
  AccessTime, Language, Star, Help, Visibility, VisibilityOff,
  NotificationsActive, VolumeUp, ChatBubble, Phone, Email
} from '@mui/icons-material';
import { ColorPicker } from '@/components/shared/ColorPicker';

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
    disabled_pages: [] as string[]
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

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
      const response = await fetch('/api/admin/public-portal/settings');
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
      const response = await fetch('/api/admin/public-portal/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Public Portal Live Chat Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure the public chat widget, business hours, and customer support features
        </Typography>
      </Box>

      {/* Master Enable/Disable */}
      <Alert 
        severity={settings.enabled ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        action={
          <FormControlLabel
            control={
              <Switch 
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
                color={settings.enabled ? 'success' : 'warning'}
              />
            }
            label={settings.enabled ? 'Live Chat Enabled' : 'Live Chat Disabled'}
            labelPlacement="start"
          />
        }
      >
        {settings.enabled 
          ? 'Public live chat is currently ENABLED and visible to website visitors'
          : 'Public live chat is currently DISABLED. Enable to make it available to visitors'
        }
      </Alert>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<ChatBubble />} label="Widget Settings" />
          <Tab icon={<Schedule />} label="Business Hours" />
          <Tab icon={<Message />} label="Messages & Text" />
          <Tab icon={<Settings />} label="Functionality" />
          <Tab icon={<Palette />} label="Communication" />
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
                  <Grid item xs={12} md={6}>
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
                  <Grid item xs={12} md={6}>
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
                  <Grid item xs={12} md={6}>
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
                  <Grid item xs={12} md={6}>
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
                      <Grid item xs={6}>
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
                      <Grid item xs={6}>
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
                  value={settings.widget_text}
                  onChange={(e) => updateSetting('widget_text', e.target.value)}
                  placeholder="Chat with us"
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Widget Image URL (optional)"
                  value={settings.widget_image}
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
                  <Grid item xs={12} md={6}>
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
                  <Grid item xs={12} md={6}>
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
                            <Grid item xs={2}>
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
                                <Grid item xs={3}>
                                  <TextField
                                    type="time"
                                    size="small"
                                    label="Open"
                                    value={daySettings.open}
                                    onChange={(e) => updateSchedule(day, 'open', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                  />
                                </Grid>
                                <Grid item xs={3}>
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
                  value={settings.welcome_message}
                  onChange={(e) => updateSetting('welcome_message', e.target.value)}
                  placeholder="Hi! How can we help you today?"
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Offline Message"
                  value={settings.offline_message}
                  onChange={(e) => updateSetting('offline_message', e.target.value)}
                  placeholder="We are currently offline. Please submit a ticket."
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Business Hours Message"
                  value={settings.business_hours_message}
                  onChange={(e) => updateSetting('business_hours_message', e.target.value)}
                  placeholder="Live chat available Monday-Friday, 7:00 AM - 6:00 PM EST."
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Queue Message"
                  value={settings.queue_message}
                  onChange={(e) => updateSetting('queue_message', e.target.value)}
                  placeholder="You are in queue. Please wait for the next available agent."
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Staff Disconnect Message"
                  value={settings.staff_disconnect_message}
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

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={5}>
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
    </Box>
  );
};

export default PublicPortalAdmin;