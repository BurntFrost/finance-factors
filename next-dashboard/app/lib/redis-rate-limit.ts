/**
 * Redis-based Rate Limiting
 * 
 * Distributed rate limiting using Redis for the finance-factors dashboard.
 * Supports sliding window, fixed window, and token bucket algorithms.
 */

import { executeRedisCommand } from './redis';
import { generateCacheKey, CACHE_PREFIXES } from './redis-cache';

// Rate limit configuration interface
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  algorithm: 'sliding' | 'fixed' | 'token-bucket';
  keyGenerator?: (identifier: string) => string;
}

// Rate limit result interface
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
}

// Default rate limit configurations for different providers
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  FRED: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
    algorithm: 'sliding',
  },
  BLS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    algorithm: 'fixed',
  },
  CENSUS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    algorithm: 'sliding',
  },
  ALPHA_VANTAGE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    algorithm: 'fixed',
  },
  DEFAULT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    algorithm: 'sliding',
  },
};

/**
 * Generate rate limit key
 */
function generateRateLimitKey(provider: string, identifier: string): string {
  return generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `${provider}:${identifier}`);
}

/**
 * Sliding window rate limiting using Redis sorted sets
 */
async function slidingWindowRateLimit(
  key: string,
  config: RateLimitConfig,
  identifier: string
): Promise<RateLimitResult> {
  return executeRedisCommand(
    async (client) => {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      // Use Redis pipeline for atomic operations
      const pipeline = client.multi();
      
      // Remove expired entries
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zCard(key);
      
      // Add current request
      pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      
      // Set expiration
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }
      
      const currentCount = (results[1] as number) || 0;
      const allowed = currentCount < config.maxRequests;
      
      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - currentCount - 1),
        resetTime: now + config.windowMs,
        totalRequests: currentCount + 1,
      };
    },
    {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      totalRequests: 0,
    }
  ) ?? {
    allowed: false,
    remaining: 0,
    resetTime: Date.now() + config.windowMs,
    totalRequests: 0,
  };
}

/**
 * Fixed window rate limiting using Redis strings
 */
async function fixedWindowRateLimit(
  key: string,
  config: RateLimitConfig,
  identifier: string
): Promise<RateLimitResult> {
  return executeRedisCommand(
    async (client) => {
      const now = Date.now();
      const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
      const windowKey = `${key}:${windowStart}`;
      
      // Get current count
      const currentCount = await client.get(windowKey);
      const count = currentCount ? parseInt(currentCount, 10) : 0;
      
      const allowed = count < config.maxRequests;
      
      if (allowed) {
        // Increment counter
        await client.incr(windowKey);
        
        // Set expiration if this is the first request in the window
        if (count === 0) {
          await client.expire(windowKey, Math.ceil(config.windowMs / 1000));
        }
      }
      
      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - count - (allowed ? 1 : 0)),
        resetTime: windowStart + config.windowMs,
        totalRequests: count + (allowed ? 1 : 0),
      };
    },
    {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      totalRequests: 0,
    }
  ) ?? {
    allowed: false,
    remaining: 0,
    resetTime: Date.now() + config.windowMs,
    totalRequests: 0,
  };
}

/**
 * Token bucket rate limiting using Redis hash
 */
async function tokenBucketRateLimit(
  key: string,
  config: RateLimitConfig,
  identifier: string
): Promise<RateLimitResult> {
  return executeRedisCommand(
    async (client) => {
      const now = Date.now();
      const refillRate = config.maxRequests / config.windowMs; // tokens per ms
      
      // Get current bucket state
      const bucketData = await client.hGetAll(key);
      
      let tokens = bucketData.tokens ? parseFloat(bucketData.tokens) : config.maxRequests;
      let lastRefill = bucketData.lastRefill ? parseInt(bucketData.lastRefill, 10) : now;
      
      // Calculate tokens to add based on time elapsed
      const timePassed = now - lastRefill;
      const tokensToAdd = timePassed * refillRate;
      tokens = Math.min(config.maxRequests, tokens + tokensToAdd);
      
      const allowed = tokens >= 1;
      
      if (allowed) {
        tokens -= 1;
      }
      
      // Update bucket state
      await client.hSet(key, {
        tokens: tokens.toString(),
        lastRefill: now.toString(),
      });
      
      // Set expiration
      await client.expire(key, Math.ceil(config.windowMs / 1000) * 2);
      
      return {
        allowed,
        remaining: Math.floor(tokens),
        resetTime: now + ((config.maxRequests - tokens) / refillRate),
        totalRequests: 1,
      };
    },
    {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      totalRequests: 0,
    }
  ) ?? {
    allowed: false,
    remaining: 0,
    resetTime: Date.now() + config.windowMs,
    totalRequests: 0,
  };
}

