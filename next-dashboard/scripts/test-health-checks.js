#!/usr/bin/env node

/**
 * Health Check Test Script
 * 
 * Comprehensive testing script for all health check endpoints
 * Verifies functionality, response formats, and error handling
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipExternal: process.argv.includes('--skip-external'),
};

// Colors for console output
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

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
};

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Health-Check-Test-Script/1.0',
        'Accept': 'application/json',
        ...options.headers,
      },
      timeout: config.timeout,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: error.message,
          });
        }
      });
    });

    req.on('error', reject);
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
 * Test basic health check endpoint
 */
async function testBasicHealthCheck() {
  console.log(`\n${colors.blue}Testing Basic Health Check${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health`);
    
    if (response.status === 200) {
      logResult('Basic Health Check', 'PASS', 'Endpoint accessible');
      
      if (response.data && typeof response.data === 'object') {
        logResult('Response Format', 'PASS', 'Valid JSON response');
        
        const requiredFields = ['status', 'timestamp', 'performance', 'services'];
        const missingFields = requiredFields.filter(field => !response.data[field]);
        
        if (missingFields.length === 0) {
          logResult('Response Structure', 'PASS', 'All required fields present');
        } else {
          logResult('Response Structure', 'FAIL', `Missing fields: ${missingFields.join(', ')}`);
        }
        
        if (['healthy', 'degraded', 'unhealthy'].includes(response.data.status)) {
          logResult('Status Value', 'PASS', `Status: ${response.data.status}`);
        } else {
          logResult('Status Value', 'FAIL', `Invalid status: ${response.data.status}`);
        }
      } else {
        logResult('Response Format', 'FAIL', 'Invalid JSON response');
      }
    } else {
      logResult('Basic Health Check', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logResult('Basic Health Check', 'FAIL', error.message);
  }
}

/**
 * Test detailed health check with parameters
 */
async function testDetailedHealthCheck() {
  console.log(`\n${colors.blue}Testing Detailed Health Check${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health?detailed=true&testApis=${!config.skipExternal}`);
    
    if (response.status === 200) {
      logResult('Detailed Health Check', 'PASS', 'Endpoint accessible with parameters');
      
      if (response.data?.cache?.hitRate !== undefined) {
        logResult('Detailed Fields', 'PASS', 'Additional fields present in detailed mode');
      } else {
        logResult('Detailed Fields', 'WARN', 'Some detailed fields missing');
      }
    } else {
      logResult('Detailed Health Check', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logResult('Detailed Health Check', 'FAIL', error.message);
  }
}

/**
 * Test Vercel-specific health check
 */
async function testVercelHealthCheck() {
  console.log(`\n${colors.blue}Testing Vercel Health Check${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health/vercel?checkAssets=true`);
    
    if (response.status === 200 || response.status === 400) {
      if (response.status === 400 && response.data?.error?.code === 'NOT_VERCEL_ENVIRONMENT') {
        logResult('Vercel Health Check', 'WARN', 'Not in Vercel environment (expected for local testing)');
      } else {
        logResult('Vercel Health Check', 'PASS', 'Endpoint accessible');
        
        if (response.data?.vercel) {
          logResult('Vercel Fields', 'PASS', 'Vercel-specific fields present');
        }
      }
    } else {
      logResult('Vercel Health Check', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logResult('Vercel Health Check', 'FAIL', error.message);
  }
}

/**
 * Test dashboard functionality health check
 */
async function testDashboardHealthCheck() {
  console.log(`\n${colors.blue}Testing Dashboard Health Check${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health/dashboard?webVitals=true&testDataSources=${!config.skipExternal}`);
    
    if (response.status === 200) {
      logResult('Dashboard Health Check', 'PASS', 'Endpoint accessible');
      
      if (response.data?.dashboard) {
        const dashboard = response.data.dashboard;
        
        if (dashboard.chartJs?.loaded) {
          logResult('Chart.js Check', 'PASS', 'Chart.js reported as loaded');
        } else {
          logResult('Chart.js Check', 'FAIL', 'Chart.js not loaded');
        }
        
        if (dashboard.components && Object.values(dashboard.components).every(Boolean)) {
          logResult('Components Check', 'PASS', 'All components available');
        } else {
          logResult('Components Check', 'WARN', 'Some components unavailable');
        }
        
        if (dashboard.interactiveFeatures && Object.values(dashboard.interactiveFeatures).every(Boolean)) {
          logResult('Interactive Features', 'PASS', 'All interactive features available');
        } else {
          logResult('Interactive Features', 'WARN', 'Some interactive features unavailable');
        }
      } else {
        logResult('Dashboard Fields', 'FAIL', 'Dashboard fields missing');
      }
    } else {
      logResult('Dashboard Health Check', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logResult('Dashboard Health Check', 'FAIL', error.message);
  }
}

/**
 * Test deployment verification health check
 */
async function testDeploymentHealthCheck() {
  console.log(`\n${colors.blue}Testing Deployment Health Check${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health/deployment?checkRoutes=true&checkAssets=true&checkSecurity=true`);
    
    if (response.status === 200) {
      logResult('Deployment Health Check', 'PASS', 'Endpoint accessible');
      
      if (response.data?.deployment) {
        const deployment = response.data.deployment;
        
        if (deployment.environmentVariables) {
          const envVars = deployment.environmentVariables;
          if (envVars.missing.length === 0) {
            logResult('Environment Variables', 'PASS', `${envVars.configured}/${envVars.total} configured`);
          } else {
            logResult('Environment Variables', 'WARN', `Missing: ${envVars.missing.join(', ')}`);
          }
        }
        
        if (deployment.build?.successful) {
          logResult('Build Status', 'PASS', 'Build reported as successful');
        } else {
          logResult('Build Status', 'WARN', 'Build status unknown or failed');
        }
      }
    } else {
      logResult('Deployment Health Check', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logResult('Deployment Health Check', 'FAIL', error.message);
  }
}

/**
 * Test monitoring integration health check
 */
async function testMonitoringHealthCheck() {
  console.log(`\n${colors.blue}Testing Monitoring Health Check${colors.reset}`);
  
  try {
    // Test JSON format
    const jsonResponse = await makeRequest(`${config.baseUrl}/api/health/monitoring?alerts=true`);
    
    if (jsonResponse.status === 200) {
      logResult('Monitoring Health Check (JSON)', 'PASS', 'JSON endpoint accessible');
      
      if (jsonResponse.data?.summary) {
        logResult('Monitoring Summary', 'PASS', `${jsonResponse.data.summary.totalChecks} checks performed`);
      }
      
      if (jsonResponse.data?.checks && Array.isArray(jsonResponse.data.checks)) {
        logResult('Monitoring Checks', 'PASS', `${jsonResponse.data.checks.length} individual checks`);
      }
    } else {
      logResult('Monitoring Health Check (JSON)', 'FAIL', `HTTP ${jsonResponse.status}`);
    }
    
    // Test Prometheus format
    const prometheusResponse = await makeRequest(`${config.baseUrl}/api/health/monitoring?format=prometheus`);
    
    if (prometheusResponse.status === 200) {
      logResult('Monitoring Health Check (Prometheus)', 'PASS', 'Prometheus endpoint accessible');
      
      if (prometheusResponse.rawData.includes('finance_factors_health_status')) {
        logResult('Prometheus Format', 'PASS', 'Valid Prometheus metrics format');
      } else {
        logResult('Prometheus Format', 'FAIL', 'Invalid Prometheus format');
      }
    } else {
      logResult('Monitoring Health Check (Prometheus)', 'FAIL', `HTTP ${prometheusResponse.status}`);
    }
  } catch (error) {
    logResult('Monitoring Health Check', 'FAIL', error.message);
  }
}

/**
 * Test CORS headers
 */
async function testCorsHeaders() {
  console.log(`\n${colors.blue}Testing CORS Headers${colors.reset}`);
  
  try {
    const response = await makeRequest(`${config.baseUrl}/api/health`, {
      headers: { 'Origin': 'https://example.com' }
    });
    
    if (response.headers['access-control-allow-origin']) {
      logResult('CORS Headers', 'PASS', 'CORS headers present');
    } else {
      logResult('CORS Headers', 'WARN', 'CORS headers missing');
    }
  } catch (error) {
    logResult('CORS Headers', 'FAIL', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.bright}${colors.magenta}Finance Factors Dashboard - Health Check Test Suite${colors.reset}`);
  console.log(`${colors.cyan}Base URL: ${config.baseUrl}${colors.reset}`);
  console.log(`${colors.cyan}Skip External: ${config.skipExternal}${colors.reset}`);
  console.log(`${colors.cyan}Verbose: ${config.verbose}${colors.reset}\n`);
  
  const startTime = Date.now();
  
  // Run all tests
  await testBasicHealthCheck();
  await testDetailedHealthCheck();
  await testVercelHealthCheck();
  await testDashboardHealthCheck();
  await testDeploymentHealthCheck();
  await testMonitoringHealthCheck();
  await testCorsHeaders();
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log(`\n${colors.bright}${colors.magenta}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}Duration: ${duration}ms${colors.reset}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.cyan}Total: ${results.total}${colors.reset}`);
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Errors:${colors.reset}`);
    results.errors.forEach(error => {
      console.log(`  ${colors.red}•${colors.reset} ${error.test}: ${error.message}`);
    });
  }
  
  // Exit with appropriate code
  const exitCode = results.failed > 0 ? 1 : 0;
  console.log(`\n${colors.cyan}Exit code: ${exitCode}${colors.reset}`);
  process.exit(exitCode);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Health Check Test Script

Usage: node test-health-checks.js [options]

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose output
  --skip-external     Skip external API tests
  
Environment Variables:
  TEST_BASE_URL       Base URL for testing (default: http://localhost:3000)

Examples:
  node test-health-checks.js
  node test-health-checks.js --verbose
  node test-health-checks.js --skip-external
  TEST_BASE_URL=https://finance-factors.vercel.app node test-health-checks.js
`);
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
