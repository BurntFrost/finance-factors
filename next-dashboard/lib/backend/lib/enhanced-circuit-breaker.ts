/**
 * Enhanced Circuit Breaker with Rate Limit Integration
 * 
 * Extends the existing circuit breaker functionality to integrate with
 * the rate limit tracker service, providing persistent rate limit state
 * management across server restarts and multiple instances.
 */

import { executeRedisCommand } from './redis';
import { generateCacheKey, CACHE_PREFIXES } from './redis-cache';
import { isRedisEnabled } from './feature-toggles';
import { rateLimitTracker, RateLimitEvent, RateLimitStatus } from './rate-limit-tracker';
import { rateLimitMonitor } from './rate-limit-monitor';

// Enhanced circuit breaker states
export type EnhancedCircuitBreakerState = 'closed' | 'open' | 'half-open' | 'rate-limited';

// Enhanced circuit breaker info with rate limit integration
export interface EnhancedCircuitBreakerInfo {
  state: EnhancedCircuitBreakerState;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
  rateLimitStatus?: RateLimitStatus;
  metadata?: {
    lastError?: string;
    consecutiveRateLimits?: number;
    totalRequests?: number;
    successRate?: number;
    [key: string]: any;
  };
}

// Configuration for enhanced circuit breaker
export interface EnhancedCircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  halfOpenMaxAttempts: number;
  rateLimitCooldownMs: number;
  persistState: boolean;
  stateExpirationMs: number;
}

// Default configuration
const DEFAULT_CONFIG: EnhancedCircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeoutMs: 60000, // 1 minute
  halfOpenMaxAttempts: 1,
  rateLimitCooldownMs: 24 * 60 * 60 * 1000, // 24 hours
  persistState: true,
  stateExpirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Enhanced Circuit Breaker Service Class
 */
export class EnhancedCircuitBreaker {
  private config: EnhancedCircuitBreakerConfig;
  private inMemoryState: Map<string, EnhancedCircuitBreakerInfo> = new Map();

  constructor(config: Partial<EnhancedCircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate Redis key for circuit breaker state
   */
  private generateStateKey(provider: string, dataType: string): string {
    return generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `circuit:${provider}:${dataType}`);
  }

  /**
   * Get circuit breaker state for a provider/dataType combination
   */
  async getCircuitBreakerState(provider: string, dataType: string): Promise<EnhancedCircuitBreakerInfo> {
    const key = `${provider}:${dataType}`;
    
    // Check rate limit status first
    const rateLimitStatus = await rateLimitTracker.isRateLimited(provider, dataType);

    if (this.config.persistState && isRedisEnabled()) {
      const stateKey = this.generateStateKey(provider, dataType);
      
      const state = await executeRedisCommand(
        async (client) => {
          const stateData = await client.get(stateKey);
          return stateData ? JSON.parse(stateData) : null;
        },
        null
      );

      if (state) {
        const circuitBreakerInfo: EnhancedCircuitBreakerInfo = {
          ...state,
          lastFailureTime: state.lastFailureTime ? new Date(state.lastFailureTime) : null,
          nextRetryTime: state.nextRetryTime ? new Date(state.nextRetryTime) : null,
          rateLimitStatus,
        };

        // Update state based on rate limit status
        if (rateLimitStatus.isRateLimited && circuitBreakerInfo.state !== 'rate-limited') {
          circuitBreakerInfo.state = 'rate-limited';
          await this.persistState(provider, dataType, circuitBreakerInfo);
        } else if (!rateLimitStatus.isRateLimited && circuitBreakerInfo.state === 'rate-limited') {
          // Rate limit has expired, check if we should close the circuit
          if (circuitBreakerInfo.failureCount < this.config.failureThreshold) {
            circuitBreakerInfo.state = 'closed';
            await this.persistState(provider, dataType, circuitBreakerInfo);
          }
        }

        return circuitBreakerInfo;
      }
    }

    // Fallback to in-memory state or create new state
    let state = this.inMemoryState.get(key);
    if (!state) {
      state = {
        state: rateLimitStatus.isRateLimited ? 'rate-limited' : 'closed',
        failureCount: 0,
        lastFailureTime: null,
        nextRetryTime: null,
        rateLimitStatus,
        metadata: {},
      };
      this.inMemoryState.set(key, state);
    } else {
      // Update with current rate limit status
      state.rateLimitStatus = rateLimitStatus;
      if (rateLimitStatus.isRateLimited && state.state !== 'rate-limited') {
        state.state = 'rate-limited';
      } else if (!rateLimitStatus.isRateLimited && state.state === 'rate-limited') {
        if (state.failureCount < this.config.failureThreshold) {
          state.state = 'closed';
        }
      }
    }

    return state;
  }

