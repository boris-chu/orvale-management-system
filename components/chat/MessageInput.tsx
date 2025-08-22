"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GifPicker } from './GifPicker'
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image,
  AtSign,
  Hash,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  username: string
  display_name: string
  profile_picture?: string
  permissions?: string[]
}

interface MessageInputProps {
  onSendMessage: (messageData: {
    message_text: string
    message_type?: string
    file_attachment?: any
    reply_to_id?: string
  }) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
  placeholder?: string
  currentUser: User
  replyingTo?: {
    id: string
    user_name: string
    message_text: string
  } | null
  onCancelReply?: () => void
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  currentUser,
  replyingTo,
  onCancelReply
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sending, setSending] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input when component mounts
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Handle typing indicator
    if (message.trim() && !isTyping) {
      setIsTyping(true)
      onTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        onTyping(false)
      }
    }, 1000)

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, isTyping, onTyping])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedMessage = message.trim()
    if (!trimmedMessage || disabled || sending) return

    setSending(true)
    setIsTyping(false)
    onTyping(false)

    try {
      await onSendMessage({
        message_text: trimmedMessage,
        message_type: 'text',
        reply_to_id: replyingTo?.id
      })
      
      setMessage('')
      if (onCancelReply) onCancelReply()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleGifSelect = async (gif: {
    url: string
    preview_url?: string
    title?: string
    attribution?: string
  }) => {
    setSending(true)
    setShowGifPicker(false)

    try {
      await onSendMessage({
        message_text: 'Sent a GIF',
        message_type: 'gif',
        file_attachment: {
          type: 'gif',
          ...gif
        },
        reply_to_id: replyingTo?.id
      })
      
      if (onCancelReply) onCancelReply()
    } catch (error) {
      console.error('Error sending GIF:', error)
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // For now, we'll just handle this as a placeholder
    // In a real implementation, you'd upload to a file storage service
    console.log('File selected:', file.name)
    
    // Reset the input
    event.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
    
    if (e.key === 'Escape' && replyingTo && onCancelReply) {
      onCancelReply()
    }
  }

  const addEmoji = (emoji: string) => {
    const cursorPosition = inputRef.current?.selectionStart || message.length
    const newMessage = message.slice(0, cursorPosition) + emoji + message.slice(cursorPosition)
    setMessage(newMessage)
    setShowEmojiPicker(false)
    
    // Focus back to input and set cursor position
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length)
    }, 0)
  }

  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😎', '🔥', '💯', '✨']

  return (
    <div className="space-y-2">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 mb-1">
              Replying to {replyingTo.user_name}
            </div>
            <div className="text-sm text-gray-700 truncate">
              {replyingTo.message_text}
            </div>
          </div>
          {onCancelReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelReply}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          )}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end space-x-2">
          {/* Main Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || sending}
              className="pr-12 resize-none"
              maxLength={4000}
            />
            
            {/* Character Counter */}
            {message.length > 3800 && (
              <div className={cn(
                "absolute -top-6 right-0 text-xs",
                message.length > 4000 ? "text-red-500" : "text-gray-500"
              )}>
                {message.length}/4000
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-1">
            {/* File Upload */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || sending}
              className="h-10 w-10 p-0"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* GIF Picker */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGifPicker(!showGifPicker)}
                disabled={disabled || sending}
                className={cn(
                  "h-10 w-10 p-0",
                  showGifPicker && "bg-blue-100 text-blue-600"
                )}
                title="Send GIF"
              >
                <Image className="h-4 w-4" />
              </Button>
              
              {showGifPicker && (
                <div className="absolute bottom-12 right-0 z-50">
                  <GifPicker
                    onSelectGif={handleGifSelect}
                    onClose={() => setShowGifPicker(false)}
                  />
                </div>
              )}
            </div>

            {/* Emoji Picker */}
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled || sending}
                className={cn(
                  "h-10 w-10 p-0",
                  showEmojiPicker && "bg-blue-100 text-blue-600"
                )}
                title="Add emoji"
              >
                <Smile className="h-4 w-4" />
              </Button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0 z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                  <div className="grid grid-cols-6 gap-1">
                    {commonEmojis.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji(emoji)}
                        className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!message.trim() || disabled || sending || message.length > 4000}
              className="h-10 w-10 p-0"
              title="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />
      </form>

      {/* Click outside to close pickers */}
      {(showGifPicker || showEmojiPicker) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowGifPicker(false)
            setShowEmojiPicker(false)
          }}
        />
      )}
    </div>
  )
}