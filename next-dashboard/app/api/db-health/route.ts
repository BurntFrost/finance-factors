/**
 * Database Health Check API Route
 * 
 * Tests the connection to Vercel Postgres database
 * and provides detailed health information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '../../lib/prisma';
import { dbConnectionMonitor } from '../../lib/db-connection-monitor';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeMonitoring = url.searchParams.get('monitoring') === 'true';

    // Check database connection health
    const healthCheck = await checkDatabaseHealth();

    // Get monitoring data if requested
    const monitoringData = includeMonitoring ? dbConnectionMonitor.getStatus() : null;

    if (healthCheck.status === 'healthy') {
      return NextResponse.json({
        status: 'healthy',
        database: {
          status: 'connected',
          latency: healthCheck.latency,
          provider: 'postgresql',
          connection: 'prisma-accelerate',
        },
        monitoring: monitoringData,
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    } else if (healthCheck.status === 'connection_limit') {
      return NextResponse.json({
        status: 'degraded',
        database: {
          status: 'connection_limit_reached',
          error: healthCheck.error,
          provider: 'postgresql',
          connection: 'prisma-accelerate',
          message: 'Database connection limit reached, using fallback caching',
        },
        monitoring: monitoringData,
        timestamp: new Date().toISOString(),
      }, { status: 429 });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        database: {
          status: 'disconnected',
          error: healthCheck.error,
          provider: 'postgresql',
          connection: 'prisma-accelerate',
        },
        monitoring: monitoringData,
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      database: {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'postgresql',
        connection: 'vercel-postgres',
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Add CORS headers for development
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
