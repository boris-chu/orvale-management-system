import io, { Socket } from 'socket.io-client';

/**
 * Public Portal Socket.io Client
 * Specialized client for guest-staff communication in public portal
 * 
 * Key Features:
 * - Guest session management
 * - Queue position updates  
 * - Staff assignment notifications
 * - Real-time messaging with typing indicators
 * - Session recovery and reconnection
 * - File sharing support
 * - Priority boost handling
 */

interface PublicSocketClient {
  socket: Socket | null;
  isConnected: boolean;
  currentSessionId: string | null;
  eventListeners: Map<string, Array<{ event: string; callback: Function }>>;
}

interface GuestSessionData {
  sessionId: string;
  guestInfo: {
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
    initialMessage: string;
    customFields?: Record<string, any>;
  };
  priority: 'normal' | 'high' | 'urgent' | 'vip';
  status: 'waiting' | 'active' | 'ended' | 'abandoned' | 'staff_disconnected' | 'priority_requeued';
}

interface StaffAssignment {
  staffId: string;
  staffName: string;
  staffAvatar?: string;
  department?: string;
  assignedAt: Date;
}

interface PublicMessage {
  id: string;
  sessionId: string;
  sender: 'guest' | 'staff';
  senderName: string;
  message: string;
  type: 'text' | 'file' | 'image' | 'system';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  fileInfo?: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  };
}

