"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUploadButton, EmojiPickerButton, GifPickerButton } from './shared'
import { 
  Send, 
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
  editingMessage?: {
    id: string
    message_text: string
    display_name: string
  } | null
  onEditMessage?: (messageId: string, newText: string) => Promise<boolean>
  onCancelEdit?: () => void
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  currentUser,
  replyingTo,
  onCancelReply,
  editingMessage,
  onEditMessage,
  onCancelEdit
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  // Remove local state - now handled by shared components
  const [isTyping, setIsTyping] = useState(false)
  const [sending, setSending] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  // File input ref now handled by shared FileUploadButton

  useEffect(() => {
    // Focus input when component mounts
    inputRef.current?.focus()
  }, [])

  // Populate input when editing a message
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.message_text)
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setMessage('')
    }
  }, [editingMessage])

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
      if (editingMessage && onEditMessage) {
        // Edit mode
        const success = await onEditMessage(editingMessage.id, trimmedMessage)
        if (success) {
          setMessage('')
          if (onCancelEdit) onCancelEdit()
        }
      } else {
        // New message mode
        await onSendMessage({
          message_text: trimmedMessage,
          message_type: 'text',
          reply_to_id: replyingTo?.id
        })
        
        setMessage('')
        if (onCancelReply) onCancelReply()
      }
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

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      event.target.value = ''
      return
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/mov',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('File type not supported. Please upload images, videos, documents, or zip files.')
      event.target.value = ''
      return
    }

    setSending(true)

    try {
      console.log('📎 Uploading file:', file.name, file.size, file.type)
      
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('originalName', file.name)
      formData.append('fileType', file.type)
      formData.append('fileSize', file.size.toString())

      // Upload file to server
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]"']/g, '')
      
      const uploadResponse = await fetch('/api/chat/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json()
        console.log('✅ File uploaded:', uploadData)

        // Send message with file attachment
        const isImage = file.type.startsWith('image/')
        await onSendMessage({
          message_text: isImage ? `Shared an image: ${file.name}` : `Shared a file: ${file.name}`,
          message_type: 'file',
          file_attachment: {
            type: isImage ? 'image' : 'file',
            name: file.name,
            title: file.name,
            size: file.size,
            mimeType: file.type,
            url: uploadData.url,
            downloadUrl: uploadData.downloadUrl || uploadData.url,
            thumbnail: isImage ? uploadData.url : undefined
          },
          reply_to_id: replyingTo?.id
        })

        console.log('✅ File message sent successfully')
        if (onCancelReply) onCancelReply()
      } else {
        const errorData = await uploadResponse.json()
        console.error('❌ File upload failed:', errorData)
        alert(`File upload failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setSending(false)
      // Reset the input
      event.target.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
    
    if (e.key === 'Escape') {
      if (editingMessage && onCancelEdit) {
        onCancelEdit()
      } else if (replyingTo && onCancelReply) {
        onCancelReply()
      }
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

  // Emoji list now handled by shared EmojiPickerButton component

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

      {/* Edit Preview */}
      {editingMessage && (
        <div className="flex items-start space-x-2 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-orange-600 mb-1">
              Editing message from {editingMessage.display_name}
            </div>
            <div className="text-sm text-gray-700 truncate">
              Original: {editingMessage.message_text}
            </div>
          </div>
          {onCancelEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelEdit}
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
            <FileUploadButton
              onFileMessage={async (messageData) => {
                setSending(true)
                try {
                  await onSendMessage({
                    ...messageData,
                    reply_to_id: replyingTo?.id
                  })
                  if (onCancelReply) onCancelReply()
                } catch (error) {
                  console.error('Error sending file message:', error)
                } finally {
                  setSending(false)
                }
              }}
              disabled={disabled || sending}
              sending={sending}
              size="default"
              variant="full"
              title="Attach file"
              replyToId={replyingTo?.id}
            />

            {/* GIF Picker */}
            <GifPickerButton
              onGifSelect={handleGifSelect}
              disabled={disabled || sending}
              sending={sending}
              size="default"
              variant="full"
              title="Send GIF"
            />

            {/* Emoji Picker */}
            <EmojiPickerButton
              onEmojiSelect={addEmoji}
              disabled={disabled || sending}
              size="default"
              variant="full"
              title="Add emoji"
              inputRef={inputRef}
            />

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!message.trim() || disabled || sending || message.length > 4000}
              className="h-10 w-10 p-0"
              title={editingMessage ? "Save changes" : "Send message"}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* File input now handled by shared FileUploadButton component */}
      </form>

      {/* Click outside handlers now managed by individual shared components */}
    </div>
  )
}