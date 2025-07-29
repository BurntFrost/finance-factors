/**
 * International Data Cache Service
 * 
 * Specialized caching service for OECD and World Bank APIs
 * Handles their unique data formats, rate limits, and caching requirements.
 */

import { cache } from '../lib/advanced-cache';
import { worldBankProxyService } from '../../app/api/services/world-bank-proxy';
import { oecdProxyService } from '../../app/api/services/oecd-proxy';
import { CACHE_PREFIXES, DEFAULT_TTL } from '../lib/redis-cache';
import { DataSourceConfigManager } from '../../shared/config/dualDataSourceConfig';

export interface InternationalDataConfig {
  provider: 'WORLD_BANK' | 'OECD';
  dataType: string;
  countryCode: string;
  indicatorId: string;
  updateFrequency: 'monthly' | 'quarterly' | 'annually';
  cacheTTL: number;
  priority: 'high' | 'medium' | 'low';
}

export interface InternationalCacheMetrics {
  worldBankRequests: number;
  oecdRequests: number;
  worldBankHitRate: number;
  oecdHitRate: number;
  averageResponseTime: {
    worldBank: number;
    oecd: number;
  };
  lastUpdate: Date;
}

class InternationalDataCacheService {
  private metrics: InternationalCacheMetrics = {
    worldBankRequests: 0,
    oecdRequests: 0,
    worldBankHitRate: 0,
    oecdHitRate: 0,
    averageResponseTime: {
      worldBank: 0,
      oecd: 0,
    },
    lastUpdate: new Date(),
  };

  // Configuration for international data sources
  private readonly INTERNATIONAL_DATA_CONFIGS: InternationalDataConfig[] = [
    // World Bank configurations
    {
      provider: 'WORLD_BANK',
      dataType: 'world-bank-gdp-us',
      countryCode: 'USA',
      indicatorId: 'NY.GDP.MKTP.CD',
      updateFrequency: 'quarterly',
      cacheTTL: 7 * 24 * 60 * 60, // 7 days
      priority: 'high',
    },
    {
      provider: 'WORLD_BANK',
      dataType: 'world-bank-inflation-us',
      countryCode: 'USA',
      indicatorId: 'FP.CPI.TOTL.ZG',
      updateFrequency: 'monthly',
      cacheTTL: 24 * 60 * 60, // 1 day
      priority: 'high',
    },
    {
      provider: 'WORLD_BANK',
      dataType: 'world-bank-unemployment-us',
      countryCode: 'USA',
      indicatorId: 'SL.UEM.TOTL.ZS',
      updateFrequency: 'monthly',
      cacheTTL: 24 * 60 * 60, // 1 day
      priority: 'medium',
    },
    {
      provider: 'WORLD_BANK',
      dataType: 'world-bank-trade-us',
      countryCode: 'USA',
      indicatorId: 'NE.TRD.GNFS.ZS',
      updateFrequency: 'quarterly',
      cacheTTL: 7 * 24 * 60 * 60, // 7 days
      priority: 'medium',
    },
    {
      provider: 'WORLD_BANK',
      dataType: 'world-bank-gdp-global',
      countryCode: 'WLD',
      indicatorId: 'NY.GDP.MKTP.CD',
      updateFrequency: 'quarterly',
      cacheTTL: 14 * 24 * 60 * 60, // 14 days
      priority: 'low',
    },
    // OECD configurations
    {
      provider: 'OECD',
      dataType: 'oecd-gdp-us',
      countryCode: 'USA',
      indicatorId: 'GDP',
      updateFrequency: 'quarterly',
      cacheTTL: 7 * 24 * 60 * 60, // 7 days
      priority: 'high',
    },
    {
      provider: 'OECD',
      dataType: 'oecd-employment-us',
      countryCode: 'USA',
      indicatorId: 'EMPLOYMENT',
      updateFrequency: 'monthly',
      cacheTTL: 24 * 60 * 60, // 1 day
      priority: 'medium',
    },
    {
      provider: 'OECD',
      dataType: 'oecd-productivity-us',
      countryCode: 'USA',
      indicatorId: 'PRODUCTIVITY',
      updateFrequency: 'quarterly',
      cacheTTL: 7 * 24 * 60 * 60, // 7 days
      priority: 'medium',
    },
    {
      provider: 'OECD',
      dataType: 'oecd-interest-rates-us',
      countryCode: 'USA',
      indicatorId: 'INTEREST_RATES',
      updateFrequency: 'monthly',
      cacheTTL: 24 * 60 * 60, // 1 day
      priority: 'low',
    },
  ];

  /**
   * Initialize international data caching
   */
  async initializeInternationalCaching(): Promise<void> {
    console.log('🌍 Initializing international data caching...');

    // Warm high-priority international data
    const highPriorityConfigs = this.INTERNATIONAL_DATA_CONFIGS.filter(
      config => config.priority === 'high'
    );

    for (const config of highPriorityConfigs) {
      await this.warmInternationalData(config);
      await this.delay(3000); // 3 second delay between requests
    }

    console.log('✅ International data caching initialized');
  }

