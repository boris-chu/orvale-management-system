"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageCircle, 
  X, 
  Maximize2,
  Send,
  Hash,
  ChevronDown,
  Loader2,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
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

export function ChatWidget({ isOpen, onToggle, onOpenFullChat, className }: ChatWidgetProps) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  
  // Widget customization state
  const [widgetSettings, setWidgetSettings] = useState({
    type: 'glassmorphism',
    primaryColor: '#3b82f6',
    secondaryColor: '#9333ea',
    size: 'normal',
    position: 'bottom-right',
    shape: 'circle',
    borderRadius: 16,
    enableGlassmorphism: true,
    enablePulseAnimation: true,
    enableHoverEffects: true,
    edgeDistance: 16
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

  // State for full widget functionality
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [quickMessage, setQuickMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages for selected conversation
  const loadMessages = async (conversation: Conversation) => {
    if (!user || !conversation) return
    
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      const endpoint = conversation.type === 'direct' 
        ? `/api/chat/direct/${conversation.id}/messages`
        : `/api/chat/channels/${conversation.id}/messages`
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    loadMessages(conversation)
  }

  // Send message
  const handleSendMessage = async () => {
    if (!quickMessage.trim() || !selectedConversation || !user) return
    
    setSending(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      const endpoint = selectedConversation.type === 'direct'
        ? `/api/chat/direct/${selectedConversation.id}/messages`
        : `/api/chat/channels/${selectedConversation.id}/messages`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_text: quickMessage })
      })

      if (response.ok) {
        setQuickMessage('')
        // Reload messages to show the new one
        loadMessages(selectedConversation)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Don't render if user doesn't have chat permissions
  if (!user?.permissions?.includes('chat.access_channels')) {
    return null
  }

  // Dynamic positioning based on settings
  const getPositionStyle = () => {
    const distance = widgetSettings.edgeDistance || 16
    switch (widgetSettings.position) {
      case 'bottom-right': return { bottom: `${distance}px`, right: `${distance}px` }
      case 'bottom-left': return { bottom: `${distance}px`, left: `${distance}px` }
      case 'top-right': return { top: `${distance}px`, right: `${distance}px` }
      case 'top-left': return { top: `${distance}px`, left: `${distance}px` }
      default: return { bottom: '16px', right: '16px' }
    }
  }

  // Size classes for button
  const sizeClass = widgetSettings.size === 'compact' ? 'w-12 h-12' : 
                    widgetSettings.size === 'large' ? 'w-20 h-20' : 'w-16 h-16'
  
  // Widget type specific styles
  const getWidgetStyle = () => {
    switch (widgetSettings.type) {
      case 'minimal':
        return {
          button: 'bg-white border-2 shadow-lg',
          buttonHover: 'hover:shadow-xl',
          iconColor: widgetSettings.primaryColor,
          panel: 'bg-white border shadow-lg',
          header: 'bg-gray-50 border-b'
        }
      case 'gradient':
        return {
          button: `bg-gradient-to-br shadow-xl`,
          buttonHover: 'hover:shadow-2xl hover:scale-110',
          iconColor: 'white',
          panel: 'bg-white border shadow-2xl',
          header: `bg-gradient-to-r text-white`
        }
      case 'neumorphic':
        return {
          button: 'bg-gray-100 shadow-[9px_9px_16px_#bebebe,-9px_-9px_16px_#ffffff]',
          buttonHover: 'hover:shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]',
          iconColor: widgetSettings.primaryColor,
          panel: 'bg-gray-100 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]',
          header: 'bg-gray-100 border-b border-gray-200'
        }
      case 'corporate':
        return {
          button: 'bg-indigo-600 shadow-lg',
          buttonHover: 'hover:bg-indigo-700 hover:shadow-xl',
          iconColor: 'white',
          panel: 'bg-white border border-gray-200 shadow-xl',
          header: 'bg-indigo-600 text-white'
        }
      case 'gaming':
        return {
          button: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse',
          buttonHover: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.7)]',
          iconColor: 'white',
          panel: 'bg-gray-900 border border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]',
          header: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
        }
      case 'retro':
        return {
          button: 'bg-yellow-300 border-4 border-yellow-800 shadow-[4px_4px_0px_rgba(0,0,0,1)]',
          buttonHover: 'hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
          iconColor: 'black',
          panel: 'bg-yellow-100 border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)]',
          header: 'bg-yellow-400 border-b-4 border-black text-black font-mono'
        }
      case 'glassmorphism':
      default:
        return {
          button: 'backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl',
          buttonHover: 'hover:bg-white/20 hover:shadow-2xl',
          iconColor: 'white',
          panel: 'backdrop-blur-xl bg-white/95 border border-white/20 shadow-2xl',
          header: 'backdrop-blur-xl bg-white/10 border-b border-white/20'
        }
    }
  }

  const widgetStyle = getWidgetStyle()

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
                background: widgetSettings.type === 'gradient' || widgetSettings.type === 'gaming' 
                  ? `linear-gradient(to right, ${widgetSettings.primaryColor}, ${widgetSettings.secondaryColor})`
                  : widgetSettings.primaryColor
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
              "relative transition-all group",
              sizeClass,
              widgetStyle.button,
              widgetStyle.buttonHover,
              // Shape classes
              widgetSettings.shape === 'circle' ? 'rounded-full' :
              widgetSettings.shape === 'square' ? 'rounded-none' :
              widgetSettings.shape === 'rounded-square' ? 'rounded-lg' :
              widgetSettings.shape === 'rounded-lg' ? 'rounded-2xl' :
              widgetSettings.shape === 'pill' ? 'rounded-full px-6' :
              widgetSettings.shape === 'hexagon' ? 'rounded-full' : 'rounded-full'
            )}
            whileHover={widgetSettings.enableHoverEffects ? { scale: 1.1 } : {}}
            whileTap={{ scale: 0.95 }}
            style={{
              ...(widgetSettings.type === 'gradient' || widgetSettings.type === 'gaming' ? {
                background: `linear-gradient(135deg, ${widgetSettings.primaryColor} 0%, ${widgetSettings.secondaryColor} 50%, ${widgetSettings.primaryColor} 100%)`
              } : widgetSettings.type === 'minimal' || widgetSettings.type === 'neumorphic' ? {} : {
                backgroundColor: widgetSettings.primaryColor
              }),
              borderColor: widgetSettings.type === 'minimal' ? widgetSettings.primaryColor : undefined,
              // Hexagon shape using clip-path
              ...(widgetSettings.shape === 'hexagon' ? {
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              } : {})
            }}
          >
            <MessageCircle className="h-6 w-6 mx-auto" style={{ color: widgetStyle.iconColor }} />
            
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
        // Expanded widget with full functionality
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "w-96 h-[500px] flex flex-col",
            widgetStyle.panel,
            widgetSettings.borderRadius === 4 ? 'rounded' :
            widgetSettings.borderRadius === 8 ? 'rounded-lg' :
            widgetSettings.borderRadius === 12 ? 'rounded-xl' :
            widgetSettings.borderRadius === 16 ? 'rounded-2xl' :
            widgetSettings.borderRadius === 24 ? 'rounded-3xl' : 'rounded-2xl'
          )}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between p-3",
            widgetStyle.header,
            widgetSettings.borderRadius === 4 ? 'rounded-t' :
            widgetSettings.borderRadius === 8 ? 'rounded-t-lg' :
            widgetSettings.borderRadius === 12 ? 'rounded-t-xl' :
            widgetSettings.borderRadius === 16 ? 'rounded-t-2xl' :
            widgetSettings.borderRadius === 24 ? 'rounded-t-3xl' : 'rounded-t-2xl'
          )}
          style={{
            ...(widgetSettings.type === 'gradient' || widgetSettings.type === 'gaming' ? {
              background: `linear-gradient(to right, ${widgetSettings.primaryColor}, ${widgetSettings.secondaryColor})`
            } : widgetSettings.type === 'corporate' ? {
              backgroundColor: widgetSettings.primaryColor
            } : {})
          }}>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">
                {selectedConversation ? selectedConversation.name : 'Conversations'}
              </span>
              {totalUnread > 0 && !selectedConversation && (
                <Badge variant="destructive" className="text-xs">
                  {totalUnread}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {selectedConversation && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="h-8 w-8 p-0 hover:bg-white/20"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenFullChat}
                className="h-8 w-8 p-0 hover:bg-white/20"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-8 w-8 p-0 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!selectedConversation ? (
              // Conversation list
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                    <MessageCircle className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No conversations yet</p>
                    <Button
                      size="sm"
                      variant="link"
                      onClick={onOpenFullChat}
                      className="mt-2"
                    >
                      Start a new chat
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative">
                            {conv.type === 'direct' && conv.participants?.[0] ? (
                              <UserAvatar 
                                user={conv.participants[0]} 
                                size="sm" 
                              />
                            ) : conv.type === 'direct' ? (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-5 w-5 text-gray-500" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Hash className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            {conv.unread_count > 0 && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">
                                {conv.name}
                              </p>
                              {conv.last_message_at && (
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            {conv.last_message && (
                              <p className="text-xs text-gray-600 truncate mt-1">
                                {conv.last_message_by && (
                                  <span className="font-medium">
                                    {conv.last_message_by === user?.username ? 'You' : conv.last_message_by}:
                                  </span>
                                )}{' '}
                                {conv.last_message}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : (
              // Message view
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.user_id === user?.username ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-3 py-2",
                              msg.user_id === user?.username
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 text-gray-900"
                            )}
                          >
                            <p className="text-sm break-words">{msg.message_text}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                {/* Message input */}
                <div className="p-3 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendMessage()
                    }}
                    className="flex space-x-2"
                  >
                    <Input
                      value={quickMessage}
                      onChange={(e) => setQuickMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!quickMessage.trim() || sending}
                      style={{ backgroundColor: widgetSettings.primaryColor }}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}