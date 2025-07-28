/**
 * Database Health Check API Route
 * 
 * Tests the connection to Vercel Postgres database
 * and provides detailed health information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '../../lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    // Check database connection health
    const healthCheck = await checkDatabaseHealth();
    
    if (healthCheck.status === 'healthy') {
      return NextResponse.json({
        status: 'healthy',
        database: {
          status: 'connected',
          latency: healthCheck.latency,
          provider: 'postgresql',
          connection: 'vercel-postgres',
        },
        timestamp: new Date().toISOString(),
      }, { status: 200 });
    } else {
      return NextResponse.json({
        status: 'unhealthy',
        database: {
          status: 'disconnected',
          error: healthCheck.error,
          provider: 'postgresql',
          connection: 'vercel-postgres',
        },
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
