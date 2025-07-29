/**
 * Cache Key Management Service
 * 
 * Provides intelligent cache key generation, organization, and management
 * for optimal cache performance and monitoring.
 */

import { CACHE_PREFIXES } from '../lib/redis-cache';

export interface CacheKeyComponents {
  prefix: string;
  provider: string;
  dataType: string;
  seriesId?: string;
  timeframe?: string;
  parameters?: Record<string, string>;
  version?: string;
}

export interface CacheKeyMetadata {
  key: string;
  components: CacheKeyComponents;
  estimatedSize: number;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  dependencies: string[];
}

class CacheKeyManager {
  private keyRegistry = new Map<string, CacheKeyMetadata>();
  private keyHierarchy = new Map<string, Set<string>>();

  /**
   * Generate optimized cache key with hierarchical structure
   */
  generateKey(components: CacheKeyComponents): string {
    const {
      prefix,
      provider,
      dataType,
      seriesId,
      timeframe,
      parameters,
      version = 'v1'
    } = components;

    // Base key structure: prefix:provider:dataType:seriesId
    let key = `${prefix}${provider.toLowerCase()}:${dataType}`;
    
    if (seriesId) {
      key += `:${seriesId}`;
    }
    
    if (timeframe) {
      key += `:${timeframe}`;
    }

    // Add sorted parameters for consistency
    if (parameters && Object.keys(parameters).length > 0) {
      const paramString = Object.keys(parameters)
        .sort()
        .map(k => `${k}=${parameters[k]}`)
        .join('&');
      key += `:${this.hashParameters(paramString)}`;
    }

    // Add version for cache invalidation
    key += `:${version}`;

    return key;
  }

  /**
   * Generate hierarchical cache keys for related data
   */
  generateHierarchicalKeys(dataType: string): {
    parent: string;
    children: string[];
    related: string[];
  } {
    const parent = `${CACHE_PREFIXES.API_RESPONSE}${dataType}:parent`;
    
    const children = [
      `${parent}:chart-data`,
      `${parent}:table-data`,
      `${parent}:summary-data`,
      `${parent}:metadata`
    ];

    const related = [
      `${CACHE_PREFIXES.CHART_DATA}${dataType}`,
      `${CACHE_PREFIXES.HEALTH_CHECK}${dataType}`,
    ];

    return { parent, children, related };
  }

  /**
   * Register cache key with metadata for monitoring
   */
  registerKey(key: string, metadata: Omit<CacheKeyMetadata, 'key'>): void {
    const fullMetadata: CacheKeyMetadata = {
      key,
      ...metadata
    };

    this.keyRegistry.set(key, fullMetadata);

    // Build hierarchy relationships
    const parentKey = this.extractParentKey(key);
    if (parentKey) {
      if (!this.keyHierarchy.has(parentKey)) {
        this.keyHierarchy.set(parentKey, new Set());
      }
      this.keyHierarchy.get(parentKey)!.add(key);
    }
  }

  /**
   * Get cache keys by pattern or tag
   */
  getKeysByPattern(pattern: string | RegExp): CacheKeyMetadata[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    return Array.from(this.keyRegistry.values())
      .filter(metadata => regex.test(metadata.key));
  }

  /**
   * Get cache keys by tag
   */
  getKeysByTag(tag: string): CacheKeyMetadata[] {
    return Array.from(this.keyRegistry.values())
      .filter(metadata => metadata.tags.includes(tag));
  }

  /**
   * Get dependent cache keys that should be invalidated together
   */
  getDependentKeys(key: string): string[] {
    const metadata = this.keyRegistry.get(key);
    if (!metadata) return [];

    const dependents = new Set<string>();
    
    // Add direct dependencies
    metadata.dependencies.forEach(dep => dependents.add(dep));
    
    // Add hierarchical children
    const children = this.keyHierarchy.get(key);
    if (children) {
      children.forEach(child => dependents.add(child));
    }

    return Array.from(dependents);
  }

  /**
   * Generate cache invalidation plan
   */
  generateInvalidationPlan(triggerKey: string): {
    immediate: string[];
    delayed: string[];
    cascade: string[];
  } {
    const immediate = [triggerKey];
    const delayed: string[] = [];
    const cascade: string[] = [];

    const metadata = this.keyRegistry.get(triggerKey);
    if (!metadata) {
      return { immediate, delayed, cascade };
    }

    // Immediate invalidation for direct dependencies
    metadata.dependencies.forEach(dep => {
      immediate.push(dep);
    });

    // Delayed invalidation for related data
    if (metadata.tags.includes('api-data')) {
      delayed.push(...this.getKeysByTag('chart-data').map(m => m.key));
      delayed.push(...this.getKeysByTag('summary-data').map(m => m.key));
    }

    // Cascade invalidation for hierarchical children
    const children = this.keyHierarchy.get(triggerKey);
    if (children) {
      cascade.push(...Array.from(children));
    }

    return { immediate, delayed, cascade };
  }

