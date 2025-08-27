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
import { useThemeCSS } from '@/hooks/useThemeSystem';
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
  refreshTrigger?: number; // Trigger to refresh chat data
}

export default function ChatSidebar({ 
  currentUser, 
  onChatSelect, 
  selectedChatId,
  onCreateChat,
  refreshTrigger
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'dm' | 'channels' | 'groups' | 'online' | 'all'>('all');
  const [chatData, setChatData] = useState<{
    directMessages: ChatItem[];
    channels: ChatItem[];
    groups: ChatItem[];
  }>({
    directMessages: [],
    channels: [],
    groups: []
  });
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showThemeModal, setShowThemeModal] = useState(false);
  const componentId = useRef(`ChatSidebar_${Date.now()}`).current;
  const { settings: chatUISettings, loading: settingsLoading } = useChatSettings();
  
  // Apply theme CSS variables
  const theme = useThemeCSS('internal_chat');
  
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

  // Load real channels and direct messages from API
  useEffect(() => {
    const loadChatsData = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token) return;

        // Load channels and DMs in parallel
        const [channelsResponse, dmsResponse] = await Promise.all([
          fetch('/api/chat/channels', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/chat/dm', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const channels: ChatItem[] = [];
        const groups: ChatItem[] = [];
        const directMessages: ChatItem[] = [];

        // Process channels data
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          
          channelsData.channels.forEach((ch: any) => {
            // Skip direct messages - they'll be handled by the DM API
            if (ch.type === 'direct_message') {
              return;
            }
            
            const chatItem = {
              id: ch.id.toString(),
              type: ch.type === 'group' ? 'group' as const : 'channel' as const,
              name: ch.type === 'group' ? (ch.name || 'Unnamed Group') : (ch.name || 'unnamed').toLowerCase().replace(/\s+/g, '-'),
              displayName: ch.type === 'group' ? (ch.name || 'Unnamed Group') : `#${(ch.name || 'unnamed').toLowerCase().replace(/\s+/g, '-')}`,
              unreadCount: 0, // Will be updated dynamically in getFilteredChats
              lastMessage: ch.description || '',
              lastMessageTime: '',
              isPinned: (ch.name || '').toLowerCase() === 'general',
              isMuted: ch.is_read_only
            };
            
            if (ch.type === 'group') {
              groups.push(chatItem);
            } else {
              channels.push(chatItem);
            }
          });
        }

        // Process DMs data
        if (dmsResponse.ok) {
          try {
            const dmsData = await dmsResponse.json();
            
            dmsData.dms?.forEach((dm: any) => {
              directMessages.push({
                id: dm.id.toString(),
                type: 'dm' as const,
                name: dm.name,
                displayName: dm.displayName,
                participants: dm.participants,
                unreadCount: dm.unreadCount || 0,
                lastMessage: dm.lastMessage || '',
                lastMessageTime: dm.lastMessageTime || '',
                status: dm.participants?.[0]?.presence?.status || 'offline',
                isPinned: false,
                isMuted: false
              });
            });
          } catch (dmError) {
            console.error('Failed to process DMs data:', dmError);
          }
        } else {
          console.error('DMs API failed with status:', dmsResponse.status);
        }

        console.log('📂 ChatSidebar loaded chats:', { 
          channels: channels.length, 
          groups: groups.length, 
          directMessages: directMessages.length 
        });

        setChatData({
          directMessages,
          channels,
          groups
        });
        
        // Load initial unread counts from API
        refreshUnreadCounts();
      } catch (error) {
        console.error('Failed to load chats data:', error);
        
        // Set empty state so sidebar doesn't disappear completely
        setChatData({
          directMessages: [],
          channels: [],
          groups: []
        });
      }
    };

    loadChatsData();
  }, [currentUser, refreshUnreadCounts, refreshTrigger]); // Include refreshTrigger to reload data when new chats are created

  // Load online team members for quick DM access
  useEffect(() => {
    const loadOnlineUsers = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token || !currentUser) return;

        // Use the same endpoint as CreateChatModal for consistency
        const response = await fetch('/api/chat/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.users) {
            // Get online and away users, prioritize team members
            const onlineAndAway = [
              ...(data.users.online || []),
              ...(data.users.away || [])
            ].filter(user => user.username !== currentUser.username); // Exclude self
            
            // Check if user has permission to view all teams, otherwise filter to own team
            const hasViewAllTeamsPermission = currentUser.permissions?.includes('ticket.view_team') || 
                                             currentUser.permissions?.includes('admin.manage_users');
            
            let filteredUsers = onlineAndAway;
            if (!hasViewAllTeamsPermission) {
              // Only show users from the same team
              filteredUsers = onlineAndAway.filter(user => 
                user.is_team_member || user.team_name === currentUser.team_name
              );
            }
            
            console.log('💚 ChatSidebar loaded online users:', filteredUsers.length, 'hasViewAllPermission:', hasViewAllTeamsPermission);
            setOnlineUsers(filteredUsers);
          }
        }
      } catch (error) {
        console.error('Failed to load online users:', error);
        setOnlineUsers([]);
      }
    };

    loadOnlineUsers();
    
    // Refresh online users every 30 seconds
    const interval = setInterval(loadOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, [currentUser, refreshTrigger]);

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
        return chat.displayName || 'Unknown User';

      case 'channel':
        // Channel naming: use the pre-computed displayName with # prefix
        return chat.displayName || 'Unknown Channel';

      case 'group':
        // Group naming: use the group name directly (informal groups have custom names)
        return chat.displayName || 'Unnamed Group';

      default:
        return chat.displayName || 'Unnamed Chat';
    }
  };

  // Handle creating DM directly from online users
  const handleCreateDM = async (user: User) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      if (!token) {
        console.error('No authentication token');
        return;
      }

      console.log('🔗 Creating DM with user:', user.display_name);

      const response = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUsername: user.username
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create DM:', errorData.error);
        return;
      }

      const result = await response.json();
      console.log('✅ DM created/found:', result);

      // Create a basic ChatItem and select it immediately
      const dmChat: ChatItem = {
        id: result.dmId.toString(),
        type: 'dm',
        name: user.username,
        displayName: user.display_name,
        participants: [user],
        unreadCount: 0,
        lastMessage: '',
        lastMessageTime: '',
        isOnline: true,
        status: user.presence?.status || 'online',
        isPinned: false,
        isMuted: false
      };

      // Select this DM immediately
      onChatSelect(dmChat);

      // Refresh chat data to show the new DM in the sidebar
      // Use a small delay to allow the API to process
      setTimeout(() => {
        // Trigger refresh of chat data
        if (refreshTrigger !== undefined) {
          // This will be handled by the parent ChatLayout component
          // For now, we'll rely on the real-time updates to show the DM
        }
      }, 500);

    } catch (error) {
      console.error('Error creating DM:', error);
    }
  };

  // Filter chats based on search and section
  const getFilteredChats = (chats: ChatItem[]) => {
    return chats.filter(chat => {
      const displayName = computeDisplayName(chat);
      const matchesSearch = (displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (chat.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
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
                  isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900'
                }`}
                style={{
                  color: isSelected 
                    ? undefined 
                    : 'var(--chat-text-primary, #212121)'
                }}>
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
          style={{}}
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
              <Settings 
                className="w-4 h-4" 
                style={{ color: 'var(--chat-text-secondary, #757575)' }}
              />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-8 h-8 p-0"
              onClick={onCreateChat}
              title="Create new chat"
            >
              <Plus 
                className="w-4 h-4"
                style={{ color: 'var(--chat-text-secondary, #757575)' }}
              />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--chat-text-secondary)' }} />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8"
            style={{
              backgroundColor: 'var(--chat-surface)',
              borderColor: 'var(--chat-border)',
              color: 'var(--chat-text-primary)'
            }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-3">
          <div className="py-2">
            {/* Section Toggle */}
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'var(--chat-surface)' }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'online', label: 'Online' },
                { key: 'dm', label: 'DMs' },
                { key: 'channels', label: 'Channels' },
                { key: 'groups', label: 'Groups' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key as typeof activeSection)}
                  className="flex-1 px-2 py-1 text-xs rounded-md transition-colors shadow-sm"
                  style={{
                    backgroundColor: activeSection === key ? 'var(--chat-background)' : 'transparent',
                    color: activeSection === key ? 'var(--chat-text-primary)' : 'var(--chat-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== key) {
                      e.currentTarget.style.color = 'var(--chat-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== key) {
                      e.currentTarget.style.color = 'var(--chat-text-secondary)';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chat Sections */}
            <div className="space-y-2">
              {/* Online Users Section */}
              {(activeSection === 'online' || activeSection === 'all') && onlineUsers.length > 0 && (
                <div className="mb-4">
                  <div 
                    className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-md transition-colors duration-200"
                    style={{}}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--chat-secondary, #f5f5f5)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setActiveSection(activeSection === 'online' ? 'all' : 'online')}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                      <span 
                        className="text-sm font-medium" 
                        style={{ color: 'var(--chat-text-primary, #212121)' }}
                      >
                        Online ({onlineUsers.length})
                      </span>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {(activeSection === 'online' || activeSection === 'all') && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1 ml-2">
                          {onlineUsers
                            .filter(user => 
                              !searchQuery || 
                              (user.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (user.username || '').toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map(user => (
                              <motion.div
                                key={user.username}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={() => handleCreateDM(user)}
                                title={`Start conversation with ${user.display_name}`}
                              >
                                <div className="flex-shrink-0 relative">
                                  <UserAvatar 
                                    user={user} 
                                    size="sm"
                                    enableRealTimePresence={chatUISettings.show_online_status}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="font-medium text-sm truncate"
                                      style={{ color: 'var(--chat-text-primary, #212121)' }}
                                    >
                                      {user.display_name}
                                    </span>
                                    {user.is_team_member && (
                                      <span 
                                        className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                        title="Team member"
                                      >
                                        TEAM
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    @{user.username} • {user.team_name || user.role_id}
                                  </p>
                                </div>
                                <MessageCircle className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.div>
                            ))}
                          
                          {onlineUsers.filter(user => 
                            !searchQuery || 
                            (user.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (user.username || '').toLowerCase().includes(searchQuery.toLowerCase())
                          ).length === 0 && (
                            <div className="text-center py-4 text-sm text-gray-500">
                              {searchQuery ? 'No online users found' : 'No team members online'}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

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