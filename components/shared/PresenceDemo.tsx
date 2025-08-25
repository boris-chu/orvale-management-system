/**
 * PresenceDemo - Demo component showcasing OnlinePresenceTracker functionality
 * This can be used for testing and showcasing real-time presence features
 */

'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OnlinePresenceTracker, { usePresenceManager } from './OnlinePresenceTracker';
import { UserAvatar, UserAvatarWithPresence } from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';

// Sample users for demonstration
const sampleUsers = [
  {
    username: 'john.doe',
    display_name: 'John Doe',
    email: 'john.doe@company.com',
    role_id: 'admin'
  },
  {
    username: 'jane.smith',
    display_name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role_id: 'support'
  },
  {
    username: 'bob.wilson',
    display_name: 'Bob Wilson',
    email: 'bob.wilson@company.com',
    role_id: 'it_user'
  },
  {
    username: 'alice.johnson',
    display_name: 'Alice Johnson',
    email: 'alice.johnson@company.com',
    role_id: 'manager'
  }
];

export default function PresenceDemo() {
  const [selectedUser, setSelectedUser] = useState(sampleUsers[0]);
  const { currentStatus, updateStatus, isConnected } = usePresenceManager();

  const handleStatusChange = (status: 'online' | 'away' | 'busy' | 'offline') => {
    const statusMessages = {
      online: 'Available for chat',
      away: 'Away from desk',
      busy: 'In a meeting',
      offline: 'Gone for the day'
    };

    updateStatus(status, statusMessages[status], 'Working on tickets');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">🟢 OnlinePresenceTracker Demo</h1>
        <p className="text-blue-100">Real-time presence system integration showcase</p>
        <div className="mt-3 flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            Socket.io: {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant="outline" className="text-white border-white">
            Your Status: {currentStatus}
          </Badge>
        </div>
      </div>

      {/* Status Controls */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">🎛️ Status Controls</h2>
          <p className="text-sm text-gray-600">Change your presence status and see real-time updates</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={currentStatus === 'online' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('online')}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Online
            </Button>
            <Button 
              variant={currentStatus === 'away' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('away')}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              Away
            </Button>
            <Button 
              variant={currentStatus === 'busy' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('busy')}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Busy
            </Button>
            <Button 
              variant={currentStatus === 'offline' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('offline')}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              Offline
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Component Variations */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Presence Indicators */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">🔴 Basic Presence Dots</h2>
            <p className="text-sm text-gray-600">Simple status indicators in different sizes</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-16 text-sm">Small:</span>
              <OnlinePresenceTracker userId={selectedUser.username} size="sm" />
              <span className="text-xs text-gray-500">For compact displays</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 text-sm">Medium:</span>
              <OnlinePresenceTracker userId={selectedUser.username} size="md" />
              <span className="text-xs text-gray-500">Default size</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 text-sm">Large:</span>
              <OnlinePresenceTracker userId={selectedUser.username} size="lg" />
              <span className="text-xs text-gray-500">For prominent displays</span>
            </div>
          </CardContent>
        </Card>

        {/* Status with Text */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">📝 Status with Text</h2>
            <p className="text-sm text-gray-600">Detailed presence information</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <OnlinePresenceTracker 
              userId={selectedUser.username} 
              size="md" 
              showStatus={true}
            />
            <OnlinePresenceTracker 
              userId={selectedUser.username} 
              size="lg" 
              showStatus={true}
              showConnectionCount={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* User Avatar Integration */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">👤 UserAvatar Integration</h2>
          <p className="text-sm text-gray-600">Real-time presence with user avatars</p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sampleUsers.map((user) => (
              <div key={user.username} className="text-center space-y-2">
                <UserAvatarWithPresence
                  user={user}
                  size="xl"
                  showStatus={true}
                  showConnectionCount={false}
                />
                <div className="text-sm">
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-gray-500">{user.role_id}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Selection */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">🔍 Test Different Users</h2>
          <p className="text-sm text-gray-600">Select a user to track their presence</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {sampleUsers.map((user) => (
              <Button
                key={user.username}
                variant={selectedUser.username === user.username ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedUser(user)}
              >
                {user.display_name}
              </Button>
            ))}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Currently tracking: {selectedUser.display_name}</h3>
            <div className="flex items-center gap-4">
              <UserAvatar 
                user={selectedUser} 
                size="lg"
                enableRealTimePresence={true}
              />
              <OnlinePresenceTracker 
                userId={selectedUser.username} 
                showStatus={true}
                showConnectionCount={true}
                size="md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Information */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">⚙️ Technical Details</h2>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900">Features Demonstrated:</h4>
              <ul className="mt-1 text-gray-600 space-y-1">
                <li>• Real-time status updates via Socket.io</li>
                <li>• Multiple size variants (sm, md, lg)</li>
                <li>• Animated pulse for online status</li>
                <li>• Connection count indicators</li>
                <li>• Integration with existing UserAvatar</li>
                <li>• Custom status messages</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Socket.io Events:</h4>
              <ul className="mt-1 text-gray-600 space-y-1">
                <li>• <code>update_presence</code> - Status changes</li>
                <li>• <code>presence_updated</code> - Broadcast updates</li>
                <li>• <code>presence:update</code> - Connection changes</li>
                <li>• Multi-tab connection tracking</li>
                <li>• Automatic cleanup on disconnect</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}