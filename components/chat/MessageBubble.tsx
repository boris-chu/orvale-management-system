"use client"

import React, { useState, useEffect } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  MoreHorizontal, 
  Reply, 
  Edit, 
  Trash2, 
  Copy,
  ExternalLink,
  Heart,
  ThumbsUp,
  Laugh,
  CornerUpLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { formatLocalTime, formatMessageTime, formatLocalDateTime } from '@/lib/date-utils'
import { motion, AnimatePresence } from 'framer-motion'

// Helper function to add spacing between consecutive emojis
const formatMessageWithEmojiSpacing = (text: string): string => {
  // Regular expression to match emoji sequences
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu
  
  // Add a thin space between consecutive emojis
  return text.replace(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu, '$1 $2')
}

interface Message {
  id: string
  user_id: string
  display_name: string
  profile_picture?: string
  message_text: string
  message_type: 'text' | 'file' | 'gif' | 'system'
  file_attachment?: {
    type: string
    url: string
    preview_url?: string
    title?: string
    attribution?: string
  }
  reply_to_id?: string
  reply_to_text?: string
  reply_to_display_name?: string
  ticket_reference?: string
  reactions: Array<{
    emoji: string
    count: number
    users: Array<{ user_id: string; display_name: string }>
  }>
  created_at: string
  updated_at?: string
  edited?: boolean
  deleted?: boolean
  _isNew?: boolean
}

interface User {
  username: string
  display_name: string
  profile_picture?: string
  permissions?: string[]
}

interface MessageBubbleProps {
  messages: Message[]
  currentUser: User
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
  isGrouped: boolean
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function MessageBubble({ 
  messages, 
  currentUser, 
  onAddReaction, 
  onRemoveReaction,
  isGrouped 
}: MessageBubbleProps) {
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)

  const mainMessage = messages[0]
  const isOwnMessage = mainMessage.user_id === currentUser.username
  const showAvatar = !isGrouped || messages.length === 1

  const handleReactionClick = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const existingReaction = message.reactions.find(r => r.emoji === emoji)
    const userReacted = existingReaction?.users.some(u => u.user_id === currentUser.username)

