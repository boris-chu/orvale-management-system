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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      loadChannels()
      loadDirectMessages()
    }
  }, [user, loading])

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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false)
    }

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

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
            <TooltipProvider>
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(!showUserMenu);
                      }}
                      className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <UserAvatar 
                        user={user}
                        size="md"
                        showPresenceStatus={true}
                        presenceStatus="online"
                        className="border-2 border-gray-200 hover:border-gray-300 transition-colors duration-200"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>User Menu</p>
                  </TooltipContent>
                </Tooltip>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center space-x-3">
                        <UserAvatar 
                          user={user}
                          size="lg"
                          showPresenceStatus={true}
                          presenceStatus="online"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user?.display_name}</p>
                          <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user?.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Options */}
                    <div className="py-2">
                      <button 
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => {
                          setShowUserMenu(false);
                          // Add profile modal here if needed
                        }}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400" />
                        View Profile
                      </button>
                      
                      <button 
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => {
                          setShowUserMenu(false);
                          // Add settings here if needed
                        }}
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-400" />
                        Chat Settings
                      </button>
                      
                      <button 
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                        onClick={() => {
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('currentUser');
                          window.location.href = '/';
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-3 text-red-400" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </TooltipProvider>
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

      {/* Search Modal */}
      <MessageSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectMessage={handleSearchResultSelect}
        currentUser={user}
      />
    </div>
  )
}