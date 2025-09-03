/**
 * Hook to access chat system UI settings from admin configuration
 */

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

interface ChatUISettings {
  show_unread_badges: boolean;
  unread_badge_color: string;
  unread_badge_text_color: string;
  unread_badge_style: 'rounded' | 'square' | 'pill';
  unread_badge_position: 'right' | 'left' | 'top-right';
  show_zero_counts: boolean;
  show_channel_member_count: boolean;
  show_typing_indicators: boolean;
  show_online_status: boolean;
  message_grouping_enabled: boolean;
  timestamp_format: 'relative' | 'absolute' | 'both';
}

const defaultSettings: ChatUISettings = {
  show_unread_badges: true,
  unread_badge_color: '#dc3545',
  unread_badge_text_color: '#ffffff',
  unread_badge_style: 'rounded',
  unread_badge_position: 'right',
  show_zero_counts: false,
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
        const result = await apiClient.getChatUISettings();

        if (result.success) {
          const data = result.data;
          setSettings({
            show_unread_badges: data.show_unread_badges ?? defaultSettings.show_unread_badges,
            unread_badge_color: data.unread_badge_color ?? defaultSettings.unread_badge_color,
            unread_badge_text_color: data.unread_badge_text_color ?? defaultSettings.unread_badge_text_color,
            unread_badge_style: data.unread_badge_style ?? defaultSettings.unread_badge_style,
            unread_badge_position: data.unread_badge_position ?? defaultSettings.unread_badge_position,
            show_zero_counts: data.show_zero_counts ?? defaultSettings.show_zero_counts,
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