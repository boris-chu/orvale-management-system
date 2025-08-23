import { useState, useEffect } from 'react'
import { useRealTime } from '@/lib/realtime/RealTimeProvider'

export interface PresenceData {
  [username: string]: {
    status: 'online' | 'away' | 'busy' | 'offline'
    lastActive: string
    statusMessage?: string
  }
}

/**
 * Hook to get real-time presence data for all users
 * This allows components to show live presence indicators
 */
export function usePresence() {
  const [presenceData, setPresenceData] = useState<PresenceData>({})
  const { onPresenceUpdate, connectionStatus } = useRealTime()

  useEffect(() => {
    // Listen for presence updates from RealTimeProvider
    const unsubscribe = onPresenceUpdate((presenceUpdate) => {
      const { username, status, lastActive } = presenceUpdate
      
      setPresenceData(prev => ({
        ...prev,
        [username]: {
          status,
          lastActive,
          statusMessage: prev[username]?.statusMessage // Preserve existing status message
        }
      }))
    })

    return unsubscribe
  }, [onPresenceUpdate])

  // Function to get presence status for a specific user
  const getUserPresence = (username: string) => {
    return presenceData[username] || { 
      status: 'offline' as const, 
      lastActive: new Date().toISOString() 
    }
  }

  // Get updatePresence function from RealTimeProvider
  const { updatePresence } = useRealTime()
  
  // Function to manually update presence (for current user)
  const updateUserPresence = async (status: 'online' | 'away' | 'busy' | 'offline', _statusMessage?: string) => {
    return await updatePresence(status)
  }

  return {
    presenceData,
    getUserPresence,
    updateUserPresence,
    isConnected: connectionStatus === 'connected',
    connectionStatus
  }
}

/**
 * Simplified hook to get presence status for a single user
 */
export function useUserPresence(username: string) {
  const { getUserPresence, isConnected } = usePresence()
  
  return {
    presence: getUserPresence(username),
    isConnected
  }
}