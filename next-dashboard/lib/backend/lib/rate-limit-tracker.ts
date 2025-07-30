/**
 * Rate Limit Tracker Service
 * 
 * Tracks rate limit events with timestamps in Redis cache and manages
 * 24-hour cooldown periods for specific provider/dataType combinations.
 * Implements circuit breaker functionality to prevent unnecessary API calls
 * during rate limit periods.
 */

import { executeRedisCommand } from './redis';
import { generateCacheKey, CACHE_PREFIXES } from './redis-cache';
import { isRedisEnabled } from './feature-toggles';

// Rate limit event types
export interface RateLimitEvent {
  provider: string;
  dataType: string;
  timestamp: Date;
  error?: string;
  metadata?: {
    requestsRemaining?: number;
    resetTime?: Date;
    statusCode?: number;
    [key: string]: any;
  };
}

// Rate limit status for a provider/dataType combination
export interface RateLimitStatus {
  isRateLimited: boolean;
  lastRateLimitTime?: Date;
  cooldownExpiresAt?: Date;
  consecutiveRateLimits: number;
  totalRateLimits: number;
}

// Configuration for rate limit tracking
export interface RateLimitTrackerConfig {
  cooldownPeriodMs: number; // 24 hours by default
  maxConsecutiveRateLimits: number; // Threshold for extended cooldown
  extendedCooldownMultiplier: number; // Multiplier for extended cooldown
  cleanupIntervalMs: number; // How often to clean up old entries
}

// Default configuration
const DEFAULT_CONFIG: RateLimitTrackerConfig = {
  cooldownPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
  maxConsecutiveRateLimits: 3, // After 3 consecutive rate limits, extend cooldown
  extendedCooldownMultiplier: 2, // Double the cooldown period
  cleanupIntervalMs: 60 * 60 * 1000, // Clean up every hour
};

/**
 * Rate Limit Tracker Service Class
 */
export class RateLimitTracker {
  private config: RateLimitTrackerConfig;
  private inMemoryCache: Map<string, RateLimitEvent[]> = new Map();
  private lastCleanup: Date = new Date();

  constructor(config: Partial<RateLimitTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate Redis key for rate limit tracking
   */
  private generateRateLimitKey(provider: string, dataType: string): string {
    return generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `${provider}:${dataType}`);
  }

