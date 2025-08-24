"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Image, Loader2 } from 'lucide-react'
import { GifPicker } from '../GifPicker'
import { cn } from '@/lib/utils'

interface GifPickerButtonProps {
  onGifSelect: (gif: {
    url: string
    preview_url?: string
    title?: string
    attribution?: string
  }) => void
  disabled?: boolean
  sending?: boolean
  className?: string
  size?: 'sm' | 'default'
  variant?: 'simple' | 'full'
  title?: string
}

export function GifPickerButton({
  onGifSelect,
  disabled = false,
  sending = false,
  className,
  size = 'default',
  variant = 'full',
  title = "Send GIF"
}: GifPickerButtonProps) {
  const [showGifPicker, setShowGifPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const handleGifSelect = (gif: {
    url: string
    preview_url?: string
    title?: string
    attribution?: string
  }) => {
    onGifSelect(gif)
    setShowGifPicker(false)
  }

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false)
      }
    }

    if (showGifPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showGifPicker])

  const sizeClasses = {
    sm: 'h-8 w-8 p-0',
    default: 'h-10 w-10 p-0'
  }

  // For simple variant, we might not show GIF picker
  if (variant === 'simple') {
    return null // GIFs might be too complex for widget
  }

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowGifPicker(!showGifPicker)}
        disabled={disabled || sending}
        className={cn(
          sizeClasses[size],
          "flex-shrink-0",
          showGifPicker && "bg-blue-100 text-blue-600",
          className
        )}
        title={title}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Image className="h-4 w-4" />
        )}
      </Button>

      {showGifPicker && (
        <div className={cn(
          "absolute z-50",
          size === 'sm' ? "bottom-10 right-0" : "bottom-12 right-0"
        )}>
          <GifPicker
            onSelectGif={handleGifSelect}
            onClose={() => setShowGifPicker(false)}
          />
        </div>
      )}
    </div>
  )
}