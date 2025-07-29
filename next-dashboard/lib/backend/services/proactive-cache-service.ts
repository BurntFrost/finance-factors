/**
 * Proactive Cache Population Service
 * 
 * Implements intelligent cache warming, background data fetching,
 * and proactive cache population strategies for the Finance Factors Dashboard.
 */

import { cache } from '../lib/advanced-cache';
import { enhancedCacheStrategy } from '../lib/enhanced-cache-strategy';
import { fredProxyService } from '../../app/api/services/fred-proxy';
import { blsProxyService } from '../../app/api/services/bls-proxy';
import { censusProxyService } from '../../app/api/services/census-proxy';
import { alphaVantageProxyService } from '../../app/api/services/alpha-vantage-proxy';
import { worldBankProxyService } from '../../app/api/services/world-bank-proxy';
import { oecdProxyService } from '../../app/api/services/oecd-proxy';
import { DATA_SOURCE_ELEMENTS, DataSourceConfigManager } from '../../shared/config/dualDataSourceConfig';
import { CACHE_PREFIXES, DEFAULT_TTL } from '../lib/redis-cache';
import { executeRedisCommand } from '../lib/redis';

export interface CacheWarmingConfig {
  dataTypes: string[];
  priority: 'high' | 'medium' | 'low';
  schedule: 'immediate' | 'hourly' | 'daily' | 'weekly';
  staggerDelay: number; // milliseconds between requests
  retryAttempts: number;
  warmingWindow: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface CacheWarmingMetrics {
  totalWarmed: number;
  successful: number;
  failed: number;
  averageResponseTime: number;
  lastWarmingTime: Date;
  nextScheduledWarming: Date;
  cacheHitRateImprovement: number;
}

class ProactiveCacheService {
  private warmingQueue = new Map<string, CacheWarmingConfig>();
  private metrics: CacheWarmingMetrics = {
    totalWarmed: 0,
    successful: 0,
    failed: 0,
    averageResponseTime: 0,
    lastWarmingTime: new Date(),
    nextScheduledWarming: new Date(),
    cacheHitRateImprovement: 0,
  };
  private isWarming = false;
  private warmingIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Initialize proactive cache warming for high-priority data types
   */
  async initializeCacheWarming(): Promise<void> {
    console.log('🔥 Initializing proactive cache warming...');

    // High-priority data types that should be warmed frequently
    const highPriorityConfig: CacheWarmingConfig = {
      dataTypes: ['house-prices', 'gdp-growth', 'unemployment-rate', 'inflation-rate'],
      priority: 'high',
      schedule: 'hourly',
      staggerDelay: 2000, // 2 seconds between requests
      retryAttempts: 3,
      warmingWindow: { start: '06:00', end: '22:00' },
    };

    // Medium-priority data types (including OECD & World Bank)
    const mediumPriorityConfig: CacheWarmingConfig = {
      dataTypes: [
        'salary-income',
        'cost-of-living',
        'consumer-spending',
        'world-bank-gdp-us',
        'world-bank-inflation-us',
        'oecd-employment-us',
        'oecd-productivity-us'
      ],
      priority: 'medium',
      schedule: 'daily',
      staggerDelay: 5000, // 5 seconds between requests
      retryAttempts: 2,
      warmingWindow: { start: '07:00', end: '21:00' },
    };

    // Low-priority data types (including global comparisons)
    const lowPriorityConfig: CacheWarmingConfig = {
      dataTypes: [
        'utilities-costs',
        'investment-returns',
        'world-bank-gdp-global',
        'world-bank-trade-us',
        'oecd-interest-rates-us'
      ],
      priority: 'low',
      schedule: 'weekly',
      staggerDelay: 10000, // 10 seconds between requests
      retryAttempts: 1,
      warmingWindow: { start: '08:00', end: '20:00' },
    };

    // Schedule warming for each priority level
    await this.scheduleWarmingConfig('high-priority', highPriorityConfig);
    await this.scheduleWarmingConfig('medium-priority', mediumPriorityConfig);
    await this.scheduleWarmingConfig('low-priority', lowPriorityConfig);

    console.log('✅ Proactive cache warming initialized');
  }

