import { queryAsync } from '@/lib/database'

export type ConnectionMode = 'auto' | 'socket' | 'polling'

export interface ChatSettings {
  connectionMode: ConnectionMode
  socketUrl: string
  pollingInterval: number
}

/**
 * Get chat system settings from database
 */
export async function getChatSettings(): Promise<ChatSettings> {
  try {
    const settings = await queryAsync(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key IN (
        'chat_connection_mode', 
        'chat_socket_url', 
        'chat_polling_interval'
      )
    `)

    // Default settings
    const defaults: ChatSettings = {
      connectionMode: 'auto',
      socketUrl: 'http://localhost:4000',
      pollingInterval: 2000
    }

    // Database row interface
    interface SettingRow {
      setting_key: string;
      setting_value: string;
    }

    // Parse settings from database
    const settingsMap = new Map(
      (settings as SettingRow[]).map((s: SettingRow) => [s.setting_key, s.setting_value])
    )

    // Helper function to parse JSON values from database
    const parseSettingValue = <T>(key: string, defaultValue: T): T => {
      const rawValue = settingsMap.get(key);
      if (!rawValue) return defaultValue;
      
      try {
        // Try to parse as JSON first (for values saved by admin API)
        return JSON.parse(rawValue) as T;
      } catch {
        // If JSON parse fails, return raw value (for plain string values)
        // For numbers, try parsing
        if (typeof defaultValue === 'number' && typeof rawValue === 'string') {
          const parsed = parseInt(rawValue, 10);
          return !isNaN(parsed) ? (parsed as T) : defaultValue;
        }
        return rawValue as T;
      }
    };

    return {
      connectionMode: parseSettingValue('chat_connection_mode', defaults.connectionMode) as ConnectionMode,
      socketUrl: parseSettingValue('chat_socket_url', defaults.socketUrl),
      pollingInterval: parseInt(parseSettingValue('chat_polling_interval', defaults.pollingInterval.toString()), 10)
    }
  } catch (error) {
    console.error('❌ Error loading chat settings:', error)
    
    // Return defaults on error
    return {
      connectionMode: 'auto',
      socketUrl: 'http://localhost:4000',
      pollingInterval: 2000
    }
  }
}

/**
 * Update chat system settings in database
 */
export async function updateChatSettings(settings: Partial<ChatSettings>): Promise<void> {
  try {
    const settingsToUpdate = [
      { key: 'chat_connection_mode', value: settings.connectionMode },
      { key: 'chat_socket_url', value: settings.socketUrl },
      { key: 'chat_polling_interval', value: settings.pollingInterval?.toString() }
    ].filter(setting => setting.value !== undefined)

    for (const setting of settingsToUpdate) {
      await queryAsync(`
        INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, datetime('now'))
      `, [setting.key, setting.value])
    }

    console.log('✅ Chat settings updated successfully')
  } catch (error) {
    console.error('❌ Error updating chat settings:', error)
    throw error
  }
}