/**
 * ChatLayout - Mobile-first main chat interface
 * Implements mobile-first approach with progressive enhancement for desktop
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  X, 
  ArrowLeft, 
  Phone, 
  Video, 
  Search,
  MoreVertical,
  Info,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ChatSidebar from './ChatSidebar';
import MessageArea from './MessageArea';
import ChatInfoPanel from './ChatInfoPanel';
import ChatMoreOptions from './ChatMoreOptions';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery';
import { useThemeCSS } from '@/hooks/useThemeSystem';
import { useCallManager } from '@/hooks/useCallManager';
import WebRTCCall from './WebRTCCall';
import IncomingCallNotification from './IncomingCallNotification';
import CreateChatModal from './CreateChatModal';

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
  displayName: string;
  participants?: User[];
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
  isPinned?: boolean;
  isMuted?: boolean;
}

interface ChatLayoutProps {
  currentUser?: User;
  initialChatId?: string;
}

export default function ChatLayout({ currentUser, initialChatId }: ChatLayoutProps) {
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [moreOptionsAnchor, setMoreOptionsAnchor] = useState<HTMLElement | null>(null);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  
  // Apply theme CSS
  const currentTheme = useThemeCSS('internal_chat');
  
  // Responsive breakpoints
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  // Call management
  const callManager = currentUser ? useCallManager({
    currentUser,
    enableNotifications: true,
    enableRingtones: true
  }) : null;

  // Mobile-first: sidebar is overlay on mobile, fixed on desktop
  const sidebarMode = isMobile ? 'overlay' : isTablet ? 'slide' : 'fixed';
  
  const handleChatSelect = useCallback(async (chat: ChatItem) => {
    setSelectedChat(chat);
    // On mobile, close sidebar when chat is selected
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    // Load member count for non-DM chats if not cached
    if (chat.type !== 'dm' && !memberCounts[chat.id]) {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (token) {
          const response = await fetch(`/api/chat/channels/${chat.id}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setMemberCounts(prev => ({
              ...prev,
              [chat.id]: data.members?.length || 0
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load member count:', error);
      }
    }
  }, [isMobile, memberCounts]);

  const handleBackToList = useCallback(() => {
    if (isMobile) {
      setSelectedChat(null);
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  // Handle escape key to close overlays
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showChatInfo) {
          setShowChatInfo(false);
        } else if (sidebarOpen && isMobile) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showChatInfo, sidebarOpen, isMobile]);

  // Chat header component
  const ChatHeader = () => {
    if (!selectedChat) return null;

    return (
      <div 
        className="flex items-center justify-between p-4 border-b"
        style={{
          backgroundColor: 'var(--chat-surface, #ffffff)',
          borderColor: 'var(--chat-border, #3a3a3a)',
          color: 'var(--chat-text-primary, #212121)'
        }}
      >
        {/* Mobile back button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="mr-2 p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Chat info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {selectedChat.displayName}
            </h2>
            {selectedChat.type === 'dm' && selectedChat.status && (
              <p className="text-sm text-gray-500 capitalize">
                {selectedChat.status}
                {selectedChat.lastMessage && ` • ${selectedChat.lastMessageTime}`}
              </p>
            )}
            {selectedChat.type !== 'dm' && (
              <p className="text-sm text-gray-500">
                {memberCounts[selectedChat.id] ?? selectedChat.participants?.length ?? '...'} members
                {selectedChat.lastMessage && ` • ${selectedChat.lastMessageTime}`}
              </p>
            )}
          </div>

          {/* Unread badge */}
          {selectedChat.unreadCount && selectedChat.unreadCount > 0 && (
            <Badge variant="destructive" className="flex-shrink-0">
              {selectedChat.unreadCount > 99 ? '99+' : selectedChat.unreadCount}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Call buttons for DMs */}
          {selectedChat.type === 'dm' && currentUser && callManager && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 touch-manipulation"
                title="Voice call"
                onClick={() => {
                  const targetUser = {
                    username: selectedChat.name,
                    display_name: selectedChat.displayName,
                    profile_picture: selectedChat.participants?.[0]?.profile_picture
                  };
                  callManager.startCall(targetUser, 'audio');
                }}
                disabled={!callManager.canMakeCalls('audio')}
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 touch-manipulation"
                title="Video call"
                onClick={() => {
                  const targetUser = {
                    username: selectedChat.name,
                    display_name: selectedChat.displayName,
                    profile_picture: selectedChat.participants?.[0]?.profile_picture
                  };
                  callManager.startCall(targetUser, 'video');
                }}
                disabled={!callManager.canMakeCalls('video')}
              >
                <Video className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className="p-2 touch-manipulation"
            title="Search in chat"
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Chat info toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChatInfo(!showChatInfo)}
            className="p-2 touch-manipulation"
            title="Chat info"
          >
            <Info className="w-4 h-4" />
          </Button>

          {/* Menu (mobile) / More (desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => setMoreOptionsAnchor(e.currentTarget)}
            className="p-2 touch-manipulation"
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--chat-secondary, #f5f5f5)' }}
        >
          <Menu className="w-8 h-8" style={{ color: 'var(--chat-text-secondary, #757575)' }} />
        </div>
        <h3 
          className="text-lg font-medium mb-2"
          style={{ color: 'var(--chat-text-primary, #212121)' }}
        >
          {isMobile ? 'Select a chat to start' : 'Welcome to Chat'}
        </h3>
        <p 
          className="mb-4"
          style={{ color: 'var(--chat-text-secondary, #757575)' }}
        >
          {isMobile 
            ? 'Tap a conversation from the sidebar to begin messaging'
            : 'Choose a conversation from the sidebar or start a new one'
          }
        </p>
        {!isMobile && (
          <Button 
            variant="outline"
            onClick={() => setSidebarOpen(true)}
            className="touch-manipulation"
          >
            Open Sidebar
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className="h-full flex transition-colors duration-200"
      style={{ backgroundColor: `var(--chat-background, #f9fafb)` }}
    >
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(sidebarOpen || isDesktop) && (
          <>
            {/* Sidebar overlay (mobile only) */}
            {isMobile && sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar content */}
            <motion.div
              initial={isMobile ? { x: -300 } : { x: 0 }}
              animate={{ x: 0 }}
              exit={isMobile ? { x: -300 } : { x: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                duration: 0.3
              }}
              className={cn(
                "transition-colors duration-200",
                // Mobile: fixed overlay
                isMobile && "fixed inset-y-0 left-0 z-50 w-80 shadow-xl",
                // Tablet: slide panel
                isTablet && "w-80 flex-shrink-0",
                // Desktop: fixed sidebar
                isDesktop && "w-80 flex-shrink-0"
              )}
              style={{
                backgroundColor: `var(--chat-sidebar, #ffffff)`
              }}
            >
              {/* Mobile sidebar header */}
              {isMobile && (
                <div 
                  className="flex items-center justify-between p-4 border-b transition-colors duration-200"
                  style={{ borderColor: `var(--chat-border, #3a3a3a)` }}
                >
                  <h2 
                    className="text-lg font-semibold transition-colors duration-200"
                    style={{ color: `var(--chat-text-primary, #111827)` }}
                  >
                    Chats
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className="p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className={cn("h-full", isMobile && "mt-0")}>
                <ChatSidebar
                  currentUser={currentUser}
                  onChatSelect={handleChatSelect}
                  selectedChatId={selectedChat?.id}
                  onCreateChat={() => setShowCreateChatModal(true)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile: show hamburger when sidebar is closed and no chat selected */}
        {isMobile && !sidebarOpen && !selectedChat && (
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="mr-2 p-2"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Chat</h1>
          </div>
        )}

        {selectedChat ? (
          <>
            <ChatHeader />
            <div className="flex-1 flex min-h-0">
              {/* Message area */}
              <div className="flex-1 flex flex-col">
                <MessageArea 
                  chat={selectedChat} 
                  currentUser={currentUser}
                />
              </div>

              {/* Chat info panel (desktop only, or mobile sheet) */}
              <AnimatePresence>
                {showChatInfo && selectedChat && (
                  <>
                    {isMobile ? (
                      /* Mobile: Full screen overlay */
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-white dark:bg-gray-900 z-50"
                      >
                        <ChatInfoPanel
                          chat={selectedChat}
                          currentUser={currentUser}
                          onClose={() => setShowChatInfo(false)}
                          onUpdateChat={(updates) => {
                            setSelectedChat(prev => prev ? { ...prev, ...updates } : null);
                            // TODO: Update chat via API
                          }}
                          onLeaveChat={() => {
                            setShowChatInfo(false);
                            setSelectedChat(null);
                            // TODO: Leave chat via API
                          }}
                          onAddMembers={() => {
                            setShowChatInfo(false);
                            setShowCreateChatModal(true);
                          }}
                        />
                      </motion.div>
                    ) : (
                      /* Desktop: Side panel */
                      <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0"
                        style={{
                          backgroundColor: 'var(--chat-background, #ffffff)',
                          borderColor: 'var(--chat-border, #e0e0e0)'
                        }}
                      >
                        <ChatInfoPanel
                          chat={selectedChat}
                          currentUser={currentUser}
                          onClose={() => setShowChatInfo(false)}
                          onUpdateChat={(updates) => {
                            setSelectedChat(prev => prev ? { ...prev, ...updates } : null);
                            // TODO: Update chat via API
                          }}
                          onLeaveChat={() => {
                            setShowChatInfo(false);
                            setSelectedChat(null);
                            // TODO: Leave chat via API
                          }}
                          onAddMembers={() => {
                            setShowChatInfo(false);
                            setShowCreateChatModal(true);
                          }}
                        />
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* WebRTC Call Components */}
      {callManager && (
        <>
          {/* Incoming call notification */}
          <IncomingCallNotification
            open={!!callManager.incomingCall}
            caller={callManager.incomingCall?.caller || { username: '', display_name: '' }}
            callType={callManager.incomingCall?.callType || 'audio'}
            onAccept={() => {
              if (callManager.incomingCall) {
                callManager.acceptCall(callManager.incomingCall.callId);
              }
            }}
            onReject={() => {
              if (callManager.incomingCall) {
                callManager.rejectCall(callManager.incomingCall.callId);
              }
            }}
            onTimeout={() => {
              if (callManager.incomingCall) {
                callManager.rejectCall(callManager.incomingCall.callId, 'timeout');
              }
            }}
          />

          {/* Active call interface */}
          {callManager.currentCall && currentUser && (
            <WebRTCCall
              open={callManager.isCallUIOpen}
              onClose={callManager.closeCallUI}
              callType={callManager.currentCall.type}
              targetUser={
                callManager.currentCall.isIncoming
                  ? callManager.currentCall.participants.caller
                  : callManager.currentCall.participants.receiver
              }
              currentUser={currentUser}
              isIncoming={callManager.currentCall.isIncoming}
              callId={callManager.currentCall.callId}
              onCallEnd={(duration) => {
                console.log(`Call ended after ${duration} seconds`);
                callManager.endCall(callManager.currentCall?.callId || '');
              }}
            />
          )}
        </>
      )}

      {/* Create Chat Modal */}
      <CreateChatModal
        open={showCreateChatModal}
        onClose={() => setShowCreateChatModal(false)}
        currentUser={currentUser}
      />

      {/* Chat More Options Menu */}
      {selectedChat && (
        <ChatMoreOptions
          chat={selectedChat}
          currentUser={currentUser}
          anchorEl={moreOptionsAnchor}
          open={Boolean(moreOptionsAnchor)}
          onClose={() => setMoreOptionsAnchor(null)}
          onSearchInChat={() => {
            // TODO: Implement search in chat
            console.log('Search in chat');
          }}
          onToggleMute={() => {
            setSelectedChat(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null);
            // TODO: Update via API
          }}
          onTogglePin={() => {
            setSelectedChat(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null);
            // TODO: Update via API
          }}
          onAddMembers={() => {
            setShowCreateChatModal(true);
          }}
          onChatSettings={() => {
            setShowChatInfo(true);
          }}
          onExportChat={() => {
            // TODO: Implement export
            console.log('Export chat');
          }}
          onReportChat={() => {
            // TODO: Implement report
            console.log('Report chat');
          }}
          onBlockUser={() => {
            // TODO: Implement block
            console.log('Block user');
          }}
          onLeaveChat={() => {
            setSelectedChat(null);
            // TODO: Leave via API
          }}
          onDeleteChat={() => {
            setSelectedChat(null);
            // TODO: Delete via API
          }}
          onArchiveChat={() => {
            setSelectedChat(prev => prev ? { ...prev, archived: true } : null);
            // TODO: Archive via API
          }}
        />
      )}
    </div>
  );
}