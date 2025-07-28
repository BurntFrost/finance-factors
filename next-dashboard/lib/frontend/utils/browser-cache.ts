/**
 * Browser-side Caching Utilities
 * 
 * Advanced client-side caching with:
 * - IndexedDB for large data
 * - localStorage for small data
 * - sessionStorage for temporary data
 * - Memory cache for immediate access
 * - Cache invalidation strategies
 * - Storage quota management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
  tags?: string[];
  compress?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export class BrowserCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private dbName = 'FinanceFactorsCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private maxMemorySize = 50 * 1024 * 1024; // 50MB
  private currentMemorySize = 0;

  constructor() {
    this.initializeIndexedDB();
    this.setupStorageQuotaMonitoring();
    this.setupPeriodicCleanup();
  }

  /**
   * Initialize IndexedDB for large data storage
   */
  private async initializeIndexedDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('tags', 'tags', { multiEntry: true });
        }
      };
    });
  }

  /**
   * Set data in cache with intelligent storage selection
   */
  async set<T>(key: string, data: T, config: CacheConfig = {}): Promise<void> {
    const {
      ttl = 15 * 60 * 1000, // 15 minutes default
      storage = 'memory',
      tags = [],
      compress: _compress = false,
      priority = 'normal',
    } = config;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      size: this.calculateSize(data),
      tags,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Choose storage based on size and configuration
    const selectedStorage = this.selectOptimalStorage(entry.size, storage, priority);

    switch (selectedStorage) {
      case 'memory':
        await this.setMemoryCache(key, entry);
        break;
      case 'localStorage':
        await this.setLocalStorage(key, entry);
        break;
      case 'sessionStorage':
        await this.setSessionStorage(key, entry);
        break;
      case 'indexedDB':
        await this.setIndexedDB(key, entry);
        break;
    }
  }

  /**
   * Get data from cache with fallback strategy
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isEntryValid(memoryEntry)) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.data;
    }

    // Try localStorage
    const localEntry = await this.getLocalStorage<T>(key);
    if (localEntry && this.isEntryValid(localEntry)) {
      // Promote to memory cache if frequently accessed
      if (localEntry.accessCount > 5) {
        await this.setMemoryCache(key, localEntry);
      }
      return localEntry.data;
    }

    // Try sessionStorage
    const sessionEntry = await this.getSessionStorage<T>(key);
    if (sessionEntry && this.isEntryValid(sessionEntry)) {
      return sessionEntry.data;
    }

    // Try IndexedDB
    const dbEntry = await this.getIndexedDB<T>(key);
    if (dbEntry && this.isEntryValid(dbEntry)) {
      // Promote to memory cache for large, frequently accessed data
      if (dbEntry.accessCount > 3 && dbEntry.size < 1024 * 1024) {
        await this.setMemoryCache(key, dbEntry);
      }
      return dbEntry.data;
    }

    return null;
  }

  /**
   * Invalidate cache by key or tags
   */
  async invalidate(keyOrTags: string | string[]): Promise<void> {
    const keys = Array.isArray(keyOrTags) ? keyOrTags : [keyOrTags];

    for (const key of keys) {
      if (key.startsWith('tag:')) {
        const tag = key.substring(4);
        await this.invalidateByTag(tag);
      } else {
        await this.invalidateKey(key);
      }
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    // Clear sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('cache:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }

    // Clear IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryEntries = Array.from(this.memoryCache.values());
    const totalMemorySize = memoryEntries.reduce((sum, entry) => sum + entry.size, 0);
    const validEntries = memoryEntries.filter(entry => this.isEntryValid(entry));

    return {
      memory: {
        totalEntries: this.memoryCache.size,
        validEntries: validEntries.length,
        totalSize: totalMemorySize,
        maxSize: this.maxMemorySize,
        utilizationPercent: (totalMemorySize / this.maxMemorySize) * 100,
      },
      hitRate: this.calculateHitRate(),
      oldestEntry: Math.min(...memoryEntries.map(e => e.timestamp)),
      newestEntry: Math.max(...memoryEntries.map(e => e.timestamp)),
    };
  }

  // Private methods

  private selectOptimalStorage(
    size: number,
    preferredStorage: string,
    priority: string
  ): 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB' {
    // Large data goes to IndexedDB
    if (size > 5 * 1024 * 1024) { // 5MB
      return 'indexedDB';
    }

    // High priority data goes to memory if possible
    if (priority === 'high' && this.currentMemorySize + size < this.maxMemorySize) {
      return 'memory';
    }

    // Medium data goes to localStorage
    if (size > 100 * 1024 && size < 5 * 1024 * 1024) { // 100KB - 5MB
      return 'localStorage';
    }

    // Respect preferred storage if reasonable
    if (preferredStorage === 'sessionStorage' || preferredStorage === 'localStorage') {
      return preferredStorage as any;
    }

    return 'memory';
  }

  private async setMemoryCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Evict old entries if necessary
    while (this.currentMemorySize + entry.size > this.maxMemorySize) {
      await this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(key, entry);
    this.currentMemorySize += entry.size;
  }

  private async setLocalStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (_error) {
      console.warn('localStorage quota exceeded, clearing old entries');
      await this.clearOldLocalStorageEntries();
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to store in localStorage after cleanup:', retryError);
      }
    }
  }

  private async setSessionStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    try {
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (_error) {
      console.warn('sessionStorage quota exceeded');
    }
  }

  private async setIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put({ key, ...entry });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getLocalStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    try {
      const item = localStorage.getItem(`cache:${key}`);
      return item ? JSON.parse(item) : null;
    } catch (_error) {
      return null;
    }
  }

  private async getSessionStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;

    try {
      const item = sessionStorage.getItem(`cache:${key}`);
      return item ? JSON.parse(item) : null;
    } catch (_error) {
      return null;
    }
  }

  private async getIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise<CacheEntry<T> | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? { ...result } : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private isEntryValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey);
      if (entry) {
        this.currentMemorySize -= entry.size;
        this.memoryCache.delete(oldestKey);
      }
    }
  }

  private async invalidateKey(key: string): Promise<void> {
    // Remove from all storage types
    this.memoryCache.delete(key);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`cache:${key}`);
      sessionStorage.removeItem(`cache:${key}`);
    }

    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.delete(key);
    }
  }

  private async invalidateByTag(tag: string): Promise<void> {
    // Memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(tag)) {
        this.memoryCache.delete(key);
      }
    }

    // IndexedDB
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('tags');
      const request = index.openCursor(IDBKeyRange.only(tag));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }
  }

  private calculateHitRate(): number {
    // This would need to be tracked over time
    return 0; // Placeholder
  }

  private setupStorageQuotaMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      setInterval(async () => {
        try {
          const estimate = await navigator.storage.estimate();
          const usagePercent = estimate.usage && estimate.quota ? 
            (estimate.usage / estimate.quota) * 100 : 0;
          
          if (usagePercent > 80) {
            console.warn('Storage quota usage high:', usagePercent.toFixed(2) + '%');
            await this.clearOldLocalStorageEntries();
          }
        } catch (error) {
          console.warn('Failed to check storage quota:', error);
        }
      }, 60000); // Check every minute
    }
  }

  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanupExpiredEntries(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.currentMemorySize -= entry.size;
        this.memoryCache.delete(key);
      }
    }
  }

  private async clearOldLocalStorageEntries(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const entries: Array<{ key: string; timestamp: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            entries.push({ key, timestamp: parsed.timestamp });
          }
        } catch (_error) {
          // Remove invalid entries
          localStorage.removeItem(key);
        }
      }
    }

    // Remove oldest 25% of entries
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.25));
    toRemove.forEach(entry => localStorage.removeItem(entry.key));
  }
}

// Global instance
export const browserCache = new BrowserCache();

// Convenience functions
export const getCached = <T>(key: string) => browserCache.get<T>(key);
export const setCached = <T>(key: string, data: T, config?: CacheConfig) => 
  browserCache.set<T>(key, data, config);
export const invalidateCache = (keyOrTags: string | string[]) => 
  browserCache.invalidate(keyOrTags);
export const clearCache = () => browserCache.clear();

export default browserCache;
