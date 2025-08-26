/**
 * Chat Page - Main chat interface with mobile-first design
 * Located at /chat - primary testing route for chat functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MessageCircle, Users, Hash } from 'lucide-react';
import ChatLayout from '@/components/chat/ChatLayout';
import { ThemeSystemProvider } from '@/hooks/useThemeSystem';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id: string;
  permissions?: string[];
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatSystemEnabled, setChatSystemEnabled] = useState(false);
  const [showDevInfo, setShowDevInfo] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat-show-dev-info');
      return saved !== 'false'; // Default to true, hide only if explicitly set to false
    }
    return true;
  });

  // Check authentication and load user data
  useEffect(() => {
    checkAuthAndLoadUser();
  }, []);

  const checkAuthAndLoadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      if (!token) {
        setError('Please log in to access the chat system');
        setIsLoading(false);
        return;
      }

      // Fetch current user data
      const userResponse = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to load user data');
      }

      const userData = await userResponse.json();
      
      // Check chat permissions
      const hasBasicChatPermission = userData.permissions?.includes('chat.access') ||
                                    userData.permissions?.includes('chat.send_messages') ||
                                    userData.permissions?.includes('chat.basic_messaging') ||
                                    userData.role === 'admin';

      if (!hasBasicChatPermission) {
        setError('You do not have permission to access the chat system');
        setIsLoading(false);
        return;
      }

      setCurrentUser({
        username: userData.username,
        display_name: userData.display_name,
        profile_picture: userData.profile_picture,
        role_id: userData.role,
        permissions: userData.permissions || []
      });

      // Check if chat system is enabled
      await checkChatSystemStatus();

    } catch (error) {
      console.error('Failed to load chat page:', error);
      setError('Failed to load chat system. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkChatSystemStatus = async () => {
    try {
      // Use the public widget settings API to check if chat is enabled
      const response = await fetch('/api/chat/widget-settings');
      if (response.ok) {
        const settings = await response.json();
        // If widget is enabled, chat system is enabled
        setChatSystemEnabled(settings.enabled === true);
      } else {
        // Default to enabled if we can't check settings
        console.log('Could not check chat system status, defaulting to enabled');
        setChatSystemEnabled(true);
      }
    } catch (error) {
      console.error('Failed to check chat system status:', error);
      // Default to enabled if we can't check
      setChatSystemEnabled(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold">Loading Chat System</h2>
            <p className="text-gray-500">Please wait while we set up your chat experience...</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
              Chat System Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <div className="space-y-2">
              <Button 
                onClick={checkAuthAndLoadUser}
                className="w-full"
              >
                Retry
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/tickets'}
                className="w-full"
              >
                Return to Tickets
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Chat system disabled
  if (!chatSystemEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Chat System Disabled
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The chat system is currently disabled by your administrator.
              Please check back later or contact your system administrator.
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/tickets'}
              className="w-full"
            >
              Return to Tickets
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Main chat interface
  return (
    <ThemeSystemProvider>
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header bar with system info */}
      <div 
        className="border-b px-4 py-2 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--chat-sidebar, #ffffff)',
          borderBottomColor: 'var(--chat-border, #e0e0e0)',
          color: 'var(--chat-text-primary, #212121)'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageCircle 
              className="w-5 h-5"
              style={{ color: 'var(--chat-accent, #2563eb)' }}
            />
            <h1 
              className="text-lg font-semibold"
              style={{ color: 'var(--chat-text-primary, #212121)' }}
            >
              Orvale Chat System
            </h1>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p 
              className="text-sm font-medium"
              style={{ color: 'var(--chat-text-primary, #212121)' }}
            >
              {currentUser?.display_name}
            </p>
            <p 
              className="text-xs capitalize"
              style={{ color: 'var(--chat-text-secondary, #757575)' }}
            >
              {currentUser?.role_id}
            </p>
          </div>
          
          {/* Quick stats */}
          <div 
            className="flex items-center gap-3 text-sm"
            style={{ color: 'var(--chat-text-secondary, #757575)' }}
          >
            <div className="flex items-center gap-1" title="Direct Messages">
              <MessageCircle 
                className="w-3 h-3" 
                style={{ color: 'var(--chat-text-secondary, #757575)' }}
              />
              <span className="hidden sm:inline">DMs</span>
            </div>
            <div className="flex items-center gap-1" title="Channels">
              <Hash 
                className="w-3 h-3"
                style={{ color: 'var(--chat-text-secondary, #757575)' }}
              />
              <span className="hidden sm:inline">Channels</span>
            </div>
            <div className="flex items-center gap-1" title="Groups">
              <Users 
                className="w-3 h-3"
                style={{ color: 'var(--chat-text-secondary, #757575)' }}
              />
              <span className="hidden sm:inline">Groups</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat layout */}
      <div className="h-[calc(100vh-60px)]">
        <ChatLayout 
          currentUser={currentUser} 
          initialChatId={null}
        />
      </div>

      {/* Development info (only in dev mode) */}
      {process.env.NODE_ENV === 'development' && showDevInfo && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="p-3 bg-yellow-50 border-yellow-200">
            <div className="text-xs text-yellow-800 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">🚀 Development Mode</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 text-yellow-600 hover:text-yellow-800"
                  onClick={() => {
                    setShowDevInfo(false);
                    localStorage.setItem('chat-show-dev-info', 'false');
                  }}
                  title="Hide development info"
                >
                  ×
                </Button>
              </div>
              <p>Socket.io: <span className="font-mono">localhost:3001</span></p>
              <p>User: <span className="font-mono">{currentUser?.username}</span></p>
              <p>Permissions: <span className="font-mono">{currentUser?.permissions?.length || 0}</span></p>
            </div>
          </Card>
        </div>
      )}
      
      {/* Show development info toggle (if hidden) */}
      {process.env.NODE_ENV === 'development' && !showDevInfo && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
            onClick={() => {
              setShowDevInfo(true);
              localStorage.setItem('chat-show-dev-info', 'true');
            }}
            title="Show development info"
          >
            🚀
          </Button>
        </div>
      )}
      </div>
    </ThemeSystemProvider>
  );
}