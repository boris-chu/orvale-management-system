/**
 * useCallManager - Global call state management hook
 * 
 * Features:
 * - Manages incoming/outgoing calls across the application
 * - Handles call notifications and ringtones
 * - Integrates with Socket.io signaling
 * - Tracks call history and statistics
 * - Manages multiple call sessions
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { socketClient } from '@/lib/socket-client';

export interface CallSession {
  callId: string;
  type: 'audio' | 'video';
  status: 'connecting' | 'ringing' | 'connected' | 'ended';
  isIncoming: boolean;
  participants: {
    caller: {
      username: string;
      display_name: string;
      profile_picture?: string;
    };
    receiver: {
      username: string;
      display_name: string;
      profile_picture?: string;
    };
  };
  startedAt?: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration?: number;
  offer?: RTCSessionDescriptionInit;
  quality?: 'excellent' | 'good' | 'poor' | 'unstable';
}

export interface IncomingCallNotification {
  callId: string;
  caller: {
    username: string;
    display_name: string;
    profile_picture?: string;
  };
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
}

interface UseCallManagerOptions {
  currentUser: {
    username: string;
    display_name: string;
    profile_picture?: string;
  };
  enableNotifications?: boolean;
  enableRingtones?: boolean;
}

export const useCallManager = ({
  currentUser,
  enableNotifications = true,
  enableRingtones = true
}: UseCallManagerOptions) => {
  const [activeCalls, setActiveCalls] = useState<Map<string, CallSession>>(new Map());
  const [incomingCall, setIncomingCall] = useState<IncomingCallNotification | null>(null);
  const [callHistory, setCallHistory] = useState<CallSession[]>([]);
  const [isCallUIOpen, setIsCallUIOpen] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    if (enableRingtones) {
      // Create ringtone audio elements
      ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.7;
      
      notificationSoundRef.current = new Audio('/sounds/mixkit-happy-bells-notification-937.wav');
      notificationSoundRef.current.volume = 0.5;
    }
    
    return () => {
      // Cleanup audio elements
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.src = '';
      }
      if (notificationSoundRef.current) {
        notificationSoundRef.current.pause();
        notificationSoundRef.current.src = '';
      }
    };
  }, [enableRingtones]);

  // Play ringtone
  const playRingtone = useCallback(() => {
    if (enableRingtones && ringtoneRef.current) {
      ringtoneRef.current.play().catch(console.error);
    }
  }, [enableRingtones]);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (enableRingtones && notificationSoundRef.current) {
      notificationSoundRef.current.play().catch(console.error);
    }
  }, [enableRingtones]);

  // Show browser notification
  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, icon });
          }
        });
      }
    }
  }, [enableNotifications]);

  // Start outgoing call
  const startCall = useCallback((
    targetUser: { username: string; display_name: string; profile_picture?: string },
    callType: 'audio' | 'video'
  ) => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const callSession: CallSession = {
      callId,
      type: callType,
      status: 'connecting',
      isIncoming: false,
      participants: {
        caller: currentUser,
        receiver: targetUser
      },
      startedAt: new Date()
    };
    
    setActiveCalls(prev => new Map(prev).set(callId, callSession));
    setCurrentCallId(callId);
    setIsCallUIOpen(true);
    
    // Play dialing sound
    playNotificationSound();
    
    return callId;
  }, [currentUser, playNotificationSound]);

  // Handle incoming call
  const handleIncomingCall = useCallback((callData: IncomingCallNotification) => {
    console.log('📞 Incoming call from:', callData.caller.display_name);
    
    setIncomingCall(callData);
    
    // Create call session
    const callSession: CallSession = {
      callId: callData.callId,
      type: callData.callType,
      status: 'ringing',
      isIncoming: true,
      participants: {
        caller: callData.caller,
        receiver: currentUser
      },
      startedAt: new Date(),
      offer: callData.offer
    };
    
    setActiveCalls(prev => new Map(prev).set(callData.callId, callSession));
    
    // Play ringtone
    playRingtone();
    
    // Show browser notification
    showNotification(
      `Incoming ${callData.callType} call`,
      `${callData.caller.display_name} is calling you`,
      callData.caller.profile_picture
    );
    
    // Auto-reject after 30 seconds
    setTimeout(() => {
      if (incomingCall?.callId === callData.callId) {
        rejectCall(callData.callId, 'timeout');
      }
    }, 30000);
  }, [currentUser, incomingCall, playRingtone, showNotification]);

  // Accept incoming call
  const acceptCall = useCallback((callId: string) => {
    console.log('✅ Accepting call:', callId);
    
    stopRingtone();
    setIncomingCall(null);
    setCurrentCallId(callId);
    setIsCallUIOpen(true);
    
    // Update call session status
    setActiveCalls(prev => {
      const updated = new Map(prev);
      const call = updated.get(callId);
      if (call) {
        updated.set(callId, {
          ...call,
          status: 'connecting',
          connectedAt: new Date()
        });
      }
      return updated;
    });
  }, [stopRingtone]);

  // Reject incoming call
  const rejectCall = useCallback((callId: string, reason: string = 'user_rejected') => {
    console.log('❌ Rejecting call:', callId, 'Reason:', reason);
    
    stopRingtone();
    setIncomingCall(null);
    
    // Update call session status
    setActiveCalls(prev => {
      const updated = new Map(prev);
      const call = updated.get(callId);
      if (call) {
        const endedCall = {
          ...call,
          status: 'ended' as const,
          endedAt: new Date()
        };
        
        // Move to history
        setCallHistory(history => [...history, endedCall]);
        
        // Remove from active calls
        updated.delete(callId);
      }
      return updated;
    });
    
    // Notify other party
    socketClient.emit('call:reject', {
      targetUserId: activeCalls.get(callId)?.participants.caller.username,
      callId,
      reason
    });
  }, [stopRingtone, activeCalls]);

  // End active call
  const endCall = useCallback((callId: string) => {
    console.log('📴 Ending call:', callId);
    
    stopRingtone();
    setIsCallUIOpen(false);
    setCurrentCallId(null);
    
    // Update call session status
    setActiveCalls(prev => {
      const updated = new Map(prev);
      const call = updated.get(callId);
      if (call) {
        const duration = call.connectedAt 
          ? Math.floor((Date.now() - call.connectedAt.getTime()) / 1000)
          : 0;
          
        const endedCall = {
          ...call,
          status: 'ended' as const,
          endedAt: new Date(),
          duration
        };
        
        // Move to history
        setCallHistory(history => [...history, endedCall]);
        
        // Remove from active calls
        updated.delete(callId);
      }
      return updated;
    });
  }, [stopRingtone]);

  // Update call status
  const updateCallStatus = useCallback((callId: string, status: CallSession['status'], quality?: CallSession['quality']) => {
    setActiveCalls(prev => {
      const updated = new Map(prev);
      const call = updated.get(callId);
      if (call) {
        updated.set(callId, {
          ...call,
          status,
          ...(quality && { quality }),
          ...(status === 'connected' && !call.connectedAt && { connectedAt: new Date() })
        });
      }
      return updated;
    });
  }, []);

  // Close call UI
  const closeCallUI = useCallback(() => {
    setIsCallUIOpen(false);
    setCurrentCallId(null);
  }, []);

  // Socket.io event listeners
  useEffect(() => {
    const componentId = `call_manager_${currentUser.username}`;
    
    // Incoming call
    socketClient.addEventListener(componentId, 'call:incoming', (data) => {
      handleIncomingCall({
        callId: data.callId,
        caller: data.caller,
        callType: data.callType,
        offer: data.offer
      });
    });
    
    // Call answered
    socketClient.addEventListener(componentId, 'call:answered', (data) => {
      updateCallStatus(data.callId, 'connected');
      playNotificationSound();
    });
    
    // Call rejected
    socketClient.addEventListener(componentId, 'call:rejected', (data) => {
      updateCallStatus(data.callId, 'ended');
      stopRingtone();
      
      showNotification(
        'Call rejected',
        `${data.caller?.display_name || 'User'} rejected your call`
      );
    });
    
    // Call ended
    socketClient.addEventListener(componentId, 'call:ended', (data) => {
      endCall(data.callId);
    });
    
    // User disconnected during call
    socketClient.addEventListener(componentId, 'user:disconnected', (data) => {
      // Check if disconnected user is in any active call
      activeCalls.forEach((call, callId) => {
        if (call.participants.caller.username === data.userId || 
            call.participants.receiver.username === data.userId) {
          endCall(callId);
          showNotification(
            'Call ended',
            'The other participant disconnected'
          );
        }
      });
    });
    
    return () => {
      socketClient.removeEventListeners(componentId);
    };
  }, [currentUser.username, activeCalls, handleIncomingCall, updateCallStatus, endCall, playNotificationSound, stopRingtone, showNotification]);

  // Get current active call
  const getCurrentCall = useCallback(() => {
    return currentCallId ? activeCalls.get(currentCallId) : null;
  }, [currentCallId, activeCalls]);

  // Get call history
  const getCallHistory = useCallback((limit?: number) => {
    return limit ? callHistory.slice(-limit) : callHistory;
  }, [callHistory]);

  // Check if user can make calls (based on permissions)
  const canMakeCalls = useCallback((callType: 'audio' | 'video') => {
    // This would check user permissions from context
    // For now, assume all users can make audio calls, video requires permission
    return callType === 'audio' ? true : true; // Implement actual permission check
  }, []);

  return {
    // State
    activeCalls: Array.from(activeCalls.values()),
    incomingCall,
    isCallUIOpen,
    currentCall: getCurrentCall(),
    callHistory: getCallHistory(),
    
    // Actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    closeCallUI,
    updateCallStatus,
    
    // Utils
    canMakeCalls,
    getCallHistory: (limit?: number) => getCallHistory(limit),
    
    // Audio controls
    playRingtone,
    stopRingtone,
    playNotificationSound
  };
};

export default useCallManager;