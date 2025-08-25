import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MaintenanceWrapper from '@/components/MaintenanceWrapper'
import { AuthProvider } from '@/contexts/AuthContext'
import ChatWidgetProvider from '@/components/chat/ChatWidgetProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Orvale Management System',
  description: 'Unified platform for tickets, projects, assets, communication, and analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <MaintenanceWrapper>
            <ChatWidgetProvider>
              {children}
            </ChatWidgetProvider>
          </MaintenanceWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}