  /**
   * Schedule cache warming based on configuration
   */
  private async scheduleWarmingConfig(
    configId: string, 
    config: CacheWarmingConfig
  ): Promise<void> {
    this.warmingQueue.set(configId, config);

    const intervalMs = this.getIntervalMs(config.schedule);
    
    // Clear existing interval if any
    if (this.warmingIntervals.has(configId)) {
      clearInterval(this.warmingIntervals.get(configId)!);
    }

    // Schedule immediate warming if requested
    if (config.schedule === 'immediate') {
      await this.executeWarmingConfig(config);
      return;
    }

    // Schedule recurring warming
    const interval = setInterval(async () => {
      if (this.isWithinWarmingWindow(config.warmingWindow)) {
        await this.executeWarmingConfig(config);
      }
    }, intervalMs);

    this.warmingIntervals.set(configId, interval);
    
    console.log(`📅 Scheduled ${config.priority} priority warming every ${config.schedule}`);
  }

  /**
   * Execute cache warming for a specific configuration
   */
  private async executeWarmingConfig(config: CacheWarmingConfig): Promise<void> {
    if (this.isWarming) {
      console.log('⏳ Cache warming already in progress, skipping...');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    console.log(`🔥 Starting ${config.priority} priority cache warming for ${config.dataTypes.length} data types`);

    try {
      for (const dataType of config.dataTypes) {
        await this.warmDataType(dataType, config);
        
        // Stagger requests to avoid overwhelming APIs
        if (config.staggerDelay > 0) {
          await this.delay(config.staggerDelay);
        }
      }

      const duration = Date.now() - startTime;
      this.updateMetrics(config.dataTypes.length, duration, true);
      
      console.log(`✅ Cache warming completed in ${duration}ms`);
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
      this.updateMetrics(config.dataTypes.length, Date.now() - startTime, false);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm cache for a specific data type
   */
  private async warmDataType(
    dataType: string, 
    config: CacheWarmingConfig
  ): Promise<void> {
    const elementConfig = DATA_SOURCE_ELEMENTS[dataType];
    if (!elementConfig) {
      console.warn(`⚠️  No configuration found for data type: ${dataType}`);
      return;
    }

    const primaryProvider = elementConfig.sources.primary.provider;
    const cacheKey = `${CACHE_PREFIXES.API_RESPONSE}${primaryProvider}-${elementConfig.sources.primary.seriesId}`;

    try {
      // Check if data is already cached and fresh
      const existingData = await cache.get(cacheKey);
      if (existingData && this.isCacheFresh(existingData, elementConfig.cacheTTL)) {
        console.log(`💾 Cache already fresh for ${dataType}, skipping`);
        return;
      }

      // Fetch fresh data based on provider
      let freshData;
      switch (primaryProvider) {
        case 'FRED':
          freshData = await fredProxyService.fetchSeries(dataType);
          break;
        case 'BLS':
          freshData = await blsProxyService.fetchSeries(dataType);
          break;
        case 'CENSUS':
          freshData = await censusProxyService.fetchSeries(dataType);
          break;
        case 'ALPHA_VANTAGE':
          freshData = await alphaVantageProxyService.fetchSeries(dataType);
          break;
        case 'WORLD_BANK':
          freshData = await worldBankProxyService.fetchSeries(dataType);
          break;
        case 'OECD':
          freshData = await oecdProxyService.fetchSeries(dataType);
          break;
        default:
          console.warn(`⚠️  Unknown provider: ${primaryProvider}`);
          return;
      }

      if (freshData && freshData.success) {
        // Store in cache with appropriate TTL
        await cache.set(cacheKey, freshData, {
          ttl: elementConfig.cacheTTL,
          tags: [`provider:${primaryProvider}`, `dataType:${dataType}`],
          priority: config.priority === 'high' ? 'high' : 'normal',
        });

        console.log(`🔥 Warmed cache for ${dataType} from ${primaryProvider}`);
      }
    } catch (error) {
      console.error(`❌ Failed to warm ${dataType}:`, error);
      
      // Retry logic
      if (config.retryAttempts > 0) {
        const retryConfig = { ...config, retryAttempts: config.retryAttempts - 1 };
        await this.delay(5000); // Wait 5 seconds before retry
        await this.warmDataType(dataType, retryConfig);
      }
    }
  }

  /**
   * Intelligent cache pre-population based on usage patterns
   */
  async prePopulateFrequentlyAccessedData(): Promise<void> {
    console.log('🧠 Starting intelligent cache pre-population...');

    // Get cache access patterns from Redis
    const accessPatterns = await this.getAccessPatterns();
    
    // Sort by access frequency and recency
    const prioritizedDataTypes = accessPatterns
      .sort((a, b) => (b.accessCount * b.recencyScore) - (a.accessCount * a.recencyScore))
      .slice(0, 10); // Top 10 most accessed

    const prePopulationConfig: CacheWarmingConfig = {
      dataTypes: prioritizedDataTypes.map(p => p.dataType),
      priority: 'high',
      schedule: 'immediate',
      staggerDelay: 1000,
      retryAttempts: 2,
      warmingWindow: { start: '00:00', end: '23:59' },
    };

    await this.executeWarmingConfig(prePopulationConfig);
  }

  /**
   * Get cache access patterns from Redis analytics
   */
  private async getAccessPatterns(): Promise<Array<{
    dataType: string;
    accessCount: number;
    recencyScore: number;
    lastAccessed: Date;
  }>> {
    // This would analyze Redis logs or maintain access counters
    // For now, return default high-priority data types
    return [
      { dataType: 'house-prices', accessCount: 100, recencyScore: 0.9, lastAccessed: new Date() },
      { dataType: 'gdp-growth', accessCount: 85, recencyScore: 0.8, lastAccessed: new Date() },
      { dataType: 'unemployment-rate', accessCount: 75, recencyScore: 0.7, lastAccessed: new Date() },
    ];
  }

  /**
   * Check if cached data is still fresh
   */
  private isCacheFresh(cachedData: any, ttl: number): boolean {
    if (!cachedData.timestamp) return false;
    
    const age = Date.now() - new Date(cachedData.timestamp).getTime();
    return age < (ttl * 1000); // TTL is in seconds, age is in milliseconds
  }

  /**
   * Check if current time is within warming window
   */
  private isWithinWarmingWindow(window: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= window.start && currentTime <= window.end;
  }

  /**
   * Convert schedule string to milliseconds
   */
  private getIntervalMs(schedule: string): number {
    switch (schedule) {
      case 'hourly': return 60 * 60 * 1000;
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default to hourly
    }
  }

  /**
   * Update warming metrics
   */
  private updateMetrics(count: number, duration: number, success: boolean): void {
    this.metrics.totalWarmed += count;
    if (success) {
      this.metrics.successful += count;
    } else {
      this.metrics.failed += count;
    }
    
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + duration) / 2;
    this.metrics.lastWarmingTime = new Date();
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get warming metrics
   */
  getMetrics(): CacheWarmingMetrics {
    return { ...this.metrics };
  }

  /**
   * Stop all warming processes
   */
  stopWarming(): void {
    this.warmingIntervals.forEach(interval => clearInterval(interval));
    this.warmingIntervals.clear();
    this.isWarming = false;
    console.log('🛑 Cache warming stopped');
  }
}

// Global instance
export const proactiveCacheService = new ProactiveCacheService();

/**
 * Background Job Scheduler Integration
 */
export interface CacheJobSchedule {
  jobId: string;
  type: 'warming' | 'cleanup' | 'analytics';
  schedule: string; // Cron expression
  config: any;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

class CacheJobScheduler {
  private jobs = new Map<string, CacheJobSchedule>();
  private intervals = new Map<string, NodeJS.Timeout>();

  /**
   * Schedule cache warming jobs
   */
  scheduleWarmingJobs(): void {
    // High-priority data warming every hour
    this.scheduleJob({
      jobId: 'high-priority-warming',
      type: 'warming',
      schedule: '0 * * * *', // Every hour
      config: {
        dataTypes: ['house-prices', 'gdp-growth', 'unemployment-rate'],
        priority: 'high'
      },
      enabled: true,
    });

    // Medium-priority data warming every 6 hours
    this.scheduleJob({
      jobId: 'medium-priority-warming',
      type: 'warming',
      schedule: '0 */6 * * *', // Every 6 hours
      config: {
        dataTypes: ['salary-income', 'cost-of-living'],
        priority: 'medium'
      },
      enabled: true,
    });

    // Cache cleanup daily at 2 AM
    this.scheduleJob({
      jobId: 'daily-cache-cleanup',
      type: 'cleanup',
      schedule: '0 2 * * *', // Daily at 2 AM
      config: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        patterns: ['expired:*', 'temp:*']
      },
      enabled: true,
    });
  }

  private scheduleJob(job: CacheJobSchedule): void {
    this.jobs.set(job.jobId, job);

    // Convert cron to interval (simplified)
    const intervalMs = this.cronToInterval(job.schedule);

    const interval = setInterval(async () => {
      if (job.enabled) {
        await this.executeJob(job);
      }
    }, intervalMs);

    this.intervals.set(job.jobId, interval);
    console.log(`📅 Scheduled cache job: ${job.jobId}`);
  }

  private async executeJob(job: CacheJobSchedule): Promise<void> {
    console.log(`🔄 Executing cache job: ${job.jobId}`);

    try {
      switch (job.type) {
        case 'warming':
          await this.executeWarmingJob(job.config);
          break;
        case 'cleanup':
          await this.executeCleanupJob(job.config);
          break;
        case 'analytics':
          await this.executeAnalyticsJob(job.config);
          break;
      }

      job.lastRun = new Date();
      job.nextRun = new Date(Date.now() + this.cronToInterval(job.schedule));

    } catch (error) {
      console.error(`❌ Cache job failed: ${job.jobId}`, error);
    }
  }

  private async executeWarmingJob(config: any): Promise<void> {
    const warmingConfig: CacheWarmingConfig = {
      dataTypes: config.dataTypes,
      priority: config.priority,
      schedule: 'immediate',
      staggerDelay: 2000,
      retryAttempts: 2,
      warmingWindow: { start: '00:00', end: '23:59' },
    };

    await proactiveCacheService['executeWarmingConfig'](warmingConfig);
  }

  private async executeCleanupJob(config: any): Promise<void> {
    // Implement cache cleanup logic
    console.log('🧹 Executing cache cleanup...', config);
  }

  private async executeAnalyticsJob(config: any): Promise<void> {
    // Implement analytics collection
    console.log('📊 Executing cache analytics...', config);
  }

  private cronToInterval(cron: string): number {
    // Simplified cron parsing - in production, use a proper cron library
    if (cron === '0 * * * *') return 60 * 60 * 1000; // Hourly
    if (cron === '0 */6 * * *') return 6 * 60 * 60 * 1000; // Every 6 hours
    if (cron === '0 2 * * *') return 24 * 60 * 60 * 1000; // Daily
    return 60 * 60 * 1000; // Default to hourly
  }

  getJobs(): CacheJobSchedule[] {
    return Array.from(this.jobs.values());
  }

  stopAllJobs(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    console.log('🛑 All cache jobs stopped');
  }
}

export const cacheJobScheduler = new CacheJobScheduler();

// Auto-initialize on import in production
if (process.env.NODE_ENV === 'production') {
  proactiveCacheService.initializeCacheWarming().catch(console.error);
  cacheJobScheduler.scheduleWarmingJobs();
}
