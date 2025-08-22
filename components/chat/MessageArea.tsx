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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const newSocket = io('/api/socket', {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Connected to chat socket')
      // Join the current channel
      newSocket.emit('join_channel', { channelId: channel.id })
    })

    newSocket.on('message_received', (data: { message: Message; channel_id: string }) => {
      if (data.channel_id === channel.id) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => msg.id === data.message.id)
          if (exists) return prev
          
          return [...prev, data.message]
        })
        
        // Auto-scroll if user is near bottom
        setTimeout(() => {
          if (shouldAutoScroll()) {
            scrollToBottom()
          }
        }, 100)
      }
    })

    newSocket.on('user_typing', (data: { user: TypingUser; typing: boolean; channel_id: string }) => {
      if (data.channel_id === channel.id && data.user.user_id !== currentUser.username) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== data.user.user_id)
          return data.typing ? [...filtered, data.user] : filtered
        })
      }
    })

    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message)
    })

    setSocket(newSocket)

    return () => {
      newSocket.emit('leave_channel', { channelId: channel.id })
      newSocket.disconnect()
    }
  }, [channel.id, currentUser.username])

  // Load messages when channel changes
  useEffect(() => {
    loadMessages()
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

      const response = await fetch(`/api/chat/channels/${channel.id}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (before) {
          // Prepend older messages
          setMessages(prev => [...data.messages, ...prev])
        } else {
          // Set initial messages
          setMessages(data.messages || [])
        }
        
        setHasMore(data.pagination?.has_more || false)
      } else {
        console.error('Failed to load messages')
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

  const shouldAutoScroll = () => {
    if (!scrollAreaRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    return scrollHeight - scrollTop - clientHeight < 100 // Within 100px of bottom
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
    if (!socket) return

    setSending(true)
    try {
      // Send via Socket.io for real-time delivery
      socket.emit('send_message', {
        channelId: channel.id,
        ...messageData
      })
      
      // Also call the API for persistence
      const response = await fetch(`/api/chat/channels/${channel.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      if (!response.ok) {
        console.error('Failed to send message via API')
      }
    } catch (error) {
      console.error('Error sending message:', error)
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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