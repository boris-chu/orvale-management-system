"use client"

import React, { useState, useEffect } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Hash, 
  Lock, 
  MessageCircle, 
  Plus, 
  Search, 
  Users,
  ChevronDown,
  ChevronRight,
  Circle
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface OnlineUser {
  user_id: string
  display_name: string
  profile_picture?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  status_message?: string
}

interface ChannelSidebarProps {
  channels: Channel[]
  directMessages: Channel[]
  selectedChannel: Channel | null
  onChannelSelect: (channel: Channel) => void
  onChannelUpdate: () => void
  currentUser: User
}

export function ChannelSidebar({
  channels,
  directMessages,
  selectedChannel,
  onChannelSelect,
  onChannelUpdate,
  currentUser
}: ChannelSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [showChannels, setShowChannels] = useState(true)
  const [showDirectMessages, setShowDirectMessages] = useState(true)
  const [showOnlineUsers, setShowOnlineUsers] = useState(true)
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)

  useEffect(() => {
    loadOnlineUsers()
    const interval = setInterval(loadOnlineUsers, 5000) // Refresh every 5 seconds for more responsive presence
    return () => clearInterval(interval)
  }, [])

  // Calculate total unread count when channels or DMs change
  useEffect(() => {
    const channelUnread = channels.reduce((total, channel) => total + (channel.unread_count || 0), 0)
    const dmUnread = directMessages.reduce((total, dm) => total + (dm.unread_count || 0), 0)
    setTotalUnreadCount(channelUnread + dmUnread)
  }, [channels, directMessages])

  const loadOnlineUsers = async () => {
    try {
      // First clean up stale presence data
      await fetch('/api/chat/presence/cleanup')
      
      const response = await fetch('/api/chat/presence', {
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]"']/g, '')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const online = data.presence?.online || []
        const away = data.presence?.away || []
        const busy = data.presence?.busy || []
        
        setOnlineUsers([...online, ...away, ...busy])
      }
    } catch (error) {
      console.error('Error loading online users:', error)
    }
  }

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDirectMessages = directMessages.filter(dm =>
    dm.participants?.some(p => 
      p.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || dm.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredOnlineUsers = onlineUsers.filter(user =>
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    user.user_id !== currentUser.username
  )

  const getChannelIcon = (channel: Channel) => {
    switch (channel.type) {
      case 'public':
        return <Hash className="h-4 w-4" />
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'direct':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const startDirectMessage = async (username: string) => {
    try {
      const response = await fetch(`/api/chat/direct/${username}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]"']/g, '')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        onChannelUpdate() // Refresh the channels list
        
        // Select the new/existing conversation
        const dmChannel: Channel = {
          id: data.conversation.id,
          name: data.conversation.name,
          type: 'direct',
          description: data.conversation.description,
          unread_count: 0,
          member_count: 2,
          participants: [data.participant]
        }
        onChannelSelect(dmChannel)
      }
    } catch (error) {
      console.error('Error starting direct message:', error)
    }
  }

  // Debug: Sidebar rendering properly with data
  // console.log('🔍 ChannelSidebar render:', {
  //   channelsCount: channels.length,
  //   directMessagesCount: directMessages.length,
  //   currentUser: currentUser?.username
  // })

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search channels, messages, or people"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Channels Section */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChannels(!showChannels)}
              className="w-full justify-start px-2 py-1 h-auto text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              {showChannels ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <span className="flex-1 text-left">CHANNELS ({filteredChannels.length})</span>
              <div className="flex items-center space-x-1">
                {filteredChannels.some(c => c.unread_count > 0) && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 h-4 min-w-4">
                    {filteredChannels.reduce((total, c) => total + (c.unread_count || 0), 0)}
                  </Badge>
                )}
                {currentUser.permissions?.includes('chat.create_channels') && (
                  <Plus className="h-3 w-3" />
                )}
              </div>
            </Button>

            {showChannels && (
              <div className="ml-1 space-y-0.5">
                {filteredChannels.map((channel) => (
                  <Button
                    key={channel.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onChannelSelect(channel)}
                    className={cn(
                      "w-full justify-start px-2 py-1.5 h-auto text-sm font-normal relative",
                      selectedChannel?.id === channel.id
                        ? "bg-blue-100 text-blue-900 hover:bg-blue-100"
                        : channel.unread_count > 0
                        ? "text-gray-900 font-medium hover:bg-gray-100"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {/* Unread indicator dot */}
                    {channel.unread_count > 0 && selectedChannel?.id !== channel.id && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                    )}
                    
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      {getChannelIcon(channel)}
                      <span className={cn(
                        "truncate",
                        channel.unread_count > 0 && "font-semibold"
                      )}>
                        {channel.name}
                      </span>
                      {channel.unread_count > 0 && (
                        <Badge 
                          variant="destructive" 
                          className={cn(
                            "text-xs px-1 py-0 h-4 min-w-4",
                            channel.unread_count > 10 && "animate-pulse"
                          )}
                        >
                          {channel.unread_count > 99 ? '99+' : channel.unread_count}
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Direct Messages Section */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDirectMessages(!showDirectMessages)}
              className="w-full justify-start px-2 py-1 h-auto text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              {showDirectMessages ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <span className="flex-1 text-left">DIRECT MESSAGES ({filteredDirectMessages.length})</span>
              <div className="flex items-center space-x-1">
                {filteredDirectMessages.some(dm => dm.unread_count > 0) && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 h-4 min-w-4">
                    {filteredDirectMessages.reduce((total, dm) => total + (dm.unread_count || 0), 0)}
                  </Badge>
                )}
                {currentUser.permissions?.includes('chat.create_direct') && (
                  <Plus className="h-3 w-3" />
                )}
              </div>
            </Button>

            {showDirectMessages && (
              <div className="ml-1 space-y-0.5">
                {filteredDirectMessages.map((dm) => {
                  const otherParticipant = dm.participants?.[0]
                  // Find the presence status for this participant
                  const participantPresence = onlineUsers.find(u => u.user_id === otherParticipant?.username)
                  const presenceStatus = participantPresence?.status || 'offline'
                  
                  return (
                    <Button
                      key={dm.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => onChannelSelect(dm)}
                      className={cn(
                        "w-full justify-start px-2 py-1.5 h-auto text-sm font-normal relative",
                        selectedChannel?.id === dm.id
                          ? "bg-blue-100 text-blue-900 hover:bg-blue-100"
                          : dm.unread_count > 0
                          ? "text-gray-900 font-medium hover:bg-gray-100"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {/* Unread indicator dot */}
                      {dm.unread_count > 0 && selectedChannel?.id !== dm.id && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                      )}
                      
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {otherParticipant ? (
                          <UserAvatar
                            user={otherParticipant}
                            size="sm"
                            showPresenceStatus={true}
                            presenceStatus={presenceStatus}
                          />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        <span className={cn(
                          "truncate",
                          dm.unread_count > 0 && "font-semibold"
                        )}>
                          {otherParticipant?.display_name || dm.name}
                        </span>
                        {dm.unread_count > 0 && (
                          <Badge 
                            variant="destructive" 
                            className={cn(
                              "text-xs px-1 py-0 h-4 min-w-4",
                              dm.unread_count > 10 && "animate-pulse"
                            )}
                          >
                            {dm.unread_count > 99 ? '99+' : dm.unread_count}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* Online Users Section */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              className="w-full justify-start px-2 py-1 h-auto text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              {showOnlineUsers ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
              ONLINE ({filteredOnlineUsers.length})
            </Button>

            {showOnlineUsers && (
              <div className="ml-1 space-y-0.5">
                {filteredOnlineUsers.map((user) => (
                  <Button
                    key={user.user_id}
                    variant="ghost"
                    size="sm"
                    onClick={() => startDirectMessage(user.user_id)}
                    className="w-full justify-start px-2 py-1.5 h-auto text-sm font-normal text-gray-700 hover:bg-gray-100"
                    disabled={!currentUser.permissions?.includes('chat.create_direct')}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <UserAvatar
                        user={user}
                        size="sm"
                        showPresenceStatus={true}
                        presenceStatus={user.status}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{user.display_name}</div>
                        {user.status_message && (
                          <div className="truncate text-xs text-gray-500">
                            {user.status_message}
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
                {filteredOnlineUsers.length === 0 && (
                  <div className="px-2 py-1 text-xs text-gray-500">
                    No users online
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* User Status */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center space-x-2">
          <UserAvatar
            user={currentUser}
            size="sm"
            showPresenceStatus={true}
            presenceStatus="online"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{currentUser.display_name}</div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
          <Button variant="ghost" size="sm" className="p-1 h-auto">
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}