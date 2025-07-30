/**
 * API Cache Monitoring and Analytics Service
 * 
 * Comprehensive monitoring, logging, and analytics for API data source caching
 * operations with performance metrics and health monitoring.
 */

import { executeRedisCommand } from './redis';
import { RedisOperationType } from './redis-error-logger';
import { isRedisEnabled } from './feature-toggles';

// Cache monitoring interfaces
export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  averageResponseTime: number;
  errorCount: number;
  lastUpdated: Date;
}

export interface ProviderMetrics {
  provider: string;
  metrics: CacheMetrics;
  dataTypeBreakdown: Record<string, CacheMetrics>;
}

export interface CacheHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  hitRate: number;
  averageResponseTime: number;
  errorRate: number;
  redisConnected: boolean;
  lastCheck: Date;
}

export interface CacheOperation {
  timestamp: Date;
  provider: string;
  dataType: string;
  operation: 'hit' | 'miss' | 'set' | 'error';
  duration: number;
  cacheKey?: string;
  error?: string;
}

/**
 * API Cache Monitor Class
 */
export class ApiCacheMonitor {
  private operations: CacheOperation[] = [];
  private maxOperationsHistory = 10000; // Keep last 10k operations
  private metricsCache: Map<string, ProviderMetrics> = new Map();
  private lastMetricsUpdate = 0;
  private metricsUpdateInterval = 60000; // Update metrics every minute

  /**
   * Log cache operation
   */
  logOperation(
    provider: string,
    dataType: string,
    operation: 'hit' | 'miss' | 'set' | 'error',
    duration: number,
    cacheKey?: string,
    error?: string
  ): void {
    const logEntry: CacheOperation = {
      timestamp: new Date(),
      provider: provider.toUpperCase(),
      dataType,
      operation,
      duration,
      cacheKey,
      error,
    };

    // Add to operations history
    this.operations.push(logEntry);

    // Maintain history size limit
    if (this.operations.length > this.maxOperationsHistory) {
      this.operations = this.operations.slice(-this.maxOperationsHistory);
    }

    // Log to console with structured format
    this.logToConsole(logEntry);

    // Store in Redis for persistence (if available)
    this.persistOperationToRedis(logEntry);
  }

  /**
   * Log to console with structured format
   */
  private logToConsole(operation: CacheOperation): void {
    const timestamp = operation.timestamp.toISOString();
    const provider = operation.provider;
    const dataType = operation.dataType;
    const op = operation.operation.toUpperCase();
    const duration = operation.duration;

    switch (operation.operation) {
      case 'hit':
        console.log(`[${timestamp}] [CACHE HIT] ${provider}:${dataType} - ${duration}ms`);
        break;
      case 'miss':
        console.log(`[${timestamp}] [CACHE MISS] ${provider}:${dataType} - ${duration}ms`);
        break;
      case 'set':
        console.log(`[${timestamp}] [CACHE SET] ${provider}:${dataType} - ${duration}ms`);
        break;
      case 'error':
        console.error(`[${timestamp}] [CACHE ERROR] ${provider}:${dataType} - ${operation.error} - ${duration}ms`);
        break;
    }
  }

  /**
   * Persist operation to Redis for long-term storage
   */
  private async persistOperationToRedis(operation: CacheOperation): Promise<void> {
    if (!isRedisEnabled()) return;

    try {
      const key = `cache:monitor:operations:${Date.now()}`;
      const ttl = 7 * 24 * 60 * 60; // Keep for 7 days

      await executeRedisCommand(
        async (client) => {
          await client.setEx(key, ttl, JSON.stringify(operation));
        },
        undefined,
        RedisOperationType.SETEX,
        key
      );
    } catch (error) {
      // Don't throw - monitoring failures shouldn't break the application
      console.warn('Failed to persist cache operation to Redis:', error);
    }
  }

  /**
   * Get metrics for a specific provider
   */
  getProviderMetrics(provider: string): ProviderMetrics | null {
    this.updateMetricsIfNeeded();
    return this.metricsCache.get(provider.toUpperCase()) || null;
  }

  /**
   * Get metrics for all providers
   */
  getAllProviderMetrics(): ProviderMetrics[] {
    this.updateMetricsIfNeeded();
    return Array.from(this.metricsCache.values());
  }

