"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ChannelSidebar } from '@/components/chat/ChannelSidebar'
import { MessageArea } from '@/components/chat/MessageArea'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Users, Hash, Plus } from 'lucide-react'

interface Channel {
  id: string
  name: string
  type: 'public' | 'private' | 'direct'
  description?: string
  unread_count: number
  member_count: number
  participants?: any[]
}

export default function ChatPage() {
  const { user, loading } = useAuth()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [directMessages, setDirectMessages] = useState<Channel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      loadChannels()
      loadDirectMessages()
    }
  }, [user, loading])

  const loadChannels = async () => {
    try {
      // Try both token locations used by the existing system
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch('/api/chat/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
      } else if (response.status === 401) {
        setError('Authentication required. Please refresh the page.')
      } else if (response.status === 403) {
        setError('You do not have permission to access chat channels.')
      } else {
        setError('Failed to load channels. Chat system may not be available yet.')
      }
    } catch (error) {
      console.error('Error loading channels:', error)
      setError('Failed to load channels. The chat API may not be fully configured.')
    }
  }

  const loadDirectMessages = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      if (!token) {
        console.log('No token available for direct messages')
        return
      }

      const response = await fetch('/api/chat/direct', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDirectMessages(data.conversations || [])
      } else {
        // It's ok if DMs fail - user might not have permission
        console.log('Direct messages not available:', response.status)
      }
    } catch (error) {
      console.error('Error loading direct messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel)
  }

  const handleChannelUpdate = () => {
    loadChannels()
    loadDirectMessages()
  }

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the chat system.</p>
          <Button onClick={() => window.location.href = '/tickets'}>
            Go to Login
          </Button>
        </Card>
      </div>
    )
  }

  if (!user.permissions?.includes('chat.access_channels')) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access the chat system.</p>
          <Button onClick={() => window.location.href = '/tickets'}>
            Back to Tickets
          </Button>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Chat</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Orvale Chat</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome, {user.display_name}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/tickets'}
            >
              Back to Tickets
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        <ChatLayout
          sidebar={
            <ChannelSidebar
              channels={channels}
              directMessages={directMessages}
              selectedChannel={selectedChannel}
              onChannelSelect={handleChannelSelect}
              onChannelUpdate={handleChannelUpdate}
              currentUser={user}
            />
          }
          main={
            selectedChannel ? (
              <MessageArea
                channel={selectedChannel}
                currentUser={user}
                onChannelUpdate={handleChannelUpdate}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-white">
                <div className="text-center max-w-md">
                  <Hash className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Welcome to Orvale Chat
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Select a channel from the sidebar to start messaging, or create a new conversation.
                  </p>
                  {channels.length === 0 && directMessages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">No channels available yet.</p>
                      {user.permissions?.includes('chat.create_channels') && (
                        <Button size="sm" onClick={handleChannelUpdate}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Channel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          }
        />
      </div>
    </div>
  )
}