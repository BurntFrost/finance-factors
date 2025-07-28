/**
 * Redis Error Handling Tests
 * 
 * Comprehensive test suite for Redis error scenarios and fallback mechanisms.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { redisErrorLogger, RedisErrorType, RedisOperationType, RedisErrorSeverity } from '../app/lib/redis-error-logger';
import { redisFallbackService } from '../app/lib/redis-fallback-service';
import { redisHealthMonitor } from '../app/lib/redis-health-monitor';
import { userExperienceService } from '../app/lib/user-experience-service';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  ping: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
  isOpen: true,
};

// Mock Redis module
jest.mock('../app/lib/redis', () => ({
  executeRedisCommand: jest.fn(),
  isRedisAvailable: jest.fn(),
  getRedisClient: jest.fn(() => Promise.resolve(mockRedisClient)),
}));

describe('Redis Error Logger', () => {
  beforeEach(() => {
    redisErrorLogger.reset();
  });

  it('should classify connection errors correctly', () => {
    const connectionError = new Error('ECONNREFUSED');
    
    redisErrorLogger.logError(connectionError, {
      operation: RedisOperationType.CONNECT,
      command: 'test_connect',
    });

    const metrics = redisErrorLogger.getMetrics();
    expect(metrics.failedOperations).toBe(1);
    expect(metrics.errorRate).toBe(1);
  });

  it('should classify timeout errors correctly', () => {
    const timeoutError = new Error('ETIMEDOUT');
    
    redisErrorLogger.logError(timeoutError, {
      operation: RedisOperationType.GET,
      key: 'test_key',
      duration: 5000,
    });

    const history = redisErrorLogger.getErrorHistory(1);
    expect(history[0].errorType).toBe(RedisErrorType.CONNECTION_TIMEOUT);
    expect(history[0].context.duration).toBe(5000);
  });

  it('should track consecutive failures', () => {
    // Log multiple failures
    for (let i = 0; i < 5; i++) {
      redisErrorLogger.logError('Test error', {
        operation: RedisOperationType.GET,
        key: `test_key_${i}`,
      });
    }

    const metrics = redisErrorLogger.getMetrics();
    expect(metrics.consecutiveFailures).toBe(5);
    expect(redisErrorLogger.hasConsecutiveFailures(3)).toBe(true);
  });

  it('should reset consecutive failures on success', () => {
    // Log failures
    redisErrorLogger.logError('Test error', {
      operation: RedisOperationType.GET,
      key: 'test_key',
    });

    // Log success
    redisErrorLogger.logSuccess({
      operation: RedisOperationType.GET,
      key: 'test_key',
      duration: 100,
    });

    const metrics = redisErrorLogger.getMetrics();
    expect(metrics.consecutiveFailures).toBe(0);
  });

  it('should detect high error rate', () => {
    // Log 8 failures and 2 successes
    for (let i = 0; i < 8; i++) {
      redisErrorLogger.logError('Test error', {
        operation: RedisOperationType.GET,
        key: `test_key_${i}`,
      });
    }
    
    for (let i = 0; i < 2; i++) {
      redisErrorLogger.logSuccess({
        operation: RedisOperationType.GET,
        key: `success_key_${i}`,
        duration: 100,
      });
    }

    expect(redisErrorLogger.isHighErrorRate(0.5)).toBe(true);
  });
});

describe('Redis Fallback Service', () => {
  beforeEach(() => {
    redisFallbackService.reset();
  });

  it('should activate fallback on consecutive failures', () => {
    // Simulate consecutive failures
    for (let i = 0; i < 5; i++) {
      redisErrorLogger.logError('Connection failed', {
        operation: RedisOperationType.CONNECT,
        command: 'test_connect',
      });
    }

    const shouldActivate = redisFallbackService.shouldActivateFallback();
    expect(shouldActivate).toBe(true);

    const status = redisFallbackService.getFallbackStatus();
    expect(status.isActive).toBe(true);
  });

  it('should execute fallback operation when Redis fails', async () => {
    const redisOperation = jest.fn().mockRejectedValue(new Error('Redis failed'));
    const fallbackOperation = jest.fn().mockResolvedValue('fallback_result');

    const result = await redisFallbackService.executeWithFallback(
      redisOperation,
      fallbackOperation,
      'test_operation'
    );

    expect(result).toBe('fallback_result');
    expect(redisOperation).toHaveBeenCalled();
    expect(fallbackOperation).toHaveBeenCalled();
  });

  it('should use Redis when available and deactivate fallback', async () => {
    // First activate fallback
    redisFallbackService.activateFallback('Test activation');
    
    const redisOperation = jest.fn().mockResolvedValue('redis_result');
    const fallbackOperation = jest.fn().mockResolvedValue('fallback_result');

    // Mock Redis as available
    const { isRedisAvailable } = require('../app/lib/redis');
    isRedisAvailable.mockResolvedValue(true);

    const result = await redisFallbackService.executeWithFallback(
      redisOperation,
      fallbackOperation,
      'test_operation'
    );

    expect(result).toBe('redis_result');
    expect(redisOperation).toHaveBeenCalled();
    expect(fallbackOperation).not.toHaveBeenCalled();
  });
});

describe('Redis Health Monitor', () => {
  beforeEach(() => {
    redisHealthMonitor.reset();
  });

  it('should perform health check and return status', async () => {
    const { isRedisAvailable } = require('../app/lib/redis');
    isRedisAvailable.mockResolvedValue(true);

    const healthResult = await redisHealthMonitor.performHealthCheck();

    expect(healthResult.status).toBeDefined();
    expect(healthResult.timestamp).toBeDefined();
    expect(healthResult.connectionStatus).toBe('connected');
    expect(healthResult.recommendations).toBeInstanceOf(Array);
  });

  it('should detect unhealthy status on connection failure', async () => {
    const { isRedisAvailable } = require('../app/lib/redis');
    isRedisAvailable.mockRejectedValue(new Error('Connection failed'));

    const healthResult = await redisHealthMonitor.performHealthCheck();

    expect(healthResult.status).toBe('critical');
    expect(healthResult.connectionStatus).toBe('disconnected');
    expect(healthResult.recommendations).toContain(
      expect.stringContaining('Redis server availability')
    );
  });

  it('should track health history', async () => {
    const { isRedisAvailable } = require('../app/lib/redis');
    isRedisAvailable.mockResolvedValue(true);

    await redisHealthMonitor.performHealthCheck();
    await redisHealthMonitor.performHealthCheck();

    const history = redisHealthMonitor.getHealthHistory();
    expect(history).toHaveLength(2);
  });
});

describe('User Experience Service', () => {
  it('should generate fallback indicators', () => {
    redisFallbackService.activateFallback('Test fallback');

    const indicators = userExperienceService.generateUserIndicators(
      2000, // 2 second response time
      false, // no cache hit
      'fallback'
    );

    expect(indicators).toHaveLength(2); // fallback + performance indicator
    expect(indicators[0].type).toBe('info');
    expect(indicators[0].message).toContain('backup');
  });

  it('should create performance impact indicators', () => {
    const indicators = userExperienceService.generateUserIndicators(
      6000, // 6 second response time
      false,
      'direct'
    );

    const performanceIndicator = indicators.find(i => 
      i.message.includes('slower than usual')
    );
    expect(performanceIndicator).toBeDefined();
    expect(performanceIndicator?.type).toBe('warning');
  });

  it('should enhance API response with user experience data', () => {
    const mockResponse = {
      data: { test: 'data' },
      success: true,
      timestamp: new Date(),
      source: 'Test API',
    };

    const enhanced = userExperienceService.enhanceApiResponse(
      mockResponse,
      1500, // response time
      true, // cache hit
      'redis'
    );

    expect(enhanced.metadata?.performanceMetrics).toBeDefined();
    expect(enhanced.metadata?.performanceMetrics?.responseTime).toBe(1500);
    expect(enhanced.metadata?.performanceMetrics?.cacheHit).toBe(true);
    expect(enhanced.metadata?.performanceMetrics?.dataFreshness).toBe('cached');
  });

  it('should create user-friendly error messages', () => {
    const timeoutError = userExperienceService.getUserFriendlyErrorMessage(
      'Request timeout after 30 seconds'
    );

    expect(timeoutError.type).toBe('warning');
    expect(timeoutError.message).toContain('longer than usual');
    expect(timeoutError.icon).toBe('⏱️');

    const connectionError = userExperienceService.getUserFriendlyErrorMessage(
      'ECONNREFUSED: Connection refused'
    );

    expect(connectionError.type).toBe('info');
    expect(connectionError.message).toContain('backup systems');
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    redisErrorLogger.reset();
    redisFallbackService.reset();
    redisHealthMonitor.reset();
  });

  it('should handle complete Redis failure gracefully', async () => {
    const { executeRedisCommand, isRedisAvailable } = require('../app/lib/redis');
    
    // Mock Redis as completely unavailable
    executeRedisCommand.mockRejectedValue(new Error('ECONNREFUSED'));
    isRedisAvailable.mockResolvedValue(false);

    // Simulate multiple failed operations
    for (let i = 0; i < 5; i++) {
      try {
        await executeRedisCommand(() => Promise.reject(new Error('Redis failed')));
      } catch (error) {
        // Expected to fail
      }
    }

    // Check that fallback is activated
    const fallbackStatus = redisFallbackService.getFallbackStatus();
    expect(fallbackStatus.isActive).toBe(true);

    // Check health status
    const healthResult = await redisHealthMonitor.performHealthCheck();
    expect(healthResult.status).toBe('critical');

    // Check that user indicators are generated
    const indicators = userExperienceService.generateUserIndicators(3000, false, 'fallback');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('should recover from fallback mode when Redis becomes available', async () => {
    const { isRedisAvailable } = require('../app/lib/redis');
    
    // First, activate fallback
    redisFallbackService.activateFallback('Test recovery');
    expect(redisFallbackService.getFallbackStatus().isActive).toBe(true);

    // Mock Redis as available again
    isRedisAvailable.mockResolvedValue(true);
    redisErrorLogger.reset(); // Reset error metrics

    // Perform health check
    await redisHealthMonitor.performHealthCheck();

    // Fallback should still be active until explicit deactivation
    // (This tests the conservative approach to recovery)
    const status = redisFallbackService.getFallbackStatus();
    expect(status.isActive).toBe(true);
  });
});

describe('Error Scenarios', () => {
  const errorScenarios = [
    {
      name: 'Connection Timeout',
      error: new Error('ETIMEDOUT'),
      expectedType: RedisErrorType.CONNECTION_TIMEOUT,
      expectedSeverity: RedisErrorSeverity.MEDIUM,
    },
    {
      name: 'Connection Refused',
      error: new Error('ECONNREFUSED'),
      expectedType: RedisErrorType.CONNECTION_FAILED,
      expectedSeverity: RedisErrorSeverity.HIGH,
    },
    {
      name: 'Authentication Error',
      error: new Error('NOAUTH Authentication required'),
      expectedType: RedisErrorType.AUTHENTICATION_ERROR,
      expectedSeverity: RedisErrorSeverity.CRITICAL,
    },
    {
      name: 'Memory Error',
      error: new Error('OOM command not allowed when used memory > maxmemory'),
      expectedType: RedisErrorType.MEMORY_ERROR,
      expectedSeverity: RedisErrorSeverity.HIGH,
    },
  ];

  errorScenarios.forEach(scenario => {
    it(`should handle ${scenario.name} correctly`, () => {
      redisErrorLogger.logError(scenario.error, {
        operation: RedisOperationType.GET,
        key: 'test_key',
      });

      const history = redisErrorLogger.getErrorHistory(1);
      expect(history[0].errorType).toBe(scenario.expectedType);
      expect(history[0].severity).toBe(scenario.expectedSeverity);
    });
  });
});
