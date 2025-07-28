/**
 * Application Status API Route
 * 
 * Provides application status information including feature toggles,
 * configuration, and health status. Also triggers startup logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeatureToggleStatus } from '@/backend/lib/feature-toggles';
import '@/backend/lib/startup-logger'; // Import to trigger startup logging

/**
 * GET /api/status
 * 
 * Returns comprehensive application status including:
 * - Feature toggle status (Redis, Prisma)
 * - Configuration information
 * - Environment details
 */
export async function GET(request: NextRequest) {
  try {
    const featureToggles = getFeatureToggleStatus();
    
    const status = {
      application: {
        name: 'Finance Factors Dashboard',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
      features: featureToggles,
      configuration: {
        dataSource: {
          default: process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE || 'not set',
          useApiProxy: process.env.NEXT_PUBLIC_USE_API_PROXY === 'true',
          enableCaching: process.env.NEXT_PUBLIC_ENABLE_CACHING === 'true',
        },
        apis: {
          fred: process.env.NEXT_PUBLIC_FRED_API_KEY ? 'configured' : 'not configured',
          bls: process.env.NEXT_PUBLIC_BLS_API_KEY ? 'configured' : 'not configured',
          census: process.env.NEXT_PUBLIC_CENSUS_API_KEY ? 'configured' : 'not configured',
          alphaVantage: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY ? 'configured' : 'not configured',
        },
      },
      services: {
        redis: {
          enabled: featureToggles.redis.enabled,
          status: featureToggles.redis.enabled ? 'enabled' : 'disabled',
          reason: featureToggles.redis.reason,
        },
        prisma: {
          enabled: featureToggles.prisma.enabled,
          status: featureToggles.prisma.enabled ? 'enabled' : 'disabled',
          reason: featureToggles.prisma.reason,
        },
      },
    };

    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Status check failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
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
