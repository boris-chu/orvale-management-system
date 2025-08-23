"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/UserAvatar'
import { 
  Search, 
  X, 
  Loader2,
  MessageSquare,
  Hash,
  Calendar,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface SearchResult {
  id: string
  channel_id: string
  channel_name: string
  channel_type: 'public' | 'private' | 'direct'
  message_text: string
  user_id: string
  display_name: string
  profile_picture?: string
  created_at: string
  message_type: 'text' | 'gif' | 'file'
  file_attachment?: any
  context_before?: string
  context_after?: string
}

interface MessageSearchProps {
  isOpen: boolean
  onClose: () => void
  onSelectMessage: (result: SearchResult) => void
  currentUser: any
}

export function MessageSearch({ isOpen, onClose, onSelectMessage, currentUser }: MessageSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query.trim())
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token')
      
      if (!token) {
        console.error('No authentication token available for search')
        return
      }

      console.log('🔍 MessageSearch: Performing search for:', searchQuery)
      
      const response = await fetch(`/api/chat/search?q=${encodeURIComponent(searchQuery)}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('📡 MessageSearch: API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 MessageSearch: Search results:', data.results?.length || 0)
        setResults(data.results || [])
        setSelectedIndex(0)
      } else {
        const errorText = await response.text()
        console.error('Search failed:', response.status, errorText)
        setResults([])
      }
    } catch (error) {
      console.error('Error performing search:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      onSelectMessage(results[selectedIndex])
      onClose()
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'public':
        return <Hash className="h-3 w-3" />
      case 'private':
        return <Hash className="h-3 w-3 text-orange-500" />
      case 'direct':
        return <MessageSquare className="h-3 w-3" />
      default:
        return <Hash className="h-3 w-3" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center pt-20">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl mx-4">
        {/* Search Input */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search messages across all channels..."
              className="pl-10 pr-10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search Stats */}
          {query.trim() && (
            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
              <span>
                {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
              </span>
              <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
            </div>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Searching messages...</p>
            </div>
          ) : query.trim().length < 2 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="font-medium mb-2">Search Messages</h3>
              <p className="text-sm">
                Search across all your channels and direct messages.
                <br />
                Type at least 2 characters to start searching.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="font-medium mb-2">No messages found</h3>
              <p className="text-sm">
                Try different keywords or check your spelling.
                <br />
                You can only search channels you have access to.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onSelectMessage(result)
                    onClose()
                  }}
                  className={cn(
                    "w-full text-left p-3 hover:bg-gray-50 border-l-2 border-transparent transition-colors",
                    index === selectedIndex && "bg-blue-50 border-blue-500"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    {/* User Avatar */}
                    <UserAvatar
                      user={{
                        display_name: result.display_name,
                        profile_picture: result.profile_picture,
                        username: result.user_id
                      }}
                      size="sm"
                    />

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {result.display_name}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          {getChannelIcon(result.channel_type)}
                          <span>{result.channel_name}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(result.created_at))} ago</span>
                        </div>
                      </div>

                      {/* Message Text */}
                      <div className="text-sm text-gray-700">
                        {result.message_type === 'gif' ? (
                          <div className="flex items-center space-x-2">
                            <span className="italic">Sent a GIF</span>
                            <Badge variant="secondary" className="text-xs">GIF</Badge>
                          </div>
                        ) : result.message_type === 'file' ? (
                          <div className="flex items-center space-x-2">
                            <span className="italic">Shared a file</span>
                            <Badge variant="secondary" className="text-xs">FILE</Badge>
                            {result.message_text && (
                              <span>• {highlightText(result.message_text, query)}</span>
                            )}
                          </div>
                        ) : (
                          <div className="break-words">
                            {highlightText(result.message_text, query)}
                          </div>
                        )}
                      </div>

                      {/* Context */}
                      {(result.context_before || result.context_after) && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          {result.context_before && <span>...{result.context_before} </span>}
                          <span className="not-italic font-medium">[matched message]</span>
                          {result.context_after && <span> {result.context_after}...</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center">
            Showing {results.length} results • Results are limited to channels you have access to
          </div>
        )}
      </div>
    </div>
  )
}