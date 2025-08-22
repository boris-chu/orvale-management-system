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

  const widgetRef = useRef<HTMLDivElement>(null)

  // Load conversations when user is available
  useEffect(() => {
    if (user && isOpen) {
      loadConversations()
    }
  }, [user, isOpen])

  // Calculate total unread count
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
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

      // Combine and sort by recent activity
      const allConversations = [
        ...(channelsData.channels || []),
        ...(directData.conversations || [])
      ].sort((a, b) => {
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

  const sendQuickMessage = async () => {
    if (!quickMessage.trim() || !selectedConversation || !user || sending) return

    setSending(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      const response = await fetch(`/api/chat/channels/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message_text: quickMessage.trim(),
          message_type: 'text'
        })
      })

      if (response.ok) {
        setQuickMessage('')
        // Refresh conversations to update last message
        loadConversations()
      }
    } catch (error) {
      console.error('Error sending message:', error)
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

  return (
    <div 
      ref={widgetRef}
      className={cn(
        "fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-xl transition-all duration-300",
        isOpen ? "w-80" : "w-16",
        isOpen && isExpanded ? "h-96" : isOpen && !isCollapsed ? "h-64" : isOpen && isCollapsed ? "h-12" : "h-16",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-50 rounded-t-lg">
        {!isOpen ? (
          // Collapsed state - just the icon with unread badge
          <Button
            onClick={onToggle}
            className="relative w-10 h-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <MessageCircle className="h-5 w-5" />
            {totalUnread > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 text-xs px-1 py-0 h-5 min-w-5 animate-pulse"
              >
                {totalUnread > 99 ? '99+' : totalUnread}
              </Badge>
            )}
          </Button>
        ) : (
          // Expanded state - full header
          <>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Chat</span>
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
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
          </>
        )}
      </div>

      {/* Content */}
      {isOpen && !isCollapsed && (
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
                      onClick={() => setSelectedConversation(conversation)}
                      className={cn(
                        "w-full text-left p-2 rounded hover:bg-gray-50 transition-colors",
                        selectedConversation?.id === conversation.id && "bg-blue-50",
                        conversation.unread_count > 0 && "bg-blue-25"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        {/* Icon or Avatar */}
                        {conversation.type === 'direct' && conversation.participants?.[0] ? (
                          <UserAvatar
                            user={conversation.participants[0]}
                            size="sm"
                            showPresenceStatus={true}
                            presenceStatus={conversation.participants[0].presence_status || 'offline'}
                          />
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
                                ? conversation.participants?.[0]?.display_name || conversation.name
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

          {/* Quick Message Input */}
          {isExpanded && selectedConversation && (
            <>
              <Separator />
              <div className="p-2">
                <div className="text-xs text-gray-600 mb-2 truncate">
                  Message {selectedConversation.type === 'direct' 
                    ? selectedConversation.participants?.[0]?.display_name 
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

          {/* Footer */}
          <div className="p-2 border-t bg-gray-50 rounded-b-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenFullChat}
              className="w-full text-xs h-6"
            >
              Open full chat
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}