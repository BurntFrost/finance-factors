/**
 * Redis Health Check Endpoint
 *
 * Provides detailed health information about Redis connectivity,
 * performance metrics, and cache statistics for monitoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRedisInfo,
  executeRedisCommand,
  getCircuitBreakerStatus,
  resetCircuitBreaker
} from '../../../lib/redis';
import { 
  getCacheStats, 
  cacheHealthCheck,
  CACHE_PREFIXES 
} from '../../../lib/redis-cache';
import { getAllRateLimitStatuses } from '../../../lib/redis-rate-limit';
import { redisHealthMonitor } from '../../../lib/redis-health-monitor';
import { redisFallbackService } from '../../../lib/redis-fallback-service';
import { redisErrorLogger } from '../../../lib/redis-error-logger';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/health/redis
 * 
 * Returns comprehensive Redis health information including:
 * - Connection status and latency
 * - Memory usage and performance metrics
 * - Cache statistics and key distribution
 * - Rate limiting status
 * - Configuration information
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Basic connectivity check
    const healthCheck = await cacheHealthCheck();
    
    if (!healthCheck.available) {
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        redis: {
          connected: false,
          error: healthCheck.error,
          latency: healthCheck.latency || null,
        },
        cache: {
          available: false,
          error: 'Redis connection failed',
        },
        rateLimiting: {
          available: false,
          error: 'Redis connection failed',
        },
        responseTime: Date.now() - startTime,
      }, { 
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }

    // Get detailed Redis information
    const [redisInfo, cacheStats, rateLimitStatuses] = await Promise.allSettled([
      getRedisInfo(),
      getCacheStats(),
      getAllRateLimitStatuses(),
    ]);

    // Parse Redis info
    const redisInfoData = redisInfo.status === 'fulfilled' ? redisInfo.value : null;
    const cacheStatsData = cacheStats.status === 'fulfilled' ? cacheStats.value : null;
    const rateLimitData = rateLimitStatuses.status === 'fulfilled' ? rateLimitStatuses.value : null;

    // Get additional performance metrics and circuit breaker status
    const performanceMetrics = await getPerformanceMetrics();
    const circuitBreakerStatus = getCircuitBreakerStatus();

    // Get enhanced health monitoring data
    const healthMonitorResult = await redisHealthMonitor.performHealthCheck();
    const fallbackStatus = redisFallbackService.getFallbackStatus();
    const errorMetrics = redisErrorLogger.getMetrics();
    const recentErrors = redisErrorLogger.getErrorHistory(10);

    const response = {
      status: circuitBreakerStatus.isOpen ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisInfoData?.connected || false,
        latency: healthCheck.latency,
        version: redisInfoData?.info?.redis_version || 'unknown',
        mode: redisInfoData?.info?.redis_mode || 'unknown',
        uptime: redisInfoData?.info?.uptime_in_seconds ? 
          parseInt(redisInfoData.info.uptime_in_seconds, 10) : null,
        connectedClients: redisInfoData?.info?.connected_clients ? 
          parseInt(redisInfoData.info.connected_clients, 10) : null,
        usedMemory: redisInfoData?.info?.used_memory_human || 'unknown',
        maxMemory: redisInfoData?.info?.maxmemory_human || 'unlimited',
        memoryUsageRatio: redisInfoData?.info?.used_memory && redisInfoData?.info?.maxmemory ?
          (parseInt(redisInfoData.info.used_memory, 10) / parseInt(redisInfoData.info.maxmemory, 10)) : null,
        keyspaceHits: redisInfoData?.info?.keyspace_hits ? 
          parseInt(redisInfoData.info.keyspace_hits, 10) : null,
        keyspaceMisses: redisInfoData?.info?.keyspace_misses ? 
          parseInt(redisInfoData.info.keyspace_misses, 10) : null,
        hitRatio: redisInfoData?.info?.keyspace_hits && redisInfoData?.info?.keyspace_misses ?
          (parseInt(redisInfoData.info.keyspace_hits, 10) / 
           (parseInt(redisInfoData.info.keyspace_hits, 10) + parseInt(redisInfoData.info.keyspace_misses, 10))) : null,
      },
      cache: {
        available: true,
        totalKeys: cacheStatsData?.totalKeys || 0,
        memoryUsage: cacheStatsData?.memoryUsage || 'unknown',
        keysByPrefix: cacheStatsData?.keysByPrefix || {},
        prefixes: Object.values(CACHE_PREFIXES),
        performance: performanceMetrics.cache,
      },
      rateLimiting: {
        available: true,
        providers: rateLimitData || {},
        performance: performanceMetrics.rateLimit,
      },
      circuitBreaker: {
        isOpen: circuitBreakerStatus.isOpen,
        consecutiveFailures: circuitBreakerStatus.consecutiveFailures,
        openTime: circuitBreakerStatus.openTime
          ? new Date(circuitBreakerStatus.openTime).toISOString()
          : null,
        timeUntilRetry: circuitBreakerStatus.timeUntilRetry
          ? `${Math.ceil(circuitBreakerStatus.timeUntilRetry / 1000)}s`
          : null,
        status: circuitBreakerStatus.isOpen ? 'open' : 'closed',
      },
      environment: {
        redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured',
        nodeEnv: process.env.NODE_ENV || 'unknown',
        vercelEnv: process.env.VERCEL_ENV || 'not vercel',
      },
      healthMonitoring: {
        status: healthMonitorResult.status,
        recommendations: healthMonitorResult.recommendations,
        operationMetrics: healthMonitorResult.operationMetrics,
        lastCheck: healthMonitorResult.timestamp,
      },
      fallbackMode: {
        isActive: fallbackStatus.isActive,
        reason: fallbackStatus.reason,
        activatedAt: fallbackStatus.activatedAt,
        consecutiveFailures: fallbackStatus.consecutiveFailures,
      },
      errorTracking: {
        totalOperations: errorMetrics.totalOperations,
        successfulOperations: errorMetrics.successfulOperations,
        failedOperations: errorMetrics.failedOperations,
        errorRate: errorMetrics.errorRate,
        averageLatency: errorMetrics.averageLatency,
        lastErrorTime: errorMetrics.lastErrorTime,
        recentErrors: recentErrors.map(error => ({
          id: error.id,
          timestamp: error.timestamp,
          type: error.errorType,
          severity: error.severity,
          message: error.message,
          operation: error.context.operation,
          key: error.context.key,
        })),
      },
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Redis health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      redis: {
        connected: false,
        error: 'Health check failed',
      },
      responseTime: Date.now() - startTime,
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * Get performance metrics for cache and rate limiting operations
 */