class PublicSocketClientClass implements PublicSocketClient {
  public socket: Socket | null = null;
  public isConnected: boolean = false;
  public currentSessionId: string | null = null;
  public eventListeners: Map<string, Array<{ event: string; callback: Function }>> = new Map();

  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  /**
   * Connect to public portal Socket.io server
   */
  connect(guestToken?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Socket.io client configuration for public portal
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'], // Safari/iOS compatibility
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000, // iOS needs longer timeouts
      auth: guestToken ? { token: guestToken, type: 'guest' } : { type: 'guest' },
      query: {
        clientType: 'public_guest'
      }
    });

    this.setupEventHandlers();
    return this.socket;
  }

  /**
   * Set up core Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 Public portal connected to Socket.io server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('client_connected', { clientType: 'public_guest' });
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Public portal disconnected from Socket.io server:', reason);
      this.isConnected = false;
      
      // Handle session recovery if disconnected during active chat
      if (this.currentSessionId && reason === 'transport close') {
        this.handleSessionDisconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Public portal Socket.io connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 Public portal reconnected after ${attemptNumber} attempts`);
      
      // Attempt to recover session if we had one
      if (this.currentSessionId) {
        this.recoverSession(this.currentSessionId);
      }
    });

    // Set up public portal specific event handlers
    this.setupPublicPortalEvents();
  }

  /**
   * Set up public portal specific events
   */
  private setupPublicPortalEvents(): void {
    if (!this.socket) return;

    // Session management events
    this.socket.on('session_created', this.handleSessionCreated.bind(this));
    this.socket.on('session_ended', this.handleSessionEnded.bind(this));
    this.socket.on('session_recovered', this.handleSessionRecovered.bind(this));
    
    // Queue management events
    this.socket.on('queue_joined', this.handleQueueJoined.bind(this));
    this.socket.on('queue_position_updated', this.handleQueuePositionUpdated.bind(this));
    this.socket.on('queue_left', this.handleQueueLeft.bind(this));
    
    // Staff assignment events
    this.socket.on('staff_assigned', this.handleStaffAssigned.bind(this));
    this.socket.on('staff_disconnected', this.handleStaffDisconnected.bind(this));
    this.socket.on('staff_transferred', this.handleStaffTransferred.bind(this));
    
    // Messaging events
    this.socket.on('message_received', this.handleMessageReceived.bind(this));
    this.socket.on('message_status_updated', this.handleMessageStatusUpdated.bind(this));
    this.socket.on('typing_indicator', this.handleTypingIndicator.bind(this));
    
    // File sharing events
    this.socket.on('file_upload_progress', this.handleFileUploadProgress.bind(this));
    this.socket.on('file_upload_completed', this.handleFileUploadCompleted.bind(this));
    this.socket.on('file_upload_failed', this.handleFileUploadFailed.bind(this));
    
    // Priority and status events
    this.socket.on('priority_boosted', this.handlePriorityBoosted.bind(this));
    this.socket.on('session_status_changed', this.handleSessionStatusChanged.bind(this));
  }

  /**
   * Join public chat session
   */
  joinPublicChat(guestData: GuestSessionData['guestInfo']): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot join chat - not connected to Socket.io server');
      return;
    }

    const sessionData: Partial<GuestSessionData> = {
      guestInfo: guestData,
      priority: 'normal',
      status: 'waiting'
    };

    this.socket.emit('join_public_chat', sessionData);
    console.log('📝 Requested to join public chat with data:', guestData);
  }

  /**
   * Send message in public chat
   */
  sendMessage(sessionId: string, message: string, type: PublicMessage['type'] = 'text', fileInfo?: PublicMessage['fileInfo']): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot send message - not connected');
      return;
    }

    const messageData: Partial<PublicMessage> = {
      sessionId,
      sender: 'guest',
      message,
      type,
      fileInfo,
      timestamp: new Date(),
      status: 'sending'
    };

    this.socket.emit('send_public_message', messageData);
    console.log('💬 Sent public message:', messageData);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(sessionId: string, isTyping: boolean): void {
    if (!this.socket?.connected || !sessionId) return;

    this.socket.emit('guest_typing', {
      sessionId,
      isTyping,
      timestamp: new Date()
    });
  }

  /**
   * Upload file in public chat
   */
  uploadFile(sessionId: string, file: File, onProgress?: (progress: number) => void): void {
    if (!this.socket?.connected) {
      console.error('❌ Cannot upload file - not connected');
      return;
    }

    // Convert file to base64 for Socket.io transmission
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        sessionId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: reader.result as string
      };

      this.socket!.emit('upload_public_file', fileData);
    };

    reader.readAsDataURL(file);
  }

  /**
   * End public chat session
   */
  endSession(sessionId: string, rating?: { score: number; comment?: string }): void {
    if (!this.socket?.connected) return;

    this.socket.emit('end_public_session', {
      sessionId,
      rating,
      endedBy: 'guest',
      timestamp: new Date()
    });

    this.currentSessionId = null;
  }

  /**
   * Recover existing session
   */
  recoverSession(sessionId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('recover_public_session', {
      sessionId,
      timestamp: new Date()
    });

    console.log('🔄 Attempting to recover session:', sessionId);
  }

  /**
   * Handle session disconnect for recovery
   */
  private handleSessionDisconnect(): void {
    if (!this.currentSessionId) return;

    // Store session info for recovery
    const recoveryData = {
      sessionId: this.currentSessionId,
      disconnectedAt: new Date(),
      reason: 'connection_lost'
    };

    localStorage.setItem('public_chat_recovery', JSON.stringify(recoveryData));
    console.log('💾 Stored session recovery data');
  }

  // Event handler methods
  private handleSessionCreated(data: { sessionId: string; guestInfo: any }): void {
    console.log('✅ Public chat session created:', data);
    this.currentSessionId = data.sessionId;
    this.notifyListeners('session_created', data);
  }

  private handleSessionEnded(data: { sessionId: string; reason: string }): void {
    console.log('🔚 Public chat session ended:', data);
    
    if (data.sessionId === this.currentSessionId) {
      this.currentSessionId = null;
    }
    
    // Clean up recovery data
    localStorage.removeItem('public_chat_recovery');
    this.notifyListeners('session_ended', data);
  }

  private handleSessionRecovered(data: { sessionId: string; messages: PublicMessage[]; status: string }): void {
    console.log('🔄 Public chat session recovered:', data);
    this.currentSessionId = data.sessionId;
    this.notifyListeners('session_recovered', data);
  }

  private handleQueueJoined(data: { sessionId: string; position: number; estimatedWait: number }): void {
    console.log('⏳ Joined public chat queue:', data);
    this.notifyListeners('queue_joined', data);
  }

  private handleQueuePositionUpdated(data: { sessionId: string; position: number; estimatedWait: number }): void {
    console.log('📍 Queue position updated:', data);
    this.notifyListeners('queue_position_updated', data);
  }

  private handleQueueLeft(data: { sessionId: string; reason: string }): void {
    console.log('🚪 Left queue:', data);
    this.notifyListeners('queue_left', data);
  }

  private handleStaffAssigned(data: StaffAssignment & { sessionId: string }): void {
    console.log('👤 Staff assigned to session:', data);
    this.notifyListeners('staff_assigned', data);
  }

  private handleStaffDisconnected(data: { sessionId: string; staffId: string; reason: string }): void {
    console.log('🔌 Staff disconnected:', data);
    this.notifyListeners('staff_disconnected', data);
  }

  private handleStaffTransferred(data: { sessionId: string; fromStaff: string; toStaff: StaffAssignment }): void {
    console.log('🔄 Chat transferred to new staff:', data);
    this.notifyListeners('staff_transferred', data);
  }

  private handleMessageReceived(data: PublicMessage): void {
    console.log('💬 Message received:', data);
    this.notifyListeners('message_received', data);
  }

  private handleMessageStatusUpdated(data: { messageId: string; status: PublicMessage['status']; timestamp: Date }): void {
    console.log('📧 Message status updated:', data);
    this.notifyListeners('message_status_updated', data);
  }

  private handleTypingIndicator(data: { sessionId: string; staffName: string; isTyping: boolean }): void {
    this.notifyListeners('typing_indicator', data);
  }

  private handleFileUploadProgress(data: { sessionId: string; fileName: string; progress: number }): void {
    this.notifyListeners('file_upload_progress', data);
  }

  private handleFileUploadCompleted(data: { sessionId: string; fileInfo: PublicMessage['fileInfo'] }): void {
    console.log('📁 File upload completed:', data);
    this.notifyListeners('file_upload_completed', data);
  }

  private handleFileUploadFailed(data: { sessionId: string; fileName: string; error: string }): void {
    console.error('❌ File upload failed:', data);
    this.notifyListeners('file_upload_failed', data);
  }

  private handlePriorityBoosted(data: { sessionId: string; oldPriority: string; newPriority: string; reason: string }): void {
    console.log('⚡ Session priority boosted:', data);
    this.notifyListeners('priority_boosted', data);
  }

  private handleSessionStatusChanged(data: { sessionId: string; oldStatus: string; newStatus: string; reason?: string }): void {
    console.log('📊 Session status changed:', data);
    this.notifyListeners('session_status_changed', data);
  }

  /**
   * Add event listener with component ID for cleanup
   */
  addEventListener(componentId: string, event: string, callback: Function): void {
    if (!this.eventListeners.has(componentId)) {
      this.eventListeners.set(componentId, []);
    }
    
    this.eventListeners.get(componentId)!.push({ event, callback });
    console.log(`📡 Added public portal event listener: ${componentId} -> ${event}`);
  }

  /**
   * Remove all event listeners for a component
   */
  removeEventListeners(componentId: string): void {
    this.eventListeners.delete(componentId);
    console.log(`🗑️ Removed all event listeners for component: ${componentId}`);
  }

  /**
   * Notify all registered listeners for an event
   */
  private notifyListeners(event: string, data: any): void {
    this.eventListeners.forEach((listeners) => {
      listeners.forEach((listener) => {
        if (listener.event === event) {
          try {
            listener.callback(data);
          } catch (error) {
            console.error(`❌ Error in public portal event listener for ${event}:`, error);
          }
        }
      });
    });
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot emit event - not connected to server');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentSessionId = null;
      console.log('🔌 Disconnected from public portal Socket.io server');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; sessionId: string | null } {
    return {
      isConnected: this.isConnected,
      sessionId: this.currentSessionId
    };
  }
}

// Singleton instance for public portal
export const publicSocketClient = new PublicSocketClientClass();
export default publicSocketClient;

// Type exports
export type {
  GuestSessionData,
  StaffAssignment,
  PublicMessage
};