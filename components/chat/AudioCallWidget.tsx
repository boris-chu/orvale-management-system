"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Users,
  Settings,
  Minimize2,
  Maximize2,
  Signal,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CallParticipant {
  user_id: string
  display_name: string
  joined_at?: string
  connection_quality?: 'excellent' | 'good' | 'poor' | 'disconnected'
}

interface AudioCallWidgetProps {
  sessionId: string
  callType: 'audio' | 'video' | 'screen_share'
  participants: CallParticipant[]
  isInitiator?: boolean
  onEndCall: () => void
  onToggleMute?: (muted: boolean) => void
  onVolumeChange?: (volume: number) => void
  socket?: any
  className?: string
}

export function AudioCallWidget({
  sessionId,
  callType,
  participants,
  isInitiator = false,
  onEndCall,
  onToggleMute,
  onVolumeChange,
  socket,
  className
}: AudioCallWidgetProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [callDuration, setCallDuration] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('excellent')
  const [isEnding, setIsEnding] = useState(false)

  // WebRTC peer connections ref
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Initialize WebRTC audio stream
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
            bitrate: 32000
          }
        })

        localStreamRef.current = stream

        // Set up peer connections for each participant
        participants.forEach(participant => {
          if (participant.user_id !== socket?.userId) {
            setupPeerConnection(participant.user_id, stream)
          }
        })

        console.log('🎤 Audio stream initialized for call:', sessionId)
      } catch (error) {
        console.error('❌ Error accessing audio:', error)
        alert('Could not access microphone. Please check permissions.')
      }
    }

    initializeAudio()

    return () => {
      // Cleanup on unmount
      localStreamRef.current?.getTracks().forEach(track => track.stop())
      peerConnectionsRef.current.forEach(pc => pc.close())
      audioElementsRef.current.forEach(audio => audio.remove())
    }
  }, [])

  // WebSocket event listeners for WebRTC signaling
  useEffect(() => {
    if (!socket) return

    const handleWebRTCOffer = async (data: any) => {
      if (data.sessionId === sessionId) {
        await handleOffer(data.fromUser, data.offer)
      }
    }

    const handleWebRTCAnswer = async (data: any) => {
      if (data.sessionId === sessionId) {
        await handleAnswer(data.fromUser, data.answer)
      }
    }

    const handleWebRTCIceCandidate = async (data: any) => {
      if (data.sessionId === sessionId) {
        await handleIceCandidate(data.fromUser, data.candidate)
      }
    }

    socket.on('webrtc_offer_received', handleWebRTCOffer)
    socket.on('webrtc_answer_received', handleWebRTCAnswer)
    socket.on('webrtc_ice_candidate_received', handleWebRTCIceCandidate)

    return () => {
      socket.off('webrtc_offer_received', handleWebRTCOffer)
      socket.off('webrtc_answer_received', handleWebRTCAnswer)
      socket.off('webrtc_ice_candidate_received', handleWebRTCIceCandidate)
    }
  }, [socket, sessionId])

  const setupPeerConnection = async (userId: string, localStream: MediaStream) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })

    // Add local stream to peer connection
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream)
    })

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      playRemoteAudio(userId, remoteStream)
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc_ice_candidate', {
          sessionId,
          candidate: event.candidate,
          targetUser: userId
        })
      }
    }

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      console.log(`🔗 Connection to ${userId}: ${state}`)
      
      if (state === 'connected') {
        setConnectionQuality('excellent')
      } else if (state === 'connecting') {
        setConnectionQuality('good')
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionQuality('poor')
      }
    }

    peerConnectionsRef.current.set(userId, peerConnection)

    // Create and send offer if we're the initiator
    if (isInitiator) {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      
      socket?.emit('webrtc_offer', {
        sessionId,
        offer,
        targetUser: userId
      })
    }
  }

  const handleOffer = async (fromUser: string, offer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnectionsRef.current.get(fromUser)
    if (!peerConnection) return

    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    socket?.emit('webrtc_answer', {
      sessionId,
      answer,
      targetUser: fromUser
    })
  }

  const handleAnswer = async (fromUser: string, answer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnectionsRef.current.get(fromUser)
    if (!peerConnection) return

    await peerConnection.setRemoteDescription(answer)
  }

  const handleIceCandidate = async (fromUser: string, candidate: RTCIceCandidateInit) => {
    const peerConnection = peerConnectionsRef.current.get(fromUser)
    if (!peerConnection) return

    await peerConnection.addIceCandidate(candidate)
  }

  const playRemoteAudio = (userId: string, stream: MediaStream) => {
    let audioElement = audioElementsRef.current.get(userId)
    
    if (!audioElement) {
      audioElement = document.createElement('audio')
      audioElement.autoplay = true
      audioElement.volume = volume / 100
      document.body.appendChild(audioElement)
      audioElementsRef.current.set(userId, audioElement)
    }

    audioElement.srcObject = stream
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMuted
      })
      
      setIsMuted(!isMuted)
      onToggleMute?.(!isMuted)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    onVolumeChange?.(newVolume)
    
    // Update all remote audio elements
    audioElementsRef.current.forEach(audio => {
      audio.volume = newVolume / 100
    })
  }

  const handleEndCall = async () => {
    if (isEnding) return

    setIsEnding(true)
    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      
      const response = await fetch(`/api/chat/calls/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: 'completed' })
      })

      if (response.ok) {
        socket?.emit('call_end', {
          sessionId,
          reason: 'completed'
        })
      }

    } catch (error) {
      console.error('❌ Error ending call:', error)
    }

    onEndCall()
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Signal className="h-4 w-4 text-green-500" />
      case 'good':
        return <Signal className="h-4 w-4 text-yellow-500" />
      case 'poor':
        return <Signal className="h-4 w-4 text-red-500" />
      default:
        return <Signal className="h-4 w-4 text-gray-400" />
    }
  }

  const activeParticipants = participants.filter(p => p.joined_at)

  if (isMinimized) {
    return (
      <Card className={cn("fixed bottom-4 right-4 w-80 z-50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">{formatDuration(callDuration)}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {activeParticipants.length} participants
              </Badge>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEndCall}
                disabled={isEnding}
                className="h-8 w-8 p-0"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("fixed bottom-4 right-4 w-96 z-50", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Phone className="h-5 w-5 text-green-500" />
            <span className="font-semibold">Audio Call</span>
            {getConnectionIcon()}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Call duration */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center space-x-2 text-lg font-mono">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(callDuration)}</span>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className="w-full flex items-center justify-between p-2"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{activeParticipants.length} participants</span>
            </div>
            {showParticipants ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {showParticipants && (
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {activeParticipants.map((participant) => (
                <div key={participant.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      {participant.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{participant.display_name}</span>
                  </div>
                  <Badge 
                    variant={participant.connection_quality === 'excellent' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {participant.connection_quality || 'connected'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          {/* Mute button */}
          <Button
            variant={isMuted ? "default" : "outline"}
            size="lg"
            onClick={toggleMute}
            className={cn(
              "h-12 w-12 p-0",
              isMuted && "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* End call button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            disabled={isEnding}
            className="h-12 px-6"
          >
            {isEnding ? (
              <>Ending...</>
            ) : (
              <>
                <PhoneOff className="h-5 w-5 mr-2" />
                End Call
              </>
            )}
          </Button>

          {/* Volume button */}
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-12 p-0"
          >
            {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center space-x-2">
          <VolumeX className="h-4 w-4" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <Volume2 className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )
}