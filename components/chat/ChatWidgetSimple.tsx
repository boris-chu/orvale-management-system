"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  X, 
  Maximize2,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useRealTime } from '@/lib/realtime/RealTimeProvider'

interface Conversation {
  id: string
  name: string
  type: 'public' | 'private' | 'direct'
  unread_count: number
  last_message?: string
  last_message_at?: string
  last_message_by?: string
  participants?: any[]
}

interface ChatWidgetProps {
  isOpen: boolean
  onToggle: () => void
  onOpenFullChat: () => void
  className?: string
}

export function ChatWidgetSimple({ isOpen, onToggle, onOpenFullChat, className }: ChatWidgetProps) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  
  // Widget customization state
  const [widgetSettings, setWidgetSettings] = useState({
    primaryColor: '#3b82f6',
    secondaryColor: '#9333ea',
    size: 'normal',
    position: 'bottom-right',
    enableGlassmorphism: true,
    enablePulseAnimation: true
  })

  const widgetRef = useRef<HTMLDivElement>(null)

  // Real-time messaging via RealTimeProvider
  const { 
    connectionStatus, 
    connectionMode,
    onMessage
  } = useRealTime()

  // Load widget settings from API
  const loadWidgetSettings = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      console.log('🎨 ChatWidget: Loading widget settings from API...')
      const response = await fetch('/api/admin/chat/widget', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          console.log('🎨 ChatWidget: Loaded widget settings:', data.settings)
          setWidgetSettings(prev => ({
            ...prev,
            ...data.settings
          }))
        }
      }
    } catch (error) {
      console.error('❌ ChatWidget: Failed to load widget settings:', error)
    }
  }

  // Load conversations
  const loadConversations = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      if (!token) return

      // Load both channels and direct messages
      const [channelsResponse, directResponse] = await Promise.all([
        fetch('/api/chat/channels', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/chat/direct', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const channelsData = channelsResponse.ok ? await channelsResponse.json() : { channels: [] }
      const directData = directResponse.ok ? await directResponse.json() : { conversations: [] }

      const allConversations = [
        ...(channelsData.channels || []),
        ...(directData.conversations || [])
      ].sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.updated_at || a.created_at).getTime()
        const bTime = new Date(b.last_message_at || b.updated_at || b.created_at).getTime()
        return bTime - aTime
      })

      setConversations(allConversations.slice(0, 10))
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load conversations when user is available
  useEffect(() => {
    if (user) {
      loadConversations()
      loadWidgetSettings()
    }
  }, [user])

  // Calculate total unread count
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
    setTotalUnread(total)
  }, [conversations])

  // Periodic settings refresh
  useEffect(() => {
    if (!user) return

    const settingsRefreshInterval = setInterval(loadWidgetSettings, 30000)
    return () => clearInterval(settingsRefreshInterval)
  }, [user])

  // Don't render if user doesn't have chat permissions
  if (!user?.permissions?.includes('chat.access_channels')) {
    return null
  }

  // Dynamic positioning based on settings
  const getPositionStyle = () => {
    const distance = 16
    switch (widgetSettings.position) {
      case 'bottom-right': return { bottom: `${distance}px`, right: `${distance}px` }
      case 'bottom-left': return { bottom: `${distance}px`, left: `${distance}px` }
      case 'top-right': return { top: `${distance}px`, right: `${distance}px` }
      case 'top-left': return { top: `${distance}px`, left: `${distance}px` }
      default: return { bottom: '16px', right: '16px' }
    }
  }

  // Size classes
  const sizeClass = widgetSettings.size === 'compact' ? 'w-12 h-12' : 
                    widgetSettings.size === 'large' ? 'w-20 h-20' : 'w-16 h-16'

  return (
    <div 
      ref={widgetRef}
      className={cn("fixed z-50 transition-all duration-300", className)}
      style={getPositionStyle()}
    >
      {!isOpen ? (
        // Floating Button with Dynamic Styling
        <div className="relative">
          {/* Pulse ring animation for notifications */}
          {totalUnread > 0 && widgetSettings.enablePulseAnimation && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(to right, ${widgetSettings.primaryColor}, ${widgetSettings.secondaryColor})`
              }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          {/* Main button */}
          <motion.button
            onClick={onToggle}
            className={cn(
              "relative text-white transition-all group rounded-full shadow-xl",
              sizeClass
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: `linear-gradient(135deg, ${widgetSettings.primaryColor} 0%, ${widgetSettings.secondaryColor} 50%, ${widgetSettings.primaryColor} 100%)`,
              ...(widgetSettings.enableGlassmorphism ? {
                backdropFilter: 'blur(16px)',
                boxShadow: `0 8px 32px 0 ${widgetSettings.primaryColor}37, inset 0 1px 0 rgba(255, 255, 255, 0.3)`
              } : {})
            }}
          >
            <MessageCircle className="h-6 w-6 mx-auto" />
            
            {/* Notification badge */}
            {totalUnread > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2"
              >
                <Badge variant="destructive" className="text-xs px-2 py-0.5 h-6 min-w-6 bg-red-500 border-2 border-white shadow-lg font-bold">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </Badge>
              </motion.div>
            )}
          </motion.button>
        </div>
      ) : (
        // Expanded widget - simple version for now
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-80 h-64"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/20 rounded-t-2xl"
               style={{ background: `linear-gradient(to right, ${widgetSettings.primaryColor}08, ${widgetSettings.secondaryColor}08)` }}>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" style={{ color: widgetSettings.primaryColor }} />
              <span className="font-medium text-sm" style={{ color: widgetSettings.primaryColor }}>Chat</span>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-xs px-2 py-0 h-4 bg-red-500">
                  {totalUnread}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenFullChat}
                className="h-6 w-6 p-0"
                title="Open full chat"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-6 w-6 p-0"
                title="Close chat"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Content - simple message */}
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Chat widget is working!</p>
              <p className="text-xs text-gray-400 mt-1">Settings applied: {widgetSettings.primaryColor}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-white/20 rounded-b-2xl"
               style={{ background: `linear-gradient(to right, ${widgetSettings.primaryColor}08, ${widgetSettings.secondaryColor}08)` }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFullChat}
              className="w-full text-xs h-6 rounded-xl"
              style={{ 
                background: `linear-gradient(to right, ${widgetSettings.primaryColor}1A, ${widgetSettings.secondaryColor}1A)`,
                color: widgetSettings.primaryColor
              }}
            >
              Open full chat
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}