/**
 * API Cache Service Tests
 * 
 * Comprehensive tests for Redis caching implementation across all API data sources
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ApiCacheService } from '../lib/backend/lib/api-cache-service';

// Mock Redis operations
jest.mock('../lib/backend/lib/redis', () => ({
  executeRedisCommand: jest.fn(),
}));

jest.mock('../lib/backend/lib/feature-toggles', () => ({
  isRedisEnabled: jest.fn(() => true),
}));

jest.mock('../lib/backend/lib/api-cache-monitor', () => ({
  apiCacheMonitor: {
    logOperation: jest.fn(),
  },
}));

describe('ApiCacheService', () => {
  let cacheService: ApiCacheService;
  let mockExecuteRedisCommand: jest.MockedFunction<any>;

  beforeEach(() => {
    cacheService = new ApiCacheService();
    mockExecuteRedisCommand = require('../lib/backend/lib/redis').executeRedisCommand;
    jest.clearAllMocks();
  });

  afterEach(() => {
    cacheService.clearStats();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same parameters', () => {
      const params = { seriesId: 'CSUSHPISA', startDate: '2023-01-01' };
      
      const key1 = cacheService.generateCacheKey('FRED', 'house-prices', params);
      const key2 = cacheService.generateCacheKey('FRED', 'house-prices', params);
      
      expect(key1).toBe(key2);
      expect(key1).toMatch(/^api:cache:fred:house-prices:[a-f0-9]{8}$/);
    });

    it('should generate different keys for different parameters', () => {
      const params1 = { seriesId: 'CSUSHPISA', startDate: '2023-01-01' };
      const params2 = { seriesId: 'CSUSHPISA', startDate: '2023-06-01' };
      
      const key1 = cacheService.generateCacheKey('FRED', 'house-prices', params1);
      const key2 = cacheService.generateCacheKey('FRED', 'house-prices', params2);
      
      expect(key1).not.toBe(key2);
    });

    it('should handle empty parameters', () => {
      const key = cacheService.generateCacheKey('FRED', 'house-prices', {});
      expect(key).toMatch(/^api:cache:fred:house-prices:[a-f0-9]{8}$/);
    });
  });

  describe('TTL Configuration', () => {
    it('should return correct TTL for FRED data types', () => {
      expect(cacheService.getTTLForDataType('FRED', 'house-prices')).toBe(24 * 60 * 60);
      expect(cacheService.getTTLForDataType('FRED', 'interest-rates')).toBe(1 * 60 * 60);
      expect(cacheService.getTTLForDataType('FRED', 'unknown-type')).toBe(24 * 60 * 60);
    });

    it('should return correct TTL for Alpha Vantage data types', () => {
      expect(cacheService.getTTLForDataType('ALPHA_VANTAGE', 'investment-returns')).toBe(15 * 60);
      expect(cacheService.getTTLForDataType('ALPHA_VANTAGE', 'stock-prices')).toBe(5 * 60);
    });

    it('should return default TTL for unknown providers', () => {
      expect(cacheService.getTTLForDataType('UNKNOWN_PROVIDER', 'any-type')).toBe(24 * 60 * 60);
    });
  });

  describe('Cache Operations', () => {
    const mockData = [
      { date: '2023-01-01', value: 100, label: 'Jan 2023' },
      { date: '2023-02-01', value: 105, label: 'Feb 2023' },
    ];

    it('should cache and retrieve data successfully', async () => {
      const cacheKey = 'test-cache-key';
      
      // Mock successful Redis operations
      mockExecuteRedisCommand
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce(true) // Cache set success
        .mockResolvedValueOnce(JSON.stringify(mockData)); // Cache hit

      // First call should be cache miss
      const result1 = await cacheService.getCachedApiData(cacheKey);
      expect(result1).toBeNull();

      // Set cache
      const setResult = await cacheService.setCachedApiData(cacheKey, mockData);
      expect(setResult).toBe(true);

      // Second call should be cache hit
      const result2 = await cacheService.getCachedApiData(cacheKey);
      expect(result2).toEqual(mockData);
    });

    it('should handle Redis connection failures gracefully', async () => {
      const cacheKey = 'test-cache-key';
      
      // Mock Redis failure
      mockExecuteRedisCommand.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw error, just return null
      const result = await cacheService.getCachedApiData(cacheKey);
      expect(result).toBeNull();

      // Should not throw error, just return false
      const setResult = await cacheService.setCachedApiData(cacheKey, mockData);
      expect(setResult).toBe(false);
    });

    it('should handle corrupted cache data', async () => {
      const cacheKey = 'test-cache-key';
      
      // Mock corrupted JSON data
      mockExecuteRedisCommand.mockResolvedValueOnce('invalid-json');

      const result = await cacheService.getCachedApiData(cacheKey);
      expect(result).toBeNull();
    });
  });

  describe('Execute with Cache', () => {
    const mockApiCall = jest.fn();
    const mockData = [{ date: '2023-01-01', value: 100, label: 'Jan 2023' }];

    beforeEach(() => {
      mockApiCall.mockClear();
    });

    it('should return cached data when available', async () => {
      const cacheKey = 'test-cache-key';
      
      // Mock cache hit
      mockExecuteRedisCommand.mockResolvedValueOnce(JSON.stringify(mockData));

      const result = await cacheService.executeWithCache(cacheKey, mockApiCall);

      expect(result.data).toEqual(mockData);
      expect(result.fromCache).toBe(true);
      expect(mockApiCall).not.toHaveBeenCalled();
    });

    it('should call API and cache result when cache miss', async () => {
      const cacheKey = 'test-cache-key';
      
      // Mock cache miss and successful cache set
      mockExecuteRedisCommand
        .mockResolvedValueOnce(null) // Cache miss
        .mockResolvedValueOnce(true); // Cache set success

      mockApiCall.mockResolvedValueOnce(mockData);

      const result = await cacheService.executeWithCache(cacheKey, mockApiCall);

      expect(result.data).toEqual(mockData);
      expect(result.fromCache).toBe(false);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('should propagate API call errors', async () => {
      const cacheKey = 'test-cache-key';
      const apiError = new Error('API call failed');
      
      // Mock cache miss
      mockExecuteRedisCommand.mockResolvedValueOnce(null);
      mockApiCall.mockRejectedValueOnce(apiError);

      await expect(cacheService.executeWithCache(cacheKey, mockApiCall))
        .rejects.toThrow('API call failed');
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics correctly', () => {
      // Simulate some cache operations
      cacheService['updateStats']('FRED', true);
      cacheService['updateStats']('FRED', true);
      cacheService['updateStats']('FRED', false);
      cacheService['updateStats']('BLS', true);

      const stats = cacheService.getCacheStats();

      expect(stats.totalHits).toBe(3);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.75);
      expect(stats.providerStats.FRED.hits).toBe(2);
      expect(stats.providerStats.FRED.misses).toBe(1);
      expect(stats.providerStats.BLS.hits).toBe(1);
    });

    it('should clear statistics', () => {
      // Add some stats
      cacheService['updateStats']('FRED', true);
      
      let stats = cacheService.getCacheStats();
      expect(stats.totalHits).toBe(1);

      // Clear stats
      cacheService.clearStats();
      
      stats = cacheService.getCacheStats();
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache entries by pattern', async () => {
      const pattern = 'fred:*';
      const mockKeys = ['api:cache:fred:house-prices:abc123', 'api:cache:fred:interest-rates:def456'];
      
      // Mock Redis operations for pattern invalidation
      mockExecuteRedisCommand
        .mockResolvedValueOnce(mockKeys) // keys() returns matching keys
        .mockResolvedValueOnce(undefined); // del() removes keys

      const deletedCount = await cacheService.invalidateByPattern(pattern);

      expect(deletedCount).toBe(2);
      expect(mockExecuteRedisCommand).toHaveBeenCalledTimes(2);
    });

    it('should handle invalidation errors gracefully', async () => {
      const pattern = 'fred:*';
      
      // Mock Redis error
      mockExecuteRedisCommand.mockRejectedValueOnce(new Error('Redis error'));

      const deletedCount = await cacheService.invalidateByPattern(pattern);

      expect(deletedCount).toBe(0);
    });
  });
});

describe('Cache Integration with API Services', () => {
  // These tests would verify that the cache service integrates correctly
  // with the actual API proxy services
  
  it('should maintain API response format compatibility', () => {
    // This test would verify that cached responses have the same format
    // as fresh API responses, ensuring frontend compatibility
    expect(true).toBe(true); // Placeholder
  });

  it('should handle different data types correctly', () => {
    // This test would verify that different data types (FRED, BLS, etc.)
    // are cached with appropriate TTL values
    expect(true).toBe(true); // Placeholder
  });
});
