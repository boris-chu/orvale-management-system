/**
 * Chat Theme System Hook
 * Provides theme resolution, user preferences, and admin defaults
 */

'use client';

import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';

// Theme Interfaces
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  sidebar: string;
  text_primary: string;
  text_secondary: string;
  background: string;
  surface: string;
  border?: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  border_radius?: string;
  font_family?: string;
  font_size_base?: string;
  compact_mode?: boolean;
  animations_enabled?: boolean;
}

export interface PresetThemes {
  light: {
    internal_chat: ThemeConfig;
    public_queue: ThemeConfig;
  };
  iphone: {
    internal_chat: ThemeConfig;
    public_queue: ThemeConfig;
  };
  darcula: {
    internal_chat: ThemeConfig;
    public_queue: ThemeConfig;
  };
  github: {
    internal_chat: ThemeConfig;
    public_queue: ThemeConfig;
  };
  slack: {
    internal_chat: ThemeConfig;
    public_queue: ThemeConfig;
  };
}

export interface AdminThemeSettings {
  // System defaults
  internal_chat_theme: string;
  public_queue_theme: string;
  
  // User policy
  allow_user_customization: boolean;
  available_themes: string[];
  force_theme_compliance: boolean;
  theme_change_frequency_limit: string;
  
  // Custom theme data
  custom_theme_json: string;
  public_queue_custom_theme_json: string;
}

export interface UserThemePreferences {
  internal_chat_theme: string; // 'inherit' or theme name
  public_queue_theme: string;  // 'inherit' or theme name
  custom_theme_json: string;
  
  // Accessibility
  high_contrast_mode: boolean;
  reduce_animations: boolean;
  font_size_multiplier: number;
  
  // Meta
  last_theme_change: string | null;
  theme_change_count: number;
}

