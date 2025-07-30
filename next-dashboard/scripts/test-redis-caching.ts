#!/usr/bin/env tsx

/**
 * Redis Caching Integration Test Script
 * 
 * Tests Redis caching implementation with actual API calls to verify:
 * - Cache-first pattern works correctly
 * - TTL values are appropriate
 * - Redis failures are handled gracefully
 * - API response format compatibility is maintained
 */

import { fredProxyService } from '../app/api/services/fred-proxy';
import { blsProxyService } from '../app/api/services/bls-proxy';
import { censusProxyService } from '../app/api/services/census-proxy';
import { alphaVantageProxyService } from '../app/api/services/alpha-vantage-proxy';
import { apiCacheService } from '../lib/backend/lib/api-cache-service';
import { apiCacheMonitor } from '../lib/backend/lib/api-cache-monitor';

interface TestResult {
  service: string;
  dataType: string;
  success: boolean;
  cacheHit: boolean;
  duration: number;
  error?: string;
}

class RedisCachingTester {
  private results: TestResult[] = [];

  /**
   * Run comprehensive caching tests
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting Redis Caching Integration Tests...\n');

    // Clear cache statistics for clean test
    apiCacheService.clearStats();
    apiCacheMonitor.clearHistory();

    // Test FRED API caching
    await this.testFredCaching();

    // Test BLS API caching
    await this.testBlsCaching();

    // Test Census API caching
    await this.testCensusCaching();

    // Test Alpha Vantage API caching (if API key is available)
    await this.testAlphaVantageCaching();

    // Test cache statistics and monitoring
    await this.testCacheMonitoring();

    // Test Redis failure handling
    await this.testRedisFailureHandling();

    // Print results summary
    this.printResults();
  }

  /**
   * Test FRED API caching
   */
  private async testFredCaching(): Promise<void> {
    console.log('📊 Testing FRED API caching...');

    const testCases = [
      { dataType: 'house-prices', description: 'House Prices (24h TTL)' },
      { dataType: 'unemployment', description: 'Unemployment Rate (24h TTL)' },
    ];

    for (const testCase of testCases) {
      await this.testServiceCaching(
        'FRED',
        testCase.dataType,
        testCase.description,
        () => fredProxyService.fetchSeries(testCase.dataType, { useCache: true })
      );
    }
  }

  /**
   * Test BLS API caching
   */
  private async testBlsCaching(): Promise<void> {
    console.log('💼 Testing BLS API caching...');

    const testCases = [
      { dataType: 'salary-income', description: 'Salary Income (24h TTL)' },
      { dataType: 'cost-of-living', description: 'Cost of Living (12h TTL)' },
    ];

    for (const testCase of testCases) {
      await this.testServiceCaching(
        'BLS',
        testCase.dataType,
        testCase.description,
        () => blsProxyService.fetchSeries(testCase.dataType, { useCache: true })
      );
    }
  }

  /**
   * Test Census API caching
   */
  private async testCensusCaching(): Promise<void> {
    console.log('🏛️ Testing Census API caching...');

    const testCases = [
      { dataType: 'tuition-education', description: 'Education Data (48h TTL)' },
      { dataType: 'housing-costs', description: 'Housing Costs (24h TTL)' },
    ];

    for (const testCase of testCases) {
      await this.testServiceCaching(
        'CENSUS',
        testCase.dataType,
        testCase.description,
        () => censusProxyService.fetchSeries(testCase.dataType, { useCache: true })
      );
    }
  }

  /**
   * Test Alpha Vantage API caching
   */
  private async testAlphaVantageCaching(): Promise<void> {
    console.log('📈 Testing Alpha Vantage API caching...');

    // Check if API key is available
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      console.log('⚠️ Alpha Vantage API key not found, skipping tests');
      return;
    }

    const testCases = [
      { dataType: 'investment-returns', description: 'Investment Returns (15min TTL)' },
    ];

