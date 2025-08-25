/**
 * ChatWidget - Minimized chat component for system-wide integration
 * Features:
 * - Persistent positioning (fixed bottom-right corner)
 * - Collapsible with unread count badge
 * - Recent conversations (3-5 most recent)
 * - Quick messaging without leaving page
 * - Presence indicators and real-time updates
 * - Click to expand to full chat page
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  X, 
  Minimize2, 
  Maximize2,
  Send,
  Users,
  Phone,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { socketClient } from '@/lib/socket-client';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id: string;
}

interface ChatConversation {
  id: string;
  type: 'dm' | 'channel' | 'group';
  name: string;
  displayName: string;
  participants?: User[];
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: User;
  };
  unreadCount: number;
  isOnline?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

interface ChatWidgetProps {
  currentUser?: User;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
  shape?: 'round' | 'square' | 'rounded-square';
  primaryColor?: string;
  onExpandToFullChat?: () => void;
}

export default function ChatWidget({
  currentUser,
  position = 'bottom-right',
  theme = 'light',
  shape = 'rounded-square',
  primaryColor = '#1976d2',
  onExpandToFullChat
}: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatSystemError, setChatSystemError] = useState<string | null>(null);

  const componentId = useRef(`ChatWidget_${Date.now()}`).current;
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load real conversations from API
  const loadConversations = useCallback(async () => {
    if (!currentUser?.username) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setChatSystemError(null);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setChatSystemError('Authentication required for chat system');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/chat/channels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const realConversations = data.channels?.map((channel: any) => ({
          id: channel.id.toString(),
          type: 'channel' as const,
          name: channel.name,
          displayName: `#${channel.name}`,
          lastMessage: channel.lastMessage ? {
            content: channel.lastMessage.message,
            timestamp: channel.lastMessage.timestamp,
            sender: {
              username: channel.lastMessage.user_id,
              display_name: channel.lastMessage.user_display_name,
              role_id: 'user'
            }
          } : undefined,
          unreadCount: channel.unreadCount || 0,
          isOnline: false,
          status: 'offline' as const
        })) || [];
        
        setConversations(realConversations);
        setTotalUnreadCount(realConversations.reduce((sum: number, conv: any) => sum + conv.unreadCount, 0));
        setChatSystemError(null);
      } else if (response.status === 401) {
        setChatSystemError('Chat authentication failed - please log in again');
      } else if (response.status === 403) {
        setChatSystemError('Insufficient permissions for chat system');
      } else {
        setChatSystemError(`Chat API error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setChatSystemError('Chat system unavailable - server connection failed');
      setConversations([]);
      setTotalUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.username]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!currentUser?.username) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setChatSystemError('Authentication required for chat system');
      return;
    }

    console.log('🔌 Connecting ChatWidget to Socket.io via singleton');
    
    try {
      // Connect using singleton client
      const socket = socketClient.connect(token);
      
      // Load conversations
      loadConversations();
      
      // Handle Socket.io connection errors
      socketClient.addEventListener(componentId, 'connect_error', (error: any) => {
        console.error('Socket.io connection error:', error);
        setChatSystemError('Chat server connection failed - real-time features unavailable');
      });

      socketClient.addEventListener(componentId, 'disconnect', (reason: string) => {
        console.warn('Socket.io disconnected:', reason);
        setChatSystemError('Chat connection lost - attempting to reconnect...');
      });

      socketClient.addEventListener(componentId, 'connect', () => {
        console.log('Socket.io connected successfully');
        setChatSystemError(null);
      });
    } catch (error) {
      console.error('Failed to initialize Socket.io:', error);
      setChatSystemError('Chat system initialization failed');
    }

    // Listen for new messages
    socketClient.addEventListener(componentId, 'message_received', (data: any) => {
      const { message } = data;
      
      // Update conversation with new message
      setConversations(prev => prev.map(conv => {
        if (conv.id === message.channelId.toString()) {
          return {
            ...conv,
            lastMessage: {
              content: message.message,
              timestamp: message.timestamp,
              sender: {
                username: message.userId,
                display_name: message.userDisplayName,
                role_id: 'user'
              }
            },
            unreadCount: conv.unreadCount + (message.userId !== currentUser.username ? 1 : 0)
          };
        }
        return conv;
      }));

      // If this message is for the currently selected chat, add it to messages
      if (selectedChat && message.channelId.toString() === selectedChat.id) {
        setMessages(prev => [...prev, {
          id: message.id,
          message: message.message,
          timestamp: message.timestamp,
          user_id: message.userId,
          user_display_name: message.userDisplayName,
          channel_id: message.channelId
        }]);
      }

      // Update total unread count (only if not the current user's message and not viewing this chat)
      if (message.userId !== currentUser.username && 
          (!selectedChat || selectedChat.id !== message.channelId.toString())) {
        setTotalUnreadCount(prev => prev + 1);
      }
    });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up ChatWidget event listeners for component:', componentId);
      socketClient.removeEventListeners(componentId);
    };
  }, [currentUser?.username, componentId, loadConversations, selectedChat]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  // Shape classes
  const shapeClasses = {
    'round': 'rounded-full',
    'square': 'rounded-none',
    'rounded-square': 'rounded-lg'
  };

  // Handle quick message send
  const handleQuickMessage = useCallback(() => {
    if (!quickMessage.trim() || !selectedChat || !socketClient.isConnected()) return;

    const socket = socketClient.getSocket();
    if (socket) {
      const messageData = {
        channelId: selectedChat.id,
        message: quickMessage.trim(),
        type: 'text'
      };
      
      socket.emit('send_message', messageData);
      
      // Optimistically add message to local state
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        message: quickMessage.trim(),
        timestamp: new Date().toISOString(),
        user_id: currentUser?.username || '',
        user_display_name: currentUser?.display_name || 'You',
        channel_id: selectedChat.id
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
    }

    setQuickMessage('');
  }, [quickMessage, selectedChat, currentUser]);

  // Load recent messages for selected chat
  const loadRecentMessages = useCallback(async (chatId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessages([]);
        return;
      }

      const response = await fetch(`/api/chat/messages?channelId=${chatId}&limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error(`Failed to load messages for chat ${chatId}:`, response.status);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load recent messages:', error);
      setMessages([]);
    }
  }, []);

  // Handle chat selection
  const handleChatSelect = (chat: ChatConversation) => {
    setSelectedChat(chat);
    loadRecentMessages(chat.id);
    
    // Mark as read
    setConversations(prev => prev.map(conv => 
      conv.id === chat.id ? { ...conv, unreadCount: 0 } : conv
    ));
    setTotalUnreadCount(prev => prev - chat.unreadCount);
  };

  // Handle expand to full chat
  const handleExpandToFullChat = () => {
    if (onExpandToFullChat) {
      onExpandToFullChat();
    } else {
      window.location.href = '/chat';
    }
  };

  // Render collapsed widget (floating button)
  if (isMinimized) {
    return (
      <div className={cn(
        'fixed z-50',
        positionClasses[position]
      )}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <Button
            onClick={() => setIsMinimized(false)}
            className={cn(
              'h-12 w-12 shadow-lg hover:shadow-xl',
              shapeClasses[shape]
            )}
            style={{ backgroundColor: primaryColor }}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
          
          {/* Unread badge or error indicator */}
          {chatSystemError ? (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
              !
            </Badge>
          ) : totalUnreadCount > 0 ? (
            <Badge 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          ) : null}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed z-50',
      positionClasses[position]
    )} ref={widgetRef}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="w-80 h-96"
        >
          <Card className="h-full shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-700">
            {/* Widget Header */}
            <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm">
                    Chat 
                    {totalUnreadCount > 0 && (
                      <Badge className="ml-2 h-5 bg-red-500 text-xs">
                        {totalUnreadCount}
                      </Badge>
                    )}
                  </h3>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExpandToFullChat}
                    className="h-6 w-6 p-0 hover:bg-white/50"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="h-6 w-6 p-0 hover:bg-white/50"
                  >
                    <Minimize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 h-[calc(100%-4rem)] flex flex-col">
              {/* Chat System Status/Error Display */}
              {chatSystemError && (
                <div className="p-3 mx-2 mt-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                    <div>
                      <p className="text-xs font-medium text-red-800 mb-1">Chat System Status</p>
                      <p className="text-xs text-red-700">{chatSystemError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {!selectedChat ? (
                /* Recent Conversations List */
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2 px-2">Recent</div>
                    
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-xs text-gray-500">Loading conversations...</div>
                      </div>
                    ) : chatSystemError ? (
                      <div className="flex items-center justify-center py-8 text-center">
                        <div className="text-xs text-gray-500">
                          <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>Chat unavailable</p>
                          <p>Check system status above</p>
                        </div>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-center">
                        <div className="text-xs text-gray-500">
                          <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>No conversations yet</p>
                          <p>Start chatting to see them here</p>
                        </div>
                      </div>
                    ) : (
                      conversations.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleChatSelect(chat)}
                        className="w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex items-center gap-3 text-left transition-colors"
                      >
                        <div className="relative">
                          <UserAvatar
                            user={{
                              display_name: chat.displayName,
                              username: chat.name,
                              profile_picture: ''
                            }}
                            size="sm"
                            showOnlineIndicator={chat.type === 'dm'}
                          />
                          {chat.unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-xs rounded-full flex items-center justify-center">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {chat.displayName}
                            </p>
                            <span className="text-xs text-gray-500">
                              {chat.lastMessage ? formatDistanceToNow(new Date(chat.lastMessage.timestamp), { addSuffix: false }) : ''}
                            </span>
                          </div>
                          {chat.lastMessage && (
                            <p className="text-xs text-gray-500 truncate">
                              {chat.lastMessage.sender.display_name}: {chat.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </button>
                    )))}
                  </div>
                </ScrollArea>
              ) : (
                /* Selected Chat Quick Messaging */
                <div className="flex-1 flex flex-col">
                  {/* Chat Header */}
                  <div className="px-4 py-2 border-b bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedChat(null)}
                        className="h-6 w-6 p-0"
                      >
                        ←
                      </Button>
                      <UserAvatar
                        user={{
                          display_name: selectedChat.displayName,
                          username: selectedChat.name,
                          profile_picture: ''
                        }}
                        size="sm"
                      />
                      <div>
                        <p className="text-sm font-medium">{selectedChat.displayName}</p>
                        <p className="text-xs text-gray-500">
                          {selectedChat.type === 'dm' && selectedChat.status}
                        </p>
                      </div>
                    </div>
                    
                    {selectedChat.type === 'dm' && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Video className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Messages Area - Show recent messages */}
                  <ScrollArea className="flex-1 p-3">
                    {messages.length > 0 ? (
                      <div className="space-y-3">
                        {messages.slice(-3).map((message: any, index: number) => (
                          <div key={message.id || index} className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-600">
                                {message.user_display_name || message.userId}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-sm text-gray-800 bg-gray-50 rounded-lg p-2 ml-2">
                              {message.message}
                            </div>
                          </div>
                        ))}
                        {messages.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-2 border-t">
                            Click "Expand" to view all messages
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div className="text-sm text-gray-500">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No messages yet</p>
                          <p className="text-xs">Start the conversation below</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Quick Message Input */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={quickMessage}
                        onChange={(e) => setQuickMessage(e.target.value)}
                        placeholder={chatSystemError ? "Chat unavailable..." : "Quick message..."}
                        className="flex-1 text-sm"
                        disabled={!!chatSystemError}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleQuickMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleQuickMessage}
                        size="sm"
                        disabled={!quickMessage.trim() || !!chatSystemError}
                        className="px-3"
                        title={chatSystemError ? "Chat system unavailable" : "Send message"}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Hook for managing widget state across pages
export const useChatWidget = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Hide widget on /chat page
    const currentPath = window.location.pathname;
    setIsVisible(currentPath !== '/chat');
  }, []);

  return {
    isVisible,
    isMinimized,
    setIsMinimized
  };
};