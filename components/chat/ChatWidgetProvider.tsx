"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ChatWidget } from './ChatWidget'
import { useRouter, usePathname } from 'next/navigation'

interface ChatWidgetProviderProps {
  children: React.ReactNode
}

export function ChatWidgetProvider({ children }: ChatWidgetProviderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  const [isWidgetOpen, setIsWidgetOpen] = useState(false)
  const [widgetState, setWidgetState] = useState({
    hasBeenOpened: false,
    lastClosedTime: null as number | null,
    isExpanded: false,
    isCollapsed: false,
    selectedConversationId: null as string | null
  })

  // Load widget state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chatWidgetState')
      if (saved) {
        const state = JSON.parse(saved)
        setWidgetState(state)
        
        // Auto-open if user had it open before and it's been less than an hour
        if (state.hasBeenOpened && state.lastClosedTime) {
          const timeSinceClose = Date.now() - state.lastClosedTime
          const oneHour = 60 * 60 * 1000
          if (timeSinceClose < oneHour) {
            setIsWidgetOpen(true)
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat widget state:', error)
    }
  }, [])

  // Save widget state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('chatWidgetState', JSON.stringify(widgetState))
    } catch (error) {
      console.error('Error saving chat widget state:', error)
    }
  }, [widgetState])

  // Add keyboard shortcut to toggle chat widget (Ctrl/Cmd + /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        if (user?.permissions?.includes('chat.access_channels')) {
          handleToggleWidget()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [user])

  const handleToggleWidget = () => {
    setIsWidgetOpen(prev => {
      const newState = !prev
      
      // Update widget state
      setWidgetState(current => ({
        hasBeenOpened: true,
        lastClosedTime: newState ? null : Date.now()
      }))
      
      return newState
    })
  }

  const handleOpenFullChat = useCallback(() => {
    setIsWidgetOpen(false)
    router.push('/chat')
  }, [router])

  const handleStateChange = useCallback((newState: any) => {
    setWidgetState(current => ({ ...current, ...newState }))
  }, [])

  // Don't show widget on chat page itself
  const shouldShowWidget = user?.permissions?.includes('chat.access_channels') && 
                           pathname !== '/chat' &&
                           !pathname?.startsWith('/chat/')

  return (
    <>
      {children}
      
      {shouldShowWidget && (
        <ChatWidget
          isOpen={isWidgetOpen}
          onToggle={handleToggleWidget}
          onOpenFullChat={handleOpenFullChat}
          initialState={widgetState}
          onStateChange={handleStateChange}
        />
      )}
    </>
  )
}