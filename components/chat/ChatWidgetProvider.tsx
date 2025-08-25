/**
 * ChatWidgetProvider - Global provider for chat widget integration
 * Manages widget state, user authentication, and system-wide positioning
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import ChatWidget from './ChatWidget';
import { usePathname } from 'next/navigation';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<ChatWidgetSettings>({
    enabled: true,
    position: 'bottom-right',
    theme: 'light',
    shape: 'rounded-square',
    primaryColor: '#1976d2',
    showOnPages: ['*'], // Show on all pages
    hideOnPages: ['/chat', '/chat/*'] // Hide on chat pages
  });

  // Load user and settings on mount
  useEffect(() => {
    loadUserAndSettings();

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
      }));
    };

    window.addEventListener('chat-settings-updated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('chat-settings-updated', handleSettingsUpdate as EventListener);
    };
  }, []);

  // Update visibility based on pathname
  useEffect(() => {
    updateVisibility();
  }, [pathname, settings, currentUser]);

  const loadUserAndSettings = async () => {
    try {
      // Load current user
      const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
      if (!token) return;

      const userResponse = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        
        // Check if user has chat access
        const hasBasicChatPermission = userData.permissions?.includes('chat.access') ||
                                      userData.permissions?.includes('chat.send_messages') ||
                                      userData.role === 'admin';

        if (hasBasicChatPermission) {
          setCurrentUser({
            username: userData.username,
            display_name: userData.display_name,
            profile_picture: userData.profile_picture,
            role_id: userData.role,
            permissions: userData.permissions || []
          });
        }
      }

      // Load widget settings from admin configuration
      try {
        const settingsResponse = await fetch('/api/admin/chat/settings');
        if (settingsResponse.ok) {
          const chatSettings = await settingsResponse.json();
          setSettings(prev => ({
            ...prev,
            enabled: chatSettings.widget_enabled || false,
            position: chatSettings.widget_position || 'bottom-right',
            theme: chatSettings.widget_theme || 'light',
            shape: chatSettings.widget_shape || 'rounded-square',
            primaryColor: chatSettings.widget_primary_color || '#1976d2',
            showOnPages: ['*'], // Show on all pages
            hideOnPages: ['/chat', '/chat/*'] // Hide on chat pages
          }));
        }
      } catch (error) {
        console.log('Using default widget settings');
      }
    } catch (error) {
      console.error('Failed to load chat widget data:', error);
    }
  };

  const updateVisibility = () => {
    if (!settings.enabled || !currentUser) {
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
          onExpandToFullChat={handleExpandToFullChat}
        />
      )}
    </ChatWidgetContext.Provider>
  );
}