  /**
   * Generate Redis key for rate limit status
   */
  private generateStatusKey(provider: string, dataType: string): string {
    return generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `status:${provider}:${dataType}`);
  }

  /**
   * Record a rate limit event
   */
  async recordRateLimitEvent(event: RateLimitEvent): Promise<void> {
    const key = this.generateRateLimitKey(event.provider, event.dataType);
    const statusKey = this.generateStatusKey(event.provider, event.dataType);

    if (isRedisEnabled()) {
      await executeRedisCommand(
        async (client) => {
          // Store the rate limit event
          const eventData = JSON.stringify({
            ...event,
            timestamp: event.timestamp.toISOString(),
          });

          // Add to sorted set with timestamp as score for easy querying
          await client.zAdd(key, {
            score: event.timestamp.getTime(),
            value: eventData,
          });

          // Set expiration to cleanup old entries (keep for 7 days for analysis)
          await client.expire(key, 7 * 24 * 60 * 60);

          // Update status
          await this.updateRateLimitStatus(event.provider, event.dataType, client);
        },
        null
      );
    } else {
      // Fallback to in-memory storage
      this.recordRateLimitEventInMemory(event);
    }

    console.warn(`🚫 Rate limit recorded for ${event.provider}:${event.dataType} at ${event.timestamp.toISOString()}`);
  }

  /**
   * Update rate limit status in Redis
   */
  private async updateRateLimitStatus(
    provider: string,
    dataType: string,
    client?: any
  ): Promise<void> {
    const statusKey = this.generateStatusKey(provider, dataType);
    const eventsKey = this.generateRateLimitKey(provider, dataType);

    const executeUpdate = async (redisClient: any) => {
      const now = Date.now();
      const cooldownStart = now - this.config.cooldownPeriodMs;

      // Get recent rate limit events (within cooldown period)
      const recentEvents = await redisClient.zRangeByScore(
        eventsKey,
        cooldownStart,
        now
      );

      const consecutiveRateLimits = recentEvents.length;
      const lastEvent = recentEvents.length > 0 ? 
        JSON.parse(recentEvents[recentEvents.length - 1]) : null;

      // Calculate cooldown expiration
      let cooldownExpiresAt: Date | null = null;
      if (lastEvent) {
        const lastEventTime = new Date(lastEvent.timestamp);
        let cooldownPeriod = this.config.cooldownPeriodMs;

        // Extend cooldown for repeated rate limits
        if (consecutiveRateLimits >= this.config.maxConsecutiveRateLimits) {
          cooldownPeriod *= this.config.extendedCooldownMultiplier;
        }

        cooldownExpiresAt = new Date(lastEventTime.getTime() + cooldownPeriod);
      }

      // Get total rate limits (all time)
      const totalRateLimits = await redisClient.zCard(eventsKey);

      const status: RateLimitStatus = {
        isRateLimited: cooldownExpiresAt ? cooldownExpiresAt > new Date() : false,
        lastRateLimitTime: lastEvent ? new Date(lastEvent.timestamp) : undefined,
        cooldownExpiresAt: cooldownExpiresAt || undefined,
        consecutiveRateLimits,
        totalRateLimits,
      };

      // Store status with expiration
      await redisClient.setEx(
        statusKey,
        Math.ceil(this.config.cooldownPeriodMs / 1000) * 2, // Double the cooldown for safety
        JSON.stringify({
          ...status,
          lastRateLimitTime: status.lastRateLimitTime?.toISOString(),
          cooldownExpiresAt: status.cooldownExpiresAt?.toISOString(),
        })
      );

      return status;
    };

    if (client) {
      await executeUpdate(client);
    } else if (isRedisEnabled()) {
      await executeRedisCommand(executeUpdate, null);
    }
  }

  /**
   * Check if a provider/dataType combination is currently rate limited
   */
  async isRateLimited(provider: string, dataType: string): Promise<RateLimitStatus> {
    const statusKey = this.generateStatusKey(provider, dataType);

    if (isRedisEnabled()) {
      const result = await executeRedisCommand(
        async (client) => {
          const statusData = await client.get(statusKey);
          if (!statusData) {
            // No status found, check if we have any events and update status
            await this.updateRateLimitStatus(provider, dataType, client);
            const updatedStatusData = await client.get(statusKey);
            return updatedStatusData ? JSON.parse(updatedStatusData) : null;
          }
          return JSON.parse(statusData);
        },
        null
      );

      if (result) {
        return {
          ...result,
          lastRateLimitTime: result.lastRateLimitTime ? new Date(result.lastRateLimitTime) : undefined,
          cooldownExpiresAt: result.cooldownExpiresAt ? new Date(result.cooldownExpiresAt) : undefined,
        };
      }
    } else {
      // Fallback to in-memory check
      return this.isRateLimitedInMemory(provider, dataType);
    }

    // Default: not rate limited
    return {
      isRateLimited: false,
      consecutiveRateLimits: 0,
      totalRateLimits: 0,
    };
  }

  /**
   * Get recent rate limit events for analysis
   */
  async getRecentRateLimitEvents(
    provider?: string,
    dataType?: string,
    limit: number = 100
  ): Promise<RateLimitEvent[]> {
    if (isRedisEnabled()) {
      return await executeRedisCommand(
        async (client) => {
          const events: RateLimitEvent[] = [];
          const now = Date.now();
          const oneDayAgo = now - (24 * 60 * 60 * 1000);

          if (provider && dataType) {
            // Get events for specific provider/dataType
            const key = this.generateRateLimitKey(provider, dataType);
            const eventData = await client.zRangeByScore(key, oneDayAgo, now, {
              LIMIT: { offset: 0, count: limit }
            });

            for (const data of eventData) {
              try {
                const event = JSON.parse(data);
                events.push({
                  ...event,
                  timestamp: new Date(event.timestamp),
                });
              } catch (error) {
                console.warn('Failed to parse rate limit event:', error);
              }
            }
          } else {
            // Get events for all providers (scan pattern)
            const pattern = generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, '*');
            const keys = await client.keys(pattern);

            for (const key of keys.slice(0, 10)) { // Limit to prevent performance issues
              if (key.includes(':status:')) continue; // Skip status keys

              const eventData = await client.zRangeByScore(key, oneDayAgo, now, {
                LIMIT: { offset: 0, count: Math.ceil(limit / 10) }
              });

              for (const data of eventData) {
                try {
                  const event = JSON.parse(data);
                  events.push({
                    ...event,
                    timestamp: new Date(event.timestamp),
                  });
                } catch (error) {
                  console.warn('Failed to parse rate limit event:', error);
                }
              }
            }
          }

          // Sort by timestamp descending
          return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        },
        []
      );
    } else {
      // Fallback to in-memory events
      return this.getRecentRateLimitEventsInMemory(provider, dataType, limit);
    }
  }

  /**
   * Clear rate limit status for a provider/dataType (for testing or manual override)
   */
  async clearRateLimitStatus(provider: string, dataType: string): Promise<void> {
    const statusKey = this.generateStatusKey(provider, dataType);
    const eventsKey = this.generateRateLimitKey(provider, dataType);

    if (isRedisEnabled()) {
      await executeRedisCommand(
        async (client) => {
          await client.del(statusKey);
          await client.del(eventsKey);
        },
        null
      );
    } else {
      // Clear from in-memory cache
      const key = `${provider}:${dataType}`;
      this.inMemoryCache.delete(key);
    }

    console.info(`✅ Cleared rate limit status for ${provider}:${dataType}`);
  }

  /**
   * In-memory fallback methods
   */
  private recordRateLimitEventInMemory(event: RateLimitEvent): void {
    const key = `${event.provider}:${event.dataType}`;
    const events = this.inMemoryCache.get(key) || [];
    events.push(event);

    // Keep only recent events (last 24 hours)
    const cutoff = new Date(Date.now() - this.config.cooldownPeriodMs);
    const recentEvents = events.filter(e => e.timestamp > cutoff);
    
    this.inMemoryCache.set(key, recentEvents);
    this.cleanupInMemoryCache();
  }

  private isRateLimitedInMemory(provider: string, dataType: string): RateLimitStatus {
    const key = `${provider}:${dataType}`;
    const events = this.inMemoryCache.get(key) || [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.config.cooldownPeriodMs);

    // Filter to recent events
    const recentEvents = events.filter(e => e.timestamp > cutoff);
    const lastEvent = recentEvents.length > 0 ? recentEvents[recentEvents.length - 1] : null;

    let cooldownExpiresAt: Date | undefined;
    if (lastEvent) {
      let cooldownPeriod = this.config.cooldownPeriodMs;
      if (recentEvents.length >= this.config.maxConsecutiveRateLimits) {
        cooldownPeriod *= this.config.extendedCooldownMultiplier;
      }
      cooldownExpiresAt = new Date(lastEvent.timestamp.getTime() + cooldownPeriod);
    }

    return {
      isRateLimited: cooldownExpiresAt ? cooldownExpiresAt > now : false,
      lastRateLimitTime: lastEvent?.timestamp,
      cooldownExpiresAt,
      consecutiveRateLimits: recentEvents.length,
      totalRateLimits: events.length,
    };
  }

  private getRecentRateLimitEventsInMemory(
    provider?: string,
    dataType?: string,
    limit: number = 100
  ): RateLimitEvent[] {
    const allEvents: RateLimitEvent[] = [];
    const cutoff = new Date(Date.now() - (24 * 60 * 60 * 1000));

    for (const [key, events] of this.inMemoryCache.entries()) {
      if (provider && dataType && key !== `${provider}:${dataType}`) {
        continue;
      }

      const recentEvents = events.filter(e => e.timestamp > cutoff);
      allEvents.push(...recentEvents);
    }

    return allEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private cleanupInMemoryCache(): void {
    const now = new Date();
    if (now.getTime() - this.lastCleanup.getTime() < this.config.cleanupIntervalMs) {
      return;
    }

    const cutoff = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Keep 7 days
    for (const [key, events] of this.inMemoryCache.entries()) {
      const recentEvents = events.filter(e => e.timestamp > cutoff);
      if (recentEvents.length === 0) {
        this.inMemoryCache.delete(key);
      } else {
        this.inMemoryCache.set(key, recentEvents);
      }
    }

    this.lastCleanup = now;
  }
}

// Export singleton instance
export const rateLimitTracker = new RateLimitTracker();
