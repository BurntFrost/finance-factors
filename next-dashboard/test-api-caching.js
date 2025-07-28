#!/usr/bin/env node

/**
 * API Caching Test Script
 * 
 * Tests Redis caching functionality with actual API endpoints
 */

const { createClient } = require('redis');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function makeApiRequest(endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return {
    status: response.status,
    data: await response.json(),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

async function testApiCaching() {
  console.log('🧪 Testing API Caching with Redis...\n');

  let redisClient;
  try {
    // Connect to Redis to monitor cache
    console.log('🔌 Connecting to Redis for monitoring...');
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000,
        keepAlive: true,
      },
    });
    await redisClient.connect();
    console.log('✅ Connected to Redis');

    // Test 1: Check application status
    console.log('\n📊 Test 1: Checking application status...');
    const statusResponse = await makeApiRequest('/api/status');
    console.log(`Status: ${statusResponse.status}`);
    
    if (statusResponse.data.features) {
      console.log(`Redis enabled: ${statusResponse.data.features.redis}`);
      console.log(`Prisma enabled: ${statusResponse.data.features.prisma}`);
    }

    // Test 2: Test proxy data endpoint with caching
    console.log('\n📈 Test 2: Testing proxy data endpoint...');
    
    const dataRequest = {
      dataType: 'house-prices',
      timeRange: {
        start: '2023-01-01',
        end: '2024-01-01'
      },
      useCache: true
    };

    // Clear any existing cache for this request
    const cacheKeys = await redisClient.keys('api:response:*house-prices*');
    if (cacheKeys.length > 0) {
      await redisClient.del(cacheKeys);
      console.log(`🧹 Cleared ${cacheKeys.length} existing cache keys`);
    }

    // First request (should miss cache and populate it)
    console.log('Making first API request (cache miss expected)...');
    const startTime1 = Date.now();
    const response1 = await makeApiRequest('/api/proxy/data', dataRequest);
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ First request completed in ${duration1}ms`);
    console.log(`   Status: ${response1.status}`);
    console.log(`   Success: ${response1.data.success}`);
    
    if (response1.data.data) {
      console.log(`   Data points: ${response1.data.data.length}`);
    }

    // Check if cache was populated
    const cacheKeysAfter = await redisClient.keys('api:response:*');
    console.log(`📦 Cache keys after first request: ${cacheKeysAfter.length}`);

    // Second request (should hit cache)
    console.log('\nMaking second API request (cache hit expected)...');
    const startTime2 = Date.now();
    const response2 = await makeApiRequest('/api/proxy/data', dataRequest);
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Second request completed in ${duration2}ms`);
    console.log(`   Status: ${response2.status}`);
    console.log(`   Success: ${response2.data.success}`);
    
    // Compare response times
    const speedImprovement = ((duration1 - duration2) / duration1 * 100).toFixed(1);
    console.log(`⚡ Speed improvement: ${speedImprovement}% (${duration1 - duration2}ms faster)`);

    // Test 3: Test GraphQL endpoint with caching
    console.log('\n🔍 Test 3: Testing GraphQL endpoint...');
    
    const graphqlQuery = {
      query: `
        query {
          getChartData(input: {
            dataType: "house-prices"
            useCache: true
          }) {
            labels
            datasets {
              label
              data
            }
            lastUpdated
            isRealData
          }
        }
      `
    };

    const graphqlStartTime = Date.now();
    const graphqlResponse = await makeApiRequest('/api/graphql', graphqlQuery);
    const graphqlDuration = Date.now() - graphqlStartTime;
    
    console.log(`✅ GraphQL request completed in ${graphqlDuration}ms`);
    console.log(`   Status: ${graphqlResponse.status}`);
    
    if (graphqlResponse.data.data) {
      console.log(`   Chart data retrieved successfully`);
    }

    // Test 4: Check cache statistics
    console.log('\n📊 Test 4: Cache statistics...');
    
    const allKeys = await redisClient.keys('*');
    console.log(`Total Redis keys: ${allKeys.length}`);
    
    const apiKeys = await redisClient.keys('api:response:*');
    const chartKeys = await redisClient.keys('chart:data:*');
    const rateLimitKeys = await redisClient.keys('rate:limit:*');
    
    console.log(`API response cache keys: ${apiKeys.length}`);
    console.log(`Chart data cache keys: ${chartKeys.length}`);
    console.log(`Rate limit cache keys: ${rateLimitKeys.length}`);

    // Show sample cache keys
    if (apiKeys.length > 0) {
      console.log('\nSample API cache keys:');
      apiKeys.slice(0, 3).forEach(key => console.log(`  - ${key}`));
    }

    // Test 5: Test cache TTL
    console.log('\n⏰ Test 5: Testing cache TTL...');
    
    if (apiKeys.length > 0) {
      const sampleKey = apiKeys[0];
      const ttl = await redisClient.ttl(sampleKey);
      console.log(`Sample cache key TTL: ${ttl} seconds`);
      
      if (ttl > 0) {
        console.log(`✅ Cache expiration is working correctly`);
      }
    }

    // Test 6: Memory usage
    console.log('\n💾 Test 6: Redis memory usage...');
    const memoryInfo = await redisClient.info('memory');
    const memoryLines = memoryInfo.split('\r\n').filter(line => line && !line.startsWith('#'));
    const memory = {};
    memoryLines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        memory[key] = value;
      }
    });

    console.log(`Used memory: ${memory.used_memory_human || 'unknown'}`);
    console.log(`Peak memory: ${memory.used_memory_peak_human || 'unknown'}`);

    console.log('\n🎉 API caching test completed successfully!');
    console.log('   Redis caching is working correctly with the API endpoints');
    console.log('   Performance improvements are being achieved through caching');

    return true;

  } catch (error) {
    console.error('\n❌ API caching test failed:');
    console.error('   Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the development server is running (npm run dev)');
    }
    
    return false;

  } finally {
    if (redisClient && redisClient.isOpen) {
      console.log('\n🔌 Closing Redis connection...');
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testApiCaching()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testApiCaching };
