"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  MessageCircle, 
  X, 
  Maximize2, 
  Minimize2,
  Send,
  Settings,
  Users,
  Hash,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
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
  initialState?: {
    isExpanded?: boolean
    isCollapsed?: boolean
    selectedConversationId?: string | null
  }
  onStateChange?: (state: any) => void
}

export function ChatWidget({ isOpen, onToggle, onOpenFullChat, className, initialState, onStateChange }: ChatWidgetProps) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [isExpanded, setIsExpanded] = useState(initialState?.isExpanded || false)
  const [quickMessage, setQuickMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(initialState?.isCollapsed || false)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [safeSettings, setWidgetSettings] = useState({
    type: 'glassmorphism',
    primaryColor: '#3b82f6',
    secondaryColor: '#9333ea',
    size: 'normal',
    position: 'bottom-right',
    borderRadius: 16,
    enableGlassmorphism: true,
    enablePulseAnimation: true,
    enableSmoothTransitions: true,
    fontFamily: 'system',
    fontSize: 'normal',
    autoHide: false,
    soundNotifications: true,
    desktopNotifications: true,
    defaultState: 'closed',
    enableHoverEffects: true,
    enableShadows: true,
    animationSpeed: 'normal',
    fontWeight: 'normal',
    lineHeight: 'normal',
    edgeDistance: 16,
    zIndex: 50
  })

  const widgetRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Real-time messaging via RealTimeProvider
  const { 
    connectionStatus, 
    connectionMode,
    onMessage, 
    sendMessage: realTimeSendMessage 
  } = useRealTime()

  // Load widget settings from API
  const loadWidgetSettings = async () => {
    if (!user) return // Only load for authenticated users
    
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      console.log('🔄 ChatWidget: Loading widget settings from API...')
      const response = await fetch('/api/admin/chat/widget', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          console.log('🎨 ChatWidget: Loaded widget settings from API:', data.settings)
          setWidgetSettings(prev => {
            const newSettings = { ...prev, ...data.settings }
            console.log('🎨 ChatWidget: Applied widget settings:', newSettings)
            return newSettings
          })
        } else {
          console.log('🎨 ChatWidget: Using default widget settings')
        }
      } else {
        console.warn(`⚠️ ChatWidget: Failed to load widget settings: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ ChatWidget: Failed to load widget settings:', error)
    }
  }
  
  // Real-time settings updates - listen for widget settings changes
  useEffect(() => {
    if (!user) return

    // Set up periodic refresh of widget settings (every 30 seconds)
    const settingsRefreshInterval = setInterval(loadWidgetSettings, 30000)
    
    return () => clearInterval(settingsRefreshInterval)
  }, [user])

  // Load conversations when user is available
  // IMPORTANT: Load conversations immediately when user is authenticated for notification counting
  useEffect(() => {
    if (user) {
      console.log('👤 User authenticated, loading conversations for notifications')
      loadConversations()
      loadWidgetSettings() // Also load widget settings
    }
  }, [user]) // Removed isOpen dependency

  // Real-time message updates for conversation list
  // IMPORTANT: Always listen for messages regardless of widget open/closed state
  useEffect(() => {
    if (!user) return

    console.log('🔌 ChatWidget: Setting up RealTimeProvider message listener (always active)')
    
    const unsubscribe = onMessage((realTimeMessage) => {
      console.log('🔔 ChatWidget received real-time message:', realTimeMessage)
      
      if (realTimeMessage.type === 'message') {
        const messageData = realTimeMessage.content
        console.log('📧 Processing message data:', {
          messageData,
          currentUser: user.username,
          widgetOpen: isOpen
        })
        
        // Update conversation list with new message information
        if (messageData && messageData.channel_id) {
          console.log('📊 Updating conversations for channel:', messageData.channel_id)
          
          setConversations(prev => {
            console.log('📋 Current conversations before update:', prev.map(c => ({ id: c.id, unread: c.unread_count })))
            
            const updated = prev.map(conv => {
              if (conv.id === messageData.channel_id) {
                const isFromOther = messageData.user_id !== user.username
                const newUnreadCount = isFromOther ? (conv.unread_count || 0) + 1 : conv.unread_count
                
                console.log(`💬 Channel ${conv.id} update:`, {
                  from: messageData.user_id,
                  currentUser: user.username,
                  isFromOther,
                  oldUnread: conv.unread_count,
                  newUnread: newUnreadCount
                })
                
                return {
                  ...conv,
                  last_message: messageData.message_text,
                  last_message_at: new Date().toISOString(),
                  last_message_by: messageData.display_name,
                  unread_count: newUnreadCount
                }
              }
              return conv
            })
            
            console.log('📋 Conversations after update:', updated.map(c => ({ id: c.id, unread: c.unread_count })))
            return updated
          })
        } else {
          console.warn('⚠️ Message missing channel_id:', messageData)
        }
      }
    })

    return unsubscribe
  }, [user, onMessage]) // Removed isOpen dependency

  // Calculate total unread count
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
    console.log(`🔢 ChatWidget: Calculating total unread count: ${total}`, {
      conversations: conversations.map(c => ({ id: c.id, unread: c.unread_count }))
    })
    setTotalUnread(total)
  }, [conversations])

  // Sync state changes with parent component - debounced to prevent infinite loops
  const selectedConversationId = selectedConversation?.id || null
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onStateChange) {
        onStateChange({
          isExpanded,
          isCollapsed,
          selectedConversationId
        })
      }
    }, 100) // Small delay to batch updates

    return () => clearTimeout(timeoutId)
  }, [isExpanded, isCollapsed, selectedConversationId]) // Fixed dependency array size

  // Auto-select conversation from initial state
  useEffect(() => {
    if (initialState?.selectedConversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === initialState.selectedConversationId)
      if (conversation) {
        setSelectedConversation(conversation)
      }
    }
  }, [conversations, initialState?.selectedConversationId])

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

      // Combine and deduplicate by ID, then sort by recent activity
      const combinedConversations = [
        ...(channelsData.channels || []),
        ...(directData.conversations || [])
      ]
      
      // Deduplicate by ID to prevent duplicate keys
      const deduplicatedConversations = combinedConversations.reduce((acc, current) => {
        const existingIndex = acc.findIndex(item => item.id === current.id)
        if (existingIndex === -1) {
          acc.push(current)
        } else {
          // Keep the one with more recent activity
          const existingTime = new Date(acc[existingIndex].last_message_at || acc[existingIndex].updated_at || acc[existingIndex].created_at).getTime()
          const currentTime = new Date(current.last_message_at || current.updated_at || current.created_at).getTime()
          if (currentTime > existingTime) {
            acc[existingIndex] = current
          }
        }
        return acc
      }, [] as Conversation[])
      
      const allConversations = deduplicatedConversations.sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.updated_at || a.created_at).getTime()
        const bTime = new Date(b.last_message_at || b.updated_at || b.created_at).getTime()
        return bTime - aTime
      })

      setConversations(allConversations.slice(0, 10)) // Show only recent 10
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (channelId: string) => {
    if (!user || !channelId) return
    
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/chat/channels/${channelId}/messages?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const sendQuickMessage = async () => {
    if (!quickMessage.trim() || !selectedConversation || !user || sending) return

    setSending(true)
    console.log('📤 ChatWidget: Sending message via RealTimeProvider', {
      conversationId: selectedConversation.id,
      connectionMode,
      connectionStatus
    })

    try {
      // Use RealTimeProvider's sendMessage instead of direct API call
      const realTimeMessage = {
        type: 'message' as const,
        channel: selectedConversation.id,
        from: user.username,
        content: {
          message_text: quickMessage.trim(),
          message_type: 'text',
          user_id: user.username,
          display_name: user.display_name || user.username,
          channel_id: selectedConversation.id
        }
      }

      const success = await realTimeSendMessage(realTimeMessage)

      if (success) {
        console.log('✅ ChatWidget: Message sent successfully via RealTimeProvider')
        const messageText = quickMessage.trim()
        setQuickMessage('')
        
        // Add message to local messages state for immediate UI feedback
        const newMessage = {
          id: Date.now().toString(),
          message_text: messageText,
          user_id: user.username,
          display_name: user.display_name || user.username,
          created_at: new Date().toISOString(),
          channel_id: selectedConversation.id
        }
        setMessages(prev => [...prev, newMessage])
        
        // For immediate UI feedback in the widget, update the conversation's last message
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation.id 
            ? {
                ...conv,
                last_message: messageText,
                last_message_at: new Date().toISOString(),
                last_message_by: user.display_name || user.username
              }
            : conv
        ))
        
        // Scroll to bottom after sending message
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
        
        // If using polling mode, we might need API fallback for conversation refresh
        if (connectionMode === 'polling') {
          setTimeout(() => loadConversations(), 1000) // Refresh after a delay
        }
      } else {
        console.error('❌ ChatWidget: Failed to send message via RealTimeProvider')
      }
    } catch (error) {
      console.error('❌ ChatWidget: Error sending message via RealTimeProvider:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuickMessage()
    }
  }

  // Don't render if user doesn't have chat permissions
  if (!user?.permissions?.includes('chat.access_channels')) {
    return null
  }

  // Error boundary - render basic widget if there are issues with customization
  const renderBasicWidget = () => (
    <div className="fixed bottom-4 right-4 z-50 transition-all duration-300 w-16 h-16">
      <button 
        onClick={onToggle}
        className="w-full h-full rounded-full bg-blue-600 text-white shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>
    </div>
  )

  // Ensure we have valid widget settings with fallbacks
  const safeSettings = {
    size: widgetSettings.size || 'normal',
    position: widgetSettings.position || 'bottom-right',
    borderRadius: typeof widgetSettings.borderRadius === 'number' ? widgetSettings.borderRadius : 16,
    primaryColor: widgetSettings.primaryColor || '#3b82f6',
    secondaryColor: widgetSettings.secondaryColor || '#9333ea',
    edgeDistance: typeof widgetSettings.edgeDistance === 'number' ? widgetSettings.edgeDistance : 16,
    zIndex: typeof widgetSettings.zIndex === 'number' ? widgetSettings.zIndex : 50,
    animationSpeed: widgetSettings.animationSpeed || 'normal',
    enableGlassmorphism: widgetSettings.enableGlassmorphism !== false,
    enableShadows: widgetSettings.enableShadows !== false,
    enableHoverEffects: widgetSettings.enableHoverEffects !== false,
    enablePulseAnimation: widgetSettings.enablePulseAnimation !== false,
    enableSmoothTransitions: widgetSettings.enableSmoothTransitions !== false
  }

  // Dynamic positioning based on settings - using inline styles for precision
  const getPositionStyle = () => {
    const distance = safeSettings.edgeDistance
    switch (safeSettings.position) {
      case 'bottom-right':
        return { bottom: `${distance}px`, right: `${distance}px` }
      case 'bottom-left':
        return { bottom: `${distance}px`, left: `${distance}px` }
      case 'top-right':
        return { top: `${distance}px`, right: `${distance}px` }
      case 'top-left':
        return { top: `${distance}px`, left: `${distance}px` }
      default:
        return { bottom: '16px', right: '16px' }
    }
  }

  // Dynamic size classes based on settings  
  const sizeClasses = {
    compact: isOpen ? "w-72" : "w-12",
    normal: isOpen ? "w-80" : "w-16", 
    large: isOpen ? "w-96" : "w-20"
  }

  const heightClasses = {
    compact: isOpen && isExpanded ? "h-80" : isOpen && !isCollapsed ? "h-56" : isOpen && isCollapsed ? "h-10" : "h-12",
    normal: isOpen && isExpanded ? "h-96" : isOpen && !isCollapsed ? "h-64" : isOpen && isCollapsed ? "h-12" : "h-16",
    large: isOpen && isExpanded ? "h-[28rem]" : isOpen && !isCollapsed ? "h-72" : isOpen && isCollapsed ? "h-14" : "h-20"
  }

  // Animation duration based on settings
  const animationDuration = {
    slow: 'duration-600',
    normal: 'duration-300', 
    fast: 'duration-150',
    instant: 'duration-0'
  }

  // Try to render the dynamic widget, fall back to basic if there are errors
  try {
    return renderDynamicWidget()
  } catch (error) {
    console.error('❌ ChatWidget: Error rendering dynamic widget, falling back to basic:', error)
    return renderBasicWidget()
  }
  
  function renderDynamicWidget() {
    return (
      <div 
        ref={widgetRef}
      className={cn(
        "fixed transition-all",
        sizeClasses[safeSettings.size] || sizeClasses.normal,
        heightClasses[safeSettings.size] || heightClasses.normal,
        animationDuration[safeSettings.animationSpeed] || animationDuration.normal,
        className
      )}
      style={{
        zIndex: safeSettings.zIndex,
        ...getPositionStyle()
      }}
    >
      {!isOpen ? (
        // 🌟 COOL FLOATING BUTTON - Glassmorphism with pulse animation
        <div className="relative">
          {/* Pulse ring animation for notifications */}
          {totalUnread > 0 && safeSettings.enablePulseAnimation && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(to right, ${safeSettings.primaryColor}, ${safeSettings.secondaryColor})`
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
          
          {/* Main widget button with dynamic styling */}
          <motion.button
            onClick={onToggle}
            className={cn(
              "relative text-white transition-all group",
              // Size classes
              safeSettings.size === 'compact' ? 'w-12 h-12' : 
              safeSettings.size === 'large' ? 'w-20 h-20' : 'w-16 h-16',
              // Border radius
              safeSettings.borderRadius >= 32 ? 'rounded-full' : 
              safeSettings.borderRadius >= 16 ? 'rounded-2xl' : 
              safeSettings.borderRadius >= 12 ? 'rounded-xl' :
              safeSettings.borderRadius >= 8 ? 'rounded-lg' :
              safeSettings.borderRadius >= 4 ? 'rounded' : 'rounded-sm',
              // Shadow
              safeSettings.enableShadows ? 'shadow-2xl' : 'shadow-lg',
              // Glassmorphism
              safeSettings.enableGlassmorphism ? 'backdrop-blur-sm border border-white/20' : '',
              // Animation duration
              animationDuration[safeSettings.animationSpeed] || 'duration-300'
            )}
            whileHover={safeSettings.enableHoverEffects ? { 
              scale: 1.1,
              boxShadow: `0 20px 40px -12px ${safeSettings.primaryColor}80`
            } : {}}
            whileTap={{ scale: 0.95 }}
            style={{
              background: `linear-gradient(135deg, ${safeSettings.primaryColor}${safeSettings.enableGlassmorphism ? 'E6' : ''} 0%, ${safeSettings.secondaryColor}${safeSettings.enableGlassmorphism ? 'E6' : ''} 50%, ${safeSettings.primaryColor}${safeSettings.enableGlassmorphism ? 'E6' : ''} 100%)`,
              ...(safeSettings.enableGlassmorphism ? {
                backdropFilter: 'blur(16px)',
                boxShadow: `0 8px 32px 0 ${safeSettings.primaryColor}37, inset 0 1px 0 rgba(255, 255, 255, 0.3)`
              } : {}),
              ...(safeSettings.enableShadows ? {
                boxShadow: `0 8px 32px 0 ${safeSettings.primaryColor}37`
              } : {})
            }}
          >
            <MessageCircle className={cn(
              "mx-auto transition-transform duration-200",
              safeSettings.size === 'compact' ? 'h-4 w-4' : 
              safeSettings.size === 'large' ? 'h-8 w-8' : 'h-6 w-6',
              safeSettings.enableHoverEffects ? 'group-hover:scale-110' : ''
            )} />
            
            {/* Notification badge with glow */}
            {totalUnread > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2"
              >
                <div className="relative">
                  {/* Glow effect behind badge */}
                  <div className="absolute inset-0 rounded-full bg-red-500 blur-sm animate-pulse" />
                  <Badge 
                    variant="destructive" 
                    className="relative text-xs px-2 py-0.5 h-6 min-w-6 bg-red-500 border-2 border-white shadow-lg font-bold"
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                </div>
              </motion.div>
            )}
          </motion.button>
        </div>
      ) : (
        // Expanded widget with dynamic styling
        <motion.div
          initial={safeSettings.enableSmoothTransitions ? { opacity: 0, scale: 0.8 } : {}}
          animate={safeSettings.enableSmoothTransitions ? { opacity: 1, scale: 1 } : {}}
          transition={safeSettings.enableSmoothTransitions ? { 
            duration: safeSettings.animationSpeed === 'slow' ? 0.6 : 
                     safeSettings.animationSpeed === 'fast' ? 0.15 :
                     safeSettings.animationSpeed === 'instant' ? 0 : 0.3 
          } : {}}
          className={cn(
            "border",
            safeSettings.borderRadius >= 32 ? 'rounded-full' : 
            safeSettings.borderRadius >= 16 ? 'rounded-2xl' : 
            safeSettings.borderRadius >= 12 ? 'rounded-xl' :
            safeSettings.borderRadius >= 8 ? 'rounded-lg' :
            safeSettings.borderRadius >= 4 ? 'rounded' : 'rounded-sm',
            safeSettings.enableShadows ? 'shadow-2xl' : 'shadow-lg',
            safeSettings.enableGlassmorphism ? 'bg-white/90 backdrop-blur-xl border-white/20' : 'bg-white border-gray-200'
          )}
          style={{
            fontFamily: safeSettings.fontFamily === 'system' ? 'system-ui, -apple-system, sans-serif' :
                       safeSettings.fontFamily === 'inter' ? 'Inter, sans-serif' :
                       safeSettings.fontFamily === 'roboto' ? 'Roboto, sans-serif' :
                       safeSettings.fontFamily === 'poppins' ? 'Poppins, sans-serif' :
                       safeSettings.fontFamily === 'helvetica' ? 'Helvetica, Arial, sans-serif' :
                       safeSettings.fontFamily === 'arial' ? 'Arial, sans-serif' : 'system-ui, sans-serif',
            fontSize: safeSettings.fontSize === 'xs' ? '10px' :
                     safeSettings.fontSize === 'small' ? '12px' :
                     safeSettings.fontSize === 'large' ? '16px' :
                     safeSettings.fontSize === 'xl' ? '18px' : '14px',
            fontWeight: safeSettings.fontWeight === 'light' ? '300' :
                       safeSettings.fontWeight === 'medium' ? '500' :
                       safeSettings.fontWeight === 'semibold' ? '600' :
                       safeSettings.fontWeight === 'bold' ? '700' : '400',
            lineHeight: safeSettings.lineHeight === 'tight' ? '1.25' :
                       safeSettings.lineHeight === 'relaxed' ? '1.75' :
                       safeSettings.lineHeight === 'loose' ? '2.0' : '1.5',
            ...(safeSettings.enableGlassmorphism ? {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            } : {
              background: 'white',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            })
          }}
        >
          {/* Header with dynamic gradient */}
          <div 
            className={cn(
              "flex items-center justify-between p-3 border-b border-white/20 backdrop-blur-sm",
              safeSettings.borderRadius >= 16 ? 'rounded-t-2xl' : 
              safeSettings.borderRadius >= 12 ? 'rounded-t-xl' :
              safeSettings.borderRadius >= 8 ? 'rounded-t-lg' :
              safeSettings.borderRadius >= 4 ? 'rounded-t' : 'rounded-t-sm'
            )}
            style={{
              background: safeSettings.enableGlassmorphism ? 
                `linear-gradient(to right, ${safeSettings.primaryColor}0F, ${safeSettings.secondaryColor}0F)` :
                `linear-gradient(to right, ${safeSettings.primaryColor}08, ${safeSettings.secondaryColor}08)`
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="relative">
                <MessageCircle 
                  className="h-4 w-4" 
                  style={{ color: safeSettings.primaryColor }}
                />
                {totalUnread > 0 && safeSettings.enablePulseAnimation && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span 
                className="font-medium text-sm bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(to right, ${safeSettings.primaryColor}, ${safeSettings.secondaryColor})`
                }}
              >
                Chat
              </span>
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
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-6 w-6 p-0"
                title={isCollapsed ? "Expand widget" : "Collapse widget"}
              >
                {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
                title={isExpanded ? "Normal size" : "Expand"}
                disabled={isCollapsed}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
              </Button>
              
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

          {/* Content */}
          {!isCollapsed && (
            <div className="flex flex-col h-full">
              {/* Conversations List */}
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  {loading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-xs text-gray-600">Loading...</p>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-xs">No recent conversations</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenFullChat}
                        className="mt-2 text-xs"
                      >
                        Start chatting
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            setSelectedConversation(conversation)
                            loadMessages(conversation.id)
                          }}
                          className={cn(
                            "w-full text-left p-2 rounded hover:bg-gray-50 transition-colors",
                            selectedConversation?.id === conversation.id && "bg-blue-50",
                            conversation.unread_count > 0 && "bg-blue-25"
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            {/* Icon or Avatar */}
                            {conversation.type === 'direct' && conversation.participants?.length > 0 ? (
                              conversation.participants.length === 1 ? (
                                <UserAvatar
                                  user={conversation.participants[0]}
                                  size="sm"
                                  showPresenceStatus={true}
                                  presenceStatus={conversation.participants[0].presence_status || 'offline'}
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded flex items-center justify-center">
                                  <Users className="h-3 w-3 text-white" />
                                </div>
                              )
                            ) : (
                              <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                                <Hash className="h-3 w-3 text-gray-500" />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-xs font-medium truncate",
                                  conversation.unread_count > 0 && "font-semibold"
                                )}>
                                  {conversation.type === 'direct' 
                                    ? (conversation.participants?.length > 0 
                                        ? (conversation.participants.length === 1 
                                            ? conversation.participants[0]?.display_name 
                                            : conversation.participants?.map(p => p?.display_name).filter(Boolean).join(', ')
                                          ) || conversation.name
                                        : conversation.name || 'Direct Message')
                                    : conversation.name
                                  }
                                </span>
                                {conversation.unread_count > 0 && (
                                  <Badge variant="destructive" className="text-xs px-1 py-0 h-3 min-w-3">
                                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                  </Badge>
                                )}
                              </div>
                              
                              {conversation.last_message && (
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-500 truncate">
                                    {conversation.last_message_by && conversation.last_message_by !== user.display_name && (
                                      <span className="font-medium">{conversation.last_message_by}: </span>
                                    )}
                                    {conversation.last_message}
                                  </p>
                                  {conversation.last_message_at && (
                                    <span className="text-xs text-gray-400 ml-1 flex-shrink-0">
                                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

          {/* Mini Message View - Show recent messages when conversation is selected */}
          {selectedConversation && !isCollapsed && (
            <>
              <Separator />
              <div className="flex-1 min-h-0 max-h-32">
                <ScrollArea className="h-full">
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                      <span>Recent messages</span>
                      {loadingMessages && <Loader2 className="h-3 w-3 animate-spin" />}
                    </div>
                    {messages.length === 0 && !loadingMessages ? (
                      <div className="text-xs text-gray-400 text-center py-2">
                        No messages yet
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.slice(-5).map((message, index) => ( // Show only last 5 messages
                          <div key={message.id || index} className="text-xs">
                            <div className="flex items-start space-x-1">
                              <span className="font-medium text-blue-600 min-w-0 truncate">
                                {message.display_name || message.user_id}:
                              </span>
                              <span className="text-gray-700 min-w-0 flex-1">
                                {message.message_text}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Quick Message Input - Show when expanded AND conversation is selected */}
          {isExpanded && selectedConversation && (
            <>
              <Separator />
              <div className="p-2">
                <div className="text-xs text-gray-600 mb-2 truncate">
                  Message {selectedConversation.type === 'direct' 
                    ? (selectedConversation.participants?.length > 0 
                        ? selectedConversation.participants.map(p => p.display_name).join(', ')
                        : selectedConversation.name || 'Direct Message')
                    : selectedConversation.name}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="text-xs h-8"
                    disabled={sending}
                  />
                  <Button
                    onClick={sendQuickMessage}
                    disabled={!quickMessage.trim() || sending}
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {sending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Alternative Message Input - Show when normal size and conversation selected */}
          {!isExpanded && !isCollapsed && selectedConversation && (
            <>
              <Separator />
              <div className="p-2">
                <div className="text-xs text-gray-600 mb-1 truncate">
                  {selectedConversation.type === 'direct' 
                    ? (selectedConversation.participants?.length > 0 
                        ? selectedConversation.participants.map(p => p.display_name).join(', ')
                        : selectedConversation.name || 'Direct Message')
                    : selectedConversation.name}
                </div>
                <div className="flex space-x-1">
                  <Input
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message..."
                    className="text-xs h-6"
                    disabled={sending}
                  />
                  <Button
                    onClick={sendQuickMessage}
                    disabled={!quickMessage.trim() || sending}
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    {sending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-2.5 w-2.5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Footer with dynamic styling */}
          <div 
            className={cn(
              "p-2 border-t border-white/20 backdrop-blur-sm",
              safeSettings.borderRadius >= 16 ? 'rounded-b-2xl' : 
              safeSettings.borderRadius >= 12 ? 'rounded-b-xl' :
              safeSettings.borderRadius >= 8 ? 'rounded-b-lg' :
              safeSettings.borderRadius >= 4 ? 'rounded-b' : 'rounded-b-sm'
            )}
            style={{
              background: `linear-gradient(to right, ${safeSettings.primaryColor}08, ${safeSettings.secondaryColor}08)`
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFullChat}
              className={cn(
                "w-full text-xs h-6 border border-white/30 backdrop-blur-sm transition-all",
                safeSettings.borderRadius >= 12 ? 'rounded-xl' :
                safeSettings.borderRadius >= 8 ? 'rounded-lg' :
                safeSettings.borderRadius >= 4 ? 'rounded' : 'rounded-sm',
                animationDuration[safeSettings.animationSpeed] || 'duration-200'
              )}
              style={{
                background: `linear-gradient(to right, ${safeSettings.primaryColor}1A, ${safeSettings.secondaryColor}1A)`,
                ...(safeSettings.enableHoverEffects ? {
                  '&:hover': {
                    background: `linear-gradient(to right, ${safeSettings.primaryColor}33, ${safeSettings.secondaryColor}33)`
                  }
                } : {})
              }}
            >
              <span 
                className="bg-clip-text text-transparent font-medium"
                style={{
                  backgroundImage: `linear-gradient(to right, ${safeSettings.primaryColor}, ${safeSettings.secondaryColor})`
                }}
              >
                Open full chat
              </span>
            </Button>
          </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
    )
  }
}