/**
 * Check rate limit for a provider and identifier
 */
export async function checkRateLimit(
  provider: string,
  identifier: string = 'default'
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[provider] || RATE_LIMIT_CONFIGS.DEFAULT;
  const key = generateRateLimitKey(provider, identifier);
  
  switch (config.algorithm) {
    case 'sliding':
      return await slidingWindowRateLimit(key, config, identifier);
    case 'fixed':
      return await fixedWindowRateLimit(key, config, identifier);
    case 'token-bucket':
      return await tokenBucketRateLimit(key, config, identifier);
    default:
      return await slidingWindowRateLimit(key, config, identifier);
  }
}

/**
 * Reset rate limit for a provider and identifier
 */
export async function resetRateLimit(
  provider: string,
  identifier: string = 'default'
): Promise<boolean> {
  const key = generateRateLimitKey(provider, identifier);
  
  return executeRedisCommand(
    async (client) => {
      const deleted = await client.del(key);
      return deleted > 0;
    },
    false
  ) ?? false;
}

/**
 * Get rate limit status without incrementing
 */
export async function getRateLimitStatus(
  provider: string,
  identifier: string = 'default'
): Promise<{
  remaining: number;
  resetTime: number;
  totalRequests: number;
} | null> {
  const config = RATE_LIMIT_CONFIGS[provider] || RATE_LIMIT_CONFIGS.DEFAULT;
  const key = generateRateLimitKey(provider, identifier);
  
  return executeRedisCommand(
    async (client) => {
      const now = Date.now();
      
      if (config.algorithm === 'sliding') {
        const windowStart = now - config.windowMs;
        await client.zRemRangeByScore(key, 0, windowStart);
        const currentCount = await client.zCard(key);
        
        return {
          remaining: Math.max(0, config.maxRequests - currentCount),
          resetTime: now + config.windowMs,
          totalRequests: currentCount,
        };
      } else if (config.algorithm === 'fixed') {
        const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
        const windowKey = `${key}:${windowStart}`;
        const currentCount = await client.get(windowKey);
        const count = currentCount ? parseInt(currentCount, 10) : 0;
        
        return {
          remaining: Math.max(0, config.maxRequests - count),
          resetTime: windowStart + config.windowMs,
          totalRequests: count,
        };
      } else {
        // Token bucket
        const bucketData = await client.hGetAll(key);
        const tokens = bucketData.tokens ? parseFloat(bucketData.tokens) : config.maxRequests;
        
        return {
          remaining: Math.floor(tokens),
          resetTime: now + config.windowMs,
          totalRequests: 0, // Not tracked in token bucket
        };
      }
    },
    null
  );
}

/**
 * Get all rate limit statuses
 */
export async function getAllRateLimitStatuses(): Promise<Record<string, any>> {
  const providers = Object.keys(RATE_LIMIT_CONFIGS);
  const statuses: Record<string, any> = {};
  
  for (const provider of providers) {
    if (provider === 'DEFAULT') continue;
    
    try {
      const status = await getRateLimitStatus(provider);
      statuses[provider] = status;
    } catch (error) {
      statuses[provider] = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  return statuses;
}

/**
 * Clear all rate limit data
 */
export async function clearAllRateLimits(): Promise<number> {
  return executeRedisCommand(
    async (client) => {
      const keys = await client.keys(`${CACHE_PREFIXES.RATE_LIMIT}*`);
      if (keys.length === 0) return 0;
      return await client.del(keys);
    },
    0
  ) ?? 0;
}
