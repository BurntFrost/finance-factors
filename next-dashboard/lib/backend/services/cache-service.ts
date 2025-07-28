/**
 * Cache Service
 * 
 * Centralized cache management service for the backend
 */

import { cache } from '../lib/cache/advanced-cache';
import { 
  setCacheData, 
  getCacheData, 
  deleteCacheKey,
  getCacheStats,
  CACHE_PREFIXES,
  DEFAULT_TTL 
} from '../lib/redis/redis-cache';
import type { StandardDataPoint, ProxyApiResponse } from '@/shared/types';

export class CacheService {
  /**
   * Cache API response data
   */
  async cacheApiResponse<T>(
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
    
    const cacheKey = `${CACHE_PREFIXES.API_RESPONSE}${provider}-${seriesId}-${paramString}`;
    
    return await setCacheData(cacheKey, data, ttl, `${provider} API`);
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse<T>(
    provider: string,
    seriesId: string,
    params: Record<string, string>
  ): Promise<ProxyApiResponse<T> | null> {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const cacheKey = `${CACHE_PREFIXES.API_RESPONSE}${provider}-${seriesId}-${paramString}`;
    
    return await getCacheData<ProxyApiResponse<T>>(cacheKey);
  }

  /**
   * Cache chart data
   */
  async cacheChartData(
    chartType: string,
    dataSource: string,
    data: StandardDataPoint[],
    ttl: number = DEFAULT_TTL.CHART_DATA
  ): Promise<boolean> {
    const cacheKey = `${CACHE_PREFIXES.CHART_DATA}${chartType}-${dataSource}`;
    
    return await setCacheData(cacheKey, data, ttl, 'Chart Data');
  }

  /**
   * Get cached chart data
   */
  async getCachedChartData(
    chartType: string,
    dataSource: string
  ): Promise<StandardDataPoint[] | null> {
    const cacheKey = `${CACHE_PREFIXES.CHART_DATA}${chartType}-${dataSource}`;
    
    return await getCacheData<StandardDataPoint[]>(cacheKey);
  }

  /**
   * Cache health check data
   */
  async cacheHealthCheck(
    endpoint: string,
    data: any,
    ttl: number = DEFAULT_TTL.HEALTH_CHECK
  ): Promise<boolean> {
    const cacheKey = `${CACHE_PREFIXES.HEALTH_CHECK}${endpoint}`;
    
    return await setCacheData(cacheKey, data, ttl, 'Health Check');
  }

  /**
   * Get cached health check data
   */
  async getCachedHealthCheck(endpoint: string): Promise<any | null> {
    const cacheKey = `${CACHE_PREFIXES.HEALTH_CHECK}${endpoint}`;
    
    return await getCacheData(cacheKey);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<boolean> {
    try {
      await deleteCacheKey(pattern);
      return true;
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics() {
    return await getCacheStats();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(dataTypes: string[]): Promise<void> {
    // Implementation would depend on specific data types and sources
    console.log('Warming up cache for data types:', dataTypes);
  }

  /**
   * Clear all cache data
   */
  async clearAllCache(): Promise<boolean> {
    try {
      // Clear Redis cache
      await deleteCacheKey('*');
      
      // Clear advanced cache
      await cache.clear();
      
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
