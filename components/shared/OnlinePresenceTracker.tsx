/**
 * OnlinePresenceTracker - Shared component for displaying user online status
 * Shows colored dots indicating online/away/busy/offline status
 * Connects to Socket.io for real-time presence updates
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import io, { Socket } from 'socket.io-client';

interface OnlinePresenceTrackerProps {
  userId: string;
  showStatus?: boolean; // Show text status alongside dot
  showOnlyText?: boolean; // Show only status text, no dot (for use with avatar dot)
  size?: 'sm' | 'md' | 'lg';
  showConnectionCount?: boolean; // Show number of active tabs
  className?: string;
  animate?: boolean; // Enable pulse animation
}

interface PresenceData {
  status: 'online' | 'away' | 'busy' | 'offline' | 'idle' | 'in_call' | 'in_meeting' | 'presenting';
  statusMessage?: string;
  customStatus?: string;
  connectionCount?: number;
  lastActive?: string;
}

export default function OnlinePresenceTracker({
  userId,
  showStatus = false,
  showOnlyText = false,
  size = 'md',
  showConnectionCount = false,
  className = '',
  animate = true
}: OnlinePresenceTrackerProps) {
  const [presence, setPresence] = useState<PresenceData>({
    status: 'online', // Default to online since socket connections are disabled
    connectionCount: 0
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      dot: 'w-2 h-2',
      text: 'text-xs',
      spacing: 'gap-1'
    },
    md: {
      dot: 'w-3 h-3',
      text: 'text-sm',
      spacing: 'gap-2'
    },
    lg: {
      dot: 'w-4 h-4',
      text: 'text-base',
      spacing: 'gap-2'
    }
  };

  // Status colors and labels
  const statusConfig = {
    online: {
      color: 'bg-green-500',
      label: 'Online',
      pulse: true
    },
    away: {
      color: 'bg-yellow-500',
      label: 'Away',
      pulse: false
    },
    busy: {
      color: 'bg-red-500',
      label: 'Busy',
      pulse: false
    },
    idle: {
      color: 'bg-orange-400',
      label: 'Idle',
      pulse: false
    },
    in_call: {
      color: 'bg-blue-500',
      label: 'In Call',
      pulse: true
    },
    in_meeting: {
      color: 'bg-purple-500',
      label: 'In Meeting',
      pulse: true
    },
    presenting: {
      color: 'bg-indigo-500',
      label: 'Presenting',
      pulse: true
    },
    offline: {
      color: 'bg-gray-400',
      label: 'Offline',
      pulse: false
    }
  };

  // Initialize Socket.io connection
  const initializeSocket = useCallback(() => {
    if (socket?.connected) return;

    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Authenticate with JWT
    newSocket.on('connect', () => {
      setIsConnected(true);
      const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      if (token) {
        newSocket.emit('authenticate', token);
      }
    });

    newSocket.on('authenticated', () => {
      console.log('Presence tracker authenticated');
      // Request initial presence data
      fetchUserPresence(newSocket);
    });

    // Listen for presence updates
    newSocket.on('presence_updated', (data) => {
      if (data.userId === userId) {
        setPresence({
          status: data.status,
          statusMessage: data.statusMessage,
          customStatus: data.customStatus,
          connectionCount: data.connectionCount || 0,
          lastActive: data.timestamp
        });
      }
    });

    // Listen for general presence updates
    newSocket.on('presence:update', (data) => {
      if (data.userId === userId) {
        setPresence(prev => ({
          ...prev,
          status: data.status,
          connectionCount: data.connectionCount || 0
        }));
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('auth:error', (error) => {
      console.error('Presence tracker auth error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]); // Removed socket from deps to prevent circular dependency

  // Fetch initial presence data
  const fetchUserPresence = async (socketInstance: Socket) => {
    try {
      // First try to get from REST API
      const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      if (!token) return;

      const response = await fetch('/api/chat/presence', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const userPresence = [
          ...data.presence.online,
          ...data.presence.away,
          ...data.presence.busy,
          ...data.presence.idle,
          ...data.presence.in_call,
          ...data.presence.in_meeting,
          ...data.presence.presenting,
          ...data.presence.offline
        ].find((user: any) => user.user_id === userId);

        if (userPresence) {
          setPresence({
            status: userPresence.status,
            statusMessage: userPresence.status_message,
            customStatus: userPresence.custom_status,
            connectionCount: userPresence.connection_count || 0,
            lastActive: userPresence.last_active
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user presence:', error);
    }
  };

  // Initialize socket connection - TEMPORARILY DISABLED to prevent connection spam
  useEffect(() => {
    // TODO: Re-enable once socket connection management is fixed
    // const cleanup = initializeSocket();
    // return cleanup;
    return () => {};
  }, [initializeSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const config = sizeConfig[size];
  const statusInfo = statusConfig[presence.status];
  const shouldPulse = animate && statusInfo.pulse && presence.status === 'online';

  return (
    <div className={`inline-flex items-center ${config.spacing} ${className}`}>
      {/* Status Dot - only show if not text-only mode */}
      {!showOnlyText && (
        <div className="relative">
          <motion.div
            className={`${config.dot} ${statusInfo.color} rounded-full border-2 border-white shadow-sm`}
            animate={shouldPulse ? {
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Connection count indicator */}
          {showConnectionCount && presence.connectionCount && presence.connectionCount > 1 && (
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center border border-white">
              {presence.connectionCount > 9 ? '9+' : presence.connectionCount}
            </div>
          )}
        </div>
      )}

      {/* Status Text */}
      {(showStatus || showOnlyText) && (
        <div className="flex flex-col">
          <span className={`${config.text} font-medium text-gray-900 dark:text-gray-100`}>
            {statusInfo.label}
          </span>
          
          {/* Custom status message */}
          {presence.customStatus && (
            <span className={`${size === 'sm' ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400 truncate max-w-32`}>
              {presence.customStatus}
            </span>
          )}
          
          {/* Status message */}
          {!presence.customStatus && presence.statusMessage && (
            <span className={`${size === 'sm' ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400 truncate max-w-32`}>
              {presence.statusMessage}
            </span>
          )}
        </div>
      )}

      {/* Connection indicator (debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="ml-2">
          <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} 
               title={isConnected ? 'Socket connected' : 'Socket disconnected'} />
        </div>
      )}
    </div>
  );
}

// Hook for managing user's own presence
export const usePresenceManager = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'online' | 'away' | 'busy' | 'offline' | 'idle' | 'in_call' | 'in_meeting' | 'presenting'>('offline');

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      if (token) {
        newSocket.emit('authenticate', token);
      }
    });

    newSocket.on('authenticated', () => {
      setCurrentStatus('online');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const updateStatus = useCallback((
    status: 'online' | 'away' | 'busy' | 'offline' | 'idle' | 'in_call' | 'in_meeting' | 'presenting',
    statusMessage?: string,
    customStatus?: string
  ) => {
    if (socket?.connected) {
      socket.emit('update_presence', {
        status,
        statusMessage,
        customStatus
      });
      setCurrentStatus(status);
    }
  }, [socket]);

  return {
    currentStatus,
    updateStatus,
    isConnected: socket?.connected || false
  };
};