/**
 * Enhanced Session Recovery System
 * 
 * Handles staff disconnections, auto-requeue with priority boost,
 * and configurable requeue settings from portal management.
 */

import { Server, Socket } from 'socket.io';
import Database from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'orvale_tickets.db');

interface SessionRecoverySettings {
  // Auto-requeue settings
  auto_requeue_enabled: boolean;
  requeue_position: 'front' | 'priority_boost' | 'original' | 'end';
  priority_boost_amount: number; // 0-3 (normal->high, high->urgent, urgent->vip)
  
  // Staff disconnect settings
  staff_disconnect_timeout: number; // seconds before considering disconnected
  grace_period_seconds: number; // time to allow staff to reconnect
  auto_reassign_after_seconds: number; // auto-assign to new staff after this time
  
  // Guest notification settings
  notify_guest_on_staff_disconnect: boolean;
  staff_disconnect_message: string;
  reassignment_message: string;
  
  // Priority escalation
  escalate_on_multiple_disconnects: boolean;
  max_disconnects_before_escalation: number;
  escalation_priority: 'urgent' | 'vip';
  
  // Abandon detection
  guest_inactivity_timeout: number; // minutes before considering abandoned
  auto_end_abandoned_sessions: boolean;
}

interface SessionRecoveryData {
  sessionId: string;
  originalStaffId: string;
  disconnectTime: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  gracePeriodExpiry: Date;
  originalQueuePosition?: number;
  disconnectReason: 'network' | 'browser_close' | 'timeout' | 'manual';
  guestNotified: boolean;
  priorityBoosted: boolean;
}

interface StaffDisconnectEvent {
  staffId: string;
  sessionIds: string[];
  disconnectTime: Date;
  lastSeen: Date;
  reason: 'network' | 'browser_close' | 'timeout';
  activeChatCount: number;
}

export class EnhancedSessionRecovery {
  private io: Server;
  private recoverySettings: SessionRecoverySettings | null = null;
  private activeRecoveries: Map<string, SessionRecoveryData> = new Map();
  private staffHeartbeats: Map<string, Date> = new Map();
  private disconnectedStaff: Map<string, StaffDisconnectEvent> = new Map();
  
  // Timers for cleanup and monitoring
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private recoveryCleanupInterval: NodeJS.Timeout | null = null;

  constructor(io: Server) {
    this.io = io;
    this.initializeRecoverySystem();
  }

  /**
   * Initialize the recovery system
   */
  async initializeRecoverySystem(): Promise<void> {
    console.log('🔄 Initializing Enhanced Session Recovery System...');
    
    try {
      // Load recovery settings from database
      await this.loadRecoverySettings();
      
      // Start monitoring systems
      this.startHeartbeatMonitoring();
      this.startRecoveryCleanup();
      
      console.log('✅ Enhanced Session Recovery System initialized');
    } catch (error) {
      console.error('❌ Failed to initialize session recovery system:', error);
    }
  }

