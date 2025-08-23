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

    // Parse settings from database
    const settingsMap = new Map(
      settings.map((s: any) => [s.setting_key, s.setting_value])
    )

    return {
      connectionMode: (settingsMap.get('chat_connection_mode') as ConnectionMode) || defaults.connectionMode,
      socketUrl: settingsMap.get('chat_socket_url') || defaults.socketUrl,
      pollingInterval: parseInt(settingsMap.get('chat_polling_interval') || defaults.pollingInterval.toString(), 10)
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