  /**
   * Record a successful request
   */
  async recordSuccess(provider: string, dataType: string): Promise<void> {
    const state = await this.getCircuitBreakerState(provider, dataType);
    
    // Reset failure count and close circuit on success
    state.failureCount = 0;
    state.lastFailureTime = null;
    state.nextRetryTime = null;

    // Only close if not rate limited
    if (!state.rateLimitStatus?.isRateLimited) {
      state.state = 'closed';
    }

    state.metadata = {
      ...state.metadata,
      lastSuccess: new Date().toISOString(),
    };

    await this.persistState(provider, dataType, state);

    // Log recovery event
    await rateLimitMonitor.logRecoveryEvent(provider, dataType, 'circuit_breaker', {
      previousState: state.state,
      failureCount: state.failureCount,
    });

    console.debug(`✅ Circuit breaker success recorded for ${provider}:${dataType}`);
  }

  /**
   * Record a failure and update circuit breaker state
   */
  async recordFailure(
    provider: string,
    dataType: string,
    error: string,
    isRateLimit: boolean = false
  ): Promise<void> {
    const state = await this.getCircuitBreakerState(provider, dataType);
    const now = new Date();

    state.failureCount += 1;
    state.lastFailureTime = now;
    state.metadata = {
      ...state.metadata,
      lastError: error,
      lastFailure: now.toISOString(),
    };

    if (isRateLimit) {
      // Record rate limit event
      const rateLimitEvent: RateLimitEvent = {
        provider,
        dataType,
        timestamp: now,
        error,
        metadata: {
          circuitBreakerState: state.state,
          failureCount: state.failureCount,
        },
      };

      await rateLimitTracker.recordRateLimitEvent(rateLimitEvent);

      // Update state to rate-limited
      state.state = 'rate-limited';
      state.nextRetryTime = new Date(now.getTime() + this.config.rateLimitCooldownMs);

      // Update metadata
      state.metadata.consecutiveRateLimits = (state.metadata.consecutiveRateLimits || 0) + 1;

      // Log rate limit event to monitor
      await rateLimitMonitor.logRateLimitEvent(provider, dataType, error, {
        consecutiveRateLimits: state.metadata.consecutiveRateLimits,
        cooldownExpiresAt: state.nextRetryTime,
        circuitBreakerState: state.state,
      });

      console.warn(`🚫 Rate limit recorded for ${provider}:${dataType}. Next retry: ${state.nextRetryTime.toISOString()}`);
    } else {
      // Regular failure - check if we should open the circuit
      if (state.failureCount >= this.config.failureThreshold) {
        state.state = 'open';
        state.nextRetryTime = new Date(now.getTime() + this.config.recoveryTimeoutMs);

        // Log circuit breaker opening
        await rateLimitMonitor.logCircuitBreakerEvent(
          provider,
          dataType,
          'open',
          `Multiple failures (${state.failureCount})`,
          {
            failureCount: state.failureCount,
            nextRetryTime: state.nextRetryTime,
            lastError: error,
          }
        );

        console.warn(`⚡ Circuit breaker opened for ${provider}:${dataType} after ${state.failureCount} failures. Next retry: ${state.nextRetryTime.toISOString()}`);
      }
    }

    await this.persistState(provider, dataType, state);
  }

