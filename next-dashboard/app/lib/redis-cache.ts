/**
 * Redis Caching Utilities
 * 
 * Comprehensive caching utilities for API responses, rate limiting data,
 * and cache management with TTL support for the finance-factors dashboard.
 */

import { executeRedisCommand, isRedisAvailable } from './redis';
import { StandardDataPoint, ProxyApiResponse } from '../api/types/proxy';

// Cache key prefixes for different data types
export const CACHE_PREFIXES = {
  API_RESPONSE: 'api:response:',
  RATE_LIMIT: 'rate:limit:',
  HEALTH_CHECK: 'health:check:',
  USER_SESSION: 'user:session:',
  CHART_DATA: 'chart:data:',
} as const;

// Default TTL values (in seconds)
export const DEFAULT_TTL = {
  API_RESPONSE: 30 * 60, // 30 minutes
  RATE_LIMIT: 60, // 1 minute
  HEALTH_CHECK: 5 * 60, // 5 minutes
  USER_SESSION: 24 * 60 * 60, // 24 hours
  CHART_DATA: 15 * 60, // 15 minutes
} as const;

// Cache statistics interface
export interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
  keysByPrefix: Record<string, number>;
}

// Cached item interface
export interface CachedItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  source: string;
}

/**
 * Generate cache key with prefix
 */
export function generateCacheKey(prefix: string, identifier: string): string {
  return `${prefix}${identifier}`;
}

/**
 * Set data in Redis cache with TTL
 */
export async function setCacheData<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL.API_RESPONSE,
  source: string = 'unknown'
): Promise<boolean> {
  const cacheItem: CachedItem<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttl * 1000, // Convert to milliseconds for consistency
    source,
  };

  return executeRedisCommand(
    async (client) => {
      await client.setEx(key, ttl, JSON.stringify(cacheItem));
      return true;
    },
    false
  ) ?? false;
}

/**
 * Get data from Redis cache
 */
export async function getCacheData<T>(key: string): Promise<T | null> {
  return executeRedisCommand(
    async (client) => {
      const cached = await client.get(key);
      if (!cached) return null;

      try {
        const cacheItem: CachedItem<T> = JSON.parse(cached);
        
        // Check if cache item has expired (double-check)
        const now = Date.now();
        if (now > cacheItem.timestamp + cacheItem.ttl) {
          // Remove expired item
          await client.del(key);
          return null;
        }

        return cacheItem.data;
      } catch (error) {
        console.error('Error parsing cached data:', error);
        // Remove corrupted cache item
        await client.del(key);
        return null;
      }
    },
    null
  );
}

/**
 * Check if cache key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  return executeRedisCommand(
    async (client) => {
      const exists = await client.exists(key);
      return exists === 1;
    },
    false
  ) ?? false;
}

/**
 * Delete cache key
 */
export async function deleteCacheKey(key: string): Promise<boolean> {
  return executeRedisCommand(
    async (client) => {
      const deleted = await client.del(key);
      return deleted > 0;
    },
    false
  ) ?? false;
}

/**
 * Delete multiple cache keys
 */
export async function deleteCacheKeys(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  return executeRedisCommand(
    async (client) => {
      return await client.del(keys);
    },
    0
  ) ?? 0;
}

/**
 * Get all keys matching a pattern
 */
export async function getCacheKeys(pattern: string = '*'): Promise<string[]> {
  return executeRedisCommand(
    async (client) => {
      return await client.keys(pattern);
    },
    []
  ) ?? [];
}

/**
 * Clear all cache data matching a prefix
 */
export async function clearCacheByPrefix(prefix: string): Promise<number> {
  const pattern = `${prefix}*`;
  const keys = await getCacheKeys(pattern);
  
  if (keys.length === 0) return 0;
  
  return await deleteCacheKeys(keys);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  return executeRedisCommand(
    async (client) => {
      const info = await client.info('memory');
      const allKeys = await client.keys('*');
      
      // Parse memory usage
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';
      
      // Count keys by prefix
      const keysByPrefix: Record<string, number> = {};
      Object.values(CACHE_PREFIXES).forEach(prefix => {
        keysByPrefix[prefix] = allKeys.filter(key => key.startsWith(prefix)).length;
      });
      
      // Calculate hit/miss rates (simplified - would need more sophisticated tracking)
      const hitRate = 0; // Would need to implement hit/miss tracking
      const missRate = 0;
      
      return {
        totalKeys: allKeys.length,
        memoryUsage,
        hitRate,
        missRate,
        keysByPrefix,
      };
    },
    null
  );
}

/**
 * Cache API response data
 */
export async function cacheApiResponse<T>(
  provider: string,
  seriesId: string,
  params: Record<string, string>,
  data: ProxyApiResponse<T>,
  ttl: number = DEFAULT_TTL.API_RESPONSE
): Promise<boolean> {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const cacheKey = generateCacheKey(
    CACHE_PREFIXES.API_RESPONSE,
    `${provider}-${seriesId}-${paramString}`
  );
  
  return await setCacheData(cacheKey, data, ttl, `${provider} API`);
}

/**
 * Get cached API response
 */
export async function getCachedApiResponse<T>(
  provider: string,
  seriesId: string,
  params: Record<string, string>
): Promise<ProxyApiResponse<T> | null> {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const cacheKey = generateCacheKey(
    CACHE_PREFIXES.API_RESPONSE,
    `${provider}-${seriesId}-${paramString}`
  );
  
  return await getCacheData<ProxyApiResponse<T>>(cacheKey);
}

/**
 * Cache chart data
 */
export async function cacheChartData(
  chartType: string,
  dataSource: string,
  data: StandardDataPoint[],
  ttl: number = DEFAULT_TTL.CHART_DATA
): Promise<boolean> {
  const cacheKey = generateCacheKey(
    CACHE_PREFIXES.CHART_DATA,
    `${chartType}-${dataSource}`
  );
  
  return await setCacheData(cacheKey, data, ttl, 'Chart Data');
}

/**
 * Get cached chart data
 */
export async function getCachedChartData(
  chartType: string,
  dataSource: string
): Promise<StandardDataPoint[] | null> {
  const cacheKey = generateCacheKey(
    CACHE_PREFIXES.CHART_DATA,
    `${chartType}-${dataSource}`
  );
  
  return await getCacheData<StandardDataPoint[]>(cacheKey);
}

/**
 * Batch cache operations
 */
export async function batchCacheOperations<T>(
  operations: Array<{
    key: string;
    data: T;
    ttl?: number;
    source?: string;
  }>
): Promise<boolean[]> {
  const results = await Promise.allSettled(
    operations.map(op => 
      setCacheData(op.key, op.data, op.ttl, op.source)
    )
  );
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : false
  );
}

/**
 * Cache warming utility - preload frequently accessed data
 */
export async function warmCache(
  warmingFunctions: Array<() => Promise<void>>
): Promise<void> {
  console.log('Starting cache warming...');
  
  const results = await Promise.allSettled(warmingFunctions.map(fn => fn()));
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Cache warming completed: ${successful} successful, ${failed} failed`);
}

/**
 * Health check for Redis cache
 */
export async function cacheHealthCheck(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const available = await isRedisAvailable();
    const latency = Date.now() - startTime;
    
    return {
      available,
      latency,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
