'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionMode = 'socket' | 'polling' | 'auto';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface RealTimeMessage {
  id: string;
  type: 'message' | 'presence' | 'system';
  channel?: string;
  from: string;
  content: any;
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
  const latencyTrackerRef = useRef<Map<string, number>>(new Map());
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
    } catch (error) {
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
        console.log('⚡ Socket.IO connected:', socket.id);
        setConnectionStatus('connected');
        socketRef.current = socket;
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect unless explicitly disconnected
        if (reason !== 'io client disconnect') {
          setStats(prev => ({ 
            ...prev, 
            reconnectCount: prev.reconnectCount + 1,
            lastReconnect: new Date().toISOString()
          }));
        }
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
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

  // Polling connection management
  const connectPolling = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Server-Sent Events for real-time updates
      const eventSource = new EventSource('/api/chat/stream', {
        // Add auth header if supported
      });

      eventSource.onopen = () => {
        console.log('📡 Polling connection established (SSE)');
        setConnectionStatus('connected');
        eventSourceRef.current = eventSource;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
            updateMessageStats();
            messageCallbacksRef.current.forEach(callback => callback(data));
          } else if (data.type === 'presence') {
            presenceCallbacksRef.current.forEach(callback => callback(data));
          } else if (data.type === 'user_count') {
            setConnectedUsers(data.count);
            userCountCallbacksRef.current.forEach(callback => callback(data.count));
          }
        } catch (error) {
          console.error('❌ Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        setConnectionStatus('error');
        
        // Retry after 5 seconds
        setTimeout(() => {
          if (connectionMode === 'polling') {
            connectPolling();
          }
        }, 5000);
      };

      // Heartbeat polling for additional updates
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch('/api/chat/heartbeat', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setConnectedUsers(data.connectedUsers || 0);
          }
        } catch (error) {
          console.error('❌ Heartbeat failed:', error);
        }
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
    
    try {
      if (connectionMode === 'socket' && socketRef.current?.connected) {
        // Send via Socket.IO
        socketRef.current.emit('message', fullMessage);
        
        // Track latency
        const latency = Date.now() - startTime;
        setStats(prev => ({ ...prev, averageLatency: latency }));
        
        return true;
      } else {
        // Send via REST API
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(fullMessage)
        });

        const latency = Date.now() - startTime;
        setStats(prev => ({ ...prev, averageLatency: latency }));

        return response.ok;
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
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
    
    if (connectionMode === 'auto') {
      actualMode = await detectBestMode();
      console.log(`🔍 Auto-detected connection mode: ${actualMode}`);
    }

    if (actualMode === 'socket') {
      await connectSocket();
    } else {
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
  }, [connectionMode]);

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
    stats
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