  /**
   * Warm cache for specific international data configuration
   */
  private async warmInternationalData(config: InternationalDataConfig): Promise<void> {
    const cacheKey = this.generateInternationalCacheKey(config);
    
    try {
      // Check if data is already cached and fresh
      const existingData = await cache.get(cacheKey);
      if (existingData && this.isCacheFresh(existingData, config.cacheTTL)) {
        console.log(`💾 International cache already fresh for ${config.dataType}`);
        return;
      }

      const startTime = Date.now();
      let freshData;

      // Fetch data based on provider
      if (config.provider === 'WORLD_BANK') {
        freshData = await worldBankProxyService.fetchSeries(config.dataType, {
          countryCode: config.countryCode,
          useCache: false,
        });
        this.metrics.worldBankRequests++;
      } else if (config.provider === 'OECD') {
        freshData = await oecdProxyService.fetchSeries(config.dataType, {
          countryCode: config.countryCode,
          useCache: false,
        });
        this.metrics.oecdRequests++;
      }

      if (freshData && freshData.success) {
        // Store in cache with appropriate TTL
        await cache.set(cacheKey, freshData, {
          ttl: config.cacheTTL,
          tags: [
            `provider:${config.provider}`,
            `dataType:${config.dataType}`,
            `country:${config.countryCode}`,
            'international-data'
          ],
          priority: config.priority === 'high' ? 'high' : 'normal',
        });

        const duration = Date.now() - startTime;
        this.updateResponseTimeMetrics(config.provider, duration);

        console.log(`🌍 Warmed international cache for ${config.dataType} from ${config.provider}`);
      }
    } catch (error) {
      console.error(`❌ Failed to warm international data ${config.dataType}:`, error);
    }
  }

  /**
   * Schedule international data warming based on update frequencies
   */
  scheduleInternationalDataWarming(): void {
    console.log('📅 Scheduling international data warming...');

    // Monthly data warming (every 6 hours)
    const monthlyConfigs = this.INTERNATIONAL_DATA_CONFIGS.filter(
      config => config.updateFrequency === 'monthly'
    );
    this.scheduleWarmingForConfigs(monthlyConfigs, 6 * 60 * 60 * 1000); // 6 hours

    // Quarterly data warming (daily)
    const quarterlyConfigs = this.INTERNATIONAL_DATA_CONFIGS.filter(
      config => config.updateFrequency === 'quarterly'
    );
    this.scheduleWarmingForConfigs(quarterlyConfigs, 24 * 60 * 60 * 1000); // 24 hours

    // Annual data warming (weekly)
    const annualConfigs = this.INTERNATIONAL_DATA_CONFIGS.filter(
      config => config.updateFrequency === 'annually'
    );
    this.scheduleWarmingForConfigs(annualConfigs, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  /**
   * Schedule warming for specific configurations
   */
  private scheduleWarmingForConfigs(
    configs: InternationalDataConfig[],
    intervalMs: number
  ): void {
    setInterval(async () => {
      for (const config of configs) {
        await this.warmInternationalData(config);
        await this.delay(5000); // 5 second delay between requests
      }
    }, intervalMs);
  }

  /**
   * Generate cache key for international data
   */
  private generateInternationalCacheKey(config: InternationalDataConfig): string {
    return `${CACHE_PREFIXES.API_RESPONSE}${config.provider.toLowerCase()}:${config.dataType}:${config.countryCode}:${config.indicatorId}`;
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
   * Update response time metrics
   */
  private updateResponseTimeMetrics(provider: 'WORLD_BANK' | 'OECD', duration: number): void {
    if (provider === 'WORLD_BANK') {
      this.metrics.averageResponseTime.worldBank = 
        (this.metrics.averageResponseTime.worldBank + duration) / 2;
    } else {
      this.metrics.averageResponseTime.oecd = 
        (this.metrics.averageResponseTime.oecd + duration) / 2;
    }
    this.metrics.lastUpdate = new Date();
  }

  /**
   * Get international data configurations
   */
  getInternationalConfigs(): InternationalDataConfig[] {
    return [...this.INTERNATIONAL_DATA_CONFIGS];
  }

  /**
   * Get international cache metrics
   */
  getMetrics(): InternationalCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Invalidate international data cache by country or provider
   */
  async invalidateInternationalCache(
    filter: { provider?: string; countryCode?: string; dataType?: string }
  ): Promise<void> {
    const tags = [];
    
    if (filter.provider) tags.push(`provider:${filter.provider}`);
    if (filter.countryCode) tags.push(`country:${filter.countryCode}`);
    if (filter.dataType) tags.push(`dataType:${filter.dataType}`);
    
    if (tags.length === 0) {
      tags.push('international-data');
    }

    for (const tag of tags) {
      await cache.invalidateByTag(tag);
    }

    console.log(`🗑️ Invalidated international cache for tags: ${tags.join(', ')}`);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance
export const internationalDataCacheService = new InternationalDataCacheService();

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  internationalDataCacheService.initializeInternationalCaching().catch(console.error);
  internationalDataCacheService.scheduleInternationalDataWarming();
}
