"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ChannelSidebar } from '@/components/chat/ChannelSidebar'
import { MessageArea } from '@/components/chat/MessageArea'
import { ChatLayout } from '@/components/chat/ChatLayout'
import { MessageSearch } from '@/components/chat/MessageSearch'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Users, Hash, Plus, Search, Settings, LogOut, User } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { UserProfileMenu } from '@/components/UserProfileMenu'
import { useRealTime } from '@/lib/realtime/RealTimeProvider'

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
  const [showSearch, setShowSearch] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)

  // Real-time integration for channel updates
  const { 
    connectionStatus, 
    connectionMode,
    onMessage 
  } = useRealTime()


  useEffect(() => {
    if (!loading && user) {
      console.log('👤 Chat page: User loaded:', {
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        permissions: user.permissions?.length || 0,
        hasAuthToken: !!(localStorage.getItem('authToken') || localStorage.getItem('token')),
        hasChatAccess: user.permissions?.includes('chat.access_channels'),
        connectionStatus,
        connectionMode
      })
      
      loadChannels()
      loadDirectMessages()
    }
  }, [user, loading, connectionStatus])

  // Real-time channel list updates when messages arrive
  useEffect(() => {
    if (!user) return

    console.log('🔌 Chat page: Setting up RealTimeProvider listener for channel updates')
    
    const unsubscribe = onMessage((realTimeMessage) => {
      if (realTimeMessage.type === 'message') {
        const messageData = realTimeMessage.content
        
        if (messageData && messageData.channel_id) {
          console.log('📥 Chat page: Updating channel list for new message in:', messageData.channel_id)
          
          // Update channel unread counts and last message info
          setChannels(prev => prev.map(channel => {
            if (channel.id === messageData.channel_id) {
              return {
                ...channel,
                unread_count: messageData.user_id !== user.username 
                  ? (channel.unread_count || 0) + 1 
                  : channel.unread_count // Don't increment for own messages
              }
            }
            return channel
          }))
          
          // Update direct messages too
          setDirectMessages(prev => prev.map(dm => {
            if (dm.id === messageData.channel_id) {
              return {
                ...dm,
                unread_count: messageData.user_id !== user.username 
                  ? (dm.unread_count || 0) + 1 
                  : dm.unread_count
              }
            }
            return dm
          }))
        }
      }
    })

    return unsubscribe
  }, [user, onMessage])


  // Add keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])


  const loadChannels = async () => {
    try {
      // Try both token locations used by the existing system
      let token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      // Clean up token - remove any brackets, quotes, or spaces
      if (token) {
        token = token.trim()
        token = token.replace(/[\[\]"']/g, '')
        
        // Ensure it's a proper JWT format (3 parts separated by dots)
        const parts = token.split('.')
        if (parts.length !== 3) {
          console.log('❌ Invalid JWT format - not 3 parts:', parts.length)
          setError('Invalid authentication token format')
          return
        }
      }
      
      console.log('🔍 Chat loadChannels debug:', {
        hasToken: !!token,
        tokenPrefix: token?.substring(0, 10) + '...',
        tokenParts: token?.split('.').length,
        user: user?.username,
        permissions: user?.permissions?.length
      })
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch('/api/chat/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('🔍 Chat channels API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📋 Loaded all channels from API:', data.channels?.length || 0, data.channels)
        
        // Filter out direct message channels - they should only appear in Direct Messages section
        const actualChannels = (data.channels || []).filter((channel: Channel) => 
          channel.type !== 'direct'
        )
        console.log('📋 Filtered channels (excluding direct messages):', actualChannels.length, actualChannels)
        setChannels(actualChannels)
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
      let token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      // Clean up token - remove any brackets, quotes, or spaces
      if (token) {
        token = token.trim()
        token = token.replace(/[\[\]"']/g, '')
      }
      
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
        console.log('💬 Loaded direct messages:', data.conversations?.length || 0, data.conversations)
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

  const handleChannelSelect = async (channel: Channel) => {
    setSelectedChannel(channel)
    
    // Mark channel as read if it has unread messages
    if (channel.unread_count > 0) {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          const response = await fetch(`/api/chat/channels/${channel.id}/mark-read`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            // Update local state to reflect read status
            if (channel.type === 'direct') {
              setDirectMessages(prev => prev.map(dm => 
                dm.id === channel.id 
                  ? { ...dm, unread_count: 0 }
                  : dm
              ))
            } else {
              setChannels(prev => prev.map(ch => 
                ch.id === channel.id 
                  ? { ...ch, unread_count: 0 }
                  : ch
              ))
            }
            console.log(`✅ Marked channel ${channel.name} as read`)
          } else {
            console.warn(`⚠️ Failed to mark channel ${channel.name} as read:`, response.status)
          }
        }
      } catch (error) {
        console.error('❌ Error marking channel as read:', error)
      }
    }
  }

  const handleChannelUpdate = () => {
    loadChannels()
    loadDirectMessages()
  }

  // Update page title with unread count
  useEffect(() => {
    const channelUnread = channels.reduce((total, channel) => total + (channel.unread_count || 0), 0)
    const dmUnread = directMessages.reduce((total, dm) => total + (dm.unread_count || 0), 0)
    const total = channelUnread + dmUnread
    setTotalUnread(total)
    
    // Update page title
    if (total > 0) {
      document.title = `(${total}) Orvale Chat`
    } else {
      document.title = 'Orvale Chat'
    }
  }, [channels, directMessages])

  const handleSearchResultSelect = async (result: any) => {
    // Find the channel for this search result
    const channel = channels.find(c => c.id === result.channel_id) || 
                   directMessages.find(dm => dm.id === result.channel_id)
    
    if (channel) {
      setSelectedChannel(channel)
      // TODO: Scroll to the specific message in the MessageArea
      // This would require enhancing MessageArea to accept a target message ID
    }
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

  // Debug: Chat page state
  // console.log('🔍 Chat page render state:', {
  //   channelsLength: channels.length,
  //   directMessagesLength: directMessages.length,
  //   selectedChannel: selectedChannel?.id
  // })

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              {/* Global unread indicator */}
              {(channels.some(c => c.unread_count > 0) || directMessages.some(dm => dm.unread_count > 0)) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Orvale Chat</h1>
            {/* Total unread count */}
            {(channels.length > 0 || directMessages.length > 0) && (
              <div className="text-sm text-gray-500">
                {channels.length + directMessages.length} conversations
                {(channels.some(c => c.unread_count > 0) || directMessages.some(dm => dm.unread_count > 0)) && (
                  <span className="ml-2 text-red-600 font-medium">
                    • {channels.reduce((total, c) => total + (c.unread_count || 0), 0) + 
                        directMessages.reduce((total, dm) => total + (dm.unread_count || 0), 0)} unread
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="text-gray-600 hover:text-gray-900"
              title="Search messages (Ctrl+K)"
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline ml-2 px-1.5 py-0.5 text-xs font-mono bg-gray-100 rounded">
                ⌘K
              </kbd>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/tickets'}
            >
              Back to Tickets
            </Button>

            {/* User Profile Menu */}
            <UserProfileMenu 
              showPresence={user?.permissions?.includes('chat.access_channels') || false}
              onProfileClick={() => {
                // Add profile modal here if needed
                console.log('Profile clicked')
              }}
              onSettingsClick={() => {
                // Add settings here if needed
                console.log('Settings clicked')
              }}
            />
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
              <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
                <div className="text-center w-full max-w-2xl">
                  <Hash className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    Welcome to Orvale Chat
                  </h3>
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    Select a channel from the sidebar to start messaging, or create a new conversation.
                  </p>
                  {channels.length === 0 && directMessages.length === 0 && (
                    <div className="space-y-4 bg-gray-50 rounded-lg p-6">
                      <p className="text-gray-500">No channels available yet.</p>
                      {user.permissions?.includes('chat.create_channels') && (
                        <Button onClick={handleChannelUpdate} className="mt-4">
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

      {/* Search Modal */}
      <MessageSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectMessage={handleSearchResultSelect}
        currentUser={user}
      />

      {/* Note: CallManager is handled globally by ChatWidgetProvider */}
    </div>
  )
}