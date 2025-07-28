#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * 
 * Tests Redis connectivity and basic operations for the Finance Factors Dashboard
 */

const { createClient } = require('redis');
require('dotenv').config({ path: '.env.local' });

async function testRedisConnection() {
  console.log('🔍 Testing Redis Connection...\n');

  // Check environment variables
  const redisUrl = process.env.REDIS_URL;
  const enableRedis = process.env.ENABLE_REDIS;

  console.log('Environment Configuration:');
  console.log(`- ENABLE_REDIS: ${enableRedis}`);
  console.log(`- REDIS_URL: ${redisUrl ? 'configured' : 'not configured'}`);
  console.log('');

  if (enableRedis !== 'true') {
    console.log('❌ Redis is disabled in environment configuration');
    console.log('   Set ENABLE_REDIS=true in .env.local to enable Redis');
    return false;
  }

  if (!redisUrl) {
    console.log('❌ Redis URL not configured');
    console.log('   Set REDIS_URL in .env.local');
    return false;
  }

  let client;
  try {
    // Create Redis client
    console.log('🔌 Creating Redis client...');
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        keepAlive: true,
      },
    });

    // Handle connection events
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    // Connect to Redis
    console.log('🔗 Connecting to Redis...');
    await client.connect();

    // Test basic operations
    console.log('\n🧪 Testing basic Redis operations...');

    // Test SET operation
    const testKey = 'finance-factors:test:connection';
    const testValue = JSON.stringify({
      timestamp: new Date().toISOString(),
      message: 'Redis connection test successful',
      version: '1.0.0'
    });

    console.log('📝 Testing SET operation...');
    await client.setEx(testKey, 60, testValue); // 60 seconds TTL
    console.log('✅ SET operation successful');

    // Test GET operation
    console.log('📖 Testing GET operation...');
    const retrievedValue = await client.get(testKey);
    if (retrievedValue) {
      const parsed = JSON.parse(retrievedValue);
      console.log('✅ GET operation successful');
      console.log('   Retrieved data:', parsed);
    } else {
      console.log('❌ GET operation failed - no data retrieved');
      return false;
    }

    // Test DELETE operation
    console.log('🗑️  Testing DELETE operation...');
    const deleteResult = await client.del(testKey);
    console.log(`✅ DELETE operation successful (${deleteResult} key deleted)`);

    // Test Redis info
    console.log('\n📊 Redis Server Information:');
    const info = await client.info('server');
    const lines = info.split('\r\n').filter(line => line && !line.startsWith('#'));
    const serverInfo = {};
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        serverInfo[key] = value;
      }
    });

    console.log(`   Redis Version: ${serverInfo.redis_version || 'unknown'}`);
    console.log(`   Redis Mode: ${serverInfo.redis_mode || 'unknown'}`);
    console.log(`   OS: ${serverInfo.os || 'unknown'}`);
    console.log(`   Uptime: ${serverInfo.uptime_in_seconds ? Math.floor(serverInfo.uptime_in_seconds / 3600) + ' hours' : 'unknown'}`);

    // Test memory info
    const memoryInfo = await client.info('memory');
    const memoryLines = memoryInfo.split('\r\n').filter(line => line && !line.startsWith('#'));
    const memory = {};
    memoryLines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        memory[key] = value;
      }
    });

    console.log(`   Used Memory: ${memory.used_memory_human || 'unknown'}`);
    console.log(`   Max Memory: ${memory.maxmemory_human || 'unlimited'}`);

    console.log('\n🎉 Redis connection test completed successfully!');
    console.log('   Redis is ready for use with the Finance Factors Dashboard');

    return true;

  } catch (error) {
    console.error('\n❌ Redis connection test failed:');
    console.error('   Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('   This usually means the Redis server hostname cannot be resolved');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   This usually means the Redis server is not running or not accessible');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   This usually means the connection timed out - check network connectivity');
    }

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
  testRedisConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testRedisConnection };
