'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent,
  Avatar, Badge, Chip, IconButton, Button, Divider,
  List, ListItem, ListItemText, ListItemAvatar,
  Switch, FormControlLabel, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert,
  CircularProgress, Tooltip, Fab, Drawer
} from '@mui/material';
import {
  Circle, AccessTime, Priority, Warning, Refresh,
  Settings, ColorLens, Message, Phone, VideoCall,
  PersonAdd, SwapHoriz, Assignment, NoteAdd,
  Minimize, Maximize, Close, DragIndicator,
  ChatBubbleOutline, Support, Queue, People
} from '@mui/icons-material';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '@/lib/socket-client';
import { StaffWorkModeManager } from '@/components/public-portal/StaffWorkModeManager';

interface StaffMember {
  id: string;
  name: string;
  status: 'ready' | 'helping' | 'ticketing' | 'away' | 'offline';
  activeChats: number;
  maxChats: number;
  avatar?: string;
  department?: string;
}

interface GuestSession {
  id: string;
  guestName: string;
  waitTime: number; // in seconds
  priority: 'normal' | 'high' | 'urgent' | 'vip';
  status: 'waiting' | 'abandoned' | 'reconnected' | 'escalated';
  department?: string;
  initialMessage?: string;
  joinedAt: Date;
}

interface FloatableChat {
  sessionId: string;
  guestInfo: GuestSession;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isFocused: boolean;
  staffHandler: string;
}

