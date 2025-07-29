/**
 * Feature Toggle Configuration
 *
 * Centralized configuration for enabling/disabling Redis and Prisma functionality
 * without deleting code. This allows for easy re-enablement in the future.
 */

// Global type declaration for logging flags
declare global {
  var _redisStatusLogged: boolean | undefined;
  var _prismaStatusLogged: boolean | undefined;
}

/**
 * Check if Redis functionality is enabled
 *
 * When disabled, all Redis operations will be bypassed and fallback to:
 * - In-memory caching for API responses
 * - No-op operations for cache management
 * - Direct API calls without caching layer
 * - Simple in-memory rate limiting
 *
 * Redis is disabled by default for easier deployment to environments
 * where Redis is not available (like Vercel, Netlify, etc.)
 */
export function isRedisEnabled(): boolean {
  // Default to false for easier deployment
  const enabled = process.env.ENABLE_REDIS === 'true';

  // Log Redis status on first check (with debouncing)
  if (!global._redisStatusLogged) {
    console.log(`🔧 Redis functionality: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    if (!enabled) {
      console.log('   Using in-memory alternatives for caching and rate limiting');
      console.log('   To enable Redis, set ENABLE_REDIS=true in your environment');
    }
    global._redisStatusLogged = true;
  }

  return enabled;
}

/**
 * Check if Prisma database functionality is enabled
 *
 * When disabled, all Prisma operations will be bypassed and fallback to:
 * - No database persistence
 * - In-memory data storage where applicable
 * - Mock responses for database-dependent features
 *
 * Prisma is disabled by default for easier deployment to environments
 * where PostgreSQL is not available
 */
export function isPrismaEnabled(): boolean {
  // Default to false for easier deployment
  const enabled = process.env.ENABLE_PRISMA === 'true';

  // Log Prisma status on first check (with debouncing)
  if (!global._prismaStatusLogged) {
    console.log(`🗄️  Prisma functionality: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    if (!enabled) {
      console.log('   Using mock data and in-memory storage');
      console.log('   To enable Prisma, set ENABLE_PRISMA=true in your environment');
    }
    global._prismaStatusLogged = true;
  }

  return enabled;
}

/**
 * Check if World Bank API functionality is enabled
 *
 * When disabled, World Bank API endpoints will be bypassed and fallback to:
 * - Historical data generators
 * - Other available data sources
 * - No-op operations for World Bank specific features
 */
export function isWorldBankApiEnabled(): boolean {
  // Default to true for backward compatibility
  const enabled = process.env.ENABLE_WORLD_BANK_API !== 'false';
  return enabled;
}

/**
 * Check if OECD API functionality is enabled
 *
 * When disabled, OECD API endpoints will be bypassed and fallback to:
 * - Historical data generators
 * - Other available data sources
 * - No-op operations for OECD specific features
 */
export function isOECDApiEnabled(): boolean {
  // Default to true for backward compatibility
  const enabled = process.env.ENABLE_OECD_API !== 'false';
  return enabled;
}

/**
 * Check if traditional government APIs are enabled (FRED, BLS, Census, Alpha Vantage)
 *
 * When disabled, these APIs will be bypassed and fallback to:
 * - Historical data generators
 * - World Bank and OECD APIs if enabled
 * - No-op operations for traditional API specific features
 */
export function isTraditionalApisEnabled(): boolean {
  // Default to true for backward compatibility
  const enabled = process.env.ENABLE_TRADITIONAL_APIS !== 'false';
  return enabled;
}

/**
 * Get feature toggle status for debugging and monitoring
 */
export function getFeatureToggleStatus() {
  return {
    redis: {
      enabled: isRedisEnabled(),
      reason: isRedisEnabled()
        ? 'Redis functionality is enabled'
        : 'Redis functionality is disabled via ENABLE_REDIS environment variable',
    },
    prisma: {
      enabled: isPrismaEnabled(),
      reason: isPrismaEnabled()
        ? 'Prisma functionality is enabled'
        : 'Prisma functionality is disabled via ENABLE_PRISMA environment variable',
    },
    worldBankApi: {
      enabled: isWorldBankApiEnabled(),
      reason: isWorldBankApiEnabled()
        ? 'World Bank API functionality is enabled'
        : 'World Bank API functionality is disabled via ENABLE_WORLD_BANK_API environment variable',
    },
    oecdApi: {
      enabled: isOECDApiEnabled(),
      reason: isOECDApiEnabled()
        ? 'OECD API functionality is enabled'
        : 'OECD API functionality is disabled via ENABLE_OECD_API environment variable',
    },
    traditionalApis: {
      enabled: isTraditionalApisEnabled(),
      reason: isTraditionalApisEnabled()
        ? 'Traditional APIs (FRED, BLS, Census, Alpha Vantage) are enabled'
        : 'Traditional APIs are disabled via ENABLE_TRADITIONAL_APIS environment variable',
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log feature toggle status on startup
 */
export function logFeatureToggleStatus(): void {
  const status = getFeatureToggleStatus();
  
  console.log('=== Feature Toggle Status ===');
  console.log(`Redis: ${status.redis.enabled ? 'ENABLED' : 'DISABLED'} - ${status.redis.reason}`);
  console.log(`Prisma: ${status.prisma.enabled ? 'ENABLED' : 'DISABLED'} - ${status.prisma.reason}`);
  console.log('=============================');
  
  if (!status.redis.enabled || !status.prisma.enabled) {
    console.log('⚠️  Some features are disabled. The application will use fallback implementations.');
    console.log('   To re-enable, set ENABLE_REDIS=true and/or ENABLE_PRISMA=true in your environment.');
  }
}
