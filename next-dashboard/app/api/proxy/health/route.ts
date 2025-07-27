/**
 * API Proxy Health Check Endpoint - App Router Version
 *
 * Provides status information about the API proxy services
 */

import { NextRequest, NextResponse } from 'next/server';
import { fredProxyService } from '../../services/fred-proxy';
import { blsProxyService } from '../../services/bls-proxy';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    fred: {
      configured: boolean;
      status: 'available' | 'unavailable' | 'unknown';
    };
    bls: {
      configured: boolean;
      status: 'available' | 'unavailable' | 'unknown';
    };
    census: {
      configured: boolean;
      status: 'available' | 'unavailable' | 'unknown';
    };
    alphaVantage: {
      configured: boolean;
      status: 'available' | 'unavailable' | 'unknown';
    };
  };
  environment: {
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
  cache: {
    enabled: boolean;
    size: number;
  };
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Health check handler for GET requests
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {

  try {
    // Check service configurations
    const fredConfigured = fredProxyService.isConfigured();
    const blsConfigured = !!process.env.BLS_API_KEY;
    const censusConfigured = !!process.env.CENSUS_API_KEY;
    const alphaVantageConfigured = !!process.env.ALPHA_VANTAGE_API_KEY;

    // For now, we'll mark services as available if configured
    // In a more robust implementation, you might want to make actual test requests
    const healthCheck: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        fred: {
          configured: fredConfigured,
          status: fredConfigured ? 'available' : 'unavailable',
        },
        bls: {
          configured: blsConfigured,
          status: blsConfigured ? 'available' : 'unavailable',
        },
        census: {
          configured: censusConfigured,
          status: 'unknown', // Not implemented yet
        },
        alphaVantage: {
          configured: alphaVantageConfigured,
          status: 'unknown', // Not implemented yet
        },
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
      cache: {
        enabled: true,
        size: 0, // We don't expose internal cache size for security
      },
    };

    // Determine overall status
    const configuredServices = Object.values(healthCheck.services).filter(s => s.configured).length;
    const availableServices = Object.values(healthCheck.services).filter(s => s.status === 'available').length;

    if (configuredServices === 0) {
      healthCheck.status = 'unhealthy';
    } else if (availableServices < configuredServices) {
      healthCheck.status = 'degraded';
    }

    return NextResponse.json(healthCheck, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (_error) {
    const errorHealthCheck: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        fred: { configured: false, status: 'unknown' },
        bls: { configured: false, status: 'unknown' },
        census: { configured: false, status: 'unknown' },
        alphaVantage: { configured: false, status: 'unknown' },
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
      cache: {
        enabled: false,
        size: 0,
      },
    };

    return NextResponse.json(errorHealthCheck, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}
