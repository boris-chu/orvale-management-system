'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionMode = 'socket' | 'polling' | 'auto';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Define content types for different message types
export interface MessageContent {
  text?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
  edited?: boolean;
  editedAt?: string;
  replyTo?: string;
  mentions?: string[];
}

export interface SystemContent {
  event: string;
  data?: Record<string, unknown>;
  message?: string;
}

export type RealTimeMessageContent = MessageContent | SystemContent | Record<string, unknown>;

export interface RealTimeMessage {
  id: string;
  type: 'message' | 'presence' | 'system';
  channel?: string;
  from: string;
  content: RealTimeMessageContent;
  timestamp: string;
}

export interface PresenceUpdate {
  username: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActive: string;
}

export interface RealTimeContextType {
  // Connection status
  connectionMode: ConnectionMode;
  connectionStatus: ConnectionStatus;
  connectedUsers: number;
  
  // Control methods
  setConnectionMode: (mode: ConnectionMode) => void;
  sendMessage: (message: Omit<RealTimeMessage, 'id' | 'timestamp'>) => Promise<boolean>;
  updatePresence: (status: PresenceUpdate['status']) => Promise<boolean>;
  
  // Event listeners
  onMessage: (callback: (message: RealTimeMessage) => void) => () => void;
  onPresenceUpdate: (callback: (update: PresenceUpdate) => void) => () => void;
  onUserCount: (callback: (count: number) => void) => () => void;
  
  // Statistics
  stats: {
    messagesPerMinute: number;
    averageLatency: number;
    reconnectCount: number;
    lastReconnect?: string;
  };
  
  // Socket instance for call functionality
  socket: Socket | null;
}

const RealTimeContext = createContext<RealTimeContextType | null>(null);

interface RealTimeProviderProps {
  children: ReactNode;
  defaultMode?: ConnectionMode;
  socketUrl?: string;
  pollingInterval?: number;
}

