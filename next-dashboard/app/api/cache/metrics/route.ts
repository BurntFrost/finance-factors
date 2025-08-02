/**
 * Cache Metrics API Endpoint
 * 
 * Provides comprehensive cache monitoring metrics and health status
 * for all API data source caching operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiCacheMonitor } from '@/backend/lib/api-cache-monitor';
import { apiCacheService } from '@/backend/lib/api-cache-service';

/**
 * GET /api/cache/metrics
 * 
 * Returns comprehensive cache metrics including:
 * - Provider-specific metrics
 * - Overall cache health status
 * - Recent operations
 * - Cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const includeOperations = searchParams.get('includeOperations') === 'true';
    const operationsLimit = parseInt(searchParams.get('operationsLimit') || '50');

    // Get comprehensive metrics
    const metrics = apiCacheMonitor.exportMetrics();
    const cacheStats = apiCacheService.getCacheStats();

    // Filter by provider if specified
    let providerMetrics = metrics.providers;
    if (provider) {
      providerMetrics = metrics.providers.filter(
        p => p.provider.toLowerCase() === provider.toLowerCase()
      );
    }

    // Prepare response data
    const responseData: any = {
      timestamp: new Date().toISOString(),
      health: metrics.health,
      providers: providerMetrics,
      overall: {
        totalHits: cacheStats.totalHits,
        totalMisses: cacheStats.totalMisses,
        hitRate: cacheStats.hitRate,
        providerStats: cacheStats.providerStats,
      },
    };

    // Include recent operations if requested
    if (includeOperations) {
      responseData.recentOperations = apiCacheMonitor.getRecentOperations(operationsLimit);
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error fetching cache metrics:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch cache metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/metrics/clear
 * 
 * Clears cache metrics history (for testing/debugging)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear') {
      // Clear monitoring history
      apiCacheMonitor.clearHistory();
      
      // Clear cache statistics
      apiCacheService.clearStats();

      return NextResponse.json({
        success: true,
        message: 'Cache metrics history cleared',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        message: 'Supported actions: clear',
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error clearing cache metrics:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to clear cache metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cache/metrics/health
 * 
 * Returns simplified health check for monitoring systems
 */
export async function HEAD(_request: NextRequest) {
  try {
    const health = apiCacheMonitor.getCacheHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 206 : 503;

    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'X-Cache-Status': health.status,
        'X-Cache-Hit-Rate': health.hitRate.toFixed(3),
        'X-Cache-Response-Time': health.averageResponseTime.toFixed(0),
        'X-Cache-Error-Rate': health.errorRate.toFixed(3),
        'X-Redis-Connected': health.redisConnected.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error checking cache health:', error);
    
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Cache-Status': 'critical',
        'X-Error': 'Health check failed',
      },
    });
  }
}
