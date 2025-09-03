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
import { socketClient } from '@/lib/socket-client';
import apiClient from '@/lib/api-client';
import { useThemeCSS } from '@/hooks/useThemeSystem';
import { Socket } from 'socket.io-client';
import { AuthenticatedImage } from './AuthenticatedImage';
import { ImageLightbox } from './ImageLightbox';

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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    name: string;
    size: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const componentId = useRef(`MessageArea_${chat.id}_${Date.now()}`).current;
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  
  // Apply theme CSS variables
  const theme = useThemeCSS('internal_chat');

  // Socket.io connection setup with singleton
  useEffect(() => {
    if (!currentUser?.username) return;

    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
    if (!token) {
      console.error('❌ No authentication token found for chat');
      return;
    }

    console.log('🔌 Connecting to Socket.io via singleton client for MessageArea');
    
    // Connect using singleton client
    const socket = socketClient.connect(token);
    
    // Join current chat channel
    console.log('🔌 Joining channel via singleton:', chat.id);
    socketClient.joinChannel(chat.id);

    // Listen for new messages from OTHER users
    socketClient.addEventListener(componentId, 'message_received', (data: any) => {
      const { message } = data;
      console.log('📨 Received message from Socket.io (other user):', message);
      
      // Add all messages (prevent duplicates by checking if already exists)
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.find(msg => 
          msg.id === message.id.toString() ||
          (msg.id.startsWith('temp_') && msg.content === message.message && msg.sender.username === message.userId)
        );
        
        if (exists) {
          // If it's a temp message, replace with server version
          if (exists.id.startsWith('temp_')) {
            console.log('🔄 Replacing temp message with server version');
            return prev.map(msg => {
              if (msg.id === exists.id) {
                // Parse file attachment if it exists
                let attachments;
                if (message.fileAttachment) {
                  try {
                    const fileData = JSON.parse(message.fileAttachment);
                    attachments = [{
                      id: fileData.fileId,
                      filename: fileData.filename,
                      type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                      url: `/api/chat/files/${fileData.fileId}`,
                      size: fileData.fileSize
                    }];
                  } catch (e) {
                    console.warn('Failed to parse file attachment:', e);
                  }
                }
                
                // If no attachment but message type is file, try to parse from message text
                if (!attachments && message.messageType === 'file' && message.message?.startsWith('{')) {
                  try {
                    const fileData = JSON.parse(message.message);
                    if (fileData.fileId) {
                      attachments = [{
                        id: fileData.fileId,
                        filename: fileData.filename || 'Unknown',
                        type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                        url: `/api/chat/files/${fileData.fileId}`,
                        size: fileData.fileSize || 0
                      }];
                    }
                  } catch (e) {
                    console.warn('Failed to parse file data from message text:', e);
                  }
                }

                return {
                  id: message.id.toString(),
                  content: message.message,
                  sender: {
                    username: message.userId,
                    display_name: message.userDisplayName,
                    role_id: 'user'
                  },
                  timestamp: message.timestamp,
                  message_type: message.messageType || 'text',
                  attachments,
                  reply_to: message.replyToId ? { 
                    id: message.replyToId.toString(), 
                    content: '', 
                    sender: { username: '', display_name: '', role_id: '' }, 
                    timestamp: '', 
                    message_type: 'text' 
                  } : undefined
                };
              }
              return msg;
            });
          }
          return prev; // Already exists, skip
        }
        
        // Add new message
        // Parse file attachment if it exists
        let attachments;
        if (message.fileAttachment) {
          try {
            const fileData = JSON.parse(message.fileAttachment);
            attachments = [{
              id: fileData.fileId,
              filename: fileData.filename,
              type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
              url: `/api/chat/files/${fileData.fileId}`,
              size: fileData.fileSize
            }];
          } catch (e) {
            console.warn('Failed to parse file attachment:', e);
          }
        }
        
        // If no attachment but message type is file, try to parse from message text
        if (!attachments && message.messageType === 'file' && message.message?.startsWith('{')) {
          try {
            const fileData = JSON.parse(message.message);
            if (fileData.fileId) {
              attachments = [{
                id: fileData.fileId,
                filename: fileData.filename || 'Unknown',
                type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                url: `/api/chat/files/${fileData.fileId}`,
                size: fileData.fileSize || 0
              }];
            }
          } catch (e) {
            console.warn('Failed to parse file data from message text:', e);
          }
        }

        return [...prev, {
          id: message.id.toString(),
          content: message.message,
          sender: {
            username: message.userId,
            display_name: message.userDisplayName,
            role_id: 'user'
          },
          timestamp: message.timestamp,
          message_type: message.messageType || 'text',
          attachments,
          reply_to: message.replyToId ? { 
            id: message.replyToId.toString(), 
            content: '', 
            sender: { username: '', display_name: '', role_id: '' }, 
            timestamp: '', 
            message_type: 'text' 
          } : undefined
        }];
      });
    });

    // Listen for confirmation of our own messages
    socketClient.addEventListener(componentId, 'message_sent', (data: any) => {
      const { message } = data;
      console.log('✅ Message sent confirmation from Socket.io:', message);
      
      // Replace the temporary optimistic message with server version
      setMessages(prev => {
        const tempIndex = prev.findIndex(msg => 
          msg.id.startsWith('temp_') && 
          msg.content === message.message &&
          msg.sender.username === message.userId
        );
        
        if (tempIndex !== -1) {
          // Parse file attachment if it exists
          let attachments;
          if (message.fileAttachment) {
            try {
              const fileData = JSON.parse(message.fileAttachment);
              attachments = [{
                id: fileData.fileId,
                filename: fileData.filename,
                type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                url: `/api/chat/files/${fileData.fileId}`,
                size: fileData.fileSize
              }];
            } catch (e) {
              console.warn('Failed to parse file attachment:', e);
            }
          }
          
          // If no attachment but message type is file, try to parse from message text
          if (!attachments && message.messageType === 'file' && message.message?.startsWith('{')) {
            try {
              const fileData = JSON.parse(message.message);
              if (fileData.fileId) {
                attachments = [{
                  id: fileData.fileId,
                  filename: fileData.filename || 'Unknown',
                  type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                  url: `/api/chat/files/${fileData.fileId}`,
                  size: fileData.fileSize || 0
                }];
              }
            } catch (e) {
              console.warn('Failed to parse file data from message text:', e);
            }
          }

          const newMessages = [...prev];
          newMessages[tempIndex] = {
            id: message.id.toString(),
            content: message.message,
            sender: {
              username: message.userId,
              display_name: message.userDisplayName,
              role_id: 'user'
            },
            timestamp: message.timestamp,
            message_type: message.messageType || 'text',
            attachments,
            reply_to: message.replyToId ? { 
              id: message.replyToId.toString(), 
              content: '', 
              sender: { username: '', display_name: '', role_id: '' }, 
              timestamp: '', 
              message_type: 'text' 
            } : undefined
          };
          return newMessages;
        }
        return prev;
      });
    });

    // Listen for typing indicators
    socketClient.addEventListener(componentId, 'user_typing', (data: any) => {
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

    // Listen for channel join confirmation
    socketClient.addEventListener(componentId, 'channel_joined', (data: any) => {
      console.log('✅ Successfully joined channel:', data.channelId, 'with', data.roomMembers.length, 'members');
    });

    socketClient.addEventListener(componentId, 'join_channel_error', (data: any) => {
      console.error('❌ Failed to join channel:', data.message);
    });

    // Listen for user join/leave
    socketClient.addEventListener(componentId, 'user_joined', (data: any) => {
      console.log(`${data.displayName} joined the channel`);
    });

    socketClient.addEventListener(componentId, 'user_left', (data: any) => {
      console.log(`${data.displayName} left the channel`);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up MessageArea event listeners for component:', componentId);
      socketClient.removeEventListeners(componentId);
      socketClient.leaveChannel(chat.id);
    };
  }, [chat.id, currentUser?.username, componentId]);

  // Typing indicator management
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTypingStart = useCallback(() => {
    if (!socketClient.isConnected() || isTyping) return;
    
    setIsTyping(true);
    socketClient.emit('typing_start', { channelId: chat.id });
    
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
    if (!socketClient.isConnected() || !isTyping) return;
    
    setIsTyping(false);
    socketClient.emit('typing_stop', { channelId: chat.id });
    
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
      
      const result = await apiClient.getChatMessages(chat.id, 50);

      if (result.success) {
        const data = result.data;
        console.log('📥 Loaded messages:', data.messages?.length || 0);
        
        // Convert API messages to component format
        const formattedMessages: Message[] = (data.messages || []).map((msg: any) => {
          // Parse file attachment if it exists
          let attachments;
          
          // Try to parse from file_attachment field
          if (msg.file_attachment) {
            try {
              const fileData = JSON.parse(msg.file_attachment);
              attachments = [{
                id: fileData.fileId,
                filename: fileData.filename,
                type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                url: `/api/chat/files/${fileData.fileId}`,
                size: fileData.fileSize
              }];
            } catch (e) {
              console.warn('Failed to parse file attachment:', e);
            }
          }
          
          // If no attachment but message_type is 'file', try to parse from message_text
          if (!attachments && msg.message_type === 'file' && msg.message_text?.startsWith('{')) {
            try {
              const fileData = JSON.parse(msg.message_text);
              if (fileData.fileId) {
                attachments = [{
                  id: fileData.fileId,
                  filename: fileData.filename || 'Unknown',
                  type: fileData.mimeType?.startsWith('image/') ? 'image' : 'file',
                  url: `/api/chat/files/${fileData.fileId}`,
                  size: fileData.fileSize || 0
                }];
              }
            } catch (e) {
              console.warn('Failed to parse file data from message_text:', e);
            }
          }

          return {
            id: msg.id.toString(),
            content: msg.message_text,
            sender: {
              username: msg.user_id,
              display_name: msg.user_display_name || msg.user_id,
              role_id: 'user'
            },
            timestamp: msg.created_at,
            message_type: msg.message_type || 'text',
            attachments,
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
          };
        });

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

  // Format message timestamp safely
  const formatMessageTime = (timestamp: string) => {
    try {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid time';
      
      if (isToday(date)) {
        return format(date, 'HH:mm');
      } else if (isYesterday(date)) {
        return `Yesterday ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'MMM dd, HH:mm');
      }
    } catch (error) {
      console.warn('Invalid timestamp in MessageArea:', timestamp, error);
      return 'Invalid time';
    }
  };

  // Format relative time for hover safely
  const formatRelativeTime = (timestamp: string) => {
    try {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid time';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.warn('Invalid timestamp in MessageArea relative time:', timestamp, error);
      return 'Invalid time';
    }
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

    // Send via Socket.io singleton
    try {
      if (socketClient.isConnected()) {
        console.log('📤 Sending message via Socket.io singleton:', {
          channelId: chat.id,
          message: messageContent,
          type: 'text',
          replyToId: replyingTo?.id || null
        });
        const success = socketClient.sendMessage(
          chat.id,
          messageContent,
          'text',
          replyingTo?.id || undefined
        );
        
        if (!success) {
          console.error('❌ Failed to send message via singleton');
          // Remove optimistic message on failure
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
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

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!currentUser) return;

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channel_id', chat.id);
      
      const result = await apiClient.uploadChatFile(formData);

      if (!result.success) {
        throw new Error(result.message || 'Failed to upload file');
      }

      const data = result.data;
      
      // Create message with file attachment
      const optimisticMessage: Message = {
        id: `temp_file_${Date.now()}`,
        content: `📎 ${file.name}`,
        sender: currentUser,
        timestamp: new Date().toISOString(),
        message_type: 'file',
        attachments: [{
          id: data.file.id,
          filename: data.file.filename,
          type: data.file.type,
          url: data.file.url,
          size: data.file.size
        }]
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Send file message via Socket.io
      if (socketClient.isConnected()) {
        const success = socketClient.sendMessage(
          chat.id,
          JSON.stringify({
            type: 'file',
            filename: data.file.filename,
            fileId: data.file.id,
            fileSize: data.file.size,
            mimeType: data.file.mime_type
          }),
          'file'
        );
        
        if (!success) {
          console.error('❌ Failed to send file message via singleton');
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        }
      }

    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingFile(false);
    }
  }, [currentUser, chat.id]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      // Reset input
      event.target.value = '';
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // Message grouping logic
  const shouldGroupMessage = (current: Message, previous?: Message) => {
    if (!previous) return false;
    
    try {
      const currentDate = new Date(current.timestamp);
      const previousDate = new Date(previous.timestamp);
      
      if (isNaN(currentDate.getTime()) || isNaN(previousDate.getTime())) {
        return false;
      }
      
      const timeDiff = currentDate.getTime() - previousDate.getTime();
      const sameUser = current.sender.username === previous.sender.username;
      const within5Minutes = timeDiff < 5 * 60 * 1000; // 5 minutes
      
      return sameUser && within5Minutes && !current.reply_to;
    } catch (error) {
      console.warn('Invalid timestamps in message grouping:', current.timestamp, previous.timestamp, error);
      return false;
    }
  };

  // Render message actions (reply, edit, delete, etc.)
  const MessageActions = ({ message }: { message: Message }) => {
    const isOwn = message.sender.username === currentUser?.username;
    
    const canEdit = isOwn && (() => {
      try {
        const messageDate = new Date(message.timestamp);
        if (isNaN(messageDate.getTime())) return false;
        return new Date().getTime() - messageDate.getTime() < 3 * 60 * 1000; // 3 minutes
      } catch (error) {
        console.warn('Invalid timestamp for edit check:', message.timestamp, error);
        return false;
      }
    })();
    
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
          "group flex gap-3 px-4 py-1 transition-colors",
          isGrouped && "mt-1",
          !isGrouped && "mt-4"
        )}
        style={{
          '--message-hover-bg': 'var(--chat-surface)'
        } as React.CSSProperties}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--chat-surface)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
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
            <div className="w-8 h-8 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--chat-text-secondary)' }}>
              {formatMessageTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Message header */}
          {showAvatar && (
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm" style={{ color: 'var(--chat-text-primary)' }}>
                {message.sender.display_name}
              </span>
              <span className="text-xs" style={{ color: 'var(--chat-text-secondary)' }} title={formatRelativeTime(message.timestamp)}>
                {formatMessageTime(message.timestamp)}
              </span>
              {message.edited_at && (
                <span className="text-xs" style={{ color: 'var(--chat-text-secondary)' }} title={`Edited ${formatRelativeTime(message.edited_at)}`}>
                  (edited)
                </span>
              )}
            </div>
          )}

          {/* Reply indicator */}
          {message.reply_to && (
            <div 
              className="flex items-center gap-2 mb-2 p-2 rounded-lg border-l-2" 
              style={{ 
                backgroundColor: 'var(--chat-surface)', 
                borderLeftColor: 'var(--chat-border)',
                borderColor: 'var(--chat-border)'
              }}
            >
              <UserAvatar user={message.reply_to.sender} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--chat-text-primary)' }}>
                  {message.reply_to.sender.display_name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--chat-text-secondary)' }}>
                  {message.reply_to.content}
                </p>
              </div>
            </div>
          )}

          {/* Message text */}
          {(() => {
            // Check if content is file attachment JSON
            if (message.message_type === 'file' && message.content.startsWith('{') && message.content.includes('"fileId"')) {
              // Don't show JSON content for file messages
              return null;
            }
            return (
              <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--chat-text-primary)' }}>
                {message.content}
              </div>
            );
          })()}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="max-w-xs"
                >
                  {attachment.type === 'image' ? (
                    <div className="cursor-pointer">
                      <AuthenticatedImage
                        src={attachment.url}
                        alt={attachment.filename}
                        className="max-w-full max-h-48 rounded-lg border hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setLightboxImage({
                            url: attachment.url,
                            name: attachment.filename,
                            size: attachment.size
                          });
                        }}
                      />
                      <p className="text-xs mt-1 px-1" style={{ color: 'var(--chat-text-secondary)' }}>
                        {attachment.filename} • {(attachment.size / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
                          if (!token) return;
                          
                          const response = await fetch(attachment.url, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          
                          if (!response.ok) {
                            console.error('Failed to download file');
                            return;
                          }
                          
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = attachment.filename;
                          link.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error('Download error:', err);
                          alert('Failed to download file');
                        }
                      }}
                      className="flex items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--chat-surface)', 
                        borderColor: 'var(--chat-border)' 
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--chat-secondary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--chat-surface)';
                      }}
                    >
                      <File className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--chat-text-secondary)' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--chat-text-primary)' }}>
                          {attachment.filename}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--chat-text-secondary)' }}>
                          {(attachment.size / 1024 / 1024).toFixed(1)}MB
                        </p>
                      </div>
                    </div>
                  )}
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
                  className="h-6 px-2 text-xs transition-colors"
                  style={{
                    backgroundColor: 'var(--chat-surface)',
                    borderColor: 'var(--chat-border)',
                    color: 'var(--chat-text-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--chat-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--chat-surface)'}
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
    <div 
      className="flex flex-col h-full" 
      style={{ 
        backgroundColor: 'var(--chat-background)', 
        color: 'var(--chat-text-primary)' 
      }}
    >
      {/* Reply bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b p-3"
            style={{
              backgroundColor: 'var(--chat-secondary)',
              borderColor: 'var(--chat-border)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Reply className="w-4 h-4" style={{ color: 'var(--chat-primary)' }} />
                <span className="text-sm" style={{ color: 'var(--chat-primary)' }}>
                  Replying to {replyingTo.sender.display_name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 w-6 p-0 transition-colors"
                style={{}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--chat-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm mt-1 truncate" style={{ color: 'var(--chat-text-secondary)' }}>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--chat-primary)' }}></div>
              </div>
            ) : messages.length > 0 ? (
              <div>
                {messages.map((message, index) => renderMessage(message, index))}
                
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'var(--chat-text-secondary)' }}></div>
                        <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'var(--chat-text-secondary)', animationDelay: '0.1s' }}></div>
                        <div className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: 'var(--chat-text-secondary)', animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--chat-text-secondary)' }}>
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p style={{ color: 'var(--chat-text-secondary)' }}>No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message input */}
      <div 
        className="border-t p-4"
        style={{
          borderTopColor: 'var(--chat-border)',
          backgroundColor: 'var(--chat-background)'
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {uploadingFile && (
          <div 
            className="mb-2 p-2 rounded-lg border" 
            style={{
              backgroundColor: 'var(--chat-secondary)',
              borderColor: 'var(--chat-border)'
            }}
          >
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--chat-primary)' }}></div>
              <span className="text-sm" style={{ color: 'var(--chat-primary)' }}>Uploading file...</span>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-3">
          {/* Attachment button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 p-2"
            title="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.csv,.json,.xlsx,.xls"
            onChange={handleFileInputChange}
          />

          {/* Message input */}
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={uploadingFile ? "Uploading..." : `Message ${chat.displayName}...`}
              className={cn(
                "resize-none border-0 shadow-none",
                isMobile && "text-base" // Prevent zoom on iOS
              )}
              style={{
                backgroundColor: 'var(--chat-surface)',
                color: 'var(--chat-text-primary)',
                '--placeholder-color': 'var(--chat-text-secondary)'
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.backgroundColor = 'var(--chat-background)';
              }}
              onBlur={(e) => {
                e.target.style.backgroundColor = 'var(--chat-surface)';
              }}
              disabled={isLoading || uploadingFile}
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
            disabled={!newMessage.trim() || isLoading || uploadingFile}
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
      
      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || ''}
        imageName={lightboxImage?.name || ''}
        imageSize={lightboxImage?.size}
        position="right"
      />
    </div>
  );
}