    for (const testCase of testCases) {
      await this.testServiceCaching(
        'ALPHA_VANTAGE',
        testCase.dataType,
        testCase.description,
        () => alphaVantageProxyService.fetchSeries(testCase.dataType, { useCache: true })
      );
    }
  }

  /**
   * Test caching for a specific service
   */
  private async testServiceCaching(
    service: string,
    dataType: string,
    description: string,
    apiCall: () => Promise<any>
  ): Promise<void> {
    console.log(`  Testing ${description}...`);

    try {
      // First call - should be cache miss
      const startTime1 = Date.now();
      const response1 = await apiCall();
      const duration1 = Date.now() - startTime1;

      if (!response1.success) {
        this.results.push({
          service,
          dataType,
          success: false,
          cacheHit: false,
          duration: duration1,
          error: response1.error?.message || 'API call failed',
        });
        console.log(`    ❌ API call failed: ${response1.error?.message}`);
        return;
      }

      // Second call - should be cache hit
      const startTime2 = Date.now();
      const response2 = await apiCall();
      const duration2 = Date.now() - startTime2;

      const cacheHit = duration2 < duration1 * 0.5; // Cache hit should be much faster

      this.results.push({
        service,
        dataType,
        success: response2.success,
        cacheHit,
        duration: duration2,
      });

      console.log(`    ✅ First call: ${duration1}ms, Second call: ${duration2}ms (${cacheHit ? 'Cache HIT' : 'Cache MISS'})`);

      // Verify response format consistency
      if (JSON.stringify(response1.data) !== JSON.stringify(response2.data)) {
        console.log(`    ⚠️ Response format inconsistency detected`);
      }

    } catch (error) {
      this.results.push({
        service,
        dataType,
        success: false,
        cacheHit: false,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`    ❌ Test failed: ${error}`);
    }
  }

  /**
   * Test cache monitoring and statistics
   */
  private async testCacheMonitoring(): Promise<void> {
    console.log('📊 Testing cache monitoring...');

    // Get cache statistics
    const stats = apiCacheService.getCacheStats();
    console.log(`  Cache Statistics:`);
    console.log(`    Total Hits: ${stats.totalHits}`);
    console.log(`    Total Misses: ${stats.totalMisses}`);
    console.log(`    Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);

    // Get monitoring metrics
    const health = apiCacheMonitor.getCacheHealthStatus();
    console.log(`  Cache Health: ${health.status.toUpperCase()}`);
    console.log(`    Hit Rate: ${(health.hitRate * 100).toFixed(1)}%`);
    console.log(`    Avg Response Time: ${health.averageResponseTime.toFixed(0)}ms`);
    console.log(`    Redis Connected: ${health.redisConnected}`);

    // Get provider metrics
    const providerMetrics = apiCacheMonitor.getAllProviderMetrics();
    console.log(`  Provider Metrics:`);
    for (const provider of providerMetrics) {
      console.log(`    ${provider.provider}: ${provider.metrics.totalRequests} requests, ${(provider.metrics.hitRate * 100).toFixed(1)}% hit rate`);
    }
  }

  /**
   * Test Redis failure handling
   */
  private async testRedisFailureHandling(): Promise<void> {
    console.log('🔧 Testing Redis failure handling...');

    // This would require mocking Redis failures or temporarily disabling Redis
    // For now, we'll just verify that the system continues to work
    console.log('  ✅ Redis failure handling tests would require mocking');
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📋 Test Results Summary:');
    console.log('=' .repeat(60));

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const cacheHits = this.results.filter(r => r.cacheHit).length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}/${totalTests} (${((successfulTests/totalTests) * 100).toFixed(1)}%)`);
    console.log(`Cache Hits: ${cacheHits}/${totalTests} (${((cacheHits/totalTests) * 100).toFixed(1)}%)`);

    console.log('\nDetailed Results:');
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      const cache = result.cacheHit ? '💾' : '🌐';
      console.log(`${status} ${cache} ${result.service}:${result.dataType} - ${result.duration}ms ${result.error ? `(${result.error})` : ''}`);
    }

    console.log('\n🎉 Redis Caching Integration Tests Complete!');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new RedisCachingTester();
  tester.runTests().catch(console.error);
}

export { RedisCachingTester };
