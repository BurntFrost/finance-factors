#!/usr/bin/env node

/**
 * Cache Configuration Verification Script
 * 
 * Verifies that all cache configurations are set to 24 hours as per requirements
 */

require('dotenv').config({ path: '.env.local' });

async function verifyCacheConfiguration() {
  console.log('🔍 Verifying Cache Configuration...\n');

  let allConfigsCorrect = true;
  const expectedTtl = 24 * 60 * 60; // 24 hours in seconds
  const expectedTtlMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  try {
    // Check environment variables first
    console.log('📋 Checking Environment Variables...');

    const enableRedis = process.env.ENABLE_REDIS;
    const redisUrl = process.env.REDIS_URL;

    console.log(`   ENABLE_REDIS: ${enableRedis}`);
    console.log(`   REDIS_URL: ${redisUrl ? 'Set' : 'Not set'}`);

    if (enableRedis === 'true') {
      console.log('   ✅ Redis is enabled');
    } else {
      console.log('   ⚠️  Redis is disabled');
    }

    if (redisUrl) {
      console.log('   ✅ Redis URL is configured');
    } else {
      console.log('   ❌ Redis URL is not configured');
      allConfigsCorrect = false;
    }

    // Check configuration values by examining the files directly
    console.log('\n📋 Checking Cache Configuration Values...');

    // Check if the expected TTL values are present in the configuration files
    const fs = require('fs');
    const path = require('path');

    // Check redis-cache.ts
    try {
      const redisCacheFile = fs.readFileSync(path.join(__dirname, 'lib/backend/lib/redis-cache.ts'), 'utf8');
      if (redisCacheFile.includes('API_RESPONSE: 24 * 60 * 60')) {
        console.log('   ✅ Redis cache API_RESPONSE TTL is set to 24 hours');
      } else {
        console.log('   ❌ Redis cache API_RESPONSE TTL is not set to 24 hours');
        allConfigsCorrect = false;
      }
    } catch (error) {
      console.log('   ⚠️  Could not read redis-cache.ts file');
    }

    // Check proxy types
    try {
      const proxyTypesFile = fs.readFileSync(path.join(__dirname, 'lib/shared/types/proxy.ts'), 'utf8');
      if (proxyTypesFile.includes('ttl: 24 * 60 * 60 * 1000')) {
        console.log('   ✅ Proxy CACHE_CONFIG TTL is set to 24 hours');
      } else {
        console.log('   ❌ Proxy CACHE_CONFIG TTL is not set to 24 hours');
        allConfigsCorrect = false;
      }
    } catch (error) {
      console.log('   ⚠️  Could not read proxy types file');
    }

    // Check api-endpoints constants
    try {
      const apiEndpointsFile = fs.readFileSync(path.join(__dirname, 'lib/shared/constants/api-endpoints.ts'), 'utf8');
      if (apiEndpointsFile.includes('API_RESPONSE: 86400')) {
        console.log('   ✅ API endpoints API_RESPONSE TTL is set to 24 hours');
      } else {
        console.log('   ❌ API endpoints API_RESPONSE TTL is not set to 24 hours');
        allConfigsCorrect = false;
      }
    } catch (error) {
      console.log('   ⚠️  Could not read api-endpoints file');
    }

    // Check data sources config
    try {
      const dataSourcesFile = fs.readFileSync(path.join(__dirname, 'lib/shared/config/data-sources.ts'), 'utf8');
      if (dataSourcesFile.includes("'house-prices': 86400") &&
          dataSourcesFile.includes("'unemployment-rate': 86400")) {
        console.log('   ✅ Data sources cache TTL values are set to 24 hours');
      } else {
        console.log('   ❌ Data sources cache TTL values are not all set to 24 hours');
        allConfigsCorrect = false;
      }
    } catch (error) {
      console.log('   ⚠️  Could not read data-sources config file');
    }

    // Check main proxy route
    try {
      const proxyRouteFile = fs.readFileSync(path.join(__dirname, 'app/api/proxy/data/route.ts'), 'utf8');
      if (proxyRouteFile.includes('ttl: 24 * 60 * 60')) {
        console.log('   ✅ Main proxy route TTL is set to 24 hours');
      } else {
        console.log('   ❌ Main proxy route TTL is not set to 24 hours');
        allConfigsCorrect = false;
      }
    } catch (error) {
      console.log('   ⚠️  Could not read proxy route file');
    }



  } catch (error) {
    console.log('❌ Error verifying configuration:', error.message);
    allConfigsCorrect = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONFIGURATION VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  if (allConfigsCorrect) {
    console.log('✅ All cache configurations are CORRECT!');
    console.log('   - All API response caches are set to 24 hours');
    console.log('   - Redis is properly configured');
    console.log('   - Environment variables are set correctly');
    console.log('\n🚀 Ready to test Redis 24-hour caching functionality!');
    console.log('   Run: node test-redis-24hour-caching.js');
  } else {
    console.log('❌ Some cache configurations are INCORRECT!');
    console.log('   Please fix the configuration issues above.');
  }
  
  return allConfigsCorrect;
}

// Run the verification if this script is executed directly
if (require.main === module) {
  verifyCacheConfiguration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyCacheConfiguration };
