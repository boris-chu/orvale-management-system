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
  ChatBubbleOutline, Support, Queue, People, Send,
  LogoutOutlined, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '@/lib/socket-client';
import { StaffWorkModeManager } from '@/components/public-portal/StaffWorkModeManager';
import { publicPortalSocket } from '@/lib/public-portal-socket';
import { UserAvatar } from '@/components/UserAvatar';

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
  waitTimeFormatted?: string; // formatted time string
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guestQueueExpanded, setGuestQueueExpanded] = useState(true);
  const [staffOnlineExpanded, setStaffOnlineExpanded] = useState(true);

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

  // Handle click outside user menu
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
        
        // Store current user data
        setCurrentUser(user);
        
        // Check if user has real-time permission
        const hasRealTimePermission = user.permissions?.includes('public_portal.view_realtime_queue') || 
                                     user.permissions?.includes('admin.system_settings');
        setRealTimeEnabled(hasRealTimePermission);
        
        setCurrentStaff({
          id: user.user_id?.toString() || user.username,
          name: user.display_name || user.username,
          status: 'offline', // Will be updated by loadWorkMode
          activeChats: 0,
          maxChats: 3,
          department: user.department || 'Support'
        });
        
        // Load work mode (this will update the status)
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
      // Connect to both main socket and public portal socket for full coverage
      const socket = socketClient.connect(token);
      const publicSocket = publicPortalSocket.connect({ 
        name: 'Staff', 
        email: 'staff@system', 
        token 
      });
      const componentId = 'PublicQueue_' + Date.now();

      // Listen for general queue updates on main socket
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
              waitTimeFormatted: '0s',
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

      // Listen for public portal specific updates - but don't override, supplement
      publicPortalSocket.addEventListener(componentId, 'queue:update', (data) => {
        console.log('📊 Public portal queue update (supplement only):', data);
        // This is just for debugging/monitoring, don't update state to avoid duplicates
        // The API data is the primary source, Socket.io events supplement it
      });

      publicPortalSocket.addEventListener(componentId, 'session:started', (data) => {
        console.log('New session started:', data);
        // This will trigger a queue update
      });

      // Load real queue data from server
      loadRealQueueData();

      // Cleanup function
      return () => {
        socketClient.removeEventListeners(componentId);
        publicPortalSocket.removeEventListeners(componentId);
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
            waitTime: guest.wait_time_seconds || 0,
            waitTimeFormatted: guest.wait_time_formatted || formatWaitTime(guest.wait_time_seconds || 0),
            priority: guest.priority || 'normal',
            status: guest.status || 'waiting',
            department: guest.department || 'General Support',
            initialMessage: guest.initial_message || '',
            joinedAt: new Date(guest.created_at)
          }));
          
          // Remove duplicates based on session_id
          const uniqueGuests = realGuests.filter((guest, index, self) => 
            index === self.findIndex(g => g.id === guest.id)
          );
          
          setGuestQueue(uniqueGuests);
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
        
        // Update current staff status and work mode
        const currentMode = data.current_mode || 'away';
        setWorkMode(currentMode);
        if (currentStaff) {
          setCurrentStaff(prev => prev ? { 
            ...prev, 
            status: currentMode,
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

  const handleGuestClick = async (guest: GuestSession) => {
    console.log('🔍 Guest Click Debug:', {
      workMode,
      currentStaffStatus: currentStaff?.status,
      currentStaffId: currentStaff?.id,
      guestId: guest.id
    });
    
    // Check work mode instead of currentStaff.status for more reliable state
    if (workMode !== 'ready') {
      alert(`You must be in "Ready" mode to handle chats. Current mode: ${workMode}`);
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

    // Notify Socket.io server about session assignment
    if (realTimeEnabled && publicPortalSocket.isConnected()) {
      try {
        // Use the session assignment API for database update
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/public-portal/chat/auto-assign', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: guest.id,
            priority: guest.priority || 'normal',
            department: guest.department || null,
            isEscalated: false,
            forceAssign: currentStaff.id // Force assign to current staff
          })
        });

        if (response.ok) {
          console.log(`✅ Session ${guest.id} assigned to ${currentStaff.name}`);
        } else {
          console.error('Failed to assign session via API');
        }
      } catch (error) {
        console.error('Error assigning session:', error);
      }
      
      // Also notify via Socket.io for real-time updates
      publicPortalSocket.emit('staff:connect_to_session', {
        sessionId: guest.id
      });
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
          <IconButton 
            onClick={loadRealQueueData}
            sx={{ color: 'white' }}
          >
            <Refresh />
          </IconButton>
          
          <IconButton 
            onClick={() => setSettingsOpen(true)} 
            sx={{ color: 'white' }}
          >
            <Settings />
          </IconButton>
          
          {/* User Profile Avatar */}
          {currentUser && (
            <Box sx={{ position: 'relative' }}>
              <Tooltip title="User Menu">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  sx={{ 
                    padding: 0.5,
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <UserAvatar 
                    user={{...currentUser, username: currentUser?.username}}
                    size="md"
                    enableRealTimePresence={true}
                    sx={{
                      border: '2px solid rgba(255,255,255,0.3)',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.8)' }
                    }}
                  />
                </IconButton>
              </Tooltip>

              {/* User Menu Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      marginTop: 8,
                      width: 250,
                      zIndex: 1300
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paper
                      elevation={8}
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {/* User Info Section */}
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: 'grey.50',
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <UserAvatar 
                            user={{...currentUser, username: currentUser?.username}}
                            size="md"
                            enableRealTimePresence={false}
                          />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" fontWeight="bold" noWrap>
                              {currentUser?.display_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {currentUser?.email}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip 
                                label={currentUser?.role || 'User'} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Box>

                      {/* Menu Actions */}
                      <Box sx={{ p: 1 }}>
                        <Button
                          fullWidth
                          startIcon={<LogoutOutlined />}
                          onClick={() => {
                            localStorage.removeItem('authToken');
                            localStorage.removeItem('currentUser');
                            window.location.href = '/';
                          }}
                          sx={{ 
                            justifyContent: 'flex-start',
                            color: 'error.main',
                            '&:hover': { backgroundColor: 'error.lighter' },
                            py: 1
                          }}
                        >
                          Sign Out
                        </Button>
                      </Box>
                    </Paper>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          )}
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
          <Box sx={{ borderBottom: `2px solid ${themeColors.accent}` }}>
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

          {/* Guest Queue Section (Top Priority) - Only show if user has real-time queue permission */}
          {realTimeEnabled && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Guest Queue Header */}
              <Box 
                sx={{ 
                  p: 2, 
                  borderBottom: `1px solid ${themeColors.border}`,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: themeColors.secondary }
                }}
                onClick={() => setGuestQueueExpanded(!guestQueueExpanded)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Queue sx={{ fontSize: 20, color: themeColors.primary }} />
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                    Guest Queue ({guestQueue.length})
                  </Typography>
                  {guestQueueExpanded ? <ExpandLess /> : <ExpandMore />}
                </Box>
              </Box>

              {/* Guest Queue Content */}
              {guestQueueExpanded && (
                <Box sx={{ 
                  flex: guestQueue.length > 0 ? 1 : 0,
                  minHeight: guestQueue.length > 0 ? '200px' : 'auto',
                  overflow: 'auto',
                  p: 1
                }}>
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
                            <>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                Waiting: {guest.waitTimeFormatted || formatWaitTime(guest.waitTime)}
                              </span>
                              <br />
                              <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {guest.department}
                              </span>
                              {guest.initialMessage && (
                                <>
                                  <br />
                                  <span 
                                    style={{ 
                                      fontSize: '0.75rem', 
                                      color: 'rgba(0, 0, 0, 0.6)',
                                      display: 'block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '200px'
                                    }}
                                  >
                                    "{guest.initialMessage}"
                                  </span>
                                </>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>

                  {guestQueue.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <Typography variant="body2">
                        No guests in queue
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Staff Online Section */}
          <Box sx={{ flex: realTimeEnabled ? 0 : 1, display: 'flex', flexDirection: 'column' }}>
            {/* Staff Online Header */}
            <Box 
              sx={{ 
                p: 2, 
                borderTop: realTimeEnabled ? `1px solid ${themeColors.border}` : 'none',
                borderBottom: `1px solid ${themeColors.border}`,
                cursor: 'pointer',
                '&:hover': { backgroundColor: themeColors.secondary }
              }}
              onClick={() => setStaffOnlineExpanded(!staffOnlineExpanded)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People sx={{ fontSize: 20, color: themeColors.primary }} />
                <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                  Staff Online ({staffMembers.filter(s => s.status !== 'offline').length})
                </Typography>
                {staffOnlineExpanded ? <ExpandLess /> : <ExpandMore />}
              </Box>
            </Box>

            {/* Staff Online Content */}
            {staffOnlineExpanded && (
              <Box sx={{ 
                flex: 1,
                minHeight: '200px',
                overflow: 'auto',
                p: 1
              }}>
                <List dense>
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
                          <>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              {getStatusLabel(staff.status)} • {staff.activeChats}/{staff.maxChats} chats
                            </span>
                            <br />
                            <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                              {staff.department}
                            </span>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>

          {/* No Permission Message for Guest Queue */}
          {!realTimeEnabled && (
            <Box sx={{ p: 2 }}>
              <Alert severity="info">
                <Typography variant="body2" fontWeight="medium">
                  Guest Queue Access Restricted
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  You need the "public_portal.view_realtime_queue" permission to view the guest queue.
                </Typography>
              </Alert>
            </Box>
          )}
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Guest Information Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}>
              <Typography variant="body2" fontWeight="bold" color="primary">
                {chat.guestInfo.guestName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {chat.guestInfo.department} • Waiting: {formatWaitTime(chat.guestInfo.waitTime)} • {chat.guestInfo.priority}
              </Typography>
              {chat.guestInfo.initialMessage && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  "{chat.guestInfo.initialMessage}"
                </Typography>
              )}
            </Box>

            {/* Messages Area */}
            <Box 
              sx={{ 
                flex: 1, 
                overflow: 'auto',
                p: 1,
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              {/* System message: Staff connected */}
              <Box sx={{ textAlign: 'center', my: 1 }}>
                <Chip 
                  label={`You are now chatting with ${chat.guestInfo.guestName}`}
                  size="small"
                  sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                />
              </Box>

              {/* Initial guest message if exists */}
              {chat.guestInfo.initialMessage && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                  <Paper 
                    sx={{ 
                      p: 1, 
                      maxWidth: '70%',
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <Typography variant="body2">
                      {chat.guestInfo.initialMessage}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                      {chat.guestInfo.joinedAt.toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Live messages display */}
              <MessagesDisplay sessionId={chat.sessionId} guestInfo={chat.guestInfo} />
            </Box>

            {/* Input Area with Action Buttons */}
            <MessageInput sessionId={chat.sessionId} />
          </Box>
        )}
      </Paper>
    </motion.div>
  );
};

// Messages Display Component for Staff Chat
interface MessagesDisplayProps {
  sessionId: string;
  guestInfo: GuestSession;
}

interface ChatMessage {
  id: string;
  sender: 'guest' | 'staff' | 'system';
  message: string;
  timestamp: Date;
  senderName?: string;
}

const MessagesDisplay = ({ sessionId, guestInfo }: MessagesDisplayProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const componentId = `StaffMessages_${sessionId}_${Date.now()}`;
    
    // Use singleton socketClient for consistent connection
    const token = localStorage.getItem('authToken');
    if (token) {
      const socket = socketClient.connect(token);
      setIsConnected(socket.connected);
      
      // Notify that staff connected to this session
      socketClient.emit('staff:connect_to_session', { sessionId });
    }

    // Set up event listeners for this session using singleton only
    socketClient.addEventListener(componentId, 'guest:message', (data) => {
      if (data.sessionId === sessionId) {
        const newMessage: ChatMessage = {
          id: data.messageId || Date.now().toString(),
          sender: 'guest',
          message: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          senderName: guestInfo.guestName
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });

    // Listen for message confirmations when staff sends - use singleton only
    socketClient.addEventListener(componentId, 'staff:message_sent', (data) => {
      if (data.sessionId === sessionId) {
        const newMessage: ChatMessage = {
          id: data.messageId || Date.now().toString(),
          sender: 'staff',
          message: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          senderName: data.staffName || 'Staff'
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });

    socketClient.addEventListener(componentId, 'guest:typing', (data) => {
      if (data.sessionId === sessionId) {
        setIsTyping(data.isTyping);
      }
    });

    // Clean up
    return () => {
      socketClient.removeEventListeners(componentId);
      // Notify that staff disconnected from session
      if (socketClient.isConnected()) {
        socketClient.emit('staff:disconnect_from_session', { sessionId });
      }
    };
  }, [sessionId, guestInfo.guestName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box 
      sx={{ 
        flex: 1, 
        overflow: 'auto',
        p: 1,
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      {/* Connection Status */}
      {!isConnected && (
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Chip 
            label="Connecting to chat..."
            size="small"
            color="warning"
            icon={<CircularProgress size={12} />}
          />
        </Box>
      )}

      {/* System message: Staff connected */}
      <Box sx={{ textAlign: 'center', my: 1 }}>
        <Chip 
          label={`You are now chatting with ${guestInfo.guestName}`}
          size="small"
          sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
        />
      </Box>

      {/* Initial guest message if exists */}
      {guestInfo.initialMessage && messages.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
          <Paper 
            sx={{ 
              p: 1, 
              maxWidth: '70%',
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0'
            }}
          >
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>{guestInfo.guestName}:</strong>
            </Typography>
            <Typography variant="body2">
              {guestInfo.initialMessage}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
              {guestInfo.joinedAt.toLocaleTimeString()}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <Box
          key={message.id}
          sx={{
            display: 'flex',
            justifyContent: message.sender === 'staff' ? 'flex-end' : 
                           message.sender === 'guest' ? 'flex-start' : 'center',
            mb: 1
          }}
        >
          {message.sender === 'system' ? (
            <Chip 
              label={message.message}
              size="small"
              sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
            />
          ) : (
            <Paper
              sx={{
                p: 1.5,
                maxWidth: '70%',
                backgroundColor: message.sender === 'staff' ? '#1976d2' : '#fff',
                color: message.sender === 'staff' ? 'white' : 'text.primary',
                border: message.sender === 'guest' ? '1px solid #e0e0e0' : 'none'
              }}
            >
              {message.sender === 'guest' && (
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                  {message.senderName}
                </Typography>
              )}
              <Typography variant="body2">
                {message.message}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  opacity: 0.7, 
                  display: 'block', 
                  mt: 0.5,
                  color: message.sender === 'staff' ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                }}
              >
                {message.timestamp.toLocaleTimeString()}
              </Typography>
            </Paper>
          )}
        </Box>
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {guestInfo.guestName} is typing...
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}
              >
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'text.secondary' }} />
              </motion.div>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty state for new chats */}
      {messages.length === 0 && !guestInfo.initialMessage && (
        <Box sx={{ textAlign: 'center', mt: 2, opacity: 0.6 }}>
          <Typography variant="body2" color="text.secondary">
            💬 Chat session started
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Say hello to get the conversation going!
          </Typography>
        </Box>
      )}

      <div ref={messagesEndRef} />
    </Box>
  );
};

// Message Input Component for Staff
interface MessageInputProps {
  sessionId: string;
}

const MessageInput = ({ sessionId }: MessageInputProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const componentId = `MessageInput_${sessionId}_${Date.now()}`;
    
    // Use singleton socketClient instead of creating new connections
    const token = localStorage.getItem('authToken');
    if (token) {
      const socket = socketClient.connect(token);
      setIsConnected(socket.connected);
      
      // Monitor connection status
      const checkConnection = setInterval(() => {
        setIsConnected(socketClient.isConnected());
      }, 1000);

      return () => {
        clearInterval(checkConnection);
        socketClient.removeEventListeners(componentId);
      };
    }
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isConnected || isSending) return;

    setIsSending(true);
    const messageText = inputMessage.trim();
    setInputMessage('');
    
    // Stop typing indicator
    handleStopTyping();

    try {
      // Send message via singleton socketClient
      socketClient.emit('staff:message', {
        sessionId,
        message: messageText,
        timestamp: new Date().toISOString()
      });
      
      console.log('Message sent via singleton socket');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (!isConnected) return;

    if (!isTyping) {
      setIsTyping(true);
      socketClient.emit('staff:typing', { sessionId, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socketClient.emit('staff:typing', { sessionId, isTyping: false });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          placeholder={isConnected ? "Type your message..." : "Connecting..."}
          variant="outlined"
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          disabled={!isConnected || isSending}
          sx={{ flex: 1 }}
        />
        <IconButton 
          size="small" 
          color="primary"
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || !isConnected || isSending}
        >
          {isSending ? (
            <CircularProgress size={16} />
          ) : (
            <Send fontSize="small" />
          )}
        </IconButton>
      </Box>
      
      {/* Connection status */}
      {!isConnected && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          Not connected to chat service
        </Typography>
      )}
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<Assignment />}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
            onClick={() => {
              // TODO: Implement create ticket functionality
              console.log('Create ticket for session:', sessionId);
            }}
          >
            Create Ticket
          </Button>
          <Button
            size="small"
            startIcon={<SwapHoriz />}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
            onClick={() => {
              // TODO: Implement transfer functionality
              console.log('Transfer session:', sessionId);
            }}
          >
            Transfer
          </Button>
        </Box>
        
        <Button
          size="small"
          color="error"
          variant="text"
          sx={{ fontSize: '0.75rem' }}
          onClick={() => {
            // TODO: Implement end chat functionality
            if (confirm('Are you sure you want to end this chat session?')) {
              socketClient.emit('staff:end_session', { sessionId });
            }
          }}
        >
          End Chat
        </Button>
      </Box>
    </Box>
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