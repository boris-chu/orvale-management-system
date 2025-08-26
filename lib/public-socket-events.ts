/**
 * Public Portal Socket.io Event Definitions
 * 
 * This file defines all Socket.io events for guest-staff communication
 * in the public portal live chat system.
 */

import { Server, Socket } from 'socket.io';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

interface GuestSession {
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
  joinedAt: Date;
  assignedStaffId?: string;
  queuePosition?: number;
  estimatedWait?: number;
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

interface StaffWorkMode {
  staffId: string;
  mode: 'ready' | 'work' | 'ticketing' | 'away';
  maxConcurrentChats: number;
  currentChats: number;
}

/**
 * Public Portal Socket.io Event Handlers
 */
export class PublicPortalSocketEvents {
  private io: Server;
  private activeSessions: Map<string, GuestSession> = new Map();
  private guestQueue: GuestSession[] = [];
  private staffWorkModes: Map<string, StaffWorkMode> = new Map();
  private typingUsers: Map<string, { sessionId: string; isTyping: boolean; timestamp: Date }> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Initialize all public portal socket event handlers
   */
  setupPublicPortalEvents(socket: Socket): void {
    console.log(`🔌 Setting up public portal events for socket: ${socket.id}`);

    // Connection events
    socket.on('client_connected', this.handleClientConnected.bind(this, socket));
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));

    // Guest session events
    socket.on('join_public_chat', this.handleJoinPublicChat.bind(this, socket));
    socket.on('recover_public_session', this.handleRecoverSession.bind(this, socket));
    socket.on('end_public_session', this.handleEndSession.bind(this, socket));

    // Messaging events
    socket.on('send_public_message', this.handleSendMessage.bind(this, socket));
    socket.on('guest_typing', this.handleGuestTyping.bind(this, socket));
    socket.on('staff_typing', this.handleStaffTyping.bind(this, socket));
    socket.on('mark_message_read', this.handleMarkMessageRead.bind(this, socket));

    // File sharing events
    socket.on('upload_public_file', this.handleFileUpload.bind(this, socket));

    // Staff events (for staff members using the public queue)
    socket.on('staff_set_work_mode', this.handleStaffSetWorkMode.bind(this, socket));
    socket.on('staff_claim_session', this.handleStaffClaimSession.bind(this, socket));
    socket.on('staff_transfer_session', this.handleStaffTransferSession.bind(this, socket));
    socket.on('staff_boost_priority', this.handleStaffBoostPriority.bind(this, socket));