// Preset Theme Definitions
export const PRESET_THEMES: PresetThemes = {
  light: {
    internal_chat: {
      colors: {
        primary: '#1976d2',
        secondary: '#f5f5f5',
        accent: '#1565c0',
        sidebar: '#ffffff',
        text_primary: '#212121',
        text_secondary: '#757575',
        background: '#ffffff',
        surface: '#fafafa',
        border: '#e0e0e0'
      },
      border_radius: '8px',
      font_family: 'Inter, system-ui, sans-serif',
      font_size_base: '14px',
      compact_mode: false,
      animations_enabled: true
    },
    public_queue: {
      colors: {
        primary: '#e57373',
        secondary: '#ffcdd2',
        accent: '#d32f2f',
        sidebar: '#fce4ec',
        text_primary: '#212121',
        text_secondary: '#757575',
        background: '#ffffff',
        surface: '#fafafa',
        border: '#e0e0e0'
      },
      border_radius: '8px',
      font_family: 'Inter, system-ui, sans-serif',
      font_size_base: '14px',
      compact_mode: false,
      animations_enabled: true
    }
  },
  
  iphone: {
    internal_chat: {
      colors: {
        primary: '#007aff',
        secondary: '#f2f2f7',
        accent: '#0051d5',
        sidebar: '#ffffff',
        text_primary: '#000000',
        text_secondary: '#3c3c43',
        background: '#ffffff',
        surface: '#f2f2f7',
        border: '#d1d1d6'
      },
      border_radius: '16px',
      font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      font_size_base: '14px',
      compact_mode: false,
      animations_enabled: true
    },
    public_queue: {
      colors: {
        primary: '#ff3b30',
        secondary: '#ffebee',
        accent: '#d70015',
        sidebar: '#f2f2f7',
        text_primary: '#000000',
        text_secondary: '#3c3c43',
        background: '#ffffff',
        surface: '#f2f2f7',
        border: '#d1d1d6'
      },
      border_radius: '16px',
      font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
      font_size_base: '14px',
      compact_mode: false,
      animations_enabled: true
    }
  },

  darcula: {
    internal_chat: {
      colors: {
        primary: '#569cd6',
        secondary: '#2d2d30',
        accent: '#4fc1ff',
        sidebar: '#252526',
        text_primary: '#cccccc',
        text_secondary: '#969696',
        background: '#1e1e1e',
        surface: '#2d2d30',
        border: '#3a3a3a'
      },
      border_radius: '6px',
      font_family: 'Monaco, "Cascadia Code", "SF Mono", Consolas, monospace',
      font_size_base: '13px',
      compact_mode: true,
      animations_enabled: true
    },
    public_queue: {
      colors: {
        primary: '#f48771',
        secondary: '#3c2415',
        accent: '#ff6b47',
        sidebar: '#2d1810',
        text_primary: '#cccccc',
        text_secondary: '#969696',
        background: '#1e1e1e',
        surface: '#2d2d30',
        border: '#3a3a3a'
      },
      border_radius: '6px',
      font_family: 'Monaco, "Cascadia Code", "SF Mono", Consolas, monospace',
      font_size_base: '13px',
      compact_mode: true,
      animations_enabled: true
    }
  },

  github: {
    internal_chat: {
      colors: {
        primary: '#0969da',
        secondary: '#f6f8fa',
        accent: '#0550ae',
        sidebar: '#ffffff',
        text_primary: '#24292f',
        text_secondary: '#656d76',
        background: '#ffffff',
        surface: '#f6f8fa',
        border: '#d0d7de'
      },
      border_radius: '6px',
      font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica',
      font_size_base: '14px',
      compact_mode: false,
      animations_enabled: true
    },
    public_queue: {
      colors: {
        primary: '#da3633',
        secondary: '#fff5f5',
        accent: '#b91c1c',
        sidebar: '#f6f8fa',
        text_primary: '#24292f',
        text_secondary: '#656d76',
        background: '#ffffff',
        surface: '#f6f8fa',
        border: '#d0d7de'
      },
      border_radius: '6px',
      font_family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica',
      font_size_base: '14px',
      compact_mode: false,
      animations_enabled: true
    }
  },

  slack: {
    internal_chat: {
      colors: {
        primary: '#4a154b',
        secondary: '#f8f8f8',
        accent: '#611f69',
        sidebar: '#3f0e40',
        text_primary: '#1d1c1d',
        text_secondary: '#616061',
        background: '#ffffff',
        surface: '#f8f8f8',
        border: '#e1e1e1'
      },
      border_radius: '8px',
      font_family: 'Slack-Lato, Lato, Helvetica Neue, Helvetica, Arial, sans-serif',
      font_size_base: '15px',
      compact_mode: false,
      animations_enabled: true
    },
    public_queue: {
      colors: {
        primary: '#e01e5a',
        secondary: '#fff0f3',
        accent: '#c91c3f',
        sidebar: '#4a0e1a',
        text_primary: '#1d1c1d',
        text_secondary: '#616061',
        background: '#ffffff',
        surface: '#f8f8f8',
        border: '#e1e1e1'
      },
      border_radius: '8px',
      font_family: 'Slack-Lato, Lato, Helvetica Neue, Helvetica, Arial, sans-serif',
      font_size_base: '15px',
      compact_mode: false,
      animations_enabled: true
    }
  }
};

// Theme System Context
interface ThemeSystemContextType {
  // Current resolved themes
  currentInternalTheme: ThemeConfig;
  currentPublicQueueTheme: ThemeConfig;
  
  // Admin settings
  adminSettings: AdminThemeSettings | null;
  
  // User preferences  
  userPreferences: UserThemePreferences | null;
  
  // Loading states
  adminLoading: boolean;
  userLoading: boolean;
  
  // Actions
  updateUserTheme: (interfaceType: 'internal_chat' | 'public_queue', themeName: string) => Promise<void>;
  updateAdminSettings: (settings: Partial<AdminThemeSettings>) => Promise<void>;
  refreshThemes: () => Promise<void>;
  
  // Theme resolution
  resolveTheme: (interfaceType: 'internal_chat' | 'public_queue') => ThemeConfig;
  getAvailableThemes: () => string[];
  canUserCustomize: () => boolean;
}

