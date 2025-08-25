/**
 * Socket.io Client Singleton
 * Manages a single persistent connection across all chat components
 */

import io, { Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private eventListeners: Map<string, Map<string, Function>> = new Map();

  public connect(token: string): Socket {
    if (this.socket?.connected) {
      console.log('🔌 Using existing Socket.io connection');
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('🔌 Connection in progress, waiting...');
      return this.socket!;
    }

    console.log('🔌 Creating new Socket.io connection');
    this.isConnecting = true;

    this.socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.setupBaseListeners();
    this.isConnecting = false;

    return this.socket;
  }

  private setupBaseListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.io connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      
      // Re-authenticate on reconnection
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      if (token) {
        this.socket?.emit('authenticate', token);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket.io disconnected:', reason);
      
      if (reason === 'io client disconnect') {
        // Client-side disconnect, don't reconnect automatically
        return;
      }
      
      // Auto-reconnect for server disconnections
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error);
      this.attemptReconnect();
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket.io authenticated:', data);
    });

    this.socket.on('auth:error', (error) => {
      console.error('❌ Socket.io auth error:', error);
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.socket?.connected) {
        this.socket?.connect();
      }
    }, delay);
  }

  public addEventListener(componentId: string, event: string, listener: Function) {
    if (!this.eventListeners.has(componentId)) {
      this.eventListeners.set(componentId, new Map());
    }
    
    const componentListeners = this.eventListeners.get(componentId)!;
    componentListeners.set(event, listener);

    if (this.socket) {
      this.socket.on(event, listener as any);
    }
  }

  public removeEventListeners(componentId: string) {
    const componentListeners = this.eventListeners.get(componentId);
    if (componentListeners && this.socket) {
      componentListeners.forEach((listener, event) => {
        this.socket?.off(event, listener as any);
      });
      this.eventListeners.delete(componentId);
    }
  }

  public emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    } else {
      console.warn('⚠️ Cannot emit event, socket not connected:', event);
      return false;
    }
  }

  public joinChannel(channelId: string) {
    return this.emit('join_channel', { channelId });
  }

  public leaveChannel(channelId: string) {
    return this.emit('leave_channel', { channelId });
  }

  public sendMessage(channelId: string, message: string, type = 'text', replyToId?: string) {
    return this.emit('send_message', { channelId, message, type, replyToId });
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public disconnect() {
    if (this.socket) {
      console.log('🔌 Manually disconnecting Socket.io');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();