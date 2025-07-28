/**
 * Performance Monitoring API
 * 
 * Provides comprehensive performance metrics and monitoring data
 * for the Finance Factors Dashboard application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/backend/lib/advanced-cache';
import { compressionManager } from '@/backend/lib/compression';
import { requestBatcher } from '@/backend/lib/request-batcher';
import { checkDatabaseHealth } from '@/backend/lib/prisma';
import { isRedisAvailable } from '@/backend/lib/redis';

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/performance
 * 
 * Returns comprehensive performance metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    const category = searchParams.get('category'); // cache, compression, database, etc.

    // Collect performance metrics
    const metrics = await collectPerformanceMetrics(includeDetails, category);
    
    const responseTime = Date.now() - startTime;
    
    const response = {
      success: true,
      data: metrics,
      metadata: {
        responseTime,
        timestamp: new Date().toISOString(),
        includeDetails,
        category,
      },
    };

    // Apply compression
    const acceptEncoding = request.headers.get('accept-encoding');
    const compressed = acceptEncoding ? 
      await compressionManager.compressJson(response, acceptEncoding) : null;
    
    const headers = {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'X-Response-Time': `${responseTime}ms`,
      ...(compressed && {
        'Content-Encoding': compressed.encoding,
        'Content-Length': compressed.data.length.toString(),
        'Vary': 'Accept-Encoding',
      }),
    };

    return new NextResponse(compressed?.data || JSON.stringify(response), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Performance API error:', error);
    
    const errorResponse = {
      success: false,
      error: {
        type: 'internal_error',
        message: 'Failed to collect performance metrics',
        statusCode: 500,
      },
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

/**
 * POST /api/performance
 * 
 * Record custom performance metrics
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { metricType, value, unit, context } = body;

    if (!metricType || value === undefined) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'metricType and value are required',
          statusCode: 400,
        },
      }, {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    // Store metric (in a real implementation, you'd store this in a time-series database)
    const metric = {
      metricType,
      value,
      unit: unit || 'count',
      context: context || {},
      timestamp: new Date().toISOString(),
    };

    // For now, we'll just log it
    console.log('Custom performance metric:', metric);

    const response = {
      success: true,
      data: {
        recorded: true,
        metric,
      },
      metadata: {
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error('Performance recording error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        type: 'internal_error',
        message: 'Failed to record performance metric',
        statusCode: 500,
      },
    }, {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

/**
 * Collect comprehensive performance metrics
 */
async function collectPerformanceMetrics(includeDetails: boolean = false, category?: string | null) {
  const metrics: any = {
    overview: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  // Cache metrics
  if (!category || category === 'cache') {
    try {
      const cacheStats = cache.stats();
      metrics.cache = {
        levels: cacheStats,
        summary: {
          totalHits: Object.values(cacheStats).reduce((sum, stat) => sum + stat.hits, 0),
          totalMisses: Object.values(cacheStats).reduce((sum, stat) => sum + stat.misses, 0),
          avgHitRate: Object.values(cacheStats).reduce((sum, stat) => sum + stat.hitRate, 0) / Object.keys(cacheStats).length,
          totalSize: Object.values(cacheStats).reduce((sum, stat) => sum + stat.totalSize, 0),
          avgResponseTime: Object.values(cacheStats).reduce((sum, stat) => sum + stat.avgResponseTime, 0) / Object.keys(cacheStats).length,
        },
      };
    } catch (_error) {
      metrics.cache = { error: 'Failed to collect cache metrics' };
    }
  }

  // Compression metrics
  if (!category || category === 'compression') {
    try {
      const compressionStats = compressionManager.getStats();
      metrics.compression = {
        byContentType: compressionStats,
        summary: {
          totalRequests: Object.values(compressionStats).reduce((sum, stat) => sum + stat.totalRequests, 0),
          avgCompressionRatio: Object.values(compressionStats).reduce((sum, stat) => sum + stat.avgCompressionRatio, 0) / Object.keys(compressionStats).length || 0,
          totalBytesSaved: Object.values(compressionStats).reduce((sum, stat) => sum + stat.totalBytesSaved, 0),
        },
      };
    } catch (_error) {
      metrics.compression = { error: 'Failed to collect compression metrics' };
    }
  }

  // Request batching metrics
  if (!category || category === 'batching') {
    try {
      const batchingStats = requestBatcher.getMetrics();
      metrics.batching = batchingStats;
    } catch (_error) {
      metrics.batching = { error: 'Failed to collect batching metrics' };
    }
  }

  // Database health
  if (!category || category === 'database') {
    try {
      const dbHealth = await checkDatabaseHealth();
      metrics.database = {
        health: dbHealth,
        connectionPool: {
          // Would include connection pool stats if available
          status: dbHealth.status === 'healthy' ? 'operational' : 'degraded',
        },
      };
    } catch (_error) {
      metrics.database = {
        health: { status: 'unhealthy', error: 'Database check failed' },
        connectionPool: { status: 'unknown' },
      };
    }
  }

  // Redis health
  if (!category || category === 'redis') {
    try {
      const redisAvailable = await isRedisAvailable();
      metrics.redis = {
        available: redisAvailable,
        status: redisAvailable ? 'operational' : 'unavailable',
      };
    } catch (_error) {
      metrics.redis = {
        available: false,
        status: 'error',
        error: 'Redis check failed',
      };
    }
  }

  // API health checks
  if (!category || category === 'api') {
    try {
      const apiChecks = await Promise.allSettled([
        checkApiEndpoint('/api/proxy/health'),
        checkApiEndpoint('/api/graphql'),
      ]);

      metrics.api = {
        endpoints: {
          proxy: apiChecks[0].status === 'fulfilled' ? apiChecks[0].value : { status: 'error' },
          graphql: apiChecks[1].status === 'fulfilled' ? apiChecks[1].value : { status: 'error' },
        },
      };
    } catch (_error) {
      metrics.api = { error: 'Failed to check API endpoints' };
    }
  }

  // Include detailed metrics if requested
  if (includeDetails) {
    metrics.details = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextjsVersion: require('next/package.json').version,
        // Add other relevant environment details
      },
      timing: {
        collectionTime: Date.now(),
        // Add timing breakdowns
      },
    };
  }

  return metrics;
}

/**
 * Check API endpoint health
 */
async function checkApiEndpoint(endpoint: string): Promise<{ status: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Performance-Monitor/1.0',
      },
    });

    const responseTime = Date.now() - startTime;
    
    return {
      status: response.ok ? 'healthy' : 'degraded',
      responseTime,
    };
  } catch (_error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
    };
  }
}
