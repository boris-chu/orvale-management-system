"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@mui/material'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  PhoneOff, 
  Video, 
  Monitor,
  Users,
  Hash,
  MessageCircle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface IncomingCallModalProps {
  call: IncomingCall | null
  open: boolean
  onAnswer: (sessionId: string) => void
  onDecline: (sessionId: string, reason?: string) => void
  socket?: any
}

export function IncomingCallModal({
  call,
  open,
  onAnswer,
  onDecline,
  socket
}: IncomingCallModalProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)

  // Timer for call duration
  useEffect(() => {
    if (!open || !call) {
      setTimeElapsed(0)
      return
    }

    const startTime = new Date(call.timestamp).getTime()
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setTimeElapsed(elapsed)
    }, 1000)

    return () => clearInterval(timer)
  }, [open, call])

  const handleAnswer = async () => {
    if (!call || isResponding) return

    setIsResponding(true)
    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Call API to accept the call
      const response = await fetch(`/api/chat/calls/${call.sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to answer call')
      }

      // Emit WebSocket event
      socket?.emit('call_accept', {
        sessionId: call.sessionId
      })

      console.log(`✅ Call answered: ${call.callType} call session ${call.sessionId}`)
      onAnswer(call.sessionId)

    } catch (error) {
      console.error('❌ Error answering call:', error)
      alert(`Failed to answer call: ${error.message}`)
    } finally {
      setIsResponding(false)
    }
  }

  const handleDecline = async (reason: string = 'declined') => {
    if (!call || isResponding) return

    setIsResponding(true)
    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Call API to decline the call
      const response = await fetch(`/api/chat/calls/${call.sessionId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to decline call')
      }

      // Emit WebSocket event
      socket?.emit('call_decline', {
        sessionId: call.sessionId,
        reason
      })

      console.log(`❌ Call declined: ${call.callType} call session ${call.sessionId}, reason: ${reason}`)
      onDecline(call.sessionId, reason)

    } catch (error) {
      console.error('❌ Error declining call:', error)
      alert(`Failed to decline call: ${error.message}`)
    } finally {
      setIsResponding(false)
    }
  }

  const getCallTypeIcon = () => {
    switch (call?.callType) {
      case 'video':
        return <Video className="h-8 w-8 text-green-500" />
      case 'screen_share':
        return <Monitor className="h-8 w-8 text-blue-500" />
      case 'audio':
      default:
        return <Phone className="h-8 w-8 text-green-500" />
    }
  }

  const getCallTypeLabel = () => {
    switch (call?.callType) {
      case 'video':
        return 'Video Call'
      case 'screen_share':
        return 'Screen Share'
      case 'audio':
      default:
        return 'Audio Call'
    }
  }

  const getChannelIcon = () => {
    if (call?.channelId) {
      return <Hash className="h-4 w-4 text-gray-500" />
    }
    return <MessageCircle className="h-4 w-4 text-gray-500" />
  }

  const getCallContext = () => {
    if (call?.channelId && call?.channelName) {
      return `in #${call.channelName}`
    }
    if (call?.participants && call.participants.length > 2) {
      return `with ${call.participants.length - 1} participants`
    }
    return 'direct call'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!call) return null

  return (
    <Dialog 
      open={open} 
      onClose={() => !isResponding && handleDecline('timeout')}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        className: "bg-gradient-to-b from-blue-50 to-white border-2 border-blue-200"
      }}
    >
      <DialogContent className="p-8 text-center">
        {/* Animated call icon */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            "p-4 rounded-full bg-green-100 animate-pulse",
            call.callType === 'video' && "bg-blue-100",
            call.callType === 'screen_share' && "bg-purple-100"
          )}>
            {getCallTypeIcon()}
          </div>
        </div>

        {/* Caller info */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Incoming {getCallTypeLabel()}
          </h2>
          
          {/* Caller avatar and name */}
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-semibold">
              {call.initiator.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">{call.initiator.display_name}</p>
              <p className="text-sm text-gray-600">@{call.initiator.username}</p>
            </div>
          </div>

          {/* Call context */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            {getChannelIcon()}
            <span>{getCallContext()}</span>
          </div>
        </div>

        {/* Call duration */}
        <div className="flex items-center justify-center space-x-2 mb-6 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Ringing for {formatTime(timeElapsed)}</span>
        </div>

        {/* Participant count for group calls */}
        {call.participants && call.participants.length > 2 && (
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{call.participants.length} participants</span>
            </Badge>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => handleDecline('declined')}
            disabled={isResponding}
            className="flex items-center space-x-2 px-8"
          >
            <PhoneOff className="h-5 w-5" />
            <span>Decline</span>
          </Button>

          <Button
            variant="default"
            size="lg"
            onClick={handleAnswer}
            disabled={isResponding}
            className="flex items-center space-x-2 px-8 bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-5 w-5" />
            <span>{isResponding ? 'Joining...' : 'Answer'}</span>
          </Button>
        </div>

        {/* Quick decline options */}
        <div className="mt-4 flex justify-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDecline('busy')}
            disabled={isResponding}
            className="text-xs"
          >
            I'm busy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDecline('unavailable')}
            disabled={isResponding}
            className="text-xs"
          >
            Unavailable
          </Button>
        </div>

        {/* Auto-decline warning */}
        <p className="mt-4 text-xs text-gray-500">
          Call will automatically decline after 60 seconds
        </p>
      </DialogContent>
    </Dialog>
  )
}