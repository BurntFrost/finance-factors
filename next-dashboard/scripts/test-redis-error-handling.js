#!/usr/bin/env node

/**
 * Redis Error Handling Test Script
 * 
 * Manual testing script to verify Redis error handling and fallback mechanisms
 * in a real environment. This script simulates various error conditions and
 * verifies that the system responds appropriately.
 */

const { redisErrorLogger } = require('../app/lib/redis-error-logger');
const { redisFallbackService } = require('../app/lib/redis-fallback-service');
const { redisHealthMonitor } = require('../app/lib/redis-health-monitor');
const { userExperienceService } = require('../app/lib/user-experience-service');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test configuration
const config = {
  verbose: process.argv.includes('--verbose'),
  skipSlowTests: process.argv.includes('--fast'),
  testTimeout: 30000, // 30 seconds
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
};

/**
 * Log test result
 */
function logResult(test, status, message, details = null) {
  results.total++;
  
  const statusColor = status === 'PASS' ? colors.green : 
                     status === 'WARN' ? colors.yellow : colors.red;
  
  console.log(`${statusColor}[${status}]${colors.reset} ${test}: ${message}`);
  
  if (details && config.verbose) {
    console.log(`  ${colors.cyan}Details:${colors.reset} ${JSON.stringify(details, null, 2)}`);
  }
  
  if (status === 'PASS') {
    results.passed++;
  } else if (status === 'WARN') {
    results.warnings++;
  } else {
    results.failed++;
    results.errors.push({ test, message, details });
  }
}

/**
 * Test Redis error logging
 */
async function testErrorLogging() {
  console.log(`\n${colors.blue}Testing Redis Error Logging${colors.reset}`);
  
  try {
    // Reset logger
    redisErrorLogger.reset();
    
    // Test error classification
    const testErrors = [
      { error: new Error('ECONNREFUSED'), expectedType: 'connection_failed' },
      { error: new Error('ETIMEDOUT'), expectedType: 'connection_timeout' },
      { error: new Error('NOAUTH Authentication required'), expectedType: 'authentication_error' },
      { error: new Error('OOM out of memory'), expectedType: 'memory_error' },
    ];
    
    for (const { error, expectedType } of testErrors) {
      redisErrorLogger.logError(error, {
        operation: 'get',
        key: 'test_key',
      });
    }
    
    const history = redisErrorLogger.getErrorHistory();
    if (history.length === testErrors.length) {
      logResult('Error Logging', 'PASS', `Logged ${history.length} errors correctly`);
    } else {
      logResult('Error Logging', 'FAIL', `Expected ${testErrors.length} errors, got ${history.length}`);
    }
    
    // Test metrics
    const metrics = redisErrorLogger.getMetrics();
    if (metrics.failedOperations === testErrors.length) {
      logResult('Error Metrics', 'PASS', `Metrics updated correctly: ${metrics.failedOperations} failures`);
    } else {
      logResult('Error Metrics', 'FAIL', `Expected ${testErrors.length} failures, got ${metrics.failedOperations}`);
    }
    
  } catch (error) {
    logResult('Error Logging', 'FAIL', `Test failed: ${error.message}`, error);
  }
}

/**
 * Test fallback service
 */
async function testFallbackService() {
  console.log(`\n${colors.blue}Testing Fallback Service${colors.reset}`);
  
  try {
    // Reset services
    redisFallbackService.reset();
    redisErrorLogger.reset();
    
    // Test fallback activation
    redisFallbackService.activateFallback('Test activation');
    const status = redisFallbackService.getFallbackStatus();
    
    if (status.isActive) {
      logResult('Fallback Activation', 'PASS', 'Fallback mode activated successfully');
    } else {
      logResult('Fallback Activation', 'FAIL', 'Fallback mode not activated');
    }
    
    // Test executeWithFallback
    let fallbackUsed = false;
    const result = await redisFallbackService.executeWithFallback(
      // Redis operation (will fail because fallback is active)
      async () => {
        throw new Error('Redis not available');
      },
      // Fallback operation
      async () => {
        fallbackUsed = true;
        return 'fallback_result';
      },
      'test_operation'
    );
    
    if (result === 'fallback_result' && fallbackUsed) {
      logResult('Fallback Execution', 'PASS', 'Fallback operation executed correctly');
    } else {
      logResult('Fallback Execution', 'FAIL', 'Fallback operation not executed properly');
    }
    
  } catch (error) {
    logResult('Fallback Service', 'FAIL', `Test failed: ${error.message}`, error);
  }
}

/**
 * Test health monitoring
 */
