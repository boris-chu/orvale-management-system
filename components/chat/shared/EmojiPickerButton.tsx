"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
  variant?: 'simple' | 'full'
  title?: string
  inputRef?: React.RefObject<HTMLInputElement>
}

export function EmojiPickerButton({
  onEmojiSelect,
  disabled = false,
  className,
  size = 'default',
  variant = 'full',
  title = "Add emoji",
  inputRef
}: EmojiPickerButtonProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Common emojis for quick access
  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😎', '🔥', '💯', '✨']
  
  // Extended emoji set for full mode
  const fullEmojiSet = [
    // Faces
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '😋', '😛', '😜',
    '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶',
    '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
    // Hands
    '👍', '👎', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
    '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '👏', '🙌', '👐', '🤲',
    '🤜', '🤛', '✊', '👊', '🤚', '👎', '👍',
    // Hearts & Symbols  
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💒', '💍', '💎', '⭐',
    '🌟', '✨', '⚡', '🔥', '💯', '💢', '💨', '💦', '💤', '🎉', '🎊', '🎈'
  ]

  const emojisToShow = variant === 'simple' ? commonEmojis : fullEmojiSet

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setShowEmojiPicker(false)
    
    // Focus back to input if ref provided
    if (inputRef?.current) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const sizeClasses = {
    sm: 'h-8 w-8 p-0',
    default: 'h-10 w-10 p-0'
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        disabled={disabled}
        className={cn(
          sizeClasses[size],
          "flex-shrink-0",
          showEmojiPicker && "bg-blue-100 text-blue-600",
          className
        )}
        title={title}
      >
        {variant === 'simple' ? (
          <span className="text-lg">😊</span>
        ) : (
          <Smile className="h-4 w-4" />
        )}
      </Button>

      {showEmojiPicker && (
        <div
          ref={pickerRef}
          className={cn(
            "absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg",
            size === 'sm' ? "bottom-10 right-0" : "bottom-12 right-0",
            variant === 'simple' ? "p-2 w-48" : "p-3 w-64"
          )}
        >
          <div className={cn(
            "grid gap-1",
            variant === 'simple' ? "grid-cols-6" : "grid-cols-8"
          )}>
            {emojisToShow.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleEmojiClick(emoji)}
                className={cn(
                  "p-0 hover:bg-gray-100 flex items-center justify-center text-lg",
                  size === 'sm' ? "h-7 w-7" : "h-8 w-8"
                )}
              >
                {emoji}
              </Button>
            ))}
          </div>
          
          {variant === 'full' && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 text-center">
              Click emoji to insert
            </div>
          )}
        </div>
      )}
    </div>
  )
}