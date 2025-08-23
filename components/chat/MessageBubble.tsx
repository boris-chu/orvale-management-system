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
            {message.file_attachment && (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {message.file_attachment.title || 'File attachment'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {message.file_attachment.type?.toUpperCase() || 'FILE'}
                  </div>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <a href={message.file_attachment.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
            {message.message_text && (
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