/**
 * Public Portal Socket.io Client
 * Singleton pattern for managing public chat connections
 */

import { io, Socket } from 'socket.io-client';

interface PublicSocketEvents {
  'session:started': (data: { sessionId: string; queuePosition: number; estimatedWaitTime: number }) => void;
  'session:error': (data: { message: string }) => void;
  'queue:update': (data: { queuePosition: number; estimatedWaitTime: number }) => void;
  'agent:assigned': (data: { agentId: string; agentName: string; agentAvatar?: string }) => void;
  'agent:message': (data: { messageId: string; message: string; type: string; timestamp: Date }) => void;
  'agent:typing': (data: { isTyping: boolean }) => void;
  'message:delivered': (data: { messageId: string }) => void;
  'message:error': (data: { messageId: string; error: string }) => void;
  'session:ended': (data: { reason: string }) => void;
  'guest:disconnected': (data: { sessionId: string }) => void;
  // Staff-side events
  'guest:message': (data: { sessionId: string; messageId: string; message: string; timestamp: Date }) => void;
  'staff:message': (data: { sessionId: string; messageId: string; message: string; timestamp: Date; staffName: string }) => void;
  'guest:typing': (data: { sessionId: string; isTyping: boolean }) => void;
  'staff:typing': (data: { sessionId: string; isTyping: boolean }) => void;
}

class PublicPortalSocket {
  private socket: Socket | null = null;
  private isConnecting = false;
  private eventListeners = new Map<string, Map<string, Function>>();
  private sessionId: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced to prevent infinite errors

  /**
   * Connect to the public portal namespace
   * @param guestInfo Guest information for starting a session
   */
  connect(guestInfo?: { name: string; email: string; phone?: string; department?: string; token?: string }) {
    if (this.socket?.connected || this.isConnecting) {
      console.log('🌐 Public portal socket already connected or connecting');
      return this.socket;
    }

    this.isConnecting = true;
    console.log('🌐 Connecting to public portal socket...');

    // Connect to the public portal namespace
    this.socket = io('http://localhost:3001/public-portal', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      auth: guestInfo?.token ? { token: guestInfo.token } : {}
    });

    // Set up connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Public portal socket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0; // Reset attempts on successful connection

      // If we have guest info, start a session
      if (guestInfo) {
        this.startSession(guestInfo);
      }

      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Emit stored events
      this.emitStoredEvent('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Public portal socket disconnected:', reason);
      this.emitStoredEvent('disconnect', reason);

      // Set up reconnection for temporary disconnects
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't auto-reconnect
        console.log('Server disconnected the client');
      } else {
        // Client-side disconnect, try to reconnect after delay
        this.reconnectTimer = setTimeout(() => {
          if (!this.socket?.connected) {
            console.log('Attempting to reconnect...');
            this.socket?.connect();
          }
        }, 5000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.warn('🔌 Chat connection temporarily unavailable');
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      // Only emit error if we haven't exceeded max attempts
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.emitStoredEvent('connect_error', { 
          type: 'connection_error',
          userMessage: 'Chat service is temporarily unavailable. Please try submitting a ticket instead.',
          technicalError: error.message 
        });
      } else {
        console.warn('🚫 Max reconnection attempts reached, stopping error emission');
        // Stop trying to reconnect after max attempts
        this.socket?.disconnect();
      }
    });

    return this.socket;
  }

  /**
   * Start a new chat session
   */
  startSession(guestInfo: { 
    name: string; 
    email: string; 
    phone?: string; 
    department?: string;
    customFields?: Record<string, any>;
    recoverySessionId?: string;
  }) {
    if (!this.socket?.connected) {
      console.error('Cannot start session: socket not connected');
      return false;
    }

    this.socket.emit('guest:start_session', guestInfo);
    return true;
  }

  /**
   * Send a message
   */
  sendMessage(message: string, type: 'text' | 'file' = 'text', metadata?: any) {
    if (!this.socket?.connected || !this.sessionId) {
      console.error('Cannot send message: socket not connected or no active session');
      return false;
    }

    this.socket.emit('guest:message', { message, type, metadata });
    return true;
  }

  /**
   * Send typing indicator
   */
  sendTyping(isTyping: boolean) {
    if (!this.socket?.connected || !this.sessionId) {
      return false;
    }

    this.socket.emit('guest:typing', { isTyping });
    return true;
  }

  /**
   * End the chat session
   */
  endSession() {
    if (!this.socket?.connected || !this.sessionId) {
      return false;
    }

    this.socket.emit('guest:end_session', { sessionId: this.sessionId });
    this.sessionId = null;
    return true;
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = null;
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get the underlying socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Emit a generic event
   */
  emit(event: string, data?: any): boolean {
    if (!this.socket?.connected) {
      console.error('Cannot emit event: socket not connected');
      return false;
    }

    this.socket.emit(event, data);
    return true;
  }

  /**
   * Add event listener with component scope
   */
  addEventListener<K extends keyof PublicSocketEvents>(
    componentId: string,
    event: K,
    callback: PublicSocketEvents[K]
  ) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Map());
    }

    const eventMap = this.eventListeners.get(event)!;
    eventMap.set(componentId, callback);

    // Special handling for session events
    if (event === 'session:started') {
      const wrappedCallback = (data: any) => {
        this.sessionId = data.sessionId;
        callback(data);
      };
      this.socket?.on(event, wrappedCallback as any);
      eventMap.set(componentId, wrappedCallback);
    } else {
      this.socket?.on(event, callback as any);
    }
  }

  /**
   * Remove event listeners for a component
   */
  removeEventListeners(componentId: string) {
    this.eventListeners.forEach((eventMap, event) => {
      const callback = eventMap.get(componentId);
      if (callback) {
        this.socket?.off(event, callback as any);
        eventMap.delete(componentId);
      }
    });
  }

  /**
   * Join a specific session room (for reconnected sessions)
   */
  joinSession(sessionId: string): boolean {
    if (!this.socket?.connected) {
      console.error('Cannot join session: socket not connected');
      return false;
    }

    console.log(`🔗 Joining session room: ${sessionId}`);
    this.sessionId = sessionId;
    this.socket.emit('join:session', { sessionId });
    return true;
  }

  /**
   * Emit event to all registered listeners
   */
  private emitStoredEvent(event: string, data?: any) {
    const eventMap = this.eventListeners.get(event);
    if (eventMap) {
      eventMap.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const publicPortalSocket = new PublicPortalSocket();

// Type exports
export type { PublicSocketEvents };