    if (userReacted) {
      onRemoveReaction(messageId, emoji)
    } else {
      onAddReaction(messageId, emoji)
    }
  }

  const formatTime = (timestamp: string) => {
    // Use our utility to show appropriate time format
    return formatMessageTime(timestamp)
  }

  const renderMessageContent = (message: Message) => {
    if (message.deleted) {
      return (
        <div className="italic text-gray-500 text-sm">
          <Trash2 className="h-3 w-3 inline mr-1" />
          This message was deleted
        </div>
      )
    }

    switch (message.message_type) {
      case 'gif':
        return (
          <div className="space-y-2">
            {message.file_attachment && (
              <div className="relative max-w-sm">
                <img
                  src={message.file_attachment.preview_url || message.file_attachment.url}
                  alt={message.file_attachment.title || 'GIF'}
                  className="rounded-lg max-w-full h-auto"
                  loading="lazy"
                />
                {message.file_attachment.attribution && (
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    via {message.file_attachment.attribution}
                  </div>
                )}
              </div>
            )}
            {message.message_text && message.message_text !== 'Sent a GIF' && (
              <div className="text-sm text-gray-900">
                {message.message_text}
              </div>
            )}
          </div>
        )

      case 'file':
        return (
          <div className="space-y-2">
            {message.file_attachment && (() => {
              // Check if the file is an image
              const isImage = message.file_attachment.mimeType?.startsWith('image/') || 
                             message.file_attachment.type === 'image' ||
                             /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(message.file_attachment.name || message.file_attachment.title || '')

              if (isImage) {
                // Display image preview
                return (
                  <div className="space-y-2">
                    <div className="relative max-w-md group">
                      <img
                        src={message.file_attachment.url}
                        alt={message.file_attachment.name || message.file_attachment.title || 'Image'}
                        className="rounded-lg max-w-full h-auto shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                        loading="lazy"
                        style={{ maxHeight: '400px' }}
                        onClick={() => window.open(message.file_attachment.url, '_blank')}
                        title="Click to view full size"
                      />
                      {/* Image overlay with filename and actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all rounded-lg flex items-end p-2 opacity-0 group-hover:opacity-100">
                        <div className="flex items-center justify-between w-full">
                          <div className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                            {message.file_attachment.name || message.file_attachment.title}
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 bg-black bg-opacity-50 hover:bg-opacity-70"
                              onClick={async (e) => {
                                e.stopPropagation()
                                const url = message.file_attachment?.url
                                console.log('🔍 Opening image URL:', url)
                                
                                if (!url) {
                                  console.error('No image URL available')
                                  return
                                }
                                
                                try {
                                  // For file serving, we need to fetch with auth and create blob URL
                                  const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]"']/g, '')
                                  if (token && url.includes('/api/chat/files/')) {
                                    const response = await fetch(url, {
                                      headers: { 'Authorization': `Bearer ${token}` }
                                    })
                                    if (response.ok) {
                                      const blob = await response.blob()
                                      const blobUrl = URL.createObjectURL(blob)
                                      window.open(blobUrl, '_blank', 'noopener,noreferrer')
                                      // Clean up the blob URL after a short delay
                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
                                    } else {
                                      console.error('Failed to fetch image:', response.status)
                                      window.open(url, '_blank', 'noopener,noreferrer')
                                    }
                                  } else {
                                    window.open(url, '_blank', 'noopener,noreferrer')
                                  }
                                } catch (error) {
                                  console.error('Error opening image:', error)
                                  window.open(url, '_blank', 'noopener,noreferrer')
                                }
                              }}
                              title="View full size"
                            >
                              <ExternalLink className="h-3 w-3 text-white" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 bg-black bg-opacity-50 hover:bg-opacity-70"
                              onClick={async (e) => {
                                e.stopPropagation()
                                const downloadUrl = message.file_attachment?.downloadUrl || message.file_attachment?.url
                                console.log('📥 Downloading file from:', downloadUrl)
                                
                                if (!downloadUrl) {
                                  console.error('No download URL available')
                                  return
                                }
                                
                                try {
                                  // For file downloads, we need to fetch with auth and create download link
                                  const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]"']/g, '')
                                  if (token && downloadUrl.includes('/api/chat/')) {
                                    const response = await fetch(downloadUrl, {
                                      headers: { 'Authorization': `Bearer ${token}` }
                                    })
                                    if (response.ok) {
                                      const blob = await response.blob()
                                      const blobUrl = URL.createObjectURL(blob)
                                      
                                      // Create download link
                                      const link = document.createElement('a')
                                      link.href = blobUrl
                                      link.download = message.file_attachment.name || 'download'
                                      link.style.display = 'none'
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                      
                                      // Clean up the blob URL
                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
                                    } else {
                                      console.error('Failed to download file:', response.status)
                                      alert('Failed to download file. Please try again.')
                                    }
                                  } else {
                                    // Fallback for non-API URLs
                                    const link = document.createElement('a')
                                    link.href = downloadUrl
                                    link.download = message.file_attachment.name || 'download'
                                    link.style.display = 'none'
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                  }
                                } catch (error) {
                                  console.error('Error downloading file:', error)
                                  alert('Failed to download file. Please try again.')
                                }
                              }}
                              title="Download"
                            >
                              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              } else {
                // Display as file card for non-images
                return (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border max-w-sm">
                    <div className="flex-shrink-0">
                      {/* File type icon */}
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {message.file_attachment.name || message.file_attachment.title || 'File attachment'}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                        <span>{message.file_attachment.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                        {message.file_attachment.size && (
                          <span>• {(message.file_attachment.size / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={async (e) => {
                          e.stopPropagation()
                          const url = message.file_attachment?.url
                          console.log('🔍 Opening file URL:', url)
                          
                          if (!url) {
                            console.error('No file URL available')
                            return
                          }
                          
                          try {
                            // For file serving, we need to fetch with auth and create blob URL
                            const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
                            if (token && url.includes('/api/chat/files/')) {
                              const response = await fetch(url, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              })
                              if (response.ok) {
                                const blob = await response.blob()
                                const blobUrl = URL.createObjectURL(blob)
                                window.open(blobUrl, '_blank', 'noopener,noreferrer')
                                // Clean up the blob URL after a short delay
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
                              } else {
                                console.error('Failed to fetch file:', response.status)
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }
                            } else {
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }
                          } catch (error) {
                            console.error('Error opening file:', error)
                            window.open(url, '_blank', 'noopener,noreferrer')
                          }
                        }}
                        title="View"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={async (e) => {
                          e.stopPropagation()
                          const downloadUrl = message.file_attachment?.downloadUrl || message.file_attachment?.url
                          console.log('📥 Downloading file from:', downloadUrl)
                          
                          if (!downloadUrl) {
                            console.error('No download URL available')
                            return
                          }
                          
                          try {
                            // For file downloads, we need to fetch with auth and create download link
                            const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
                            if (token && downloadUrl.includes('/api/chat/')) {
                              const response = await fetch(downloadUrl, {
                                headers: { 'Authorization': `Bearer ${token}` }
                              })
                              if (response.ok) {
                                const blob = await response.blob()
                                const blobUrl = URL.createObjectURL(blob)
                                
                                // Create download link
                                const link = document.createElement('a')
                                link.href = blobUrl
                                link.download = message.file_attachment.name || 'download'
                                link.style.display = 'none'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                
                                // Clean up the blob URL
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
                              } else {
                                console.error('Failed to download file:', response.status)
                                alert('Failed to download file. Please try again.')
                              }
                            } else {
                              // Fallback for non-API URLs
                              const link = document.createElement('a')
                              link.href = downloadUrl
                              link.download = message.file_attachment.name || 'download'
                              link.style.display = 'none'
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }
                          } catch (error) {
                            console.error('Error downloading file:', error)
                            alert('Failed to download file. Please try again.')
                          }
                        }}
                        title="Download"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                )
              }
            })()}
            {message.message_text && !message.message_text.startsWith('Shared a file:') && (
              <div className="text-sm text-gray-900">
                {formatMessageWithEmojiSpacing(message.message_text)}
              </div>
            )}
          </div>
        )

      case 'system':
        return (
          <div className="text-sm text-gray-500 italic">
            {formatMessageWithEmojiSpacing(message.message_text)}
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            {message.reply_to_id && (
              <div className="pl-3 border-l-2 border-gray-300 bg-gray-50 rounded-r p-2 text-sm">
                <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                  <CornerUpLeft className="h-3 w-3" />
                  <span>Replying to {message.reply_to_display_name}</span>
                </div>
                <div className="text-gray-700 truncate">
                  {message.reply_to_text}
                </div>
              </div>
            )}
            <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
              {formatMessageWithEmojiSpacing(message.message_text)}
            </div>
            {message.ticket_reference && (
              <Badge variant="outline" className="text-xs">
                Ticket: {message.ticket_reference}
              </Badge>
            )}
          </div>
        )
    }
  }

  const renderReactions = (message: Message) => {
    if (message.reactions.length === 0) return null

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {message.reactions.map((reaction) => {
          const userReacted = reaction.users && Array.isArray(reaction.users) 
            ? reaction.users.some(u => u.user_id === currentUser.username)
            : false
          return (
            <TooltipProvider key={reaction.emoji}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 py-0 text-xs rounded-full border",
                      userReacted 
                        ? "bg-blue-100 border-blue-300 text-blue-700" 
                        : "bg-gray-100 border-gray-200 hover:bg-gray-200"
                    )}
                    onClick={() => handleReactionClick(message.id, reaction.emoji)}
                  >
                    <span className="mr-1">{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {reaction.users && Array.isArray(reaction.users) 
                      ? reaction.users.map(u => u.display_name).join(', ')
                      : 'No users'
                    }
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("group", isGrouped ? "space-y-1" : "space-y-3")}>
      <AnimatePresence>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={message._isNew ? { opacity: 0, y: 20, scale: 0.95 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              duration: 0.3,
              ease: "easeOut"
            }}
            className={cn(
              "flex space-x-3 rounded-lg px-2 py-1 -mx-2 transition-all",
              message._isNew && "animate-pulse-once",
              "hover:bg-gray-50"
            )}
            onMouseEnter={() => setHoveredMessage(message.id)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {showAvatar && index === 0 ? (
              <UserAvatar
                user={{
                  display_name: message.display_name,
                  profile_picture: message.profile_picture,
                  username: message.user_id
                }}
                size="md"
                showPresenceStatus={true}
                presenceStatus="online"
              />
            ) : (
              <div className="w-8 h-8 flex items-center justify-center">
                {hoveredMessage === message.id && (
                  <span className="text-xs text-gray-400">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">
                            {formatTime(message.created_at)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {formatLocalDateTime(message.created_at)}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Header (only for first message in group) */}
            {showAvatar && index === 0 && (
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {message.display_name}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-gray-500 cursor-default">
                        {formatTime(message.created_at)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatLocalDateTime(message.created_at)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {message.edited && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>
            )}

            {/* Message Body */}
            <div className="relative">
              {renderMessageContent(message)}
              {renderReactions(message)}

              {/* Message Actions */}
              {hoveredMessage === message.id && !message.deleted && (
                <div className="absolute -top-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg flex">
                  {/* Quick Reactions */}
                  {commonEmojis.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => handleReactionClick(message.id, emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                  
                  <div className="w-px bg-gray-200 my-1" />
                  
                  {/* Message Actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    title="Reply"
                  >
                    <Reply className="h-3 w-3" />
                  </Button>
                  
                  {isOwnMessage && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        title="Edit"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    title="More"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  )
}