  /**
   * Load recovery settings from database
   */
  private async loadRecoverySettings(): Promise<void> {
    const db = new Database.Database(dbPath);

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          auto_requeue_enabled,
          requeue_position,
          priority_boost_amount,
          staff_disconnect_timeout,
          grace_period_seconds,
          auto_reassign_after_seconds,
          notify_guest_on_staff_disconnect,
          staff_disconnect_message,
          reassignment_message,
          escalate_on_multiple_disconnects,
          max_disconnects_before_escalation,
          escalation_priority,
          guest_inactivity_timeout,
          auto_end_abandoned_sessions
        FROM public_portal_recovery_settings 
        WHERE id = 1
      `;

      db.get(sql, (err, row: any) => {
        db.close();
        
        if (err) {
          console.error('❌ Error loading recovery settings:', err);
          // Use default settings
          this.recoverySettings = this.getDefaultRecoverySettings();
          resolve();
          return;
        }

        if (row) {
          this.recoverySettings = {
            auto_requeue_enabled: !!row.auto_requeue_enabled,
            requeue_position: row.requeue_position || 'priority_boost',
            priority_boost_amount: row.priority_boost_amount || 1,
            staff_disconnect_timeout: row.staff_disconnect_timeout || 30,
            grace_period_seconds: row.grace_period_seconds || 60,
            auto_reassign_after_seconds: row.auto_reassign_after_seconds || 120,
            notify_guest_on_staff_disconnect: !!row.notify_guest_on_staff_disconnect,
            staff_disconnect_message: row.staff_disconnect_message || 'Your support agent has been disconnected. We are connecting you with another agent.',
            reassignment_message: row.reassignment_message || 'You have been connected with a new support agent.',
            escalate_on_multiple_disconnects: !!row.escalate_on_multiple_disconnects,
            max_disconnects_before_escalation: row.max_disconnects_before_escalation || 2,
            escalation_priority: row.escalation_priority || 'urgent',
            guest_inactivity_timeout: row.guest_inactivity_timeout || 10,
            auto_end_abandoned_sessions: !!row.auto_end_abandoned_sessions
          };
        } else {
          this.recoverySettings = this.getDefaultRecoverySettings();
        }

        console.log('📋 Loaded recovery settings:', this.recoverySettings);
        resolve();
      });
    });
  }

  /**
   * Get default recovery settings
   */
  private getDefaultRecoverySettings(): SessionRecoverySettings {
    return {
      auto_requeue_enabled: true,
      requeue_position: 'priority_boost',
      priority_boost_amount: 1,
      staff_disconnect_timeout: 30,
      grace_period_seconds: 60,
      auto_reassign_after_seconds: 120,
      notify_guest_on_staff_disconnect: true,
      staff_disconnect_message: 'Your support agent has been disconnected. We are connecting you with another agent.',
      reassignment_message: 'You have been connected with a new support agent.',
      escalate_on_multiple_disconnects: true,
      max_disconnects_before_escalation: 2,
      escalation_priority: 'urgent',
      guest_inactivity_timeout: 10,
      auto_end_abandoned_sessions: true
    };
  }

  /**
   * Handle staff member heartbeat
   */
  handleStaffHeartbeat(staffId: string): void {
    this.staffHeartbeats.set(staffId, new Date());
    
    // Check if this staff was marked as disconnected and handle reconnection
    if (this.disconnectedStaff.has(staffId)) {
      this.handleStaffReconnection(staffId);
    }
  }

  /**
   * Handle staff disconnection
   */
  async handleStaffDisconnection(staffId: string, sessionIds: string[], reason: StaffDisconnectEvent['reason'] = 'network'): Promise<void> {
    console.log(`🔌 Staff ${staffId} disconnected with ${sessionIds.length} active sessions`);

    if (!this.recoverySettings) {
      console.warn('⚠️ Recovery settings not loaded, using defaults');
      await this.loadRecoverySettings();
    }

    const disconnectEvent: StaffDisconnectEvent = {
      staffId,
      sessionIds,
      disconnectTime: new Date(),
      lastSeen: this.staffHeartbeats.get(staffId) || new Date(),
      reason,
      activeChatCount: sessionIds.length
    };

    this.disconnectedStaff.set(staffId, disconnectEvent);

    // Process each session
    for (const sessionId of sessionIds) {
      await this.processDisconnectedSession(sessionId, staffId, reason);
    }

    // Notify other staff members
    this.io.to('public_staff').emit('staff_disconnected', {
      staffId,
      sessionCount: sessionIds.length,
      reason,
      disconnectTime: disconnectEvent.disconnectTime
    });

    // Log disconnect event to database
    await this.logDisconnectEvent(disconnectEvent);
  }

  /**
   * Process a session when staff disconnects
   */
  private async processDisconnectedSession(sessionId: string, staffId: string, reason: string): Promise<void> {
    console.log(`🔄 Processing disconnected session: ${sessionId}`);

    try {
      // Get session data
      const sessionData = await this.getSessionFromDatabase(sessionId);
      if (!sessionData) {
        console.warn(`⚠️ Session ${sessionId} not found in database`);
        return;
      }

      // Create recovery data
      const recoveryData: SessionRecoveryData = {
        sessionId,
        originalStaffId: staffId,
        disconnectTime: new Date(),
        reconnectAttempts: 0,
        maxReconnectAttempts: 3,
        gracePeriodExpiry: new Date(Date.now() + (this.recoverySettings!.grace_period_seconds * 1000)),
        originalQueuePosition: sessionData.queuePosition,
        disconnectReason: reason as any,
        guestNotified: false,
        priorityBoosted: false
      };

      this.activeRecoveries.set(sessionId, recoveryData);

      // Notify guest about disconnect
      if (this.recoverySettings!.notify_guest_on_staff_disconnect) {
        this.io.to(`session_${sessionId}`).emit('staff_disconnected', {
          sessionId,
          staffId,
          message: this.recoverySettings!.staff_disconnect_message,
          gracePeriod: this.recoverySettings!.grace_period_seconds
        });
        recoveryData.guestNotified = true;
      }

      // Update session status
      await this.updateSessionStatus(sessionId, 'staff_disconnected');

      // Schedule grace period expiry
      setTimeout(() => {
        this.handleGracePeriodExpiry(sessionId);
      }, this.recoverySettings!.grace_period_seconds * 1000);

      console.log(`✅ Recovery process started for session ${sessionId}`);

    } catch (error) {
      console.error(`❌ Error processing disconnected session ${sessionId}:`, error);
    }
  }

  /**
   * Handle staff reconnection
   */
  private async handleStaffReconnection(staffId: string): Promise<void> {
    console.log(`🔄 Staff ${staffId} reconnected`);

    const disconnectEvent = this.disconnectedStaff.get(staffId);
    if (!disconnectEvent) return;

    // Remove from disconnected list
    this.disconnectedStaff.delete(staffId);

    // Check for sessions in recovery
    const recoverableSessions = Array.from(this.activeRecoveries.values())
      .filter(recovery => recovery.originalStaffId === staffId && 
                         new Date() < recovery.gracePeriodExpiry);

    for (const recovery of recoverableSessions) {
      await this.attemptSessionReassignment(recovery.sessionId, staffId);
    }

    // Notify staff about reconnection and available sessions
    this.io.to(`staff_${staffId}`).emit('reconnection_successful', {
      staffId,
      availableSessions: recoverableSessions.map(r => r.sessionId),
      disconnectDuration: Date.now() - disconnectEvent.disconnectTime.getTime()
    });
  }

  /**
   * Handle grace period expiry
   */
  private async handleGracePeriodExpiry(sessionId: string): Promise<void> {
    const recovery = this.activeRecoveries.get(sessionId);
    if (!recovery) return;

    console.log(`⏰ Grace period expired for session ${sessionId}`);

    // Check if original staff reconnected
    if (this.staffHeartbeats.has(recovery.originalStaffId)) {
      const lastSeen = this.staffHeartbeats.get(recovery.originalStaffId)!;
      const timeSinceLastSeen = Date.now() - lastSeen.getTime();
      
      if (timeSinceLastSeen < this.recoverySettings!.staff_disconnect_timeout * 1000) {
        // Staff is back online, attempt reassignment
        await this.attemptSessionReassignment(sessionId, recovery.originalStaffId);
        return;
      }
    }

    // Staff didn't reconnect, proceed with requeue
    await this.requeueSession(sessionId);
  }

  /**
   * Requeue session with priority boost
   */
  private async requeueSession(sessionId: string): Promise<void> {
    if (!this.recoverySettings!.auto_requeue_enabled) {
      console.log(`⏭️ Auto-requeue disabled, ending session ${sessionId}`);
      await this.endSession(sessionId, 'staff_unavailable');
      return;
    }

    console.log(`🔄 Requeuing session ${sessionId}`);

    const recovery = this.activeRecoveries.get(sessionId);
    if (!recovery) return;

    try {
      // Get current session data
      const sessionData = await this.getSessionFromDatabase(sessionId);
      if (!sessionData) return;

      // Calculate new priority
      let newPriority = sessionData.priority;
      if (!recovery.priorityBoosted && this.recoverySettings!.priority_boost_amount > 0) {
        newPriority = this.boostPriority(sessionData.priority, this.recoverySettings!.priority_boost_amount);
        recovery.priorityBoosted = true;
      }

      // Determine queue position
      let queuePosition: number;
      switch (this.recoverySettings!.requeue_position) {
        case 'front':
          queuePosition = 1;
          break;
        case 'priority_boost':
          queuePosition = this.calculatePriorityPosition(newPriority);
          break;
        case 'original':
          queuePosition = recovery.originalQueuePosition || 999;
          break;
        case 'end':
        default:
          queuePosition = 999;
          break;
      }

      // Update session in database
      await this.updateSessionForRequeue(sessionId, newPriority, queuePosition);

      // Add badge for abandoned/reconnected status
      const statusBadge = recovery.reconnectAttempts > 0 ? 'reconnected' : 'abandoned';

      // Notify guest
      this.io.to(`session_${sessionId}`).emit('session_requeued', {
        sessionId,
        newPriority,
        queuePosition,
        statusBadge,
        message: `You have been placed back in queue with ${newPriority} priority due to staff disconnect.`
      });

      // Notify staff
      this.io.to('public_staff').emit('session_requeued', {
        sessionId,
        guestInfo: sessionData.guestInfo,
        priority: newPriority,
        queuePosition,
        statusBadge,
        reason: 'staff_disconnect',
        originalStaffId: recovery.originalStaffId
      });

      // Check for escalation
      if (this.recoverySettings!.escalate_on_multiple_disconnects && 
          recovery.reconnectAttempts >= this.recoverySettings!.max_disconnects_before_escalation) {
        await this.escalateSession(sessionId);
      }

      // Update recovery data
      recovery.reconnectAttempts++;

      console.log(`✅ Session ${sessionId} requeued with ${newPriority} priority at position ${queuePosition}`);

    } catch (error) {
      console.error(`❌ Error requeuing session ${sessionId}:`, error);
      await this.endSession(sessionId, 'requeue_failed');
    }
  }

  /**
   * Boost session priority
   */
  private boostPriority(currentPriority: string, boostAmount: number): string {
    const priorities = ['normal', 'high', 'urgent', 'vip'];
    const currentIndex = priorities.indexOf(currentPriority);
    const newIndex = Math.min(currentIndex + boostAmount, priorities.length - 1);
    return priorities[newIndex];
  }

  /**
   * Calculate queue position based on priority
   */
  private calculatePriorityPosition(priority: string): number {
    // This would integrate with the actual queue system
    // For now, return a position based on priority
    const priorityPositions = {
      'vip': 1,
      'urgent': 2,
      'high': 5,
      'normal': 10
    };
    return priorityPositions[priority as keyof typeof priorityPositions] || 10;
  }

  /**
   * Escalate session to management
   */
  private async escalateSession(sessionId: string): Promise<void> {
    console.log(`⚡ Escalating session ${sessionId} due to multiple disconnects`);

    try {
      // Update session priority to escalation level
      await this.updateSessionPriority(sessionId, this.recoverySettings!.escalation_priority);

      // Create escalation ticket if auto-ticket creation is enabled
      await this.createEscalationTicket(sessionId);

      // Notify management/supervisors
      this.io.to('management').emit('session_escalated', {
        sessionId,
        reason: 'multiple_staff_disconnects',
        escalationPriority: this.recoverySettings!.escalation_priority,
        timestamp: new Date()
      });

      // Notify guest
      this.io.to(`session_${sessionId}`).emit('session_escalated', {
        sessionId,
        message: 'Your chat has been escalated to a supervisor due to technical issues.'
      });

    } catch (error) {
      console.error(`❌ Error escalating session ${sessionId}:`, error);
    }
  }

  /**
   * Attempt session reassignment to original staff
   */
  private async attemptSessionReassignment(sessionId: string, staffId: string): Promise<boolean> {
    console.log(`🔄 Attempting to reassign session ${sessionId} to original staff ${staffId}`);

    try {
      // Check if staff is available
      const isAvailable = await this.checkStaffAvailability(staffId);
      if (!isAvailable) {
        console.log(`⚠️ Staff ${staffId} not available for reassignment`);
        return false;
      }

      // Update session status
      await this.updateSessionStatus(sessionId, 'active');
      await this.updateSessionStaffAssignment(sessionId, staffId);

      // Remove from recovery
      this.activeRecoveries.delete(sessionId);

      // Notify all parties
      this.io.to(`session_${sessionId}`).emit('staff_reassigned', {
        sessionId,
        staffId,
        staffName: 'Support Agent', // Would come from database
        message: this.recoverySettings!.reassignment_message
      });

      this.io.to(`staff_${staffId}`).emit('session_reassigned', {
        sessionId,
        recoveredFromDisconnect: true
      });

      console.log(`✅ Successfully reassigned session ${sessionId} to staff ${staffId}`);
      return true;

    } catch (error) {
      console.error(`❌ Error reassigning session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkStaffHeartbeats();
    }, 15000); // Check every 15 seconds

    console.log('💓 Started staff heartbeat monitoring');
  }

  /**
   * Check staff heartbeats for disconnections
   */
  private checkStaffHeartbeats(): void {
    const now = new Date();
    const timeout = this.recoverySettings!.staff_disconnect_timeout * 1000;

    this.staffHeartbeats.forEach((lastSeen, staffId) => {
      const timeSinceLastSeen = now.getTime() - lastSeen.getTime();
      
      if (timeSinceLastSeen > timeout && !this.disconnectedStaff.has(staffId)) {
        // Staff appears to be disconnected
        this.handleStaffTimeoutDisconnection(staffId);
      }
    });
  }

  /**
   * Handle staff disconnection detected by timeout
   */
  private async handleStaffTimeoutDisconnection(staffId: string): Promise<void> {
    console.log(`⏰ Staff ${staffId} disconnected by timeout`);

    // Get active sessions for this staff
    const activeSessions = await this.getActiveSessionsForStaff(staffId);
    
    if (activeSessions.length > 0) {
      await this.handleStaffDisconnection(staffId, activeSessions, 'timeout');
    }
  }

  /**
   * Start recovery cleanup
   */
  private startRecoveryCleanup(): void {
    this.recoveryCleanupInterval = setInterval(() => {
      this.cleanupExpiredRecoveries();
    }, 60000); // Check every minute

    console.log('🧹 Started recovery cleanup monitoring');
  }

  /**
   * Clean up expired recovery records
   */
  private cleanupExpiredRecoveries(): void {
    const now = new Date();
    const expiredRecoveries: string[] = [];

    this.activeRecoveries.forEach((recovery, sessionId) => {
      const maxRecoveryTime = this.recoverySettings!.auto_reassign_after_seconds * 1000;
      const recoveryAge = now.getTime() - recovery.disconnectTime.getTime();

      if (recoveryAge > maxRecoveryTime) {
        expiredRecoveries.push(sessionId);
      }
    });

    // Process expired recoveries
    expiredRecoveries.forEach(sessionId => {
      console.log(`🧹 Cleaning up expired recovery for session ${sessionId}`);
      this.activeRecoveries.delete(sessionId);
      this.endSession(sessionId, 'recovery_expired');
    });
  }

  /**
   * End session with reason
   */
  private async endSession(sessionId: string, reason: string): Promise<void> {
    console.log(`🔚 Ending session ${sessionId} - reason: ${reason}`);

    try {
      // Update database
      await this.updateSessionStatus(sessionId, 'ended');
      await this.logSessionEnd(sessionId, reason);

      // Remove from recovery
      this.activeRecoveries.delete(sessionId);

      // Notify guest
      this.io.to(`session_${sessionId}`).emit('session_ended', {
        sessionId,
        reason,
        message: this.getEndSessionMessage(reason)
      });

      // Notify staff
      this.io.to('public_staff').emit('session_ended', {
        sessionId,
        reason
      });

    } catch (error) {
      console.error(`❌ Error ending session ${sessionId}:`, error);
    }
  }

  /**
   * Get appropriate message for session end reason
   */
  private getEndSessionMessage(reason: string): string {
    const messages = {
      'staff_unavailable': 'Chat ended due to staff unavailability. Please submit a ticket for continued assistance.',
      'requeue_failed': 'Technical issues prevented reconnection. Please start a new chat or submit a ticket.',
      'recovery_expired': 'Chat session expired. Please start a new conversation if you need assistance.',
      'abandoned': 'Chat session ended due to inactivity.'
    };

    return messages[reason as keyof typeof messages] || 'Chat session has ended.';
  }

  // Database helper methods (simplified signatures)
  private async getSessionFromDatabase(sessionId: string): Promise<any> {
    // Implementation would load session data from database
    return null;
  }

  private async updateSessionStatus(sessionId: string, status: string): Promise<void> {
    // Implementation would update session status in database
  }

  private async updateSessionForRequeue(sessionId: string, priority: string, position: number): Promise<void> {
    // Implementation would update session for requeue
  }

  private async updateSessionPriority(sessionId: string, priority: string): Promise<void> {
    // Implementation would update session priority
  }

  private async updateSessionStaffAssignment(sessionId: string, staffId: string): Promise<void> {
    // Implementation would update staff assignment
  }

  private async checkStaffAvailability(staffId: string): Promise<boolean> {
    // Implementation would check if staff is available
    return true;
  }

  private async getActiveSessionsForStaff(staffId: string): Promise<string[]> {
    // Implementation would get active sessions for staff
    return [];
  }

  private async logDisconnectEvent(event: StaffDisconnectEvent): Promise<void> {
    // Implementation would log disconnect event to database
  }

  private async logSessionEnd(sessionId: string, reason: string): Promise<void> {
    // Implementation would log session end to database
  }

  private async createEscalationTicket(sessionId: string): Promise<void> {
    // Implementation would create escalation ticket
  }

  /**
   * Cleanup when shutting down
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.recoveryCleanupInterval) {
      clearInterval(this.recoveryCleanupInterval);
      this.recoveryCleanupInterval = null;
    }

    console.log('🧹 Enhanced Session Recovery System cleaned up');
  }
}

export default EnhancedSessionRecovery;