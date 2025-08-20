import { useEffect, useCallback, useRef } from 'react';
import { useFormCacheWithSettings } from '@/lib/form-cache';

interface UseFormCacheIntegrationProps {
  formId: string;
  formData: Record<string, any>;
  onFormDataUpdate: (data: Record<string, any>) => void;
  autoSaveEnabled?: boolean;
  autoSaveDelay?: number;
}

export const useFormCacheIntegration = ({
  formId,
  formData,
  onFormDataUpdate,
  autoSaveEnabled = false,
  autoSaveDelay = 2000
}: UseFormCacheIntegrationProps) => {
  const cache = useFormCacheWithSettings();
  const isInitialized = useRef(false);
  const hasLoadedFromCache = useRef(false);

  // Initialize cache with portal settings on mount
  useEffect(() => {
    const init = async () => {
      await cache.initializeCache();
      isInitialized.current = true;
      
      // Load cached data if available
      if (!hasLoadedFromCache.current) {
        const cachedData = cache.loadForm(formId);
        if (cachedData) {
          // Only load non-empty values and preserve existing form structure
          const mergedData = { ...formData };
          Object.keys(cachedData).forEach(key => {
            if (cachedData[key] !== undefined && cachedData[key] !== '') {
              mergedData[key] = cachedData[key];
            }
          });
          onFormDataUpdate(mergedData);
          console.log(`🔄 Form data restored from cache for: ${formId}`);
        }
        hasLoadedFromCache.current = true;
      }
    };
    
    init();
  }, [formId]);

  // Save form data to cache whenever it changes
  const saveToCache = useCallback(() => {
    if (!isInitialized.current) return;
    
    // Only save if form has some meaningful data
    const hasData = Object.values(formData).some(value => 
      value !== undefined && value !== ''
    );
    
    if (hasData) {
      cache.saveForm(formId, formData);
    }
  }, [formData, formId, cache]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !isInitialized.current) return;
    
    cache.autoSave(formId, formData);
  }, [formData, formId, autoSaveEnabled, cache]);

  // Manual save to cache
  const manualSave = useCallback(() => {
    saveToCache();
  }, [saveToCache]);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.clearForm(formId);
    console.log(`🗑️ Form cache cleared for: ${formId}`);
  }, [formId, cache]);

  // Get cache information for debugging
  const getCacheInfo = useCallback(() => {
    return cache.getCacheInfo(formId);
  }, [formId, cache]);

  return {
    saveToCache: manualSave,
    clearCache,
    getCacheInfo,
    isInitialized: isInitialized.current
  };
};