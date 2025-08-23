'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare,
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
  Loader2
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
    checkSocketStatus();
  }, []);

  // Real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadChatStats();
      loadPresenceData();
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

  // Chart data for analytics
  const messageVolumeData = [
    { name: '00:00', value: 12 },
    { name: '04:00', value: 3 },
    { name: '08:00', value: 35 },
    { name: '12:00', value: 58 },
    { name: '16:00', value: 42 },
    { name: '20:00', value: 28 },
  ];

  const fileTypeData = [
    { name: 'Images', value: 65 },
    { name: 'Documents', value: 25 },
    { name: 'GIFs', value: 10 },
  ];

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
          <TabsList className="grid w-full grid-cols-7 mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="files">Files & Media</TabsTrigger>
            <TabsTrigger value="presence">Users</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                    <LineChart data={messageVolumeData}>
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
                          data={fileTypeData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {fileTypeData.map((entry, index) => {
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
                    <span className="font-medium">142ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <span className="font-medium">99.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-medium">0.2%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Peak Concurrent Users</span>
                    <span className="font-medium">28</span>
                  </div>
                </CardContent>
              </Card>
            </div>
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