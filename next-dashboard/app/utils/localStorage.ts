/**
 * Local Storage Utilities
 * 
 * This module provides utilities for persisting data source preferences and cache data
 * in localStorage with graceful fallbacks when localStorage is unavailable.
 */

import { DataSourceType, STORAGE_KEYS, CACHE_TTL } from '../types/dataSource';

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Generic localStorage wrapper with error handling
function safeLocalStorageOperation<T>(
  operation: () => T,
  fallback: T
): T {
  try {
    if (!isLocalStorageAvailable()) return fallback;
    return operation();
  } catch (error) {
    console.warn('localStorage operation failed:', error);
    return fallback;
  }
}

// Data source preference persistence
export const dataSourcePreference = {
  /**
   * Save the user's preferred data source
   */
  save: (source: DataSourceType): void => {
    safeLocalStorageOperation(
      () => localStorage.setItem(STORAGE_KEYS.DATA_SOURCE_PREFERENCE, source),
      undefined
    );
  },

  /**
   * Load the user's preferred data source
   */
  load: (): DataSourceType => {
    return safeLocalStorageOperation(
      () => {
        const saved = localStorage.getItem(STORAGE_KEYS.DATA_SOURCE_PREFERENCE);
        return (saved === 'historical' || saved === 'live-api') ? saved : 'historical';
      },
      'historical'
    );
  },

  /**
   * Clear the saved preference
   */
  clear: (): void => {
    safeLocalStorageOperation(
      () => localStorage.removeItem(STORAGE_KEYS.DATA_SOURCE_PREFERENCE),
      undefined
    );
  },
};

// Cache data structure
interface CacheItem {
  data: unknown;
  timestamp: number;
  expiresAt: number;
  source: DataSourceType;
}

interface CacheData {
  [key: string]: CacheItem;
}

// API cache persistence
export const apiCache = {
  /**
   * Save data to cache with TTL
   */
  set: (
    key: string,
    data: unknown,
    source: DataSourceType,
    ttl: number = CACHE_TTL.LIVE_DATA
  ): void => {
    const now = Date.now();
    const cacheItem: CacheItem = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      source,
    };

    safeLocalStorageOperation(() => {
      const existingCache = apiCache.getAll();
      existingCache[key] = cacheItem;
      localStorage.setItem(STORAGE_KEYS.API_CACHE, JSON.stringify(existingCache));
    }, undefined);
  },

  /**
   * Get data from cache if not expired
   */
  get: (key: string): unknown | null => {
    return safeLocalStorageOperation(() => {
      const cache = apiCache.getAll();
      const item = cache[key];
      
      if (!item) return null;
      
      const now = Date.now();
      if (now > item.expiresAt) {
        // Item expired, remove it
        apiCache.remove(key);
        return null;
      }
      
      return item.data;
    }, null);
  },

  /**
   * Check if cache item exists and is valid
   */
  has: (key: string): boolean => {
    return apiCache.get(key) !== null;
  },

  /**
   * Remove specific cache item
   */
  remove: (key: string): void => {
    safeLocalStorageOperation(() => {
      const cache = apiCache.getAll();
      delete cache[key];
      localStorage.setItem(STORAGE_KEYS.API_CACHE, JSON.stringify(cache));
    }, undefined);
  },

  /**
   * Get all cache data
   */
  getAll: (): CacheData => {
    return safeLocalStorageOperation(() => {
      const cached = localStorage.getItem(STORAGE_KEYS.API_CACHE);
      return cached ? JSON.parse(cached) : {};
    }, {});
  },

  /**
   * Clear all cache data
   */
  clear: (): void => {
    safeLocalStorageOperation(
      () => localStorage.removeItem(STORAGE_KEYS.API_CACHE),
      undefined
    );
  },

  /**
   * Clean expired cache items
   */
  cleanup: (): void => {
    safeLocalStorageOperation(() => {
      const cache = apiCache.getAll();
      const now = Date.now();
      let hasChanges = false;

      Object.keys(cache).forEach(key => {
        if (now > cache[key].expiresAt) {
          delete cache[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEYS.API_CACHE, JSON.stringify(cache));
      }
    }, undefined);
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    return safeLocalStorageOperation(() => {
      const cache = apiCache.getAll();
      const now = Date.now();
      const items = Object.values(cache);
      
      return {
        totalItems: items.length,
        validItems: items.filter(item => now <= item.expiresAt).length,
        expiredItems: items.filter(item => now > item.expiresAt).length,
        sizeEstimate: JSON.stringify(cache).length,
        oldestItem: items.length > 0 ? Math.min(...items.map(item => item.timestamp)) : null,
        newestItem: items.length > 0 ? Math.max(...items.map(item => item.timestamp)) : null,
      };
    }, {
      totalItems: 0,
      validItems: 0,
      expiredItems: 0,
      sizeEstimate: 0,
      oldestItem: null,
      newestItem: null,
    });
  },
};

// User preferences (for future extensibility)
interface UserPreferences {
  dataSource: DataSourceType;
  autoRefresh: boolean;
  refreshInterval: number;
  theme?: 'light' | 'dark' | 'auto';
  notifications: boolean;
}

export const userPreferences = {
  /**
   * Save user preferences
   */
  save: (preferences: Partial<UserPreferences>): void => {
    safeLocalStorageOperation(() => {
      const existing = userPreferences.load();
      const updated = { ...existing, ...preferences };
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
    }, undefined);
  },

  /**
   * Load user preferences with defaults
   */
  load: (): UserPreferences => {
    return safeLocalStorageOperation(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      const defaults: UserPreferences = {
        dataSource: 'historical',
        autoRefresh: false,
        refreshInterval: 300000, // 5 minutes
        notifications: true,
      };

      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }, {
      dataSource: 'historical',
      autoRefresh: false,
      refreshInterval: 300000,
      notifications: true,
    });
  },

  /**
   * Clear user preferences
   */
  clear: (): void => {
    safeLocalStorageOperation(
      () => localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES),
      undefined
    );
  },
};

// Utility to clear all app data
export const clearAllData = (): void => {
  dataSourcePreference.clear();
  apiCache.clear();
  userPreferences.clear();
};

// Initialize cleanup on app start (call this in your app initialization)
export const initializeStorage = (): void => {
  // Clean expired cache items on startup
  apiCache.cleanup();
  
  // Set up periodic cleanup (every 10 minutes)
  if (typeof window !== 'undefined') {
    setInterval(() => {
      apiCache.cleanup();
    }, 10 * 60 * 1000);
  }
};