const ThemeSystemContext = createContext<ThemeSystemContextType | null>(null);

// Theme System Hook
export const useThemeSystem = () => {
  const context = useContext(ThemeSystemContext);
  if (!context) {
    throw new Error('useThemeSystem must be used within a ThemeSystemProvider');
  }
  return context;
};

// Theme System Provider
export const ThemeSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminSettings, setAdminSettings] = useState<AdminThemeSettings | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserThemePreferences | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);

  // Theme Resolution Function
  const resolveTheme = useCallback((interfaceType: 'internal_chat' | 'public_queue'): ThemeConfig => {
    try {
      // 1. Check force compliance
      if (adminSettings?.force_theme_compliance) {
        const adminTheme = interfaceType === 'internal_chat' 
          ? adminSettings.internal_chat_theme 
          : adminSettings.public_queue_theme;
        
        if (PRESET_THEMES[adminTheme as keyof PresetThemes]) {
          return PRESET_THEMES[adminTheme as keyof PresetThemes][interfaceType];
        }
      }

      // 2. Check user preferences (if allowed)
      if (adminSettings?.allow_user_customization && userPreferences) {
        const userTheme = interfaceType === 'internal_chat'
          ? userPreferences.internal_chat_theme
          : userPreferences.public_queue_theme;
        
        if (userTheme !== 'inherit' && PRESET_THEMES[userTheme as keyof PresetThemes]) {
          const baseTheme = PRESET_THEMES[userTheme as keyof PresetThemes][interfaceType];
          
          // Apply user accessibility overrides
          return {
            ...baseTheme,
            font_size_base: userPreferences.font_size_multiplier !== 1.0 
              ? `${14 * userPreferences.font_size_multiplier}px`
              : baseTheme.font_size_base,
            animations_enabled: userPreferences.reduce_animations ? false : baseTheme.animations_enabled
          };
        }
      }

      // 3. Use admin default
      if (adminSettings) {
        const adminTheme = interfaceType === 'internal_chat'
          ? adminSettings.internal_chat_theme
          : adminSettings.public_queue_theme;
        
        if (PRESET_THEMES[adminTheme as keyof PresetThemes]) {
          return PRESET_THEMES[adminTheme as keyof PresetThemes][interfaceType];
        }
      }

      // 4. Fallback to light theme
      return PRESET_THEMES.light[interfaceType];
      
    } catch (error) {
      console.error('Theme resolution error:', error);
      return PRESET_THEMES.light[interfaceType];
    }
  }, [adminSettings, userPreferences]);

  // Load admin theme settings
  const loadAdminSettings = useCallback(async () => {
    try {
      setAdminLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      
      const response = await fetch('/api/admin/chat/theme-settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAdminSettings(data);
      } else {
        // Set defaults if API fails
        setAdminSettings({
          internal_chat_theme: 'light',
          public_queue_theme: 'light',
          allow_user_customization: true,
          available_themes: ['light', 'iphone', 'darcula', 'github', 'slack'],
          force_theme_compliance: false,
          theme_change_frequency_limit: 'daily',
          custom_theme_json: '{}',
          public_queue_custom_theme_json: '{}'
        });
      }
    } catch (error) {
      console.error('Failed to load admin theme settings:', error);
      // Set defaults on error
      setAdminSettings({
        internal_chat_theme: 'light',
        public_queue_theme: 'light',
        allow_user_customization: true,
        available_themes: ['light', 'iphone', 'darcula', 'github', 'slack'],
        force_theme_compliance: false,
        theme_change_frequency_limit: 'daily',
        custom_theme_json: '{}',
        public_queue_custom_theme_json: '{}'
      });
    } finally {
      setAdminLoading(false);
    }
  }, []);

  // Load user theme preferences
  const loadUserPreferences = useCallback(async () => {
    try {
      setUserLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      
      const response = await fetch('/api/chat/user-theme-preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data);
      } else {
        // Set defaults if API fails
        setUserPreferences({
          internal_chat_theme: 'inherit',
          public_queue_theme: 'inherit',
          custom_theme_json: '{}',
          high_contrast_mode: false,
          reduce_animations: false,
          font_size_multiplier: 1.0,
          last_theme_change: null,
          theme_change_count: 0
        });
      }
    } catch (error) {
      console.error('Failed to load user theme preferences:', error);
      setUserPreferences({
        internal_chat_theme: 'inherit',
        public_queue_theme: 'inherit',
        custom_theme_json: '{}',
        high_contrast_mode: false,
        reduce_animations: false,
        font_size_multiplier: 1.0,
        last_theme_change: null,
        theme_change_count: 0
      });
    } finally {
      setUserLoading(false);
    }
  }, []);

  // Update user theme preference
  const updateUserTheme = useCallback(async (
    interfaceType: 'internal_chat' | 'public_queue', 
    themeName: string
  ) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      
      const response = await fetch('/api/chat/user-theme-preferences', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [`${interfaceType}_theme`]: themeName
        })
      });

      if (response.ok) {
        await loadUserPreferences(); // Refresh
      } else {
        throw new Error('Failed to update theme preference');
      }
    } catch (error) {
      console.error('Failed to update user theme:', error);
      throw error;
    }
  }, [loadUserPreferences]);

  // Update admin settings
  const updateAdminSettings = useCallback(async (updates: Partial<AdminThemeSettings>) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      
      const response = await fetch('/api/admin/chat/theme-settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await loadAdminSettings(); // Refresh
      } else {
        throw new Error('Failed to update admin theme settings');
      }
    } catch (error) {
      console.error('Failed to update admin settings:', error);
      throw error;
    }
  }, [loadAdminSettings]);

  // Refresh all theme data
  const refreshThemes = useCallback(async () => {
    await Promise.all([loadAdminSettings(), loadUserPreferences()]);
  }, [loadAdminSettings, loadUserPreferences]);

  // Get available themes for user
  const getAvailableThemes = useCallback(() => {
    return adminSettings?.available_themes || ['light'];
  }, [adminSettings]);

  // Check if user can customize themes
  const canUserCustomize = useCallback(() => {
    return adminSettings?.allow_user_customization && !adminSettings?.force_theme_compliance;
  }, [adminSettings]);

  // Load data on mount
  useEffect(() => {
    loadAdminSettings();
    loadUserPreferences();
  }, [loadAdminSettings, loadUserPreferences]);

  // Context value
  const contextValue: ThemeSystemContextType = {
    currentInternalTheme: resolveTheme('internal_chat'),
    currentPublicQueueTheme: resolveTheme('public_queue'),
    adminSettings,
    userPreferences,
    adminLoading,
    userLoading,
    updateUserTheme,
    updateAdminSettings,
    refreshThemes,
    resolveTheme,
    getAvailableThemes,
    canUserCustomize
  };

  return (
    <ThemeSystemContext.Provider value={contextValue}>
      {children}
    </ThemeSystemContext.Provider>
  );
};

// Theme CSS Injector Hook
export const useThemeCSS = (interfaceType: 'internal_chat' | 'public_queue' = 'internal_chat') => {
  const { resolveTheme } = useThemeSystem();
  const theme = resolveTheme(interfaceType);

  useEffect(() => {
    // Inject CSS custom properties for the resolved theme
    const root = document.documentElement;
    const prefix = interfaceType === 'internal_chat' ? '--chat' : '--queue';
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`${prefix}-${key.replace('_', '-')}`, value);
    });
    
    root.style.setProperty(`${prefix}-border-radius`, theme.border_radius || '8px');
    root.style.setProperty(`${prefix}-font-family`, theme.font_family || 'Inter, system-ui, sans-serif');
    root.style.setProperty(`${prefix}-font-size-base`, theme.font_size_base || '14px');
    
  }, [theme, interfaceType]);

  return theme;
};