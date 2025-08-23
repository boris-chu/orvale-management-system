"use client"

import React, { useState, useEffect } from 'react'
import { UserAvatar } from './UserAvatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  User, 
  Settings, 
  LogOut,
  Circle,
  UserCircle,
  Shield,
  Activity
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface UserProfileMenuProps {
  className?: string
  showPresence?: boolean
  onProfileClick?: () => void
  onSettingsClick?: () => void
  customMenuItems?: React.ReactNode
}

export function UserProfileMenu({ 
  className,
  showPresence = true,
  onProfileClick,
  onSettingsClick,
  customMenuItems
}: UserProfileMenuProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('offline')
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user's current presence status
  useEffect(() => {
    if (!user || !showPresence) {
      setIsLoading(false)
      return
    }

    const fetchPresence = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        if (!token) {
          console.log('🚨 UserProfileMenu: No auth token found, disabling presence')
          setPresenceStatus('offline')
          setIsLoading(false)
          return
        }

        const cleanToken = token.trim().replace(/[\[\]"']/g, '')
        console.log('🔍 UserProfileMenu: Fetching presence with token:', cleanToken.substring(0, 20) + '...')
        
        const response = await fetch('/api/chat/presence', {
          headers: {
            'Authorization': `Bearer ${cleanToken}`
          }
        })

        console.log('📡 UserProfileMenu: Presence API response:', response.status, response.ok)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 UserProfileMenu: Presence data received:', data.summary)
          
          // Find current user's presence in the response
          const allUsers = [
            ...(data.presence?.online || []),
            ...(data.presence?.away || []),
            ...(data.presence?.busy || []),
            ...(data.presence?.offline || [])
          ]
          
          const currentUserPresence = allUsers.find(u => u.user_id === user.username)
          if (currentUserPresence) {
            console.log('👤 UserProfileMenu: Found user presence:', user.username, currentUserPresence.status)
            setPresenceStatus(currentUserPresence.status)
          } else {
            console.log('❓ UserProfileMenu: User not found in presence data, defaulting to online')
            setPresenceStatus('online') // Default to online if not found
          }
        } else if (response.status === 401) {
          console.log('🔒 UserProfileMenu: Authentication failed, disabling presence')
          setPresenceStatus('offline')
        } else {
          console.log('❌ UserProfileMenu: API error:', response.status, 'disabling presence')
          setPresenceStatus('offline') // Default to offline on API errors
        }
      } catch (error) {
        console.error('❌ UserProfileMenu: Error fetching presence:', error)
        setPresenceStatus('offline') // Default to offline on fetch errors
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchPresence()

    // Refresh presence every 10 seconds
    const interval = setInterval(fetchPresence, 10000)

    return () => clearInterval(interval)
  }, [user, showPresence])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu && !(e.target as HTMLElement).closest('.user-profile-menu')) {
        setShowMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  const handleSignOut = async () => {
    try {
      // Update presence to offline before signing out
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (token) {
        await fetch('/api/chat/presence', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.trim().replace(/[\[\]"']/g, '')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'offline' })
        })
      }
    } catch (error) {
      console.error('Error updating presence on sign out:', error)
    }

    logout()
    router.push('/')
  }

  if (!user) return null

  const presenceColors = {
    online: 'text-green-600',
    away: 'text-yellow-600',
    busy: 'text-red-600',
    offline: 'text-gray-400'
  }

  const presenceLabels = {
    online: 'Active',
    away: 'Away',
    busy: 'Busy',
    offline: 'Offline'
  }

  return (
    <TooltipProvider>
      <div className={cn("relative user-profile-menu", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="flex items-center rounded-full p-1 hover:bg-gray-100 transition-colors duration-200"
            >
              <UserAvatar 
                user={user}
                size="md"
                showPresenceStatus={showPresence}
                presenceStatus={presenceStatus}
                className="border-2 border-gray-200 hover:border-gray-300 transition-colors duration-200"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>User Menu</p>
          </TooltipContent>
        </Tooltip>

        {/* User Dropdown Menu */}
        {showMenu && (
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
                  showPresenceStatus={showPresence}
                  presenceStatus={presenceStatus}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name}</p>
                  <p className="text-xs text-gray-600 truncate">{user.email}</p>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.role}
                    </span>
                    {showPresence && !isLoading && (
                      <span className={cn("inline-flex items-center text-xs", presenceColors[presenceStatus])}>
                        <Circle className="h-2 w-2 fill-current mr-1" />
                        {presenceLabels[presenceStatus]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="py-2">
              {onProfileClick && (
                <button 
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => {
                    setShowMenu(false)
                    onProfileClick()
                  }}
                >
                  <User className="h-4 w-4 mr-3 text-gray-400" />
                  View Profile
                </button>
              )}
              
              {onSettingsClick && (
                <button 
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => {
                    setShowMenu(false)
                    onSettingsClick()
                  }}
                >
                  <Settings className="h-4 w-4 mr-3 text-gray-400" />
                  Settings
                </button>
              )}

              {/* Permission-based menu items */}
              {user.permissions?.includes('admin.access_dashboard') && (
                <button 
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => {
                    setShowMenu(false)
                    router.push('/admin')
                  }}
                >
                  <Shield className="h-4 w-4 mr-3 text-gray-400" />
                  Admin Dashboard
                </button>
              )}

              {user.permissions?.includes('developer.access_portal') && (
                <button 
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                  onClick={() => {
                    setShowMenu(false)
                    router.push('/developer')
                  }}
                >
                  <Activity className="h-4 w-4 mr-3 text-gray-400" />
                  Developer Portal
                </button>
              )}

              {/* Custom menu items */}
              {customMenuItems}
              
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button 
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-3 text-red-400" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}