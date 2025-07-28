/**
 * Enhanced Cache Strategy
 * 
 * Advanced caching implementation with:
 * - Intelligent cache invalidation
 * - Browser cache optimization
 * - Stale-while-revalidate patterns
 * - Cache warming strategies
 * - Performance monitoring
 */

import { cache } from './advanced-cache';
import { compressionManager } from './compression';

export interface CacheStrategy {
  name: string;
  ttl: number;
  staleWhileRevalidate?: number;
  tags: string[];
  priority: 'low' | 'normal' | 'high';
  compression: boolean;
  browserCache: boolean;
  warmOnMiss?: boolean;
}

export interface CacheInvalidationRule {
  pattern: string | RegExp;
  triggers: string[];
  cascade?: string[];
  delay?: number;
}

export class EnhancedCacheStrategy {
  private strategies = new Map<string, CacheStrategy>();
  private invalidationRules: CacheInvalidationRule[] = [];
  private warmingQueue = new Set<string>();
  private metrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    warmings: 0,
    compressionSavings: 0,
  };

  constructor() {
    this.initializeDefaultStrategies();
    this.initializeInvalidationRules();
  }

  /**
   * Initialize default caching strategies
   */
  private initializeDefaultStrategies() {
    // API Response Strategy
    this.strategies.set('api-response', {
      name: 'API Response',
      ttl: 900, // 15 minutes
      staleWhileRevalidate: 300, // 5 minutes
      tags: ['api', 'data'],
      priority: 'normal',
      compression: true,
      browserCache: true,
      warmOnMiss: true,
    });

    // Chart Data Strategy
    this.strategies.set('chart-data', {
      name: 'Chart Data',
      ttl: 600, // 10 minutes
      staleWhileRevalidate: 180, // 3 minutes
      tags: ['chart', 'visualization'],
      priority: 'high',
      compression: true,
      browserCache: true,
      warmOnMiss: false,
    });

    // User Session Strategy
    this.strategies.set('user-session', {
      name: 'User Session',
      ttl: 86400, // 24 hours
      tags: ['user', 'session'],
      priority: 'high',
      compression: false,
      browserCache: false,
    });

    // Health Check Strategy
    this.strategies.set('health-check', {
      name: 'Health Check',
      ttl: 300, // 5 minutes
      tags: ['health', 'monitoring'],
      priority: 'low',
      compression: false,
      browserCache: true,
    });

    // Static Content Strategy
    this.strategies.set('static-content', {
      name: 'Static Content',
      ttl: 3600, // 1 hour
      tags: ['static', 'assets'],
      priority: 'normal',
      compression: true,
      browserCache: true,
    });
  }

  /**
   * Initialize cache invalidation rules
   */
  private initializeInvalidationRules() {
    // API data changes should invalidate related charts
    this.invalidationRules.push({
      pattern: /^api:response:/,
      triggers: ['data-update', 'api-refresh'],
      cascade: ['chart:*', 'summary:*'],
      delay: 0,
    });

    // User changes should invalidate session data
    this.invalidationRules.push({
      pattern: /^user:/,
      triggers: ['user-update', 'auth-change'],
      cascade: ['session:*', 'preferences:*'],
      delay: 0,
    });

    // Configuration changes should invalidate everything
    this.invalidationRules.push({
      pattern: /.*/,
      triggers: ['config-change', 'deployment'],
      cascade: ['*'],
      delay: 5000, // 5 second delay for graceful invalidation
    });
  }

  /**
   * Get data with enhanced caching strategy
   */
  async get<T>(
    key: string,
    strategyName: string = 'api-response',
    fetcher?: () => Promise<T>
  ): Promise<T | null> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown cache strategy: ${strategyName}`);
    }

    // Try to get from cache
    const cached = await cache.get<T>(key);
    if (cached) {
      this.metrics.hits++;
      return cached;
    }

    this.metrics.misses++;

    // If no fetcher provided, return null
    if (!fetcher) {
      return null;
    }

    // Fetch fresh data
    const data = await fetcher();
    if (data) {
      // Store with strategy configuration
      await this.set(key, data, strategyName);

      // Warm related cache if enabled
      if (strategy.warmOnMiss) {
        this.scheduleWarmup(key, strategyName);
      }
    }

    return data;
  }

  /**
   * Set data with enhanced caching strategy
   */
  async set<T>(
    key: string,
    data: T,
    strategyName: string = 'api-response'
  ): Promise<void> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown cache strategy: ${strategyName}`);
    }

    // Compress data if strategy requires it
    let processedData = data;
    if (strategy.compression) {
      try {
        const compressed = await compressionManager.compressJson(data);
        if (compressed && compressed.stats.compressionRatio < 0.8) {
          processedData = compressed.data as T;
          this.metrics.compressionSavings += 
            compressed.stats.originalSize - compressed.stats.compressedSize;
        }
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    // Set in cache with strategy configuration
    await cache.set(key, processedData, {
      ttl: strategy.ttl,
      staleWhileRevalidate: strategy.staleWhileRevalidate,
      tags: strategy.tags,
      priority: strategy.priority,
      compression: strategy.compression,
    });

    // Set browser cache headers if applicable
    if (strategy.browserCache && typeof window !== 'undefined') {
      this.setBrowserCacheHeaders(key, strategy);
    }
  }

  /**
   * Intelligent cache invalidation
   */
  async invalidate(trigger: string, _context?: Record<string, any>): Promise<void> {
    this.metrics.invalidations++;

    const invalidationPromises: Promise<void>[] = [];

    for (const rule of this.invalidationRules) {
      if (rule.triggers.includes(trigger)) {
        // Apply delay if specified
        const executeInvalidation = async () => {
          if (rule.delay) {
            await new Promise(resolve => setTimeout(resolve, rule.delay));
          }

          // Invalidate matching keys
          if (typeof rule.pattern === 'string') {
            await cache.invalidate(rule.pattern);
          } else {
            // For regex patterns, we'd need to scan keys (expensive)
            console.warn('Regex invalidation patterns not fully implemented');
          }

          // Cascade invalidation
          if (rule.cascade) {
            for (const cascadePattern of rule.cascade) {
              if (cascadePattern === '*') {
                await cache.clear();
              } else {
                await cache.invalidate(`tag:${cascadePattern}`);
              }
            }
          }
        };

        invalidationPromises.push(executeInvalidation());
      }
    }

    await Promise.allSettled(invalidationPromises);
  }

  /**
   * Cache warming for better performance
   */
  private async scheduleWarmup(key: string, strategyName: string): Promise<void> {
    if (this.warmingQueue.has(key)) {
      return; // Already scheduled
    }

    this.warmingQueue.add(key);
    this.metrics.warmings++;

    // Schedule warmup in background
    setTimeout(async () => {
      try {
        // This would typically involve pre-fetching related data
        console.log(`Warming cache for key: ${key} with strategy: ${strategyName}`);
        // Implementation would depend on specific warming logic
      } catch (error) {
        console.warn('Cache warming failed:', error);
      } finally {
        this.warmingQueue.delete(key);
      }
    }, 1000);
  }

  /**
   * Set browser cache headers for client-side caching
   */
  private setBrowserCacheHeaders(key: string, strategy: CacheStrategy): void {
    // This would be used in API responses to set appropriate headers
    const headers = {
      'Cache-Control': `public, max-age=${strategy.ttl}`,
      'ETag': this.generateETag(key),
      'Last-Modified': new Date().toUTCString(),
    };

    if (strategy.staleWhileRevalidate) {
      headers['Cache-Control'] += `, stale-while-revalidate=${strategy.staleWhileRevalidate}`;
    }

    // Store headers for later use in API responses
    this.storeBrowserCacheHeaders(key, headers);
  }

  /**
   * Generate ETag for cache validation
   */
  private generateETag(key: string): string {
    return `"${Buffer.from(key + Date.now()).toString('base64')}"`;
  }

  /**
   * Store browser cache headers for API responses
   */
  private storeBrowserCacheHeaders(key: string, headers: Record<string, string>): void {
    // Store headers in a way that API routes can access them
    if (typeof globalThis !== 'undefined') {
      globalThis.__cacheHeaders = globalThis.__cacheHeaders || new Map();
      globalThis.__cacheHeaders.set(key, headers);
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

    return {
      ...this.metrics,
      hitRate,
      totalRequests,
      compressionSavingsMB: this.metrics.compressionSavings / (1024 * 1024),
    };
  }

  /**
   * Add custom cache strategy
   */
  addStrategy(name: string, strategy: CacheStrategy): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Add custom invalidation rule
   */
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.push(rule);
  }
}

// Global instance
export const enhancedCacheStrategy = new EnhancedCacheStrategy();

// Convenience functions
export const getCached = <T>(key: string, strategy?: string, fetcher?: () => Promise<T>) =>
  enhancedCacheStrategy.get<T>(key, strategy, fetcher);

export const setCached = <T>(key: string, data: T, strategy?: string) =>
  enhancedCacheStrategy.set<T>(key, data, strategy);

export const invalidateCache = (trigger: string, context?: Record<string, any>) =>
  enhancedCacheStrategy.invalidate(trigger, context);

export default enhancedCacheStrategy;
