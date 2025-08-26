/**
 * ImageLightbox - Full-screen image viewer with zoom and navigation
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Download, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  imageSize?: number;
  position?: 'right' | 'center' | 'fullscreen';
}

export function ImageLightbox({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imageName, 
  imageSize,
  position = 'right' 
}: ImageLightboxProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(position === 'fullscreen');
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image with auth
  useEffect(() => {
    if (!isOpen) return;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
        if (!token) {
          setError(true);
          return;
        }

        const response = await fetch(imageUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          setError(true);
          return;
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
      } catch (err) {
        console.error('Error loading lightbox image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageUrl, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  // Download image
  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
      if (!token) return;

      const response = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = imageName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };

  const containerClasses = cn(
    "fixed z-50",
    position === 'right' && !isFullscreen && "top-0 right-0 w-1/2 h-full",
    position === 'center' && !isFullscreen && "inset-0",
    (position === 'fullscreen' || isFullscreen) && "inset-0"
  );

  const backdropClasses = cn(
    "absolute inset-0 bg-black",
    position === 'right' && !isFullscreen && "bg-opacity-50",
    (position === 'center' || position === 'fullscreen' || isFullscreen) && "bg-opacity-90"
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={containerClasses}
        >
          {/* Backdrop */}
          <div 
            className={backdropClasses}
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            initial={{ x: position === 'right' && !isFullscreen ? '100%' : 0, scale: 0.9 }}
            animate={{ x: 0, scale: 1 }}
            exit={{ x: position === 'right' && !isFullscreen ? '100%' : 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative h-full flex flex-col"
            style={{ backgroundColor: 'var(--chat-background, #ffffff)' }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ 
                borderColor: 'var(--chat-border, #e0e0e0)',
                backgroundColor: 'var(--chat-surface, #ffffff)'
              }}
            >
              <div>
                <h3 className="font-medium" style={{ color: 'var(--chat-text-primary, #212121)' }}>
                  {imageName}
                </h3>
                {imageSize && (
                  <p className="text-sm" style={{ color: 'var(--chat-text-secondary, #757575)' }}>
                    {(imageSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div 
                  className="flex items-center gap-1 rounded-lg p-1"
                  style={{ backgroundColor: 'var(--chat-secondary, #f5f5f5)' }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="h-7 w-7 p-0"
                    style={{ color: 'var(--chat-text-primary, #212121)' }}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <button
                    onClick={resetZoom}
                    className="px-2 text-sm transition-colors"
                    style={{ color: 'var(--chat-text-secondary, #757575)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--chat-text-primary, #212121)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--chat-text-secondary, #757575)'}
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="h-7 w-7 p-0"
                    style={{ color: 'var(--chat-text-primary, #212121)' }}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                {/* Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  style={{ color: 'var(--chat-text-secondary, #757575)' }}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 w-8 p-0"
                  title="Download"
                  style={{ color: 'var(--chat-text-secondary, #757575)' }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                  title="Close (Esc)"
                  style={{ color: 'var(--chat-text-secondary, #757575)' }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Image container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {loading && (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              )}
              
              {error && (
                <div className="text-center">
                  <p style={{ color: 'var(--chat-text-secondary, #757575)' }}>Failed to load image</p>
                </div>
              )}
              
              {!loading && !error && imageSrc && (
                <img
                  src={imageSrc}
                  alt={imageName}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoom})`,
                    cursor: zoom > 1 ? 'move' : 'default'
                  }}
                  draggable={zoom > 1}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}