'use client';

import { useEffect, useRef } from 'react';
import { 
  Box, Paper, Typography, IconButton, Badge,
  Fade, Zoom, Collapse, TextField, Button,
  CircularProgress, Chip, Avatar, Divider,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  ChatBubbleOutline, Close, Send, AttachFile,
  AccessTime, CheckCircle, Error, Minimize, Maximize
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { usePublicChatLogic } from '@/hooks/usePublicChatLogic';

interface PublicChatWidgetProps {
  enabledPages?: string[];
  disabledPages?: string[];
}

export const PublicChatWidget = ({ enabledPages = [], disabledPages = [] }: PublicChatWidgetProps) => {
  // Use shared business logic hook
  const {
    // State
    settings,
    isOpen,
    isMinimized,
    loading,
    isOnline,
    showWidget,
    unreadCount,
    sessionId,
    queuePosition,
    connectedAgent,
    messages,
    inputMessage,
    isTyping,
    agentTyping,
    showPreChatForm,
    preChatData,
    preChatErrors,
    displayedAgents,
    isDragging,
    dragOffset,
    widgetPosition,
    chatContainerRef,

    // Setters
    setInputMessage,
    setPreChatData,
    setIsDragging,
    setDragOffset,
    setWidgetPosition,

    // Functions
    handleSendMessage,
    handleWidgetClick,
    handleClose,
    toggleMinimize,
    handleTyping,
    handlePreChatSubmit,
    checkSessionRecovery,
    sessionDisconnected,
    showReconnectOption,
    reconnectLoading,
    handleSessionDisconnect,
    handleReconnectToPreviousSession,
    handleStartNewSession
  } = usePublicChatLogic({ enabledPages, disabledPages });

  const widgetRef = useRef<HTMLDivElement>(null);

  // Debug helper - expose to window for console testing
  useEffect(() => {
    (window as any).debugChatWidget = {
      checkLocalStorage: () => {
        const session = localStorage.getItem('public_chat_session');
        console.log('📱 Current localStorage session:', session);
        return session;
      },
      checkSessionRecovery: () => {
        console.log('🔄 Manual session recovery check');
        checkSessionRecovery();
      },
      checkSettings: () => {
        console.log('⚙️ Current settings:', settings);
        return settings;
      },
      getCurrentState: () => {
        console.log('📊 Current widget state:', {
          isOpen,
          sessionId,
          showPreChatForm,
          messages,
          settings: settings?.session_recovery_enabled
        });
      }
    };
  }, [settings, isOpen, sessionId, showPreChatForm, messages, checkSessionRecovery]);

  // Enhanced drag functionality with movement threshold
  useEffect(() => {
    const DRAG_THRESHOLD = 5; // pixels

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const initialMousePos = (window as any).initialMousePos || { x: e.clientX, y: e.clientY };
        
        // Check if we've moved beyond the threshold
        if (!(window as any).hasDraggedBeyondThreshold) {
          const deltaX = Math.abs(e.clientX - initialMousePos.x);
          const deltaY = Math.abs(e.clientY - initialMousePos.y);
          
          if (deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD) {
            return; // Haven't moved enough to be considered dragging
          }
          
          (window as any).hasDraggedBeyondThreshold = true;
          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
        }

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Constrain to viewport
        const maxX = window.innerWidth - 64;
        const maxY = window.innerHeight - 64;
        
        setWidgetPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        setIsDragging(false);
        
        // If we didn't drag beyond threshold, treat as a click
        if (!(window as any).hasDraggedBeyondThreshold) {
          // Trigger widget click
          handleWidgetClick();
        } else {
          // Save position to localStorage for persistence
          if (settings?.widget_position === 'custom') {
            localStorage.setItem('widget_custom_position', JSON.stringify(widgetPosition));
          }
        }
        
        // Reset flags
        (window as any).hasDraggedBeyondThreshold = false;
        (window as any).initialMousePos = null;
      }
      
      // Reset cursor and selection
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset, widgetPosition, settings, setIsDragging, setWidgetPosition, handleWidgetClick]);

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
    
    const positions: { [key: string]: any } = {
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

  // Handle widget click (drag prevention is handled in mouseUp)
  const handleWidgetClickWithDrag = (e: React.MouseEvent) => {
    // Only trigger click if position is not 'custom' or if chat is already open
    const position = settings?.widget?.position || settings?.widget_position;
    if (position !== 'custom' || isOpen) {
      handleWidgetClick();
    }
    // For custom position with closed chat, drag logic handles click vs drag
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    const position = settings?.widget?.position || settings?.widget_position;
    if (position === 'custom' && !isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
      
      // Store initial position for threshold detection
      (window as any).initialMousePos = { x: e.clientX, y: e.clientY };
      (window as any).hasDraggedBeyondThreshold = false;
    }
  };

  // Render loading state
  if (loading || !settings) {
    return null;
  }

  // Don't show if disabled or widget visibility is false
  if (!settings.enabled || !showWidget) {
    console.log('Widget hidden - enabled:', settings.enabled, 'showWidget:', showWidget);
    return null;
  }

  const widgetSize = getWidgetSize();
  const borderRadius = getBorderRadius();
  const position = getWidgetPosition();
  const animationVariants = getAnimationVariants();

  // Debug widget styling
  console.log('PublicChatWidget - Widget styling debug:', {
    widgetSize,
    borderRadius,
    position,
    backgroundColor: settings?.status === 'online' ? 
      (settings?.widget?.color || settings?.widget_color || '#1976d2') : 
      '#9e9e9e',
    opacity: settings?.status === 'online' ? 1 : 0.7,
    status: settings?.status,
    shape: settings?.widget?.shape || settings?.widget_shape,
    color: settings?.widget?.color || settings?.widget_color
  });

  return (
    <>
      {/* Chat Widget Button */}
      <AnimatePresence>
        {!isOpen && (
          <>
            {/* Professional Chat Widget - Plain HTML/CSS to avoid Material-UI conflicts */}
            <div
              ref={widgetRef}
              style={{
                position: 'fixed',
                bottom: position?.bottom || '24px',
                right: position?.right || '24px',
                left: position?.left,
                top: position?.top,
                width: `${widgetSize}px`,
                height: `${widgetSize}px`,
                backgroundColor: settings?.status === 'online' ? 
                  (settings?.widget?.color || settings?.widget_color || '#1976d2') : 
                  '#9e9e9e',
                // Add backdrop blur and border for transparent backgrounds
                ...(((settings?.widget?.color || settings?.widget_color) === 'transparent') ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                } : {}),
                borderRadius: settings?.widget?.shape === 'square' ? '8px' : '50%',
                zIndex: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${widgetSize * 0.4}px`,
                color: 'white',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                opacity: settings?.status === 'online' ? 1 : 0.7,
                transition: 'all 0.2s ease-in-out',
                border: 'none'
              }}
              onClick={handleWidgetClickWithDrag}
              onMouseDown={handleMouseDown}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0px 6px 20px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.15)';
              }}
            >
              {/* Widget Content */}
              {settings?.widget_image ? (
                /* Brooch-style image display */
                <div
                  style={{
                    width: `${widgetSize * 0.8}px`,
                    height: `${widgetSize * 0.8}px`,
                    borderRadius: settings?.widget?.shape === 'circle' || settings?.widget_shape === 'circle' ? '50%' : '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <img 
                    src={settings.widget_image} 
                    alt="Chat Support"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ) : (() => {
                // Default chat icon
                return (
                  <span style={{ fontSize: `${widgetSize * 0.4}px` }}>
                    💬
                  </span>
                );
              })()}
              
              {/* Unread Count Badge */}
              {unreadCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </div>
          </>
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
            {(console.log('🎨 Rendering theme:', settings?.widget_theme), settings?.widget_theme === 'modern') ? (
              // Modern Theme Layout
              <Paper
                elevation={8}
                sx={{
                  width: { xs: '90vw', sm: 380 },
                  maxWidth: 380,
                  height: isMinimized ? 60 : { xs: '70vh', sm: 500 },
                  maxHeight: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 3
                }}
              >
                {/* Modern Header with Staff Avatars */}
                <Box
                  sx={{
                    backgroundColor: 'white',
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Back Button */}
                    <IconButton size="small" sx={{ color: '#666' }}>
                      <Box sx={{ transform: 'rotate(180deg)' }}>→</Box>
                    </IconButton>
                    
                    {/* Staff Avatars - Rotating */}
                    <Box sx={{ display: 'flex', ml: 1 }}>
                      {displayedAgents.map((agent, index) => (
                        <motion.div
                          key={`${agent.id}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <Avatar
                            src={agent.profilePicture}
                            sx={{
                              width: 32,
                              height: 32,
                              ml: index > 0 ? -0.5 : 0,
                              border: '2px solid white',
                              backgroundColor: agent.profilePicture ? 'transparent' : (agent.avatarColor || '#8B4513')
                            }}
                          >
                            {!agent.profilePicture && agent.initials}
                          </Avatar>
                        </motion.div>
                      ))}
                    </Box>
                    
                    {/* Title and Wait Time */}
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#333' }}>
                        IT Support
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14, color: '#666' }} />
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {queuePosition && queuePosition > 1 ? (
                            `~${Math.max(1, (queuePosition - 1) * 3)} min wait`
                          ) : displayedAgents.length > 0 ? (
                            'Available now'
                          ) : (
                            'Connecting...'
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Header Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" sx={{ color: '#666' }}>
                      <Box>⋯</Box>
                    </IconButton>
                    <IconButton size="small" onClick={handleClose} sx={{ color: '#666' }}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* Modern Chat Content */}
                {!isMinimized && (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
                    {/* Messages Area */}
                    <Box
                      ref={chatContainerRef}
                      sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: messages.length === 0 ? 'center' : 'flex-start'
                      }}
                    >
                      {messages.length === 0 ? (
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            textAlign: 'center', 
                            color: '#666',
                            fontSize: '16px'
                          }}
                        >
                          Ask us anything, or share your feedback.
                        </Typography>
                      ) : (
                        messages.map((message, index) => (
                          <Box key={index} sx={{ mb: 2 }}>
                            {message.sender === 'system' ? (
                              <Paper
                                sx={{
                                  p: 1.5,
                                  mb: 1,
                                  backgroundColor: 
                                    message.type === 'error' ? '#ffebee' :
                                    message.type === 'success' ? '#e8f5e8' :
                                    message.type === 'info' ? '#e3f2fd' :
                                    '#f5f5f5',
                                  border: `1px solid ${
                                    message.type === 'error' ? '#ffcdd2' :
                                    message.type === 'success' ? '#c8e6c9' :
                                    message.type === 'info' ? '#bbdefb' :
                                    '#e0e0e0'
                                  }`,
                                  borderRadius: 2,
                                  textAlign: 'center'
                                }}
                              >
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 
                                      message.type === 'error' ? '#d32f2f' :
                                      message.type === 'success' ? '#2e7d32' :
                                      message.type === 'info' ? '#1976d2' :
                                      '#666',
                                    fontWeight: message.type === 'error' ? 'medium' : 'normal'
                                  }}
                                >
                                  {message.text}
                                </Typography>
                              </Paper>
                            ) : (
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: message.sender === 'guest' ? 'flex-end' : 'flex-start',
                                }}
                              >
                                {message.sender === 'agent' && message.agentName && (
                                  <Typography variant="caption" sx={{ 
                                    color: '#666', 
                                    mb: 0.5,
                                    px: 1,
                                    fontWeight: 500
                                  }}>
                                    {message.agentName}
                                  </Typography>
                                )}
                                <Paper
                                  sx={{
                                    p: 2,
                                    maxWidth: '70%',
                                    backgroundColor: message.sender === 'guest' ? '#007bff' : '#f0f0f0',
                                    color: message.sender === 'guest' ? 'white' : '#333',
                                    borderRadius: 2
                                  }}
                                >
                                  <Typography variant="body2">
                                    {message.text}
                                  </Typography>
                                </Paper>
                              </Box>
                            )}
                          </Box>
                        ))
                      )}
                    </Box>

                    {/* Modern Input Area */}
                    <Box sx={{ p: 2 }}>
                      <Paper
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          border: '2px solid #ff9800',
                          borderRadius: 6,
                          backgroundColor: 'white'
                        }}
                      >
                        <IconButton size="small" sx={{ color: '#666' }}>
                          😊
                        </IconButton>
                        <IconButton size="small" sx={{ color: '#666' }}>
                          GIF
                        </IconButton>
                        <IconButton size="small" sx={{ color: '#666' }}>
                          📎
                        </IconButton>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Message..."
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          variant="standard"
                          InputProps={{
                            disableUnderline: true
                          }}
                        />
                        <IconButton size="small" sx={{ color: '#666' }}>
                          🎤
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={handleSendMessage}
                          disabled={!inputMessage.trim()}
                          sx={{ 
                            backgroundColor: !inputMessage.trim() ? '#f0f0f0' : '#007bff',
                            color: !inputMessage.trim() ? '#666' : 'white',
                            '&:hover': {
                              backgroundColor: !inputMessage.trim() ? '#f0f0f0' : '#0056b3'
                            }
                          }}
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Box>
                  </Box>
                )}

                {/* Modern Minimize Button */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -25,
                    right: 20,
                    backgroundColor: '#ff9800',
                    borderRadius: '50%',
                    width: 50,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                  onClick={toggleMinimize}
                >
                  <Box sx={{ color: 'white', fontSize: '20px', transform: isMinimized ? 'rotate(180deg)' : 'none' }}>
                    ⌄
                  </Box>
                </Box>
              </Paper>
            ) : (
              // Classic Theme Layout would go here
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

                {/* Classic Chat Content */}
                <Collapse in={!isMinimized} timeout="auto">
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Session Reconnect Options */}
                    {showReconnectOption && (
                      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', backgroundColor: '#fff3cd' }}>
                        <Typography variant="h6" gutterBottom sx={{ color: '#856404', display: 'flex', alignItems: 'center', gap: 1 }}>
                          🔌 Session Disconnected
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Your chat session was disconnected. You can try to reconnect to your previous conversation if it was within the last 2 hours.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                          <Button
                            variant="contained"
                            onClick={handleReconnectToPreviousSession}
                            disabled={reconnectLoading}
                            startIcon={reconnectLoading ? <CircularProgress size={16} /> : '🔄'}
                            sx={{
                              backgroundColor: '#28a745',
                              '&:hover': { backgroundColor: '#218838' },
                              flex: 1
                            }}
                          >
                            {reconnectLoading ? 'Searching...' : 'Reconnect to Previous Session'}
                          </Button>
                          
                          <Button
                            variant="outlined"
                            onClick={handleStartNewSession}
                            disabled={reconnectLoading}
                            sx={{
                              borderColor: '#6c757d',
                              color: '#6c757d',
                              '&:hover': { borderColor: '#5a6268', backgroundColor: 'rgba(108, 117, 125, 0.04)' },
                              flex: 1
                            }}
                          >
                            Start New Session
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {/* Pre-Chat Form */}
                    {showPreChatForm && (
                      <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Start a Conversation
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          {settings?.welcome_message || 'Please fill out the form below to get started.'}
                        </Typography>

                        {/* Form Fields Container */}
                        <Box sx={{ '& > *': { mb: 2 } }}>
                          {/* Name Field */}
                          {settings?.require_name && (
                            <TextField
                              fullWidth
                              size="small"
                              label="Your Name *"
                              value={preChatData.name || ''}
                              onChange={(e) => setPreChatData(prev => ({ ...prev, name: e.target.value }))}
                              error={!!preChatErrors.name}
                              helperText={preChatErrors.name}
                              autoComplete="off"
                            />
                          )}

                          {/* Email Field */}
                          {settings?.require_email && (
                            <TextField
                              fullWidth
                              size="small"
                              type="email"
                              label="Email Address *"
                              value={preChatData.email || ''}
                              onChange={(e) => setPreChatData(prev => ({ ...prev, email: e.target.value }))}
                              error={!!preChatErrors.email}
                              helperText={preChatErrors.email}
                              autoComplete="off"
                            />
                          )}

                          {/* Message Field */}
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
                            sx={{ mb: 3 }}
                            autoComplete="off"
                          />
                        </Box>

                        {/* Submit Button */}
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handlePreChatSubmit}
                          disabled={loading || !isOnline}
                          sx={{ 
                            backgroundColor: settings?.widget?.color || settings?.widget_color || '#1976d2',
                            '&:hover': { 
                              backgroundColor: settings?.widget?.color || settings?.widget_color || '#1976d2',
                              opacity: 0.9 
                            },
                            mb: 2
                          }}
                        >
                          {loading ? (
                            <CircularProgress size={20} sx={{ color: 'white' }} />
                          ) : (
                            'Start Chat'
                          )}
                        </Button>
                      </Box>
                    )}

                    {/* Chat Interface - Only show when not showing pre-chat form */}
                    {!showPreChatForm && (
                      <>
                        {/* Messages Area */}
                        <Box
                          ref={chatContainerRef}
                          sx={{
                            flex: 1,
                            overflow: 'auto',
                            p: 2,
                            backgroundColor: '#f5f5f5',
                            maxHeight: '400px',
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column'
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
                          
                          {/* Messages */}
                          {messages.map((message, index) => {
                            // Handle different message types
                            if (message.sender === 'system') {
                              return (
                                <Box key={index} sx={{ textAlign: 'center', my: 1 }}>
                                  <Chip 
                                    label={message.text}
                                    size="small"
                                    sx={{ 
                                      backgroundColor: 
                                        message.type === 'error' ? '#ffebee' :
                                        message.type === 'success' ? '#e8f5e8' :
                                        message.type === 'info' ? '#e3f2fd' :
                                        '#e3f2fd',
                                      color: 
                                        message.type === 'error' ? '#d32f2f' :
                                        message.type === 'success' ? '#2e7d32' :
                                        message.type === 'info' ? '#1976d2' :
                                        '#1976d2',
                                      fontSize: '0.75rem',
                                      fontWeight: message.type === 'error' ? 'medium' : 'normal',
                                      border: message.type === 'error' ? '1px solid #ffcdd2' : 'none'
                                    }}
                                  />
                                </Box>
                              );
                            }

                            return (
                              <Box
                                key={index}
                                sx={{
                                  display: 'flex',
                                  justifyContent: message.sender === 'guest' ? 'flex-end' : 'flex-start',
                                  mb: 1
                                }}
                              >
                                <Box>
                                  {message.sender === 'agent' && message.agentName && (
                                    <Typography variant="caption" sx={{ 
                                      color: 'text.secondary', 
                                      display: 'block', 
                                      mb: 0.5,
                                      fontWeight: 500
                                    }}>
                                      {message.agentName}
                                    </Typography>
                                  )}
                                  <Paper
                                    sx={{
                                      p: 1.5,
                                      maxWidth: '70%',
                                      backgroundColor: message.sender === 'guest' ? 
                                        (settings?.widget?.color || settings?.widget_color || '#1976d2') : 
                                        message.sender === 'agent' ? '#ffffff' : '#f5f5f5',
                                      color: message.sender === 'guest' ? 'white' : 'text.primary',
                                      border: message.sender === 'agent' ? '1px solid #e0e0e0' : 'none'
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
                              </Box>
                            );
                          })}
                        </Box>

                        {/* Session Disconnected Message in Chat Area */}
                        {sessionDisconnected && !showReconnectOption && (
                          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: '#f8d7da', textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ color: '#721c24', mb: 2 }}>
                              🔌 Session disconnected. Try reconnecting or start a new session.
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleReconnectToPreviousSession}
                                disabled={reconnectLoading}
                                sx={{ backgroundColor: '#28a745', '&:hover': { backgroundColor: '#218838' } }}
                              >
                                {reconnectLoading ? 'Searching...' : 'Reconnect'}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={handleStartNewSession}
                                disabled={reconnectLoading}
                              >
                                New Session
                              </Button>
                            </Box>
                          </Box>
                        )}

                        {/* Input Area */}
                        {isOnline && !sessionDisconnected && (
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
                                value={inputMessage || ''}
                                onChange={(e) => {
                                  setInputMessage(e.target.value);
                                  handleTyping();
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                disabled={!sessionId}
                              />
                              <IconButton
                                color="primary"
                                disabled={!inputMessage.trim() || !sessionId}
                                onClick={handleSendMessage}
                              >
                                <Send />
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};