  /**
   * Get overall cache health status
   */
  getCacheHealthStatus(): CacheHealthStatus {
    this.updateMetricsIfNeeded();

    const allMetrics = Array.from(this.metricsCache.values());
    
    if (allMetrics.length === 0) {
      return {
        status: 'critical',
        hitRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        redisConnected: isRedisEnabled(),
        lastCheck: new Date(),
      };
    }

    // Calculate overall metrics
    let totalRequests = 0;
    let totalHits = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;

    for (const providerMetrics of allMetrics) {
      const metrics = providerMetrics.metrics;
      totalRequests += metrics.totalRequests;
      totalHits += metrics.cacheHits;
      totalResponseTime += metrics.averageResponseTime * metrics.totalRequests;
      totalErrors += metrics.errorCount;
    }

    const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (errorRate > 0.1 || hitRate < 0.3 || averageResponseTime > 5000) {
      status = 'critical';
    } else if (errorRate > 0.05 || hitRate < 0.6 || averageResponseTime > 2000) {
      status = 'degraded';
    }

    return {
      status,
      hitRate,
      averageResponseTime,
      errorRate,
      redisConnected: isRedisEnabled(),
      lastCheck: new Date(),
    };
  }

  /**
   * Update metrics cache if needed
   */
  private updateMetricsIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastMetricsUpdate < this.metricsUpdateInterval) {
      return;
    }

    this.calculateMetrics();
    this.lastMetricsUpdate = now;
  }

  /**
   * Calculate metrics from operations history
   */
  private calculateMetrics(): void {
    const providerStats = new Map<string, {
      totalRequests: number;
      cacheHits: number;
      cacheMisses: number;
      totalResponseTime: number;
      errorCount: number;
      dataTypes: Map<string, {
        totalRequests: number;
        cacheHits: number;
        cacheMisses: number;
        totalResponseTime: number;
        errorCount: number;
      }>;
    }>();

    // Process operations from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOperations = this.operations.filter(op => op.timestamp > oneHourAgo);

    for (const operation of recentOperations) {
      const provider = operation.provider;
      const dataType = operation.dataType;

      // Initialize provider stats if not exists
      if (!providerStats.has(provider)) {
        providerStats.set(provider, {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          totalResponseTime: 0,
          errorCount: 0,
          dataTypes: new Map(),
        });
      }

      const stats = providerStats.get(provider)!;

      // Initialize data type stats if not exists
      if (!stats.dataTypes.has(dataType)) {
        stats.dataTypes.set(dataType, {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          totalResponseTime: 0,
          errorCount: 0,
        });
      }

      const dataTypeStats = stats.dataTypes.get(dataType)!;

      // Update stats based on operation type
      if (operation.operation === 'hit' || operation.operation === 'miss') {
        stats.totalRequests++;
        dataTypeStats.totalRequests++;
        stats.totalResponseTime += operation.duration;
        dataTypeStats.totalResponseTime += operation.duration;

        if (operation.operation === 'hit') {
          stats.cacheHits++;
          dataTypeStats.cacheHits++;
        } else {
          stats.cacheMisses++;
          dataTypeStats.cacheMisses++;
        }
      } else if (operation.operation === 'error') {
        stats.errorCount++;
        dataTypeStats.errorCount++;
      }
    }

    // Convert to metrics format
    this.metricsCache.clear();
    
    for (const [provider, stats] of providerStats.entries()) {
      const providerMetrics: CacheMetrics = {
        totalRequests: stats.totalRequests,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        hitRate: stats.totalRequests > 0 ? stats.cacheHits / stats.totalRequests : 0,
        averageResponseTime: stats.totalRequests > 0 ? stats.totalResponseTime / stats.totalRequests : 0,
        errorCount: stats.errorCount,
        lastUpdated: new Date(),
      };

      const dataTypeBreakdown: Record<string, CacheMetrics> = {};
      
      for (const [dataType, dataTypeStats] of stats.dataTypes.entries()) {
        dataTypeBreakdown[dataType] = {
          totalRequests: dataTypeStats.totalRequests,
          cacheHits: dataTypeStats.cacheHits,
          cacheMisses: dataTypeStats.cacheMisses,
          hitRate: dataTypeStats.totalRequests > 0 ? dataTypeStats.cacheHits / dataTypeStats.totalRequests : 0,
          averageResponseTime: dataTypeStats.totalRequests > 0 ? dataTypeStats.totalResponseTime / dataTypeStats.totalRequests : 0,
          errorCount: dataTypeStats.errorCount,
          lastUpdated: new Date(),
        };
      }

      this.metricsCache.set(provider, {
        provider,
        metrics: providerMetrics,
        dataTypeBreakdown,
      });
    }
  }

  /**
   * Get recent operations for debugging
   */
  getRecentOperations(limit: number = 100): CacheOperation[] {
    return this.operations.slice(-limit);
  }

  /**
   * Clear operations history
   */
  clearHistory(): void {
    this.operations = [];
    this.metricsCache.clear();
    this.lastMetricsUpdate = 0;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    providers: ProviderMetrics[];
    health: CacheHealthStatus;
    recentOperations: CacheOperation[];
  } {
    return {
      providers: this.getAllProviderMetrics(),
      health: this.getCacheHealthStatus(),
      recentOperations: this.getRecentOperations(50),
    };
  }
}

// Export singleton instance
export const apiCacheMonitor = new ApiCacheMonitor();
