/**
 * Enhanced Redis Cache Service for API Data Sources
 * 
 * Centralized caching service for all external API data sources with
 * intelligent TTL management, comprehensive error handling, and monitoring.
 */

import { executeRedisCommand } from './redis';
import { RedisOperationType } from './redis-error-logger';
import { isRedisEnabled } from './feature-toggles';
import { apiCacheMonitor } from './api-cache-monitor';
import crypto from 'crypto';

// Cache key prefix for API data
export const API_CACHE_PREFIX = 'api:cache:';

// TTL configuration for different data sources (in seconds)
export const API_CACHE_TTL_CONFIG = {
  FRED: {
    // Economic indicators - update frequencies vary
    'house-prices': 24 * 60 * 60, // 24 hours (monthly data)
    'interest-rates': 1 * 60 * 60, // 1 hour (daily updates)
    'unemployment': 24 * 60 * 60, // 24 hours (monthly data)
    'inflation': 12 * 60 * 60, // 12 hours (monthly data, high interest)
    'gdp': 48 * 60 * 60, // 48 hours (quarterly data)
    'fed-balance-sheet': 6 * 60 * 60, // 6 hours (weekly updates)
    'default': 24 * 60 * 60, // 24 hours default
  },
  BLS: {
    // Labor statistics - mostly monthly updates
    'salary-income': 24 * 60 * 60, // 24 hours (monthly data)
    'cost-of-living': 12 * 60 * 60, // 12 hours (monthly CPI data)
    'employment': 24 * 60 * 60, // 24 hours (monthly data)
    'default': 24 * 60 * 60, // 24 hours default
  },
  CENSUS: {
    // Census data - updated less frequently
    'tuition-education': 48 * 60 * 60, // 48 hours (annual data)
    'medical-costs': 48 * 60 * 60, // 48 hours (annual data)
    'housing-costs': 24 * 60 * 60, // 24 hours (more dynamic)
    'utilities-costs': 24 * 60 * 60, // 24 hours (more dynamic)
    'default': 48 * 60 * 60, // 48 hours default
  },
  ALPHA_VANTAGE: {
    // Financial data - more frequent updates
    'investment-returns': 15 * 60, // 15 minutes (stock data)
    'stock-prices': 5 * 60, // 5 minutes (real-time quotes)
    'forex': 10 * 60, // 10 minutes (forex rates)
    'crypto': 5 * 60, // 5 minutes (crypto prices)
    'default': 15 * 60, // 15 minutes default
  },
  WORLD_BANK: {
    // International economic data
    'economic-indicators': 24 * 60 * 60, // 24 hours
    'development-data': 48 * 60 * 60, // 48 hours
    'default': 24 * 60 * 60, // 24 hours default
  },
  OECD: {
    // OECD economic data
    'economic-indicators': 24 * 60 * 60, // 24 hours
    'trade-data': 12 * 60 * 60, // 12 hours
    'default': 24 * 60 * 60, // 24 hours default
  },
} as const;

// Cache statistics interface
export interface ApiCacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  providerStats: Record<string, {
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

// Cache operation result
export interface CacheOperationResult<T> {
  data: T | null;
  fromCache: boolean;
  duration: number;
  cacheKey?: string;
}

/**
 * Enhanced API Cache Service Class
 */
export class ApiCacheService {
  private stats: Map<string, { hits: number; misses: number }> = new Map();

  /**
   * Generate standardized cache key for API data
   */
  generateCacheKey(provider: string, dataType: string, params: Record<string, any> = {}): string {
    // Create a deterministic hash of parameters
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    
    const paramHash = crypto
      .createHash('md5')
      .update(paramString)
      .digest('hex')
      .substring(0, 8);

    return `${API_CACHE_PREFIX}${provider.toLowerCase()}:${dataType}:${paramHash}`;
  }

  /**
   * Get TTL for specific provider and data type
   */
  getTTLForDataType(provider: string, dataType: string): number {
    const providerConfig = API_CACHE_TTL_CONFIG[provider as keyof typeof API_CACHE_TTL_CONFIG];
    if (!providerConfig) {
      return 24 * 60 * 60; // Default 24 hours
    }

    return providerConfig[dataType as keyof typeof providerConfig] || providerConfig.default;
  }

