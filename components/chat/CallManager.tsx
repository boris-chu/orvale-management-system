"use client"

import React, { useState, useEffect, useRef } from 'react'
import { IncomingCallModal } from './IncomingCallModal'
import { AudioCallWidget } from './AudioCallWidget'
import { useRealTime } from '@/lib/realtime/RealTimeProvider'

interface IncomingCall {
  sessionId: string
  callType: 'audio' | 'video' | 'screen_share'
  channelId?: string
  channelName?: string
  initiator: {
    username: string
    display_name: string
    profile_picture?: string
  }
  participants?: string[]
  timestamp: string
}

interface ActiveCall {
  sessionId: string
  callType: 'audio' | 'video' | 'screen_share'
  participants: any[]
  isInitiator: boolean
  startedAt: string
}

interface CallManagerProps {
  currentUser?: {
    username: string
    display_name: string
  }
}

export function CallManager({ currentUser }: CallManagerProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [showIncomingModal, setShowIncomingModal] = useState(false)
  const autoDeclineTimerRef = useRef<NodeJS.Timeout>()
  
  const { socket } = useRealTime()

  // Handle incoming call events
  useEffect(() => {
    if (!socket || !currentUser) return

    const handleIncomingCall = (data: any) => {
      console.log('📞 Incoming call received:', data)
      
      // Don't show incoming call if we're already in a call
      if (activeCall) {
        console.log('❌ Rejecting incoming call - already in call')
        socket.emit('call_decline', {
          sessionId: data.sessionId,
          reason: 'busy'
        })
        return
      }

      const call: IncomingCall = {
        sessionId: data.sessionId,
        callType: data.callType,
        channelId: data.channelId,
        channelName: data.channelName,
        initiator: data.initiator,
        participants: data.participants,
        timestamp: data.timestamp
      }

      setIncomingCall(call)
      setShowIncomingModal(true)

      // Auto-decline after 60 seconds
      autoDeclineTimerRef.current = setTimeout(() => {
        console.log('⏰ Auto-declining call after timeout')
        handleDeclineCall(call.sessionId, 'timeout')
      }, 60000)
    }

    const handleCallAccepted = (data: any) => {
      console.log('✅ Call accepted by participant:', data.participant.display_name)
      // Update UI or show notification that someone joined
    }

    const handleCallDeclined = (data: any) => {
      console.log('❌ Call declined by participant:', data.participant.display_name, 'reason:', data.reason)
      // Update UI or show notification that someone declined
    }

    const handleCallEnded = (data: any) => {
      console.log('🔚 Call ended:', data)
      
      // Clear active call
      setActiveCall(null)
      
      // Clear incoming call if it matches
      if (incomingCall && incomingCall.sessionId === data.sessionId) {
        setIncomingCall(null)
        setShowIncomingModal(false)
      }
    }

    const handleCallParticipantJoined = (data: any) => {
      console.log('👥 Participant joined call:', data.participant.display_name)
      
      // Update active call participants
      if (activeCall && activeCall.sessionId === data.sessionId) {
        setActiveCall(prev => prev ? {
          ...prev,
          participants: [...prev.participants, data.participant]
        } : null)
      }
    }

    const handleCallParticipantLeft = (data: any) => {
      console.log('👥 Participant left call:', data.participant.display_name)
      
      // Update active call participants
      if (activeCall && activeCall.sessionId === data.sessionId) {
        setActiveCall(prev => prev ? {
          ...prev,
          participants: prev.participants.filter(p => p.user_id !== data.participant.username)
        } : null)
      }
    }

    const handleCallInitiated = (data: any) => {
      console.log('🎬 Call initiated by current user:', data)
      
      // Start AudioCallWidget for the initiator
      const call: ActiveCall = {
        sessionId: data.sessionId,
        callType: data.callType,
        participants: data.participants || [],
        isInitiator: true,
        startedAt: new Date().toISOString()
      }

      setActiveCall(call)
    }

    // Register event listeners
    socket.on('incoming_call', handleIncomingCall)
    socket.on('call_accepted', handleCallAccepted)
    socket.on('call_declined', handleCallDeclined)
    socket.on('call_ended', handleCallEnded)
    socket.on('call_participant_joined', handleCallParticipantJoined)
    socket.on('call_participant_left', handleCallParticipantLeft)
    socket.on('call_initiated_success', handleCallInitiated)

    return () => {
      socket.off('incoming_call', handleIncomingCall)
      socket.off('call_accepted', handleCallAccepted)
      socket.off('call_declined', handleCallDeclined)
      socket.off('call_ended', handleCallEnded)
      socket.off('call_participant_joined', handleCallParticipantJoined)
      socket.off('call_participant_left', handleCallParticipantLeft)
      socket.off('call_initiated_success', handleCallInitiated)
      
      // Clear auto-decline timer
      if (autoDeclineTimerRef.current) {
        clearTimeout(autoDeclineTimerRef.current)
      }
    }
  }, [socket, currentUser, activeCall, incomingCall])

  const handleAnswerCall = async (sessionId: string) => {
    if (!incomingCall) return

    try {
      // Clear auto-decline timer
      if (autoDeclineTimerRef.current) {
        clearTimeout(autoDeclineTimerRef.current)
      }

      // Get call participants from API
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      
      const response = await fetch(`/api/chat/calls/${sessionId}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Set up active call
        const call: ActiveCall = {
          sessionId,
          callType: incomingCall.callType,
          participants: data.participants || [],
          isInitiator: false,
          startedAt: new Date().toISOString()
        }

        setActiveCall(call)
        setIncomingCall(null)
        setShowIncomingModal(false)

        // Join the call room for WebRTC signaling
        socket?.emit('join_call', { sessionId })

      } else {
        console.error('❌ Failed to get call status')
        alert('Failed to join call')
      }

    } catch (error) {
      console.error('❌ Error answering call:', error)
      alert('Failed to join call')
    }
  }

  const handleDeclineCall = async (sessionId: string, reason: string = 'declined') => {
    // Clear auto-decline timer
    if (autoDeclineTimerRef.current) {
      clearTimeout(autoDeclineTimerRef.current)
    }

    setIncomingCall(null)
    setShowIncomingModal(false)
  }

  const handleEndCall = async () => {
    if (!activeCall) return

    try {
      // Leave call room
      socket?.emit('leave_call', { sessionId: activeCall.sessionId })
      
      // Clear active call
      setActiveCall(null)

    } catch (error) {
      console.error('❌ Error ending call:', error)
    }
  }

  // Handle browser tab/window close - end active calls
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeCall) {
        socket?.emit('leave_call', { sessionId: activeCall.sessionId })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [activeCall, socket])

  return (
    <>
      {/* Incoming Call Modal */}
      <IncomingCallModal
        call={incomingCall}
        open={showIncomingModal}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
        socket={socket}
      />

      {/* Active Call Widget */}
      {activeCall && (
        <AudioCallWidget
          sessionId={activeCall.sessionId}
          callType={activeCall.callType}
          participants={activeCall.participants}
          isInitiator={activeCall.isInitiator}
          onEndCall={handleEndCall}
          socket={socket}
        />
      )}
    </>
  )
}