"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Search,
  MessageSquare,
  Users,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  Shield,
  AlertTriangle,
  FileText,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  name: string
  type: 'public' | 'private' | 'direct'
  description?: string
  created_at: string
  message_count: number
  member_count: number
  last_message_at?: string
  last_message?: string
  last_message_by?: string
  participants: Array<{
    user_id: string
    display_name: string
    email: string
    role: string
    joined_at: string
    presence_status?: string
  }>
}

interface Message {
  id: string
  message_text: string
  message_type: string
  created_at: string
  updated_at?: string
  display_name: string
  email: string
  sender_username: string
  reply_to_message?: {
    id: string
    message_text: string
    user_name: string
    created_at: string
  }
}

export function ChatMonitoringTab() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showConversationModal, setShowConversationModal] = useState(false)

  // Check permissions
  const hasMonitoringPermission = user?.permissions?.includes('chat.monitor_conversations')

  useEffect(() => {
    if (hasMonitoringPermission) {
      loadConversations()
    }
  }, [hasMonitoringPermission, searchQuery, typeFilter])

  const loadConversations = async () => {
    if (!hasMonitoringPermission) return

    setLoading(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      params.set('limit', '50')

      const response = await fetch(`/api/admin/chat/conversations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        console.error('Failed to load conversations:', response.status)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversation: Conversation) => {
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/admin/chat/conversations/${conversation.id}/messages?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setSelectedConversation(data.channel)
      } else {
        console.error('Failed to load messages:', response.status)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleViewConversation = (conversation: Conversation) => {
    loadMessages(conversation)
    setShowConversationModal(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'public': return 'bg-green-100 text-green-800'
      case 'private': return 'bg-yellow-100 text-yellow-800'
      case 'direct': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'public': return <MessageSquare className="h-4 w-4" />
      case 'private': return <Shield className="h-4 w-4" />
      case 'direct': return <Users className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  if (!hasMonitoringPermission) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p className="text-gray-600 mb-4">
          You don't have permission to monitor chat conversations.
        </p>
        <p className="text-sm text-gray-500">
          Required permission: <code>chat.monitor_conversations</code>
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat Monitoring</h2>
          <p className="text-gray-600 mt-1">Monitor and review chat conversations for compliance and security</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversations}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations, participants, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="public">Public Channels</SelectItem>
                  <SelectItem value="private">Private Channels</SelectItem>
                  <SelectItem value="direct">Direct Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Conversations ({conversations.length})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No conversations found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={cn("text-xs", getTypeColor(conversation.type))}>
                          {getTypeIcon(conversation.type)}
                          <span className="ml-1 capitalize">{conversation.type}</span>
                        </Badge>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{conversation.member_count} members</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{conversation.message_count} messages</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created {new Date(conversation.created_at).toLocaleDateString()}</span>
                        </div>
                        {conversation.last_message_at && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Last: {new Date(conversation.last_message_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {conversation.last_message && (
                        <div className="bg-gray-50 rounded p-2 text-sm">
                          <p className="text-gray-600 truncate">
                            <span className="font-medium">{conversation.last_message_by}:</span>{' '}
                            {conversation.last_message}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mt-2">
                        {conversation.participants.slice(0, 5).map((participant) => (
                          <Badge key={participant.user_id} variant="outline" className="text-xs">
                            {participant.display_name}
                          </Badge>
                        ))}
                        {conversation.participants.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{conversation.participants.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleViewConversation(conversation)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Modal */}
      <Dialog open={showConversationModal} onOpenChange={setShowConversationModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>{selectedConversation?.name}</span>
              <Badge className={cn("text-xs ml-2", selectedConversation ? getTypeColor(selectedConversation.type) : '')}>
                {selectedConversation?.type}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedConversation?.participants?.length} participants • {messages.length} messages shown
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loadingMessages ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm">{message.display_name}</span>
                        <span className="text-xs text-gray-500">({message.sender_username})</span>
                        <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {message.message_type}
                      </Badge>
                    </div>
                    
                    {message.reply_to_message && (
                      <div className="bg-gray-50 rounded p-2 mb-2 text-sm">
                        <span className="text-gray-600">Replying to {message.reply_to_message.user_name}:</span>
                        <p className="italic">{message.reply_to_message.message_text}</p>
                      </div>
                    )}
                    
                    <p className="text-gray-900">{message.message_text}</p>
                    
                    {message.updated_at && message.updated_at !== message.created_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Edited: {formatDate(message.updated_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}