"use client"

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AuthenticatedImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  onClick?: () => void
  title?: string
}

export function AuthenticatedImage({
  src,
  alt,
  className,
  style,
  loading = 'lazy',
  onClick,
  title
}: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadImage = async () => {
      if (!src) {
        setError(true)
        setIsLoading(false)
        return
      }

      // If it's not an API URL, use it directly
      if (!src.includes('/api/chat/files/')) {
        setBlobUrl(src)
        setIsLoading(false)
        return
      }

      try {
        const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
        
        if (!token) {
          console.error('🔐 No auth token available for image:', src)
          setError(true)
          setIsLoading(false)
          return
        }

        console.log('🖼️ Loading authenticated image:', src)
        const response = await fetch(src, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          console.log('✅ Image loaded successfully:', src)
          
          if (mounted) {
            setBlobUrl(url)
            setIsLoading(false)
          }
        } else {
          console.error('❌ Failed to fetch authenticated image:', response.status, response.statusText, src)
          if (mounted) {
            setError(true)
            setIsLoading(false)
          }
        }
      } catch (error) {
        console.error('❌ Error loading authenticated image:', error, src)
        if (mounted) {
          setError(true)
          setIsLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      mounted = false
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [src])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm",
          className
        )}
        style={style}
        onClick={onClick}
        title={title}
      >
        <div className="text-center p-4">
          <div className="text-gray-400 mb-1">📷</div>
          <div>Image unavailable</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg animate-pulse",
          className
        )}
        style={style}
      >
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={blobUrl || src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onClick={onClick}
      title={title}
      onError={() => {
        console.error('Image failed to load:', blobUrl || src)
        setError(true)
      }}
    />
  )
}