export function RealTimeProvider({ 
  children, 
  defaultMode = 'auto',
  socketUrl = 'http://localhost:4000',
  pollingInterval = 2000
}: RealTimeProviderProps) {
  // Core state
  const [connectionMode, setConnectionModeState] = useState<ConnectionMode>(defaultMode);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [stats, setStats] = useState({
    messagesPerMinute: 0,
    averageLatency: 0,
    reconnectCount: 0,
    lastReconnect: undefined as string | undefined
  });

  // References
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const messageCallbacksRef = useRef<Set<(message: RealTimeMessage) => void>>(new Set());
  const presenceCallbacksRef = useRef<Set<(update: PresenceUpdate) => void>>(new Set());
  const userCountCallbacksRef = useRef<Set<(count: number) => void>>(new Set());
  // const latencyTrackerRef = useRef<Map<string, number>>(new Map()); // Unused but may be needed for future features
  const messageCountRef = useRef({ count: 0, lastMinute: Date.now() });

  // Auto-detect best connection mode
  const detectBestMode = async (): Promise<'socket' | 'polling'> => {
    try {
      // Test Socket.IO connection
      const testSocket = io(socketUrl, { 
        timeout: 3000,
        autoConnect: false 
      });
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testSocket.disconnect();
          console.log('🔄 Socket.IO not available, falling back to polling');
          resolve('polling');
        }, 3000);

        testSocket.on('connect', () => {
          clearTimeout(timeout);
          testSocket.disconnect();
          console.log('⚡ Socket.IO available, using WebSocket connection');
          resolve('socket');
        });

        testSocket.on('connect_error', () => {
          clearTimeout(timeout);
          testSocket.disconnect();
          console.log('🔄 Socket.IO connection failed, falling back to polling');
          resolve('polling');
        });

        testSocket.connect();
      });
    } catch {
      console.log('🔄 Socket.IO detection failed, using polling');
      return 'polling';
    }
  };

  // Socket.IO connection management
  const connectSocket = async () => {
    try {
      setConnectionStatus('connecting');
      
      const socket = io(socketUrl, {
        auth: {
          token: localStorage.getItem('authToken')
        },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('⚡ RealTimeProvider: Socket.IO connected successfully!', socket.id);
        setConnectionStatus('connected');
        socketRef.current = socket;
        setConnectedUsers(prev => prev + 1); // Update user count
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ RealTimeProvider: Socket.IO disconnected:', reason);
        setConnectionStatus('disconnected');
        setConnectedUsers(prev => Math.max(0, prev - 1)); // Update user count
        
        // Auto-reconnect unless explicitly disconnected
        if (reason !== 'io client disconnect') {
          setStats(prev => ({ 
            ...prev, 
            reconnectCount: prev.reconnectCount + 1,
            lastReconnect: new Date().toISOString()
          }));
        }
      });

      socket.on('connect_error', (error: Error & { description?: string; context?: unknown; type?: string }) => {
        console.error('❌ RealTimeProvider: Socket.IO connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type
        });
        setConnectionStatus('error');
        
        // Fallback to polling after 3 failed attempts
        if (stats.reconnectCount >= 3) {
          console.log('🔄 Too many Socket.IO failures, switching to polling');
          setConnectionModeState('polling');
        }
      });

      socket.on('message', (data: RealTimeMessage) => {
        updateMessageStats();
        messageCallbacksRef.current.forEach(callback => callback(data));
      });

      socket.on('presence_update', (data: PresenceUpdate) => {
        presenceCallbacksRef.current.forEach(callback => callback(data));
      });

      socket.on('user_count', (count: number) => {
        setConnectedUsers(count);
        userCountCallbacksRef.current.forEach(callback => callback(count));
      });

      socket.on('pong', (latency: number) => {
        setStats(prev => ({ ...prev, averageLatency: latency }));
      });

    } catch (error) {
      console.error('❌ Socket.IO setup failed:', error);
      setConnectionStatus('error');
      setConnectionModeState('polling');
    }
  };

  // Polling connection management (simplified for RealTimeProvider)
  const connectPolling = async () => {
    try {
      setConnectionStatus('connecting');
      console.log('📡 Setting up polling mode (no global SSE stream available)');
      
      // For RealTimeProvider polling mode, we don't use SSE streams
      // Instead, we rely on individual components to handle their own SSE connections
      // This is just a heartbeat-based connection status
      
      const checkConnection = async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) {
            setConnectionStatus('disconnected');
            return;
          }

          // Simple heartbeat to verify we can reach the API
          const response = await fetch('/api/chat/channels', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            if (connectionStatus !== 'connected') {
              console.log('📡 Polling connection established (API heartbeat)');
              setConnectionStatus('connected');
            }
          } else {
            setConnectionStatus('error');
          }
        } catch (error) {
          console.error('❌ Polling heartbeat failed:', error);
          setConnectionStatus('error');
        }
      };

      // Initial connection check
      await checkConnection();

      // In polling mode, get active user count from database
      const updatePollingUserCount = async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) return;

          const response = await fetch('/api/admin/chat/presence', {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            // Set connected users to the number of online users in polling mode
            const onlineCount = data.stats?.online || 0;
            setConnectedUsers(onlineCount);
            console.log(`📊 Polling mode: ${onlineCount} users online`);
          }
        } catch (error) {
          console.error('❌ Failed to get polling user count:', error);
        }
      };

      // Get initial user count
      await updatePollingUserCount();

      // Heartbeat polling every pollingInterval
      pollingIntervalRef.current = setInterval(async () => {
        await checkConnection();
        await updatePollingUserCount();
      }, pollingInterval);

    } catch (error) {
      console.error('❌ Polling setup failed:', error);
      setConnectionStatus('error');
    }
  };

  // Message statistics tracking
  const updateMessageStats = () => {
    const now = Date.now();
    const { count, lastMinute } = messageCountRef.current;
    
    if (now - lastMinute >= 60000) {
      setStats(prev => ({ ...prev, messagesPerMinute: count }));
      messageCountRef.current = { count: 1, lastMinute: now };
    } else {
      messageCountRef.current.count++;
    }
  };

  // Public methods
  const setConnectionMode = async (mode: ConnectionMode) => {
    if (mode === connectionMode) return;
    
    console.log(`🔄 Switching connection mode: ${connectionMode} → ${mode}`);
    
    // Disconnect current connection
    disconnect();
    
    setConnectionModeState(mode);
  };

  const sendMessage = async (message: Omit<RealTimeMessage, 'id' | 'timestamp'>): Promise<boolean> => {
    const fullMessage: RealTimeMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };

    const startTime = Date.now();
    
    console.log('📤 RealTimeProvider: Attempting to send message', {
      connectionMode,
      connectionStatus,
      socketConnected: socketRef.current?.connected,
      messageType: message.type,
      channel: message.channel
    });
    
    try {
      if (connectionMode === 'socket' && socketRef.current?.connected) {
        // Send via Socket.IO
        console.log('📡 RealTimeProvider: Sending via Socket.IO');
        socketRef.current.emit('message', fullMessage);
        
        // Track latency
        const latency = Date.now() - startTime;
        setStats(prev => ({ ...prev, averageLatency: latency }));
        
        console.log('✅ RealTimeProvider: Message sent via Socket.IO');
        return true;
      } else {
        // Send via REST API
        console.log('📡 RealTimeProvider: Sending via REST API fallback');
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          console.error('❌ RealTimeProvider: No auth token available');
          return false;
        }
        
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(fullMessage)
        });

        const latency = Date.now() - startTime;
        setStats(prev => ({ ...prev, averageLatency: latency }));

        if (response.ok) {
          console.log('✅ RealTimeProvider: Message sent via REST API');
          return true;
        } else {
          const errorText = await response.text();
          console.error('❌ RealTimeProvider: REST API failed:', response.status, errorText);
          return false;
        }
      }
    } catch (error) {
      console.error('❌ RealTimeProvider: Failed to send message:', error);
      return false;
    }
  };

  const updatePresence = async (status: PresenceUpdate['status']): Promise<boolean> => {
    const update: PresenceUpdate = {
      username: 'current_user', // This should come from auth context
      status,
      lastActive: new Date().toISOString()
    };

    try {
      if (connectionMode === 'socket' && socketRef.current?.connected) {
        socketRef.current.emit('presence_update', update);
        return true;
      } else {
        const response = await fetch('/api/chat/presence', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(update)
        });
        return response.ok;
      }
    } catch (error) {
      console.error('❌ Failed to update presence:', error);
      return false;
    }
  };

  // Event listener registration
  const onMessage = (callback: (message: RealTimeMessage) => void) => {
    messageCallbacksRef.current.add(callback);
    return () => messageCallbacksRef.current.delete(callback);
  };

  const onPresenceUpdate = (callback: (update: PresenceUpdate) => void) => {
    presenceCallbacksRef.current.add(callback);
    return () => presenceCallbacksRef.current.delete(callback);
  };

  const onUserCount = (callback: (count: number) => void) => {
    userCountCallbacksRef.current.add(callback);
    return () => userCountCallbacksRef.current.delete(callback);
  };

  // Connection management
  const connect = async () => {
    let actualMode = connectionMode;
    
    console.log('🔄 RealTimeProvider: Starting connection process', {
      requestedMode: connectionMode,
      socketUrl
    });
    
    if (connectionMode === 'auto') {
      actualMode = await detectBestMode();
      console.log(`🔍 RealTimeProvider: Auto-detected connection mode: ${actualMode}`);
    } else {
      console.log(`⚙️ RealTimeProvider: Using explicit mode: ${actualMode}`);
    }

    console.log('🔍 RealTimeProvider: Final connection decision', {
      actualMode,
      actualModeType: typeof actualMode,
      isSocket: actualMode === 'socket',
      actualModeString: String(actualMode),
      connectionMode,
      connectionModeType: typeof connectionMode
    });

    if (actualMode === 'socket') {
      console.log('🔌 RealTimeProvider: Attempting Socket.IO connection...');
      await connectSocket();
    } else {
      console.log('📡 RealTimeProvider: Using polling mode...');
      await connectPolling();
    }
  };

  const disconnect = () => {
    // Disconnect Socket.IO
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Disconnect polling
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    setConnectionStatus('disconnected');
  };

  // Effects
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connectionMode]); // connect is created inline, so no dependency issue

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const contextValue: RealTimeContextType = {
    connectionMode,
    connectionStatus,
    connectedUsers,
    setConnectionMode,
    sendMessage,
    updatePresence,
    onMessage,
    onPresenceUpdate,
    onUserCount,
    stats,
    socket: socketRef.current
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
}

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

// Hook for easy status monitoring
export const useConnectionStatus = () => {
  const { connectionMode, connectionStatus, connectedUsers, stats } = useRealTime();
  
  return {
    mode: connectionMode,
    status: connectionStatus,
    isConnected: connectionStatus === 'connected',
    userCount: connectedUsers,
    performance: stats,
    statusColor: connectionStatus === 'connected' ? 'green' : 
                connectionStatus === 'connecting' ? 'yellow' : 'red',
    statusText: connectionStatus === 'connected' ? `${connectionMode.toUpperCase()} Connected` :
                connectionStatus === 'connecting' ? 'Connecting...' :
                connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'
  };
};