'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Box, Paper, Typography, IconButton, Badge,
  Fade, Zoom, Collapse, TextField, Button,
  CircularProgress, Chip, Avatar, Divider
} from '@mui/material';
import {
  ChatBubbleOutline, Close, Send, AttachFile,
  AccessTime, CheckCircle, Error, Minimize, Maximize
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface PublicChatWidgetProps {
  enabledPages?: string[];
  disabledPages?: string[];
}

interface WidgetSettings {
  enabled: boolean;
  showWidget?: boolean;
  status?: 'online' | 'offline' | 'outside_hours';
  message?: string;
  outsideBusinessHours?: boolean;
  widget?: {
    shape: 'circle' | 'square' | 'rounded';
    color: string;
    size: 'small' | 'medium' | 'large';
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';
    text: string;
    animation: string;
    animationDuration: number;
    animationDelay: number;
  };
  messages?: {
    welcome: string;
    offline: string;
  };
  schedule?: any;
  nextAvailable?: string;
  // Legacy fields for backwards compatibility
  business_hours_enabled?: boolean;
  timezone?: string;
  schedule_json?: string;
  holidays_json?: string;
  widget_shape?: 'circle' | 'square' | 'rounded';
  widget_color?: string;
  widget_size?: 'small' | 'medium' | 'large';
  widget_position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';
  widget_position_x?: number;
  widget_position_y?: number;
  widget_image?: string;
  widget_text?: string;
  widget_animation?: string;
  animation_duration?: number;
  animation_delay?: number;
  welcome_message?: string;
  offline_message?: string;
  business_hours_message?: string;
  queue_message?: string;
  staff_disconnect_message?: string;
  require_name?: boolean;
  require_email?: boolean;
  require_phone?: boolean;
  require_department?: boolean;
  custom_fields_json?: string;
  show_agent_typing?: boolean;
  show_queue_position?: boolean;
  enable_file_uploads?: boolean;
  enable_screenshot_sharing?: boolean;
  max_file_size_mb?: number;
  allowed_file_types_json?: string;
  typing_indicators_enabled?: boolean;
  typing_timeout_seconds?: number;
  show_staff_typing_to_guests?: boolean;
  show_guest_typing_to_staff?: boolean;
  typing_indicator_text?: string;
  typing_indicator_style?: string;
  read_receipts_enabled?: boolean;
  show_delivery_status?: boolean;
  show_guest_read_status_to_staff?: boolean;
  show_staff_read_status_to_guests?: boolean;
  read_receipt_style?: string;
  delivery_status_icons?: string;
  session_recovery_enabled?: boolean;
  session_recovery_minutes?: number;
  auto_ticket_creation?: boolean;
}

export const PublicChatWidget = ({ enabledPages = [], disabledPages = [] }: PublicChatWidgetProps) => {
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [connectedAgent, setConnectedAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [widgetPosition, setWidgetPosition] = useState({ x: 0, y: 0 });
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load widget settings on mount
  useEffect(() => {
    loadWidgetSettings();
    checkPageVisibility();
    checkSessionRecovery();
  }, []);

  // Initialize widget position after settings load
  useEffect(() => {
    if (settings) {
      initializeWidgetPosition();
    }
  }, [settings]);

  // Add drag event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && widgetRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - widgetRef.current.offsetWidth;
        const maxY = window.innerHeight - widgetRef.current.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        setWidgetPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save position to localStorage for persistence
        if (settings?.widget_position === 'custom') {
          localStorage.setItem('widget_custom_position', JSON.stringify(widgetPosition));
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset, widgetPosition, settings]);

  // Check page visibility rules
  const checkPageVisibility = () => {
    const currentPath = window.location.pathname;
    
    // Check if current page is in disabled pages
    if (disabledPages.length > 0 && disabledPages.includes(currentPath)) {
      setShowWidget(false);
      return;
    }
    
    // Check if current page is in enabled pages (if specified)
    if (enabledPages.length > 0 && !enabledPages.includes(currentPath)) {
      setShowWidget(false);
      return;
    }
    
    setShowWidget(true);
  };

  // Load settings from API
  const loadWidgetSettings = async () => {
    try {
      const response = await fetch('/api/public-portal/widget-status');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setIsOnline(data.status === 'online');
        
        // Parse JSON fields if they exist
        if (data.schedule_json) {
          data.schedule = JSON.parse(data.schedule_json);
        }
        if (data.holidays_json) {
          data.holidays = JSON.parse(data.holidays_json);
        }
        if (data.custom_fields_json) {
          data.custom_fields = JSON.parse(data.custom_fields_json);
        }
        if (data.allowed_file_types_json) {
          data.allowed_file_types = JSON.parse(data.allowed_file_types_json);
        }
        if (data.delivery_status_icons) {
          data.delivery_icons = JSON.parse(data.delivery_status_icons);
        }
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Business hours checking is now handled by the API
  // const checkBusinessHours = () => { ... };

  // Check for existing session to recover
  const checkSessionRecovery = () => {
    if (!settings?.session_recovery_enabled) return;
    
    const storedSession = localStorage.getItem('public_chat_session');
    if (storedSession) {
      const session = JSON.parse(storedSession);
      const sessionAge = Date.now() - session.timestamp;
      const maxAge = settings.session_recovery_minutes * 60 * 1000;
      
      if (sessionAge < maxAge) {
        setSessionId(session.id);
        setMessages(session.messages || []);
        setUnreadCount(session.unreadCount || 0);
      } else {
        localStorage.removeItem('public_chat_session');
      }
    }
  };

  // Initialize widget position based on settings
  const initializeWidgetPosition = () => {
    if (!settings) return;

    if (settings.widget_position === 'custom') {
      // Try to load saved custom position
      const savedPosition = localStorage.getItem('widget_custom_position');
      if (savedPosition) {
        try {
          const position = JSON.parse(savedPosition);
          setWidgetPosition(position);
        } catch {
          // Fall back to admin-defined custom position or center
          const x = settings.widget_position_x ?? window.innerWidth / 2 - 32;
          const y = settings.widget_position_y ?? window.innerHeight / 2 - 32;
          setWidgetPosition({ x, y });
        }
      } else if (settings.widget_position_x !== undefined && settings.widget_position_y !== undefined) {
        // Use admin-defined custom position
        setWidgetPosition({ 
          x: settings.widget_position_x, 
          y: settings.widget_position_y 
        });
      } else {
        // Default to center of screen
        setWidgetPosition({ 
          x: window.innerWidth / 2 - 32, 
          y: window.innerHeight / 2 - 32 
        });
      }
    }
  };

  // Get widget size dimensions
  const getWidgetSize = () => {
    const size = settings?.widget?.size || settings?.widget_size;
    switch (size) {
      case 'small': return 48;
      case 'large': return 80;
      default: return 64;
    }
  };

  // Get widget border radius
  const getBorderRadius = () => {
    const shape = settings?.widget?.shape || settings?.widget_shape;
    switch (shape) {
      case 'circle': return '50%';
      case 'square': return 0;
      default: return 8;
    }
  };

  // Get widget position
  const getWidgetPosition = () => {
    const position = settings?.widget?.position || settings?.widget_position;
    if (position === 'custom') {
      return {
        left: widgetPosition.x,
        top: widgetPosition.y
      };
    }
    
    const positions = {
      'bottom-right': { bottom: 24, right: 24 },
      'bottom-left': { bottom: 24, left: 24 },
      'top-right': { top: 24, right: 24 },
      'top-left': { top: 24, left: 24 }
    };
    return positions[position || 'bottom-right'];
  };

  // Get animation variants
  const getAnimationVariants = () => {
    const animation = settings?.widget?.animation || settings?.widget_animation;
    const duration = settings?.widget?.animationDuration || settings?.animation_duration || 2000;
    const delay = settings?.widget?.animationDelay || settings?.animation_delay || 5000;
    const color = settings?.widget?.color || settings?.widget_color || '#1976d2';

    switch (animation) {
      case 'bounce':
        return {
          animate: { 
            y: [0, -10, 0],
            transition: { 
              duration: duration / 1000,
              repeat: Infinity,
              delay: delay / 1000
            }
          }
        };
      case 'pulse':
        return {
          animate: { 
            scale: [1, 1.1, 1],
            transition: { 
              duration: duration / 1000,
              repeat: Infinity,
              delay: delay / 1000
            }
          }
        };
      case 'shake':
        return {
          animate: { 
            rotate: [0, 5, -5, 0],
            transition: { 
              duration: duration / 1000,
              repeat: Infinity,
              delay: delay / 1000
            }
          }
        };
      case 'glow':
        return {
          animate: { 
            boxShadow: [
              `0 0 10px ${color}`,
              `0 0 20px ${color}`,
              `0 0 10px ${color}`
            ],
            transition: { 
              duration: duration / 1000,
              repeat: Infinity,
              delay: delay / 1000
            }
          }
        };
      default:
        return {};
    }
  };

  // Handle widget click
  const handleWidgetClick = (e: React.MouseEvent) => {
    // Don't open chat if user was dragging
    if (isDragging) {
      e.preventDefault();
      return;
    }
    
    if (!isOpen) {
      setIsOpen(true);
      setUnreadCount(0);
    }
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    const position = settings?.widget?.position || settings?.widget_position;
    if (position === 'custom' && !isOpen) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Handle close chat
  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // Handle minimize/maximize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Render loading state
  if (loading || !settings) {
    return null;
  }

  // Don't show if disabled or widget visibility is false
  if (!settings.showWidget || !showWidget) {
    return null;
  }

  const widgetSize = getWidgetSize();
  const borderRadius = getBorderRadius();
  const position = getWidgetPosition();
  const animationVariants = getAnimationVariants();

  return (
    <>
      {/* Chat Widget Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            ref={widgetRef}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            {...animationVariants}
            style={{
              position: 'fixed',
              ...position,
              zIndex: 9999,
              cursor: (settings?.widget?.position || settings?.widget_position) === 'custom' ? (isDragging ? 'grabbing' : 'grab') : 'pointer'
            }}
            onClick={handleWidgetClick}
            onMouseDown={handleMouseDown}
          >
            <Badge 
              badgeContent={unreadCount} 
              color="error"
              invisible={unreadCount === 0}
            >
              <Box
                sx={{
                  width: widgetSize,
                  height: widgetSize,
                  backgroundColor: settings?.status === 'online' ? 
                    (settings?.widget?.color || settings?.widget_color || '#1976d2') : 
                    '#9e9e9e',
                  borderRadius: borderRadius,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 3,
                  opacity: settings?.status === 'online' ? 1 : 0.7,
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
              >
                {(settings?.widget_image || settings?.widget?.text) ? (
                  <Avatar 
                    src={settings?.widget_image || ''} 
                    sx={{ width: widgetSize * 0.7, height: widgetSize * 0.7 }}
                  />
                ) : (
                  settings?.status === 'outside_hours' ? '🕒' :
                  settings?.status === 'offline' || settings?.status !== 'online' ? '💤' : 
                  <ChatBubbleOutline sx={{ color: 'white', fontSize: widgetSize * 0.5 }} />
                )}
              </Box>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              position: 'fixed',
              ...position,
              zIndex: 10000
            }}
          >
            <Paper
              elevation={8}
              sx={{
                width: { xs: '90vw', sm: 380 },
                maxWidth: 380,
                height: isMinimized ? 60 : { xs: '80vh', sm: 600 },
                maxHeight: 600,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {/* Chat Header */}
              <Box
                sx={{
                  backgroundColor: settings?.status === 'online' ? 
                    (settings?.widget?.color || settings?.widget_color || '#1976d2') : 
                    '#9e9e9e',
                  color: 'white',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {settings?.widget_image ? (
                    <Avatar src={settings.widget_image} sx={{ width: 32, height: 32 }} />
                  ) : (
                    settings?.status === 'outside_hours' ? '🕒' :
                    settings?.status !== 'online' ? '💤' : 
                    <ChatBubbleOutline />
                  )}
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {settings?.widget?.text || settings?.widget_text || 'Live Chat'}{' '}
                      {settings?.status === 'outside_hours' ? '(Outside Hours)' :
                       settings?.status !== 'online' ? '(Offline)' : ''}
                    </Typography>
                    {connectedAgent && (
                      <Typography variant="caption">
                        Chat with {connectedAgent}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <IconButton size="small" onClick={toggleMinimize} sx={{ color: 'white' }}>
                    {isMinimized ? <Maximize fontSize="small" /> : <Minimize fontSize="small" />}
                  </IconButton>
                  <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Chat Content */}
              <Collapse in={!isMinimized} timeout="auto">
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Online/Offline Status */}
                  {!isOnline && (
                    <Box sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                      <Typography variant="body2" color="text.secondary">
                        {settings?.message || 
                         settings?.messages?.offline || 
                         settings?.offline_message || 
                         'We are currently offline. Please submit a ticket.'}
                      </Typography>
                      {settings?.nextAvailable && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Next available: {settings.nextAvailable}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Messages Area */}
                  <Box
                    ref={chatContainerRef}
                    sx={{
                      flex: 1,
                      overflow: 'auto',
                      p: 2,
                      backgroundColor: '#f5f5f5'
                    }}
                  >
                    {messages.length === 0 && isOnline && (
                      <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {settings?.messages?.welcome || 
                           settings?.welcome_message || 
                           'Hi! How can we help you today?'}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Queue Position */}
                    {queuePosition !== null && !connectedAgent && (
                      <Box sx={{ textAlign: 'center', my: 2 }}>
                        <Chip
                          icon={<AccessTime />}
                          label={`Position in queue: ${queuePosition}`}
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          {settings?.queue_message || 'Please wait for the next available agent.'}
                        </Typography>
                      </Box>
                    )}

                    {/* Messages */}
                    {messages.map((message, index) => (
                      <Box
                        key={index}
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
                            backgroundColor: message.sender === 'guest' ? 
                              (settings?.widget?.color || settings?.widget_color || '#1976d2') : 
                              'white',
                            color: message.sender === 'guest' ? 'white' : 'text.primary'
                          }}
                        >
                          <Typography variant="body2">
                            {message.text}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}

                    {/* Agent Typing Indicator */}
                    {agentTyping && settings?.show_staff_typing_to_guests && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Agent {settings?.typing_indicator_text || 'is typing...'}
                        </Typography>
                        {settings?.typing_indicator_style === 'dots' && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <motion.div
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                            >
                              <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'text.secondary' }} />
                            </motion.div>
                            <motion.div
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                            >
                              <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'text.secondary' }} />
                            </motion.div>
                            <motion.div
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                            >
                              <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'text.secondary' }} />
                            </motion.div>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Input Area */}
                  {isOnline && (
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {settings?.enable_file_uploads && (
                          <IconButton size="small">
                            <AttachFile />
                          </IconButton>
                        )}
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Type your message..."
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              // Handle send message
                            }
                          }}
                          disabled={!connectedAgent && queuePosition === null}
                        />
                        <IconButton
                          color="primary"
                          disabled={!inputMessage.trim() || (!connectedAgent && queuePosition === null)}
                        >
                          <Send />
                        </IconButton>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};