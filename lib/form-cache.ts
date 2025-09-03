/**
 * Form Data Caching Service
 * Manages local storage of form data with configurable expiration and auto-renewal
 */

import apiClient from '@/lib/api-client';

interface CachedFormData {
  data: Record<string, any>;
  timestamp: number;
  expiresAt: number;
  version: string;
}

interface FormCacheConfig {
  enabled: boolean;
  durationDays: number;
  keyPrefix: string;
  version: string;
}

class FormDataCache {
  private config: FormCacheConfig;
  private readonly DEFAULT_CONFIG: FormCacheConfig = {
    enabled: true,
    durationDays: 30,
    keyPrefix: 'orvale_form_cache_',
    version: '1.0'
  };

  constructor(config?: Partial<FormCacheConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Update cache configuration from portal settings
   */
  updateConfig(settings: { enable_form_data_caching: boolean; form_cache_duration_days: number }) {
    this.config.enabled = settings.enable_form_data_caching;
    this.config.durationDays = settings.form_cache_duration_days;
  }

  /**
   * Generate cache key for a form
   */
  private getCacheKey(formId: string): string {
    return `${this.config.keyPrefix}${formId}`;
  }

  /**
   * Check if caching is available and enabled
   */
  private isAvailable(): boolean {
    return this.config.enabled && 
           typeof window !== 'undefined' && 
           'localStorage' in window;
  }

  /**
   * Save form data to cache with automatic expiration
   */
  saveFormData(formId: string, formData: Record<string, any>): boolean {
    if (!this.isAvailable()) return false;

    try {
      const now = Date.now();
      const expiresAt = now + (this.config.durationDays * 24 * 60 * 60 * 1000);
      
      const cachedData: CachedFormData = {
        data: formData,
        timestamp: now,
        expiresAt,
        version: this.config.version
      };

      localStorage.setItem(
        this.getCacheKey(formId), 
        JSON.stringify(cachedData)
      );

      console.log(`Form data cached for ${this.config.durationDays} days:`, formId);
      return true;
    } catch (error) {
      console.warn('Failed to save form data to cache:', error);
      return false;
    }
  }

  /**
   * Load form data from cache
   */
  loadFormData(formId: string): Record<string, any> | null {
    if (!this.isAvailable()) return null;

    try {
      const cacheKey = this.getCacheKey(formId);
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) return null;

      const cached: CachedFormData = JSON.parse(cachedItem);
      const now = Date.now();

      // Check if cache has expired
      if (now > cached.expiresAt) {
        this.clearFormData(formId);
        console.log('Form cache expired and cleared:', formId);
        return null;
      }

      // Check version compatibility
      if (cached.version !== this.config.version) {
        this.clearFormData(formId);
        console.log('Form cache version mismatch, cleared:', formId);
        return null;
      }

      // Renew cache expiration (cache renews on each visit)
      cached.expiresAt = now + (this.config.durationDays * 24 * 60 * 60 * 1000);
      localStorage.setItem(cacheKey, JSON.stringify(cached));
      
      console.log('Form data loaded from cache (renewed):', formId);
      return cached.data;
    } catch (error) {
      console.warn('Failed to load form data from cache:', error);
      return null;
    }
  }

  /**
   * Clear specific form data from cache
   */
  clearFormData(formId: string): boolean {
    if (!this.isAvailable()) return false;

    try {
      localStorage.removeItem(this.getCacheKey(formId));
      console.log('Form cache cleared:', formId);
      return true;
    } catch (error) {
      console.warn('Failed to clear form cache:', error);
      return false;
    }
  }

  /**
   * Clear all cached form data
   */
  clearAllFormData(): boolean {
    if (!this.isAvailable()) return false;

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.config.keyPrefix)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keys.length} cached forms`);
      return true;
    } catch (error) {
      console.warn('Failed to clear all form cache:', error);
      return false;
    }
  }

  /**
   * Get cache information for debugging
   */
  getCacheInfo(formId: string): { 
    exists: boolean; 
    age?: number; 
    expiresIn?: number;
    size?: number;
  } | null {
    if (!this.isAvailable()) return null;

    try {
      const cachedItem = localStorage.getItem(this.getCacheKey(formId));
      if (!cachedItem) return { exists: false };

      const cached: CachedFormData = JSON.parse(cachedItem);
      const now = Date.now();
      
      return {
        exists: true,
        age: now - cached.timestamp,
        expiresIn: Math.max(0, cached.expiresAt - now),
        size: new Blob([cachedItem]).size
      };
    } catch (error) {
      console.warn('Failed to get cache info:', error);
      return null;
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpired(): number {
    if (!this.isAvailable()) return 0;

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.config.keyPrefix)
      );
      
      let cleanedCount = 0;
      const now = Date.now();

      keys.forEach(key => {
        try {
          const cachedItem = localStorage.getItem(key);
          if (!cachedItem) return;

          const cached: CachedFormData = JSON.parse(cachedItem);
          if (now > cached.expiresAt) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired/corrupted cache entries`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.warn('Failed to cleanup expired cache:', error);
      return 0;
    }
  }

  /**
   * Auto-save form data while user is typing (debounced)
   */
  autoSaveFormData(
    formId: string, 
    formData: Record<string, any>, 
    debounceMs: number = 2000
  ): void {
    if (!this.isAvailable()) return;

    // Clear existing timer
    const timerId = `${formId}_autosave`;
    const existingTimer = (window as any)[timerId];
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    (window as any)[timerId] = setTimeout(() => {
      this.saveFormData(formId, formData);
    }, debounceMs);
  }
}

// Create singleton instance
export const formCache = new FormDataCache();

// Utility functions for React components
export const useFormCache = () => {
  return {
    saveForm: (formId: string, data: Record<string, any>) => 
      formCache.saveFormData(formId, data),
    
    loadForm: (formId: string) => 
      formCache.loadFormData(formId),
    
    clearForm: (formId: string) => 
      formCache.clearFormData(formId),
    
    autoSave: (formId: string, data: Record<string, any>) => 
      formCache.autoSaveFormData(formId, data),
    
    getCacheInfo: (formId: string) => 
      formCache.getCacheInfo(formId),
    
    updateConfig: (settings: { enable_form_data_caching: boolean; form_cache_duration_days: number }) =>
      formCache.updateConfig(settings)
  };
};

// Export the class for advanced usage
export { FormDataCache };

// Hook to initialize form cache with portal settings
export const useFormCacheWithSettings = () => {
  const cache = useFormCache();
  
  // Load portal settings and update cache config
  const initializeCache = async () => {
    try {
      const result = await apiClient.getDeveloperPortalSettings();
      if (result.success) {
        cache.updateConfig(result.data.user_experience);
      }
    } catch (error) {
      console.warn('Failed to load portal settings for form cache:', error);
    }
  };

  return {
    ...cache,
    initializeCache
  };
};