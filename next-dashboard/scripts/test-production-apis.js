#!/usr/bin/env node

/**
 * Test Production API Proxy
 * 
 * This script tests the API proxy endpoints in production to ensure
 * CORS issues are resolved and data is being fetched correctly.
 */

const https = require('https');

// Configuration
const PRODUCTION_URL = 'https://finance-factors.vercel.app';
const TEST_ENDPOINTS = [
  {
    name: 'Health Check',
    path: '/api/proxy/health',
    method: 'GET',
    expected: { status: ['healthy', 'degraded'] }
  },
  {
    name: 'House Prices Data',
    path: '/api/proxy/data',
    method: 'POST',
    body: { dataType: 'house-prices', useCache: true },
    expected: { success: true, source: 'FRED API' }
  },
  {
    name: 'Salary Income Data',
    path: '/api/proxy/data',
    method: 'POST',
    body: { dataType: 'salary-income', useCache: true },
    expected: { success: true, source: 'BLS API Proxy' }
  }
];

/**
 * Make HTTP request
 */
function makeRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing: ${endpoint.name}`);
  console.log(`   URL: ${PRODUCTION_URL}${endpoint.path}`);
  
  try {
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Finance-Factors-API-Test/1.0'
      }
    };
    
    const response = await makeRequest(
      `${PRODUCTION_URL}${endpoint.path}`,
      options,
      endpoint.body
    );
    
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.parseError) {
      console.log(`   ❌ JSON Parse Error: ${response.parseError}`);
      console.log(`   Raw Response: ${response.data.substring(0, 200)}...`);
      return false;
    }
    
    // Check status code
    if (response.statusCode !== 200) {
      console.log(`   ❌ Unexpected status code: ${response.statusCode}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
    
    // Check expected values
    if (endpoint.expected) {
      for (const [key, expectedValue] of Object.entries(endpoint.expected)) {
        const actualValue = response.data[key];
        
        if (Array.isArray(expectedValue)) {
          if (!expectedValue.includes(actualValue)) {
            console.log(`   ❌ Expected ${key} to be one of ${expectedValue}, got: ${actualValue}`);
            return false;
          }
        } else if (actualValue !== expectedValue) {
          console.log(`   ❌ Expected ${key} to be ${expectedValue}, got: ${actualValue}`);
          return false;
        }
      }
    }
    
    // Show some response details
    if (response.data.success !== undefined) {
      console.log(`   Success: ${response.data.success}`);
    }
    if (response.data.source) {
      console.log(`   Source: ${response.data.source}`);
    }
    if (response.data.data && Array.isArray(response.data.data)) {
      console.log(`   Data Points: ${response.data.data.length}`);
    }
    if (response.data.status) {
      console.log(`   Health Status: ${response.data.status}`);
    }
    
    console.log(`   ✅ Test passed`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Testing Finance Factors API Proxy in Production');
  console.log(`📍 Target: ${PRODUCTION_URL}`);
  
  let passed = 0;
  let total = TEST_ENDPOINTS.length;
  
  for (const endpoint of TEST_ENDPOINTS) {
    const success = await testEndpoint(endpoint);
    if (success) {
      passed++;
    }
    
    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! API proxy is working correctly.');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint };
