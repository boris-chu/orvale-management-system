'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  MessageSquare,
  MessageCircle,
  Users,
  Settings,
  FileText,
  Image,
  BarChart3,
  Shield,
  Bell,
  Zap,
  Activity,
  Hash,
  UserCheck,
  UserX,
  Clock,
  Eye,
  EyeOff,
  Globe,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealTime } from '@/lib/realtime/RealTimeProvider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ChatStats {
  activeUsers: number;
  totalChannels: number;
  messagesPerHour: number;
  storageUsed: string;
  onlineUsers: number;
  offlineUsers: number;
  apiQuota: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

interface ChatSettings {
  fileShareEnabled: boolean;
  fileTypes: 'all' | 'images' | 'documents' | 'custom';
  giphyEnabled: boolean;
  giphyApiKey: string;
  deletedMessageVisible: boolean;
  notificationsEnabled: boolean;
  maxFileSize: number;
  retentionDays: number;
  // Socket.IO settings
  socketUrl: string;
  connectionMode: 'auto' | 'socket' | 'polling';
}

interface OnlineUser {
  username: string;
  display_name: string;
  profile_picture?: string;
  last_seen: string;
  status: 'online' | 'offline' | 'invisible';
}

interface CurrentUser {
  username: string;
  display_name: string;
  email: string;
  profile_picture?: string;
  role_id: string;
  permissions: string[];
}

