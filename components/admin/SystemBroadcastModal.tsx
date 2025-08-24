"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogActions } from '@mui/material'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Send,
  X,
  Users,
  Clock,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SystemBroadcastModalProps {
  open: boolean
  onClose: () => void
  onBroadcastSent?: (messageId: string) => void
}

type BroadcastPriority = 'info' | 'warning' | 'critical'

export function SystemBroadcastModal({
  open,
  onClose,
  onBroadcastSent
}: SystemBroadcastModalProps) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<BroadcastPriority>('info')
  const [sending, setSending] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(0)

  // Load connected user count when modal opens
  React.useEffect(() => {
    if (open) {
      loadConnectedUsers()
    }
  }, [open])

  const loadConnectedUsers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/admin/chat/presence', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setConnectedUsers(data.onlineUsers || 0)
      }
    } catch (error) {
      console.error('Error loading connected users:', error)
    }
  }

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim() || sending) return

    setSending(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/admin/chat/broadcast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          priority
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send broadcast')
      }

      const data = await response.json()
      console.log('✅ System broadcast sent:', data)
      
      // Clear form
      setTitle('')
      setMessage('')
      setPriority('info')
      
      // Notify parent
      if (onBroadcastSent) {
        onBroadcastSent(data.messageId)
      }

      // Close modal
      onClose()

      // Show success message
      alert(`System broadcast sent to ${connectedUsers} online users!`)

    } catch (error) {
      console.error('❌ Error sending broadcast:', error)
      alert(`Failed to send broadcast: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const getPriorityConfig = () => {
    switch (priority) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Critical Alert',
          description: 'Urgent - requires immediate attention'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          label: 'Important Warning',
          description: 'Important notice for all users'
        }
      case 'info':
      default:
        return {
          icon: Info,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          label: 'Information',
          description: 'General announcement'
        }
    }
  }

  const config = getPriorityConfig()
  const IconComponent = config.icon

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center space-x-3">
        <Globe className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold">System Broadcast</h2>
          <p className="text-sm text-gray-500">Send message to all chat users</p>
        </div>
      </DialogTitle>

      <DialogContent className="space-y-6">
        {/* Connected Users Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">Connected Users</span>
          </div>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{connectedUsers} online</span>
          </Badge>
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Priority Level</label>
          <div className="grid grid-cols-3 gap-3">
            {(['info', 'warning', 'critical'] as BroadcastPriority[]).map((level) => {
              const levelConfig = level === 'critical' 
                ? { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Critical' }
                : level === 'warning'
                ? { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Warning' }
                : { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Info' }
              
              const LevelIcon = levelConfig.icon
              
              return (
                <button
                  key={level}
                  onClick={() => setPriority(level)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    priority === level 
                      ? `${levelConfig.border} ${levelConfig.bg}` 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <LevelIcon className={cn("h-5 w-5", priority === level ? levelConfig.color : "text-gray-400")} />
                    <span className={cn("text-sm font-medium", priority === level ? levelConfig.color : "text-gray-600")}>
                      {levelConfig.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Priority Preview */}
        <div className={cn("p-4 rounded-lg border", config.border, config.bg)}>
          <div className="flex items-center space-x-2 mb-2">
            <IconComponent className={cn("h-5 w-5", config.color)} />
            <span className={cn("font-medium", config.color)}>{config.label}</span>
          </div>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Broadcast Title</label>
          <Input
            placeholder="e.g., System Maintenance Notice"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <Textarea
            placeholder="Enter your system broadcast message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
        </div>

        {/* Preview */}
        {(title || message) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div className={cn("p-4 rounded-lg border", config.border, config.bg)}>
              <div className="flex items-start space-x-3">
                <IconComponent className={cn("h-5 w-5 mt-0.5", config.color)} />
                <div className="flex-1">
                  {title && (
                    <h4 className={cn("font-semibold mb-1", config.color)}>{title}</h4>
                  )}
                  {message && (
                    <p className="text-sm text-gray-700">{message}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>System • Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <DialogActions className="px-6 py-4 border-t">
        <Button variant="ghost" onClick={onClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={handleSendBroadcast}
          disabled={!title.trim() || !message.trim() || sending}
          className={cn(
            "flex items-center space-x-2",
            priority === 'critical' && "bg-red-600 hover:bg-red-700",
            priority === 'warning' && "bg-yellow-600 hover:bg-yellow-700",
            priority === 'info' && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Send Broadcast</span>
            </>
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}