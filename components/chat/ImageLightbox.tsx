"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageLightboxProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
  filename?: string
  downloadUrl?: string
}

export function ImageLightbox({ 
  src, 
  alt, 
  isOpen, 
  onClose, 
  filename, 
  downloadUrl 
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
      setImageLoaded(false)
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '=':
        case '+':
          e.preventDefault()
          handleZoomIn()
          break
        case '-':
          e.preventDefault()
          handleZoomOut()
          break
        case 'r':
        case 'R':
          e.preventDefault()
          handleRotate()
          break
        case '0':
          e.preventDefault()
          handleReset()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.2))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleReset = () => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDownload = async () => {
    try {
      const url = downloadUrl || src
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      
      if (token && url.includes('/api/chat/')) {
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)
          
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = filename || 'image'
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        } else {
          throw new Error('Failed to fetch image')
        }
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = filename || 'image'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try again.')
    }
  }

  const handleOpenExternal = async () => {
    try {
      const token = (localStorage.getItem('authToken') || localStorage.getItem('token'))?.trim().replace(/[\[\]\"']/g, '')
      
      if (token && src.includes('/api/chat/files/')) {
        const response = await fetch(src, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = URL.createObjectURL(blob)
          window.open(blobUrl, '_blank', 'noopener,noreferrer')
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
        } else {
          window.open(src, '_blank', 'noopener,noreferrer')
        }
      } else {
        window.open(src, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      console.error('Error opening image:', error)
      window.open(src, '_blank', 'noopener,noreferrer')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
        
        {/* Side Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed top-0 right-0 bottom-0 z-50 bg-white border-l border-gray-200 shadow-2xl"
          style={{ width: '40vw', minWidth: '400px', maxWidth: '600px' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Controls Header */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between p-4">
            <div className="font-medium text-gray-900 truncate flex-1">
              {filename || alt}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Action Bar */}
          <div className="px-4 pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleZoomOut()
                }}
                disabled={zoom <= 0.2}
                title="Zoom out (-)"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-gray-700 text-sm min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleZoomIn()
                }}
                disabled={zoom >= 5}
                title="Zoom in (+)"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRotate()
                }}
                title="Rotate (R)"
              >
                <RotateCw className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleReset()
                }}
                title="Reset (0)"
              >
                Reset
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload()
                }}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenExternal()
                }}
                title="Open in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div 
          className="flex-1 relative bg-gray-100 overflow-hidden"
          style={{ height: 'calc(100% - 120px)' }} // Account for header height
        >
          <div
            className="relative w-full h-full flex items-center justify-center cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <motion.img
              src={src}
              alt={alt}
              className={cn(
                "max-w-full max-h-full object-contain select-none transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              onLoad={() => setImageLoaded(true)}
              draggable={false}
            />
            
            {/* Loading indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts help */}
        <div className="absolute bottom-4 left-4 text-gray-500 text-xs">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
            <div>+ / - : Zoom</div>
            <div>R : Rotate</div>
            <div>0 : Reset</div>
            <div>Esc : Close</div>
          </div>
        </div>
        </motion.div>
      </>
    </AnimatePresence>
  )
}