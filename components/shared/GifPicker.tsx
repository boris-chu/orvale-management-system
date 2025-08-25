/**
 * GifPicker - Shared Giphy integration component with admin-controlled settings
 * Features configurable API key, content rating, rate limiting, and enable/disable toggle
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  TrendingUp, 
  Grid, 
  X, 
  Loader2, 
  AlertCircle,
  Settings,
  Clock,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface GifItem {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  size: number;
}

interface GifPickerProps {
  onGifSelect: (gifUrl: string, gifTitle: string, gifId: string) => void;
  onClose?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

interface GiphySettings {
  enabled: boolean;
  api_key: string;
  content_rating: 'g' | 'pg' | 'pg-13' | 'r';
  search_limit: number;
  trending_limit: number;
  rate_limit: number;
  enable_search: boolean;
  enable_trending: boolean;
  enable_categories: boolean;
}

export default function GifPicker({
  onGifSelect,
  onClose,
  position = 'bottom',
  className = ''
}: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GifItem[]>([]);
  const [trendingGifs, setTrendingGifs] = useState<GifItem[]>([]);
  const [categoryGifs, setCategoryGifs] = useState<GifItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('trending');
  const [rateLimitStatus, setRateLimitStatus] = useState({ remaining: 50, resetTime: null });

  // Admin-controlled settings
  const [giphySettings, setGiphySettings] = useState<GiphySettings>({
    enabled: false,
    api_key: '',
    content_rating: 'g',
    search_limit: 20,
    trending_limit: 12,
    rate_limit: 50,
    enable_search: true,
    enable_trending: true,
    enable_categories: true
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const isMobile = useIsMobile();

  // Fetch admin settings on component mount
  useEffect(() => {
    fetchGiphySettings();
  }, []);

  // Load trending GIFs when settings are loaded
  useEffect(() => {
    if (giphySettings.enabled && giphySettings.api_key && giphySettings.enable_trending) {
      loadTrendingGifs();
    }
  }, [giphySettings.enabled, giphySettings.api_key, giphySettings.enable_trending]);

  // Auto-search with debouncing
  useEffect(() => {
    if (searchQuery.trim() && giphySettings.enabled && giphySettings.enable_search) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        searchGifs(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, giphySettings.enabled, giphySettings.enable_search]);

  const fetchGiphySettings = async () => {
    try {
      const response = await fetch('/api/admin/chat/settings?category=giphy');
      if (response.ok) {
        const settings = await response.json();
        setGiphySettings({
          enabled: settings.giphy_enabled === 'true',
          api_key: settings.giphy_api_key || '',
          content_rating: settings.giphy_content_rating || 'g',
          search_limit: parseInt(settings.giphy_search_limit) || 20,
          trending_limit: parseInt(settings.giphy_trending_limit) || 12,
          rate_limit: parseInt(settings.giphy_rate_limit) || 50,
          enable_search: settings.giphy_enable_search !== 'false',
          enable_trending: settings.giphy_enable_trending !== 'false',
          enable_categories: settings.giphy_enable_categories !== 'false'
        });
      }
    } catch (error) {
      console.error('Failed to fetch Giphy settings:', error);
      setError('Failed to load GIF settings');
    }
  };

  const checkRateLimit = async () => {
    try {
      const response = await fetch('/api/chat/gif-rate-limit');
      if (response.ok) {
        const data = await response.json();
        setRateLimitStatus(data);
        return data.remaining > 0;
      }
      return false;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error
    }
  };

  const searchGifs = async (query: string) => {
    if (!giphySettings.api_key || !query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const canProceed = await checkRateLimit();
      if (!canProceed) {
        setError(`Rate limit exceeded. You can send ${giphySettings.rate_limit} GIFs per hour.`);
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${giphySettings.api_key}&q=${encodeURIComponent(query)}&limit=${giphySettings.search_limit}&rating=${giphySettings.content_rating}&lang=en`
      );

      if (!response.ok) {
        throw new Error('Failed to search GIFs');
      }

      const data = await response.json();
      const gifs: GifItem[] = data.data.map((gif: any) => ({
        id: gif.id,
        title: gif.title,
        url: gif.images.original.url,
        preview_url: gif.images.fixed_height_small.url,
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height),
        size: parseInt(gif.images.original.size || '0')
      }));

      setSearchResults(gifs);
      setActiveTab('search');
    } catch (error) {
      console.error('GIF search failed:', error);
      setError('Failed to search GIFs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingGifs = async () => {
    if (!giphySettings.api_key) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${giphySettings.api_key}&limit=${giphySettings.trending_limit}&rating=${giphySettings.content_rating}`
      );

      if (!response.ok) {
        throw new Error('Failed to load trending GIFs');
      }

      const data = await response.json();
      const gifs: GifItem[] = data.data.map((gif: any) => ({
        id: gif.id,
        title: gif.title,
        url: gif.images.original.url,
        preview_url: gif.images.fixed_height_small.url,
        width: parseInt(gif.images.original.width),
        height: parseInt(gif.images.original.height),
        size: parseInt(gif.images.original.size || '0')
      }));

      setTrendingGifs(gifs);
    } catch (error) {
      console.error('Failed to load trending GIFs:', error);
      setError('Failed to load trending GIFs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGifSelect = useCallback(async (gif: GifItem) => {
    // Check rate limit before sending
    const canProceed = await checkRateLimit();
    if (!canProceed) {
      setError(`Rate limit exceeded. You can send ${giphySettings.rate_limit} GIFs per hour.`);
      return;
    }

    // Log the GIF send for rate limiting
    try {
      await fetch('/api/chat/gif-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gif_id: gif.id })
      });
    } catch (error) {
      console.error('Failed to log GIF usage:', error);
    }

    onGifSelect(gif.url, gif.title, gif.id);
    onClose?.();
  }, [onGifSelect, onClose, giphySettings.rate_limit]);

  const renderGifGrid = (gifs: GifItem[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4">
      {gifs.map((gif) => (
        <motion.div
          key={gif.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="relative aspect-square overflow-hidden rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-800"
          onClick={() => handleGifSelect(gif)}
        >
          <img
            src={gif.preview_url}
            alt={gif.title}
            loading="lazy"
            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          
          {/* Title overlay on hover */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">{gif.title}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );

  // Disabled state
  if (!giphySettings.enabled) {
    return (
      <Card className={cn("w-80 max-w-sm", className)}>
        <CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            GIFs Disabled
          </h3>
          <p className="text-gray-500 text-sm">
            GIF functionality has been disabled by your administrator.
          </p>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No API key configured
  if (!giphySettings.api_key) {
    return (
      <Card className={cn("w-80 max-w-sm", className)}>
        <CardContent className="p-6 text-center">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            GIFs Not Configured
          </h3>
          <p className="text-gray-500 text-sm">
            Giphy API key has not been configured by your administrator.
          </p>
          {onClose && (
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-96 max-w-full h-96", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Choose a GIF</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Rate limit indicator */}
        {rateLimitStatus.remaining !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{rateLimitStatus.remaining} GIFs remaining this hour</span>
            {rateLimitStatus.remaining < 10 && (
              <Badge variant="destructive" className="text-xs">Low</Badge>
            )}
          </div>
        )}

        {/* Search input */}
        {giphySettings.enable_search && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for GIFs..."
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700 p-3"
            >
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            {giphySettings.enable_trending && (
              <TabsTrigger value="trending" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending
              </TabsTrigger>
            )}
            {giphySettings.enable_search && searchResults.length > 0 && (
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search ({searchResults.length})
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-hidden">
            {/* Trending GIFs */}
            {giphySettings.enable_trending && (
              <TabsContent value="trending" className="h-full m-0">
                <ScrollArea className="h-full">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading trending GIFs...</span>
                    </div>
                  ) : trendingGifs.length > 0 ? (
                    renderGifGrid(trendingGifs)
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-gray-500">No trending GIFs available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            )}

            {/* Search Results */}
            {giphySettings.enable_search && (
              <TabsContent value="search" className="h-full m-0">
                <ScrollArea className="h-full">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Searching GIFs...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    renderGifGrid(searchResults)
                  ) : searchQuery.trim() ? (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-gray-500">No GIFs found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-gray-500">Search for GIFs above</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}