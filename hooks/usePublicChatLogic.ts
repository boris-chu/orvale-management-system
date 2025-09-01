import { useState, useEffect, useRef } from 'react';
import { publicPortalSocket } from '@/lib/public-portal-socket';
import apiClient from '@/lib/api-client';

interface WidgetSettings {
  enabled: boolean;
  showWidget?: boolean;
  status?: 'online' | 'offline' | 'outside_hours';
  message?: string;
  outsideBusinessHours?: boolean;
  widget_theme?: 'classic' | 'modern';
  widget_shape?: 'circle' | 'square' | 'rounded';
  widget_color?: string;
  widget_size?: 'small' | 'medium' | 'large';
  widget_position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';
  widget_position_x?: number;
  widget_position_y?: number;
  widget_text?: string;
  widget_animation?: string;
  animation_duration?: number;
  animation_delay?: number;
  welcome_message?: string;
  require_name?: boolean;
  require_email?: boolean;
  require_phone?: boolean;
  require_department?: boolean;
  session_recovery_enabled?: boolean;
  session_recovery_minutes?: number;
  typing_indicators_enabled?: boolean;
  show_staff_typing_to_guests?: boolean;
  show_guest_typing_to_staff?: boolean;
  typing_indicator_text?: string;
  typing_indicator_style?: string;
  [key: string]: any;
}

interface ChatMessage {
  sender: 'guest' | 'agent' | 'system';
  text: string;
  timestamp: Date;
  id: number;
  type?: 'text' | 'error' | 'success' | 'info';
  agentName?: string; // Name of the agent for agent messages
}

interface PreChatData {
  name: string;
  email: string;
  phone: string;
  department: string;
  message: string;
}

interface UsePublicChatLogicProps {
  enabledPages?: string[];
  disabledPages?: string[];
}

