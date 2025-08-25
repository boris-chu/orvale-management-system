/**
 * useMediaQuery hook - Mobile-first responsive design utility
 * Provides responsive breakpoint detection for mobile-first chat interface
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect media query matches
 * Useful for responsive design and mobile-first approach
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isDesktop = useMediaQuery('(min-width: 1025px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Create listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener with modern API
    try {
      media.addEventListener('change', listener);
    } catch (error) {
      // Fallback for older browsers
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      try {
        media.removeEventListener('change', listener);
      } catch (error) {
        // Fallback for older browsers
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Preset responsive breakpoint hooks
 * Based on mobile-first design strategy
 */

export const useIsMobile = (): boolean => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)');
export const useIsLargeDesktop = () => useMediaQuery('(min-width: 1440px)');

/**
 * Touch device detection
 */
export const useIsTouchDevice = () => useMediaQuery('(pointer: coarse)');

/**
 * Reduced motion preference
 */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/**
 * Dark mode preference
 */
export const usePrefersDark = () => useMediaQuery('(prefers-color-scheme: dark)');