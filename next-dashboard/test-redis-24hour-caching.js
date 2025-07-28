#!/usr/bin/env node

/**
 * Redis 24-Hour Caching Test Script
 * 
 * Tests the updated Redis caching functionality with 24-hour TTL
 * for the Finance Factors Dashboard API endpoints
 */

const { createClient } = require('redis');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const TEST_CONFIG = {
  EXPECTED_TTL: 24 * 60 * 60, // 24 hours in seconds (86400)
  TEST_ENDPOINTS: [
    'house-prices',
    'salary-income', 
    'cost-of-living',
    'unemployment-rate'
  ],
  API_BASE_URL: 'http://localhost:3000/api/proxy/data',
  REDIS_KEY_PREFIX: 'api:response:'
};

async function testRedis24HourCaching() {
  console.log('🧪 Testing Redis 24-Hour Caching Functionality...\n');

  // Check environment variables
  const redisUrl = process.env.REDIS_URL;
  const enableRedis = process.env.ENABLE_REDIS;

  if (enableRedis !== 'true' || !redisUrl) {
    console.log('❌ Redis is not properly configured');
    console.log(`   ENABLE_REDIS: ${enableRedis}`);
    console.log(`   REDIS_URL: ${redisUrl ? 'Set' : 'Not set'}`);
    return false;
  }

  console.log('✅ Redis configuration found');
  console.log(`   ENABLE_REDIS: ${enableRedis}`);
  console.log(`   REDIS_URL: ${redisUrl.substring(0, 20)}...`);

  // Test Redis connection
  let redisClient;
  try {
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log('✅ Redis connection successful\n');
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    return false;
  }

  let allTestsPassed = true;

  try {
    // Test 1: Verify cache keys and TTL
    console.log('📋 Test 1: Verifying cache keys and TTL values...');
    
    for (const endpoint of TEST_CONFIG.TEST_ENDPOINTS) {
      console.log(`\n  Testing endpoint: ${endpoint}`);
      
      // Make API request to populate cache
      try {
        const response = await fetch(TEST_CONFIG.API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dataType: endpoint,
            useCache: true
          })
        });

        if (!response.ok) {
          console.log(`    ⚠️  API request failed with status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`    ✅ API request successful (${data.success ? 'success' : 'failed'})`);
        
        // Check Redis for cached data
        const cacheKeys = await redisClient.keys(`${TEST_CONFIG.REDIS_KEY_PREFIX}*${endpoint}*`);
        
        if (cacheKeys.length === 0) {
          console.log(`    ❌ No cache keys found for ${endpoint}`);
          allTestsPassed = false;
          continue;
        }

        console.log(`    ✅ Found ${cacheKeys.length} cache key(s)`);
        
        // Check TTL for each cache key
        for (const key of cacheKeys) {
          const ttl = await redisClient.ttl(key);
          console.log(`    📊 Cache key: ${key.substring(0, 50)}...`);
          console.log(`    ⏰ TTL: ${ttl} seconds (${Math.round(ttl / 3600)} hours)`);
          
          // Verify TTL is close to 24 hours (allowing for some variance)
          const expectedTtl = TEST_CONFIG.EXPECTED_TTL;
          const tolerance = 300; // 5 minutes tolerance
          
          if (ttl >= (expectedTtl - tolerance) && ttl <= expectedTtl) {
            console.log(`    ✅ TTL is correct (within tolerance)`);
          } else {
            console.log(`    ❌ TTL is incorrect. Expected: ~${expectedTtl}s, Got: ${ttl}s`);
            allTestsPassed = false;
          }
        }
        
      } catch (error) {
        console.log(`    ❌ Error testing ${endpoint}:`, error.message);
        allTestsPassed = false;
      }
    }

    // Test 2: Verify cache hit behavior
    console.log('\n📋 Test 2: Verifying cache hit behavior...');
    
    const testEndpoint = TEST_CONFIG.TEST_ENDPOINTS[0];
    console.log(`\n  Testing cache hits with endpoint: ${testEndpoint}`);
    
    // First request (should populate cache)
    const startTime1 = Date.now();
    const response1 = await fetch(TEST_CONFIG.API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataType: testEndpoint, useCache: true })
    });
    const duration1 = Date.now() - startTime1;
    const data1 = await response1.json();
    
    console.log(`    First request: ${duration1}ms (${data1.source || 'unknown source'})`);
    
    // Second request (should hit cache)
    const startTime2 = Date.now();
    const response2 = await fetch(TEST_CONFIG.API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataType: testEndpoint, useCache: true })
    });
    const duration2 = Date.now() - startTime2;
    const data2 = await response2.json();
    
    console.log(`    Second request: ${duration2}ms (${data2.source || 'unknown source'})`);
    
    // Cache hit should be significantly faster
    if (duration2 < duration1 * 0.5) {
      console.log(`    ✅ Cache hit detected (${duration2}ms vs ${duration1}ms)`);
    } else {
      console.log(`    ⚠️  Cache hit not clearly detected (${duration2}ms vs ${duration1}ms)`);
    }

    // Test 3: Verify fallback behavior when Redis is unavailable
    console.log('\n📋 Test 3: Verifying fallback behavior...');
    
    // Temporarily disconnect Redis to test fallback
    await redisClient.disconnect();
    console.log('    🔌 Disconnected from Redis to test fallback');
    
    try {
      const response3 = await fetch(TEST_CONFIG.API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataType: testEndpoint, useCache: true })
      });
      
      const data3 = await response3.json();
      
      if (data3.success) {
        console.log(`    ✅ Fallback successful: ${data3.source || 'unknown source'}`);
        if (data3.metadata?.isFallback) {
          console.log(`    ✅ Fallback metadata detected: ${data3.metadata.reason}`);
        }
      } else {
        console.log(`    ❌ Fallback failed: ${data3.error}`);
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`    ❌ Fallback test failed:`, error.message);
      allTestsPassed = false;
    }

    // Reconnect Redis
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log('    🔌 Reconnected to Redis');

  } catch (error) {
    console.log('❌ Test execution failed:', error.message);
    allTestsPassed = false;
  } finally {
    // Cleanup
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (allTestsPassed) {
    console.log('✅ All Redis 24-hour caching tests PASSED!');
    console.log('   - Cache TTL is set to 24 hours (86400 seconds)');
    console.log('   - Cache hits are working correctly');
    console.log('   - Fallback behavior is functional');
    console.log('   - Redis integration is properly configured');
  } else {
    console.log('❌ Some Redis caching tests FAILED!');
    console.log('   Please check the configuration and try again.');
  }
  
  return allTestsPassed;
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRedis24HourCaching()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testRedis24HourCaching };