  /**
   * Get cached API data with comprehensive error handling
   */
  async getCachedApiData<T>(cacheKey: string): Promise<T | null> {
    // Skip Redis operations when disabled
    if (!isRedisEnabled()) {
      return null;
    }

    const startTime = Date.now();

    try {
      const result = await executeRedisCommand(
        async (client) => {
          const cached = await client.get(cacheKey);
          if (!cached) return null;

          try {
            const parsedData = JSON.parse(cached);
            return parsedData;
          } catch (parseError) {
            console.error(`Failed to parse cached data for key ${cacheKey}:`, parseError);
            // Remove corrupted cache entry
            await client.del(cacheKey);
            return null;
          }
        },
        null,
        RedisOperationType.GET,
        cacheKey
      );

      const duration = Date.now() - startTime;
      const provider = this.extractProviderFromKey(cacheKey);
      const dataType = this.extractDataTypeFromKey(cacheKey);

      if (result !== null) {
        this.logCacheHit(cacheKey, duration);
        apiCacheMonitor.logOperation(provider, dataType, 'hit', duration, cacheKey);
      } else {
        apiCacheMonitor.logOperation(provider, dataType, 'miss', duration, cacheKey);
      }

      return result;
    } catch (error) {
      console.error(`Cache get operation failed for key ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Set cached API data with TTL
   */
  async setCachedApiData<T>(
    cacheKey: string,
    data: T,
    customTTL?: number
  ): Promise<boolean> {
    // Skip Redis operations when disabled
    if (!isRedisEnabled()) {
      return false;
    }

    const startTime = Date.now();

    try {
      // Extract provider and dataType from cache key for TTL determination
      const keyParts = cacheKey.replace(API_CACHE_PREFIX, '').split(':');
      const provider = keyParts[0]?.toUpperCase() || 'UNKNOWN';
      const dataType = keyParts[1] || 'default';

      const ttl = customTTL || this.getTTLForDataType(provider, dataType);

      const result = await executeRedisCommand(
        async (client) => {
          await client.setEx(cacheKey, ttl, JSON.stringify(data));
          return true;
        },
        false,
        RedisOperationType.SETEX,
        cacheKey
      );

      const duration = Date.now() - startTime;
      // provider and dataType already extracted above

      if (result) {
        console.log(`[CACHE SET] ${cacheKey} - TTL: ${ttl}s, Duration: ${duration}ms`);
        apiCacheMonitor.logOperation(provider, dataType, 'set', duration, cacheKey);
      } else {
        apiCacheMonitor.logOperation(provider, dataType, 'error', duration, cacheKey, 'Failed to set cache');
      }

      return result ?? false;
    } catch (error) {
      console.error(`Cache set operation failed for key ${cacheKey}:`, error);
      return false;
    }
  }

  /**
   * Execute API call with caching
   */
  async executeWithCache<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    customTTL?: number
  ): Promise<CacheOperationResult<T>> {
    const startTime = Date.now();

    // Try to get from cache first
    const cachedData = await this.getCachedApiData<T>(cacheKey);
    if (cachedData !== null) {
      return {
        data: cachedData,
        fromCache: true,
        duration: Date.now() - startTime,
        cacheKey,
      };
    }

    // Cache miss - execute API call
    this.logCacheMiss(cacheKey, Date.now() - startTime);
    
    try {
      const apiData = await apiCall();

      // Store in cache
      await this.setCachedApiData(cacheKey, apiData, customTTL);

      return {
        data: apiData,
        fromCache: false,
        duration: Date.now() - startTime,
        cacheKey,
      };
    } catch (error) {
      console.error(`API call failed for cache key ${cacheKey}:`, error);
      throw error;
    }
  }

  /**
   * Log cache hit
   */
  private logCacheHit(cacheKey: string, duration: number): void {
    const provider = this.extractProviderFromKey(cacheKey);
    console.log(`[CACHE HIT] ${provider} - ${cacheKey} - ${duration}ms`);
    
    this.updateStats(provider, true);
  }

  /**
   * Log cache miss
   */
  private logCacheMiss(cacheKey: string, duration: number): void {
    const provider = this.extractProviderFromKey(cacheKey);
    console.log(`[CACHE MISS] ${provider} - ${cacheKey} - ${duration}ms`);
    
    this.updateStats(provider, false);
  }

  /**
   * Extract provider from cache key
   */
  private extractProviderFromKey(cacheKey: string): string {
    const keyParts = cacheKey.replace(API_CACHE_PREFIX, '').split(':');
    return keyParts[0]?.toUpperCase() || 'UNKNOWN';
  }

  /**
   * Extract data type from cache key
   */
  private extractDataTypeFromKey(cacheKey: string): string {
    const keyParts = cacheKey.replace(API_CACHE_PREFIX, '').split(':');
    return keyParts[1] || 'unknown';
  }

  /**
   * Update cache statistics
   */
  private updateStats(provider: string, isHit: boolean): void {
    const current = this.stats.get(provider) || { hits: 0, misses: 0 };
    
    if (isHit) {
      current.hits++;
    } else {
      current.misses++;
    }
    
    this.stats.set(provider, current);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ApiCacheStats {
    let totalHits = 0;
    let totalMisses = 0;
    const providerStats: Record<string, { hits: number; misses: number; hitRate: number }> = {};

    for (const [provider, stats] of this.stats.entries()) {
      totalHits += stats.hits;
      totalMisses += stats.misses;
      
      const total = stats.hits + stats.misses;
      providerStats[provider] = {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: total > 0 ? stats.hits / total : 0,
      };
    }

    const totalRequests = totalHits + totalMisses;
    
    return {
      totalHits,
      totalMisses,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      providerStats,
    };
  }

  /**
   * Clear cache statistics
   */
  clearStats(): void {
    this.stats.clear();
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    if (!isRedisEnabled()) {
      return 0;
    }

    try {
      return await executeRedisCommand(
        async (client) => {
          const keys = await client.keys(`${API_CACHE_PREFIX}${pattern}`);
          if (keys.length === 0) return 0;
          
          await client.del(keys);
          return keys.length;
        },
        0,
        RedisOperationType.DEL,
        pattern
      ) ?? 0;
    } catch (error) {
      console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
      return 0;
    }
  }
}

// Export singleton instance
export const apiCacheService = new ApiCacheService();