async function getPerformanceMetrics() {
  const metrics = {
    cache: {
      averageLatency: null as number | null,
      operationsPerSecond: null as number | null,
      errorRate: null as number | null,
    },
    rateLimit: {
      averageLatency: null as number | null,
      operationsPerSecond: null as number | null,
      errorRate: null as number | null,
    },
  };

  try {
    // Test cache performance
    const cacheStartTime = Date.now();
    await executeRedisCommand(async (client) => {
      await client.ping();
      return true;
    });
    const cacheLatency = Date.now() - cacheStartTime;
    metrics.cache.averageLatency = cacheLatency;

    // Test rate limiting performance
    const rateLimitStartTime = Date.now();
    await executeRedisCommand(async (client) => {
      await client.exists('test-key');
      return true;
    });
    const rateLimitLatency = Date.now() - rateLimitStartTime;
    metrics.rateLimit.averageLatency = rateLimitLatency;

  } catch (error) {
    console.warn('Performance metrics collection failed:', error);
  }

  return metrics;
}

/**
 * POST /api/health/redis
 * 
 * Perform Redis maintenance operations (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ..._params } = body;

    // Basic authentication check (in production, use proper auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Admin access required',
      }, { status: 401 });
    }

    switch (action) {
      case 'flush-cache':
        const flushedKeys = await executeRedisCommand(async (client) => {
          const keys = await client.keys('*');
          if (keys.length > 0) {
            return await client.del(keys);
          }
          return 0;
        }, 0);

        return NextResponse.json({
          success: true,
          message: `Flushed ${flushedKeys} keys from Redis cache`,
          timestamp: new Date().toISOString(),
        });

      case 'clear-rate-limits':
        const clearedRateLimits = await executeRedisCommand(async (client) => {
          const keys = await client.keys(`${CACHE_PREFIXES.RATE_LIMIT}*`);
          if (keys.length > 0) {
            return await client.del(keys);
          }
          return 0;
        }, 0);

        return NextResponse.json({
          success: true,
          message: `Cleared ${clearedRateLimits} rate limit entries`,
          timestamp: new Date().toISOString(),
        });

      case 'reset-circuit-breaker':
        const previousStatus = getCircuitBreakerStatus();
        resetCircuitBreaker();

        return NextResponse.json({
          success: true,
          message: 'Circuit breaker has been reset',
          previousStatus: {
            isOpen: previousStatus.isOpen,
            consecutiveFailures: previousStatus.consecutiveFailures,
          },
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          message: 'Supported actions: flush-cache, clear-rate-limits, reset-circuit-breaker',
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Redis maintenance operation failed:', error);
    
    return NextResponse.json({
      error: 'Operation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