export const usePublicChatLogic = ({ enabledPages = [], disabledPages = [] }: UsePublicChatLogicProps) => {
  // Core State
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [connectedAgent, setConnectedAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  
  // Form State
  const [showPreChatForm, setShowPreChatForm] = useState(false);
  const [preChatData, setPreChatData] = useState<PreChatData>({
    name: '',
    email: '',
    phone: '',
    department: '',
    message: ''
  });
  const [preChatErrors, setPreChatErrors] = useState<{ [key: string]: string }>({});
  
  // Modern Theme Progressive State
  const [awaitingName, setAwaitingName] = useState(false);
  const [awaitingEmail, setAwaitingEmail] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [initialIssue, setInitialIssue] = useState('');
  
  // Staff & Agents State
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [displayedAgents, setDisplayedAgents] = useState<any[]>([]);
  
  // Session Recovery State
  const [sessionDisconnected, setSessionDisconnected] = useState(false);
  const [showReconnectOption, setShowReconnectOption] = useState(false);
  const [reconnectLoading, setReconnectLoading] = useState(false);
  
  // Widget Position State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [widgetPosition, setWidgetPosition] = useState({ x: 0, y: 0 });
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize widget on mount
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

  // Handle staff avatar rotation for modern theme
  useEffect(() => {
    if (settings?.widget_theme === 'modern' && availableAgents.length > 0) {
      // Initially show first 3 agents
      setDisplayedAgents(availableAgents.slice(0, 3));
      
      // If we have more than 3 agents, rotate them every 5 seconds
      if (availableAgents.length > 3) {
        const interval = setInterval(() => {
          setDisplayedAgents(prev => {
            const currentStart = availableAgents.findIndex(agent => agent.id === prev[0]?.id);
            const nextStart = (currentStart + 1) % (availableAgents.length - 2);
            return availableAgents.slice(nextStart, nextStart + 3);
          });
        }, 5000);
        
        return () => clearInterval(interval);
      }
    } else {
      // Fallback: use first 3 agents or create mock data if none available
      const fallbackAgents = availableAgents.length > 0 ? availableAgents.slice(0, 3) : [
        { id: 1, displayName: 'IT Support', initials: 'IT', avatarColor: '#1976d2', isOnline: true },
        { id: 2, displayName: 'Tech Support', initials: 'TS', avatarColor: '#388e3c', isOnline: true },
        { id: 3, displayName: 'Help Desk', initials: 'HD', avatarColor: '#f57c00', isOnline: true }
      ];
      setDisplayedAgents(fallbackAgents);
    }
  }, [availableAgents, settings?.widget_theme]);

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
        setQueuePosition(data.queuePosition || 1);
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
        }
        
        setShowPreChatForm(false);
        
        // Add system message about queue position
        const position = data.queuePosition || 1;
        if (position > 1) {
          const queueMessage = {
            sender: 'system' as const,
            text: `You are position ${position} in queue. ${data.estimatedWaitTime ? `Estimated wait time: ${data.estimatedWaitTime} minutes.` : 'Please wait for the next available agent.'}`,
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => {
            const updatedMessages = [...prev, queueMessage];
            
            // Update localStorage with new messages
            if (settings?.session_recovery_enabled) {
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
            sender: 'system' as const,
            text: 'Connecting you with an available agent...',
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages(prev => {
            const updatedMessages = [...prev, connectingMessage];
            
            // Update localStorage with new messages
            if (settings?.session_recovery_enabled) {
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

      // Other socket event handlers...
      publicPortalSocket.addEventListener(componentId, 'agent:message', (data) => {
        console.log('📨 Agent message received:', data);
        
        // Update connected agent name if provided
        if (data.staffName) {
          setConnectedAgent(data.staffName);
        }
        
        const newMessage = {
          sender: 'agent' as const,
          text: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          id: data.messageId || Date.now(),
          agentName: data.staffName || connectedAgent || 'Support Agent'
        };
        
        setMessages(prev => {
          const updatedMessages = [...prev, newMessage];
          
          // Update localStorage
          if (settings?.session_recovery_enabled && sessionId) {
            localStorage.setItem('public_chat_session', JSON.stringify({
              id: sessionId,
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
        
        // Increase unread count if chat is minimized
        if (isMinimized) {
          setUnreadCount(prev => prev + 1);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      });

      // Handle agent assignment
      publicPortalSocket.addEventListener(componentId, 'agent:assigned', (data) => {
        console.log('👤 Agent assigned:', data);
        setConnectedAgent(data.agentName || 'Support Agent');
        
        // Add system message about agent connection
        const assignmentMessage = {
          sender: 'system' as const,
          text: `You are now connected with ${data.agentName || 'a support agent'}`,
          timestamp: new Date(),
          id: Date.now(),
          type: 'success' as const
        };
        
        setMessages(prev => [...prev, assignmentMessage]);
        
        // Scroll to bottom
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      });

      // Legacy support for old message_received events (backward compatibility)
      publicPortalSocket.addEventListener(componentId, 'message_received', (data) => {
        console.log('📨 Legacy message_received event:', data);
        const newMessage = {
          sender: 'agent' as const,
          text: data.message,
          timestamp: new Date(data.timestamp || Date.now()),
          id: data.id || Date.now()
        };
        
        setMessages(prev => {
          const updatedMessages = [...prev, newMessage];
          
          // Update localStorage
          if (settings?.session_recovery_enabled && sessionId) {
            localStorage.setItem('public_chat_session', JSON.stringify({
              id: sessionId,
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
        
        // Increase unread count if chat is minimized
        if (isMinimized) {
          setUnreadCount(prev => prev + 1);
        }
        
        // Scroll to bottom
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      });

      return () => {
        publicPortalSocket.removeEventListeners(componentId);
      };
    }
  }, [isOpen, settings, sessionId, messages, unreadCount, preChatData, isMinimized]);

  // Load widget settings from API
  const loadWidgetSettings = async () => {
    try {
      const result = await apiClient.getPublicWidgetSettings();
      if (result.success) {
        const data = result.data;
        console.log('Widget settings loaded:', data);
        console.log('🎨 Widget theme is:', data.widget_theme || 'NOT SET - defaulting to classic');
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
          data.delivery_status_icons = JSON.parse(data.delivery_status_icons);
        }
      } else {
        console.error('Failed to load widget settings');
        setSettings(null);
      }
    } catch (error) {
      console.error('Error loading widget settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // Load available agents for display
  const loadAvailableAgents = async () => {
    try {
      setAgentsLoading(true);
      const result = await apiClient.getAvailableAgents();
      
      if (result.success) {
        setAvailableAgents(result.data?.agents || []);
      } else {
        console.error('Failed to load available agents:', result.error);
        setAvailableAgents([]);
      }
    } catch (error) {
      console.error('Error loading available agents:', error);
      setAvailableAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

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

  // Handle progressive message collection for modern theme
  const handleProgressiveMessage = (message: string): boolean => {
    if (settings?.widget_theme !== 'modern') return false;

    // If waiting for name
    if (awaitingName) {
      setGuestName(message);
      setAwaitingName(false);
      setAwaitingEmail(true);
      
      // Add system message asking for email
      const emailMessage = {
        sender: 'system' as const,
        text: `Great, ${message}! And your email address?`,
        timestamp: new Date(),
        id: Date.now(),
        type: 'info' as const
      };
      setMessages(prev => [...prev, emailMessage]);
      return true;
    }

    // If waiting for email
    if (awaitingEmail) {
      if (!/\S+@\S+\.\S+/.test(message)) {
        const errorMessage = {
          sender: 'system' as const,
          text: '❌ Please enter a valid email address (example: user@domain.com)',
          timestamp: new Date(),
          id: Date.now(),
          type: 'error' as const
        };
        setMessages(prev => [...prev, errorMessage]);
        return true;
      }
      
      setGuestEmail(message);
      setAwaitingEmail(false);
      
      // Now start the chat session with collected info
      const completeMessage = {
        sender: 'system' as const,
        text: '✅ Perfect! An agent will be with you shortly.',
        timestamp: new Date(),
        id: Date.now(),
        type: 'success' as const
      };
      setMessages(prev => [...prev, completeMessage]);
      
      // Start session with collected info
      handlePreChatSubmitProgressive();
      return true;
    }

    // If no session yet and this is the first message (issue description)
    if (!sessionId && !awaitingName && !awaitingEmail) {
      setInitialIssue(message);
      setAwaitingName(true);
      
      // Add system message asking for name
      const nameMessage = {
        sender: 'system' as const,
        text: 'Thanks! To help you better, may I get your name?',
        timestamp: new Date(),
        id: Date.now(),
        type: 'info' as const
      };
      setMessages(prev => [...prev, nameMessage]);
      return true;
    }

    return false;
  };

  // Handle pre-chat submission for progressive form (modern theme)
  const handlePreChatSubmitProgressive = async () => {
    console.log('🚀 Starting progressive chat session with:', {
      name: guestName,
      email: guestEmail,
      initialIssue: initialIssue
    });
    setLoading(true);
    
    try {
      const result = await apiClient.startChatSession({
        guest_info: {
          name: guestName,
          email: guestEmail,
          phone: null,
          department: null
        },
        initial_message: initialIssue
      });

      console.log('📦 Start session result:', result);
      
      if (result.success) {
        setSessionId(result.data?.sessionId || result.data?.session_id);
        setShowPreChatForm(false);
        setLoading(false);
        
        // Add initial message from user
        const userInitialMessage = {
          sender: 'guest' as const,
          text: initialIssue,
          timestamp: new Date(),
          id: Date.now() + 1
        };
        setMessages(prev => [...prev, userInitialMessage]);
        
        // Add queue position message if needed
        const position = result.data?.queuePosition || 1;
        if (position > 1) {
          const queueMessage = {
            sender: 'system' as const,
            text: `You are position ${position} in queue. ${result.data?.estimatedWaitTime ? `Estimated wait time: ${result.data.estimatedWaitTime} minutes.` : 'Please wait for the next available agent.'}`,
            timestamp: new Date(),
            id: Date.now() + 2
          };
          setMessages(prev => [...prev, queueMessage]);
        }
        
        setQueuePosition(position);
        
        // Initialize socket connection with session ID
        const guestInfo = {
          name: guestName,
          email: guestEmail,
          phone: null,
          department: null,
          sessionId: result.data?.sessionId || result.data?.session_id
        };
        
        console.log('🔌 Starting socket session with guestInfo:', guestInfo);
        startChatSession(guestInfo);
      } else {
        // Show error but keep widget open
        console.error('Failed to start chat session:', result.error);
        const errorMessage = {
          sender: 'system' as const,
          text: result.error === 'Chat is currently disabled' 
            ? 'Chat support is currently unavailable. Please try again later.'
            : 'Unable to connect. Please refresh and try again.',
          timestamp: new Date(),
          id: Date.now(),
          type: 'error'
        };
        setMessages(prev => [...prev, errorMessage]);
        setLoading(false);
        
        // Reset progressive form state so user can try again
        setAwaitingName(false);
        setAwaitingEmail(false);
      }
    } catch (error) {
      console.error('Error starting progressive chat session:', error);
      const errorMessage = {
        sender: 'system' as const,
        text: 'Connection error. Please check your internet and try again.',
        timestamp: new Date(),
        id: Date.now(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
      setLoading(false);
      
      // Reset progressive form state
      setAwaitingName(false);
      setAwaitingEmail(false);
    }
  };

  // Validate pre-chat form (classic theme)
  const validatePreChatForm = (): boolean => {
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

  // Handle pre-chat form submission (classic theme)
  const handlePreChatSubmit = async () => {
    if (!validatePreChatForm()) return;

    setLoading(true);
    
    try {
      // Call the session API to start a new chat session
      const result = await apiClient.startChatSession({
        guest_info: {
          name: preChatData.name,
          email: preChatData.email,
          phone: preChatData.phone || null,
          department: preChatData.department || null
        },
        initial_message: preChatData.message
      });
      
      if (result.success) {
        // Session started successfully
        setSessionId(result.data?.sessionId || result.data?.session_id);
        setQueuePosition(result.data?.queuePosition || 1);
        setShowPreChatForm(false);
        
        // Add initial queue message
        const position = result.data?.queuePosition || 1;
        const initialMessage = {
          sender: 'system' as const,
          text: result.data?.message || (position > 1 
            ? `You are position ${position} in queue. ${result.data?.estimatedWaitTime ? `Estimated wait time: ${result.data.estimatedWaitTime} minutes.` : 'Please wait for the next available agent.'}` 
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
          sessionId: result.data?.sessionId || result.data?.session_id
        };
        
        startChatSession(guestInfo);
        
        // Add user's initial message to chat
        if (preChatData.message.trim()) {
          const userMessage = {
            sender: 'guest' as const,
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
          sender: 'system' as const,
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
        sender: 'system' as const,
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

  // Handle starting chat session (shared between themes)
  const startChatSession = (guestInfo: { name: string; email: string; phone?: string | null; department?: string | null; sessionId?: string }) => {
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

  // Handle sending messages
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const message = inputMessage.trim();
    
    // Add user message to UI first
    const newMessage = {
      sender: 'guest' as const,
      text: message,
      timestamp: new Date(),
      id: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    
    // Handle progressive form collection for modern theme
    if (handleProgressiveMessage(message)) {
      // Progressive message was handled, don't send via socket
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
      return;
    }
    
    // Normal message handling for established sessions
    if (sessionId) {
      // Send via Socket.io
      const success = publicPortalSocket.sendMessage(message);
      if (!success) {
        console.warn('Failed to send via Socket.io, trying HTTP fallback');
        // TODO: Implement HTTP fallback
      }
      
      // Stop typing indicator
      publicPortalSocket.sendTyping(false);
      setIsTyping(false);
    }
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Handle widget click
  const handleWidgetClick = () => {
    if (settings?.enabled) {
      setIsOpen(true);
      
      // Clear unread count when chat is opened
      setUnreadCount(0);
      
      // For modern theme, skip pre-chat form and go straight to chat
      if (!sessionId) {
        if (settings?.widget_theme === 'modern') {
          setShowPreChatForm(false);
          // Add initial welcome message for modern theme
          const welcomeMessage = {
            sender: 'system' as const,
            text: settings?.welcome_message || 'Ask us anything, or share your feedback.',
            timestamp: new Date(),
            id: Date.now()
          };
          setMessages([welcomeMessage]);
        } else {
          setShowPreChatForm(true);
        }
      }
      
      // If there are messages, scroll to bottom
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  // Handle close chat - return to queue instead of ending session
  const handleClose = async () => {
    setIsOpen(false);
    setIsMinimized(false);
    
    // If we have an active session, return to queue instead of ending it
    if (sessionId) {
      try {
        console.log('🔄 Returning chat session to queue instead of ending:', sessionId);
        
        const result = await apiClient.makeRequest('public', 'return_to_queue', {
          sessionId
        });
        
        if (result.success) {
          console.log('✅ Session returned to queue:', result.data?.message || result.message);
          
          // Show a message to the guest that they've been returned to queue
          const queueMessage = {
            sender: 'system' as const,
            text: 'You have been returned to the queue. Close this window and reopen it to see your queue position, or wait for an agent to reconnect.',
            timestamp: new Date(),
            id: Date.now()
          };
          
          // Add the queue message but don't clear other messages
          setMessages(prev => [...prev, queueMessage]);
          
          // Keep session ID so user can recover their position
          // Don't reset sessionId here - let them recover their queue position
          
        } else {
          console.error('Failed to return to queue:', result.error);
          // Fallback: end session normally
          setSessionId(null);
          setMessages([]);
        }
        
      } catch (error) {
        console.error('Error returning session to queue:', error);
        // Fallback: end session normally
        setSessionId(null);
        setMessages([]);
      }
    } else {
      // No active session, just clear UI state
      setMessages([]);
      setSessionId(null);
    }
    
    setShowPreChatForm(false);
  };

  // Handle minimize/maximize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    
    // Clear unread count when maximizing
    if (isMinimized) {
      setUnreadCount(0);
    }
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

  // Handle session disconnect detection
  const handleSessionDisconnect = () => {
    console.log('🔌 Session disconnected detected');
    setSessionDisconnected(true);
    setShowReconnectOption(true);
    
    // Add system message about disconnect
    const disconnectMessage = {
      sender: 'system' as const,
      text: 'Your session has been disconnected. You can try to reconnect to your previous session if it was within the last 2 hours.',
      timestamp: new Date(),
      id: Date.now(),
      type: 'error'
    };
    setMessages(prev => [...prev, disconnectMessage]);
  };

  // Handle manual session reconnection
  const handleReconnectToPreviousSession = async () => {
    console.log('🔄 Attempting to reconnect to previous session...');
    setReconnectLoading(true);
    
    try {
      // Get guest info from last session or form
      const guestName = preChatData.name || localStorage.getItem('last_guest_name') || '';
      const guestEmail = preChatData.email || localStorage.getItem('last_guest_email') || '';
      
      if (!guestName || !guestEmail) {
        // Show form to collect info for reconnection
        setShowPreChatForm(true);
        setReconnectLoading(false);
        return;
      }
      
      // Call API to find and restore previous session
      const result = await apiClient.reconnectSession({
        guestName,
        guestEmail,
        searchWindowHours: 2 // Search last 2 hours
      });
      
      if (result.success && result.data?.session) {
        console.log('✅ Found previous session:', result.data.session.id);
        
        // Restore session state
        setSessionId(result.data.session.id);
        setMessages(result.data?.messages || []);
        setConnectedAgent(result.data.session.assigned_agent_name || null);
        setQueuePosition(result.data.session.queue_position || null);
        
        // Update localStorage with recovered session
        const sessionData = {
          id: result.data.session.id,
          guestName,
          guestEmail,
          messages: result.data?.messages || [],
          timestamp: Date.now()
        };
        localStorage.setItem('public_chat_session', JSON.stringify(sessionData));
        
        // Hide reconnect options
        setSessionDisconnected(false);
        setShowReconnectOption(false);
        
        // Join the session room via socket
        publicPortalSocket.joinSession(result.data.session.id);
        
        // Add success message
        const successMessage = {
          sender: 'system' as const,
          text: '✅ Successfully reconnected to your previous session!',
          timestamp: new Date(),
          id: Date.now(),
          type: 'success'
        };
        setMessages(prev => [...prev, successMessage]);
        
      } else {
        console.log('❌ No recoverable session found');
        
        // Show message that no session was found
        const noSessionMessage = {
          sender: 'system' as const,
          text: 'No recent session found with your name and email. Starting a new chat session.',
          timestamp: new Date(),
          id: Date.now(),
          type: 'info'
        };
        setMessages(prev => [...prev, noSessionMessage]);
        
        // Start new session
        setShowReconnectOption(false);
        setShowPreChatForm(true);
      }
      
    } catch (error) {
      console.error('❌ Error reconnecting to session:', error);
      
      const errorMessage = {
        sender: 'system' as const,
        text: 'Error reconnecting to previous session. Please start a new chat or try again.',
        timestamp: new Date(),
        id: Date.now(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setReconnectLoading(false);
    }
  };

  // Handle starting new session instead of reconnecting
  const handleStartNewSession = () => {
    console.log('🆕 Starting new session instead of reconnecting');
    setSessionDisconnected(false);
    setShowReconnectOption(false);
    setShowPreChatForm(true);
    setMessages([]); // Clear messages for new session
  };

  return {
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
    awaitingName,
    awaitingEmail,
    guestName,
    guestEmail,
    initialIssue,
    availableAgents,
    agentsLoading,
    displayedAgents,
    isDragging,
    dragOffset,
    widgetPosition,
    chatContainerRef,
    sessionDisconnected,
    showReconnectOption,
    reconnectLoading,

    // Setters
    setSettings,
    setIsOpen,
    setIsMinimized,
    setLoading,
    setIsOnline,
    setShowWidget,
    setUnreadCount,
    setSessionId,
    setQueuePosition,
    setConnectedAgent,
    setMessages,
    setInputMessage,
    setIsTyping,
    setAgentTyping,
    setShowPreChatForm,
    setPreChatData,
    setPreChatErrors,
    setAwaitingName,
    setAwaitingEmail,
    setGuestName,
    setGuestEmail,
    setInitialIssue,
    setAvailableAgents,
    setAgentsLoading,
    setDisplayedAgents,
    setIsDragging,
    setDragOffset,
    setWidgetPosition,

    // Functions
    loadWidgetSettings,
    loadAvailableAgents,
    checkPageVisibility,
    checkSessionRecovery,
    handleProgressiveMessage,
    handlePreChatSubmitProgressive,
    validatePreChatForm,
    handlePreChatSubmit,
    startChatSession,
    handleSendMessage,
    handleWidgetClick,
    handleClose,
    toggleMinimize,
    handleTyping,
    handleSessionDisconnect,
    handleReconnectToPreviousSession,
    handleStartNewSession
  };
};