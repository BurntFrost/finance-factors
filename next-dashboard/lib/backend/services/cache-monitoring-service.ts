/**
 * Cache Monitoring & Analytics Service
 * 
 * Provides comprehensive cache performance monitoring, analytics,
 * and optimization recommendations for the Finance Factors Dashboard.
 */

import { executeRedisCommand } from '../lib/redis';
import { getCacheStats } from '../lib/redis-cache';
import { cacheKeyManager } from './cache-key-manager';

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  averageResponseTime: number;
  memoryUsage: number;
  keyCount: number;
  evictionCount: number;
  lastUpdated: Date;
}

export interface CachePerformanceReport {
  overall: CacheMetrics;
  byDataType: Record<string, CacheMetrics>;
  byProvider: Record<string, CacheMetrics>;
  topPerformingKeys: Array<{
    key: string;
    hitRate: number;
    requestCount: number;
  }>;
  underPerformingKeys: Array<{
    key: string;
    hitRate: number;
    requestCount: number;
    recommendation: string;
  }>;
  recommendations: string[];
}

export interface CacheAlert {
  type: 'high_miss_rate' | 'memory_pressure' | 'slow_response' | 'key_explosion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedKeys: string[];
  recommendation: string;
  timestamp: Date;
}

class CacheMonitoringService {
  private metrics = new Map<string, CacheMetrics>();
  private alerts: CacheAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL = 60000; // 1 minute
  private readonly ALERT_THRESHOLDS = {
    LOW_HIT_RATE: 0.7,
    HIGH_MEMORY_USAGE: 0.8,
    SLOW_RESPONSE_TIME: 1000, // ms
    MAX_KEYS_PER_PREFIX: 10000,
  };

  /**
   * Start continuous cache monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('Cache monitoring already running');
      return;
    }

    console.log('📊 Starting cache monitoring service...');

    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.analyzePerformance();
      await this.checkAlerts();
    }, this.MONITORING_INTERVAL);

    // Initial collection
    this.collectMetrics().catch(console.error);
  }

  /**
   * Stop cache monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 Cache monitoring stopped');
    }
  }

  /**
   * Collect comprehensive cache metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Get Redis stats
      const redisStats = await getCacheStats();
      
      // Get key-level metrics
      const keyStats = await this.collectKeyLevelMetrics();
      
      // Update overall metrics
      const overallMetrics: CacheMetrics = {
        hitRate: this.calculateHitRate(redisStats),
        missRate: 1 - this.calculateHitRate(redisStats),
        totalRequests: keyStats.totalRequests,
        totalHits: keyStats.totalHits,
        totalMisses: keyStats.totalMisses,
        averageResponseTime: keyStats.averageResponseTime,
        memoryUsage: this.parseMemoryUsage(redisStats.memoryUsage),
        keyCount: redisStats.totalKeys,
        evictionCount: keyStats.evictionCount,
        lastUpdated: new Date(),
      };

      this.metrics.set('overall', overallMetrics);

      // Collect metrics by data type and provider
      await this.collectSegmentedMetrics();

    } catch (error) {
      console.error('Failed to collect cache metrics:', error);
    }
  }

  /**
   * Collect key-level performance metrics
   */
  private async collectKeyLevelMetrics(): Promise<{
    totalRequests: number;
    totalHits: number;
    totalMisses: number;
    averageResponseTime: number;
    evictionCount: number;
  }> {
    // This would typically read from Redis analytics or logs
    // For now, return mock data based on Redis stats
    return {
      totalRequests: 1000,
      totalHits: 750,
      totalMisses: 250,
      averageResponseTime: 45,
      evictionCount: 10,
    };
  }

  /**
   * Collect metrics segmented by data type and provider
   */
  private async collectSegmentedMetrics(): Promise<void> {
    const keyStats = cacheKeyManager.getKeyStatistics();
    
    // Metrics by prefix (which corresponds to data types)
    for (const [prefix, count] of Object.entries(keyStats.keysByPrefix)) {
      const segmentMetrics = await this.getSegmentMetrics(prefix);
      this.metrics.set(`prefix:${prefix}`, segmentMetrics);
    }

    // Metrics by provider (extracted from key patterns)
    const providerMetrics = await this.getProviderMetrics();
    for (const [provider, metrics] of providerMetrics) {
      this.metrics.set(`provider:${provider}`, metrics);
    }
  }

