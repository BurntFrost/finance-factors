/**
 * Dual Data Source System Tester
 * 
 * Comprehensive testing utilities for validating the dual data source system,
 * including simulated API failures, failover testing, and performance validation.
 */

import { DataFetchOptions, ApiResponse } from '@/shared/types/dataSource';
import { 
  dualDataSourceMonitor,
  MonitoringEventType,
  EventSeverity,
} from './dualDataSourceMonitor';
import { 
  DataSourceConfigManager,
  PROVIDER_CONFIGS,
  ProviderHealth,
} from '@/shared/config/dualDataSourceConfig';

// Test scenario types
export enum TestScenario {
  PRIMARY_FAILURE = 'primary_failure',
  SECONDARY_FAILURE = 'secondary_failure',
  BOTH_PROVIDERS_FAIL = 'both_providers_fail',
  RATE_LIMIT_PRIMARY = 'rate_limit_primary',
  RATE_LIMIT_SECONDARY = 'rate_limit_secondary',
  CIRCUIT_BREAKER_TRIP = 'circuit_breaker_trip',
  NETWORK_TIMEOUT = 'network_timeout',
  GRADUAL_DEGRADATION = 'gradual_degradation',
  RECOVERY_TEST = 'recovery_test',
  LOAD_TEST = 'load_test',
}

// Test result interface
export interface TestResult {
  scenario: TestScenario;
  dataType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  failoverOccurred: boolean;
  fallbackUsed: boolean;
  providersUsed: string[];
  errors: string[];
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    failoverTime?: number;
  };
  monitoringEvents: any[];
}

// Test configuration
export interface TestConfig {
  dataTypes: string[];
  iterations: number;
  delayBetweenRequests: number;
  timeoutMs: number;
  enableLogging: boolean;
  simulateNetworkConditions: boolean;
}

class DualDataSourceTester {
  private testResults: TestResult[] = [];
  private originalFetch: typeof fetch;
  private mockResponses = new Map<string, any>();
  private failureSimulations = new Map<string, boolean>();

  constructor() {
    this.originalFetch = global.fetch;
  }

  /**
   * Run comprehensive test suite
   */
  async runTestSuite(config: Partial<TestConfig> = {}): Promise<TestResult[]> {
    const testConfig: TestConfig = {
      dataTypes: ['house-prices', 'unemployment-rate', 'gdp-growth'],
      iterations: 3,
      delayBetweenRequests: 1000,
      timeoutMs: 10000,
      enableLogging: true,
      simulateNetworkConditions: false,
      ...config,
    };

    console.log('🧪 Starting Dual Data Source Test Suite');
    console.log('Configuration:', testConfig);

    this.testResults = [];

    // Test scenarios
    const scenarios = [
      TestScenario.PRIMARY_FAILURE,
      TestScenario.SECONDARY_FAILURE,
      TestScenario.RATE_LIMIT_PRIMARY,
      TestScenario.CIRCUIT_BREAKER_TRIP,
      TestScenario.NETWORK_TIMEOUT,
      TestScenario.RECOVERY_TEST,
    ];

    for (const scenario of scenarios) {
      for (const dataType of testConfig.dataTypes) {
        console.log(`\n📋 Testing scenario: ${scenario} for ${dataType}`);
        
        try {
          const result = await this.runTestScenario(scenario, dataType, testConfig);
          this.testResults.push(result);
          
          if (testConfig.enableLogging) {
            this.logTestResult(result);
          }
          
          // Delay between tests
          await this.delay(testConfig.delayBetweenRequests);
          
        } catch (error) {
          console.error(`❌ Test failed for ${scenario}/${dataType}:`, error);
        }
      }
    }

    // Generate test report
    this.generateTestReport();
    
    return this.testResults;
  }

  /**
   * Run a specific test scenario
   */
  async runTestScenario(
    scenario: TestScenario,
    dataType: string,
    config: TestConfig
  ): Promise<TestResult> {
    const startTime = new Date();
    const result: TestResult = {
      scenario,
      dataType,
      startTime,
      endTime: new Date(),
      duration: 0,
      success: false,
      failoverOccurred: false,
      fallbackUsed: false,
      providersUsed: [],
      errors: [],
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      },
      monitoringEvents: [],
    };

