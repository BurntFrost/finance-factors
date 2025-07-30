#!/usr/bin/env node

/**
 * Test script to verify the rate limit handling fixes
 * This script simulates rate limit scenarios and verifies the system behavior
 */

// Using built-in fetch (Node 18+) or fallback to a simple HTTP test

const BASE_URL = 'http://localhost:3000';

async function testRateLimitHandling() {
  console.log('🧪 Testing Rate Limit Handling Fixes...\n');

  // Test 1: Fetch data from multiple endpoints to trigger potential rate limits
  console.log('📊 Test 1: Fetching data from multiple endpoints...');
  
  const endpoints = [
    '/api/proxy/data?dataType=house-prices',
    '/api/proxy/data?dataType=unemployment-rate',
    '/api/proxy/data?dataType=salary-income',
    '/api/proxy/data?dataType=cost-of-living'
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`   Fetching: ${endpoint}`);
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      
      results.push({
        endpoint,
        success: data.success,
        source: data.source,
        error: data.error,
        status: response.status
      });
      
      console.log(`   ✅ ${endpoint}: ${data.success ? 'SUCCESS' : 'FAILED'} - Source: ${data.source}`);
      
      if (!data.success) {
        console.log(`      Error: ${data.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${endpoint}: ERROR - ${error.message}`);
      results.push({
        endpoint,
        success: false,
        error: error.message,
        status: 'network_error'
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Analyze results
  console.log('\n📈 Results Analysis:');
  const successfulRequests = results.filter(r => r.success);
  const failedRequests = results.filter(r => !r.success);
  const liveDataSources = results.filter(r => r.source && !r.source.includes('Historical') && !r.source.includes('Fallback'));
  
  console.log(`   Total requests: ${results.length}`);
  console.log(`   Successful: ${successfulRequests.length}`);
  console.log(`   Failed: ${failedRequests.length}`);
  console.log(`   Live data sources: ${liveDataSources.length}`);
  
  if (liveDataSources.length > 0) {
    console.log('   Live data sources used:');
    liveDataSources.forEach(r => {
      console.log(`     - ${r.endpoint}: ${r.source}`);
    });
  }
  
  if (failedRequests.length > 0) {
    console.log('   Failed requests:');
    failedRequests.forEach(r => {
      console.log(`     - ${r.endpoint}: ${r.error}`);
    });
  }

  // Test 2: Rapid requests to trigger rate limiting
  console.log('\n🚀 Test 2: Rapid requests to test rate limit handling...');
  
  const rapidResults = [];
  const testEndpoint = '/api/proxy/data?dataType=house-prices';
  
  // Make 5 rapid requests
  const rapidPromises = Array.from({ length: 5 }, async (_, i) => {
    try {
      const response = await fetch(`${BASE_URL}${testEndpoint}`);
      const data = await response.json();
      return {
        requestNumber: i + 1,
        success: data.success,
        source: data.source,
        error: data.error,
        status: response.status
      };
    } catch (error) {
      return {
        requestNumber: i + 1,
        success: false,
        error: error.message,
        status: 'network_error'
      };
    }
  });
  
  const rapidRequestResults = await Promise.all(rapidPromises);
  
  rapidRequestResults.forEach(result => {
    console.log(`   Request ${result.requestNumber}: ${result.success ? 'SUCCESS' : 'FAILED'} - Source: ${result.source || 'N/A'}`);
    if (!result.success) {
      console.log(`      Error: ${result.error}`);
    }
  });

  // Summary
  console.log('\n🎯 Test Summary:');
  const totalLiveData = [...liveDataSources, ...rapidRequestResults.filter(r => r.source && !r.source.includes('Historical') && !r.source.includes('Fallback'))].length;
  const totalHistoricalFallback = [...results, ...rapidRequestResults].filter(r => r.source && (r.source.includes('Historical') || r.source.includes('Fallback'))).length;
  
  console.log(`   Total live data responses: ${totalLiveData}`);
  console.log(`   Total historical fallback responses: ${totalHistoricalFallback}`);
  
  if (totalLiveData > 0) {
    console.log('   ✅ SUCCESS: System is using live data from working APIs');
  } else {
    console.log('   ⚠️  WARNING: All responses are using historical/fallback data');
  }
  
  console.log('\n✨ Rate limit handling test completed!');
}

// Run the test
if (require.main === module) {
  testRateLimitHandling().catch(console.error);
}

module.exports = { testRateLimitHandling };
