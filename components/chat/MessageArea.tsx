/**
 * MessageArea - Core message display and input component
 * Mobile-first design with touch-optimized interactions
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreHorizontal,
  Reply,
  Edit3,
  Trash2,
  Copy,
  Forward,
  Image,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { useIsMobile, useIsTouchDevice } from '@/hooks/useMediaQuery';
import io, { Socket } from 'socket.io-client';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id: string;
}

interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: string;
  edited_at?: string;
  reply_to?: Message;
  attachments?: {
    id: string;
    filename: string;
    type: 'image' | 'file';
    url: string;
    size: number;
  }[];
  reactions?: {
    emoji: string;
    users: string[];
    count: number;
  }[];
  is_system?: boolean;
  message_type?: 'text' | 'image' | 'file' | 'system';
}

interface ChatItem {
  id: string;
  type: 'dm' | 'channel' | 'group';
  name: string;
  displayName: string;
  participants?: User[];
  unreadCount?: number;
}

interface MessageAreaProps {
  chat: ChatItem;
  currentUser?: User;
}

export default function MessageArea({ chat, currentUser }: MessageAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();

  // Socket.io connection setup
  useEffect(() => {
    if (!currentUser?.username) return;

    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    if (!token) {
      console.error('❌ No authentication token found for chat');
      return;
    }

    // Initialize socket connection
    console.log('🔌 Initializing Socket.io connection to http://localhost:3001');
    console.log('🔌 Using token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    // Connection event listeners
    socket.on('connect', () => {
      console.log('✅ Socket.io connected successfully:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket.io disconnected:', reason);
    });

    // Authentication
    console.log('🔌 Authenticating with Socket.io server...');
    socket.emit('authenticate', token);

    // Listen for authentication result
    socket.on('authenticated', (data) => {
      console.log('✅ Socket.io authenticated:', data);
    });

    socket.on('auth:error', (error) => {
      console.error('❌ Socket.io auth error:', error);
    });

    // Join current chat channel
    console.log('🔌 Joining channel:', chat.id);
    socket.emit('join_channel', { channelId: chat.id });

    // Listen for new messages
    socket.on('message_received', (data) => {
      const { message } = data;
      console.log('📨 Received message from Socket.io:', message);
      
      // Don't add messages from yourself (optimistic updates already handle this)
      if (message.userId === currentUser?.username) {
        console.log('🔄 Ignoring own message (optimistic update already added)');
        return;
      }
      
      setMessages(prev => [...prev, {
        id: message.id.toString(),
        content: message.message,
        sender: {
          username: message.userId,
          display_name: message.userDisplayName,
          role_id: 'user'
        },
        timestamp: message.timestamp,
        message_type: message.messageType || 'text',
        reply_to: message.replyToId ? { 
          id: message.replyToId.toString(), 
          content: '', 
          sender: { username: '', display_name: '', role_id: '' }, 
          timestamp: '', 
          message_type: 'text' 
        } : undefined
      }]);
    });

    // Listen for typing indicators
    socket.on('user_typing', (data) => {
      const { userId, userDisplayName, isTyping } = data;
      if (userId !== currentUser.username) {
        setTypingUsers(prev => {
          if (isTyping) {
            return prev.includes(userDisplayName) ? prev : [...prev, userDisplayName];
          } else {
            return prev.filter(user => user !== userDisplayName);
          }
        });
      }
    });

    // Listen for user join/leave
    socket.on('user_joined', (data) => {
      console.log(`${data.displayName} joined the channel`);
    });

    socket.on('user_left', (data) => {
      console.log(`${data.displayName} left the channel`);
    });

    // Cleanup on unmount
    return () => {
      socket.emit('leave_channel', { channelId: chat.id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [chat.id, currentUser?.username]);

  // Typing indicator management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTypingStart = useCallback(() => {
    if (!socketRef.current?.connected || isTyping) return;
    
    setIsTyping(true);
    socketRef.current.emit('typing_start', { channelId: chat.id });
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  }, [chat.id, isTyping]);

  const handleTypingStop = useCallback(() => {
    if (!socketRef.current?.connected || !isTyping) return;
    
    setIsTyping(false);
    socketRef.current.emit('typing_stop', { channelId: chat.id });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [chat.id, isTyping]);

  // Handle input change with typing indicators
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  }, [handleTypingStart, handleTypingStop]);

  // Load messages from API
  const loadMessages = useCallback(async () => {
    if (!chat.id || !currentUser) return;
    
    try {
      setIsLoading(true);
      console.log('📥 Loading messages for channel:', chat.id);
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      const response = await fetch(`/api/chat/messages?channelId=${chat.id}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Loaded messages:', data.messages?.length || 0);
        
        // Convert API messages to component format
        const formattedMessages: Message[] = (data.messages || []).map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.message_text,
          sender: {
            username: msg.user_id,
            display_name: msg.user_display_name || msg.user_id,
            role_id: 'user'
          },
          timestamp: msg.created_at,
          message_type: msg.message_type || 'text',
          reply_to: msg.reply_to_id ? {
            id: msg.reply_to_id.toString(),
            content: msg.reply_to_text || '',
            sender: {
              username: msg.reply_to_user || '',
              display_name: msg.reply_to_user || '',
              role_id: 'user'
            },
            timestamp: '',
            message_type: 'text'
          } : undefined
        }));

        setMessages(formattedMessages);
      } else {
        console.error('❌ Failed to load messages:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chat.id, currentUser]);

  // Load messages when component mounts or chat changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  // Format relative time for hover
  const formatRelativeTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Handle message send
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    handleTypingStop(); // Stop typing indicator when sending

    // Create optimistic message
    const optimisticMessage: Message = {
      id: `temp_${Date.now()}`,
      content: messageContent,
      sender: currentUser,
      timestamp: new Date().toISOString(),
      message_type: 'text',
      reply_to: replyingTo || undefined
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);

    // Send via Socket.io
    try {
      if (socketRef.current?.connected) {
        console.log('📤 Sending message via Socket.io:', {
          channelId: chat.id,
          message: messageContent,
          type: 'text',
          replyToId: replyingTo?.id || null
        });
        socketRef.current.emit('send_message', {
          channelId: chat.id,
          message: messageContent,
          type: 'text',
          replyToId: replyingTo?.id || null
        });
      } else {
        console.error('❌ Socket.io not connected, cannot send message');
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    }
  }, [newMessage, currentUser, chat.id, replyingTo]);

  // Handle key press in input
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Message grouping logic
  const shouldGroupMessage = (current: Message, previous?: Message) => {
    if (!previous) return false;
    
    const timeDiff = new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime();
    const sameUser = current.sender.username === previous.sender.username;
    const within5Minutes = timeDiff < 5 * 60 * 1000; // 5 minutes
    
    return sameUser && within5Minutes && !current.reply_to;
  };

  // Render message actions (reply, edit, delete, etc.)
  const MessageActions = ({ message }: { message: Message }) => {
    const isOwn = message.sender.username === currentUser?.username;
    const canEdit = isOwn && new Date().getTime() - new Date(message.timestamp).getTime() < 3 * 60 * 1000; // 3 minutes
    
    return (
      <div className={cn(
        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        isMobile && "opacity-100" // Always show on mobile
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setReplyingTo(message)}
          className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Reply"
        >
          <Reply className="w-3 h-3" />
        </Button>
        
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingMessage(message)}
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Edit"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard.writeText(message.content)}
          className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Copy"
        >
          <Copy className="w-3 h-3" />
        </Button>
        
        {isOwn && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Implement delete
              console.log('Delete message:', message.id);
            }}
            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900 text-red-600"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedMessage(message)}
          className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="More"
        >
          <MoreHorizontal className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // Render individual message
  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender.username === currentUser?.username;
    const previousMessage = messages[index - 1];
    const isGrouped = shouldGroupMessage(message, previousMessage);
    const showAvatar = !isGrouped;
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "group flex gap-3 px-4 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50",
          isGrouped && "mt-1",
          !isGrouped && "mt-4"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8">
          {showAvatar ? (
            <UserAvatar 
              user={message.sender} 
              size="md"
              enableRealTimePresence={true}
            />
          ) : (
            <div className="w-8 h-8 flex items-center justify-center text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatMessageTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Message header */}
          {showAvatar && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {message.sender.display_name}
              </span>
              <span className="text-xs text-gray-500" title={formatRelativeTime(message.timestamp)}>
                {formatMessageTime(message.timestamp)}
              </span>
              {message.edited_at && (
                <span className="text-xs text-gray-400" title={`Edited ${formatRelativeTime(message.edited_at)}`}>
                  (edited)
                </span>
              )}
            </div>
          )}

          {/* Reply indicator */}
          {message.reply_to && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-2 border-gray-300 dark:border-gray-600">
              <UserAvatar user={message.reply_to.sender} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {message.reply_to.sender.display_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {message.reply_to.content}
                </p>
              </div>
            </div>
          )}

          {/* Message text */}
          <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border"
                >
                  {attachment.type === 'image' ? (
                    <Image className="w-4 h-4 text-blue-500" />
                  ) : (
                    <File className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-xs font-medium">{attachment.filename}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                  onClick={() => {
                    // TODO: Toggle reaction
                    console.log('Toggle reaction:', reaction.emoji);
                  }}
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Message actions */}
        <MessageActions message={message} />
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Reply bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Replying to {replyingTo.sender.display_name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 w-6 p-0"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {replyingTo.content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="py-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length > 0 ? (
              <div>
                {messages.map((message, index) => renderMessage(message, index))}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
        <div className="flex items-end gap-3">
          {/* Attachment button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 p-2"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Message input */}
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${chat.displayName}...`}
              className={cn(
                "resize-none border-0 shadow-none bg-gray-100 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700",
                isMobile && "text-base" // Prevent zoom on iOS
              )}
              disabled={isLoading}
            />
          </div>

          {/* Emoji button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 p-2"
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </Button>

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading}
            size="sm"
            className={cn(
              "flex-shrink-0 p-2",
              isMobile && "min-w-[44px] min-h-[44px]" // Touch target size
            )}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}