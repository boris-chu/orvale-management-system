/**
 * Hook to access chat system UI settings from admin configuration
 */

import { useState, useEffect } from 'react';

interface ChatUISettings {
  show_unread_badges: boolean;
  unread_badge_color: string;
  show_channel_member_count: boolean;
  show_typing_indicators: boolean;
  show_online_status: boolean;
  message_grouping_enabled: boolean;
  timestamp_format: 'relative' | 'absolute' | 'both';
}

const defaultSettings: ChatUISettings = {
  show_unread_badges: true,
  unread_badge_color: '#dc3545',
  show_channel_member_count: false,
  show_typing_indicators: true,
  show_online_status: true,
  message_grouping_enabled: true,
  timestamp_format: 'relative',
};

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatUISettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/chat/ui-settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setSettings({
            show_unread_badges: data.show_unread_badges ?? defaultSettings.show_unread_badges,
            unread_badge_color: data.unread_badge_color ?? defaultSettings.unread_badge_color,
            show_channel_member_count: data.show_channel_member_count ?? defaultSettings.show_channel_member_count,
            show_typing_indicators: data.show_typing_indicators ?? defaultSettings.show_typing_indicators,
            show_online_status: data.show_online_status ?? defaultSettings.show_online_status,
            message_grouping_enabled: data.message_grouping_enabled ?? defaultSettings.message_grouping_enabled,
            timestamp_format: data.timestamp_format ?? defaultSettings.timestamp_format,
          });
        }
      } catch (error) {
        console.error('Failed to load chat UI settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { settings, loading };
}