  /**
   * Check if a request should be allowed
   */
  async shouldAllowRequest(provider: string, dataType: string): Promise<boolean> {
    const state = await this.getCircuitBreakerState(provider, dataType);
    const now = new Date();

    switch (state.state) {
      case 'closed':
        return true;

      case 'open':
        // Check if recovery timeout has passed
        if (state.nextRetryTime && now >= state.nextRetryTime) {
          // Transition to half-open
          state.state = 'half-open';
          await this.persistState(provider, dataType, state);
          return true;
        }
        return false;

      case 'half-open':
        // Allow limited requests in half-open state
        return true;

      case 'rate-limited':
        // Check if rate limit cooldown has passed
        if (state.rateLimitStatus?.cooldownExpiresAt) {
          if (now >= state.rateLimitStatus.cooldownExpiresAt) {
            // Rate limit has expired, transition to closed if no other failures
            if (state.failureCount < this.config.failureThreshold) {
              state.state = 'closed';
              await this.persistState(provider, dataType, state);
              return true;
            } else {
              // Still have failures, transition to open
              state.state = 'open';
              state.nextRetryTime = new Date(now.getTime() + this.config.recoveryTimeoutMs);
              await this.persistState(provider, dataType, state);
              return false;
            }
          }
        }
        return false;

      default:
        return true;
    }
  }

  /**
   * Get all circuit breaker states for monitoring
   */
  async getAllStates(): Promise<Map<string, EnhancedCircuitBreakerInfo>> {
    const states = new Map<string, EnhancedCircuitBreakerInfo>();

    if (this.config.persistState && isRedisEnabled()) {
      await executeRedisCommand(
        async (client) => {
          const pattern = generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, 'circuit:*');
          const keys = await client.keys(pattern);

          for (const key of keys) {
            const stateData = await client.get(key);
            if (stateData) {
              const state = JSON.parse(stateData);
              const keyParts = key.split(':');
              const provider = keyParts[keyParts.length - 2];
              const dataType = keyParts[keyParts.length - 1];
              const stateKey = `${provider}:${dataType}`;

              states.set(stateKey, {
                ...state,
                lastFailureTime: state.lastFailureTime ? new Date(state.lastFailureTime) : null,
                nextRetryTime: state.nextRetryTime ? new Date(state.nextRetryTime) : null,
              });
            }
          }
        },
        null
      );
    } else {
      // Return in-memory states
      for (const [key, state] of this.inMemoryState.entries()) {
        states.set(key, state);
      }
    }

    return states;
  }

  /**
   * Clear circuit breaker state (for testing or manual reset)
   */
  async clearState(provider: string, dataType: string): Promise<void> {
    const key = `${provider}:${dataType}`;
    
    if (this.config.persistState && isRedisEnabled()) {
      const stateKey = this.generateStateKey(provider, dataType);
      await executeRedisCommand(
        async (client) => {
          await client.del(stateKey);
        },
        null
      );
    }

    this.inMemoryState.delete(key);
    
    // Also clear rate limit status
    await rateLimitTracker.clearRateLimitStatus(provider, dataType);
    
    console.info(`✅ Cleared circuit breaker state for ${provider}:${dataType}`);
  }

  /**
   * Persist circuit breaker state to Redis
   */
  private async persistState(
    provider: string,
    dataType: string,
    state: EnhancedCircuitBreakerInfo
  ): Promise<void> {
    const key = `${provider}:${dataType}`;
    
    // Update in-memory state
    this.inMemoryState.set(key, state);

    if (this.config.persistState && isRedisEnabled()) {
      const stateKey = this.generateStateKey(provider, dataType);
      
      await executeRedisCommand(
        async (client) => {
          const stateData = JSON.stringify({
            ...state,
            lastFailureTime: state.lastFailureTime?.toISOString(),
            nextRetryTime: state.nextRetryTime?.toISOString(),
            // Don't persist rateLimitStatus as it's fetched fresh each time
            rateLimitStatus: undefined,
          });

          await client.setEx(
            stateKey,
            Math.ceil(this.config.stateExpirationMs / 1000),
            stateData
          );
        },
        null
      );
    }
  }
}

// Export singleton instance
export const enhancedCircuitBreaker = new EnhancedCircuitBreaker();
