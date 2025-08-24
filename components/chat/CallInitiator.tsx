"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  PhoneCall, 
  Video, 
  Monitor,
  Users,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CallInitiatorProps {
  channelId?: string
  targetUsers?: string[]
  onCallInitiated?: (sessionId: string, callType: string) => void
  socket?: any
  variant?: 'button' | 'icon' | 'menu'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CallInitiator({
  channelId,
  targetUsers = [],
  onCallInitiated,
  socket,
  variant = 'button',
  size = 'md',
  className
}: CallInitiatorProps) {
  const [isInitiating, setIsInitiating] = useState(false)
  const [showCallOptions, setShowCallOptions] = useState(false)

  const initiateCall = async (callType: 'audio' | 'video' | 'screen_share') => {
    if (!socket || isInitiating) return

    setIsInitiating(true)
    setShowCallOptions(false)

    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Call the API to create the call session
      const response = await fetch('/api/chat/calls/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelId: channelId || null,
          targetUsers: channelId ? [] : targetUsers,
          callType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate call')
      }

      const data = await response.json()
      const { callSession, participants } = data

      console.log(`📞 Call initiated: ${callType} call, session ${callSession.id}`)

      // Emit WebSocket event to notify participants
      socket.emit('call_initiate', {
        channelId: channelId || null,
        callType,
        targetUsers: channelId ? [] : targetUsers,
        sessionId: callSession.id
      })

      // Notify parent component
      if (onCallInitiated) {
        onCallInitiated(callSession.id, callType)
      }

    } catch (error) {
      console.error('❌ Error initiating call:', error)
      alert(`Failed to initiate ${callType} call: ${error.message}`)
    } finally {
      setIsInitiating(false)
    }
  }

  const getParticipantCount = () => {
    if (channelId) {
      return '?' // Channel member count would need to be passed as prop
    }
    return targetUsers.length + 1 // +1 for current user
  }

  const getCallTarget = () => {
    if (channelId) {
      return 'channel'
    }
    return targetUsers.length === 1 ? 'direct' : 'group'
  }

  // Icon-only variant for compact spaces
  if (variant === 'icon') {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0",
            className
          )}
          onClick={() => setShowCallOptions(!showCallOptions)}
          disabled={isInitiating}
        >
          {isInitiating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
        </Button>

        {showCallOptions && (
          <div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-2 space-y-1 z-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => initiateCall('audio')}
            >
              <Phone className="h-4 w-4 mr-2" />
              Audio Call
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => initiateCall('video')}
            >
              <Video className="h-4 w-4 mr-2" />
              Video Call
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Menu variant for dropdown menus
  if (variant === 'menu') {
    return (
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => initiateCall('audio')}
          disabled={isInitiating}
        >
          <Phone className="h-4 w-4 mr-2" />
          {isInitiating ? 'Starting...' : 'Start Audio Call'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => initiateCall('video')}
          disabled={isInitiating}
        >
          <Video className="h-4 w-4 mr-2" />
          {isInitiating ? 'Starting...' : 'Start Video Call'}
        </Button>
      </div>
    )
  }

  // Full button variant (default)
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="outline"
        size={size}
        onClick={() => initiateCall('audio')}
        disabled={isInitiating}
        className="flex items-center space-x-2"
      >
        {isInitiating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        <span>
          {isInitiating ? 'Starting...' : 'Audio Call'}
        </span>
        {getCallTarget() === 'group' && (
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            <span className="text-xs">{getParticipantCount()}</span>
          </div>
        )}
      </Button>

      <Button
        variant="outline"
        size={size}
        onClick={() => initiateCall('video')}
        disabled={isInitiating}
        className="flex items-center space-x-2"
      >
        {isInitiating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
        <span>
          {isInitiating ? 'Starting...' : 'Video Call'}
        </span>
        {getCallTarget() === 'group' && (
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-1" />
            <span className="text-xs">{getParticipantCount()}</span>
          </div>
        )}
      </Button>
    </div>
  )
}