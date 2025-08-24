"use client"

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadButtonProps {
  onFileSelect?: (file: File) => void
  onFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onFileMessage?: (messageData: {
    message_text: string
    message_type: string
    file_attachment: any
    reply_to_id?: string
  }) => Promise<void>
  disabled?: boolean
  sending?: boolean
  className?: string
  size?: 'sm' | 'default'
  variant?: 'simple' | 'full'
  title?: string
  accept?: string
  replyToId?: string
}

export function FileUploadButton({
  onFileSelect,
  onFileUpload,
  onFileMessage,
  disabled = false,
  sending = false,
  className,
  size = 'default',
  variant = 'full',
  title = "Upload file",
  accept = "image/*,video/*,.pdf,.doc,.docx,.txt",
  replyToId
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (variant === 'simple' && onFileSelect) {
      // Simple mode - just pass the file to parent
      onFileSelect(file)
    } else if (variant === 'full' && onFileUpload) {
      // Full mode - handle upload with validation
      await handleFullFileUpload(event)
    }
  }

  const handleFullFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Use the working file upload logic from the original MessageInput
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

        // Create proper file attachment data structure (same as working version)
        const isImage = file.type.startsWith('image/')
        const fileMessageData = {
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
          }
        }

        // Call the appropriate callback with the file message data
        if (onFileMessage) {
          // Use the new onFileMessage callback for proper message handling
          await onFileMessage({
            ...fileMessageData,
            reply_to_id: replyToId
          })
        } else if (onFileUpload) {
          // Fallback to the old onFileUpload callback
          const syntheticEvent = event
          ;(syntheticEvent as any).fileMessageData = fileMessageData
          await onFileUpload(syntheticEvent)
        }

        console.log('✅ File message sent successfully')
      } else {
        const errorData = await uploadResponse.json()
        console.error('❌ File upload failed:', errorData)
        alert(`File upload failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      // Reset the input
      event.target.value = ''
    }
  }

  const sizeClasses = {
    sm: 'h-8 w-8 p-0',
    default: 'h-10 w-10 p-0'
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={disabled || sending}
        className={cn(
          sizeClasses[size],
          "flex-shrink-0",
          className
        )}
        title={title}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : variant === 'simple' ? (
          // Simple SVG icon for widget
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        ) : (
          // Lucide icon for main chat
          <Paperclip className="h-4 w-4" />
        )}
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
      />
    </>
  )
}