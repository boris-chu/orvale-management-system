/**
 * ChatSidebar - Main chat navigation with 3 sections: Direct Messages, Channels, Groups
 * Implements specific naming rules for each section type
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Hash, 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal,
  Volume2,
  Video,
  Phone,
  Settings,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '@/components/UserAvatar';
import OnlinePresenceTracker from '@/components/shared/OnlinePresenceTracker';
import { socketClient } from '@/lib/socket-client';
import { useChatSettings } from '@/hooks/useChatSettings';
import { cn } from '@/lib/utils';
import UserThemeModal from './UserThemeModal';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id: string;
}

interface ChatItem {
  id: string;
  type: 'dm' | 'channel' | 'group';
  name: string;
  displayName: string; // Computed display name based on type
  participants?: User[];
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
  isPinned?: boolean;
  isMuted?: boolean;
}

interface ChatSidebarProps {
  currentUser?: User;
  onChatSelect: (chat: ChatItem) => void;
  selectedChatId?: string;
  onCreateChat?: () => void;
}

export default function ChatSidebar({ 
  currentUser, 
  onChatSelect, 
  selectedChatId,
  onCreateChat 
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'dm' | 'channels' | 'groups' | 'all'>('all');
  const [chatData, setChatData] = useState<{
    directMessages: ChatItem[];
    channels: ChatItem[];
    groups: ChatItem[];
  }>({
    directMessages: [],
    channels: [],
    groups: []
  });
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showThemeModal, setShowThemeModal] = useState(false);
  const componentId = useRef(`ChatSidebar_${Date.now()}`).current;
  const { settings: chatUISettings, loading: settingsLoading } = useChatSettings();
  
  // Function to refresh unread counts from API (authoritative source)
  const refreshUnreadCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      if (!token) return;

      const response = await fetch('/api/chat/channels', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const newUnreadCounts: Record<string, number> = {};
        
        data.channels?.forEach((channel: any) => {
          newUnreadCounts[channel.id.toString()] = channel.unread_count || 0;
        });
        
        console.log('📊 ChatSidebar: Refreshed unread counts from API:', newUnreadCounts);
        setUnreadCounts(newUnreadCounts);
      }
    } catch (error) {
      console.error('Failed to refresh unread counts:', error);
    }
  }, []);
  
  // Debug logging for badge settings
  useEffect(() => {
    console.log('🔧 ChatSidebar Settings Debug:', {
      show_unread_badges: chatUISettings.show_unread_badges,
      show_zero_counts: chatUISettings.show_zero_counts,
      settingsLoading,
      unreadCounts
    });
  }, [chatUISettings, settingsLoading, unreadCounts]);

  // Load real channels from API
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token) return;

        const response = await fetch('/api/chat/channels', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Transform API data to component format (unread counts applied dynamically in getFilteredChats)
          const channels = data.channels.map((ch: any) => ({
            id: ch.id.toString(),
            type: 'channel' as const,
            name: ch.name.toLowerCase().replace(/\s+/g, '-'),
            displayName: `#${ch.name.toLowerCase().replace(/\s+/g, '-')}`,
            unreadCount: 0, // Will be updated dynamically in getFilteredChats
            lastMessage: ch.description || '',
            lastMessageTime: '',
            isPinned: ch.name === 'General',
            isMuted: ch.is_read_only
          }));

          setChatData({
            directMessages: [],
            channels,
            groups: []
          });
          
          // Load initial unread counts from API
          refreshUnreadCounts();
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };

    loadChannels();
  }, [currentUser, refreshUnreadCounts]); // Include refreshUnreadCounts dependency

  // Socket.io connection for real-time updates using singleton
  useEffect(() => {
    if (!currentUser) return;

    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
    if (!token) return;

    console.log('🔌 Connecting ChatSidebar to Socket.io via singleton');
    
    // Connect using singleton client
    const socket = socketClient.connect(token);

    // Listen for new message notifications to trigger unread count refresh from API
    socketClient.addEventListener(componentId, 'message_notification', (data: any) => {
      const { message, channel } = data;
      const channelId = channel.id.toString();
      
      console.log('📬 ChatSidebar received message notification for channel:', channelId, 'from:', message.userDisplayName);
      console.log('📬 Current selectedChatId:', selectedChatId, 'Current user:', currentUser?.username);
      
      // Instead of incrementing manually, refresh unread counts from API
      // This ensures we get the authoritative count based on last_read_at
      if (message.userId !== currentUser?.username) {
        console.log('📊 ChatSidebar: Refreshing unread counts from API due to new message');
        refreshUnreadCounts();
      }
    });

    return () => {
      console.log('🧹 Cleaning up ChatSidebar event listeners for component:', componentId);
      socketClient.removeEventListeners(componentId);
    };
  }, [currentUser, selectedChatId, componentId]);
  
  // Note: ChatSidebar does NOT join channels directly
  // Only MessageArea joins channels when they're actively selected
  // ChatSidebar receives global message_notification events for unread counts

  // Clear unread count when selecting a chat
  useEffect(() => {
    if (selectedChatId) {
      setUnreadCounts(prev => ({
        ...prev,
        [selectedChatId]: 0
      }));
    }
  }, [selectedChatId]);

  // Compute display names based on chat type and naming rules
  const computeDisplayName = (chat: ChatItem): string => {
    switch (chat.type) {
      case 'dm':
        // DM naming: show only other participant's name (not 'DM: Boris & John')
        if (chat.participants && currentUser) {
          const otherParticipant = chat.participants.find(p => p.username !== currentUser.username);
          return otherParticipant?.display_name || 'Unknown User';
        }
        return chat.displayName;

      case 'channel':
        // Channel naming: use the pre-computed displayName with # prefix
        return chat.displayName;

      case 'group':
        // Group naming rules:
        if (chat.participants && currentUser) {
          const otherParticipants = chat.participants.filter(p => p.username !== currentUser.username);
          
          if (otherParticipants.length <= 2) {
            // 2-3 people: 'John Doe & Jane Smith'
            return otherParticipants.map(p => p.display_name).join(' & ');
          } else {
            // 3+ people: 'John, Jane, Person 3' or 'Alice, Bob, Carol & 2 others'
            const firstTwo = otherParticipants.slice(0, 2).map(p => p.display_name);
            const remaining = otherParticipants.length - 2;
            
            if (remaining === 1) {
              return `${firstTwo.join(', ')} & ${otherParticipants[2].display_name}`;
            } else {
              return `${firstTwo.join(', ')} & ${remaining} others`;
            }
          }
        }
        return chat.displayName;

      default:
        return chat.displayName;
    }
  };

  // Filter chats based on search and section
  const getFilteredChats = (chats: ChatItem[]) => {
    return chats.filter(chat => {
      const displayName = computeDisplayName(chat);
      const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).map(chat => ({
      ...chat,
      unreadCount: unreadCounts[chat.id] || 0
    }));
  };

  // Get total unread count for a section
  const getUnreadCount = (chats: ChatItem[]) => {
    return chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  };

  // Format time display
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    // Simple format for now - can be enhanced with proper date formatting
    return timeString;
  };

  const renderChatItem = (chat: ChatItem) => {
    const displayName = computeDisplayName(chat);
    const isSelected = selectedChatId === chat.id;
    const otherParticipant = chat.type === 'dm' && chat.participants 
      ? chat.participants.find(p => p.username !== currentUser?.username)
      : null;

    return (
      <motion.div
        key={chat.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          onClick={() => onChatSelect(chat)}
        >
          {/* Chat Icon/Avatar */}
          <div className="flex-shrink-0">
            {chat.type === 'dm' && otherParticipant ? (
              <div className="relative">
                <UserAvatar 
                  user={otherParticipant} 
                  size="md"
                  enableRealTimePresence={chatUISettings.show_online_status}
                />
              </div>
            ) : chat.type === 'channel' ? (
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Hash className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Chat Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`font-medium text-sm truncate ${
                  isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {displayName}
                </span>
                
                {/* Status indicators */}
                {chat.isPinned && (
                  <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                )}
                {chat.isMuted && (
                  <div className="w-3 h-3 text-gray-400 flex-shrink-0">🔇</div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-gray-500">
                  {formatTime(chat.lastMessageTime)}
                </span>
                {/* Unread Badge - Fixed Conditional Rendering */}
                {(() => {
                  if (settingsLoading) return null;
                  if (!chatUISettings.show_unread_badges) return null;
                  if (chat.unreadCount === 0 && !chatUISettings.show_zero_counts) return null;
                  
                  console.log('🔧 ChatSidebar Chat Badge Debug:', {
                    badgeStyle: chatUISettings.unread_badge_style,
                    badgeColor: chatUISettings.unread_badge_color,
                    chatName: chat.displayName,
                    unreadCount: chat.unreadCount
                  });
                  
                  return (
                    <Badge 
                      className={cn(
                        "text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center font-medium flex-shrink-0",
                        chatUISettings.unread_badge_style === 'rounded' && "!rounded-md",
                        chatUISettings.unread_badge_style === 'square' && "!rounded-none", 
                        chatUISettings.unread_badge_style === 'pill' && "!rounded-full"
                      )}
                      style={{ 
                        backgroundColor: chatUISettings.unread_badge_color, 
                        color: chatUISettings.unread_badge_text_color 
                      }}
                    >
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </Badge>
                  );
                })()}
              </div>
            </div>
            
            {chat.lastMessage && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {chat.lastMessage}
              </p>
            )}
          </div>

          {/* Quick Actions (appear on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {chat.type === 'dm' && (
              <>
                <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                  <Phone className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                  <Video className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title: string, chats: ChatItem[], icon: React.ReactNode, type: 'dm' | 'channels' | 'groups') => {
    const filteredChats = getFilteredChats(chats);
    const unreadCount = getUnreadCount(filteredChats);
    const isActive = activeSection === type || activeSection === 'all';

    return (
      <div className="mb-4">
        <div 
          className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-md transition-colors duration-200"
          style={{ 
            ':hover': { backgroundColor: 'var(--chat-secondary, #f5f5f5)' }
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--chat-secondary, #f5f5f5)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => setActiveSection(activeSection === type ? 'all' : type)}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span 
              className="text-sm font-medium" 
              style={{ color: 'var(--chat-text-primary, #212121)' }}
            >
              {title}
            </span>
            {/* Section Unread Badge - Fixed Conditional Rendering */}
            {(() => {
              if (settingsLoading) return null;
              if (!chatUISettings.show_unread_badges) return null;
              if (unreadCount === 0 && !chatUISettings.show_zero_counts) return null;
              
              console.log('🔧 ChatSidebar Section Badge Debug:', {
                badgeStyle: chatUISettings.unread_badge_style,
                badgeColor: chatUISettings.unread_badge_color,
                unreadCount,
                title
              });
              
              return (
                <Badge 
                  className={cn(
                    "text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center font-medium",
                    chatUISettings.unread_badge_style === 'rounded' && "!rounded-md",
                    chatUISettings.unread_badge_style === 'square' && "!rounded-none",
                    chatUISettings.unread_badge_style === 'pill' && "!rounded-full"
                  )}
                  style={{ 
                    backgroundColor: chatUISettings.unread_badge_color, 
                    color: chatUISettings.unread_badge_text_color 
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              );
            })()}
          </div>
          
          <div className="flex items-center gap-1">
            {type === 'groups' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-5 h-5 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChat?.();
                }}
                title="Create new group chat"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 ml-2">
                {filteredChats.length > 0 ? (
                  filteredChats.map(chat => renderChatItem(chat))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    {searchQuery ? 'No chats found' : `No ${title.toLowerCase()} yet`}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Card 
      className="h-full flex flex-col"
      style={{ backgroundColor: 'var(--chat-sidebar, #ffffff)' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 
            className="text-lg font-semibold" 
            style={{ color: 'var(--chat-text-primary, #212121)' }}
          >
            Chat
          </h2>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-8 h-8 p-0"
              onClick={() => setShowThemeModal(true)}
              title="Chat theme settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-8 h-8 p-0"
              onClick={onCreateChat}
              title="Create new chat"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-3">
          <div className="py-2">
            {/* Section Toggle */}
            <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {[
                { key: 'all', label: 'All' },
                { key: 'dm', label: 'DMs' },
                { key: 'channels', label: 'Channels' },
                { key: 'groups', label: 'Groups' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as typeof activeSection)}
                  className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
                    activeSection === key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chat Sections */}
            <div className="space-y-2">
              {renderSection(
                'Direct Messages', 
                chatData.directMessages, 
                <MessageCircle className="w-4 h-4 text-blue-500" />,
                'dm'
              )}
              
              {renderSection(
                'Channels', 
                chatData.channels, 
                <Hash className="w-4 h-4 text-green-500" />,
                'channels'
              )}
              
              {renderSection(
                'Groups', 
                chatData.groups, 
                <Users className="w-4 h-4 text-purple-500" />,
                'groups'
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
      
      {/* User Theme Selection Modal */}
      <UserThemeModal 
        open={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />
    </Card>
  );
}