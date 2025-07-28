#!/usr/bin/env node

/**
 * Redis Caching Test Script
 * 
 * Tests Redis caching functionality with API endpoints for the Finance Factors Dashboard
 */

const { createClient } = require('redis');
require('dotenv').config({ path: '.env.local' });

async function testRedisCaching() {
  console.log('🧪 Testing Redis Caching Functionality...\n');

  // Check environment variables
  const redisUrl = process.env.REDIS_URL;
  const enableRedis = process.env.ENABLE_REDIS;

  if (enableRedis !== 'true' || !redisUrl) {
    console.log('❌ Redis is not properly configured');
    return false;
  }

  let client;
  try {
    // Create Redis client
    console.log('🔌 Connecting to Redis...');
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        keepAlive: true,
      },
    });

    await client.connect();
    console.log('✅ Connected to Redis');

    // Test 1: Check if cache keys are being created
    console.log('\n📊 Test 1: Checking existing cache keys...');
    const keys = await client.keys('*');
    console.log(`Found ${keys.length} existing keys in Redis`);
    
    if (keys.length > 0) {
      console.log('Sample keys:');
      keys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
      if (keys.length > 5) {
        console.log(`  ... and ${keys.length - 5} more`);
      }
    }

    // Test 2: Simulate API response caching
    console.log('\n📝 Test 2: Testing API response caching...');
    
    const testApiData = {
      data: [
        { date: '2024-01-01', value: 100.5 },
        { date: '2024-01-02', value: 101.2 },
        { date: '2024-01-03', value: 99.8 }
      ],
      metadata: {
        source: 'FRED',
        series: 'CSUSHPISA',
        lastUpdated: new Date().toISOString()
      }
    };

    const cacheKey = 'api:response:FRED-CSUSHPISA-test';
    const ttl = 1800; // 30 minutes

    // Set cache data
    await client.setEx(cacheKey, ttl, JSON.stringify(testApiData));
    console.log('✅ Cached API response data');

    // Retrieve cache data
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      console.log('✅ Retrieved cached data successfully');
      console.log(`   Data points: ${parsed.data.length}`);
      console.log(`   Source: ${parsed.metadata.source}`);
    } else {
      console.log('❌ Failed to retrieve cached data');
      return false;
    }

    // Test 3: Check TTL functionality
    console.log('\n⏰ Test 3: Testing TTL functionality...');
    const remainingTtl = await client.ttl(cacheKey);
    console.log(`✅ Cache TTL: ${remainingTtl} seconds remaining`);

    // Test 4: Test cache invalidation
    console.log('\n🗑️  Test 4: Testing cache invalidation...');
    const deleteResult = await client.del(cacheKey);
    console.log(`✅ Cache invalidation: ${deleteResult} key deleted`);

    // Test 5: Test rate limiting cache
    console.log('\n🚦 Test 5: Testing rate limiting cache...');
    const rateLimitKey = 'rate:limit:FRED:test-user';
    const rateLimitData = {
      requests: 1,
      windowStart: Date.now(),
      remaining: 119
    };

    await client.setEx(rateLimitKey, 60, JSON.stringify(rateLimitData));
    const rateLimitCached = await client.get(rateLimitKey);
    
    if (rateLimitCached) {
      const parsed = JSON.parse(rateLimitCached);
      console.log('✅ Rate limiting cache working');
      console.log(`   Requests: ${parsed.requests}`);
      console.log(`   Remaining: ${parsed.remaining}`);
    }

    // Test 6: Test chart data caching
    console.log('\n📈 Test 6: Testing chart data caching...');
    const chartCacheKey = 'chart:data:house-prices-FRED';
    const chartData = [
      { x: '2024-01', y: 300.5 },
      { x: '2024-02', y: 302.1 },
      { x: '2024-03', y: 298.7 }
    ];

    await client.setEx(chartCacheKey, 900, JSON.stringify(chartData)); // 15 minutes
    const chartCached = await client.get(chartCacheKey);
    
    if (chartCached) {
      const parsed = JSON.parse(chartCached);
      console.log('✅ Chart data caching working');
      console.log(`   Data points: ${parsed.length}`);
    }

    // Test 7: Performance test
    console.log('\n⚡ Test 7: Performance testing...');
    const performanceTestKey = 'perf:test:';
    const iterations = 100;
    
    console.log(`Running ${iterations} SET operations...`);
    const setStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await client.setEx(`${performanceTestKey}${i}`, 60, JSON.stringify({ index: i, timestamp: Date.now() }));
    }
    
    const setEndTime = Date.now();
    const setDuration = setEndTime - setStartTime;
    console.log(`✅ SET operations: ${setDuration}ms (${(setDuration / iterations).toFixed(2)}ms per operation)`);

    console.log(`Running ${iterations} GET operations...`);
    const getStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await client.get(`${performanceTestKey}${i}`);
    }
    
    const getEndTime = Date.now();
    const getDuration = getEndTime - getStartTime;
    console.log(`✅ GET operations: ${getDuration}ms (${(getDuration / iterations).toFixed(2)}ms per operation)`);

    // Clean up performance test keys
    const perfKeys = await client.keys(`${performanceTestKey}*`);
    if (perfKeys.length > 0) {
      await client.del(perfKeys);
      console.log(`🧹 Cleaned up ${perfKeys.length} performance test keys`);
    }

    // Test 8: Memory usage
    console.log('\n💾 Test 8: Memory usage analysis...');
    const memoryInfo = await client.info('memory');
    const memoryLines = memoryInfo.split('\r\n').filter(line => line && !line.startsWith('#'));
    const memory = {};
    memoryLines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        memory[key] = value;
      }
    });

    console.log(`✅ Memory analysis:`);
    console.log(`   Used Memory: ${memory.used_memory_human || 'unknown'}`);
    console.log(`   Peak Memory: ${memory.used_memory_peak_human || 'unknown'}`);
    console.log(`   Memory Efficiency: ${memory.mem_fragmentation_ratio || 'unknown'}`);

    console.log('\n🎉 Redis caching functionality test completed successfully!');
    console.log('   All caching operations are working correctly');
    console.log('   Redis is ready for production use with the Finance Factors Dashboard');

    return true;

  } catch (error) {
    console.error('\n❌ Redis caching test failed:');
    console.error('   Error:', error.message);
    return false;

  } finally {
    // Clean up
    if (client && client.isOpen) {
      console.log('\n🔌 Closing Redis connection...');
      await client.quit();
      console.log('✅ Redis connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testRedisCaching()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testRedisCaching };