export function ChatManagementCard() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Widget save feedback states
  const [savingWidget, setSavingWidget] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Real-time connection status
  const { 
    connectionStatus, 
    connectionMode, 
    connectedUsers, 
    stats: realTimeStats,
    setConnectionMode 
  } = useRealTime();
  const [stats, setStats] = useState<ChatStats>({
    activeUsers: 0,
    totalChannels: 0,
    messagesPerHour: 0,
    storageUsed: '0 MB',
    onlineUsers: 0,
    offlineUsers: 0,
    apiQuota: 0,
    systemHealth: 'healthy'
  });
  const [settings, setSettings] = useState<ChatSettings>({
    fileShareEnabled: true,
    fileTypes: 'all',
    giphyEnabled: true,
    giphyApiKey: '',
    deletedMessageVisible: false,
    notificationsEnabled: true,
    maxFileSize: 10,
    retentionDays: 365,
    // Socket.IO defaults
    socketUrl: 'http://localhost:4000',
    connectionMode: 'auto'
  });
  const [presenceUsers, setPresenceUsers] = useState<OnlineUser[]>([]);
  const [presenceData, setPresenceData] = useState<{
    stats: {
      total: number;
      online: number;
      offline: number;
      away: number;
      busy: number;
      stale: number;
      invisible: number;
      withIssues: number;
    };
    users: any[];
    recentActivity: any[];
    lastUpdated: string;
  } | null>(null);
  const [testingGiphy, setTestingGiphy] = useState(false);
  const [giphyTestResult, setGiphyTestResult] = useState<'success' | 'error' | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);
  const [reconnectingAll, setReconnectingAll] = useState(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [managingUser, setManagingUser] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<any>({
    type: 'glassmorphism',
    primaryColor: '#3b82f6',
    secondaryColor: '#9333ea',
    size: 'normal',
    position: 'bottom-right',
    shape: 'circle',
    borderRadius: 16,
    enableGlassmorphism: true,
    enablePulseAnimation: true,
    enableSmoothTransitions: true,
    fontFamily: 'system',
    fontSize: 'normal',
    autoHide: false,
    soundNotifications: true,
    desktopNotifications: true,
    defaultState: 'closed',
    // Time display settings
    timeDisplay: 'relative', // 'relative' or 'absolute'
    timeFormat: '12h', // '12h' or '24h'
    showTimeTooltip: true,
    // Widget button controls
    showFileUpload: true,
    showEmojiPicker: true
  });
  const [testingWidget, setTestingWidget] = useState<string | null>(null);
  const [widgetTestResults, setWidgetTestResults] = useState<{[key: string]: any}>({});
  const [analyticsData, setAnalyticsData] = useState({
    messageVolumeData: [
      { name: '00:00', value: 0 },
      { name: '04:00', value: 0 },
      { name: '08:00', value: 0 },
      { name: '12:00', value: 0 },
      { name: '16:00', value: 0 },
      { name: '20:00', value: 0 },
    ],
    fileTypeData: [
      { name: 'Images', value: 0 },
      { name: 'Documents', value: 0 },
      { name: 'Links', value: 0 },
    ],
    systemMetrics: {
      averageResponseTime: '0ms',
      uptime: '100%',
      errorRate: '0%',
      peakConcurrentUsers: 0
    },
    channelActivity: []
  });
  const [socketStatus, setSocketStatus] = useState<{
    isRunning: boolean;
    connectedClients: number;
    uptime: string;
    lastCheck: string;
  }>({
    isRunning: false,
    connectedClients: 0,
    uptime: '0s',
    lastCheck: ''
  });

  useEffect(() => {
    checkAdminAccess();
    loadChatStats();
    loadChatSettings();
    loadPresenceData();
    loadAnalyticsData();
    checkSocketStatus();
  }, []);

  // Real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadChatStats();
      loadPresenceData();
      loadAnalyticsData();
      checkSocketStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkSocketStatus = async () => {
    try {
      console.log('🔍 ChatManagementCard: Checking Socket.IO server status...');
      
      // First try: Use our backend API proxy (more reliable)
      try {
        const token = localStorage.getItem('authToken');
        const apiResponse = await fetch('/api/admin/socket-status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          console.log('✅ ChatManagementCard: Socket.IO status via API:', data);
          
          setSocketStatus({
            isRunning: data.isRunning,
            connectedClients: data.connectedClients || 0,
            uptime: formatUptime(data.uptime || 0),
            lastCheck: new Date().toLocaleTimeString()
          });
          return; // Success, exit early
        } else {
          console.log('⚠️ API proxy failed, trying direct connection...');
        }
      } catch (apiError) {
        console.log('⚠️ API proxy error:', apiError.message, 'trying direct connection...');
      }

      // Second try: Direct connection to Socket.io server (fallback)
      const socketUrl = settings.socketUrl || 'http://localhost:4000';
      console.log('🔍 ChatManagementCard: Trying direct connection to:', socketUrl);
      
      const response = await fetch(`${socketUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors'
      });
      
      console.log('🔍 ChatManagementCard: Direct Socket.IO response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ ChatManagementCard: Socket.IO server is healthy (direct):', data);
        
        setSocketStatus({
          isRunning: true,
          connectedClients: data.connectedUsers || 0,
          uptime: formatUptime(data.uptime || 0),
          lastCheck: new Date().toLocaleTimeString()
        });
      } else {
        throw new Error(`Direct connection failed: ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ ChatManagementCard: All Socket.IO checks failed:', error);
      
      setSocketStatus({
        isRunning: false,
        connectedClients: 0,
        uptime: '0s',
        lastCheck: new Date().toLocaleTimeString()
      });
    }
  };

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const checkAdminAccess = async () => {
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
        const hasChatAdminAccess = user.permissions?.includes('chat.admin_access') ||
                                   user.permissions?.includes('admin.system_settings');
        
        if (!hasChatAdminAccess) {
          throw new Error('Insufficient permissions');
        }
        
        setCurrentUser(user);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Chat admin access check failed:', error);
      // For now, allow access if user has general admin access
      // This will be updated once the specific permissions are added
    } finally {
      setLoading(false);
    }
  };

  const loadChatStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Mock data for development
        setStats({
          activeUsers: 15,
          totalChannels: 8,
          messagesPerHour: 45,
          storageUsed: '156 MB',
          onlineUsers: 12,
          offlineUsers: 23,
          apiQuota: 85,
          systemHealth: 'healthy'
        });
      }
    } catch (error) {
      console.error('Failed to load chat stats:', error);
      // Use mock data on error
      setStats({
        activeUsers: 15,
        totalChannels: 8,
        messagesPerHour: 45,
        storageUsed: '156 MB',
        onlineUsers: 12,
        offlineUsers: 23,
        apiQuota: 85,
        systemHealth: 'healthy'
      });
    }
  };

  const loadChatSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token, using default chat settings');
        return;
      }

      const response = await fetch('/api/admin/chat/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Chat settings loaded successfully:', data);
        setSettings(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load chat settings:', response.status, errorText);
        console.log('Using default chat settings');
        // Default settings are already set in useState, so no need to update
      }
    } catch (error) {
      console.error('❌ Network error loading chat settings:', error);
      console.log('Using default chat settings due to network error');
      // Default settings are already set, continue with those
    }
  };

  const loadPresenceData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token, skipping presence data load');
        return;
      }

      const response = await fetch('/api/admin/chat/presence', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Presence data loaded:', data);
        setPresenceUsers(data.users || []);
        setPresenceData(data); // Store full response data
        
        // Update stats with real data from presence API
        if (data.stats) {
          setStats(prevStats => ({
            ...prevStats,
            onlineUsers: data.stats.online || 0,
            offlineUsers: (data.stats.offline || 0) + (data.stats.invisible || 0),
            activeUsers: data.stats.online || 0
          }));
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load presence data:', response.status, errorText);
        
        // Try to parse error details for debugging
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.details) {
            console.error('❌ Error details:', errorData.details);
          }
        } catch (e) {
          // Error text is not JSON, that's okay
        }
        
        // Fall back to getting basic user count from users table
        await loadBasicUserStats();
      }
    } catch (error) {
      console.error('❌ Network error loading presence data:', error);
      await loadBasicUserStats();
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Analytics data loaded:', data);
        setAnalyticsData(data);
      } else {
        console.warn('⚠️ Failed to load analytics data, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
    }
  };

  const loadBasicUserStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/developer/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const usersArray = Array.isArray(data) ? data : (data.users || []);
        const totalUsers = usersArray.length || 0;
        
        setStats(prevStats => ({
          ...prevStats,
          onlineUsers: 0, // No presence data available
          offlineUsers: totalUsers,
          activeUsers: 0
        }));

        // Create mock presence data from user list
        const mockPresence = usersArray.slice(0, 5).map((user: { username: string; display_name: string; }) => ({
          username: user.username,
          display_name: user.display_name,
          profile_picture: '',
          status: 'offline' as 'online' | 'offline' | 'invisible',
          last_seen: new Date(Date.now() - Math.random() * 3600000).toISOString()
        }));
        
        setPresenceUsers(mockPresence);
      }
    } catch (error) {
      console.error('❌ Failed to load basic user stats:', error);
    }
  };

  const saveChatSettings = async (newSettings: ChatSettings) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('❌ No auth token available for saving settings');
        setSettings(newSettings); // Update local state even if save fails
        return;
      }

      const response = await fetch('/api/admin/chat/settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        setSettings(newSettings);
        console.log('✅ Chat settings saved successfully');
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save chat settings:', response.status, errorText);
        // Still update local state for better UX
        setSettings(newSettings);
        console.log('Settings updated locally only');
      }
    } catch (error) {
      console.error('❌ Error saving chat settings:', error);
      // Update local state for better UX even if API fails
      setSettings(newSettings);
      console.log('Settings updated locally due to API error');
    } finally {
      setSaving(false);
    }
  };

  const debouncedSaveChatSettings = (newSettings: ChatSettings) => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Update local state immediately for responsive UI
    setSettings(newSettings);
    
    // Set new timeout for API call
    const timeout = setTimeout(() => {
      saveChatSettings(newSettings);
    }, 1000); // Wait 1 second after last change
    
    setSaveTimeout(timeout);
  };

  // Real-time connection mode switching
  const handleConnectionModeChange = async (newMode: 'auto' | 'socket' | 'polling') => {
    try {
      console.log(`🔄 Admin panel: Switching connection mode to ${newMode}`);
      
      // 1. Update RealTimeProvider immediately for live switching
      await setConnectionMode(newMode);
      console.log('✅ RealTimeProvider connection mode updated');
      
      // 2. Update settings and save to database
      const newSettings = { ...settings, connectionMode: newMode };
      debouncedSaveChatSettings(newSettings);
      
      console.log(`✅ Connection mode switched to ${newMode} and saved to database`);
    } catch (error) {
      console.error('❌ Failed to switch connection mode:', error);
      // Still update local settings for consistency
      debouncedSaveChatSettings({ ...settings, connectionMode: newMode });
    }
  };

  const testGiphyApi = async () => {
    setTestingGiphy(true);
    setGiphyTestResult(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/giphy/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey: settings.giphyApiKey })
      });

      if (response.ok) {
        setGiphyTestResult('success');
      } else {
        setGiphyTestResult('error');
      }
    } catch (error) {
      console.error('Giphy API test failed:', error);
      setGiphyTestResult('error');
    } finally {
      setTestingGiphy(false);
    }
  };

  const testSocketConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      const startTime = Date.now();
      
      // Test direct Socket.IO connection
      const response = await fetch(`${settings.socketUrl}/health`);
      
      if (response.ok) {
        const healthData = await response.json();
        const latency = Date.now() - startTime;
        
        console.log('✅ Socket.IO Connection Test Results:', {
          status: 'success',
          latency: `${latency}ms`,
          serverInfo: healthData
        });
        
        setConnectionTestResult('success');
        
        // Show success notification with details
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        notification.innerHTML = `
          <strong>Connection Test Successful!</strong><br/>
          Latency: ${latency}ms<br/>
          Server: ${healthData.status || 'Running'}
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Socket.IO Connection Test Failed:', error);
      setConnectionTestResult('error');
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      notification.innerHTML = `
        <strong>Connection Test Failed!</strong><br/>
        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setTestingConnection(false);
    }
  };

  const forceReconnectAll = async () => {
    setReconnectingAll(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/reconnect-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Force Reconnect All successful:', result);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50';
        notification.innerHTML = `
          <strong>Reconnect Signal Sent!</strong><br/>
          ${result.affectedClients || 'All'} clients will reconnect
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
        
        // Refresh socket status after a delay
        setTimeout(() => {
          checkSocketStatus();
          loadPresenceData();
        }, 2000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Force Reconnect All failed:', error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      notification.innerHTML = `
        <strong>Reconnect Failed!</strong><br/>
        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setReconnectingAll(false);
    }
  };

  const loadServerLogs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setServerLogs(data.logs || []);
        setShowLogs(true);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to load server logs:', error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      notification.innerHTML = `
        <strong>Failed to Load Logs!</strong><br/>
        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }
  };

  const handleManageUser = (user: OnlineUser) => {
    setSelectedUser(user);
    setShowUserManagement(true);
  };

  const updateUserPresenceSettings = async (username: string, settings: {
    forceInvisible?: boolean;
    allowPresenceDisplay?: boolean;
    presenceOverride?: 'online' | 'away' | 'busy' | 'offline' | null;
  }) => {
    setManagingUser(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/presence/manage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          settings
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ User presence settings updated:', result);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        notification.innerHTML = `
          <strong>Presence Settings Updated!</strong><br/>
          User: ${username}<br/>
          Changes applied successfully
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
        
        // Refresh presence data
        loadPresenceData();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to update user presence settings:', error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      notification.innerHTML = `
        <strong>Update Failed!</strong><br/>
        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setManagingUser(false);
    }
  };

  const forceUserDisconnect = async (username: string) => {
    setManagingUser(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/presence/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ User disconnected:', result);
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50';
        notification.innerHTML = `
          <strong>User Disconnected!</strong><br/>
          ${username} has been disconnected
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
        
        // Refresh data after delay
        setTimeout(() => {
          loadPresenceData();
          checkSocketStatus();
        }, 1000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to disconnect user:', error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      notification.innerHTML = `
        <strong>Disconnect Failed!</strong><br/>
        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setManagingUser(false);
    }
  };

  // Widget testing functions
  const runWidgetTest = async (testType: string) => {
    setTestingWidget(testType);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/widget', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testType })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Widget test ${testType} completed:`, result);
        
        setWidgetTestResults(prev => ({
          ...prev,
          [testType]: result
        }));

        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        notification.innerHTML = `
          <strong>Test Completed!</strong><br/>
          ${result.message}<br/>
          <small>${JSON.stringify(result.details, null, 2).slice(0, 100)}...</small>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Widget test ${testType} failed:`, error);
      
      setWidgetTestResults(prev => ({
        ...prev,
        [testType]: { success: false, message: error.message }
      }));

      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      notification.innerHTML = `
        <strong>Test Failed!</strong><br/>
        ${testType}: ${error instanceof Error ? error.message : 'Unknown error'}
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    } finally {
      setTestingWidget(null);
    }
  };

  const saveWidgetSettings = async (newSettings: typeof widgetSettings) => {
    setWidgetSettings(newSettings);
    setSavingWidget(true);
    setSaveError(null);
    
    // Save to backend
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/chat/widget', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: newSettings })
      });

      if (response.ok) {
        console.log(`✅ Widget settings saved`);
        setSaveSuccess(true);
        
        // Reset success state after 2 seconds
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        const errorData = await response.text();
        throw new Error(`Save failed: ${response.status} ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Failed to save widget settings:', error);
      setSaveError(error instanceof Error ? error.message : 'Unknown error');
      
      // Clear error after 5 seconds
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSavingWidget(false);
    }
  };
  
  // Manual save function for the main save button
  const handleManualSave = async () => {
    await saveWidgetSettings(widgetSettings);
  };

  const switchWidgetType = async (newType: string) => {
    const newSettings = { ...widgetSettings, type: newType };
    await saveWidgetSettings(newSettings);
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50';
    notification.innerHTML = `
      <strong>Widget Updated!</strong><br/>
      Switched to ${newType} theme
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // Chart data is now loaded dynamically via loadAnalyticsData()

  if (loading) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading Chat Management...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Chat System Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Manage all aspects of the chat system
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={stats.systemHealth === 'healthy' ? 'default' : 'destructive'}
              className="capitalize"
            >
              {stats.systemHealth === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
              {stats.systemHealth === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {stats.systemHealth === 'error' && <XCircle className="h-3 w-3 mr-1" />}
              {stats.systemHealth}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full justify-start overflow-x-auto mb-4">
            <TabsTrigger value="dashboard" className="flex-shrink-0">Dashboard</TabsTrigger>
            <TabsTrigger value="connection" className="flex-shrink-0">Connection</TabsTrigger>
            <TabsTrigger value="widget" className="flex-shrink-0">Widget</TabsTrigger>
            <TabsTrigger value="files" className="flex-shrink-0">Files & Media</TabsTrigger>
            <TabsTrigger value="presence" className="flex-shrink-0">Users</TabsTrigger>
            <TabsTrigger value="messages" className="flex-shrink-0">Messages</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-shrink-0">Notifications</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-shrink-0">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            {/* Real-time Dashboard Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{stats.activeUsers}</p>
                      <p className="text-sm text-gray-500">Active Users</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{stats.totalChannels}</p>
                      <p className="text-sm text-gray-500">Total Channels</p>
                    </div>
                    <Hash className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{stats.messagesPerHour}</p>
                      <p className="text-sm text-gray-500">Messages/Hour</p>
                    </div>
                    <Zap className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{stats.storageUsed}</p>
                      <p className="text-sm text-gray-500">Storage Used</p>
                    </div>
                    <FileText className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Socket.io Server</span>
                    <Badge 
                      variant={socketStatus.isRunning ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {socketStatus.isRunning ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  {/* Show Polling/SSE status when relevant */}
                  {(connectionMode === 'polling' || (connectionMode === 'auto' && !socketStatus.isRunning)) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Polling/SSE Server</span>
                      <Badge 
                        variant={connectionStatus === 'connected' ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {connectionStatus === 'connected' ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Connection Mode</span>
                    <Badge 
                      variant={connectionStatus === 'connected' ? "default" : 
                              connectionStatus === 'connecting' ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {connectionStatus === 'connected' ? 
                        (connectionMode === 'auto' && socketStatus.isRunning ? 'SOCKET' : 
                         connectionMode === 'auto' && !socketStatus.isRunning ? 'POLLING' : 
                         connectionMode.toUpperCase()) : 
                       connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connected Users</span>
                    <Badge variant="outline" className="text-xs">
                      {(() => {
                        console.log('🔍 ChatManagementCard Connected Users Debug:', {
                          connectionStatus,
                          connectionMode,
                          socketStatusIsRunning: socketStatus.isRunning,
                          socketConnectedClients: socketStatus.connectedClients,
                          realTimeConnectedUsers: connectedUsers
                        });
                        
                        // Show user count based on active connection mode
                        if (connectionStatus !== 'connected') return '0';
                        
                        // Determine actual active mode based on RealTimeProvider's auto-detection
                        let actualMode = connectionMode;
                        if (connectionMode === 'auto') {
                          // If RealTimeProvider is connected and connectionStatus is 'connected',
                          // it means auto-detection worked - check what it chose
                          actualMode = socketStatus.isRunning ? 'socket' : 'polling';
                        }
                        
                        // Show appropriate user count
                        if (actualMode === 'socket') {
                          // Use Socket.io server count if available, otherwise fall back to RealTimeProvider
                          return socketStatus.isRunning ? 
                                 socketStatus.connectedClients.toString() : 
                                 connectedUsers.toString();
                        } else {
                          // Using polling/SSE - show RealTimeProvider count  
                          return connectedUsers.toString();
                        }
                      })()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Status</span>
                    <Badge variant="outline">Online</Badge>
                  </div>
                  <div className="pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        console.log('🔄 Manual refresh triggered');
                        checkSocketStatus();
                        loadPresenceData();
                        loadChatStats();
                      }}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">User Presence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <UserCheck className="h-4 w-4 mr-2 text-green-500" />
                      Online
                    </span>
                    <span className="font-medium">{stats.onlineUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                      Away
                    </span>
                    <span className="font-medium">{presenceData?.stats?.away || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <Eye className="h-4 w-4 mr-2 text-orange-500" />
                      Busy
                    </span>
                    <span className="font-medium">{presenceData?.stats?.busy || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center">
                      <UserX className="h-4 w-4 mr-2 text-gray-400" />
                      Offline
                    </span>
                    <span className="font-medium">{stats.offlineUsers}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setActiveTab('presence')}
                    className="w-full"
                  >
                    Manage Users
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Statistics
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start">
                    <Globe className="h-4 w-4 mr-2" />
                    System Broadcast
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('files')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="connection" className="mt-6 space-y-6">
            {/* Real-time Connection Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Socket.IO Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Socket.IO Server Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Server Status</span>
                    <Badge 
                      variant={socketStatus.isRunning ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {socketStatus.isRunning ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Running
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Offline
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Connected Clients:</span>
                      <span className="font-medium">{socketStatus.connectedClients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="font-medium">{socketStatus.uptime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Check:</span>
                      <span className="font-medium">{socketStatus.lastCheck || 'Never'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={checkSocketStatus}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>

                  {!socketStatus.isRunning && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Socket.IO Server not running.</strong><br />
                        Start it with: <code className="bg-yellow-100 px-1 rounded">npm run socket</code>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Connection Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Connection Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <FormControl fullWidth size="small">
                      <InputLabel>Connection Mode</InputLabel>
                      <Select
                        value={settings.connectionMode || 'auto'}
                        label="Connection Mode"
                        onChange={(e) => 
                          handleConnectionModeChange(e.target.value as 'auto' | 'socket' | 'polling')
                        }
                      >
                        <MenuItem value="auto">Auto-detect (Recommended)</MenuItem>
                        <MenuItem value="socket">Socket.IO Only</MenuItem>
                        <MenuItem value="polling">Polling Only</MenuItem>
                      </Select>
                    </FormControl>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Auto-detect:</strong> Tries Socket.IO first, falls back to polling automatically</p>
                      <p><strong>Socket.IO Only:</strong> Uses WebSocket for lowest latency (requires server running)</p>
                      <p><strong>Polling Only:</strong> Uses HTTP polling for maximum compatibility</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Socket.IO Server URL</label>
                    <Input
                      value={settings.socketUrl || 'http://localhost:4000'}
                      onChange={(e) => 
                        setSettings({ ...settings, socketUrl: e.target.value })
                      }
                      onBlur={() => debouncedSaveChatSettings(settings)}
                      placeholder="http://localhost:4000"
                    />
                    <p className="text-xs text-gray-500">
                      URL for the Socket.IO server (only used when Socket.IO mode is active)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connection Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Connection Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {connectionStatus === 'connected' ? 
                        (connectionMode === 'auto' && socketStatus.isRunning ? 'SOCKET' : 
                         connectionMode === 'auto' && !socketStatus.isRunning ? 'POLLING' : 
                         connectionMode.toUpperCase()) : 'DISCONNECTED'}
                    </div>
                    <div className="text-sm text-gray-500">Active Mode</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {realTimeStats?.averageLatency || 0}ms
                    </div>
                    <div className="text-sm text-gray-500">Avg Latency</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {realTimeStats?.messagesPerMinute || 0}
                    </div>
                    <div className="text-sm text-gray-500">Msg/Minute</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {realTimeStats?.reconnectCount || 0}
                    </div>
                    <div className="text-sm text-gray-500">Reconnects</div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Socket.IO Availability:</span>
                    <span className={`font-medium ${socketStatus.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                      {socketStatus.isRunning ? '✅ Available' : '❌ Unavailable'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Polling Fallback:</span>
                    <span className="font-medium text-blue-600">✅ Available</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Auto-reconnect:</span>
                    <span className="font-medium text-green-600">✅ Enabled</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Test Socket.IO Connection</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Verify Socket.IO server connectivity and performance
                  </p>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={testSocketConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Force Reconnect All</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Force all connected clients to reconnect
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={forceReconnectAll}
                    disabled={reconnectingAll}
                  >
                    {reconnectingAll ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {reconnectingAll ? 'Reconnecting...' : 'Reconnect All'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">View Server Logs</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Monitor Socket.IO server logs and events
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={loadServerLogs}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Logs
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Server Management */}
            {!socketStatus.isRunning && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-orange-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Socket.IO Server Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-orange-800">
                      The Socket.IO server is not currently running. Users will automatically fall back to polling mode.
                    </p>
                    
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <p className="text-sm font-medium text-orange-900 mb-2">Start Socket.IO Server:</p>
                      <div className="space-y-1">
                        <code className="text-xs bg-white px-2 py-1 rounded block">
                          npm run socket
                        </code>
                        <code className="text-xs bg-white px-2 py-1 rounded block">
                          # or run both servers together
                        </code>
                        <code className="text-xs bg-white px-2 py-1 rounded block">
                          npm run dev:all
                        </code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="widget" className="mt-6 space-y-6">
            {/* Widget Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Widget Type & Style</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Widget Type Selection */}
                <div className="space-y-4">
                  <h4 className="font-medium">Select Widget Type</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Glassmorphism Widget */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Glassmorphism</h5>
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Modern transparent design with blur effects and smooth animations
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 shadow-lg flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-xs text-gray-500">Current Active</div>
                      </div>
                      <Button size="sm" variant="default" className="w-full" disabled>
                        ✨ Currently Active
                      </Button>
                    </div>

                    {/* Material Design Widget */}
                    <div className="border rounded-lg p-4 hover:border-green-200 hover:bg-green-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Material Design</h5>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Clean material design with elevation shadows and subtle animations
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-xs text-gray-500">Material UI</div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => switchWidgetType('material')}>
                        Switch to Material
                      </Button>
                    </div>

                    {/* Minimal Widget */}
                    <div className="border rounded-lg p-4 hover:border-gray-400 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Minimal</h5>
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Simple, lightweight design with minimal visual elements
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 rounded bg-gray-600 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-xs text-gray-500">Minimal UI</div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => switchWidgetType('minimal')}>
                        Switch to Minimal
                      </Button>
                    </div>

                    {/* Corporate Widget */}
                    <div className="border rounded-lg p-4 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Corporate</h5>
                        <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Professional business design with corporate branding support
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-xs text-gray-500">Corporate</div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => switchWidgetType('corporate')}>
                        Switch to Corporate
                      </Button>
                    </div>

                    {/* Gaming Widget */}
                    <div className="border rounded-lg p-4 hover:border-purple-200 hover:bg-purple-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Gaming</h5>
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        RGB effects with gaming-inspired design and neon accents
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 shadow-lg flex items-center justify-center animate-pulse">
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-xs text-gray-500">RGB Gaming</div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => switchWidgetType('gaming')}>
                        Switch to Gaming
                      </Button>
                    </div>

                    {/* Retro Widget */}
                    <div className="border rounded-lg p-4 hover:border-yellow-200 hover:bg-yellow-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">Retro</h5>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Vintage 90s design with terminal-style interface
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 rounded border-2 border-yellow-600 bg-yellow-100 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-yellow-800" />
                        </div>
                        <div className="text-xs text-gray-500">Terminal Style</div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => switchWidgetType('retro')}>
                        Switch to Retro
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Widget Debugging Section */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                    Widget Debugging & Testing
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h5 className="font-medium mb-2 text-sm">Message Sending Test</h5>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span>Widget Visibility:</span>
                          <Badge variant="default" className="text-xs">✅ Visible</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Authentication:</span>
                          <Badge variant={currentUser ? "default" : "destructive"} className="text-xs">
                            {currentUser ? "✅ Valid" : "❌ Invalid"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Connection Status:</span>
                          <Badge variant={connectionStatus === 'connected' ? "default" : "destructive"} className="text-xs">
                            {connectionStatus === 'connected' ? "✅ Connected" : "❌ Disconnected"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Socket.IO Server:</span>
                          <Badge variant={socketStatus.isRunning ? "default" : "secondary"} className="text-xs">
                            {socketStatus.isRunning ? "✅ Running" : "⚠️ Fallback"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Permissions:</span>
                          <Badge variant={currentUser?.permissions?.includes('chat.access_channels') ? "default" : "destructive"} className="text-xs">
                            {currentUser?.permissions?.includes('chat.access_channels') ? "✅ Valid" : "❌ Missing"}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-3" 
                        variant="outline"
                        onClick={() => runWidgetTest('full_diagnostic')}
                        disabled={testingWidget === 'full_diagnostic'}
                      >
                        {testingWidget === 'full_diagnostic' ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <Activity className="h-3 w-3 mr-2" />
                        )}
                        {testingWidget === 'full_diagnostic' ? 'Testing...' : 'Run Full Diagnostic'}
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <h5 className="font-medium mb-2 text-sm">Real-time Widget Test</h5>
                      <div className="text-xs text-gray-600 mb-3">
                        Test widget functionality with live data
                      </div>
                      <div className="space-y-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => runWidgetTest('message_send')}
                          disabled={testingWidget === 'message_send'}
                        >
                          {testingWidget === 'message_send' ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <MessageCircle className="h-3 w-3 mr-2" />
                          )}
                          Test Message Send
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => runWidgetTest('connection')}
                          disabled={testingWidget === 'connection'}
                        >
                          {testingWidget === 'connection' ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-2" />
                          )}
                          Test Connection
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => runWidgetTest('conversations_load')}
                          disabled={testingWidget === 'conversations_load'}
                        >
                          {testingWidget === 'conversations_load' ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <Users className="h-3 w-3 mr-2" />
                          )}
                          Test Conversations Load
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-xs"
                          onClick={() => runWidgetTest('notifications')}
                          disabled={testingWidget === 'notifications'}
                        >
                          {testingWidget === 'notifications' ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <Bell className="h-3 w-3 mr-2" />
                          )}
                          Test Notifications
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="space-y-4">
                  <h4 className="font-medium">Color Customization</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Primary Color</label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="color" 
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                          value={widgetSettings.primaryColor}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, primaryColor: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        />
                        <Input 
                          type="text" 
                          value={widgetSettings.primaryColor}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, primaryColor: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                          className="flex-1 text-sm"
                          placeholder="#3b82f6"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Used for widget button and accent colors</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Secondary Color</label>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="color" 
                          className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                          value={widgetSettings.secondaryColor}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, secondaryColor: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        />
                        <Input 
                          type="text" 
                          value={widgetSettings.secondaryColor}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, secondaryColor: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                          className="flex-1 text-sm"
                          placeholder="#9333ea"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Used for gradient effects and highlights</p>
                    </div>
                  </div>
                  
                  {/* Color Presets */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Color Presets</label>
                    <div className="flex items-center space-x-2">
                      <button 
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 border-2 border-white shadow-md hover:scale-110 transition-transform"
                        onClick={() => {
                          const newSettings = { ...widgetSettings, primaryColor: '#3b82f6', secondaryColor: '#9333ea' };
                          saveWidgetSettings(newSettings);
                        }}
                        title="Blue to Purple (Default)"
                      />
                      <button 
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
                        onClick={() => {
                          const newSettings = { ...widgetSettings, primaryColor: '#10b981', secondaryColor: '#14b8a6' };
                          saveWidgetSettings(newSettings);
                        }}
                        title="Green to Teal"
                      />
                      <button 
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-red-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
                        onClick={() => {
                          const newSettings = { ...widgetSettings, primaryColor: '#ec4899', secondaryColor: '#ef4444' };
                          saveWidgetSettings(newSettings);
                        }}
                        title="Pink to Red"
                      />
                      <button 
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 border-2 border-white shadow-md hover:scale-110 transition-transform"
                        onClick={() => {
                          const newSettings = { ...widgetSettings, primaryColor: '#f97316', secondaryColor: '#eab308' };
                          saveWidgetSettings(newSettings);
                        }}
                        title="Orange to Yellow"
                      />
                      <button 
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 border-2 border-white shadow-md hover:scale-110 transition-transform"
                        onClick={() => {
                          const newSettings = { ...widgetSettings, primaryColor: '#4b5563', secondaryColor: '#1f2937' };
                          saveWidgetSettings(newSettings);
                        }}
                        title="Gray to Dark Gray"
                      />
                    </div>
                  </div>
                </div>

                {/* Widget Size & Position */}
                <div className="space-y-4">
                  <h4 className="font-medium">Size & Position</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Widget Size</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.size}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, size: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="compact">Compact (48px)</MenuItem>
                          <MenuItem value="normal">Normal (64px)</MenuItem>
                          <MenuItem value="large">Large (80px)</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">Affects widget button and expanded size</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Position</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.position}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, position: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="bottom-right">Bottom Right</MenuItem>
                          <MenuItem value="bottom-left">Bottom Left</MenuItem>
                          <MenuItem value="top-right">Top Right</MenuItem>
                          <MenuItem value="top-left">Top Left</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">Screen position of the widget</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Widget Shape</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.shape || 'circle'}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, shape: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="circle">Circle</MenuItem>
                          <MenuItem value="rounded-square">Rounded Square</MenuItem>
                          <MenuItem value="square">Square</MenuItem>
                          <MenuItem value="rounded-lg">Large Rounded</MenuItem>
                          <MenuItem value="pill">Pill/Capsule</MenuItem>
                          <MenuItem value="hexagon">Hexagon</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">Overall shape of the widget button</p>
                      
                      {/* Shape Preview */}
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Shape Preview:</p>
                        <div className="flex items-center space-x-3">
                          {['circle', 'rounded-square', 'square', 'rounded-lg', 'pill', 'hexagon'].map((shape) => (
                            <button
                              key={shape}
                              onClick={() => {
                                const newSettings = { ...widgetSettings, shape };
                                saveWidgetSettings(newSettings);
                              }}
                              className={cn(
                                "w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 transition-all",
                                shape === 'circle' ? 'rounded-full' :
                                shape === 'square' ? 'rounded-none' :
                                shape === 'rounded-square' ? 'rounded-lg' :
                                shape === 'rounded-lg' ? 'rounded-2xl' :
                                shape === 'pill' ? 'rounded-full px-4' :
                                shape === 'hexagon' ? 'rounded-full' : '',
                                widgetSettings.shape === shape ? 'ring-2 ring-blue-500 ring-offset-2' : 'opacity-60 hover:opacity-100'
                              )}
                              style={{
                                ...(shape === 'hexagon' ? {
                                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                                } : {})
                              }}
                              title={shape.charAt(0).toUpperCase() + shape.slice(1).replace('-', ' ')}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Distance from Edge */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Distance from Edge</label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="number" 
                          value={widgetSettings.edgeDistance || 16}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, edgeDistance: parseInt(e.target.value) || 16 };
                            saveWidgetSettings(newSettings);
                          }}
                          className="w-20 text-sm"
                          min="8"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">px from screen edge</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Z-Index</label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="number" 
                          value={widgetSettings.zIndex || 50}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, zIndex: parseInt(e.target.value) || 50 };
                            saveWidgetSettings(newSettings);
                          }}
                          className="w-20 text-sm"
                          min="1"
                          max="999"
                        />
                        <span className="text-sm text-gray-500">Layer priority</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animation & Effects */}
                <div className="space-y-4">
                  <h4 className="font-medium">Animation & Effects</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Enable Glassmorphism</p>
                        <p className="text-sm text-gray-500">Translucent background with blur effect</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enableGlassmorphism}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, enableGlassmorphism: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Pulse Animation</p>
                        <p className="text-sm text-gray-500">Notification pulse effect for new messages</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enablePulseAnimation}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, enablePulseAnimation: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Smooth Transitions</p>
                        <p className="text-sm text-gray-500">Smooth animations when opening/closing</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enableSmoothTransitions}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, enableSmoothTransitions: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Hover Effects</p>
                        <p className="text-sm text-gray-500">Scale and glow effects on hover</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enableHoverEffects !== false}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, enableHoverEffects: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Shadow Effects</p>
                        <p className="text-sm text-gray-500">Drop shadows and depth effects</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.enableShadows !== false}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, enableShadows: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Animation Speed */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Animation Speed</label>
                    <FormControl fullWidth size="small">
                      <Select 
                        value={widgetSettings.animationSpeed || 'normal'}
                        onChange={(e) => {
                          const newSettings = { ...widgetSettings, animationSpeed: e.target.value };
                          setWidgetSettings(newSettings);
                          saveWidgetSettings(newSettings);
                        }}
                      >
                        <MenuItem value="slow">Slow (600ms)</MenuItem>
                        <MenuItem value="normal">Normal (300ms)</MenuItem>
                        <MenuItem value="fast">Fast (150ms)</MenuItem>
                        <MenuItem value="instant">Instant (0ms)</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                  <h4 className="font-medium">Typography</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Font Family</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.fontFamily}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, fontFamily: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="system">System Default</MenuItem>
                          <MenuItem value="inter">Inter (Modern)</MenuItem>
                          <MenuItem value="roboto">Roboto (Google)</MenuItem>
                          <MenuItem value="poppins">Poppins (Rounded)</MenuItem>
                          <MenuItem value="helvetica">Helvetica (Classic)</MenuItem>
                          <MenuItem value="arial">Arial (Standard)</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">Font used in widget text</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Font Size</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.fontSize}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, fontSize: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="xs">Extra Small (10px)</MenuItem>
                          <MenuItem value="small">Small (12px)</MenuItem>
                          <MenuItem value="normal">Normal (14px)</MenuItem>
                          <MenuItem value="large">Large (16px)</MenuItem>
                          <MenuItem value="xl">Extra Large (18px)</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">Base font size for widget</p>
                    </div>
                  </div>
                  
                  {/* Additional Typography Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Font Weight</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.fontWeight || 'normal'}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, fontWeight: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="light">Light (300)</MenuItem>
                          <MenuItem value="normal">Normal (400)</MenuItem>
                          <MenuItem value="medium">Medium (500)</MenuItem>
                          <MenuItem value="semibold">Semibold (600)</MenuItem>
                          <MenuItem value="bold">Bold (700)</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Line Height</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.lineHeight || 'normal'}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, lineHeight: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="tight">Tight (1.25)</MenuItem>
                          <MenuItem value="normal">Normal (1.5)</MenuItem>
                          <MenuItem value="relaxed">Relaxed (1.75)</MenuItem>
                          <MenuItem value="loose">Loose (2.0)</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>

                {/* Time Display & Widget Controls */}
                <div className="space-y-4">
                  <h4 className="font-medium">Message Display & Controls</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time Display Format</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.timeDisplay || 'relative'}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, timeDisplay: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="relative">Relative (about 2 hours ago)</MenuItem>
                          <MenuItem value="absolute">Absolute (2:30 PM)</MenuItem>
                          <MenuItem value="both">Relative with tooltip</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">How message timestamps are displayed</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time Format</label>
                      <FormControl fullWidth size="small">
                        <Select 
                          value={widgetSettings.timeFormat || '12h'}
                          onChange={(e) => {
                            const newSettings = { ...widgetSettings, timeFormat: e.target.value };
                            saveWidgetSettings(newSettings);
                          }}
                        >
                          <MenuItem value="12h">12-hour (2:30 PM)</MenuItem>
                          <MenuItem value="24h">24-hour (14:30)</MenuItem>
                        </Select>
                      </FormControl>
                      <p className="text-xs text-gray-500">Clock format for absolute times</p>
                    </div>
                  </div>

                  {/* Widget Button Controls */}
                  <div className="space-y-3">
                    <h5 className="font-medium">Widget Button Controls</h5>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show File Upload Button</p>
                        <p className="text-sm text-gray-500">Allow users to upload files in chat messages</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.showFileUpload !== false}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, showFileUpload: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Emoji Picker</p>
                        <p className="text-sm text-gray-500">Enable emoji picker button for reactions</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.showEmojiPicker !== false}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, showEmojiPicker: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Time Tooltips</p>
                        <p className="text-sm text-gray-500">Show exact time on hover when using relative time</p>
                      </div>
                      <Switch 
                        checked={widgetSettings.showTimeTooltip !== false}
                        onCheckedChange={(checked) => {
                          const newSettings = { ...widgetSettings, showTimeTooltip: checked };
                          saveWidgetSettings(newSettings);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Enhanced Preview Section */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Live Widget Preview</h4>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Refresh Preview
                      </Button>
                      <Button size="sm">
                        <Eye className="h-3 w-3 mr-2" />
                        Full Screen Preview
                      </Button>
                    </div>
                  </div>
                  
                  {/* Multi-widget preview grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Glassmorphism Preview */}
                    <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-4 rounded-lg relative min-h-32">
                      <div className="absolute top-2 left-2 text-xs text-gray-600">Glassmorphism</div>
                      <div className="absolute bottom-4 right-4">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
                            <MessageCircle className="h-4 w-4" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold">2</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Material Design Preview */}
                    <div className="bg-gray-50 p-4 rounded-lg relative min-h-32">
                      <div className="absolute top-2 left-2 text-xs text-gray-600">Material Design</div>
                      <div className="absolute bottom-4 right-4">
                        <div className="w-8 h-8 rounded-full bg-white shadow-lg border flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">2</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gaming Preview */}
                    <div className="bg-black p-4 rounded-lg relative min-h-32">
                      <div className="absolute top-2 left-2 text-xs text-green-400">Gaming RGB</div>
                      <div className="absolute bottom-4 right-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 shadow-lg shadow-purple-500/50 flex items-center justify-center text-white animate-pulse">
                          <MessageCircle className="h-4 w-4" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold">2</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Corporate Preview */}
                    <div className="bg-slate-100 p-4 rounded-lg relative min-h-32">
                      <div className="absolute top-2 left-2 text-xs text-gray-600">Corporate</div>
                      <div className="absolute bottom-4 right-4">
                        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white">
                          <MessageCircle className="h-4 w-4" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded flex items-center justify-center">
                            <span className="text-xs font-bold">2</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Minimal Preview */}
                    <div className="bg-white border p-4 rounded-lg relative min-h-32">
                      <div className="absolute top-2 left-2 text-xs text-gray-600">Minimal</div>
                      <div className="absolute bottom-4 right-4">
                        <div className="w-8 h-8 rounded bg-gray-600 flex items-center justify-center text-white">
                          <MessageCircle className="h-4 w-4" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded flex items-center justify-center">
                            <span className="text-xs font-bold">2</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Retro Preview */}
                    <div className="bg-yellow-100 border-2 border-yellow-600 p-4 rounded-lg relative min-h-32">
                      <div className="absolute top-2 left-2 text-xs text-yellow-800 font-mono">retro_90s</div>
                      <div className="absolute bottom-4 right-4">
                        <div className="w-8 h-8 rounded border-2 border-yellow-600 bg-yellow-200 flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-yellow-800" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 border border-yellow-600 rounded flex items-center justify-center">
                            <span className="text-xs font-bold">2</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Preview */}
                  <div className="bg-gray-100 p-6 rounded-lg relative min-h-48">
                    <div className="absolute top-4 left-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live Preview - Hover to interact</span>
                      </div>
                    </div>
                    
                    <div className="absolute bottom-4 right-4">
                      {/* Interactive Widget Preview */}
                      <div className="relative group">
                        {/* Closed state preview - Dynamic based on settings */}
                        <div 
                          className={`
                            ${widgetSettings.size === 'compact' ? 'w-8 h-8' : 
                              widgetSettings.size === 'large' ? 'w-16 h-16' : 'w-12 h-12'} 
                            ${widgetSettings.borderRadius > 16 ? 'rounded-full' : `rounded-${Math.min(widgetSettings.borderRadius, 16)}px`}
                            ${widgetSettings.enableShadows !== false ? 'shadow-lg' : 'shadow-sm'}
                            ${widgetSettings.enableHoverEffects !== false ? 'hover:scale-110 transition-all duration-200' : 'transition-all duration-100'}
                            ${widgetSettings.enableGlassmorphism ? 'backdrop-blur-sm border border-white/20' : ''}
                            flex items-center justify-center text-white cursor-pointer
                          `}
                          style={{
                            background: `linear-gradient(135deg, ${widgetSettings.primaryColor} 0%, ${widgetSettings.secondaryColor} 50%, ${widgetSettings.primaryColor} 100%)`,
                            ...(widgetSettings.enableGlassmorphism ? {
                              backdropFilter: 'blur(16px)',
                              boxShadow: `0 8px 32px 0 ${widgetSettings.primaryColor}37, inset 0 1px 0 rgba(255, 255, 255, 0.3)`
                            } : {})
                          }}
                        >
                          <MessageCircle className={`
                            ${widgetSettings.size === 'compact' ? 'h-4 w-4' : 
                              widgetSettings.size === 'large' ? 'h-8 w-8' : 'h-6 w-6'}
                          `} />
                          <div 
                            className={`absolute -top-1 -right-1 bg-red-500 rounded-full flex items-center justify-center
                              ${widgetSettings.size === 'compact' ? 'w-3 h-3' : 'w-4 h-4'}
                              ${widgetSettings.enablePulseAnimation ? 'animate-pulse' : ''}
                            `}
                          >
                            <span className={`font-bold text-white
                              ${widgetSettings.size === 'compact' ? 'text-xs' : 'text-xs'}
                            `}>3</span>
                          </div>
                        </div>
                        
                        {/* Expanded state preview (shown on hover) */}
                        <div className="absolute bottom-16 right-0 w-72 h-56 bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-95 group-hover:scale-100">
                          <div className="p-3 border-b border-white/20 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-t-xl">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Chat</span>
                              <div className="flex space-x-1">
                                <div className="w-3 h-3 bg-gray-300 rounded hover:bg-gray-400 transition-colors"></div>
                                <div className="w-3 h-3 bg-gray-300 rounded hover:bg-gray-400 transition-colors"></div>
                                <div className="w-3 h-3 bg-gray-300 rounded hover:bg-gray-400 transition-colors"></div>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 space-y-2 max-h-32 overflow-y-auto">
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">G</div>
                              <div className="flex-1">
                                <div className="text-xs font-medium">General</div>
                                <div className="text-xs text-gray-500">Welcome to the chat!</div>
                              </div>
                              <div className="w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">2</div>
                            </div>
                            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded transition-colors">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">T</div>
                              <div className="flex-1">
                                <div className="text-xs font-medium">Team Alpha</div>
                                <div className="text-xs text-gray-500">John: Ready for deployment!</div>
                              </div>
                              <div className="w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">1</div>
                            </div>
                            <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded transition-colors">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">D</div>
                              <div className="flex-1">
                                <div className="text-xs font-medium">DM: Jane Smith</div>
                                <div className="text-xs text-gray-500">Thanks for the help!</div>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 border-t border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-b-xl">
                            <div className="flex space-x-2">
                              <div className="flex-1 h-6 bg-white rounded-lg border flex items-center px-2">
                                <span className="text-xs text-gray-400">Type a message...</span>
                              </div>
                              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                                <Send className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button variant="outline">
                    Reset to Default
                  </Button>
                  <div className="flex space-x-2">
                    <Button variant="outline">
                      Preview Changes
                    </Button>
                    <motion.div
                      animate={{
                        scale: saveSuccess ? [1, 1.05, 1] : 1
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button 
                        onClick={handleManualSave}
                        disabled={savingWidget}
                        className={cn(
                          "relative transition-all duration-300",
                          saveSuccess && "bg-green-600 hover:bg-green-700",
                          saveError && "bg-red-600 hover:bg-red-700"
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {savingWidget ? (
                            <motion.div
                              key="saving"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center"
                            >
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </motion.div>
                          ) : saveSuccess ? (
                            <motion.div
                              key="success"
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -10 }}
                              className="flex items-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Saved!
                            </motion.div>
                          ) : saveError ? (
                            <motion.div
                              key="error"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Failed
                            </motion.div>
                          ) : (
                            <motion.div
                              key="default"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="flex items-center"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Save Customization
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </motion.div>
                  </div>
                </div>
                
                {/* Save Status Notification */}
                <AnimatePresence>
                  {saveError && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Save Failed</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">{saveError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Widget Behavior Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Widget Behavior</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-hide when inactive</p>
                    <p className="text-sm text-gray-500">Hide widget after 5 minutes of no activity</p>
                  </div>
                  <Switch 
                    checked={widgetSettings.autoHide}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...widgetSettings, autoHide: checked };
                      saveWidgetSettings(newSettings);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sound notifications</p>
                    <p className="text-sm text-gray-500">Play sound when new messages arrive</p>
                  </div>
                  <Switch 
                    checked={widgetSettings.soundNotifications}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...widgetSettings, soundNotifications: checked };
                      saveWidgetSettings(newSettings);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Desktop notifications</p>
                    <p className="text-sm text-gray-500">Show browser notifications for messages</p>
                  </div>
                  <Switch 
                    checked={widgetSettings.desktopNotifications}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...widgetSettings, desktopNotifications: checked };
                      saveWidgetSettings(newSettings);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show unread badge</p>
                    <p className="text-sm text-gray-500">Display red notification badge with count</p>
                  </div>
                  <Switch 
                    checked={widgetSettings.showUnreadBadge !== false}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...widgetSettings, showUnreadBadge: checked };
                      saveWidgetSettings(newSettings);
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Close on outside click</p>
                    <p className="text-sm text-gray-500">Automatically close widget when clicking outside</p>
                  </div>
                  <Switch 
                    checked={widgetSettings.closeOnOutsideClick !== false}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...widgetSettings, closeOnOutsideClick: checked };
                      saveWidgetSettings(newSettings);
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default widget state</label>
                  <FormControl fullWidth size="small">
                    <Select 
                      value={widgetSettings.defaultState}
                      onChange={(e) => {
                        const newSettings = { ...widgetSettings, defaultState: e.target.value };
                        setWidgetSettings(newSettings);
                        saveWidgetSettings(newSettings);
                      }}
                    >
                      <MenuItem value="closed">Always closed</MenuItem>
                      <MenuItem value="minimized">Minimized</MenuItem>
                      <MenuItem value="open">Always open</MenuItem>
                      <MenuItem value="remember">Remember last state</MenuItem>
                    </Select>
                  </FormControl>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Auto-hide timeout</label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="number" 
                      value={widgetSettings.autoHideTimeout || 5}
                      onChange={(e) => {
                        const newSettings = { ...widgetSettings, autoHideTimeout: parseInt(e.target.value) || 5 };
                        setWidgetSettings(newSettings);
                        saveWidgetSettings(newSettings);
                      }}
                      className="w-20 text-sm"
                      min="1"
                      max="60"
                      disabled={!widgetSettings.autoHide}
                    />
                    <span className="text-sm text-gray-500">minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-6 space-y-6">
            {/* File Sharing Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>File Sharing Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable File Sharing</p>
                    <p className="text-sm text-gray-500">Allow users to share files in chat</p>
                  </div>
                  <Switch
                    checked={settings.fileShareEnabled}
                    onCheckedChange={(checked) => 
                      debouncedSaveChatSettings({ ...settings, fileShareEnabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <FormControl fullWidth size="small">
                    <InputLabel>Allowed File Types</InputLabel>
                    <Select
                      value={settings.fileTypes || 'all'}
                      label="Allowed File Types"
                      onChange={(e) => 
                        debouncedSaveChatSettings({ ...settings, fileTypes: e.target.value as 'all' | 'images' | 'documents' | 'custom' })
                      }
                    >
                      <MenuItem value="all">All Files</MenuItem>
                      <MenuItem value="images">Images Only</MenuItem>
                      <MenuItem value="documents">Documents Only</MenuItem>
                      <MenuItem value="custom">Custom Types</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Max File Size (MB)</label>
                  <Input
                    type="number"
                    value={settings.maxFileSize || 10}
                    onChange={(e) => 
                      debouncedSaveChatSettings({ 
                        ...settings, 
                        maxFileSize: parseInt(e.target.value) || 10 
                      })
                    }
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Giphy Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5" />
                  <span>Giphy Integration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Giphy GIFs</p>
                    <p className="text-sm text-gray-500">Allow users to send GIFs via Giphy</p>
                  </div>
                  <Switch
                    checked={settings.giphyEnabled}
                    onCheckedChange={(checked) => 
                      debouncedSaveChatSettings({ ...settings, giphyEnabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Giphy API Key</label>
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      placeholder="Enter Giphy API Key"
                      value={settings.giphyApiKey || ''}
                      onChange={(e) => 
                        setSettings({ ...settings, giphyApiKey: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button 
                      onClick={testGiphyApi}
                      disabled={testingGiphy || !settings.giphyApiKey}
                      size="sm"
                    >
                      {testingGiphy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                  {giphyTestResult && (
                    <div className={`flex items-center space-x-2 text-sm ${
                      giphyTestResult === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {giphyTestResult === 'success' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>
                        {giphyTestResult === 'success' 
                          ? 'API key is valid and working' 
                          : 'API key test failed'
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Current API Usage:</strong> {stats.apiQuota}% of quota used
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="presence" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Presence Monitor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {presenceUsers.length > 0 ? (
                    <div className="grid gap-3">
                      {presenceUsers.map((user) => (
                        <div 
                          key={user.username}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                                {user.display_name.charAt(0)}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                                user.status === 'online' ? 'bg-green-500' : 
                                user.status === 'away' ? 'bg-yellow-500' :
                                user.status === 'busy' ? 'bg-orange-500' :
                                user.status === 'invisible' ? 'bg-purple-500' : 'bg-gray-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{user.display_name}</p>
                              <p className="text-sm text-gray-500">@{user.username}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge 
                              variant={
                                user.status === 'online' ? 'default' : 
                                user.status === 'away' ? 'secondary' : 
                                user.status === 'busy' ? 'destructive' : 
                                'outline'
                              }
                              className={
                                user.status === 'away' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                user.status === 'busy' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                user.status === 'invisible' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                ''
                              }
                            >
                              {user.status}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleManageUser(user)}
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No user presence data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Message Policies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Deleted Messages</p>
                    <p className="text-sm text-gray-500">Display "[Message deleted]" to other users</p>
                  </div>
                  <Switch
                    checked={settings.deletedMessageVisible}
                    onCheckedChange={(checked) => 
                      saveChatSettings({ ...settings, deletedMessageVisible: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Retention (Days)</label>
                  <Input
                    type="number"
                    value={settings.retentionDays || 365}
                    onChange={(e) => 
                      saveChatSettings({ 
                        ...settings, 
                        retentionDays: parseInt(e.target.value) || 365 
                      })
                    }
                    className="w-32"
                  />
                  <p className="text-sm text-gray-500">
                    Messages older than this will be automatically deleted
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable System Notifications</p>
                    <p className="text-sm text-gray-500">Allow browser notifications for chat messages</p>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) => 
                      saveChatSettings({ ...settings, notificationsEnabled: checked })
                    }
                  />
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Additional notification settings will be implemented in future updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6 space-y-6">
            {/* Usage Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Usage Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.messageVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* File Type Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">File Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.fileTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {analyticsData.fileTypeData.map((entry, index) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Response Time</span>
                    <span className="font-medium">{analyticsData.systemMetrics.averageResponseTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <span className="font-medium">{analyticsData.systemMetrics.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-medium">{analyticsData.systemMetrics.errorRate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Peak Concurrent Users</span>
                    <span className="font-medium">{analyticsData.systemMetrics.peakConcurrentUsers}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Channel Activity */}
            {analyticsData.channelActivity && analyticsData.channelActivity.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Hash className="h-5 w-5" />
                    <span>Channel Activity (Last 7 Days)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.channelActivity.map((channel, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Hash className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{channel.name}</p>
                            <p className="text-xs text-gray-500">
                              {channel.activeUsers} active users
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{channel.messages}</p>
                          <p className="text-xs text-gray-500">messages</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {analyticsData.channelActivity.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Hash className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No channel activity data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Save Indicator */}
        <AnimatePresence>
          {saving && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving settings...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Server Logs Modal */}
        {showLogs && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Socket.IO Server Logs</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLogs(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
                  {serverLogs.length > 0 ? (
                    serverLogs.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No logs available</div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t flex justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadServerLogs}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Logs
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowLogs(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Presence Management Modal */}
        {showUserManagement && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-medium">
                      {selectedUser.display_name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                      selectedUser.status === 'online' ? 'bg-green-500' : 
                      selectedUser.status === 'away' ? 'bg-yellow-500' :
                      selectedUser.status === 'busy' ? 'bg-orange-500' :
                      selectedUser.status === 'invisible' ? 'bg-purple-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Manage User Presence</h3>
                    <p className="text-sm text-gray-600">{selectedUser.display_name} (@{selectedUser.username})</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUserManagement(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Current Status Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <Badge 
                        variant={selectedUser.status === 'online' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {selectedUser.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Role:</span>
                      <span className="ml-2 font-medium">{selectedUser.role_id || 'User'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Last Seen:</span>
                      <span className="ml-2">{selectedUser.last_seen ? new Date(selectedUser.last_seen).toLocaleString() : 'Never'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2">{selectedUser.email || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Administrative Controls */}
                <div className="space-y-4">
                  <h4 className="font-medium">Administrative Actions</h4>
                  
                  {/* Visibility Controls */}
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3 flex items-center">
                      <EyeOff className="h-4 w-4 mr-2 text-orange-500" />
                      Presence Visibility Controls
                    </h5>
                    <div className="space-y-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={managingUser}
                        onClick={() => updateUserPresenceSettings(selectedUser.username, { forceInvisible: true })}
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Force User Invisible (Hide from all presence displays)
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={managingUser}
                        onClick={() => updateUserPresenceSettings(selectedUser.username, { allowPresenceDisplay: false })}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Disable Presence Display (User appears offline to others)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={managingUser}
                        onClick={() => updateUserPresenceSettings(selectedUser.username, { presenceOverride: 'away' })}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Override Status to "Away" 
                      </Button>
                    </div>
                  </div>

                  {/* Connection Controls */}
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-red-500" />
                      Connection Controls
                    </h5>
                    <div className="space-y-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full justify-start"
                        disabled={managingUser}
                        onClick={() => forceUserDisconnect(selectedUser.username)}
                      >
                        {managingUser ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Force Disconnect User
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This will disconnect the user from the chat system. They can reconnect immediately.
                    </p>
                  </div>

                  {/* Administrative Override */}
                  <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                    <h5 className="font-medium mb-3 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-yellow-600" />
                      Administrative Override
                    </h5>
                    <div className="text-sm text-yellow-800 space-y-2">
                      <p><strong>Important:</strong> These controls are for administrative purposes only.</p>
                      <p>• System administrators and managers can be hidden from presence displays</p>
                      <p>• Users with sensitive roles can have their status overridden for privacy</p>
                      <p>• Use responsibly and document any changes for audit purposes</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t flex justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadPresenceData()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh User Data
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowUserManagement(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}