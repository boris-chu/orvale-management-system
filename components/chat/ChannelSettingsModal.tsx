"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogActions } from '@mui/material'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, 
  UserPlus, 
  X, 
  Search,
  Check,
  MessageCircle,
  Settings,
  Bell,
  Lock,
  Hash
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  username: string
  display_name: string
  profile_picture?: string
  online_status?: string
}

interface Channel {
  id: string
  name: string
  description?: string
  type: 'public' | 'private' | 'direct'
  member_count: number
}

interface ChannelSettingsModalProps {
  channel: Channel
  open: boolean
  onClose: () => void
  currentUser?: User
}

export function ChannelSettingsModal({
  channel,
  open,
  onClose,
  currentUser
}: ChannelSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [searchUsers, setSearchUsers] = useState('')
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [channelMembers, setChannelMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // Load channel members
  const loadChannelMembers = async () => {
    if (!channel?.id) return

    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      if (!token) return

      const response = await fetch(`/api/chat/channels/${channel.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setChannelMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error loading channel members:', error)
    }
  }

  // Load available users for adding to group
  const loadAvailableUsers = async () => {
    setLoading(true)
    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      if (!token) return

      const response = await fetch('/api/chat/users/available', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter out current channel members and current user
        const memberUsernames = channelMembers.map(m => m.username)
        const filtered = (data.users || []).filter((user: User) => 
          !memberUsernames.includes(user.username) && 
          user.username !== currentUser?.username
        )
        setAvailableUsers(filtered)
      }
    } catch (error) {
      console.error('Error loading available users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on search
  const filteredUsers = availableUsers.filter(user =>
    user.display_name.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.username.toLowerCase().includes(searchUsers.toLowerCase())
  )

  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev =>
      prev.find(u => u.username === user.username)
        ? prev.filter(u => u.username !== user.username)
        : [...prev, user]
    )
  }

  // Create new group chat with selected participants
  const createGroupChat = async () => {
    if (selectedUsers.length === 0) return

    setCreating(true)
    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      if (!token) return

      // Include current channel members + selected new users
      const allParticipants = [
        ...channelMembers.map(m => m.username),
        ...selectedUsers.map(u => u.username)
      ]

      // Create group chat name
      const participantNames = [
        ...channelMembers.map(m => m.display_name.split(' ')[0]),
        ...selectedUsers.map(u => u.display_name.split(' ')[0])
      ]
      const groupName = participantNames.slice(0, 3).join(', ') + 
        (participantNames.length > 3 ? ` +${participantNames.length - 3} others` : '')

      console.log('🚀 Creating group chat with participants:', allParticipants)

      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupName,
          description: `Group chat created from ${channel.name}`,
          type: 'private',
          participants: allParticipants
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Group chat created:', data)
        
        // Close modal and potentially navigate to new chat
        onClose()
        
        // Refresh the page to show the new channel
        window.location.reload()
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to create group chat:', errorData)
        alert('Failed to create group chat. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error creating group chat:', error)
      alert('Failed to create group chat. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadChannelMembers()
    }
  }, [open, channel.id])

  // Load available users when switching to add participants tab
  useEffect(() => {
    if (activeTab === 'add-participants' && channelMembers.length > 0) {
      loadAvailableUsers()
    }
  }, [activeTab, channelMembers])

  const getChannelIcon = () => {
    switch (channel.type) {
      case 'public':
        return <Hash className="h-5 w-5 text-gray-500" />
      case 'private':
        return <Lock className="h-5 w-5 text-gray-500" />
      case 'direct':
        return <MessageCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Hash className="h-5 w-5 text-gray-500" />
    }
  }

  const canAddParticipants = channel.type !== 'direct' // Can't add participants to direct messages

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
          {getChannelIcon()}
          <span>Channel Settings - {channel.name}</span>
        </DialogTitle>
      </DialogHeader>
      
      <DialogContent className="p-0">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-0">
            <button
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'info'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setActiveTab('info')}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Information
            </button>
            <button
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'members'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setActiveTab('members')}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Members ({channel.member_count})
            </button>
            {canAddParticipants && (
              <button
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'add-participants'
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
                onClick={() => setActiveTab('add-participants')}
              >
                <UserPlus className="h-4 w-4 inline mr-2" />
                Add Participants
              </button>
            )}
            <button
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'notifications'
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="h-4 w-4 inline mr-2" />
              Notifications
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Channel Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Channel Name</label>
                    <p className="text-sm text-gray-900 mt-1">{channel.name}</p>
                  </div>
                  {channel.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="flex items-center mt-1 space-x-2">
                      {getChannelIcon()}
                      <span className="text-sm text-gray-900 capitalize">{channel.type}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Members</label>
                    <p className="text-sm text-gray-900 mt-1">{channel.member_count} members</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Channel Members</h3>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {channelMembers.map((member) => (
                    <div key={member.username} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {member.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{member.display_name}</p>
                        <p className="text-xs text-gray-500">@{member.username}</p>
                      </div>
                      {member.online_status && (
                        <Badge variant={member.online_status === 'online' ? 'default' : 'secondary'} className="text-xs">
                          {member.online_status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === 'add-participants' && canAddParticipants && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Add Participants</h3>
                {selectedUsers.length > 0 && (
                  <Button
                    onClick={createGroupChat}
                    disabled={creating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creating ? (
                      <>Creating...</>
                    ) : (
                      <>Create Group ({selectedUsers.length + channelMembers.length})</>
                    )}
                  </Button>
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                Select users to create a new group chat that includes current members plus the selected participants.
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Selected ({selectedUsers.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Badge key={user.username} variant="secondary" className="flex items-center space-x-1">
                        <span>{user.display_name}</span>
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => toggleUserSelection(user)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Users</h4>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {filteredUsers.map((user) => {
                        const isSelected = selectedUsers.some(u => u.username === user.username)
                        return (
                          <div
                            key={user.username}
                            className={cn(
                              "flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors",
                              isSelected 
                                ? "bg-blue-50 border border-blue-200" 
                                : "hover:bg-gray-50"
                            )}
                            onClick={() => toggleUserSelection(user)}
                          >
                            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {user.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        )
                      })}
                      {filteredUsers.length === 0 && !loading && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          {searchUsers ? 'No users found matching your search.' : 'No additional users available.'}
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <p className="text-sm text-gray-600">
                Notification settings will be implemented in a future update. You can configure:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Message notifications</li>
                <li>Mention notifications</li>
                <li>Sound preferences</li>
                <li>Desktop notifications</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>

      <DialogActions className="px-6 py-3 border-t border-gray-200">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}