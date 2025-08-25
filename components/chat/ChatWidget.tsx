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
import io, { Socket } from 'socket.io-client';

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

  const socketRef = useRef<Socket | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Mock recent conversations for development
  const mockConversations: ChatConversation[] = [
    {
      id: '1',
      type: 'dm',
      name: 'john.smith',
      displayName: 'John Smith',
      lastMessage: {
        content: 'Hey, can you check the server status?',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        sender: { username: 'john.smith', display_name: 'John Smith', role_id: 'support' }
      },
      unreadCount: 2,
      isOnline: true,
      status: 'online'
    },
    {
      id: '2',
      type: 'dm', 
      name: 'jane.doe',
      displayName: 'Jane Doe',
      lastMessage: {
        content: 'Thanks for the help!',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        sender: { username: 'jane.doe', display_name: 'Jane Doe', role_id: 'user' }
      },
      unreadCount: 0,
      isOnline: true,
      status: 'away'
    },
    {
      id: '3',
      type: 'channel',
      name: 'general',
      displayName: '#general',
      lastMessage: {
        content: 'Meeting starts in 10 minutes',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        sender: { username: 'admin', display_name: 'Admin', role_id: 'admin' }
      },
      unreadCount: 1,
      isOnline: false,
      status: 'offline'
    }
  ];

  // Initialize conversations and Socket.io
  useEffect(() => {
    if (!currentUser?.username) return;

    // Set mock conversations
    setConversations(mockConversations);
    setTotalUnreadCount(mockConversations.reduce((sum, conv) => sum + conv.unreadCount, 0));

    // Initialize Socket.io connection
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    if (!token) return;

    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.emit('authenticate', token);

    // Listen for new messages
    socket.on('message_received', (data) => {
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

      // Update total unread count
      if (message.userId !== currentUser.username) {
        setTotalUnreadCount(prev => prev + 1);
      }
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.username]);

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
    if (!quickMessage.trim() || !selectedChat || !socketRef.current?.connected) return;

    socketRef.current.emit('send_message', {
      channelId: selectedChat.id,
      message: quickMessage.trim(),
      type: 'text'
    });

    setQuickMessage('');
  }, [quickMessage, selectedChat]);

  // Handle chat selection
  const handleChatSelect = (chat: ChatConversation) => {
    setSelectedChat(chat);
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
          
          {/* Unread badge */}
          {totalUnreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
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
              {!selectedChat ? (
                /* Recent Conversations List */
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2 px-2">Recent</div>
                    {conversations.map((chat) => (
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
                    ))}
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
                  
                  {/* Messages Area - Simplified for quick view */}
                  <div className="flex-1 p-4 flex items-center justify-center text-center">
                    <div className="text-sm text-gray-500">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Click "Expand" to view full conversation</p>
                    </div>
                  </div>
                  
                  {/* Quick Message Input */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={quickMessage}
                        onChange={(e) => setQuickMessage(e.target.value)}
                        placeholder="Quick message..."
                        className="flex-1 text-sm"
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
                        disabled={!quickMessage.trim()}
                        className="px-3"
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