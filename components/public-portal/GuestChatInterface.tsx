'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, 
  Avatar, Divider, IconButton, Chip, Alert,
  LinearProgress, FormControl, InputLabel, Select,
  MenuItem, FormControlLabel, Checkbox, Dialog,
  DialogTitle, DialogContent, DialogActions,
  CircularProgress, Fade, Collapse
} from '@mui/material';
import {
  Send, AttachFile, EmojiEmotions, Close,
  AccessTime, CheckCircle, Error as ErrorIcon,
  CloudUpload, Image as ImageIcon, PictureAsPdf
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface GuestChatInterfaceProps {
  sessionId?: string;
  onClose?: () => void;
  settings: {
    welcome_message: string;
    offline_message: string;
    business_hours_message: string;
    queue_message: string;
    staff_disconnect_message: string;
    require_name: boolean;
    require_email: boolean;
    require_phone: boolean;
    require_department: boolean;
    custom_fields_json: string;
    show_agent_typing: boolean;
    show_queue_position: boolean;
    enable_file_uploads: boolean;
    max_file_size_mb: number;
    allowed_file_types_json: string;
    typing_indicators_enabled: boolean;
    show_staff_typing_to_guests: boolean;
    typing_indicator_text: string;
    read_receipts_enabled: boolean;
    show_delivery_status: boolean;
    delivery_status_icons: string;
    session_recovery_enabled: boolean;
    session_recovery_minutes: number;
    widget_color: string;
  };
}

interface ChatMessage {
  id: string;
  sender: 'guest' | 'staff';
  message: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
}

interface PreChatForm {
  name: string;
  email: string;
  phone: string;
  department: string;
  message: string;
  customFields: { [key: string]: string };
}

export const GuestChatInterface = ({ sessionId: initialSessionId, onClose, settings }: GuestChatInterfaceProps) => {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [chatStatus, setChatStatus] = useState<'pre-chat' | 'connecting' | 'queued' | 'connected' | 'ended' | 'reconnecting'>('pre-chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [staffTyping, setStaffTyping] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<number | null>(null);
  const [connectedStaff, setConnectedStaff] = useState<{ name: string; avatar?: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [preChatData, setPreChatData] = useState<PreChatForm>({
    name: '',
    email: '',
    phone: '',
    department: '',
    message: '',
    customFields: {}
  });
  const [preChatErrors, setPreChatErrors] = useState<{ [key: string]: string }>({});
  const [sessionRecovered, setSessionRecovered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkBusinessHours();
    attemptSessionRecovery();
    scrollToBottom();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkBusinessHours = () => {
    // This would check against settings.business_hours_enabled and schedule
    setIsOnline(true); // Simplified for now
  };

  const attemptSessionRecovery = () => {
    if (!settings.session_recovery_enabled) return;

    const savedSession = localStorage.getItem('public_chat_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = settings.session_recovery_minutes * 60 * 1000;

        if (sessionAge < maxAge && session.sessionId) {
          setSessionId(session.sessionId);
          setMessages(session.messages || []);
          setPreChatData(session.preChatData || preChatData);
          setChatStatus(session.status || 'connecting');
          setSessionRecovered(true);
          
          // Attempt to reconnect
          reconnectToSession(session.sessionId);
        } else {
          localStorage.removeItem('public_chat_session');
        }
      } catch (error) {
        console.error('Failed to recover session:', error);
        localStorage.removeItem('public_chat_session');
      }
    }
  };

  const reconnectToSession = async (sessionId: string) => {
    setChatStatus('reconnecting');
    try {
      // This would connect to Socket.io and attempt to resume the session
      // For now, simulate reconnection
      setTimeout(() => {
        setChatStatus('connected');
        setConnectedStaff({ name: 'Support Agent' });
        addSystemMessage('Session recovered. You are now reconnected with support.');
      }, 2000);
    } catch (error) {
      console.error('Failed to reconnect:', error);
      setChatStatus('ended');
      addSystemMessage('Unable to reconnect to previous session. Please start a new chat.');
    }
  };

  const saveSession = () => {
    if (!sessionId) return;
    
    const sessionData = {
      sessionId,
      timestamp: Date.now(),
      status: chatStatus,
      messages,
      preChatData
    };
    
    localStorage.setItem('public_chat_session', JSON.stringify(sessionData));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addSystemMessage = (message: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'staff',
      message,
      timestamp: new Date(),
      status: 'read',
      type: 'text'
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const validatePreChatForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (settings.require_name && !preChatData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (settings.require_email && !preChatData.email.trim()) {
      errors.email = 'Email is required';
    } else if (settings.require_email && preChatData.email && !/\S+@\S+\.\S+/.test(preChatData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (settings.require_phone && !preChatData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (settings.require_department && !preChatData.department) {
      errors.department = 'Please select a department';
    }

    if (!preChatData.message.trim()) {
      errors.message = 'Please describe how we can help you';
    }

    setPreChatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const startChat = async () => {
    if (!validatePreChatForm()) return;

    setChatStatus('connecting');

    try {
      // Create new chat session
      const newSessionId = `guest_${Date.now()}`;
      setSessionId(newSessionId);

      // Add initial message
      const initialMessage: ChatMessage = {
        id: '1',
        sender: 'guest',
        message: preChatData.message,
        timestamp: new Date(),
        status: 'sent',
        type: 'text'
      };
      setMessages([initialMessage]);

      // Simulate joining queue
      setTimeout(() => {
        setChatStatus('queued');
        setQueuePosition(3);
        setEstimatedWait(5); // 5 minutes
        addSystemMessage(settings.queue_message);
        saveSession();
      }, 1000);

      // Simulate staff connection (for demo)
      setTimeout(() => {
        setChatStatus('connected');
        setQueuePosition(null);
        setConnectedStaff({ name: 'Sarah Johnson', avatar: '' });
        addSystemMessage(settings.welcome_message);
        saveSession();
      }, 8000);

    } catch (error) {
      console.error('Failed to start chat:', error);
      setChatStatus('ended');
      addSystemMessage('Failed to connect to support. Please try again later.');
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || chatStatus !== 'connected') return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'guest',
      message: inputMessage.trim(),
      timestamp: new Date(),
      status: 'sending',
      type: 'text'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    stopTyping();

    // Simulate message sending
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 500);

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);

    saveSession();
  };

  const handleTyping = () => {
    if (!settings.typing_indicators_enabled) return;

    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  };

  const stopTyping = () => {
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings.enable_file_uploads || !event.target.files?.length) return;

    const file = event.target.files[0];
    const maxSize = settings.max_file_size_mb * 1024 * 1024;

    if (file.size > maxSize) {
      alert(`File size must be less than ${settings.max_file_size_mb}MB`);
      return;
    }

    setUploadProgress(0);

    // Simulate file upload
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(uploadInterval);
          
          // Add file message
          const fileMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'guest',
            message: `Uploaded file: ${file.name}`,
            timestamp: new Date(),
            status: 'sent',
            type: file.type.startsWith('image/') ? 'image' : 'file',
            fileName: file.name,
            fileSize: file.size,
            fileUrl: URL.createObjectURL(file)
          };
          
          setMessages(prev => [...prev, fileMessage]);
          setUploadProgress(null);
          return null;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getDeliveryStatusIcon = (status: string) => {
    if (!settings.show_delivery_status) return null;

    const icons = settings.delivery_status_icons ? JSON.parse(settings.delivery_status_icons) : {
      sent: '✓',
      delivered: '✓✓',
      read: '✓✓'
    };

    switch (status) {
      case 'sending': return <CircularProgress size={12} />;
      case 'sent': return <Typography variant="caption">{icons.sent}</Typography>;
      case 'delivered': return <Typography variant="caption">{icons.delivered}</Typography>;
      case 'read': return <Typography variant="caption" color="primary">{icons.read}</Typography>;
      default: return null;
    }
  };

  const endChat = () => {
    setChatStatus('ended');
    localStorage.removeItem('public_chat_session');
    if (onClose) onClose();
  };

  // Pre-chat form render
  if (chatStatus === 'pre-chat') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Paper elevation={4} sx={{ width: '100%', maxWidth: 400, height: 600 }}>
          <Box sx={{ p: 3, backgroundColor: settings.widget_color, color: 'white' }}>
            <Typography variant="h6" fontWeight="bold">
              Start a Conversation
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
              We're here to help! Please fill out the form below to get started.
            </Typography>
          </Box>

          <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
            {sessionRecovered && (
              <Alert severity="info" sx={{ mb: 2 }}>
                We found a previous session. Would you like to continue where you left off?
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {settings.require_name && (
                <TextField
                  fullWidth
                  size="small"
                  label="Name *"
                  value={preChatData.name || ''}
                  onChange={(e) => setPreChatData(prev => ({ ...prev, name: e.target.value }))}
                  error={!!preChatErrors.name}
                  helperText={preChatErrors.name}
                />
              )}

              {settings.require_email && (
                <TextField
                  fullWidth
                  size="small"
                  type="email"
                  label="Email *"
                  value={preChatData.email || ''}
                  onChange={(e) => setPreChatData(prev => ({ ...prev, email: e.target.value }))}
                  error={!!preChatErrors.email}
                  helperText={preChatErrors.email}
                />
              )}

              {settings.require_phone && (
                <TextField
                  fullWidth
                  size="small"
                  label="Phone Number *"
                  value={preChatData.phone || ''}
                  onChange={(e) => setPreChatData(prev => ({ ...prev, phone: e.target.value }))}
                  error={!!preChatErrors.phone}
                  helperText={preChatErrors.phone}
                />
              )}

              {settings.require_department && (
                <FormControl fullWidth size="small" error={!!preChatErrors.department}>
                  <InputLabel>Department *</InputLabel>
                  <Select
                    value={preChatData.department || ''}
                    label="Department *"
                    onChange={(e) => setPreChatData(prev => ({ ...prev, department: e.target.value }))}
                  >
                    <MenuItem value="general">General Support</MenuItem>
                    <MenuItem value="technical">Technical Support</MenuItem>
                    <MenuItem value="billing">Billing</MenuItem>
                    <MenuItem value="sales">Sales</MenuItem>
                  </Select>
                </FormControl>
              )}

              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="How can we help you? *"
                value={preChatData.message || ''}
                onChange={(e) => setPreChatData(prev => ({ ...prev, message: e.target.value }))}
                error={!!preChatErrors.message}
                helperText={preChatErrors.message}
                placeholder="Please describe your question or issue..."
              />

              {!isOnline && (
                <Alert severity="warning">
                  {settings.offline_message}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={startChat}
                disabled={!isOnline}
                sx={{ 
                  mt: 2,
                  backgroundColor: settings.widget_color,
                  '&:hover': { backgroundColor: settings.widget_color, opacity: 0.9 }
                }}
              >
                Start Chat
              </Button>
            </Box>
          </Box>
        </Paper>
      </motion.div>
    );
  }

  // Main chat interface
  return (
    <Paper elevation={4} sx={{ width: '100%', maxWidth: 400, height: 600, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: settings.widget_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {connectedStaff?.avatar ? (
            <Avatar src={connectedStaff.avatar} sx={{ width: 32, height: 32 }} />
          ) : (
            <Avatar sx={{ width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' }}>
              {connectedStaff?.name?.substring(0, 2) || '?'}
            </Avatar>
          )}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {connectedStaff ? `Chat with ${connectedStaff.name}` : 'Support Chat'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {chatStatus === 'connecting' && 'Connecting...'}
              {chatStatus === 'queued' && `Position ${queuePosition} in queue`}
              {chatStatus === 'connected' && 'Connected'}
              {chatStatus === 'reconnecting' && 'Reconnecting...'}
              {chatStatus === 'ended' && 'Chat ended'}
            </Typography>
          </Box>
        </Box>
        
        {onClose && (
          <IconButton size="small" onClick={endChat} sx={{ color: 'white' }}>
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Status Bar */}
      {chatStatus === 'queued' && (
        <Box sx={{ p: 2, backgroundColor: '#fff3e0', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccessTime sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="body2" color="text.secondary">
              Estimated wait time: {estimatedWait} minutes
            </Typography>
          </Box>
          <LinearProgress />
        </Box>
      )}

      {/* Messages */}
      <Box 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 1,
          maxHeight: '400px', // Set maximum height
          minHeight: '200px', // Set minimum height
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'guest' ? 'flex-end' : 'flex-start',
                  mb: 1
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    backgroundColor: message.sender === 'guest' ? settings.widget_color : 'grey.100',
                    color: message.sender === 'guest' ? 'white' : 'text.primary'
                  }}
                >
                  {message.type === 'image' && message.fileUrl && (
                    <img
                      src={message.fileUrl}
                      alt={message.fileName}
                      style={{ maxWidth: '100%', borderRadius: 4, marginBottom: 8 }}
                    />
                  )}
                  
                  {message.type === 'file' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PictureAsPdf sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{message.fileName}</Typography>
                    </Box>
                  )}

                  <Typography variant="body2">{message.message}</Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    {message.sender === 'guest' && getDeliveryStatusIcon(message.status)}
                  </Box>
                </Paper>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Staff typing indicator */}
        {staffTyping && settings.show_staff_typing_to_guests && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {connectedStaff?.name} {settings.typing_indicator_text}
            </Typography>
          </Box>
        )}

        {/* Upload progress */}
        {uploadProgress !== null && (
          <Box sx={{ mt: 1, mr: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Uploading file... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 0.5 }} />
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      {chatStatus === 'connected' && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {settings.enable_file_uploads && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept={settings.allowed_file_types_json ? JSON.parse(settings.allowed_file_types_json).join(',') : '*'}
                />
                <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                  <AttachFile />
                </IconButton>
              </>
            )}
            
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={inputMessage || ''}
              onChange={(e) => {
                setInputMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            
            <IconButton 
              color="primary" 
              onClick={sendMessage}
              disabled={!inputMessage.trim()}
            >
              <Send />
            </IconButton>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default GuestChatInterface;