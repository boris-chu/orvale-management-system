"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { Button } from '@/components/ui/button'
// import { ScrollArea } from '@/components/ui/scroll-area' // Using native scroll instead
import { Badge } from '@/components/ui/badge'
import { 
  Hash, 
  Lock, 
  MessageCircle, 
  Users, 
  Settings,
  ArrowDown,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  user_id: string
  display_name: string
  profile_picture?: string
  message_text: string
  message_type: 'text' | 'file' | 'gif' | 'system'
  file_attachment?: {
    type: string
    url: string
    preview_url?: string
    title?: string
    attribution?: string
  }
  reply_to_id?: string
  reply_to_text?: string
  reply_to_display_name?: string
  ticket_reference?: string
  reactions: Array<{
    emoji: string
    count: number
    users: Array<{ user_id: string; display_name: string }>
  }>
  created_at: string
  updated_at?: string
  edited?: boolean
  deleted?: boolean
}

interface Channel {
  id: string
  name: string
  type: 'public' | 'private' | 'direct'
  description?: string
  unread_count: number
  member_count: number
  participants?: any[]
}

interface User {
  username: string
  display_name: string
  profile_picture?: string
  permissions?: string[]
}

interface TypingUser {
  user_id: string
  display_name: string
  profile_picture?: string
}

interface MessageAreaProps {
  channel: Channel
  currentUser: User
  onChannelUpdate: () => void
}

