/**
 * ChatWidgetProvider - Global provider for chat widget integration
 * Manages widget state, user authentication, and system-wide positioning
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import ChatWidget from './ChatWidget';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  username: string;
  display_name: string;
  profile_picture?: string;
  role_id: string;
  permissions?: string[];
}

interface ChatWidgetSettings {
  enabled: boolean;
  position: 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark';
  shape: 'round' | 'square' | 'rounded-square';
  primaryColor: string;
  defaultState: 'open' | 'minimized';
  showOnPages: string[];
  hideOnPages: string[];
}

interface ChatWidgetContextType {
  isVisible: boolean;
  settings: ChatWidgetSettings;
  currentUser: User | null;
  setSettings: (settings: ChatWidgetSettings) => void;
  toggleVisibility: () => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextType | undefined>(undefined);

export const useChatWidget = () => {
  const context = useContext(ChatWidgetContext);
  if (context === undefined) {
    throw new Error('useChatWidget must be used within a ChatWidgetProvider');
  }
  return context;
};

interface ChatWidgetProviderProps {
  children: React.ReactNode;
}

export default function ChatWidgetProvider({ children }: ChatWidgetProviderProps) {
  const pathname = usePathname();
  const { user: authUser, loading: authLoading, isAuthenticated } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<ChatWidgetSettings>({
    enabled: true,
    position: 'bottom-right',
    theme: 'light',
    shape: 'rounded-square',
    primaryColor: '#1976d2',
    defaultState: 'minimized',
    showOnPages: ['*'], // Show on all pages
    hideOnPages: ['/chat', '/chat/*', '/public-portal', '/public-portal/*', '/public-chat-demo'] // Hide on chat pages and public portal
  });

  // Load settings on mount
  useEffect(() => {
    loadWidgetSettings();

    // Listen for settings updates from admin dashboard
    const handleSettingsUpdate = (event: CustomEvent) => {
      const updatedSettings = event.detail;
      setSettings(prev => ({
        ...prev,
        enabled: updatedSettings.widget_enabled || false,
        position: updatedSettings.widget_position || 'bottom-right',
        theme: updatedSettings.widget_theme || 'light',
        shape: updatedSettings.widget_shape || 'rounded-square',
        primaryColor: updatedSettings.widget_primary_color || '#1976d2',
        defaultState: updatedSettings.widget_default_state || 'minimized',
      }));
    };

    window.addEventListener('chat-settings-updated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('chat-settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  // Update user when AuthContext user changes
  useEffect(() => {
    if (!authLoading && isAuthenticated && authUser) {
      // Check if user has chat access
      const hasBasicChatPermission = authUser.permissions?.includes('chat.access') ||
                                    authUser.permissions?.includes('chat.send_messages') ||
                                    authUser.role === 'admin';

      console.log('🔍 Widget using AuthContext user:', {
        username: authUser.username,
        role: authUser.role,
        hasBasicChatPermission,
        permissions: authUser.permissions?.filter(p => p.includes('chat')) || []
      });

      if (hasBasicChatPermission) {
        setCurrentUser({
          username: authUser.username,
          display_name: authUser.display_name,
          profile_picture: authUser.profile_picture,
          role_id: authUser.role,
          permissions: authUser.permissions || []
        });
        console.log('✅ Widget user set from AuthContext');
      } else {
        console.log('❌ Widget user lacks chat permissions');
        setCurrentUser(null);
      }
    } else if (!authLoading && !isAuthenticated) {
      console.log('🔍 Widget: No authenticated user');
      setCurrentUser(null);
    }
  }, [authUser, authLoading, isAuthenticated]);

  // Update visibility based on pathname
  useEffect(() => {
    updateVisibility();
  }, [pathname, settings, currentUser]);

  const loadWidgetSettings = async () => {
    try {
      // Load widget settings from public API (no auth required)
      console.log('🔧 Fetching widget settings from: /api/chat/widget-settings');
      const settingsResponse = await fetch('/api/chat/widget-settings');
      if (settingsResponse.ok) {
        const widgetSettings = await settingsResponse.json();
        console.log('🔧 Loaded widget settings:', widgetSettings);
        
        setSettings(prev => ({
          ...prev,
          enabled: widgetSettings.enabled || false,
          position: widgetSettings.position || 'bottom-right',
          theme: widgetSettings.theme || 'light',
          shape: widgetSettings.shape || 'rounded-square',
          primaryColor: widgetSettings.primaryColor || '#1976d2',
          defaultState: widgetSettings.defaultState || 'minimized',
          showOnPages: ['*'], // Show on all pages
          hideOnPages: ['/chat', '/chat/*', '/public-portal', '/public-portal/*', '/public-chat-demo'] // Hide on chat pages and public portal
        }));
        
        console.log('🔧 Widget settings updated');
      } else {
        console.warn('❌ Failed to load widget settings from /api/chat/widget-settings:', settingsResponse.status);
      }
    } catch (error) {
      console.log('❌ Error loading widget settings:', error);
      console.log('🔧 Using default widget settings');
    }
  };

  const updateVisibility = () => {
    console.log('🔍 Widget visibility check:', {
      settings_enabled: settings.enabled,
      currentUser_exists: !!currentUser,
      currentUser_username: currentUser?.username,
      pathname: pathname,
      hideOnPages: settings.hideOnPages,
      showOnPages: settings.showOnPages
    });

    if (!settings.enabled || !currentUser) {
      console.log('❌ Widget hidden:', !settings.enabled ? 'disabled' : 'no user');
      setIsVisible(false);
      return;
    }

    // Check if current path should hide widget
    const shouldHide = settings.hideOnPages.some(hidePath => {
      if (hidePath.endsWith('/*')) {
        const basePath = hidePath.slice(0, -2);
        return pathname.startsWith(basePath);
      }
      return pathname === hidePath;
    });

    if (shouldHide) {
      setIsVisible(false);
      return;
    }

    // Check if current path should show widget
    const shouldShow = settings.showOnPages.some(showPath => {
      if (showPath === '*') return true;
      if (showPath.endsWith('/*')) {
        const basePath = showPath.slice(0, -2);
        return pathname.startsWith(basePath);
      }
      return pathname === showPath;
    });

    console.log('✅ Widget visibility decision:', {
      shouldShow,
      finalVisibility: shouldShow
    });
    setIsVisible(shouldShow);
  };

  const toggleVisibility = () => {
    setIsVisible(prev => !prev);
  };

  const handleExpandToFullChat = () => {
    // Navigate to full chat page
    window.location.href = '/chat';
  };

  const contextValue: ChatWidgetContextType = {
    isVisible,
    settings,
    currentUser,
    setSettings,
    toggleVisibility
  };

  return (
    <ChatWidgetContext.Provider value={contextValue}>
      {children}
      {isVisible && currentUser && (
        <ChatWidget
          currentUser={currentUser}
          position={settings.position}
          theme={settings.theme}
          shape={settings.shape}
          primaryColor={settings.primaryColor}
          defaultState={settings.defaultState}
          onExpandToFullChat={handleExpandToFullChat}
        />
      )}
    </ChatWidgetContext.Provider>
  );
}