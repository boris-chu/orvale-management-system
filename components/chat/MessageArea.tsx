"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { io, Socket } from 'socket.io-client'

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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Utility function to get clean auth token
  const getCleanToken = () => {
    let token = localStorage.getItem('authToken') || localStorage.getItem('token')
    if (token) {
      token = token.trim().replace(/[\[\]"']/g, '')
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

  // Socket connection (disabled for now due to Next.js 15 compatibility issues)
  useEffect(() => {
    // Socket.io has compatibility issues with Next.js 15 + App Router
    // Using polling-based real-time updates instead
    console.log('🔌 Socket.io disabled - using polling for real-time updates')
    setSocket(null)
  }, [channel.id, currentUser.username])

  // Alternative real-time approach using Server-Sent Events (if needed later)
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

  }, [channel.id, currentUser.username])

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

  // Load messages when channel changes and set up polling
  useEffect(() => {
    loadMessages()
    updateUserPresence('online')
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    // Set up polling for new messages (primary real-time mechanism)
    pollingIntervalRef.current = setInterval(() => {
      pollForNewMessages()
    }, 1500) // Poll every 1.5 seconds for responsive real-time feel
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [channel.id])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(scrollToBottom, 100)
    }
  }, [loading])

  const loadMessages = async (before?: string) => {
    try {
      if (!before) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams({
        limit: '50'
      })
      
      if (before) {
        params.append('before', before)
      }

      const token = getCleanToken()

      const response = await fetch(`/api/chat/channels/${channel.id}/messages?${params}`, {
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
        }
        
        setHasMore(data.pagination?.has_more || false)
      } else {
        console.error('Failed to load messages:', {
          status: response.status,
          statusText: response.statusText,
          channelId: channel.id
        })
        const errorText = await response.text()
        console.error('Error response body:', errorText)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
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

  const pollForNewMessages = async () => {
    try {
      const token = getCleanToken()
      if (!token) {
        console.log('❌ No token available for polling')
        return
      }

      // Get the latest message timestamp
      const latestMessage = messages[messages.length - 1]
      if (!latestMessage) {
        console.log('⏭️ No messages to poll after')
        return
      }

      const params = new URLSearchParams({
        after: latestMessage.created_at,
        limit: '50'
      })

      console.log('🔄 Polling for new messages:', {
        channelId: channel.id,
        channelName: channel.name,
        after: latestMessage.created_at,
        latestMessageId: latestMessage.id,
        currentUser: currentUser.username
      })

      const response = await fetch(`/api/chat/channels/${channel.id}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📥 Polling response:', { 
          messageCount: data.messages?.length || 0,
          messages: data.messages?.map(m => ({ 
            id: m.id, 
            text: m.message_text?.substring(0, 50),
            user_id: m.user_id,
            display_name: m.display_name,
            profile_picture: m.profile_picture
          }))
        })
        
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            // Filter out any duplicates
            const existingIds = new Set(prev.map(m => m.id))
            const newMessages = data.messages
              .filter((m: Message) => !existingIds.has(m.id))
              .map((m: Message) => ({ ...m, _isNew: true }))
            
            console.log('✨ New messages found:', newMessages.length)
            
            if (newMessages.length > 0) {
              // Show notifications for new messages from other users
              newMessages.forEach(message => {
                if (message.user_id !== currentUser.username) {
                  console.log('🔔 Showing notification for:', message.message_text)
                  showNotification(message)
                  playNotificationSound()
                }
              })
              
              onChannelUpdate() // Update sidebar counters
              
              // Auto-scroll if user is near bottom
              setTimeout(() => {
                if (shouldAutoScroll()) {
                  scrollToBottom()
                }
              }, 100)
            }
            
            return [...prev, ...newMessages]
          })
        }
      } else {
        console.error('❌ Polling failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Error polling for new messages:', error)
    }
  }

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
    if (!socket) return
    
    if (isTyping) {
      socket.emit('typing_start', { channelId: channel.id })
    } else {
      socket.emit('typing_stop', { channelId: channel.id })
    }
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
    <div className="flex-1 flex flex-col bg-white">
      {/* Channel Header */}
      <div className="border-b border-gray-200 px-6 py-4">
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
      <div className="flex-1 relative">
        <ScrollArea 
          className="h-full px-6 py-4"
          onScrollCapture={handleScroll}
          ref={scrollAreaRef}
        >
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
        </ScrollArea>

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
      <div className="border-t border-gray-200 p-4">
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