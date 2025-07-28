/**
 * Feature Toggle Configuration
 * 
 * Centralized configuration for enabling/disabling Redis and Prisma functionality
 * without deleting code. This allows for easy re-enablement in the future.
 */

/**
 * Check if Redis functionality is enabled
 * 
 * When disabled, all Redis operations will be bypassed and fallback to:
 * - In-memory caching for API responses
 * - No-op operations for cache management
 * - Direct API calls without caching layer
 */
export function isRedisEnabled(): boolean {
  return process.env.ENABLE_REDIS === 'true';
}

/**
 * Check if Prisma database functionality is enabled
 * 
 * When disabled, all Prisma operations will be bypassed and fallback to:
 * - No database persistence
 * - In-memory data storage where applicable
 * - Mock responses for database-dependent features
 */
export function isPrismaEnabled(): boolean {
  return process.env.ENABLE_PRISMA === 'true';
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