  /**
   * Get metrics for a specific segment (prefix/provider)
   */
  private async getSegmentMetrics(segment: string): Promise<CacheMetrics> {
    // This would analyze Redis data for specific key patterns
    // For now, return estimated metrics
    const overall = this.metrics.get('overall');
    if (!overall) {
      return this.getDefaultMetrics();
    }

    // Simulate segment-specific variations
    const variation = Math.random() * 0.3 - 0.15; // ±15% variation
    
    return {
      ...overall,
      hitRate: Math.max(0, Math.min(1, overall.hitRate + variation)),
      totalRequests: Math.floor(overall.totalRequests * (0.1 + Math.random() * 0.3)),
      lastUpdated: new Date(),
    };
  }

  /**
   * Get provider-specific metrics
   */
  private async getProviderMetrics(): Promise<Map<string, CacheMetrics>> {
    const providers = ['FRED', 'BLS', 'CENSUS', 'ALPHA_VANTAGE', 'WORLD_BANK', 'OECD'];
    const providerMetrics = new Map<string, CacheMetrics>();

    for (const provider of providers) {
      const metrics = await this.getSegmentMetrics(provider);
      providerMetrics.set(provider, metrics);
    }

    return providerMetrics;
  }

  /**
   * Analyze cache performance and generate insights
   */
  private async analyzePerformance(): Promise<void> {
    const overall = this.metrics.get('overall');
    if (!overall) return;

    // Identify performance issues
    if (overall.hitRate < this.ALERT_THRESHOLDS.LOW_HIT_RATE) {
      this.addAlert({
        type: 'high_miss_rate',
        severity: 'high',
        message: `Cache hit rate is low: ${(overall.hitRate * 100).toFixed(1)}%`,
        affectedKeys: [],
        recommendation: 'Consider increasing TTL values or implementing cache warming',
        timestamp: new Date(),
      });
    }

    if (overall.memoryUsage > this.ALERT_THRESHOLDS.HIGH_MEMORY_USAGE) {
      this.addAlert({
        type: 'memory_pressure',
        severity: 'medium',
        message: `High memory usage: ${(overall.memoryUsage * 100).toFixed(1)}%`,
        affectedKeys: [],
        recommendation: 'Consider implementing cache eviction policies or reducing TTL',
        timestamp: new Date(),
      });
    }

    if (overall.averageResponseTime > this.ALERT_THRESHOLDS.SLOW_RESPONSE_TIME) {
      this.addAlert({
        type: 'slow_response',
        severity: 'medium',
        message: `Slow cache response time: ${overall.averageResponseTime}ms`,
        affectedKeys: [],
        recommendation: 'Check Redis connection and consider connection pooling',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check for cache-related alerts
   */
  private async checkAlerts(): Promise<void> {
    const keyStats = cacheKeyManager.getKeyStatistics();
    
    // Check for key explosion
    for (const [prefix, count] of Object.entries(keyStats.keysByPrefix)) {
      if (count > this.ALERT_THRESHOLDS.MAX_KEYS_PER_PREFIX) {
        this.addAlert({
          type: 'key_explosion',
          severity: 'high',
          message: `Too many keys for prefix ${prefix}: ${count}`,
          affectedKeys: [prefix],
          recommendation: 'Review key generation strategy and implement key cleanup',
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Add alert to the alert queue
   */
  private addAlert(alert: CacheAlert): void {
    // Avoid duplicate alerts
    const existingAlert = this.alerts.find(a => 
      a.type === alert.type && 
      a.message === alert.message &&
      Date.now() - a.timestamp.getTime() < 300000 // 5 minutes
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      
      // Keep only recent alerts (last 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      this.alerts = this.alerts.filter(a => a.timestamp.getTime() > oneDayAgo);

      console.warn(`🚨 Cache Alert [${alert.severity}]: ${alert.message}`);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<CachePerformanceReport> {
    const overall = this.metrics.get('overall') || this.getDefaultMetrics();
    
    const byDataType: Record<string, CacheMetrics> = {};
    const byProvider: Record<string, CacheMetrics> = {};

    // Collect segmented metrics
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith('prefix:')) {
        const dataType = key.replace('prefix:', '');
        byDataType[dataType] = metrics;
      } else if (key.startsWith('provider:')) {
        const provider = key.replace('provider:', '');
        byProvider[provider] = metrics;
      }
    }

    // Generate top and underperforming keys
    const topPerformingKeys = await this.getTopPerformingKeys();
    const underPerformingKeys = await this.getUnderPerformingKeys();

    // Generate recommendations
    const recommendations = this.generateRecommendations(overall);

    return {
      overall,
      byDataType,
      byProvider,
      topPerformingKeys,
      underPerformingKeys,
      recommendations,
    };
  }

  /**
   * Get top performing cache keys
   */
  private async getTopPerformingKeys(): Promise<Array<{
    key: string;
    hitRate: number;
    requestCount: number;
  }>> {
    // This would analyze actual Redis data
    // For now, return mock top performers
    return [
      { key: 'api:response:fred:house-prices', hitRate: 0.95, requestCount: 500 },
      { key: 'api:response:bls:unemployment-rate', hitRate: 0.92, requestCount: 450 },
      { key: 'chart:data:line:gdp-growth', hitRate: 0.88, requestCount: 300 },
    ];
  }

  /**
   * Get underperforming cache keys with recommendations
   */
  private async getUnderPerformingKeys(): Promise<Array<{
    key: string;
    hitRate: number;
    requestCount: number;
    recommendation: string;
  }>> {
    return [
      {
        key: 'api:response:alpha-vantage:stock-prices',
        hitRate: 0.45,
        requestCount: 200,
        recommendation: 'Increase TTL or implement cache warming for frequently accessed stock data'
      },
      {
        key: 'chart:data:pie:sector-allocation',
        hitRate: 0.52,
        requestCount: 150,
        recommendation: 'Consider pre-generating pie chart data during off-peak hours'
      },
    ];
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(metrics: CacheMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.hitRate < 0.8) {
      recommendations.push('Implement proactive cache warming for frequently accessed data');
      recommendations.push('Consider increasing TTL values for stable data sources');
    }

    if (metrics.averageResponseTime > 100) {
      recommendations.push('Optimize Redis connection pooling and configuration');
      recommendations.push('Consider implementing local cache layer for hot data');
    }

    if (metrics.memoryUsage > 0.7) {
      recommendations.push('Implement intelligent cache eviction policies');
      recommendations.push('Review and optimize cache key structures');
    }

    if (metrics.keyCount > 50000) {
      recommendations.push('Implement automated cache cleanup for expired keys');
      recommendations.push('Consider key compression for large datasets');
    }

    return recommendations;
  }

  /**
   * Utility functions
   */
  private calculateHitRate(stats: any): number {
    const hits = stats.keysByPrefix?.hits || 0;
    const misses = stats.keysByPrefix?.misses || 0;
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  private parseMemoryUsage(memoryString: string): number {
    // Parse Redis memory usage string (e.g., "1.5MB")
    const match = memoryString.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) / 100 : 0; // Normalize to 0-1 scale
  }

  private getDefaultMetrics(): CacheMetrics {
    return {
      hitRate: 0,
      missRate: 1,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      keyCount: 0,
      evictionCount: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get current alerts
   */
  getAlerts(severity?: CacheAlert['severity']): CacheAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Get current metrics
   */
  getMetrics(key?: string): CacheMetrics | Map<string, CacheMetrics> {
    if (key) {
      return this.metrics.get(key) || this.getDefaultMetrics();
    }
    return new Map(this.metrics);
  }

  /**
   * Clear old alerts
   */
  clearAlerts(olderThan?: Date): void {
    const cutoff = olderThan || new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }
}

// Global instance
export const cacheMonitoringService = new CacheMonitoringService();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  cacheMonitoringService.startMonitoring();
}
