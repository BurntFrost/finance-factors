/**
 * Performance Dashboard API
 * 
 * Provides comprehensive performance metrics and monitoring data
 * for the dashboard interface.
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/backend/lib/performance-monitoring';
import { cache } from '@/backend/lib/advanced-cache';
import { optimizedDb } from '@/backend/lib/optimized-database-service';
import { enhancedCacheStrategy } from '@/backend/lib/enhanced-cache-strategy';
import { dbConnectionMonitor } from '@/backend/lib/db-connection-monitor';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as '1h' | '24h' | '7d' | '30d' || '24h';
    const includeDetails = searchParams.get('details') === 'true';
    const format = searchParams.get('format') as 'json' | 'prometheus' || 'json';

    // If prometheus format requested, return metrics in that format
    if (format === 'prometheus') {
      const prometheusData = performanceMonitor.exportMetrics('prometheus');
      return new NextResponse(prometheusData, {
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Collect comprehensive performance data
    const [
      summary,
      alerts,
      alertHistory,
      systemMetrics,
      databaseMetrics,
      cacheMetrics,
      trends,
    ] = await Promise.all([
      performanceMonitor.getSummary(),
      performanceMonitor.getAlerts(),
      performanceMonitor.getAlertHistory(20),
      collectSystemMetrics(timeframe),
      collectDatabaseMetrics(),
      collectCacheMetrics(),
      collectTrends(timeframe),
    ]);

    const responseTime = Date.now() - startTime;

    const dashboardData = {
      timestamp: new Date().toISOString(),
      responseTime,
      timeframe,
      summary,
      alerts: {
        active: alerts,
        history: alertHistory,
        counts: {
          total: alerts.length,
          critical: alerts.filter(a => a.level === 'critical').length,
          warning: alerts.filter(a => a.level === 'warning').length,
          error: alerts.filter(a => a.level === 'error').length,
        },
      },
      metrics: {
        system: systemMetrics,
        database: databaseMetrics,
        cache: cacheMetrics,
      },
      trends,
      ...(includeDetails && {
        details: {
          rawMetrics: performanceMonitor.getMetrics(),
          systemInfo: getSystemInfo(),
          configuration: getConfigurationInfo(),
        },
      }),
    };

    // Record this API call performance
    performanceMonitor.recordMetric('api.performance_dashboard.response_time', responseTime, 'ms');

    return NextResponse.json({
      success: true,
      data: dashboardData,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Performance dashboard API error:', error);

    // Record error metric
    performanceMonitor.recordMetric('api.performance_dashboard.error_rate', 1, 'count');

    return NextResponse.json({
      success: false,
      error: 'Failed to collect performance data',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime,
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'resolve_alert':
        if (data.alertId) {
          performanceMonitor.resolveAlert(data.alertId);
          return NextResponse.json({ success: true, message: 'Alert resolved' });
        }
        break;

      case 'set_threshold':
        if (data.metric && data.warning && data.critical) {
          performanceMonitor.setThreshold(data.metric, data.warning, data.critical);
          return NextResponse.json({ success: true, message: 'Threshold updated' });
        }
        break;

      case 'add_collector':
        if (data.name && data.interval) {
          // This would require dynamic function creation, which is complex
          // For now, return a placeholder response
          return NextResponse.json({ 
            success: false, 
            message: 'Custom collectors not yet supported via API' 
          });
        }
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action',
        }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid request data',
    }, { status: 400 });

  } catch (error) {
    console.error('Performance dashboard POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Helper functions

async function collectSystemMetrics(timeframe: string) {
  const metrics = {
    memory: performanceMonitor.getTrends('memory.usage_percent', timeframe as any),
    cpu: performanceMonitor.getTrends('cpu.usage_percent', timeframe as any),
    responseTime: performanceMonitor.getTrends('api.response_time', timeframe as any),
    errorRate: performanceMonitor.getTrends('error.rate_percent', timeframe as any),
  };

  // Add current values
  const currentMetrics = performanceMonitor.getMetrics();
  const latest = (metricName: string) => {
    const metric = currentMetrics.find(m => m.name === metricName);
    return metric ? metric.value : 0;
  };

  return {
    ...metrics,
    current: {
      memory: latest('memory.usage_percent'),
      cpu: latest('cpu.usage_percent'),
      responseTime: latest('api.response_time'),
      errorRate: latest('error.rate_percent'),
    },
  };
}

async function collectDatabaseMetrics() {
  const dbMetrics = optimizedDb.getMetrics();
  const connectionMetrics = dbConnectionMonitor.getMetrics();

  return {
    queries: {
      total: dbMetrics.totalQueries,
      cached: dbMetrics.cachedQueries,
      batched: dbMetrics.batchedQueries,
      failed: dbMetrics.failedQueries,
      cacheHitRate: dbMetrics.cacheHitRate,
      batchingRate: dbMetrics.batchingRate,
      avgQueryTime: dbMetrics.avgQueryTime,
    },
    connections: {
      active: connectionMetrics.activeConnections,
      total: connectionMetrics.totalConnections,
      errors: connectionMetrics.connectionErrors,
      poolUtilization: dbMetrics.connectionPoolUtilization,
    },
  };
}

async function collectCacheMetrics() {
  const cacheStats = cache.stats();
  const enhancedStats = enhancedCacheStrategy.getMetrics();

  return {
    levels: cacheStats,
    enhanced: enhancedStats,
    summary: {
      totalHits: Object.values(cacheStats).reduce((sum, stat) => sum + stat.hits, 0),
      totalMisses: Object.values(cacheStats).reduce((sum, stat) => sum + stat.misses, 0),
      avgHitRate: Object.values(cacheStats).reduce((sum, stat) => sum + stat.hitRate, 0) / Object.keys(cacheStats).length,
      totalSize: Object.values(cacheStats).reduce((sum, stat) => sum + stat.totalSize, 0),
      compressionSavings: enhancedStats.compressionSavingsMB,
    },
  };
}

async function collectTrends(timeframe: string) {
  const trendMetrics = [
    'api.response_time',
    'memory.usage_percent',
    'cpu.usage_percent',
    'database.query_time',
    'cache.hit_rate',
    'error.rate_percent',
  ];

  const trends: Record<string, any> = {};
  
  for (const metric of trendMetrics) {
    try {
      trends[metric] = performanceMonitor.getTrends(metric, timeframe as any);
    } catch (error) {
      console.warn(`Failed to get trend for ${metric}:`, error);
      trends[metric] = {
        metric,
        timeframe,
        values: [],
        trend: 'stable',
        changePercent: 0,
      };
    }
  }

  return trends;
}

function getSystemInfo() {
  if (typeof process === 'undefined') {
    return { platform: 'browser', version: 'unknown' };
  }

  return {
    platform: process.platform,
    nodeVersion: process.version,
    architecture: process.arch,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
  };
}

function getConfigurationInfo() {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    redisEnabled: process.env.REDIS_ENABLED === 'true',
    databaseEnabled: process.env.DATABASE_URL ? true : false,
    cacheEnabled: true,
    monitoringEnabled: true,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
