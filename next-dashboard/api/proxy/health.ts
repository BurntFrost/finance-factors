/**
 * API Proxy Health Check Endpoint
 * 
 * Provides status information about the API proxy services
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  setCorsHeaders,
  handleCorsOptions,
  createSuccessResponse,
} from '../utils/proxy-utils';
import { fredProxyService } from '../services/fred-proxy';

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
 * Health check handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
): Promise<void> {
  // Handle CORS preflight requests
  if (handleCorsOptions(req, res)) {
    return;
  }

  // Set CORS headers
  setCorsHeaders(res);

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
          status: 'unknown', // Not implemented yet
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

    res.status(200).json(healthCheck);

  } catch (error) {
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

    res.status(503).json(errorHealthCheck);
  }
}