async function testHealthMonitoring() {
  console.log(`\n${colors.blue}Testing Health Monitoring${colors.reset}`);
  
  try {
    // Reset monitor
    redisHealthMonitor.reset();
    
    // Perform health check
    const healthResult = await redisHealthMonitor.performHealthCheck();
    
    if (healthResult && healthResult.status) {
      logResult('Health Check', 'PASS', `Health status: ${healthResult.status}`, {
        latency: healthResult.latency,
        connectionStatus: healthResult.connectionStatus,
      });
    } else {
      logResult('Health Check', 'FAIL', 'Health check did not return valid result');
    }
    
    // Test health history
    const history = redisHealthMonitor.getHealthHistory();
    if (history.length > 0) {
      logResult('Health History', 'PASS', `Health history contains ${history.length} entries`);
    } else {
      logResult('Health History', 'WARN', 'Health history is empty');
    }
    
  } catch (error) {
    logResult('Health Monitoring', 'FAIL', `Test failed: ${error.message}`, error);
  }
}

/**
 * Test user experience service
 */
async function testUserExperience() {
  console.log(`\n${colors.blue}Testing User Experience Service${colors.reset}`);
  
  try {
    // Test indicator generation
    const indicators = userExperienceService.generateUserIndicators(
      2000, // 2 second response time
      false, // no cache hit
      'fallback'
    );
    
    if (indicators && indicators.length > 0) {
      logResult('User Indicators', 'PASS', `Generated ${indicators.length} user indicators`);
    } else {
      logResult('User Indicators', 'FAIL', 'No user indicators generated');
    }
    
    // Test API response enhancement
    const mockResponse = {
      data: { test: 'data' },
      success: true,
      timestamp: new Date(),
      source: 'Test API',
    };
    
    const enhanced = userExperienceService.enhanceApiResponse(
      mockResponse,
      1500,
      true,
      'redis'
    );
    
    if (enhanced.metadata && enhanced.metadata.performanceMetrics) {
      logResult('Response Enhancement', 'PASS', 'API response enhanced with UX data');
    } else {
      logResult('Response Enhancement', 'FAIL', 'API response not properly enhanced');
    }
    
    // Test error message generation
    const errorIndicator = userExperienceService.getUserFriendlyErrorMessage(
      'ETIMEDOUT: Connection timeout'
    );
    
    if (errorIndicator && errorIndicator.message && errorIndicator.type) {
      logResult('Error Messages', 'PASS', 'User-friendly error message generated');
    } else {
      logResult('Error Messages', 'FAIL', 'Error message not generated properly');
    }
    
  } catch (error) {
    logResult('User Experience', 'FAIL', `Test failed: ${error.message}`, error);
  }
}

/**
 * Test integration scenarios
 */
async function testIntegration() {
  console.log(`\n${colors.blue}Testing Integration Scenarios${colors.reset}`);
  
  try {
    // Reset all services
    redisErrorLogger.reset();
    redisFallbackService.reset();
    redisHealthMonitor.reset();
    
    // Simulate Redis failure scenario
    console.log('  Simulating Redis failure scenario...');
    
    // Log multiple errors to trigger fallback
    for (let i = 0; i < 5; i++) {
      redisErrorLogger.logError(new Error('ECONNREFUSED'), {
        operation: 'get',
        key: `test_key_${i}`,
      });
    }
    
    // Check if fallback should be activated
    const shouldActivate = redisFallbackService.shouldActivateFallback();
    if (shouldActivate) {
      logResult('Integration - Fallback Trigger', 'PASS', 'Fallback correctly triggered by consecutive errors');
    } else {
      logResult('Integration - Fallback Trigger', 'FAIL', 'Fallback not triggered despite errors');
    }
    
    // Test health monitoring integration
    const healthResult = await redisHealthMonitor.performHealthCheck();
    if (healthResult.operationMetrics.errorRate > 0.5) {
      logResult('Integration - Health Detection', 'PASS', 'Health monitor detected high error rate');
    } else {
      logResult('Integration - Health Detection', 'WARN', 'Health monitor may not be detecting errors properly');
    }
    
  } catch (error) {
    logResult('Integration', 'FAIL', `Test failed: ${error.message}`, error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.cyan}Redis Error Handling Test Suite${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    await testErrorLogging();
    await testFallbackService();
    await testHealthMonitoring();
    await testUserExperience();
    
    if (!config.skipSlowTests) {
      await testIntegration();
    }
    
  } catch (error) {
    console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
    results.failed++;
  }
  
  // Print summary
  const duration = Date.now() - startTime;
  console.log(`\n${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}============${colors.reset}`);
  console.log(`Total tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Duration: ${duration}ms`);
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors:${colors.reset}`);
    results.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.message}`);
    });
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught exception:${colors.reset}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}Unhandled rejection at:${colors.reset}`, promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testErrorLogging,
  testFallbackService,
  testHealthMonitoring,
  testUserExperience,
  testIntegration,
};