const PublicQueuePage = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [guestQueue, setGuestQueue] = useState<GuestSession[]>([]);
  
  // Mock data for when real-time is disabled
  const mockStaffMembers: StaffMember[] = [
    { id: '1', name: 'John Doe', status: 'ready', activeChats: 0, maxChats: 3, department: 'IT Support' },
    { id: '2', name: 'Jane Smith', status: 'helping', activeChats: 2, maxChats: 3, department: 'General Support' },
    { id: '3', name: 'Bob Wilson', status: 'ticketing', activeChats: 0, maxChats: 2, department: 'Technical' },
    { id: '4', name: 'Alice Johnson', status: 'ready', activeChats: 1, maxChats: 4, department: 'IT Support' }
  ];

  const mockGuestQueue: GuestSession[] = [
    {
      id: '123',
      guestName: 'Guest #123',
      waitTime: 180,
      priority: 'normal',
      status: 'waiting',
      department: 'IT Support',
      initialMessage: 'Need help with password reset',
      joinedAt: new Date(Date.now() - 180000)
    },
    {
      id: '456', 
      guestName: 'Sarah K.',
      waitTime: 900,
      priority: 'urgent',
      status: 'waiting',
      department: 'General Support',
      initialMessage: 'Urgent: System is down for our entire office',
      joinedAt: new Date(Date.now() - 900000)
    },
    {
      id: '789',
      guestName: 'Guest #789',
      waitTime: 1200,
      priority: 'high',
      status: 'abandoned',
      department: 'Technical',
      initialMessage: 'Connection issues with VPN',
      joinedAt: new Date(Date.now() - 1200000)
    }
  ];

  const [floatableChats, setFloatableChats] = useState<FloatableChat[]>([]);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);
  const [workMode, setWorkMode] = useState<'ready' | 'work_mode' | 'ticketing_mode' | 'away'>('away');
  const [workModeSettings, setWorkModeSettings] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [themeColors, setThemeColors] = useState({
    primary: '#d32f2f',
    secondary: '#ffebee',
    accent: '#ff5722',
    sidebar: '#fafafa',
    border: '#e0e0e0'
  });
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [currentColorKey, setCurrentColorKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const chatWindowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    checkAuthentication();
    
    // Update wait times every second
    const interval = setInterval(updateWaitTimes, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Initialize real-time updates or mock data after authentication and permission check
  useEffect(() => {
    if (!loading && !authError) {
      if (realTimeEnabled) {
        const cleanup = initializeRealTimeUpdates();
        return cleanup;
      } else {
        // Load mock data for static mode
        setStaffMembers(mockStaffMembers);
        setGuestQueue(mockGuestQueue);
      }
    }
  }, [realTimeEnabled, loading, authError]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setAuthError('Authentication required. Please log in to access the public queue.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const user = await response.json();
        
        // Check if user has permission to manage public queue
        if (!user.permissions?.includes('public_portal.manage_queue') && 
            !user.permissions?.includes('admin.system_settings')) {
          setAuthError('Insufficient permissions. You need "public_portal.manage_queue" permission to access this page.');
          setLoading(false);
          return;
        }
        
        // Store user permissions for real-time features
        setUserPermissions(user.permissions || []);
        
        // Check if user has real-time permission
        const hasRealTimePermission = user.permissions?.includes('public_portal.view_realtime_queue') || 
                                     user.permissions?.includes('admin.system_settings');
        setRealTimeEnabled(hasRealTimePermission);
        
        setCurrentStaff({
          id: user.user_id?.toString() || user.username,
          name: user.display_name || user.username,
          status: 'away',
          activeChats: 0,
          maxChats: 3,
          department: user.department || 'Support'
        });
        
        // Load work mode
        await loadWorkMode();
        
        setLoading(false);
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

  const initializeRealTimeUpdates = () => {
    if (!realTimeEnabled) {
      console.log('Real-time updates disabled - user lacks public_portal.view_realtime_queue permission');
      return;
    }

    console.log('Initializing real-time updates for public queue...');
    
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Connect to Socket.io for real-time updates
      const socket = socketClient.connect(token);
      const componentId = 'PublicQueue_' + Date.now();

      // Listen for queue updates
      socketClient.addEventListener(componentId, 'public_queue:guest_joined', (data) => {
        console.log('Guest joined queue:', data);
        setGuestQueue(prev => {
          // Add new guest to queue if not already present
          const exists = prev.some(g => g.id === data.sessionId);
          if (!exists) {
            const newGuest: GuestSession = {
              id: data.sessionId,
              guestName: data.guestName || `Guest #${data.sessionId.slice(-3)}`,
              waitTime: 0,
              priority: data.priority || 'normal',
              status: 'waiting',
              department: data.department || 'General Support',
              initialMessage: data.message || '',
              joinedAt: new Date()
            };
            return [...prev, newGuest].sort((a, b) => b.waitTime - a.waitTime);
          }
          return prev;
        });
      });

      socketClient.addEventListener(componentId, 'public_queue:guest_left', (data) => {
        console.log('Guest left queue:', data);
        setGuestQueue(prev => prev.filter(g => g.id !== data.sessionId));
      });

      socketClient.addEventListener(componentId, 'public_queue:staff_updated', (data) => {
        console.log('Staff status updated:', data);
        setStaffMembers(prev => prev.map(staff => 
          staff.id === data.staffId 
            ? { ...staff, status: data.status, activeChats: data.activeChats || staff.activeChats }
            : staff
        ));
      });

      // Load real queue data from server
      loadRealQueueData();

      // Cleanup function
      return () => {
        socketClient.removeEventListeners(componentId);
      };
    } catch (error) {
      console.error('Failed to initialize real-time updates:', error);
    }
  };

  const loadRealQueueData = async () => {
    if (!realTimeEnabled) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Load active guest sessions from server
      const guestResponse = await fetch('/api/public-portal/queue/guests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (guestResponse.ok) {
        const guestData = await guestResponse.json();
        if (guestData.success && guestData.guests) {
          const realGuests: GuestSession[] = guestData.guests.map((guest: any) => ({
            id: guest.session_id,
            guestName: guest.guest_name || `Guest #${guest.session_id.slice(-3)}`,
            waitTime: Math.floor((Date.now() - new Date(guest.created_at).getTime()) / 1000),
            priority: guest.priority || 'normal',
            status: guest.status || 'waiting',
            department: guest.department || 'General Support',
            initialMessage: guest.initial_message || '',
            joinedAt: new Date(guest.created_at)
          }));
          setGuestQueue(realGuests);
        }
      }

      // Load active staff from server
      const staffResponse = await fetch('/api/public-portal/queue/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        if (staffData.success && staffData.staff) {
          const realStaff: StaffMember[] = staffData.staff.map((staff: any) => ({
            id: staff.user_id?.toString() || staff.username,
            name: staff.display_name || staff.username,
            status: staff.work_mode || 'away',
            activeChats: staff.active_chats || 0,
            maxChats: staff.max_concurrent_chats || 3,
            department: staff.department || 'Support',
            avatar: staff.profile_picture
          }));
          setStaffMembers(realStaff);
        }
      }
    } catch (error) {
      console.error('Error loading real queue data:', error);
      // Keep using mock data if real data fails to load
    }
  };

  const loadWorkMode = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/staff/work-modes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkMode(data.work_mode || 'away');
        setStatusMessage(data.status_message || '');
        
        // Load work mode descriptions
        try {
          const descriptionsStr = data.work_mode_descriptions || '{}';
          const descriptions = typeof descriptionsStr === 'string' ? JSON.parse(descriptionsStr) : descriptionsStr;
          setWorkModeSettings(descriptions);
        } catch (e) {
          console.error('Error parsing work mode descriptions:', e);
        }
        
        // Update current staff status
        if (currentStaff) {
          setCurrentStaff(prev => prev ? { 
            ...prev, 
            status: data.work_mode || 'away',
            maxChats: data.max_concurrent_chats || 3
          } : null);
        }
      }
    } catch (error) {
      console.error('Error loading work mode:', error);
    }
  };

  const saveWorkMode = async (newMode: string, newStatusMessage?: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/staff/work-modes', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          work_mode: newMode,
          status_message: newStatusMessage || statusMessage,
          auto_accept_chats: newMode === 'ready' ? 1 : 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Work mode updated:', data.message);
      } else {
        console.error('Failed to update work mode');
      }
    } catch (error) {
      console.error('Error updating work mode:', error);
    }
  };

  const updateWaitTimes = () => {
    setGuestQueue(prev => prev.map(guest => ({
      ...guest,
      waitTime: Math.floor((Date.now() - guest.joinedAt.getTime()) / 1000)
    })));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <Circle sx={{ color: '#4caf50', fontSize: 12 }} />;
      case 'helping': return <Circle sx={{ color: '#f44336', fontSize: 12 }} />;
      case 'work_mode': return <Circle sx={{ color: '#ff9800', fontSize: 12 }} />;
      case 'ticketing_mode': return <Circle sx={{ color: '#2196f3', fontSize: 12 }} />;
      case 'break': return <Circle sx={{ color: '#9c27b0', fontSize: 12 }} />;
      case 'away': return <Circle sx={{ color: '#ff9800', fontSize: 12 }} />;
      case 'offline': return <Circle sx={{ color: '#757575', fontSize: 12 }} />;
      // Legacy support
      case 'ticketing': return <Circle sx={{ color: '#2196f3', fontSize: 12 }} />;
      case 'work': return <Circle sx={{ color: '#ff9800', fontSize: 12 }} />;
      default: return <Circle sx={{ color: '#757575', fontSize: 12 }} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'helping': return 'Helping';
      case 'work_mode': return 'Work Mode';
      case 'ticketing_mode': return 'Ticketing';
      case 'break': return 'Break';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      // Legacy support
      case 'ticketing': return 'Ticketing';
      case 'work': return 'Work Mode';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getPriorityIcon = (priority: string, status: string) => {
    if (status === 'abandoned') return '❌';
    if (status === 'reconnected') return '🔄';
    if (status === 'escalated') return '🆘';
    
    switch (priority) {
      case 'urgent': return '🔥';
      case 'high': return '⚡';
      case 'vip': return '👑';
      default: return '⏳';
    }
  };

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 1) return `${seconds}s`;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const handleGuestClick = (guest: GuestSession) => {
    if (!currentStaff || currentStaff.status !== 'ready') {
      alert('You must be in "Ready" mode to handle chats.');
      return;
    }

    // Create new floatable chat window
    const newChat: FloatableChat = {
      sessionId: guest.id,
      guestInfo: guest,
      position: { 
        x: 100 + (floatableChats.length * 50), 
        y: 100 + (floatableChats.length * 50) 
      },
      size: { width: 400, height: 600 },
      isMinimized: false,
      isFocused: true,
      staffHandler: currentStaff.id
    };

    setFloatableChats(prev => [...prev, newChat]);
    
    // Remove guest from queue
    setGuestQueue(prev => prev.filter(g => g.id !== guest.id));
    
    // Update staff status
    if (currentStaff) {
      setCurrentStaff(prev => prev ? { ...prev, activeChats: prev.activeChats + 1 } : null);
    }
  };

  const handleStaffClick = (staff: StaffMember) => {
    // Send internal message or collaboration request
    console.log('Contact staff member:', staff.name);
  };

  const updateWorkMode = async (newMode: 'ready' | 'work_mode' | 'ticketing_mode' | 'away') => {
    setWorkMode(newMode);
    if (currentStaff) {
      setCurrentStaff(prev => prev ? { ...prev, status: newMode } : null);
      
      // Emit real-time update if enabled
      if (realTimeEnabled && socketClient.isConnected()) {
        socketClient.emit('public_queue:staff_status_change', {
          staffId: currentStaff.id,
          status: newMode,
          activeChats: currentStaff.activeChats,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Save to database
    await saveWorkMode(newMode);
  };

  const openColorPicker = (colorKey: string) => {
    setCurrentColorKey(colorKey);
    setColorPickerOpen(true);
  };

  const updateThemeColor = (color: string) => {
    setThemeColors(prev => ({ ...prev, [currentColorKey]: color }));
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading Public Queue...</Typography>
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Real-time Permission Alert */}
      {!realTimeEnabled && (
        <Alert 
          severity="info" 
          sx={{ 
            m: 1, 
            borderRadius: 1,
            backgroundColor: '#e3f2fd',
            '& .MuiAlert-message': { fontSize: '0.875rem' }
          }}
        >
          <strong>Static Mode:</strong> Real-time queue updates are disabled. You are seeing snapshot data only. 
          Contact your administrator to enable the "public_portal.view_realtime_queue" permission for live updates.
        </Alert>
      )}

      {/* Header */}
      <Paper 
        elevation={1}
        sx={{ 
          p: 2, 
          backgroundColor: themeColors.primary, 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Support sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Public Support Queue
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Staff: {currentStaff?.name} | Queue: {guestQueue.length} waiting | Active: {floatableChats.length} chats
              {realTimeEnabled ? ' | 🟢 Real-time' : ' | 🔴 Static'}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Work Mode Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={workMode}
              onChange={(e) => updateWorkMode(e.target.value as any)}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                color: 'white',
                '& .MuiSelect-icon': { color: 'white' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }
              }}
            >
              <MenuItem value="ready">
                🟢 {workModeSettings?.ready || 'Ready'}
              </MenuItem>
              <MenuItem value="work_mode">
                🟡 {workModeSettings?.work_mode || 'Work Mode'}
              </MenuItem>
              <MenuItem value="ticketing_mode">
                🔵 {workModeSettings?.ticketing_mode || 'Ticketing Mode'}
              </MenuItem>
              <MenuItem value="away">
                🟠 {workModeSettings?.away || 'Away'}
              </MenuItem>
              <MenuItem value="break">
                ⏸️ {workModeSettings?.break || 'Break'}
              </MenuItem>
            </Select>
          </FormControl>

          <IconButton 
            onClick={() => setSettingsOpen(true)} 
            sx={{ color: 'white' }}
          >
            <Settings />
          </IconButton>
        </Box>
      </Paper>

      {/* Main Layout */}
      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* Left Sidebar */}
        <Paper 
          elevation={2}
          sx={{ 
            width: 400, 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: themeColors.sidebar,
            borderRight: `1px solid ${themeColors.border}`
          }}
        >
          {/* Staff Work Mode Manager */}
          <Box sx={{ p: 2, borderBottom: `2px solid ${themeColors.accent}` }}>
            <StaffWorkModeManager
              staffInfo={{
                id: currentStaff?.id || '',
                name: currentStaff?.name || 'Unknown',
                username: currentStaff?.id || ''
              }}
              onWorkModeChange={(newMode) => {
                if (currentStaff) {
                  setCurrentStaff(prev => prev ? { ...prev, status: newMode as any } : null);
                  setWorkMode(newMode as any);
                }
              }}
            />
          </Box>
          {/* Staff Section (Top 40%) */}
          <Box sx={{ 
            height: '40%', 
            borderBottom: `2px solid ${themeColors.accent}`,
            p: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <People sx={{ fontSize: 20, color: themeColors.primary }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Staff Online ({staffMembers.filter(s => s.status !== 'offline').length})
              </Typography>
            </Box>
            
            <List dense sx={{ maxHeight: 'calc(100% - 40px)', overflow: 'auto' }}>
              {staffMembers.filter(staff => staff.status !== 'offline').map((staff) => (
                <ListItem 
                  key={staff.id}
                  sx={{ 
                    cursor: 'pointer',
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': { backgroundColor: themeColors.secondary }
                  }}
                  onClick={() => handleStaffClick(staff)}
                >
                  <ListItemAvatar>
                    <Badge 
                      overlap="circular" 
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={getStatusIcon(staff.status)}
                    >
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {staff.name.substring(0, 2).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {staff.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {getStatusLabel(staff.status)} • {staff.activeChats}/{staff.maxChats} chats
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {staff.department}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Queue Section (Bottom 60%) */}
          <Box sx={{ 
            height: '60%',
            p: 2,
            overflow: 'auto'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Queue sx={{ fontSize: 20, color: themeColors.primary }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Guest Queue ({guestQueue.length})
              </Typography>
            </Box>

            <List dense>
              {guestQueue.map((guest) => (
                <ListItem 
                  key={guest.id}
                  sx={{ 
                    cursor: 'pointer',
                    borderRadius: 1,
                    mb: 1,
                    p: 1.5,
                    border: `1px solid ${themeColors.border}`,
                    borderLeft: `4px solid ${
                      guest.status === 'abandoned' ? '#f44336' :
                      guest.priority === 'urgent' ? '#ff5722' :
                      guest.priority === 'high' ? '#ff9800' :
                      guest.priority === 'vip' ? '#9c27b0' : 'transparent'
                    }`,
                    '&:hover': { 
                      backgroundColor: themeColors.secondary,
                      transform: 'translateX(4px)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                  onClick={() => handleGuestClick(guest)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {getPriorityIcon(guest.priority, guest.status)} {guest.guestName}
                        </Typography>
                        {guest.status === 'abandoned' && (
                          <Chip 
                            label="Abandoned" 
                            size="small" 
                            color="error" 
                            variant="outlined"
                            sx={{ fontSize: 10, height: 18 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Waiting: {formatWaitTime(guest.waitTime)}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          {guest.department}
                        </Typography>
                        {guest.initialMessage && (
                          <>
                            <br />
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ 
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '200px'
                              }}
                            >
                              "{guest.initialMessage}"
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {guestQueue.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                <Typography variant="body2">
                  No guests in queue
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Main Workspace */}
        <Box 
          ref={workspaceRef}
          sx={{ 
            flex: 1, 
            position: 'relative',
            backgroundColor: '#f5f5f5',
            overflow: 'hidden'
          }}
        >
          {floatableChats.length === 0 && (
            <Box 
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'text.secondary'
              }}
            >
              <Queue sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6">No Active Chats</Typography>
              <Typography variant="body2">
                Click on guests in the queue to start helping them
              </Typography>
            </Box>
          )}

          {/* Floatable Chat Windows */}
          <AnimatePresence>
            {floatableChats.map((chat) => (
              <FloatableChatWindow
                key={chat.sessionId}
                chat={chat}
                onClose={() => {
                  setFloatableChats(prev => prev.filter(c => c.sessionId !== chat.sessionId));
                  if (currentStaff) {
                    setCurrentStaff(prev => prev ? { ...prev, activeChats: Math.max(0, prev.activeChats - 1) } : null);
                  }
                }}
                onMinimize={() => {
                  setFloatableChats(prev => prev.map(c => 
                    c.sessionId === chat.sessionId 
                      ? { ...c, isMinimized: !c.isMinimized }
                      : c
                  ));
                }}
                onFocus={() => {
                  setFloatableChats(prev => prev.map(c => ({
                    ...c,
                    isFocused: c.sessionId === chat.sessionId
                  })));
                }}
              />
            ))}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Public Queue Settings
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Theme Colors</Typography>
          <Grid container spacing={2}>
            {Object.entries(themeColors).map(([key, value]) => (
              <Grid size={{ xs: 6, md: 4 }} key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    onClick={() => openColorPicker(key)}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: value,
                      borderRadius: 1,
                      border: '1px solid #ccc',
                      cursor: 'pointer'
                    }}
                  />
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Color Picker Dialog */}
      <Dialog open={colorPickerOpen} onClose={() => setColorPickerOpen(false)}>
        <DialogTitle>Choose Color</DialogTitle>
        <DialogContent>
          <ColorPicker
            color={themeColors[currentColorKey] || '#000000'}
            onChange={updateThemeColor}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorPickerOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Floatable Chat Window Component
interface FloatableChatWindowProps {
  chat: FloatableChat;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
}

const FloatableChatWindow = ({ chat, onClose, onMinimize, onFocus }: FloatableChatWindowProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(chat.position);
  
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && windowRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - chat.size.width;
        const maxY = window.innerHeight - chat.size.height;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, chat.size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    onFocus();
  };

  return (
    <motion.div
      ref={windowRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: chat.size.width,
        height: chat.isMinimized ? 60 : chat.size.height,
        zIndex: chat.isFocused ? 1001 : 1000
      }}
    >
      <Paper
        elevation={chat.isFocused ? 12 : 6}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: chat.isFocused ? '2px solid #d32f2f' : '1px solid #e0e0e0'
        }}
      >
        {/* Window Header */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            backgroundColor: '#d32f2f',
            color: 'white',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
              {chat.guestInfo.guestName.substring(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="bold">
                {chat.guestInfo.guestName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {formatWaitTime(chat.guestInfo.waitTime)} • {chat.guestInfo.priority}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <IconButton size="small" onClick={onMinimize} sx={{ color: 'white' }}>
              {chat.isMinimized ? <Maximize fontSize="small" /> : <Minimize fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Chat Content */}
        {!chat.isMinimized && (
          <Box sx={{ flex: 1, p: 2, backgroundColor: '#f9f9f9' }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Chat interface will be implemented here
            </Typography>
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

// Helper function (defined outside component to avoid redefinition)
const formatWaitTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return `${seconds}s`;
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
};

export default PublicQueuePage;