"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface ChatLayoutProps {
  sidebar: React.ReactNode
  main: React.ReactNode
  className?: string
}

export function ChatLayout({ sidebar, main, className }: ChatLayoutProps) {
  return (
    <div className={cn("flex h-full overflow-hidden", className)}>
      {/* Sidebar - Always visible */}
      <div className="w-80 min-w-[320px] border-r border-gray-200 bg-gray-50 flex-shrink-0 overflow-y-auto">
        {sidebar}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {main}
      </div>
    </div>
  )
}