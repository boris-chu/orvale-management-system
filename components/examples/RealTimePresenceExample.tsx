"use client"

import React from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { usePresence } from '@/lib/hooks/usePresence'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Example component showing how to use UserAvatar with real-time presence
 * This demonstrates the three ways to show presence:
 * 1. Static presence (presenceStatus prop)
 * 2. Real-time presence (useRealTimePresence prop)  
 * 3. Manual presence management (usePresence hook)
 */
export function RealTimePresenceExample() {
  const { presenceData, isConnected, connectionStatus } = usePresence()

  const exampleUser = {
    username: 'john.doe',
    display_name: 'John Doe',
    profile_picture: undefined
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Real-Time Presence Examples</h3>
        <Badge variant={isConnected ? "default" : "secondary"}>
          {connectionStatus} - {isConnected ? 'Real-time updates active' : 'No real-time updates'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Static Presence */}
        <div className="space-y-3">
          <h4 className="font-medium">1. Static Presence</h4>
          <p className="text-sm text-muted-foreground">
            Uses presenceStatus prop - no real-time updates
          </p>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <UserAvatar
                user={exampleUser}
                size="lg"
                showPresenceStatus={true}
                presenceStatus="online"
              />
              <span>Always Online</span>
            </div>
            <div className="flex items-center space-x-3">
              <UserAvatar
                user={exampleUser}
                size="lg"
                showPresenceStatus={true}
                presenceStatus="away"
              />
              <span>Always Away</span>
            </div>
          </div>
        </div>

        {/* Real-time Presence */}
        <div className="space-y-3">
          <h4 className="font-medium">2. Real-Time Presence</h4>
          <p className="text-sm text-muted-foreground">
            Uses useRealTimePresence - updates automatically
          </p>
          <div className="flex items-center space-x-3">
            <UserAvatar
              user={exampleUser}
              size="lg"
              showPresenceStatus={true}
              useRealTimePresence={true}
            />
            <span>Live Status</span>
          </div>
        </div>

        {/* Manual Presence Management */}
        <div className="space-y-3">
          <h4 className="font-medium">3. Manual Management</h4>
          <p className="text-sm text-muted-foreground">
            Uses usePresence hook for custom logic
          </p>
          <div className="space-y-2">
            {Object.entries(presenceData).slice(0, 3).map(([username, presence]) => (
              <div key={username} className="flex items-center space-x-3">
                <UserAvatar
                  user={{ username, display_name: username }}
                  size="md"
                  showPresenceStatus={true}
                  presenceStatus={presence.status}
                />
                <div>
                  <div className="text-sm font-medium">{username}</div>
                  <div className="text-xs text-muted-foreground">
                    {presence.status} • {new Date(presence.lastActive).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(presenceData).length === 0 && (
              <p className="text-sm text-muted-foreground">No presence data yet...</p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <h4 className="font-medium mb-2">Usage Examples:</h4>
        <div className="space-y-2 text-sm font-mono bg-muted p-3 rounded">
          <div>{`// Static presence`}</div>
          <div>{`<UserAvatar user={user} showPresenceStatus presenceStatus="online" />`}</div>
          <div className="mt-2">{`// Real-time presence`}</div>
          <div>{`<UserAvatar user={user} showPresenceStatus useRealTimePresence />`}</div>
          <div className="mt-2">{`// Custom presence logic`}</div>
          <div>{`const { getUserPresence } = usePresence()`}</div>
          <div>{`const presence = getUserPresence(user.username)`}</div>
          <div>{`<UserAvatar user={user} showPresenceStatus presenceStatus={presence.status} />`}</div>
        </div>
      </div>
    </Card>
  )
}