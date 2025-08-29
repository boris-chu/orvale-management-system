'use client';

import { useState, useEffect, useRef } from 'react';
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
import { publicPortalSocket } from '@/lib/public-portal-socket';

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
  show_agent_avatars?: boolean;
  agent_avatar_anonymity?: boolean;
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
  const [showPreChatForm, setShowPreChatForm] = useState(false);
  const [preChatData, setPreChatData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    message: ''
  });

  const [preChatErrors, setPreChatErrors] = useState<{ [key: string]: string }>({});
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  }, [settings, isOpen, sessionId, showPreChatForm, messages]);

  // Debug form rendering - looking for "00" issue  
  useEffect(() => {
    if (showPreChatForm && settings) {
      console.log('🔍 DEBUG - Form state when showing:', {
        require_name: settings?.require_name,
        require_email: settings?.require_email, 
        require_phone: settings?.require_phone,
        require_department: settings?.require_department,
        preChatData,
        settings_widget_position_x: settings?.widget_position_x,
        settings_widget_position_y: settings?.widget_position_y,
        any_zero_values: Object.entries(settings).filter(([key, value]) => value === 0 || value === '0').map(([key, value]) => ({ [key]: value }))
      });
    }
  }, [showPreChatForm, settings, preChatData]);

  // Load widget settings on mount
  useEffect(() => {
    loadWidgetSettings();
    checkPageVisibility();
    loadAvailableAgents();
  }, []);

  // Check session recovery after settings are loaded
  useEffect(() => {
    if (settings) {
      checkSessionRecovery();
    }
  }, [settings]);

  // Refresh agents periodically while widget is open
  useEffect(() => {
    if (isOpen && showPreChatForm) {
      const interval = setInterval(loadAvailableAgents, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen, showPreChatForm]);

  // Set up Socket.io connection when widget opens
  useEffect(() => {
    if (isOpen && settings?.enabled) {
      const componentId = `public_chat_widget_${Date.now()}`;
      
      // Connect to public portal socket
      publicPortalSocket.connect();
      
      // Check for automatic session recovery
      const recoverySessionId = sessionStorage.getItem('recovery_session_id');
      const recoveryGuestInfo = sessionStorage.getItem('recovery_guest_info');
      
      if (recoverySessionId && recoveryGuestInfo && sessionId) {
        console.log('🔄 Auto-attempting session recovery for:', recoverySessionId);
        try {
          const guestInfo = JSON.parse(recoveryGuestInfo);
          startChatSession(guestInfo); // This will handle the recovery internally
        } catch (error) {
          console.error('Failed to parse recovery guest info:', error);
          sessionStorage.removeItem('recovery_session_id');
          sessionStorage.removeItem('recovery_guest_info');
          setLoading(false);
        }
      }

      // Set up event listeners
      publicPortalSocket.addEventListener(componentId, 'session:started', (data) => {
        console.log('Chat session started:', data);
        setSessionId(data.sessionId);
        setQueuePosition(data.queuePosition || 1); // Default to position 1 if undefined
        setLoading(false);
        
        // Store session for recovery
        if (settings?.session_recovery_enabled) {
          const sessionData = {
            id: data.sessionId,
            timestamp: Date.now(),
            messages: messages,
            unreadCount: unreadCount,
            guestName: preChatData.name,
            guestEmail: preChatData.email,
            guestPhone: preChatData.phone,
            guestDepartment: preChatData.department
          };
          console.log('💾 Saving session to localStorage:', sessionData);
          localStorage.setItem('public_chat_session', JSON.stringify(sessionData));
          console.log('✅ Session saved to localStorage');
        } else {
          console.log('❌ Session recovery disabled, not saving to localStorage');
        }
        
        // Clear pre-chat form and show chat interface
        setShowPreChatForm(false);
        
        // Add system message about queue position
        const position = data.queuePosition || 1;
        if (position > 1) {
          const queueMessage = {
            sender: 'system',
            text: `You are position ${position} in queue. ${data.estimatedWaitTime ? `Estimated wait time: ${data.estimatedWaitTime} minutes.` : 'Please wait for the next available agent.'}`,
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => {
            const updatedMessages = [...prev, queueMessage];
            
            // Update localStorage with new messages
            if (settings?.session_recovery_enabled) {
              console.log('💾 Updating localStorage with new message');
              localStorage.setItem('public_chat_session', JSON.stringify({
                id: data.sessionId,
                timestamp: Date.now(),
                messages: updatedMessages,
                unreadCount: unreadCount,
                guestName: preChatData.name,
                guestEmail: preChatData.email,
                guestPhone: preChatData.phone,
                guestDepartment: preChatData.department
              }));
            }
            
            return updatedMessages;
          });
        } else {
          const connectingMessage = {
            sender: 'system',
            text: 'Connecting you with an available agent...',
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => {
            const updatedMessages = [...prev, connectingMessage];
            
            // Update localStorage with new messages
            if (settings?.session_recovery_enabled) {
              console.log('💾 Updating localStorage with new message');
              localStorage.setItem('public_chat_session', JSON.stringify({
                id: data.sessionId,
                timestamp: Date.now(),
                messages: updatedMessages,
                unreadCount: unreadCount,
                guestName: preChatData.name,
                guestEmail: preChatData.email,
                guestPhone: preChatData.phone,
                guestDepartment: preChatData.department
              }));
            }
            
            return updatedMessages;
          });
        }
      });

      publicPortalSocket.addEventListener(componentId, 'session:error', (data) => {
        console.error('Session error:', data);
        setLoading(false);
        
        // Add error message to chat
        const errorMessage = {
          sender: 'system',
          text: data.message || 'Unable to start chat session. Please try again.',
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, errorMessage]);
      });

      publicPortalSocket.addEventListener(componentId, 'queue:update', (data) => {
        console.log('Queue update:', data);
        setQueuePosition(data.queuePosition);
        
        // Add queue update message
        const updateMessage = {
          sender: 'system',
          text: `Queue position updated: ${data.queuePosition}. ${data.estimatedWaitTime ? `Estimated wait time: ${data.estimatedWaitTime} minutes.` : ''}`,
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, updateMessage]);
      });

      // Listen for individual queue position updates
      publicPortalSocket.addEventListener(componentId, 'queue:position_update', (data) => {
        console.log('Queue position update:', data);
        if (data.queuePosition) {
          setQueuePosition(data.queuePosition);
          
          // Add position update message
          const positionMessage = {
            sender: 'system',
            text: `Queue position updated: ${data.queuePosition}. ${data.estimatedWaitTime ? `Estimated wait time: ${data.estimatedWaitTime} minutes.` : ''}`,
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => [...prev, positionMessage]);
        }
      });

      publicPortalSocket.addEventListener(componentId, 'agent:assigned', (data) => {
        console.log('Agent assigned:', data);
        setConnectedAgent(data.agentName);
        setQueuePosition(null);
        
        // Add welcome message from agent assignment
        const welcomeMessage = {
          sender: 'system',
          text: `You are now connected with ${data.agentName}. How can they help you today?`,
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, welcomeMessage]);
      });

      publicPortalSocket.addEventListener(componentId, 'agent:message', (data) => {
        console.log('Agent message received:', data);
        const newMessage = {
          sender: 'agent',
          text: data.message,
          timestamp: new Date(data.timestamp),
          id: data.messageId || Date.now()
        };
        setMessages(prev => [...prev, newMessage]);
        
        // Only increment unread count if chat is closed
        if (!isOpen || isMinimized) {
          setUnreadCount(prev => prev + 1);
        }
      });

      publicPortalSocket.addEventListener(componentId, 'agent:typing', (data) => {
        setAgentTyping(data.isTyping);
      });

      publicPortalSocket.addEventListener(componentId, 'message:delivered', (data) => {
        console.log('Message delivered:', data.messageId);
        // TODO: Update message status in UI to show delivered state
      });

      // Handle session end
      publicPortalSocket.addEventListener(componentId, 'session:ended', (data) => {
        console.log('Session ended:', data);
        setSessionId(null);
        setConnectedAgent(null);
        setQueuePosition(null);
        setAgentTyping(false);
        
        const endMessage = {
          sender: 'system',
          text: data.reason || 'Chat session has ended. Thank you for contacting us!',
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, endMessage]);
        
        // Clear session from localStorage when ended
        localStorage.removeItem('public_chat_session');
      });

      // Handle session recovery
      publicPortalSocket.addEventListener(componentId, 'session:recovered', (data) => {
        console.log('✅ Session recovered successfully:', data);
        setSessionId(data.sessionId);
        setLoading(false);
        setShowPreChatForm(false);
        
        if (data.status === 'waiting') {
          setQueuePosition(data.queuePosition);
          setConnectedAgent(null);
          
          const recoveryMessage = {
            sender: 'system',
            text: `Welcome back! You are in position ${data.queuePosition} in the queue. ${data.estimatedWaitTime ? `Estimated wait time: ${data.estimatedWaitTime} minutes.` : ''}`,
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => [...prev, recoveryMessage]);
        } else if (data.status === 'connected') {
          setQueuePosition(null);
          setConnectedAgent(data.agentName || 'Support Agent');
          
          const recoveryMessage = {
            sender: 'system',
            text: `Welcome back! You are still connected with your support agent. How can they continue to help you?`,
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => [...prev, recoveryMessage]);
        }
        
        // Update stored session
        localStorage.setItem('public_chat_session', JSON.stringify({
          id: data.sessionId,
          timestamp: Date.now(),
          messages: messages,
          unreadCount: unreadCount
        }));
      });

      // Listen for agent availability updates
      publicPortalSocket.addEventListener(componentId, 'agents:availability_changed', (data) => {
        console.log('Agent availability changed:', data);
        // Refresh available agents list
        loadAvailableAgents();
      });

      // Handle connection errors
      publicPortalSocket.addEventListener(componentId, 'connect_error', (error) => {
        console.log('Chat connection issue detected');
        setLoading(false);
        
        // Only add error message if we don't already have one
        setMessages(prev => {
          const hasErrorMessage = prev.some(msg => 
            msg.sender === 'system' && 
            msg.type === 'error' && 
            msg.text.includes('Chat service is temporarily unavailable')
          );
          
          if (!hasErrorMessage) {
            const errorMessage = {
              sender: 'system',
              text: error.userMessage || 'Chat service is temporarily unavailable. Please try submitting a ticket instead.',
              timestamp: new Date(),
              id: Date.now(),
              type: 'error'
            };
            return [...prev, errorMessage];
          }
          
          return prev;
        });
        
        // Set offline status
        setIsOnline(false);
      });

      // Cleanup
      return () => {
        publicPortalSocket.removeEventListeners(componentId);
      };
    }
  }, [isOpen, settings?.enabled]);

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
    console.log('PublicChatWidget - Checking page visibility for path:', currentPath, 'enabledPages:', enabledPages, 'disabledPages:', disabledPages);
    
    // Check if current page is in disabled pages
    if (disabledPages.length > 0 && disabledPages.includes(currentPath)) {
      console.log('PublicChatWidget - Page is in disabled pages list, hiding widget');
      setShowWidget(false);
      return;
    }
    
    // Check if current page is in enabled pages (if specified)
    if (enabledPages.length > 0 && !enabledPages.includes(currentPath)) {
      console.log('PublicChatWidget - Page is not in enabled pages list, hiding widget');
      setShowWidget(false);
      return;
    }
    
    console.log('PublicChatWidget - Page visibility check passed, showing widget');
    setShowWidget(true);
  };

  // Load settings from API
  const loadWidgetSettings = async () => {
    try {
      const response = await fetch('/api/public-portal/widget-settings');
      if (response.ok) {
        const data = await response.json();
        console.log('Widget settings loaded:', data);
        setSettings(data);
        
        // Set online status based on enabled state and business hours
        const isWidgetOnline = data.enabled && data.status === 'online';
        setIsOnline(isWidgetOnline);
        console.log('🟢 Widget online status:', isWidgetOnline, '| Status:', data.status, '| Enabled:', data.enabled, '| Ignore hours:', data.ignore_business_hours);
        
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
    console.log('🔍 Checking session recovery...');
    console.log('Settings:', settings);
    console.log('Session recovery enabled:', settings?.session_recovery_enabled);
    
    if (!settings?.session_recovery_enabled) {
      console.log('❌ Session recovery is disabled');
      return;
    }
    
    const storedSession = localStorage.getItem('public_chat_session');
    console.log('📱 Stored session from localStorage:', storedSession);
    
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        const sessionAge = Date.now() - session.timestamp;
        const maxAge = (settings.session_recovery_minutes || 10) * 60 * 1000;
        
        console.log('⏱️ Session age:', Math.round(sessionAge / 1000), 'seconds');
        console.log('⏳ Max age allowed:', Math.round(maxAge / 1000), 'seconds');
        
        if (sessionAge < maxAge) {
          console.log('🔄 Found recoverable session:', session.id);
          
          // Restore UI state immediately
          setSessionId(session.id);
          setMessages(session.messages || []);
          setUnreadCount(session.unreadCount || 0);
          setIsOpen(true); // Auto-open chat widget
          setShowPreChatForm(false); // Skip pre-chat form
          setLoading(true); // Show loading while attempting recovery
          
          // Set flag to attempt recovery on socket connection
          sessionStorage.setItem('recovery_session_id', session.id);
          sessionStorage.setItem('recovery_guest_info', JSON.stringify({
            name: session.guestName || 'Guest',
            email: session.guestEmail || '',
            phone: session.guestPhone || '',
            department: session.guestDepartment || ''
          }));
          
          console.log('✅ Session recovery state restored');
        } else {
          console.log('❌ Session expired, removing from storage');
          localStorage.removeItem('public_chat_session');
          sessionStorage.removeItem('recovery_session_id');
          sessionStorage.removeItem('recovery_guest_info');
        }
      } catch (error) {
        console.error('❌ Error parsing stored session:', error);
        localStorage.removeItem('public_chat_session');
      }
    } else {
      console.log('📭 No stored session found');
    }
  };

  // Load available agents for display
  const loadAvailableAgents = async () => {
    try {
      setAgentsLoading(true);
      const response = await fetch('/api/public-portal/available-agents');
      const data = await response.json();
      
      if (data.success) {
        setAvailableAgents(data.agents || []);
      } else {
        console.error('Failed to load available agents:', data.error);
        setAvailableAgents([]);
      }
    } catch (error) {
      console.error('Error loading available agents:', error);
      setAvailableAgents([]);
    } finally {
      setAgentsLoading(false);
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

  // Handle widget click with drag prevention
  const handleWidgetClickWithDrag = (e: React.MouseEvent) => {
    // Don't open chat if user was dragging
    if (isDragging) {
      e.preventDefault();
      return;
    }
    
    // Call the main widget click handler
    handleWidgetClick();
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
    // Clear messages to prevent error message accumulation
    setMessages([]);
    // Reset session state
    setSessionId(null);
    setShowPreChatForm(false);
  };

  // Handle sending messages
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !sessionId) return;

    const message = inputMessage.trim();
    
    // Add optimistic message to UI
    const newMessage = {
      sender: 'guest',
      text: message,
      timestamp: new Date(),
      id: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Send via Socket.io
    const success = publicPortalSocket.sendMessage(message);
    if (!success) {
      console.warn('Failed to send via Socket.io, trying HTTP fallback');
      // TODO: Implement HTTP fallback
    }
    
    // Stop typing indicator
    publicPortalSocket.sendTyping(false);
    setIsTyping(false);
    
    // Clear input and scroll to bottom
    setInputMessage('');
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!settings?.typing_indicators_enabled || !sessionId) return;
    
    if (!isTyping) {
      setIsTyping(true);
      publicPortalSocket.sendTyping(true);
    }
    
    // Set timeout to stop typing indicator
    setTimeout(() => {
      setIsTyping(false);
      publicPortalSocket.sendTyping(false);
    }, 3000);
  };

  // Validate pre-chat form
  const validatePreChatForm = () => {
    const errors: { [key: string]: string } = {};

    if (settings?.require_name && !preChatData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (settings?.require_email) {
      if (!preChatData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(preChatData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (settings?.require_phone && !preChatData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (settings?.require_department && !preChatData.department) {
      errors.department = 'Please select a department';
    }

    if (!preChatData.message.trim()) {
      errors.message = 'Please describe how we can help you';
    }

    setPreChatErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle pre-chat form submission
  const handlePreChatSubmit = async () => {
    if (!validatePreChatForm()) return;

    setLoading(true);
    
    try {
      // Call the session API to start a new chat session
      const response = await fetch('/api/public-portal/chat/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guest_info: {
            name: preChatData.name,
            email: preChatData.email,
            phone: preChatData.phone || null,
            department: preChatData.department || null
          },
          initial_message: preChatData.message
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Session started successfully
        setSessionId(result.sessionId || result.session_id);
        setQueuePosition(result.queuePosition || 1);
        setShowPreChatForm(false);
        
        // Add initial queue message
        const position = result.queuePosition || 1;
        const initialMessage = {
          sender: 'system',
          text: result.message || (position > 1 
            ? `You are position ${position} in queue. ${result.estimatedWaitTime ? `Estimated wait time: ${result.estimatedWaitTime} minutes.` : 'Please wait for the next available agent.'}` 
            : 'Connecting you with an available agent...'),
          timestamp: new Date(),
          id: Date.now()
        };
        setMessages(prev => [...prev, initialMessage]);
        
        // Initialize Socket.io connection with session
        const guestInfo = {
          name: preChatData.name,
          email: preChatData.email,
          phone: preChatData.phone,
          department: preChatData.department,
          sessionId: result.sessionId || result.session_id
        };
        
        startChatSession(guestInfo);
        
        // Add user's initial message to chat
        if (preChatData.message.trim()) {
          const userMessage = {
            sender: 'guest',
            text: preChatData.message,
            timestamp: new Date(),
            id: Date.now() + 1
          };
          setMessages(prev => [...prev, userMessage]);
        }
        
      } else {
        console.error('Failed to start chat session:', result.error);
        
        // Show user-friendly error message
        const errorMessage = {
          sender: 'system',
          text: result.error === 'Chat is currently disabled' 
            ? 'Chat support is currently unavailable. Please submit a ticket for assistance.'
            : 'Unable to start chat session. Please try again or submit a ticket.',
          timestamp: new Date(),
          id: Date.now(),
          type: 'error'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error starting chat session:', error);
      
      // Show user-friendly error message
      const errorMessage = {
        sender: 'system',
        text: 'Connection error. Please check your internet connection and try again, or submit a ticket for assistance.',
        timestamp: new Date(),
        id: Date.now(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle starting chat session (when pre-chat form data is available)
  const startChatSession = (guestInfo: { name: string; email: string; phone?: string; department?: string }) => {
    // Check if we have a recovery session ID
    const recoverySessionId = sessionStorage.getItem('recovery_session_id');
    
    if (recoverySessionId) {
      console.log('🔄 Attempting session recovery with ID:', recoverySessionId);
      sessionStorage.removeItem('recovery_session_id'); // Clear after use
      
      publicPortalSocket.startSession({
        ...guestInfo,
        recoverySessionId
      });
    } else {
      publicPortalSocket.startSession(guestInfo);
    }
  };

  // Handle widget click
  const handleWidgetClick = () => {
    if (settings?.enabled) {
      setIsOpen(true);
      
      // Clear unread count when chat is opened
      setUnreadCount(0);
      
      // If no active session, show pre-chat form
      if (!sessionId) {
        setShowPreChatForm(true);
      }
      
      // If there are messages, scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // Handle minimize/maximize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    
    // Clear unread count when maximizing
    if (isMinimized) {
      setUnreadCount(0);
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
                // Icon logic
                const getIcon = () => {
                  if (settings?.status === 'outside_hours') return '🕒';
                  if (settings?.status === 'offline' || settings?.status !== 'online') return '💤';
                  
                  // Use selected icon or fall back to defaults
                  const selectedIcon = settings?.widget_icon || settings?.widget?.icon;
                  
                  // SVG icons
                  const svgIcons: { [key: string]: JSX.Element } = {
                    'svg_chat_bubble': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                      </svg>
                    ),
                    'svg_chat_outline': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    ),
                    'svg_message_circle': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.54 0 3-.35 4.31-.99L22 22l-1.01-5.69C21.65 15 22 13.54 22 12c0-5.52-4.48-10-10-10z"/>
                      </svg>
                    ),
                    'svg_message_square': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <path d="M8 10h8M8 14h6"/>
                      </svg>
                    ),
                    'svg_speech_bubble': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L1 23l6.71-1.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                      </svg>
                    ),
                    'svg_help_circle': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <circle cx="12" cy="17" r="1"/>
                      </svg>
                    ),
                    'svg_support': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                    ),
                    'svg_headset': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
                      </svg>
                    ),
                    'svg_mail': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    ),
                    'svg_phone': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                      </svg>
                    ),
                    'svg_users': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    ),
                    'svg_info': (
                      <svg width={widgetSize * 0.5} height={widgetSize * 0.5} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      </svg>
                    )
                  };

                  // Emoji icons
                  const emojiIcons: { [key: string]: string } = {
                    'chat': '💬',
                    'support': '🎧', 
                    'help': '❓',
                    'message': '✉️',
                    'phone': '📞',
                    'user': '👤',
                    'team': '👥', 
                    'star': '⭐',
                    'heart': '❤️',
                    'info': 'ℹ️',
                    'settings': '⚙️',
                    'bell': '🔔'
                  };
                  
                  // Return SVG icon if it's an SVG type
                  if (selectedIcon && selectedIcon.startsWith('svg_') && svgIcons[selectedIcon]) {
                    return (
                      <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {svgIcons[selectedIcon]}
                      </div>
                    );
                  }
                  
                  // Return emoji icon
                  return (
                    <span style={{ fontSize: `${widgetSize * 0.4}px` }}>
                      {emojiIcons[selectedIcon] || '💬'}
                    </span>
                  );
                };
                
                return getIcon();
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
                  {/* Pre-Chat Form */}
                  {showPreChatForm && (
                    <Box sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Start a Conversation
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {settings?.welcome_message || 'Please fill out the form below to get started.'}
                      </Typography>


                      {/* Available Agents Display */}
                      {settings?.show_agent_avatars && availableAgents.length > 0 && (
                        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                            Our team is online and ready to help
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {availableAgents.slice(0, 4).map((agent) => (
                              <Box key={agent.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar
                                  src={agent.profilePicture}
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: agent.profilePicture ? 'transparent' : agent.avatarColor,
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    border: agent.availabilityLevel === 'high' ? '2px solid #4caf50' : '2px solid #ff9800',
                                    position: 'relative'
                                  }}
                                >
                                  {!agent.profilePicture && agent.initials}
                                  {/* Online indicator */}
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      bottom: -2,
                                      right: -2,
                                      width: 12,
                                      height: 12,
                                      backgroundColor: agent.isOnline ? '#4caf50' : '#9e9e9e',
                                      borderRadius: '50%',
                                      border: '2px solid white'
                                    }}
                                  />
                                </Avatar>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '10px', textAlign: 'center' }}>
                                  {settings?.agent_avatar_anonymity ? 'Support Agent' : agent.displayName}
                                </Typography>
                              </Box>
                            ))}
                            {availableAgents.length > 4 && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Avatar
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: '#e0e0e0',
                                    color: '#666',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  +{availableAgents.length - 4}
                                </Avatar>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '10px' }}>
                                  More agents
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Loading agents indicator */}
                      {agentsLoading && (
                        <Box sx={{ mb: 3, textAlign: 'center' }}>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary" display="inline">
                            Checking agent availability...
                          </Typography>
                        </Box>
                      )}

                      {/* No agents available */}
                      {!agentsLoading && availableAgents.length === 0 && isOnline && (
                        <Box sx={{ mb: 3, p: 2, backgroundColor: '#fff3e0', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No agents are currently available. We'll connect you as soon as someone comes online.
                          </Typography>
                        </Box>
                      )}

                      {/* Form Fields Container */}
                      <Box sx={{ '& > *': { mb: 2 } }}>
                        <Box sx={{ border: '1px solid orange', p: 0.5, mb: 1 }} data-debug="form-container-start">
                          DEBUG: Start of form fields container
                        </Box>
                        
                        {/* Name Field */}
                        {settings?.require_name && (
                          <>
                            <Box sx={{ border: '1px solid purple', p: 0.5, mb: 0.5 }} data-debug="before-name">
                              DEBUG: Before Name field
                            </Box>
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
                            <Box sx={{ border: '1px solid purple', p: 0.5, mb: 0.5 }} data-debug="after-name">
                              DEBUG: After Name field
                            </Box>
                          </>
                        )}

                        {/* Email Field */}
                        {settings?.require_email && (
                          <>
                            <Box sx={{ border: '1px solid green', p: 0.5, mb: 0.5 }} data-debug="before-email">
                              DEBUG: Before Email field
                            </Box>
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
                            <Box sx={{ border: '1px solid green', p: 0.5, mb: 0.5 }} data-debug="after-email">
                              DEBUG: After Email field
                            </Box>
                          </>
                        )}
                        
                        {/* DEBUG: Check if phone/dept values are accidentally rendered */}
                        <Box sx={{ border: '1px solid yellow', p: 0.5, mb: 0.5 }} data-debug="suspicious-area">
                          DEBUG: Phone req: {String(settings?.require_phone)} | Dept req: {String(settings?.require_department)}
                        </Box>
                        
                        {/* POTENTIAL CULPRIT: These might be rendering "0" somehow */}
                        {settings?.require_phone}
                        {settings?.require_department}
                        
                        <Box sx={{ border: '1px solid orange', p: 0.5, mb: 1 }} data-debug="form-container-end">
                          DEBUG: End of form fields container
                        </Box>
                      </Box>

                      {/* Phone Field - Should not render since require_phone is 0 */}
                      {settings?.require_phone && (
                        <TextField
                          fullWidth
                          size="small"
                          type="tel"
                          label="Phone Number *"
                          value={preChatData.phone || ''}
                          onChange={(e) => setPreChatData(prev => ({ ...prev, phone: e.target.value }))}
                          error={!!preChatErrors.phone}
                          helperText={preChatErrors.phone}
                          sx={{ mb: 2 }}
                          autoComplete="off"
                        />
                      )}

                      {/* Department Field - Should not render */}
                      {settings?.require_department && (
                        <FormControl fullWidth size="small" error={!!preChatErrors.department} sx={{ mb: 2 }}>
                          <InputLabel>Department *</InputLabel>
                          <Select
                            value={preChatData.department || ''}
                            label="Department *"
                            onChange={(e) => setPreChatData(prev => ({ ...prev, department: e.target.value }))}
                          >
                            <MenuItem value="">Select Department</MenuItem>
                            <MenuItem value="general">General Support</MenuItem>
                            <MenuItem value="technical">Technical Support</MenuItem>
                            <MenuItem value="billing">Billing</MenuItem>
                            <MenuItem value="sales">Sales</MenuItem>
                          </Select>
                        </FormControl>
                      )}


                      {/* DEBUG: Element before message field */}
                      <Box sx={{ border: '1px solid red', p: 1, mb: 1 }} data-debug="before-message">
                        DEBUG: This box is right before the message field. If you see "00" above this box, it's coming from above.
                      </Box>
                      
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
                      
                      {/* DEBUG: Element after message field */}
                      <Box sx={{ border: '1px solid blue', p: 1, mb: 1 }} data-debug="after-message">
                        DEBUG: This box is right after the message field. If you see "00" below this box, it's coming from below.
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
                          '&:disabled': {
                            backgroundColor: '#ccc',
                            color: '#666'
                          }
                        }}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                      >
                        {!isOnline ? 'Chat Offline' : loading ? 'Starting Chat...' : 'Start Chat'}
                      </Button>

                      {!isOnline && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                          {settings?.offline_message || 'We are currently offline. Please try again later.'}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Chat Interface - Only show when not showing pre-chat form */}
                  {!showPreChatForm && (
                    <>
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
                      backgroundColor: '#f5f5f5',
                      maxHeight: '400px', // Set maximum height
                      minHeight: '200px', // Set minimum height
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
                    
                    {/* Queue Position */}
                    {queuePosition !== null && !connectedAgent && (
                      <Box sx={{ textAlign: 'center', my: 2 }}>
                        <Chip
                          icon={<AccessTime />}
                          label={`Position in queue: ${queuePosition || 1}`}
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          {queuePosition && queuePosition > 1 
                            ? (settings?.queue_message || 'Please wait for the next available agent.')
                            : 'Connecting you with an agent...'
                          }
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
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                fontSize: '0.75rem'
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
                            {/* Show agent name for agent messages */}
                            {message.sender === 'agent' && connectedAgent && (
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main', display: 'block' }}>
                                {connectedAgent}
                              </Typography>
                            )}
                            <Typography variant="body2">
                              {message.text}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Paper>
                        </Box>
                      );
                    })}

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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};