export function MessageArea({ channel, currentUser, onChannelUpdate }: MessageAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)

  // Utility function to get clean auth token
  const getCleanToken = () => {
    const rawToken1 = localStorage.getItem('authToken')
    const rawToken2 = localStorage.getItem('token')
    
    console.log('🔍 Token retrieval debug:', {
      authToken: rawToken1?.substring(0, 20) + '...',
      token: rawToken2?.substring(0, 20) + '...',
      authTokenLength: rawToken1?.length,
      tokenLength: rawToken2?.length
    })
    
    let token = rawToken1 || rawToken2
    if (token) {
      token = token.trim().replace(/[\[\]"']/g, '')
      console.log('🔍 Cleaned token:', {
        length: token.length,
        preview: token.substring(0, 20) + '...',
        isValidJWT: token.split('.').length === 3
      })
    } else {
      console.log('❌ No token found in localStorage')
    }
    return token
  }

  // Request notification permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === 'granted')
      return permission === 'granted'
    }
    return false
  }

  // Show browser notification
  const showNotification = (message: Message) => {
    if (!notificationsEnabled || message.user_id === currentUser.username) return
    
    // Don't show if page is visible and user is active
    if (document.visibilityState === 'visible' && shouldAutoScroll()) return

    const notification = new Notification(`New message from ${message.display_name}`, {
      body: message.message_type === 'text' ? message.message_text : `Sent a ${message.message_type}`,
      icon: message.profile_picture || '/default-avatar.png',
      tag: `chat-${channel.id}`,
      renotify: true
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000)
  }

  // Play notification sound
  const playNotificationSound = () => {
    try {
      console.log('🔊 Attempting to play notification sound')
      // Try to use Web Audio API directly (more reliable than loading MP3)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Create a pleasant notification tone (two beeps)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      
      // Second beep
      setTimeout(() => {
        try {
          const oscillator2 = audioContext.createOscillator()
          const gainNode2 = audioContext.createGain()
          
          oscillator2.connect(gainNode2)
          gainNode2.connect(audioContext.destination)
          
          oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime)
          gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
          
          oscillator2.start(audioContext.currentTime)
          oscillator2.stop(audioContext.currentTime + 0.1)
          console.log('✅ Notification sound played successfully')
        } catch (e) {
          console.log('⚠️ Second beep failed:', e)
        }
      }, 150)
      
    } catch (error) {
      console.log('❌ Could not play notification sound:', error)
    }
  }

  // Server-Sent Events for real-time updates
  useEffect(() => {
    console.log('🔌 Setting up SSE connection for real-time updates')
    
    const token = getCleanToken()
    if (!token || !channel?.id) return

    // Close existing SSE connection
    if (eventSource) {
      eventSource.close()
    }

    // Create new SSE connection (without lastMessageId to prevent reconnection loops)
    const sseUrl = `/api/chat/channels/${channel.id}/stream?token=${encodeURIComponent(token)}`
    const newEventSource = new EventSource(sseUrl)
    
    newEventSource.onopen = () => {
      console.log('✅ SSE connection established')
    }

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connected':
            console.log('🔗 SSE connected to channel:', data.channelId)
            break
            
          case 'messages':
            if (data.messages && data.messages.length > 0) {
              console.log('📥 New messages via SSE:', data.messages.length)
              
              setMessages(prev => {
                // Filter out duplicates
                const existingIds = new Set(prev.map(m => m.id))
                const newMessages = data.messages
                  .filter((m: Message) => !existingIds.has(m.id))
                  .map((m: Message) => ({ ...m, _isNew: true }))
                
                if (newMessages.length > 0) {
                  // Update last message ID for future SSE requests
                  setLastMessageId(newMessages[newMessages.length - 1].id)
                  
                  // Show notifications for new messages from other users (only once)
                  newMessages.forEach((message: Message) => {
                    if (message.user_id !== currentUser.username) {
                      const messageAge = Date.now() - new Date(message.created_at).getTime()
                      // Only show notification for recent messages (within 10 seconds)
                      if (messageAge < 10000) {
                        console.log('🔔 Showing notification for SSE message:', message.message_text)
                        showNotification(message)
                        playNotificationSound()
                      }
                    }
                  })
                  
                  // onChannelUpdate() // Disabled - causes sidebar to reload and disappear
                  
                  // Auto-scroll if user is near bottom
                  setTimeout(() => {
                    if (shouldAutoScroll()) {
                      scrollToBottom()
                    }
                  }, 100)
                  
                  return [...prev, ...newMessages]
                }
                return prev
              })
            }
            break
            
          case 'heartbeat':
            // Connection is alive, no action needed
            break
            
          case 'error':
            console.error('❌ SSE error:', data.error)
            break
        }
        
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error)
      }
    }

    newEventSource.onerror = (error) => {
      console.error('❌ SSE connection error:', error)
      // Reconnection is automatic with SSE
    }

    setEventSource(newEventSource)

    return () => {
      newEventSource.close()
    }
  }, [channel.id, currentUser.username])

  // Alternative real-time approach using Server-Sent Events (if needed later)
  // Socket.io implementation commented out due to Next.js 15 compatibility issues
  /*
  useEffect(() => {
    const token = getCleanToken()
    if (!token) return

    const connectSocket = async () => {
      try {
        // Initialize Socket.io server by hitting the endpoint first
        console.log('🔌 Initializing Socket.io server...')
        await fetch('/api/socket', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        // Wait a bit for server to initialize
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Now connect to Socket.io
        const newSocket = io('/', {
          path: '/api/socket',
          auth: { token },
          transports: ['polling'], // Use only HTTP long-polling (no WebSocket upgrade)
          upgrade: false,
          autoConnect: true,
          forceNew: true
        })
        
        // ... rest of Socket.io implementation
      } catch (error) {
        console.error('Socket.io failed')
      }
    }
    
    connectSocket()
  }, [channel.id, currentUser.username])
  */

  // Initialize notifications when component mounts
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true)
      } else if (Notification.permission === 'default') {
        // Request permission after a short delay to not be too intrusive
        setTimeout(() => {
          requestNotificationPermission()
        }, 2000)
      }
    }
  }, [])

  // Load initial messages when channel changes
  useEffect(() => {
    loadMessages()
    updateUserPresence('online')
    
    // SSE handles real-time updates, no polling needed
  }, [channel.id])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(scrollToBottom, 100)
    }
  }, [loading])

  const loadMessages = async (before?: string) => {
    try {
      // Safety checks
      if (!channel || !channel.id) {
        console.error('❌ Cannot load messages: Invalid channel', { channel })
        return
      }
      
      const token = getCleanToken()
      if (!token) {
        console.error('❌ Cannot load messages: No authentication token')
        return
      }
      
      if (!before) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams({
        limit: '50'
      })
      
      if (before) {
        params.append('before', before)
      }
      
      const fullUrl = `/api/chat/channels/${channel.id}/messages?${params.toString()}`
      
      console.log('🔍 Loading messages:', {
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type,
        hasToken: !!token,
        tokenPreview: token?.substring(0, 20) + '...',
        before,
        url: fullUrl,
        params: params.toString()
      })

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Debug: Check what user data we're getting from the API
        console.log('📊 API message data sample:', data.messages?.slice(0, 2)?.map(m => ({
          id: m.id,
          user_id: m.user_id,
          display_name: m.display_name,
          profile_picture: m.profile_picture,
          message_text: m.message_text?.substring(0, 30)
        })))
        
        if (before) {
          // Prepend older messages
          setMessages(prev => [...data.messages, ...prev])
        } else {
          // Set initial messages
          setMessages(data.messages || [])
          
          // Set last message ID for SSE
          if (data.messages && data.messages.length > 0) {
            setLastMessageId(data.messages[data.messages.length - 1].id)
          }
        }
        
        setHasMore(data.pagination?.has_more || false)
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to load messages:', {
          status: response.status,
          statusText: response.statusText,
          channelId: channel.id,
          channelName: channel.name,
          url: `/api/chat/channels/${channel.id}/messages?${params}`,
          errorBody: errorText
        })
        
        // Try to parse error as JSON for more details
        try {
          const errorJson = JSON.parse(errorText)
          console.error('❌ Parsed error details:', errorJson)
        } catch (e) {
          console.error('❌ Raw error response:', errorText)
        }
      }
    } catch (error) {
      console.error('❌ Exception in loadMessages:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorStack: error instanceof Error ? error.stack : undefined,
        channelId: channel?.id,
        channelName: channel?.name,
        hasToken: !!getCleanToken()
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreMessages = useCallback(() => {
    if (!hasMore || loadingMore || messages.length === 0) return
    
    const oldestMessage = messages[0]
    if (oldestMessage) {
      loadMessages(oldestMessage.created_at)
    }
  }, [hasMore, loadingMore, messages])

  // SSE handles real-time updates, no need for polling function

  const shouldAutoScroll = () => {
    if (!scrollAreaRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    return scrollHeight - scrollTop - clientHeight < 100 // Within 100px of bottom
  }

  const updateUserPresence = async (status: 'online' | 'away' | 'busy' | 'offline') => {
    try {
      const token = getCleanToken()
      if (!token) return

      await fetch('/api/chat/presence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
    } catch (error) {
      console.error('Error updating presence:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    // Show/hide scroll to bottom button
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollToBottom(!isNearBottom)
    
    // Load more messages when scrolling to top
    if (scrollTop < 100 && hasMore && !loadingMore) {
      loadMoreMessages()
    }
    
    lastScrollTop.current = scrollTop
  }

  const handleSendMessage = async (messageData: {
    message_text: string
    message_type?: string
    file_attachment?: any
    reply_to_id?: string
  }) => {
    setSending(true)
    
    // Create optimistic message with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimisticMessage: Message = {
      id: tempId,
      channel_id: channel.id,
      user_id: currentUser.username,
      display_name: currentUser.display_name,
      profile_picture: currentUser.profile_picture,
      message_text: messageData.message_text,
      message_type: messageData.message_type || 'text',
      file_attachment: messageData.file_attachment,
      reply_to_id: messageData.reply_to_id,
      reactions: [],
      created_at: new Date().toISOString(),
      edited: false,
      deleted: false
    }
    
    console.log('📝 Creating optimistic message:', {
      tempId,
      user_id: currentUser.username,
      display_name: currentUser.display_name,
      profile_picture: currentUser.profile_picture,
      message_text: messageData.message_text?.substring(0, 50)
    })
    
    // Add message optimistically with animation
    setMessages(prev => [...prev, optimisticMessage])
    
    // Auto-scroll to bottom for new message
    setTimeout(() => {
      scrollToBottom()
    }, 50)

    try {
      // Socket.io disabled - using API only with polling for real-time updates
      
      // Call the API for persistence
      const response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCleanToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ API message response:', {
          messageId: data.message?.id,
          user_id: data.message?.user_id,
          display_name: data.message?.display_name,
          profile_picture: data.message?.profile_picture,
          message_text: data.message?.message_text?.substring(0, 50)
        })
        // Replace temporary message with real one from server
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...data.message, _isNew: true } : msg
        ))
        
        // Update last message ID for SSE
        setLastMessageId(data.message.id)
      } else {
        console.error('Failed to send message via API')
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (isTyping: boolean) => {
    // Typing indicators would need to be implemented via API calls
    // For now, disabled since SSE doesn't support client-to-server communication
    console.log('Typing indicator:', isTyping ? 'started' : 'stopped')
  }

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getCleanToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      })

      if (response.ok) {
        // Update local message reactions optimistically
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            const existingReaction = msg.reactions.find(r => r.emoji === emoji)
            if (existingReaction) {
              // Update existing reaction
              return {
                ...msg,
                reactions: msg.reactions.map(r => 
                  r.emoji === emoji 
                    ? { ...r, count: r.count + 1, users: [...r.users, { user_id: currentUser.username, display_name: currentUser.display_name }] }
                    : r
                )
              }
            } else {
              // Add new reaction
              return {
                ...msg,
                reactions: [...msg.reactions, {
                  emoji,
                  count: 1,
                  users: [{ user_id: currentUser.username, display_name: currentUser.display_name }]
                }]
              }
            }
          }
          return msg
        }))
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const removeReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getCleanToken()}`
        }
      })

      if (response.ok) {
        // Update local message reactions
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              reactions: msg.reactions.map(r => 
                r.emoji === emoji 
                  ? { ...r, count: r.count - 1, users: r.users.filter(u => u.user_id !== currentUser.username) }
                  : r
              ).filter(r => r.count > 0)
            }
          }
          return msg
        }))
      }
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  const getChannelIcon = () => {
    switch (channel.type) {
      case 'public':
        return <Hash className="h-5 w-5" />
      case 'private':
        return <Lock className="h-5 w-5" />
      case 'direct':
        return <MessageCircle className="h-5 w-5" />
    }
  }

  const getChannelDisplayName = () => {
    if (channel.type === 'direct' && channel.participants?.length === 1) {
      return channel.participants[0].display_name
    }
    return channel.name
  }

  // Group messages by sender and time proximity
  const groupedMessages = messages.reduce((groups: Message[][], message, index) => {
    const prevMessage = messages[index - 1]
    const shouldGroup = prevMessage && 
      prevMessage.user_id === message.user_id &&
      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 5 * 60 * 1000 && // 5 minutes
      !prevMessage.reply_to_id && !message.reply_to_id // Don't group replies

    if (shouldGroup && groups.length > 0) {
      groups[groups.length - 1].push(message)
    } else {
      groups.push([message])
    }
    
    return groups
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Channel Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getChannelIcon()}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getChannelDisplayName()}
              </h2>
              {channel.description && (
                <p className="text-sm text-gray-500">{channel.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {channel.member_count} members
            </Badge>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          className="h-full w-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          onScroll={handleScroll}
          ref={scrollAreaRef}
        >
          <div className="px-6 py-4">
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreMessages}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Load previous messages
              </Button>
            </div>
          )}

          {/* Message Groups */}
          <div className="space-y-4">
            {groupedMessages.map((messageGroup, groupIndex) => (
              <MessageBubble
                key={`group-${groupIndex}`}
                messages={messageGroup}
                currentUser={currentUser}
                onAddReaction={addReaction}
                onRemoveReaction={removeReaction}
                isGrouped={messageGroup.length > 1}
              />
            ))}
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="mt-4">
              <TypingIndicator users={typingUsers} />
            </div>
          )}

          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollToBottom && (
          <Button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 rounded-full h-10 w-10 p-0 shadow-lg"
            size="sm"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={sending}
          placeholder={`Message ${getChannelDisplayName()}`}
          currentUser={currentUser}
        />
      </div>
    </div>
  )
}