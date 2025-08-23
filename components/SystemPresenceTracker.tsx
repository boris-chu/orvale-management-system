"use client"

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface SystemPresenceTrackerProps {
  /**
   * Global presence tracker that maintains user online status across all pages
   * Should be included in the main layout or AuthContext
   */
}

export function SystemPresenceTracker({}: SystemPresenceTrackerProps) {
  const { user } = useAuth()

  // Update user presence across the entire system
  const updateSystemPresence = async (status: 'online' | 'away' | 'busy' | 'offline') => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (!token || !user?.permissions?.includes('chat.access_channels')) return

      const cleanToken = token.trim().replace(/[\[\]"']/g, '')
      await fetch('/api/chat/presence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      console.log('🌐 SystemPresence: Updated to', status, 'for user', user.username)
    } catch (error) {
      console.error('❌ SystemPresence: Error updating presence:', error)
    }
  }

  useEffect(() => {
    if (!user || !user.permissions?.includes('chat.access_channels')) return

    // Set user as online immediately when any authenticated page loads
    updateSystemPresence('online')
    
    // Send presence heartbeat every 60 seconds to keep user marked as active
    const presenceInterval = setInterval(() => {
      if (!document.hidden) {
        updateSystemPresence('online')
      }
    }, 60000) // Every minute

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSystemPresence('away')
      } else {
        updateSystemPresence('online')
      }
    }

    // Handle user leaving the system
    const handleBeforeUnload = () => {
      console.log('🚨 SystemPresence: Page unload detected, setting offline')
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (token) {
        const cleanToken = token.trim().replace(/[\[\]"']/g, '')
        
        // Try synchronous fetch first for immediate logout
        try {
          fetch('/api/chat/presence', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cleanToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'offline' }),
            keepalive: true // Important: keeps request alive even as page unloads
          }).catch(() => {
            console.log('⚠️ SystemPresence: Fetch failed during unload')
          })
        } catch (error) {
          console.log('⚠️ SystemPresence: Error during unload presence update')
        }
      }
    }

    // Handle tab/window close (additional handler)
    const handleUnload = () => {
      console.log('🚨 SystemPresence: Window unload detected')
      // This fires after beforeunload, so just log it
    }

    // Mouse movement and keyboard activity to detect user activity
    let lastActivity = Date.now()
    const handleUserActivity = () => {
      lastActivity = Date.now()
    }

    // Check for inactivity every 5 minutes
    const inactivityInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivity
      if (timeSinceActivity > 5 * 60 * 1000 && !document.hidden) {
        // User hasn't moved mouse or typed for 5 minutes, mark as away
        updateSystemPresence('away')
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)
    document.addEventListener('mousemove', handleUserActivity)
    document.addEventListener('keydown', handleUserActivity)
    document.addEventListener('click', handleUserActivity)
    document.addEventListener('scroll', handleUserActivity)

    return () => {
      clearInterval(presenceInterval)
      clearInterval(inactivityInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
      document.removeEventListener('mousemove', handleUserActivity)
      document.removeEventListener('keydown', handleUserActivity)
      document.removeEventListener('click', handleUserActivity)
      document.removeEventListener('scroll', handleUserActivity)
      
      // Set user offline when component unmounts
      updateSystemPresence('offline')
    }
  }, [user])

  // This component renders nothing - it's just for tracking presence
  return null
}