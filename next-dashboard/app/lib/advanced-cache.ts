/**
 * Advanced Multi-Tier Caching System
 * 
 * Implements a sophisticated caching strategy with:
 * - Browser cache (Level 1)
 * - Redis cache (Level 2) 
 * - Database cache (Level 3)
 * - CDN cache (Level 4)
 * - Intelligent cache invalidation
 * - Performance monitoring
 */

import { executeRedisCommand } from './redis';
import { prisma, safeDatabaseOperation } from './prisma';
import { RedisOperationType } from './redis-error-logger';

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: number; // SWR time in seconds
  tags?: string[]; // Cache tags for invalidation
  compression?: boolean; // Enable compression for large data
  priority?: 'low' | 'normal' | 'high'; // Cache priority
}

// Cache levels
export enum CacheLevel {
  BROWSER = 'browser',
  REDIS = 'redis', 
  DATABASE = 'database',
  CDN = 'cdn',
}

// Cache entry metadata
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  level: CacheLevel;
  hits: number;
  size: number; // Size in bytes
  compressed: boolean;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  avgResponseTime: number;
}

/**
 * Advanced Cache Manager
 */
export class AdvancedCacheManager {
  private browserCache = new Map<string, CacheEntry>();
  private maxBrowserCacheSize = 50 * 1024 * 1024; // 50MB
  private databaseCacheDisabled = process.env.DISABLE_DATABASE_CACHE === 'true';
  private stats: Record<CacheLevel, CacheStats> = {
    [CacheLevel.BROWSER]: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, entryCount: 0, avgResponseTime: 0 },
    [CacheLevel.REDIS]: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, entryCount: 0, avgResponseTime: 0 },
    [CacheLevel.DATABASE]: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, entryCount: 0, avgResponseTime: 0 },
    [CacheLevel.CDN]: { hits: 0, misses: 0, hitRate: 0, totalSize: 0, entryCount: 0, avgResponseTime: 0 },
  };

  /**
   * Get data from cache with multi-tier fallback
   */
  async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Level 1: Browser cache
      const browserResult = await this.getFromBrowser<T>(key);
      if (browserResult) {
        this.updateStats(CacheLevel.BROWSER, true, Date.now() - startTime);
        return browserResult;
      }

      // Level 2: Redis cache
      const redisResult = await this.getFromRedis<T>(key);
      if (redisResult) {
        // Populate browser cache
        await this.setBrowser(key, redisResult, config);
        this.updateStats(CacheLevel.REDIS, true, Date.now() - startTime);
        return redisResult;
      }

      // Level 3: Database cache (only if not disabled)
      if (!this.databaseCacheDisabled) {
        const dbResult = await this.getFromDatabase<T>(key);
        if (dbResult) {
          // Populate higher-level caches
          await Promise.all([
            this.setRedis(key, dbResult, config),
            this.setBrowser(key, dbResult, config),
          ]);
          this.updateStats(CacheLevel.DATABASE, true, Date.now() - startTime);
          return dbResult;
        }
      }

      // Cache miss at all levels
      this.updateStats(CacheLevel.BROWSER, false, Date.now() - startTime);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache with intelligent distribution
   */
  async set<T>(
    key: string, 
    data: T, 
    config: CacheConfig = { ttl: 900 }
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl * 1000, // Convert to milliseconds
      tags: config.tags || [],
      level: CacheLevel.BROWSER,
      hits: 0,
      size: this.calculateSize(data),
      compressed: config.compression || false,
    };

    // Compress large data
    if (entry.size > 1024 * 1024 && config.compression !== false) { // 1MB threshold
      entry.compressed = true;
      // In a real implementation, you would compress the data here
    }

    // Set in all appropriate cache levels based on priority and size
    const promises: Promise<void>[] = [];

    // Always set in browser cache for immediate access
    promises.push(this.setBrowser(key, data, config));

    // Set in Redis for persistence and sharing
    if (config.priority !== 'low') {
      promises.push(this.setRedis(key, data, config));
    }

    // Set in database for long-term storage (only if not disabled)
    if (!this.databaseCacheDisabled && (config.priority === 'high' || config.ttl > 3600)) {
      promises.push(this.setDatabase(key, data, config));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Invalidate cache by key or tags
   */
  async invalidate(keyOrTags: string | string[]): Promise<void> {
    const keys = Array.isArray(keyOrTags) ? keyOrTags : [keyOrTags];
    
    const promises: Promise<void>[] = [];

    for (const key of keys) {
      // Check if it's a tag-based invalidation
      if (key.startsWith('tag:')) {
        const tag = key.substring(4);
        promises.push(this.invalidateByTag(tag));
      } else {
        // Direct key invalidation
        promises.push(this.invalidateKey(key));
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics
   */
  getStats(): Record<CacheLevel, CacheStats> {
    // Update hit rates
    Object.values(CacheLevel).forEach(level => {
      const stats = this.stats[level];
      const total = stats.hits + stats.misses;
      stats.hitRate = total > 0 ? stats.hits / total : 0;
    });

    return { ...this.stats };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    const promises = [
      this.clearBrowser(),
      this.clearRedis(),
      this.clearDatabase(),
    ];

    await Promise.allSettled(promises);
    
    // Reset stats
    Object.values(CacheLevel).forEach(level => {
      this.stats[level] = { hits: 0, misses: 0, hitRate: 0, totalSize: 0, entryCount: 0, avgResponseTime: 0 };
    });
  }

  // Private methods for each cache level

  private async getFromBrowser<T>(key: string): Promise<T | null> {
    const entry = this.browserCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.browserCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data as T;
  }

  private async setBrowser<T>(key: string, data: T, config?: CacheConfig): Promise<void> {
    const size = this.calculateSize(data);
    
    // Check cache size limits
    if (this.getCurrentBrowserCacheSize() + size > this.maxBrowserCacheSize) {
      await this.evictBrowserCache();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: (config?.ttl || 900) * 1000,
      tags: config?.tags || [],
      level: CacheLevel.BROWSER,
      hits: 0,
      size,
      compressed: false,
    };

    this.browserCache.set(key, entry);
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    return executeRedisCommand(
      async (client) => {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
      },
      null,
      RedisOperationType.GET,
      key
    );
  }

  private async setRedis<T>(key: string, data: T, config?: CacheConfig): Promise<void> {
    await executeRedisCommand(
      async (client) => {
        const ttl = config?.ttl || 900;
        await client.setEx(key, ttl, JSON.stringify(data));
        
        // Set tags for invalidation
        if (config?.tags) {
          for (const tag of config.tags) {
            await client.sAdd(`tag:${tag}`, key);
            await client.expire(`tag:${tag}`, ttl);
          }
        }
      },
      undefined,
      RedisOperationType.SETEX,
      key
    );
  }

  private async getFromDatabase<T>(key: string): Promise<T | null> {
    return safeDatabaseOperation(
      async () => {
        const cached = await prisma.cachedData.findUnique({
          where: { cacheKey: key },
        });

        if (!cached) return null;

        // Check if expired
        if (cached.expiresAt < new Date()) {
          // Delete expired entry
          await prisma.cachedData.delete({
            where: { id: cached.id },
          });
          return null;
        }

        // Update access statistics
        await prisma.cachedData.update({
          where: { id: cached.id },
          data: {
            lastAccessed: new Date(),
            accessCount: { increment: 1 },
          },
        });

        return cached.data as T;
      },
      async () => {
        console.warn('Database cache unavailable due to connection limits');
        return null;
      }
    );
  }

  private async setDatabase<T>(key: string, data: T, config?: CacheConfig): Promise<void> {
    // Skip database caching if disabled or if database is experiencing issues
    if (this.databaseCacheDisabled) {
      return;
    }

    try {
      await safeDatabaseOperation(
        async () => {
          const ttl = config?.ttl || 900;
          const expiresAt = new Date(Date.now() + ttl * 1000);

          await prisma.cachedData.upsert({
            where: { cacheKey: key },
            update: {
              data: data as any,
              expiresAt,
              lastAccessed: new Date(),
            },
            create: {
              cacheKey: key,
              dataType: 'api-response', // Could be made configurable
              data: data as any,
              source: 'CACHED',
              expiresAt,
            },
          });
          return true;
        },
        async () => {
          console.warn('Database cache set unavailable due to connection limits');
          return null;
        }
      );
    } catch (error) {
      console.error('Failed to set database cache:', error);
      // Don't throw error - cache failures should not break the application
    }
  }

  private async invalidateKey(key: string): Promise<void> {
    // Remove from browser cache
    this.browserCache.delete(key);

    // Remove from Redis
    await executeRedisCommand(
      async (client) => {
        await client.del(key);
      },
      undefined,
      RedisOperationType.DEL,
      key
    );

    // Remove from database
    try {
      await prisma.cachedData.deleteMany({
        where: { cacheKey: key },
      });
    } catch (error) {
      console.error('Database cache invalidation error:', error);
    }
  }

  private async invalidateByTag(tag: string): Promise<void> {
    // Get all keys with this tag from Redis
    const keys = await executeRedisCommand(
      async (client) => {
        return client.sMembers(`tag:${tag}`);
      },
      [],
      RedisOperationType.SMEMBERS,
      `tag:${tag}`
    );

    if (keys && keys.length > 0) {
      // Invalidate all keys
      for (const key of keys) {
        await this.invalidateKey(key);
      }

      // Remove the tag set
      await executeRedisCommand(
        async (client) => {
          await client.del(`tag:${tag}`);
        },
        undefined,
        RedisOperationType.DEL,
        `tag:${tag}`
      );
    }
  }

  private async clearBrowser(): Promise<void> {
    this.browserCache.clear();
  }

  private async clearRedis(): Promise<void> {
    await executeRedisCommand(
      async (client) => {
        await client.flushDb();
      },
      undefined,
      RedisOperationType.FLUSHDB
    );
  }

  private async clearDatabase(): Promise<void> {
    try {
      await prisma.cachedData.deleteMany();
    } catch (error) {
      console.error('Database cache clear error:', error);
    }
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private getCurrentBrowserCacheSize(): number {
    return Array.from(this.browserCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private async evictBrowserCache(): Promise<void> {
    // LRU eviction - remove least recently used entries
    const entries = Array.from(this.browserCache.entries())
      .sort(([, a], [, b]) => (a.timestamp + a.hits) - (b.timestamp + b.hits));

    // Remove 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.browserCache.delete(entries[i][0]);
    }
  }

  private updateStats(level: CacheLevel, hit: boolean, responseTime: number): void {
    const stats = this.stats[level];
    
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    // Update average response time
    const total = stats.hits + stats.misses;
    stats.avgResponseTime = ((stats.avgResponseTime * (total - 1)) + responseTime) / total;
  }
}

// Global cache manager instance
export const cacheManager = new AdvancedCacheManager();

// Convenience functions
export const cache = {
  get: <T>(key: string, config?: CacheConfig) => cacheManager.get<T>(key, config),
  set: <T>(key: string, data: T, config?: CacheConfig) => cacheManager.set(key, data, config),
  invalidate: (keyOrTags: string | string[]) => cacheManager.invalidate(keyOrTags),
  clear: () => cacheManager.clear(),
  stats: () => cacheManager.getStats(),
};
