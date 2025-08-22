"use client"

import React from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { cn } from '@/lib/utils'

interface TypingUser {
  user_id: string
  display_name: string
  profile_picture?: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
  className?: string
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].display_name} is typing...`
    } else if (users.length === 2) {
      return `${users[0].display_name} and ${users[1].display_name} are typing...`
    } else {
      return `${users[0].display_name} and ${users.length - 1} others are typing...`
    }
  }

  return (
    <div className={cn("flex items-center space-x-2 text-sm text-gray-500", className)}>
      {/* Show avatars for up to 3 users */}
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((user) => (
          <UserAvatar
            key={user.user_id}
            user={user}
            size="sm"
            className="border-2 border-white"
          />
        ))}
      </div>

      {/* Typing text */}
      <div className="flex items-center space-x-1">
        <span>{getTypingText()}</span>
        
        {/* Animated dots */}
        <div className="flex space-x-0.5">
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}