    // Queue management events
    socket.on('get_queue_status', this.handleGetQueueStatus.bind(this, socket));
    socket.on('get_staff_status', this.handleGetStaffStatus.bind(this, socket));
  }

  /**
   * Handle client connection
   */
  private handleClientConnected(socket: Socket, data: { clientType: 'public_guest' | 'staff' }): void {
    console.log(`👋 Public portal client connected: ${socket.id} (${data.clientType})`);
    
    // Join appropriate rooms based on client type
    if (data.clientType === 'public_guest') {
      socket.join('public_guests');
    } else if (data.clientType === 'staff') {
      socket.join('public_staff');
      // Send current queue status to newly connected staff
      this.sendQueueStatusToStaff();
    }

    // Send current queue statistics
    socket.emit('queue_statistics', {
      totalInQueue: this.guestQueue.length,
      averageWaitTime: this.calculateAverageWaitTime(),
      availableStaff: Array.from(this.staffWorkModes.values()).filter(s => s.mode === 'ready').length
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`👋 Public portal client disconnected: ${socket.id}`);

    // Handle guest disconnection
    const guestSession = this.findSessionBySocketId(socket.id);
    if (guestSession) {
      this.handleGuestDisconnect(guestSession);
    }

    // Handle staff disconnection
    const staffMode = this.findStaffBySocketId(socket.id);
    if (staffMode) {
      this.handleStaffDisconnect(staffMode, socket.id);
    }

    // Clean up typing indicators
    this.typingUsers.delete(socket.id);
  }

  /**
   * Handle guest joining public chat
   */
  private async handleJoinPublicChat(socket: Socket, data: Partial<GuestSession>): Promise<void> {
    console.log('📝 Guest joining public chat:', data);

    try {
      // Create new session
      const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session: GuestSession = {
        sessionId,
        guestInfo: data.guestInfo || { initialMessage: 'Hello, I need help' },
        priority: data.priority || 'normal',
        status: 'waiting',
        joinedAt: new Date()
      };

      // Save to database
      await this.saveSessionToDatabase(session);

      // Add to queue
      this.guestQueue.push(session);
      this.activeSessions.set(sessionId, session);
      
      // Update queue positions
      this.updateQueuePositions();

      // Join session room
      socket.join(`session_${sessionId}`);
      
      // Notify guest
      const queuePosition = this.guestQueue.findIndex(s => s.sessionId === sessionId) + 1;
      const estimatedWait = this.calculateEstimatedWaitTime(queuePosition);

      socket.emit('session_created', { sessionId, guestInfo: session.guestInfo });
      socket.emit('queue_joined', { sessionId, position: queuePosition, estimatedWait });

      // Notify all staff about new guest in queue
      this.io.to('public_staff').emit('guest_joined_queue', {
        sessionId,
        guestInfo: session.guestInfo,
        priority: session.priority,
        position: queuePosition,
        joinedAt: session.joinedAt
      });

      // Attempt auto-assignment
      this.attemptAutoAssignment();

      console.log(`✅ Guest session created: ${sessionId}, queue position: ${queuePosition}`);

    } catch (error) {
      console.error('❌ Error joining public chat:', error);
      socket.emit('error', { message: 'Failed to join chat. Please try again.' });
    }
  }

  /**
   * Handle session recovery
   */
  private async handleRecoverSession(socket: Socket, data: { sessionId: string }): Promise<void> {
    console.log('🔄 Attempting to recover session:', data.sessionId);

    try {
      const session = this.activeSessions.get(data.sessionId);
      if (!session) {
        // Try to load from database
        const dbSession = await this.loadSessionFromDatabase(data.sessionId);
        if (!dbSession) {
          socket.emit('session_recovery_failed', { sessionId: data.sessionId, reason: 'Session not found' });
          return;
        }
        this.activeSessions.set(data.sessionId, dbSession);
      }

      // Load messages from database
      const messages = await this.loadMessagesFromDatabase(data.sessionId);

      // Join session room
      socket.join(`session_${data.sessionId}`);

      // Notify guest of recovery
      socket.emit('session_recovered', {
        sessionId: data.sessionId,
        messages,
        status: session?.status || 'waiting'
      });

      console.log(`✅ Session recovered: ${data.sessionId}`);

    } catch (error) {
      console.error('❌ Error recovering session:', error);
      socket.emit('session_recovery_failed', { sessionId: data.sessionId, reason: 'Recovery failed' });
    }
  }

  /**
   * Handle sending public message
   */
  private async handleSendMessage(socket: Socket, data: Partial<PublicMessage>): Promise<void> {
    console.log('💬 Sending public message:', data);

    try {
      if (!data.sessionId || !data.message) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message: PublicMessage = {
        id: messageId,
        sessionId: data.sessionId,
        sender: data.sender || 'guest',
        senderName: data.senderName || 'Guest',
        message: data.message,
        type: data.type || 'text',
        timestamp: new Date(),
        status: 'sent',
        fileInfo: data.fileInfo
      };

      // Save to database
      await this.saveMessageToDatabase(message);

      // Send to all participants in the session
      this.io.to(`session_${data.sessionId}`).emit('message_received', message);

      // Update message status to delivered
      setTimeout(() => {
        message.status = 'delivered';
        this.io.to(`session_${data.sessionId}`).emit('message_status_updated', {
          messageId,
          status: 'delivered',
          timestamp: new Date()
        });
      }, 500);

      console.log(`✅ Message sent: ${messageId}`);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle guest typing indicator
   */
  private handleGuestTyping(socket: Socket, data: { sessionId: string; isTyping: boolean }): void {
    this.typingUsers.set(socket.id, {
      sessionId: data.sessionId,
      isTyping: data.isTyping,
      timestamp: new Date()
    });

    // Notify staff in the session
    socket.to(`session_${data.sessionId}`).emit('typing_indicator', {
      sessionId: data.sessionId,
      sender: 'guest',
      isTyping: data.isTyping
    });
  }

  /**
   * Handle staff typing indicator
   */
  private handleStaffTyping(socket: Socket, data: { sessionId: string; isTyping: boolean; staffName: string }): void {
    this.typingUsers.set(socket.id, {
      sessionId: data.sessionId,
      isTyping: data.isTyping,
      timestamp: new Date()
    });

    // Notify guest in the session
    socket.to(`session_${data.sessionId}`).emit('typing_indicator', {
      sessionId: data.sessionId,
      staffName: data.staffName,
      isTyping: data.isTyping
    });
  }

  /**
   * Handle staff claiming a session
   */
  private async handleStaffClaimSession(socket: Socket, data: { sessionId: string; staffId: string; staffName: string }): Promise<void> {
    console.log('👤 Staff claiming session:', data);

    try {
      const session = this.activeSessions.get(data.sessionId);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      if (session.assignedStaffId) {
        socket.emit('error', { message: 'Session already assigned to another staff member' });
        return;
      }

      // Check if staff is available
      const staffMode = this.staffWorkModes.get(data.staffId);
      if (!staffMode || staffMode.mode !== 'ready') {
        socket.emit('error', { message: 'Staff member not available' });
        return;
      }

      // Assign staff to session
      session.assignedStaffId = data.staffId;
      session.status = 'active';
      
      // Remove from queue
      this.guestQueue = this.guestQueue.filter(s => s.sessionId !== data.sessionId);
      this.updateQueuePositions();

      // Update staff work mode
      staffMode.currentChats++;
      if (staffMode.currentChats >= staffMode.maxConcurrentChats) {
        staffMode.mode = 'work';
      }

      // Join staff to session room
      socket.join(`session_${data.sessionId}`);

      // Update database
      await this.updateSessionInDatabase(session);

      // Notify guest
      this.io.to(`session_${data.sessionId}`).emit('staff_assigned', {
        sessionId: data.sessionId,
        staffId: data.staffId,
        staffName: data.staffName,
        assignedAt: new Date()
      });

      // Notify all staff
      this.io.to('public_staff').emit('session_claimed', {
        sessionId: data.sessionId,
        staffId: data.staffId,
        staffName: data.staffName
      });

      console.log(`✅ Session ${data.sessionId} assigned to staff ${data.staffName}`);

    } catch (error) {
      console.error('❌ Error claiming session:', error);
      socket.emit('error', { message: 'Failed to claim session' });
    }
  }

  /**
   * Attempt automatic assignment of guests to available staff
   */
  private attemptAutoAssignment(): void {
    if (this.guestQueue.length === 0) return;

    const availableStaff = Array.from(this.staffWorkModes.values())
      .filter(staff => staff.mode === 'ready' && staff.currentChats < staff.maxConcurrentChats)
      .sort((a, b) => a.currentChats - b.currentChats); // Assign to staff with least current chats

    if (availableStaff.length === 0) return;

    // Get highest priority guest from queue
    const priorityOrder = { 'vip': 4, 'urgent': 3, 'high': 2, 'normal': 1 };
    const nextGuest = this.guestQueue.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority] || 
      a.joinedAt.getTime() - b.joinedAt.getTime()
    )[0];

    if (!nextGuest) return;

    const assignedStaff = availableStaff[0];

    // Auto-assign
    nextGuest.assignedStaffId = assignedStaff.staffId;
    nextGuest.status = 'active';
    
    // Remove from queue
    this.guestQueue = this.guestQueue.filter(s => s.sessionId !== nextGuest.sessionId);
    this.updateQueuePositions();

    // Update staff status
    assignedStaff.currentChats++;
    if (assignedStaff.currentChats >= assignedStaff.maxConcurrentChats) {
      assignedStaff.mode = 'work';
    }

    // Notify guest
    this.io.to(`session_${nextGuest.sessionId}`).emit('staff_assigned', {
      sessionId: nextGuest.sessionId,
      staffId: assignedStaff.staffId,
      staffName: 'Support Agent', // Would come from database
      assignedAt: new Date()
    });

    // Notify staff
    this.io.to('public_staff').emit('auto_assignment', {
      sessionId: nextGuest.sessionId,
      staffId: assignedStaff.staffId,
      guestInfo: nextGuest.guestInfo
    });

    console.log(`🤖 Auto-assigned session ${nextGuest.sessionId} to staff ${assignedStaff.staffId}`);
  }

  /**
   * Update queue positions for all waiting guests
   */
  private updateQueuePositions(): void {
    this.guestQueue.forEach((session, index) => {
      const newPosition = index + 1;
      const estimatedWait = this.calculateEstimatedWaitTime(newPosition);
      
      session.queuePosition = newPosition;
      session.estimatedWait = estimatedWait;

      // Notify guest of position update
      this.io.to(`session_${session.sessionId}`).emit('queue_position_updated', {
        sessionId: session.sessionId,
        position: newPosition,
        estimatedWait
      });
    });

    // Notify staff of queue updates
    this.sendQueueStatusToStaff();
  }

  /**
   * Send queue status to all staff
   */
  private sendQueueStatusToStaff(): void {
    const queueData = this.guestQueue.map(session => ({
      sessionId: session.sessionId,
      guestInfo: session.guestInfo,
      priority: session.priority,
      status: session.status,
      waitTime: Date.now() - session.joinedAt.getTime(),
      position: session.queuePosition
    }));

    this.io.to('public_staff').emit('queue_status_updated', queueData);
  }

  /**
   * Calculate estimated wait time based on queue position
   */
  private calculateEstimatedWaitTime(position: number): number {
    const averageSessionTime = 8; // 8 minutes average
    const availableStaff = Array.from(this.staffWorkModes.values())
      .filter(s => s.mode === 'ready').length;
    
    if (availableStaff === 0) return position * averageSessionTime;
    
    return Math.ceil((position / availableStaff) * averageSessionTime);
  }

  /**
   * Calculate average wait time in queue
   */
  private calculateAverageWaitTime(): number {
    if (this.guestQueue.length === 0) return 0;
    
    const totalWaitTime = this.guestQueue.reduce((total, session) => {
      return total + (Date.now() - session.joinedAt.getTime());
    }, 0);
    
    return Math.floor(totalWaitTime / this.guestQueue.length / 1000 / 60); // Convert to minutes
  }

  // Helper methods for database operations (simplified)
  private async saveSessionToDatabase(session: GuestSession): Promise<void> {
    const db = new Database.Database(dbPath);
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO public_chat_sessions_enhanced (
          session_id, guest_name, guest_email, guest_phone, 
          department, initial_message, priority_level, status, 
          joined_at, custom_fields_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        session.sessionId,
        session.guestInfo.name || null,
        session.guestInfo.email || null,
        session.guestInfo.phone || null,
        session.guestInfo.department || null,
        session.guestInfo.initialMessage,
        session.priority,
        session.status,
        session.joinedAt.toISOString(),
        JSON.stringify(session.guestInfo.customFields || {})
      ];
      
      db.run(sql, params, (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async saveMessageToDatabase(message: PublicMessage): Promise<void> {
    const db = new Database.Database(dbPath);
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO public_chat_messages (
          message_id, session_id, sender_type, sender_name, 
          message_text, message_type, timestamp, status, 
          file_info_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        message.id,
        message.sessionId,
        message.sender,
        message.senderName,
        message.message,
        message.type,
        message.timestamp.toISOString(),
        message.status,
        JSON.stringify(message.fileInfo || {})
      ];
      
      db.run(sql, params, (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async updateSessionInDatabase(session: GuestSession): Promise<void> {
    const db = new Database.Database(dbPath);
    
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE public_chat_sessions_enhanced 
        SET status = ?, assigned_staff_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `;
      
      db.run(sql, [session.status, session.assignedStaffId, session.sessionId], (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async loadSessionFromDatabase(sessionId: string): Promise<GuestSession | null> {
    // Implementation would load from database
    return null;
  }

  private async loadMessagesFromDatabase(sessionId: string): Promise<PublicMessage[]> {
    // Implementation would load messages from database
    return [];
  }

  // Helper methods for finding sessions and staff
  private findSessionBySocketId(socketId: string): GuestSession | null {
    // Implementation would track socket-to-session mapping
    return null;
  }

  private findStaffBySocketId(socketId: string): StaffWorkMode | null {
    // Implementation would track socket-to-staff mapping
    return null;
  }

  private handleGuestDisconnect(session: GuestSession): void {
    // Handle guest disconnection - mark as potentially abandoned
    session.status = 'abandoned';
    console.log(`👋 Guest disconnected from session: ${session.sessionId}`);
  }

  private handleStaffDisconnect(staff: StaffWorkMode, socketId: string): void {
    // Handle staff disconnection - reassign their chats
    console.log(`👋 Staff disconnected: ${staff.staffId}`);
  }

  // Additional event handlers would be implemented here
  private handleEndSession(socket: Socket, data: any): void {}
  private handleMarkMessageRead(socket: Socket, data: any): void {}
  private handleFileUpload(socket: Socket, data: any): void {}
  private handleStaffSetWorkMode(socket: Socket, data: any): void {}
  private handleStaffTransferSession(socket: Socket, data: any): void {}
  private handleStaffBoostPriority(socket: Socket, data: any): void {}
  private handleGetQueueStatus(socket: Socket, data: any): void {}
  private handleGetStaffStatus(socket: Socket, data: any): void {}
}

export default PublicPortalSocketEvents;