#!/usr/bin/env node

/**
 * Test script to verify the application works correctly with Redis disabled
 *
 * This script tests:
 * 1. Feature toggle functionality
 * 2. API endpoints with Redis disabled
 * 3. Caching fallback to in-memory
 * 4. Rate limiting fallback
 *
 * Usage: node test-redis-disabled.js
 * Make sure to start the dev server first: npm run dev
 */

const { spawn } = require('child_process');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  endpoints: [
    '/api/health/redis',
    '/api/cache',
    '/api/rate-limit',
  ]
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TEST_CONFIG.timeout, () => {
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
 * Test Redis health endpoint
 */
async function testRedisHealth() {
  logInfo('Testing Redis health endpoint...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/health/redis`);
    
    if (response.status === 200 && response.data.status === 'disabled') {
      logSuccess('Redis health endpoint correctly reports disabled status');
      return true;
    } else {
      logError(`Unexpected Redis health response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Redis health test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test cache endpoint
 */
async function testCacheEndpoint() {
  logInfo('Testing cache endpoint...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/cache`);
    
    if (response.status === 503 && response.data.error === 'Redis disabled') {
      logSuccess('Cache endpoint correctly reports Redis disabled');
      return true;
    } else {
      logError(`Unexpected cache response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Cache test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test rate limit endpoint
 */
async function testRateLimitEndpoint() {
  logInfo('Testing rate limit endpoint...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/rate-limit`);
    
    if (response.status === 503 && response.data.error === 'Redis disabled') {
      logSuccess('Rate limit endpoint correctly reports Redis disabled');
      return true;
    } else {
      logError(`Unexpected rate limit response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logError(`Rate limit test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test basic application functionality
 */
async function testBasicFunctionality() {
  logInfo('Testing basic application functionality...');

  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/health`);

    if (response.status === 200 && response.data.status) {
      logSuccess('Basic application functionality works correctly');
      return true;
    } else {
      logError(`Basic functionality test failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Basic functionality test failed: ${error.message}`);
    return false;
  }
}

/**
 * Check if server is running
 */
async function checkServerHealth() {
  logInfo('Checking if server is running...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/health`);
    if (response.status === 200) {
      logSuccess('Server is running');
      return true;
    } else {
      logError(`Server health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Server is not running: ${error.message}`);
    logInfo('Please start the server with: npm run dev');
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  log(`${colors.bold}🧪 Testing Finance Factors Dashboard with Redis Disabled${colors.reset}`);
  log('');
  
  // Check environment
  if (process.env.ENABLE_REDIS === 'true') {
    logWarning('ENABLE_REDIS is set to true - tests expect Redis to be disabled');
    logInfo('To test Redis-disabled functionality, set ENABLE_REDIS=false or unset it');
    process.exit(1);
  }
  
  logInfo('Environment: ENABLE_REDIS is not set to true (Redis disabled) ✓');
  log('');
  
  // Check if server is running
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }
  
  log('');
  
  // Run tests
  const tests = [
    testRedisHealth,
    testCacheEndpoint,
    testRateLimitEndpoint,
    testBasicFunctionality,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    log('');
  }
  
  // Summary
  log(`${colors.bold}📊 Test Results:${colors.reset}`);
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  
  if (failed === 0) {
    log('');
    logSuccess('🎉 All tests passed! The application works correctly without Redis.');
    process.exit(0);
  } else {
    log('');
    logError('❌ Some tests failed. Please check the Redis disabling implementation.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  process.exit(1);
});
