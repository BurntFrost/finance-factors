#!/usr/bin/env node

/**
 * Simple Cache Configuration Verification
 */

const fs = require('fs');
const _path = require('path');

console.log('🔍 Verifying 24-Hour Cache Configuration...\n');

let allCorrect = true;

// Files to check
const filesToCheck = [
  {
    file: 'lib/backend/lib/redis-cache.ts',
    pattern: 'API_RESPONSE: 24 * 60 * 60',
    description: 'Redis cache API_RESPONSE TTL'
  },
  {
    file: 'lib/shared/types/proxy.ts', 
    pattern: 'ttl: 24 * 60 * 60 * 1000',
    description: 'Proxy CACHE_CONFIG TTL'
  },
  {
    file: 'lib/shared/constants/api-endpoints.ts',
    pattern: 'API_RESPONSE: 86400',
    description: 'API endpoints API_RESPONSE TTL'
  },
  {
    file: 'app/api/proxy/data/route.ts',
    pattern: 'ttl: 24 * 60 * 60',
    description: 'Main proxy route TTL'
  },
  {
    file: 'lib/shared/config/data-sources.ts',
    pattern: "'house-prices': 86400",
    description: 'Data sources house-prices TTL'
  }
];

for (const check of filesToCheck) {
  try {
    const content = fs.readFileSync(check.file, 'utf8');
    if (content.includes(check.pattern)) {
      console.log(`✅ ${check.description}: CORRECT`);
    } else {
      console.log(`❌ ${check.description}: INCORRECT`);
      allCorrect = false;
    }
  } catch (_error) {
    console.log(`⚠️  ${check.description}: FILE NOT FOUND`);
    allCorrect = false;
  }
}

// Check environment
require('dotenv').config({ path: '.env.local' });
console.log('\n📋 Environment Variables:');
console.log(`   ENABLE_REDIS: ${process.env.ENABLE_REDIS}`);
console.log(`   REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);

console.log('\n' + '='.repeat(50));
if (allCorrect) {
  console.log('✅ All cache configurations are set to 24 hours!');
  console.log('🚀 Ready to test Redis caching functionality.');
} else {
  console.log('❌ Some configurations need to be fixed.');
}

process.exit(allCorrect ? 0 : 1);