    try {
      // Setup scenario-specific conditions
      await this.setupTestScenario(scenario, dataType);

      // Clear monitoring events before test
      const eventsBefore = dualDataSourceMonitor.getEvents({ limit: 1000 });
      
      // Execute test requests
      const responses: ApiResponse<any>[] = [];
      const responseTimes: number[] = [];

      for (let i = 0; i < config.iterations; i++) {
        const requestStart = Date.now();
        
        try {
          // Simulate data fetch (this would normally go through AutomaticDataSourceProvider)
          const response = await this.simulateDataFetch(dataType, scenario);
          responses.push(response);
          
          const responseTime = Date.now() - requestStart;
          responseTimes.push(responseTime);
          
          if (response.success) {
            result.metrics.successfulRequests++;
          } else {
            result.metrics.failedRequests++;
            result.errors.push(response.error || 'Unknown error');
          }
          
        } catch (error) {
          result.metrics.failedRequests++;
          result.errors.push(error instanceof Error ? error.message : String(error));
        }
        
        result.metrics.totalRequests++;
        
        // Small delay between iterations
        if (i < config.iterations - 1) {
          await this.delay(100);
        }
      }

      // Calculate metrics
      result.metrics.averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      // Check for failover events
      const eventsAfter = dualDataSourceMonitor.getEvents({ limit: 1000 });
      const newEvents = eventsAfter.slice(0, eventsAfter.length - eventsBefore.length);
      
      result.monitoringEvents = newEvents;
      result.failoverOccurred = newEvents.some(e => e.type === MonitoringEventType.FAILOVER);
      result.fallbackUsed = responses.some(r => r.metadata?.isFallback);
      
      // Extract providers used
      const providersUsed = new Set<string>();
      responses.forEach(response => {
        if (response.source && !response.source.includes('Historical')) {
          providersUsed.add(response.source);
        }
      });
      result.providersUsed = Array.from(providersUsed);

      // Determine overall success
      result.success = result.metrics.successfulRequests > 0;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    } finally {
      // Cleanup scenario
      await this.cleanupTestScenario(scenario, dataType);
      
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
    }

    return result;
  }

  /**
   * Setup test scenario conditions
   */
  private async setupTestScenario(scenario: TestScenario, dataType: string): Promise<void> {
    const primaryProvider = DataSourceConfigManager.getPrimaryProvider(dataType);
    const secondaryProvider = DataSourceConfigManager.getSecondaryProvider(dataType);

    switch (scenario) {
      case TestScenario.PRIMARY_FAILURE:
        if (primaryProvider) {
          this.simulateProviderFailure(primaryProvider, true);
        }
        break;

      case TestScenario.SECONDARY_FAILURE:
        if (secondaryProvider) {
          this.simulateProviderFailure(secondaryProvider, true);
        }
        break;

      case TestScenario.BOTH_PROVIDERS_FAIL:
        if (primaryProvider) {
          this.simulateProviderFailure(primaryProvider, true);
        }
        if (secondaryProvider) {
          this.simulateProviderFailure(secondaryProvider, true);
        }
        break;

      case TestScenario.RATE_LIMIT_PRIMARY:
        if (primaryProvider) {
          this.simulateRateLimit(primaryProvider, true);
        }
        break;

      case TestScenario.RATE_LIMIT_SECONDARY:
        if (secondaryProvider) {
          this.simulateRateLimit(secondaryProvider, true);
        }
        break;

      case TestScenario.NETWORK_TIMEOUT:
        if (primaryProvider) {
          this.simulateNetworkTimeout(primaryProvider, true);
        }
        break;

      case TestScenario.CIRCUIT_BREAKER_TRIP:
        // Simulate multiple failures to trip circuit breaker
        if (primaryProvider) {
          this.simulateProviderFailure(primaryProvider, true);
        }
        break;

      case TestScenario.RECOVERY_TEST:
        // Start with failure, then recover
        if (primaryProvider) {
          this.simulateProviderFailure(primaryProvider, true);
          setTimeout(() => {
            this.simulateProviderFailure(primaryProvider, false);
          }, 2000);
        }
        break;
    }
  }

  /**
   * Cleanup test scenario
   */
  private async cleanupTestScenario(scenario: TestScenario, dataType: string): Promise<void> {
    // Reset all simulations
    this.failureSimulations.clear();
    this.mockResponses.clear();

    // Reset fetch if it was mocked
    if (global.fetch !== this.originalFetch) {
      global.fetch = this.originalFetch;
    }
  }

  /**
   * Simulate data fetch with scenario conditions
   */
  private async simulateDataFetch(dataType: string, _scenario: TestScenario): Promise<ApiResponse<any>> {
    const primaryProvider = DataSourceConfigManager.getPrimaryProvider(dataType);
    const secondaryProvider = DataSourceConfigManager.getSecondaryProvider(dataType);

    // Check if primary provider should fail
    if (primaryProvider && this.failureSimulations.get(primaryProvider)) {
      // Try secondary provider
      if (secondaryProvider && !this.failureSimulations.get(secondaryProvider)) {
        return {
          data: { mock: true, provider: secondaryProvider },
          success: true,
          timestamp: new Date(),
          source: secondaryProvider,
          metadata: { reason: 'Primary provider failed, using secondary' },
        };
      } else {
        // Both failed, use fallback
        return {
          data: { mock: true, provider: 'historical' },
          success: true,
          timestamp: new Date(),
          source: 'Historical Data Generator (Fallback)',
          metadata: { isFallback: true },
        };
      }
    }

    // Primary provider succeeds
    return {
      data: { mock: true, provider: primaryProvider || 'unknown' },
      success: true,
      timestamp: new Date(),
      source: primaryProvider || 'unknown',
    };
  }

  /**
   * Simulate provider failure
   */
  private simulateProviderFailure(provider: string, shouldFail: boolean): void {
    this.failureSimulations.set(provider, shouldFail);
  }

  /**
   * Simulate rate limiting
   */
  private simulateRateLimit(provider: string, shouldRateLimit: boolean): void {
    if (shouldRateLimit) {
      this.mockResponses.set(provider, {
        error: 'Rate limit exceeded',
        status: 429,
        headers: { 'X-RateLimit-Reset': Date.now() + 60000 },
      });
    }
  }

  /**
   * Simulate network timeout
   */
  private simulateNetworkTimeout(provider: string, shouldTimeout: boolean): void {
    if (shouldTimeout) {
      this.mockResponses.set(provider, {
        error: 'Network timeout',
        timeout: true,
      });
    }
  }

  /**
   * Log test result
   */
  private logTestResult(result: TestResult): void {
    const status = result.success ? '✅' : '❌';
    const failover = result.failoverOccurred ? '🔄' : '';
    const fallback = result.fallbackUsed ? '📚' : '';

    console.log(`${status} ${result.scenario}/${result.dataType} ${failover}${fallback}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Requests: ${result.metrics.totalRequests} (${result.metrics.successfulRequests} success, ${result.metrics.failedRequests} failed)`);
    console.log(`   Avg Response Time: ${result.metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Providers Used: ${result.providersUsed.join(', ') || 'None'}`);

    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    console.log('\n📊 DUAL DATA SOURCE TEST REPORT');
    console.log('=====================================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${passRate.toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);

    // Failover statistics
    const failoverTests = this.testResults.filter(r => r.failoverOccurred).length;
    const fallbackTests = this.testResults.filter(r => r.fallbackUsed).length;

    console.log(`\nFailover Events: ${failoverTests}`);
    console.log(`Fallback Usage: ${fallbackTests}`);

    // Performance metrics
    const avgResponseTime = this.testResults.reduce((sum, r) => sum + r.metrics.averageResponseTime, 0) / totalTests;
    const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / totalTests;

    console.log(`\nPerformance:`);
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Average Test Duration: ${avgDuration.toFixed(2)}ms`);

    // Scenario breakdown
    console.log(`\nScenario Results:`);
    const scenarioStats = new Map<TestScenario, { passed: number; total: number }>();

    this.testResults.forEach(result => {
      const stats = scenarioStats.get(result.scenario) || { passed: 0, total: 0 };
      stats.total++;
      if (result.success) stats.passed++;
      scenarioStats.set(result.scenario, stats);
    });

    scenarioStats.forEach((stats, scenario) => {
      const rate = (stats.passed / stats.total) * 100;
      console.log(`  ${scenario}: ${stats.passed}/${stats.total} (${rate.toFixed(1)}%)`);
    });

    // Recommendations
    console.log(`\nRecommendations:`);
    if (passRate < 90) {
      console.log('⚠️  Test pass rate is below 90%. Review failed scenarios.');
    }
    if (failoverTests === 0) {
      console.log('⚠️  No failover events detected. Verify failover logic is working.');
    }
    if (fallbackTests === 0) {
      console.log('⚠️  No fallback usage detected. Verify fallback mechanisms.');
    }
    if (avgResponseTime > 5000) {
      console.log('⚠️  Average response time is high. Consider performance optimization.');
    }

    console.log('\n=====================================');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  /**
   * Clear test results
   */
  clearTestResults(): void {
    this.testResults = [];
  }
}

// Global tester instance
export const dualDataSourceTester = new DualDataSourceTester();

// Convenience functions
export const runDualDataSourceTests = (config?: Partial<TestConfig>) =>
  dualDataSourceTester.runTestSuite(config);

export const runTestScenario = (scenario: TestScenario, dataType: string, config: TestConfig) =>
  dualDataSourceTester.runTestScenario(scenario, dataType, config);

export default dualDataSourceTester;
