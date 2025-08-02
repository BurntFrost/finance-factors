/**
 * Rate Limit System Integration Tests
 * 
 * Comprehensive tests for the rate limit tracking and circuit breaker functionality
 * including cooldown enforcement, automatic fallback, and recovery behavior.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { rateLimitTracker, RateLimitEvent } from '../lib/backend/lib/rate-limit-tracker';
import { enhancedCircuitBreaker } from '../lib/backend/lib/enhanced-circuit-breaker';
import { rateLimitMonitor } from '../lib/backend/lib/rate-limit-monitor';
import { circuitBreakerService } from '../lib/frontend/services/circuit-breaker-service';

// Mock Redis for testing
jest.mock('../lib/backend/lib/redis', () => ({
  executeRedisCommand: jest.fn().mockImplementation((operation, fallback) => {
    return Promise.resolve(fallback);
  }),
}));

jest.mock('../lib/backend/lib/feature-toggles', () => ({
  isRedisEnabled: jest.fn().mockReturnValue(false), // Use in-memory for tests
}));

// Mock fetch for frontend service interactions
const mockFetch = jest.fn();
// @ts-ignore
global.fetch = mockFetch;

describe('Rate Limit System Integration Tests', () => {
  const testProvider = 'FRED';
  const testDataType = 'treasury-2y';
  const testError = 'FRED API rate limit exceeded';

  beforeEach(async () => {
    // Clear any existing state
    await rateLimitTracker.clearRateLimitStatus(testProvider, testDataType);
    await enhancedCircuitBreaker.clearState(testProvider, testDataType);
    
    // Clear service cache
    circuitBreakerService.clearCache();
  });

  afterEach(async () => {
    // Clean up after each test
    await rateLimitTracker.clearRateLimitStatus(testProvider, testDataType);
    await enhancedCircuitBreaker.clearState(testProvider, testDataType);
  });

  describe('Rate Limit Tracking', () => {
    it('should record rate limit events with timestamps', async () => {
      const rateLimitEvent: RateLimitEvent = {
        provider: testProvider,
        dataType: testDataType,
        timestamp: new Date(),
        error: testError,
        metadata: {
          statusCode: 429,
          requestsRemaining: 0,
        },
      };

      await rateLimitTracker.recordRateLimitEvent(rateLimitEvent);

      const status = await rateLimitTracker.isRateLimited(testProvider, testDataType);
      expect(status.isRateLimited).toBe(true);
      expect(status.consecutiveRateLimits).toBe(1);
      expect(status.totalRateLimits).toBe(1);
      expect(status.lastRateLimitTime).toBeDefined();
      expect(status.cooldownExpiresAt).toBeDefined();
    });

    it('should enforce 24-hour cooldown period', async () => {
      const now = new Date();
      const rateLimitEvent: RateLimitEvent = {
        provider: testProvider,
        dataType: testDataType,
        timestamp: now,
        error: testError,
      };

      await rateLimitTracker.recordRateLimitEvent(rateLimitEvent);

      const status = await rateLimitTracker.isRateLimited(testProvider, testDataType);
      expect(status.isRateLimited).toBe(true);
      
      // Check that cooldown expires in approximately 24 hours
      const cooldownDuration = status.cooldownExpiresAt!.getTime() - now.getTime();
      const expectedDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
      expect(cooldownDuration).toBeGreaterThan(expectedDuration - 1000); // Allow 1s tolerance
      expect(cooldownDuration).toBeLessThan(expectedDuration + 1000);
    });

    it('should extend cooldown for consecutive rate limits', async () => {
      const baseConfig = { maxConsecutiveRateLimits: 2, extendedCooldownMultiplier: 2 };
      const tracker = new (rateLimitTracker.constructor as any)(baseConfig);

      // Record multiple rate limit events
      for (let i = 0; i < 3; i++) {
        const event: RateLimitEvent = {
          provider: testProvider,
          dataType: testDataType,
          timestamp: new Date(Date.now() + i * 1000),
          error: testError,
        };
        await tracker.recordRateLimitEvent(event);
      }

      const status = await tracker.isRateLimited(testProvider, testDataType);
      expect(status.consecutiveRateLimits).toBe(3);
      
      // Should have extended cooldown (2x multiplier)
      const cooldownDuration = status.cooldownExpiresAt!.getTime() - Date.now();
      const expectedExtendedDuration = 24 * 60 * 60 * 1000 * 2; // 48 hours
      expect(cooldownDuration).toBeGreaterThan(expectedExtendedDuration - 5000); // Allow 5s tolerance
    });

    it('should retrieve recent rate limit events', async () => {
      const events: RateLimitEvent[] = [];
      for (let i = 0; i < 3; i++) {
        const event: RateLimitEvent = {
          provider: testProvider,
          dataType: testDataType,
          timestamp: new Date(Date.now() + i * 1000),
          error: `${testError} ${i}`,
        };
        events.push(event);
        await rateLimitTracker.recordRateLimitEvent(event);
      }

      const recentEvents = await rateLimitTracker.getRecentRateLimitEvents(testProvider, testDataType, 10);
      expect(recentEvents).toHaveLength(3);
      expect(recentEvents[0].error).toContain('2'); // Most recent first
    });
  });

  describe('Enhanced Circuit Breaker', () => {
    it('should integrate with rate limit tracker', async () => {
      // Record a rate limit failure
      await enhancedCircuitBreaker.recordFailure(testProvider, testDataType, testError, true);

      const state = await enhancedCircuitBreaker.getCircuitBreakerState(testProvider, testDataType);
      expect(state.state).toBe('rate-limited');
      expect(state.rateLimitStatus?.isRateLimited).toBe(true);
    });

    it('should block requests during rate limit cooldown', async () => {
      // Record a rate limit failure
      await enhancedCircuitBreaker.recordFailure(testProvider, testDataType, testError, true);

      const shouldAllow = await enhancedCircuitBreaker.shouldAllowRequest(testProvider, testDataType);
      expect(shouldAllow).toBe(false);
    });

    it('should allow requests after cooldown expires', async () => {
      // Use a short cooldown for testing
      const shortCooldownConfig = { rateLimitCooldownMs: 100 }; // 100ms
      const circuitBreaker = new (enhancedCircuitBreaker.constructor as any)(shortCooldownConfig);

      // Record a rate limit failure
      await circuitBreaker.recordFailure(testProvider, testDataType, testError, true);

      // Should be blocked initially
      let shouldAllow = await circuitBreaker.shouldAllowRequest(testProvider, testDataType);
      expect(shouldAllow).toBe(false);

      // Wait for cooldown to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed after cooldown
      shouldAllow = await circuitBreaker.shouldAllowRequest(testProvider, testDataType);
      expect(shouldAllow).toBe(true);
    });

    it('should persist state across instances', async () => {
      // Record a failure
      await enhancedCircuitBreaker.recordFailure(testProvider, testDataType, testError, true);

      // Create a new instance (simulating server restart)
      const newCircuitBreaker = new (enhancedCircuitBreaker.constructor as any)();

      // Should still be rate limited
      const state = await newCircuitBreaker.getCircuitBreakerState(testProvider, testDataType);
      expect(state.rateLimitStatus?.isRateLimited).toBe(true);
    });

    it('should recover after successful requests', async () => {
      // Record a failure
      await enhancedCircuitBreaker.recordFailure(testProvider, testDataType, 'Network error', false);

      // Record a success
      await enhancedCircuitBreaker.recordSuccess(testProvider, testDataType);

      const state = await enhancedCircuitBreaker.getCircuitBreakerState(testProvider, testDataType);
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
    });
  });

  describe('Frontend Circuit Breaker Service', () => {
    // Mock fetch for frontend service tests
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should check circuit breaker status via API', async () => {
      const mockResponse = {
        provider: testProvider,
        dataType: testDataType,
        state: 'rate-limited',
        isAllowed: false,
        failureCount: 1,
        rateLimitStatus: {
          isRateLimited: true,
          cooldownExpiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await circuitBreakerService.shouldAllowRequest(testProvider, testDataType);
      expect(result.isAllowed).toBe(false);
      expect(result.state).toBe('rate-limited');
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('should cache circuit breaker status', async () => {
      const mockResponse = {
        provider: testProvider,
        dataType: testDataType,
        state: 'closed',
        isAllowed: true,
        failureCount: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call should make API request
      await circuitBreakerService.shouldAllowRequest(testProvider, testDataType);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await circuitBreakerService.shouldAllowRequest(testProvider, testDataType);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should handle API failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await circuitBreakerService.shouldAllowRequest(testProvider, testDataType);
      expect(result.isAllowed).toBe(true); // Should default to allowing requests
      expect(result.reason).toContain('Circuit breaker check failed');
    });
  });

  describe('Rate Limit Monitor', () => {
    it('should log rate limit events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await rateLimitMonitor.logRateLimitEvent(testProvider, testDataType, testError, {
        statusCode: 429,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RATE_LIMIT]'),
        expect.objectContaining({
          provider: testProvider,
          dataType: testDataType,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should generate monitoring statistics', async () => {
      // Log some events
      await rateLimitMonitor.logRateLimitEvent(testProvider, testDataType, testError);
      await rateLimitMonitor.logCircuitBreakerEvent(testProvider, testDataType, 'open', 'Multiple failures');
      await rateLimitMonitor.logFallbackEvent(testProvider, testDataType, 'Rate limit', 'historical');

      const stats = await rateLimitMonitor.getMonitoringStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.eventsByType.rate_limit).toBe(1);
      expect(stats.eventsByType.circuit_breaker).toBe(1);
      expect(stats.eventsByType.fallback).toBe(1);
    });

    it('should generate monitoring report', async () => {
      await rateLimitMonitor.logRateLimitEvent(testProvider, testDataType, testError);

      const report = await rateLimitMonitor.generateReport();
      expect(report).toContain('Rate Limit Monitoring Report');
      expect(report).toContain('Rate Limit Events: 1');
      expect(report).toContain(testProvider);
    });
  });

  describe('End-to-End Integration', () => {
    it('should handle complete rate limit workflow', async () => {
      // 1. Record rate limit event
      await enhancedCircuitBreaker.recordFailure(testProvider, testDataType, testError, true);

      // 2. Verify circuit breaker blocks requests
      const shouldAllow = await enhancedCircuitBreaker.shouldAllowRequest(testProvider, testDataType);
      expect(shouldAllow).toBe(false);

      // 3. Verify rate limit status is tracked
      const rateLimitStatus = await rateLimitTracker.isRateLimited(testProvider, testDataType);
      expect(rateLimitStatus.isRateLimited).toBe(true);

      // 4. Verify monitoring events are logged
      const stats = await rateLimitMonitor.getMonitoringStats();
      expect(stats.eventsByType.rate_limit).toBeGreaterThan(0);

      // 5. Verify frontend service reflects the state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          provider: testProvider,
          dataType: testDataType,
          state: 'rate-limited',
          isAllowed: false,
          rateLimitStatus: { isRateLimited: true },
        }),
      });

      const frontendCheck = await circuitBreakerService.shouldAllowRequest(testProvider, testDataType);
      expect(frontendCheck.isAllowed).toBe(false);
      expect(frontendCheck.state).toBe('rate-limited');
    });
  });
});
