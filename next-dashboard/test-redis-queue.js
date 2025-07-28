/**
 * Redis Queue Test Script
 * 
 * Tests the Redis queue configuration to ensure it can handle
 * multiple concurrent operations without hitting the queue limit.
 */

const { createClient } = require('redis');

// Test configuration
const TEST_CONFIG = {
  concurrentOperations: 50,
  operationsPerBatch: 10,
  testDuration: 30000, // 30 seconds
};

async function testRedisQueue() {
  console.log('🔧 Starting Redis Queue Test...');
  console.log(`📊 Configuration:`, TEST_CONFIG);
  
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ REDIS_URL environment variable not set');
    process.exit(1);
  }

  // Create Redis client with the same configuration as the app
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      keepAlive: true,
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.error(`Redis connection failed after ${retries} retries`);
          return new Error('Redis connection failed');
        }
        const delay = Math.min(100 * Math.pow(2, retries), 3000);
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
      },
    },
    commandsQueueMaxLength: 1000, // Same as our fix
    enableAutoPipelining: true,
  });

  try {
    console.log('🔌 Connecting to Redis...');
    await client.connect();
    console.log('✅ Connected to Redis');

    // Test 1: Basic connectivity
    console.log('\n📋 Test 1: Basic Connectivity');
    const pingResult = await client.ping();
    console.log(`✅ Ping result: ${pingResult}`);

    // Test 2: Multiple concurrent operations
    console.log('\n📋 Test 2: Concurrent Operations');
    await testConcurrentOperations(client);

    // Test 3: Pipeline operations (similar to rate limiting)
    console.log('\n📋 Test 3: Pipeline Operations');
    await testPipelineOperations(client);

    // Test 4: Stress test
    console.log('\n📋 Test 4: Stress Test');
    await testStressOperations(client);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await client.quit();
    console.log('🔌 Disconnected from Redis');
  }
}

async function testConcurrentOperations(client) {
  const operations = [];
  const startTime = Date.now();

  for (let i = 0; i < TEST_CONFIG.concurrentOperations; i++) {
    operations.push(
      client.set(`test:concurrent:${i}`, `value-${i}`, { EX: 60 })
        .then(() => client.get(`test:concurrent:${i}`))
        .then(() => client.del(`test:concurrent:${i}`))
    );
  }

  const results = await Promise.allSettled(operations);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const duration = Date.now() - startTime;

  console.log(`✅ Concurrent operations: ${successful} successful, ${failed} failed`);
  console.log(`⏱️  Duration: ${duration}ms`);

  if (failed > 0) {
    console.warn('⚠️  Some operations failed:');
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`   Operation ${index}: ${result.reason.message}`);
      }
    });
  }
}

async function testPipelineOperations(client) {
  const startTime = Date.now();
  const pipelines = [];

  for (let i = 0; i < 20; i++) {
    const pipeline = client.multi();
    
    // Simulate rate limiting operations
    pipeline.zRemRangeByScore(`test:pipeline:${i}`, 0, Date.now() - 60000);
    pipeline.zCard(`test:pipeline:${i}`);
    pipeline.zAdd(`test:pipeline:${i}`, { score: Date.now(), value: `${Date.now()}-${Math.random()}` });
    pipeline.expire(`test:pipeline:${i}`, 60);
    
    pipelines.push(pipeline.exec());
  }

  const results = await Promise.allSettled(pipelines);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const duration = Date.now() - startTime;

  console.log(`✅ Pipeline operations: ${successful} successful, ${failed} failed`);
  console.log(`⏱️  Duration: ${duration}ms`);

  // Cleanup
  for (let i = 0; i < 20; i++) {
    await client.del(`test:pipeline:${i}`).catch(() => {});
  }
}

async function testStressOperations(client) {
  const startTime = Date.now();
  const operations = [];
  let operationCount = 0;

  const endTime = startTime + TEST_CONFIG.testDuration;

  while (Date.now() < endTime) {
    const batchOperations = [];
    
    for (let i = 0; i < TEST_CONFIG.operationsPerBatch; i++) {
      const key = `test:stress:${operationCount++}`;
      batchOperations.push(
        client.set(key, `stress-value-${operationCount}`, { EX: 10 })
          .then(() => client.get(key))
          .then(() => client.del(key))
      );
    }

    operations.push(...batchOperations);
    
    // Small delay to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const results = await Promise.allSettled(operations);
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const duration = Date.now() - startTime;
  const opsPerSecond = Math.round((successful / duration) * 1000);

  console.log(`✅ Stress test: ${successful} successful, ${failed} failed`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`🚀 Operations per second: ${opsPerSecond}`);

  if (failed > 0) {
    console.warn(`⚠️  Failure rate: ${((failed / (successful + failed)) * 100).toFixed(2)}%`);
  }
}

// Run the test
if (require.main === module) {
  testRedisQueue().catch(console.error);
}

module.exports = { testRedisQueue };
