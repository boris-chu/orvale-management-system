import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MaintenanceWrapper from '@/components/MaintenanceWrapper'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatWidgetProvider } from '@/components/chat/ChatWidgetProvider'
import { RealTimeProvider } from '@/lib/realtime/RealTimeProvider'
import { getChatSettings } from '@/lib/settings/chat-settings'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Orvale Management System',
  description: 'Unified platform for tickets, projects, assets, communication, and analytics',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Load chat settings for RealTimeProvider configuration
  const chatSettings = await getChatSettings()

  return (
    <html lang="en">
      <body className={inter.className}>
        <RealTimeProvider 
          defaultMode={chatSettings.connectionMode}
          socketUrl={chatSettings.socketUrl}
          pollingInterval={chatSettings.pollingInterval}
        >
          <AuthProvider>
            <ChatWidgetProvider>
              <MaintenanceWrapper>
                {children}
              </MaintenanceWrapper>
            </ChatWidgetProvider>
          </AuthProvider>
        </RealTimeProvider>
      </body>
    </html>
  )
}