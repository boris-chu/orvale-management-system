'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  LogoutOutlined, ExpandMore, ExpandLess, Delete,
  RemoveCircle, MoreVert
} from '@mui/icons-material';
import { ColorPicker } from '@/components/shared/ColorPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { socketClient } from '@/lib/socket-client';
import apiClient from '@/lib/api-client';
import { StaffWorkModeManager } from '@/components/public-portal/StaffWorkModeManager';
import { publicPortalSocket } from '@/lib/public-portal-socket';
import { UserAvatar } from '@/components/UserAvatar';
import { StaffTicketModal } from '@/components/StaffTicketModal';

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
  status: 'waiting' | 'abandoned' | 'reconnected' | 'escalated' | 'active';
  department?: string;
  initialMessage?: string;
  joinedAt: Date;
  // Assignment information for badge display
  assignedTo?: string;
  assignedStaffName?: string;
  assignedStaffAvatar?: string;
  // Previously assigned information for returned sessions
  previouslyAssignedTo?: string;
  previouslyAssignedStaffName?: string;
  previouslyAssignedStaffAvatar?: string;
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
  
  // Staff Ticket Modal state
  const [staffTicketModalOpen, setStaffTicketModalOpen] = useState(false);
  const [ticketModalContext, setTicketModalContext] = useState<{
    guestInfo: GuestSession;
    chatMessages: any[];
    sessionId: string;
  } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [guestQueueExpanded, setGuestQueueExpanded] = useState(true);
  const [staffOnlineExpanded, setStaffOnlineExpanded] = useState(true);
  const [removeSessionDialog, setRemoveSessionDialog] = useState<{
    open: boolean;
    session: GuestSession | null;
    reason: string;
  }>({ open: false, session: null, reason: '' });

  const workspaceRef = useRef<HTMLDivElement>(null);
  const chatWindowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Memoized default values for StaffTicketModal to prevent infinite re-renders
  const ticketModalDefaultValues = useMemo(() => {
    if (!ticketModalContext) return undefined;
    
    return {
      title: `Chat Session: ${ticketModalContext.guestInfo.guestName}`,
      description: `Chat session with ${ticketModalContext.guestInfo.guestName}.\n\nInitial message: ${ticketModalContext.guestInfo.initialMessage}\n\nDepartment: ${ticketModalContext.guestInfo.department}`,
      userDisplayName: ticketModalContext.guestInfo.guestName,
      userEmail: `${ticketModalContext.guestInfo.guestName.toLowerCase().replace(/\s+/g, '.')}@guest.com`,
      submittedBy: ticketModalContext.guestInfo.guestName,
      priority: ticketModalContext.guestInfo.priority === 'urgent' ? 'urgent' : 
               ticketModalContext.guestInfo.priority === 'high' ? 'high' : 'medium',
      category: '', // Let user select category first
      requestType: '', // Let user select request type after category
      status: 'pending', // Use 'pending' instead of 'open'
      assignedTeam: currentUser?.team_id || 'ITTS_Region7' // Assign to current user's team
    };
  }, [ticketModalContext, currentUser?.team_id]);

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

  // Handle page visibility changes - refresh queue when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && realTimeEnabled) {
        console.log('👁️ Page became visible - refreshing queue data');
        loadRealQueueData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [realTimeEnabled]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setAuthError('Authentication required. Please log in to access the public queue.');
        setLoading(false);
        return;
      }

      const result = await apiClient.getCurrentUser();

      if (result.success) {
        const user = result.data;
        
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

      // Listen for public portal specific updates and refresh queue data
      publicPortalSocket.addEventListener(componentId, 'queue:update', (data) => {
        console.log('📊 Public portal queue update - refreshing data:', data);
        // Refresh queue data when Socket.io notifies us of changes
        setTimeout(() => loadRealQueueData(), 100); // Small delay to ensure DB is updated
      });

      publicPortalSocket.addEventListener(componentId, 'session:started', (data) => {
        console.log('✅ New session started - refreshing queue:', data);
        // Refresh queue data when new session starts
        setTimeout(() => loadRealQueueData(), 100);
      });

      publicPortalSocket.addEventListener(componentId, 'session:ended', (data) => {
        console.log('❌ Session ended - refreshing queue:', data);
        // Refresh queue data when session ends
        setTimeout(() => loadRealQueueData(), 100);
      });

      // Additional event listeners for comprehensive coverage
      publicPortalSocket.addEventListener(componentId, 'session:assigned', (data) => {
        console.log('👥 Session assigned to staff - refreshing queue:', data);
        setTimeout(() => loadRealQueueData(), 100);
      });

      publicPortalSocket.addEventListener(componentId, 'session:returned_to_queue', (data) => {
        console.log('🔄 Session returned to queue - refreshing queue:', data);
        setTimeout(() => loadRealQueueData(), 100);
      });

      // Listen for socket connection status changes
      publicPortalSocket.addEventListener(componentId, 'connect', () => {
        console.log('🔌 Public portal socket connected - refreshing queue data');
        setTimeout(() => loadRealQueueData(), 500); // Longer delay for connection setup
      });

      publicPortalSocket.addEventListener(componentId, 'disconnect', () => {
        console.log('🔌 Public portal socket disconnected');
      });

      // Load real queue data from server
      loadRealQueueData();

      // Set up periodic refresh to catch any missed socket events
      // This ensures guests appear immediately even if socket events fail
      const refreshInterval = setInterval(() => {
        console.log('🔄 Periodic queue refresh...');
        loadRealQueueData();
      }, 5000); // Refresh every 5 seconds

      // Cleanup function
      return () => {
        socketClient.removeEventListeners(componentId);
        publicPortalSocket.removeEventListeners(componentId);
        clearInterval(refreshInterval);
      };
    } catch (error) {
      console.error('Failed to initialize real-time updates:', error);
    }
  };

  const loadRealQueueData = async () => {
    if (!realTimeEnabled) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No auth token available for queue refresh');
        return;
      }

      console.log('🔍 Loading real queue data...');

      // Load active guest sessions from server
      const guestResult = await apiClient.getPublicQueueGuests();

      console.log('📡 Guest API response:', guestResult.success);

      if (guestResult.success) {
        const guestData = guestResult.data;
        console.log('📊 Guest data received:', {
          success: true,
          guestCount: guestData.guests?.length || 0,
          rawData: guestData
        });
        
        if (guestData.guests) {
          const realGuests: GuestSession[] = guestData.guests.map((guest: any) => ({
            id: guest.session_id,
            guestName: guest.guest_name || `Guest #${guest.session_id.slice(-3)}`,
            waitTime: guest.wait_time_seconds || 0,
            waitTimeFormatted: guest.wait_time_formatted || formatWaitTime(guest.wait_time_seconds || 0),
            priority: guest.priority || 'normal',
            status: guest.status || 'waiting',
            department: guest.department || 'General Support',
            initialMessage: guest.initial_message || '',
            joinedAt: new Date(guest.created_at),
            // Assignment information
            assignedTo: guest.assigned_to,
            assignedStaffName: guest.assigned_staff_name,
            assignedStaffAvatar: guest.assigned_staff_avatar,
            // Previously assigned information for badge display
            previouslyAssignedTo: guest.previously_assigned_to,
            previouslyAssignedStaffName: guest.previously_assigned_staff_name,
            previouslyAssignedStaffAvatar: guest.previously_assigned_staff_avatar
          }));
          
          // Remove duplicates based on session_id
          const uniqueGuests = realGuests.filter((guest, index, self) => 
            index === self.findIndex(g => g.id === guest.id)
          );
          
          console.log('✅ Setting guest queue with', uniqueGuests.length, 'unique guests:', uniqueGuests.map(g => ({ id: g.id, name: g.guestName, status: g.status })));
          setGuestQueue(uniqueGuests);
        } else {
          console.log('❌ Invalid guest data format or no guests');
        }
      } else {
        console.error('❌ Failed to load guest queue:', guestResult.message);
      }

      // Load active staff from server
      const staffResult = await apiClient.getPublicQueueStaff();

      if (staffResult.success) {
        const staffData = staffResult.data;
        if (staffData.staff) {
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
      const result = await apiClient.getStaffWorkModes();

      if (result.success) {
        const data = result.data;
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
      const result = await apiClient.updateStaffWorkMode(newMode, newStatusMessage || statusMessage);

      if (result.success) {
        console.log('Work mode updated:', result.message);
      } else {
        console.error('Failed to update work mode:', result.message);
      }
    } catch (error) {
      console.error('Error updating work mode:', error);
    }
  };

  const updateWaitTimes = () => {
    setGuestQueue(prev => prev.map(guest => {
      // Calculate time based on original created timestamp to avoid drift
      const createdTime = guest.joinedAt.getTime();
      const currentTime = Date.now();
      const waitTimeSeconds = Math.max(0, Math.floor((currentTime - createdTime) / 1000));
      
      return {
        ...guest,
        waitTime: waitTimeSeconds,
        waitTimeFormatted: formatWaitTime(waitTimeSeconds)
      };
    }));
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
        const result = await apiClient.autoAssignGuestToAgent(guest.id);

        if (result.success) {
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

  const handleCreateTicketFromChat = (sessionId: string, guestInfo: GuestSession, chatMessages?: any[]) => {
    console.log('🎫 Creating ticket from chat session:', sessionId);
    
    // Set the context for the modal
    setTicketModalContext({
      guestInfo,
      chatMessages: chatMessages || [],
      sessionId
    });
    
    // Open the modal
    setStaffTicketModalOpen(true);
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

  // Remove session from queue
  const handleRemoveSession = async (session: GuestSession, reason: string) => {
    try {
      console.log('🗑️ Attempting to remove session:', session.id, 'Guest name:', session.guestName);
      
      const result = await apiClient.removeGuestFromQueue(session.id);
      
      if (result.success) {
        // Remove from local state
        setGuestQueue(prev => prev.filter(g => g.id !== session.id));
        
        // Close dialog
        setRemoveSessionDialog({ open: false, session: null, reason: '' });
        
        console.log(`✅ Removed session ${session.id} from queue`);
      } else {
        console.error('Failed to remove session:', data.error);
        alert('Failed to remove session: ' + data.error);
      }
    } catch (error) {
      console.error('Error removing session:', error);
      alert('Error removing session from queue');
    }
  };

  const openRemoveSessionDialog = (session: GuestSession) => {
    setRemoveSessionDialog({ 
      open: true, 
      session, 
      reason: '' 
    });
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
                  <Tooltip title="Refresh queue data">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔄 Manual queue refresh triggered');
                        loadRealQueueData();
                      }}
                      sx={{ color: themeColors.primary }}
                    >
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
                        secondaryAction={
                          (currentUser?.role === 'admin' || userPermissions.includes('public_portal.manage_queue')) && (
                            <Tooltip title="Remove from queue">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRemoveSessionDialog(guest);
                                }}
                                sx={{ color: 'text.secondary' }}
                              >
                                <RemoveCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
                              {guest.status === 'active' && guest.assignedStaffName && (
                                <Chip 
                                  label={`With ${guest.assignedStaffName}`}
                                  size="small" 
                                  color="success" 
                                  variant="outlined"
                                  avatar={guest.assignedStaffAvatar ? 
                                    <Avatar src={guest.assignedStaffAvatar} sx={{ width: 16, height: 16 }} /> : 
                                    <Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem' }}>
                                      {guest.assignedStaffName.charAt(0)}
                                    </Avatar>
                                  }
                                  sx={{ fontSize: 10, height: 18 }}
                                />
                              )}
                              {guest.status === 'waiting' && guest.previouslyAssignedStaffName && (
                                <Chip 
                                  label={`Previously: ${guest.previouslyAssignedStaffName}`}
                                  size="small" 
                                  color="info" 
                                  variant="outlined"
                                  avatar={guest.previouslyAssignedStaffAvatar ? 
                                    <Avatar src={guest.previouslyAssignedStaffAvatar} sx={{ width: 16, height: 16 }} /> : 
                                    <Avatar sx={{ width: 16, height: 16, fontSize: '0.6rem' }}>
                                      {guest.previouslyAssignedStaffName.charAt(0)}
                                    </Avatar>
                                  }
                                  sx={{ fontSize: 10, height: 18 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <>
                              <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                {guest.assignedTo ? 'Assisting' : `Waiting: ${guest.waitTimeFormatted || formatWaitTime(guest.waitTime)}`}
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
                onCreateTicket={handleCreateTicketFromChat}
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

      {/* Remove Session Dialog */}
      <Dialog 
        open={removeSessionDialog.open} 
        onClose={() => setRemoveSessionDialog({ open: false, session: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove Guest from Queue</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to remove <strong>{removeSessionDialog.session?.guestName}</strong> from the queue?
          </Typography>
          <TextField
            fullWidth
            label="Reason for removal (optional)"
            value={removeSessionDialog.reason}
            onChange={(e) => setRemoveSessionDialog(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="e.g., Stale session, duplicate request, resolved elsewhere..."
            multiline
            rows={2}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRemoveSessionDialog({ open: false, session: null, reason: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (removeSessionDialog.session) {
                handleRemoveSession(
                  removeSessionDialog.session, 
                  removeSessionDialog.reason || 'Removed by staff'
                );
              }
            }}
            variant="contained"
            color="error"
          >
            Remove from Queue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Ticket Modal for creating tickets from chat */}
      <StaffTicketModal
        open={staffTicketModalOpen}
        onOpenChange={setStaffTicketModalOpen}
        defaultValues={ticketModalDefaultValues}
        onSubmit={async (ticketData) => {
          console.log('🎫 Creating chat-sourced ticket with CS- prefix:', ticketData);
          
          // Add chat source information to ticket data
          const chatTicketData = {
            ...ticketData,
            ticketSource: 'chat_sourced' as const,
            createdByStaff: currentUser?.username || 'Unknown Staff'
          };
          
          try {
            const result = await apiClient.createStaffTicket(chatTicketData);
            
            if (result.success) {
              console.log('✅ Chat-sourced ticket created successfully:', result.data.ticketId);
              alert(`Ticket created successfully: ${result.data.ticketId}`);
              
              // Close modal after successful submission
              setStaffTicketModalOpen(false);
              setTicketModalContext(null);
            } else {
              console.error('❌ Failed to create ticket:', result.message);
              alert('Failed to create ticket: ' + result.message);
            }
          } catch (error) {
            console.error('❌ Error creating ticket:', error);
            alert('Error creating ticket. Please try again.');
          }
        }}
      />
    </Box>
  );
};

// Floatable Chat Window Component
interface FloatableChatWindowProps {
  chat: FloatableChat;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onCreateTicket: (sessionId: string, guestInfo: GuestSession, chatMessages?: any[]) => void;
}

const FloatableChatWindow = ({ chat, onClose, onMinimize, onFocus, onCreateTicket }: FloatableChatWindowProps) => {
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
                {chat.guestInfo.assignedTo ? 'Assisting' : formatWaitTime(chat.guestInfo.waitTime)} • {chat.guestInfo.priority}
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
                {chat.guestInfo.department} • {chat.guestInfo.assignedTo ? 'Assisting' : `Waiting: ${formatWaitTime(chat.guestInfo.waitTime)}`} • {chat.guestInfo.priority}
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
                overflow: 'hidden', // Change from 'auto' to 'hidden' to contain children
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100% - 140px)', // Reserve space for header and input
                minHeight: '200px'
              }}
            >
              {/* Live messages display */}
              <MessagesDisplay sessionId={chat.sessionId} guestInfo={chat.guestInfo} />
            </Box>

            {/* Input Area with Action Buttons */}
            <MessageInput 
              sessionId={chat.sessionId} 
              guestInfo={chat.guestInfo}
              onCreateTicket={onCreateTicket}
            />
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

  // Load message history when component mounts
  useEffect(() => {
    const loadMessageHistory = async () => {
      try {
        const result = await apiClient.getPublicChatMessages(sessionId);

        if (result.success) {
          const data = result.data;
          const formattedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            sender: msg.sender,
            message: msg.message,
            timestamp: new Date(msg.timestamp),
            senderName: msg.senderName
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to load message history:', error);
      }
    };

    loadMessageHistory();
  }, [sessionId]);

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
        // Prevent duplicate messages by checking if message ID already exists
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            console.log(`Duplicate guest message prevented: ${newMessage.id}`);
            return prev;
          }
          return [...prev, newMessage];
        });
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
        // Prevent duplicate messages by checking if message ID already exists
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            console.log(`Duplicate staff message prevented: ${newMessage.id}`);
            return prev;
          }
          return [...prev, newMessage];
        });
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
        gap: 1,
        maxHeight: '300px', // Set maximum height for messages area
        minHeight: '150px'  // Set minimum height
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
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'flex-end',
              gap: 1,
              maxWidth: '70%',
              flexDirection: message.sender === 'staff' ? 'row-reverse' : 'row'
            }}>
              <Paper
                sx={{
                  p: 1.5,
                  backgroundColor: message.sender === 'staff' ? '#1976d2' : '#fff',
                  color: message.sender === 'staff' ? 'white' : 'text.primary',
                  border: message.sender === 'guest' ? '1px solid #e0e0e0' : 'none',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message.sender === 'guest' && (
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                    {message.senderName}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  {message.message}
                </Typography>
              </Paper>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  opacity: 0.7,
                  fontSize: '0.7rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
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
  guestInfo: GuestSession;
  onCreateTicket: (sessionId: string, guestInfo: GuestSession, chatMessages?: any[]) => void;
}

const MessageInput = ({ sessionId, guestInfo, onCreateTicket }: MessageInputProps) => {
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
              // Open StaffTicketModal with chat context
              onCreateTicket(sessionId, guestInfo);
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
  // Handle negative, null, undefined, or invalid values
  if (!seconds || seconds < 0 || isNaN(seconds) || !isFinite(seconds)) {
    return '0m';
  }
  
  // Ensure we have a positive integer
  const validSeconds = Math.max(0, Math.floor(seconds));
  
  const minutes = Math.floor(validSeconds / 60);
  
  // For times less than 1 minute, still show as 0m (not seconds)
  if (minutes < 1) return '0m';
  
  // For times less than 60 minutes, show only minutes
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  // For sessions older than 24 hours, show days
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days === 1) {
    return remainingHours > 0 ? `1 day ${remainingHours}h` : '1 day';
  }
  return remainingHours > 0 ? `${days} days ${remainingHours}h` : `${days} days`;
};

export default PublicQueuePage;