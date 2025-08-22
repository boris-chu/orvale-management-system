"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Loader2, 
  X,
  TrendingUp,
  Zap,
  Heart,
  Laugh,
  ThumbsUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GifData {
  id: string
  title: string
  images: {
    fixed_height: {
      url: string
      width: string
      height: string
    }
    fixed_height_small: {
      url: string
      width: string
      height: string
    }
    preview_gif: {
      url: string
    }
  }
  username?: string
}

interface GifPickerProps {
  onSelectGif: (gif: {
    url: string
    preview_url?: string
    title?: string
    attribution?: string
  }) => void
  onClose: () => void
}

// Note: In production, you'd want to store this in environment variables
const GIPHY_API_KEY = 'demo_api_key' // Replace with actual API key
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs'

const categories = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'reactions', label: 'Reactions', icon: Zap },
  { id: 'love', label: 'Love', icon: Heart },
  { id: 'funny', label: 'Funny', icon: Laugh },
  { id: 'agree', label: 'Agree', icon: ThumbsUp },
]

export function GifPicker({ onSelectGif, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gifs, setGifs] = useState<GifData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('trending')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGifs('trending')
  }, [])

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        setSelectedCategory('search')
        loadGifs('search', searchQuery, 0, true)
      } else if (selectedCategory === 'search') {
        setSelectedCategory('trending')
        loadGifs('trending', '', 0, true)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const loadGifs = async (
    type: string, 
    query = '', 
    loadOffset = 0, 
    replace = false
  ) => {
    setLoading(true)
    setError(null)

    try {
      let url = ''
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        limit: '20',
        offset: loadOffset.toString(),
        rating: 'g', // Keep it family-friendly
        lang: 'en'
      })

      switch (type) {
        case 'trending':
          url = `${GIPHY_BASE_URL}/trending?${params}`
          break
        case 'search':
          if (!query.trim()) return
          params.append('q', query.trim())
          url = `${GIPHY_BASE_URL}/search?${params}`
          break
        default:
          // Category search
          params.append('q', type)
          url = `${GIPHY_BASE_URL}/search?${params}`
      }

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch GIFs')
      }

      const data = await response.json()
      
      if (replace) {
        setGifs(data.data || [])
        setOffset(20)
      } else {
        setGifs(prev => [...prev, ...(data.data || [])])
        setOffset(prev => prev + 20)
      }
      
      setHasMore(data.pagination?.total_count > offset + 20)
    } catch (err) {
      console.error('Error loading GIFs:', err)
      setError('Failed to load GIFs. Using demo mode.')
      
      // Fallback to demo GIFs when API fails
      if (replace || gifs.length === 0) {
        setGifs(generateDemoGifs())
      }
    } finally {
      setLoading(false)
    }
  }

  const generateDemoGifs = (): GifData[] => {
    // Demo GIFs for when Giphy API is not available
    return Array.from({ length: 12 }, (_, i) => ({
      id: `demo-${i}`,
      title: `Demo GIF ${i + 1}`,
      images: {
        fixed_height: {
          url: `https://via.placeholder.com/300x200/4F46E5/white?text=GIF+${i + 1}`,
          width: '300',
          height: '200'
        },
        fixed_height_small: {
          url: `https://via.placeholder.com/150x100/4F46E5/white?text=GIF+${i + 1}`,
          width: '150',
          height: '100'
        },
        preview_gif: {
          url: `https://via.placeholder.com/150x100/4F46E5/white?text=GIF+${i + 1}`
        }
      }
    }))
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSearchQuery('')
    loadGifs(categoryId, '', 0, true)
  }

  const handleGifSelect = (gif: GifData) => {
    onSelectGif({
      url: gif.images.fixed_height.url,
      preview_url: gif.images.fixed_height_small.url,
      title: gif.title,
      attribution: 'Giphy'
    })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loading) {
      const currentQuery = selectedCategory === 'search' ? searchQuery : selectedCategory
      loadGifs(selectedCategory, currentQuery, offset, false)
    }
  }

  return (
    <div className="w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Send a GIF</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search GIFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex space-x-1">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant="ghost"
                size="sm"
                onClick={() => handleCategorySelect(category.id)}
                className={cn(
                  "h-8 px-3 text-xs",
                  selectedCategory === category.id && !searchQuery
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="h-3 w-3 mr-1" />
                {category.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2">
          <Badge variant="destructive" className="text-xs">
            {error}
          </Badge>
        </div>
      )}

      {/* GIF Grid */}
      <ScrollArea 
        className="flex-1 p-2"
        onScrollCapture={handleScroll}
        ref={scrollAreaRef}
      >
        <div className="grid grid-cols-2 gap-2">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => handleGifSelect(gif)}
              className="relative aspect-video bg-gray-100 rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all group"
            >
              <img
                src={gif.images.fixed_height_small.url}
                alt={gif.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
              
              {/* GIF Title Overlay */}
              {gif.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {gif.title}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        {/* No Results */}
        {!loading && gifs.length === 0 && searchQuery && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No GIFs found for "{searchQuery}"</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          Powered by <span className="font-semibold">GIPHY</span>
        </p>
      </div>
    </div>
  )
}