#!/usr/bin/env node

/**
 * Dual Data Source System Test Script
 * 
 * Command-line script to test and validate the dual data source system.
 * Can be run independently or as part of CI/CD pipeline.
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: TEST_TIMEOUT,
      ...options,
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
          });
        } catch (_error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Log with colors
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Test system status
 */
async function testSystemStatus() {
  log('\n🔍 Testing System Status...', 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/test/data-sources?action=status`);
    
    if (response.status === 200) {
      log('✅ System status: OK', 'green');
      log(`   Available scenarios: ${response.data.availableScenarios?.length || 0}`, 'blue');
      return true;
    } else {
      log(`❌ System status check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ System status check error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Run validation tests
 */
async function runValidationTests() {
  log('\n🧪 Running System Validation...', 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/test/data-sources`, {
      method: 'POST',
      body: {
        action: 'validate-system',
        config: {
          dataTypes: ['house-prices', 'unemployment-rate'],
          iterations: 1,
          enableLogging: false,
        },
      },
    });
    
    if (response.status === 200 && response.data.success) {
      const { systemHealth, results: _results, recommendations } = response.data;
      
      log(`✅ Validation completed`, 'green');
      log(`   Overall Health: ${systemHealth.overall}`, 
          systemHealth.overall === 'healthy' ? 'green' : 
          systemHealth.overall === 'degraded' ? 'yellow' : 'red');
      log(`   Pass Rate: ${systemHealth.passRate.toFixed(1)}%`, 'blue');
      log(`   Failover Working: ${systemHealth.failoverWorking ? 'Yes' : 'No'}`, 
          systemHealth.failoverWorking ? 'green' : 'red');
      log(`   Fallback Working: ${systemHealth.fallbackWorking ? 'Yes' : 'No'}`, 
          systemHealth.fallbackWorking ? 'green' : 'red');
      log(`   Avg Response Time: ${systemHealth.averageResponseTime.toFixed(2)}ms`, 'blue');
      
      if (recommendations.length > 0) {
        log('\n📋 Recommendations:', 'yellow');
        recommendations.forEach(rec => {
          log(`   • ${rec}`, 'yellow');
        });
      }
      
      return systemHealth.overall === 'healthy';
    } else {
      log(`❌ Validation failed: ${response.data?.message || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Validation error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Run specific test scenario
 */
async function runTestScenario(scenario, dataType) {
  log(`\n🔬 Testing ${scenario} for ${dataType}...`, 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/test/data-sources`, {
      method: 'POST',
      body: {
        action: 'run-scenario',
        scenario,
        dataType,
        config: {
          iterations: 1,
          enableLogging: false,
        },
      },
    });
    
    if (response.status === 200 && response.data.success) {
      const { result } = response.data;
      
      const status = result.success ? '✅' : '❌';
      const failover = result.failoverOccurred ? '🔄' : '';
      const fallback = result.fallbackUsed ? '📚' : '';
      
      log(`${status} ${scenario}/${dataType} ${failover}${fallback}`, 
          result.success ? 'green' : 'red');
      log(`   Duration: ${result.duration}ms`, 'blue');
      log(`   Requests: ${result.metrics.totalRequests} (${result.metrics.successfulRequests} success)`, 'blue');
      
      if (result.errors.length > 0) {
        log(`   Errors: ${result.errors.slice(0, 2).join(', ')}`, 'red');
      }
      
      return result.success;
    } else {
      log(`❌ Scenario test failed: ${response.data?.message || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Scenario test error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Check monitoring data
 */
async function checkMonitoringData() {
  log('\n📊 Checking Monitoring Data...', 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/monitoring/data-sources?limit=10`);
    
    if (response.status === 200) {
      const { summary, events } = response.data;
      
      log('✅ Monitoring data available', 'green');
      log(`   Total Events: ${summary.totalEvents}`, 'blue');
      log(`   Failover Events: ${summary.failoverCount}`, 'blue');
      log(`   Health Check Failures: ${summary.healthCheckFailures}`, 'blue');
      log(`   Recent Events: ${events.length}`, 'blue');
      
      return true;
    } else {
      log(`❌ Monitoring data check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Monitoring data error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  log(`${colors.bright}🚀 Dual Data Source System Test Suite${colors.reset}`);
  log(`Testing against: ${BASE_URL}`);
  
  const results = {
    systemStatus: false,
    validation: false,
    scenarios: [],
    monitoring: false,
  };
  
  // Test system status
  results.systemStatus = await testSystemStatus();
  
  if (!results.systemStatus) {
    log('\n❌ System status check failed. Aborting tests.', 'red');
    process.exit(1);
  }
  
  // Run validation tests
  results.validation = await runValidationTests();
  
  // Test specific scenarios
  const scenarios = [
    ['primary_failure', 'house-prices'],
    ['rate_limit_primary', 'unemployment-rate'],
    ['network_timeout', 'gdp-growth'],
  ];
  
  for (const [scenario, dataType] of scenarios) {
    const success = await runTestScenario(scenario, dataType);
    results.scenarios.push({ scenario, dataType, success });
  }
  
  // Check monitoring data
  results.monitoring = await checkMonitoringData();
  
  // Generate final report
  log('\n📋 FINAL TEST REPORT', 'bright');
  log('==================', 'bright');
  
  const totalScenarios = results.scenarios.length;
  const passedScenarios = results.scenarios.filter(s => s.success).length;
  const overallSuccess = results.systemStatus && results.validation && 
                         passedScenarios === totalScenarios && results.monitoring;
  
  log(`System Status: ${results.systemStatus ? 'PASS' : 'FAIL'}`, 
      results.systemStatus ? 'green' : 'red');
  log(`Validation: ${results.validation ? 'PASS' : 'FAIL'}`, 
      results.validation ? 'green' : 'red');
  log(`Scenarios: ${passedScenarios}/${totalScenarios} PASSED`, 
      passedScenarios === totalScenarios ? 'green' : 'red');
  log(`Monitoring: ${results.monitoring ? 'PASS' : 'FAIL'}`, 
      results.monitoring ? 'green' : 'red');
  
  log(`\nOVERALL: ${overallSuccess ? 'PASS' : 'FAIL'}`, 
      overallSuccess ? 'green' : 'red');
  
  process.exit(overallSuccess ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`\n💥 Test suite crashed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests, testSystemStatus, runValidationTests };