  /**
   * Optimize cache key structure for better performance
   */
  optimizeKeyStructure(key: string): string {
    // Remove redundant information
    let optimized = key
      .replace(/::+/g, ':') // Remove double colons
      .replace(/:$/, ''); // Remove trailing colon

    // Shorten common prefixes
    const prefixMappings = {
      'api:response:': 'ar:',
      'chart:data:': 'cd:',
      'health:check:': 'hc:',
    };

    Object.entries(prefixMappings).forEach(([long, short]) => {
      optimized = optimized.replace(long, short);
    });

    return optimized;
  }

  /**
   * Generate cache key for API response with smart defaults
   */
  generateApiResponseKey(
    provider: string,
    dataType: string,
    seriesId?: string,
    parameters?: Record<string, string>
  ): string {
    return this.generateKey({
      prefix: CACHE_PREFIXES.API_RESPONSE,
      provider,
      dataType,
      seriesId,
      parameters,
      timeframe: this.getOptimalTimeframe(dataType),
    });
  }

  /**
   * Generate cache key for chart data
   */
  generateChartDataKey(
    chartType: string,
    dataType: string,
    visualization?: string
  ): string {
    return this.generateKey({
      prefix: CACHE_PREFIXES.CHART_DATA,
      provider: 'chart',
      dataType,
      seriesId: chartType,
      parameters: visualization ? { viz: visualization } : undefined,
    });
  }

  /**
   * Get optimal timeframe for data type
   */
  private getOptimalTimeframe(dataType: string): string {
    const timeframeMap: Record<string, string> = {
      'house-prices': 'monthly',
      'gdp-growth': 'quarterly',
      'unemployment-rate': 'monthly',
      'inflation-rate': 'monthly',
      'stock-prices': 'daily',
    };

    return timeframeMap[dataType] || 'monthly';
  }

  /**
   * Extract parent key from hierarchical key
   */
  private extractParentKey(key: string): string | null {
    const parts = key.split(':');
    if (parts.length <= 2) return null;
    
    return parts.slice(0, -1).join(':');
  }

  /**
   * Hash parameters for consistent key generation
   */
  private hashParameters(paramString: string): string {
    // Simple hash function for parameter consistency
    let hash = 0;
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache key statistics
   */
  getKeyStatistics(): {
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    keysByPriority: Record<string, number>;
    averageKeyLength: number;
    hierarchicalKeys: number;
  } {
    const stats = {
      totalKeys: this.keyRegistry.size,
      keysByPrefix: {} as Record<string, number>,
      keysByPriority: {} as Record<string, number>,
      averageKeyLength: 0,
      hierarchicalKeys: this.keyHierarchy.size,
    };

    let totalLength = 0;

    this.keyRegistry.forEach(metadata => {
      // Count by prefix
      const prefix = metadata.key.split(':')[0] + ':';
      stats.keysByPrefix[prefix] = (stats.keysByPrefix[prefix] || 0) + 1;

      // Count by priority
      stats.keysByPriority[metadata.priority] = 
        (stats.keysByPriority[metadata.priority] || 0) + 1;

      totalLength += metadata.key.length;
    });

    stats.averageKeyLength = totalLength / stats.totalKeys || 0;

    return stats;
  }

  /**
   * Clean up expired key metadata
   */
  cleanupExpiredKeys(activeKeys: string[]): void {
    const activeKeySet = new Set(activeKeys);
    
    for (const [key] of this.keyRegistry) {
      if (!activeKeySet.has(key)) {
        this.keyRegistry.delete(key);
        this.keyHierarchy.delete(key);
      }
    }
  }
}

// Global instance
export const cacheKeyManager = new CacheKeyManager();

// Convenience functions
export const generateApiKey = (provider: string, dataType: string, seriesId?: string, params?: Record<string, string>) =>
  cacheKeyManager.generateApiResponseKey(provider, dataType, seriesId, params);

export const generateChartKey = (chartType: string, dataType: string, visualization?: string) =>
  cacheKeyManager.generateChartDataKey(chartType, dataType, visualization);
