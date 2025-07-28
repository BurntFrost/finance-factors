/**
 * Main API Proxy Endpoint - App Router Version
 *
 * Next.js 15 App Router API route that proxies requests to external APIs
 * Handles CORS, rate limiting, caching, and API key security
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ProxyApiResponse,
  StandardDataPoint,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '../../types/proxy';
import {
  createErrorResponse,
  validateRequestBody,
  extractRequestOptionsFromBody,
  logApiRequest,
} from '../../utils/proxy-utils';
import { fredProxyService } from '../../services/fred-proxy';
import { blsProxyService } from '../../services/bls-proxy';
import { censusProxyService } from '../../services/census-proxy';
import { alphaVantageProxyService } from '../../services/alpha-vantage-proxy';
import { cache } from '../../../lib/advanced-cache';
import { compressionManager } from '../../../lib/compression';
import { httpPool } from '../../../lib/connection-pool';

/**
 * CORS headers for all responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}



/**
 * Main API proxy handler for POST requests
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();

    // Validate and extract request data
    const validation = validateRequestBody(body);
    if (!validation.isValid) {
      const errorResponse = createErrorResponse(validation.error!, 'API Proxy');
      return NextResponse.json(errorResponse, {
        status: validation.error!.statusCode,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const { dataType, timeRange, useCache } = extractRequestOptionsFromBody(body);

    // Check advanced cache first
    if (useCache) {
      const cacheKey = `api:${dataType}:${JSON.stringify(timeRange)}`;
      const cached = await cache.get<ProxyApiResponse<StandardDataPoint[]>>(cacheKey);
      if (cached) {
        // Add cache hit headers and apply compression
        const acceptEncoding = request.headers.get('accept-encoding');
        const compressed = acceptEncoding ?
          await compressionManager.compressJson(cached, acceptEncoding) : null;

        const headers = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Cache': 'HIT',
          'X-Cache-Level': 'advanced',
          ...(compressed && {
            'Content-Encoding': compressed.encoding,
            'Content-Length': compressed.data.length.toString(),
            'Vary': 'Accept-Encoding',
          }),
        };

        return new NextResponse(compressed?.data || JSON.stringify(cached), {
          status: 200,
          headers,
        });
      }
    }

    // Get endpoint configuration
    const endpointConfig = PROXY_API_ENDPOINTS[dataType];
    if (!endpointConfig) {
      const error: ProxyError = {
        type: 'validation',
        message: `Unknown data type: ${dataType}`,
        statusCode: 400,
        retryable: false,
      };
      const errorResponse = createErrorResponse(error, 'API Proxy');
      return NextResponse.json(errorResponse, {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    let response: ProxyApiResponse<StandardDataPoint[]>;

    // Route to appropriate service based on provider
    switch (endpointConfig.provider) {
      case 'FRED':
        response = await fredProxyService.fetchSeries(dataType, {
          startDate: timeRange?.start ? timeRange.start.toISOString().split('T')[0] : undefined,
          endDate: timeRange?.end ? timeRange.end.toISOString().split('T')[0] : undefined,
          useCache,
        });
        break;

      case 'BLS':
        response = await blsProxyService.fetchSeries(dataType, {
          startYear: timeRange?.start ? timeRange.start.getFullYear() : undefined,
          endYear: timeRange?.end ? timeRange.end.getFullYear() : undefined,
        });
        break;

      case 'CENSUS':
        response = await censusProxyService.fetchSeries(dataType, {
          startYear: timeRange?.start ? timeRange.start.getFullYear() : undefined,
          endYear: timeRange?.end ? timeRange.end.getFullYear() : undefined,
          useCache,
        });
        break;

      case 'ALPHA_VANTAGE':
        response = await alphaVantageProxyService.fetchSeries(dataType, {
          startDate: timeRange?.start ? timeRange.start.toISOString().split('T')[0] : undefined,
          endDate: timeRange?.end ? timeRange.end.toISOString().split('T')[0] : undefined,
          useCache,
        });
        break;

      default:
        const unknownError: ProxyError = {
          type: 'validation',
          message: `Unsupported provider: ${endpointConfig.provider}`,
          statusCode: 400,
          retryable: false,
        };
        response = createErrorResponse(unknownError, 'API Proxy');
        break;
    }

    // Cache successful responses
    if (response.success && useCache) {
      const cacheKey = `api:${dataType}:${JSON.stringify(timeRange)}`;
      await cache.set(cacheKey, response, {
        ttl: 900, // 15 minutes
        tags: [dataType, endpointConfig.provider, 'api-response'],
        priority: 'normal',
      });
    }

    // Log the request
    const duration = Date.now() - startTime;
    logApiRequest(
      endpointConfig.provider,
      dataType,
      response.success,
      duration,
      response.error
    );

    // Apply compression and send response
    const statusCode = response.success ? 200 : getStatusCodeFromError(response.error);
    const acceptEncoding = request.headers.get('accept-encoding');
    const compressed = acceptEncoding ?
      await compressionManager.compressJson(response, acceptEncoding) : null;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Response-Time': `${duration}ms`,
      'X-Cache': 'MISS',
      ...(compressed && {
        'Content-Encoding': compressed.encoding,
        'Content-Length': compressed.data.length.toString(),
        'Vary': 'Accept-Encoding',
        'X-Compression-Ratio': compressed.stats.compressionRatio.toFixed(2),
      }),
    };

    return new NextResponse(compressed?.data || JSON.stringify(response), {
      status: statusCode,
      headers,
    });

  } catch (error) {
    // Handle unexpected errors
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';

    logApiRequest('UNKNOWN', 'unknown', false, duration, errorMessage);

    const serverError: ProxyError = {
      type: 'unknown',
      message: 'Internal server error',
      statusCode: 500,
      retryable: true,
    };

    return NextResponse.json(createErrorResponse(serverError, 'API Proxy'), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

/**
 * Extract status code from error message
 */
function getStatusCodeFromError(errorMessage?: string): number {
  if (!errorMessage) return 500;
  
  if (errorMessage.includes('rate limit')) return 429;
  if (errorMessage.includes('validation') || errorMessage.includes('Invalid')) return 400;
  if (errorMessage.includes('not found') || errorMessage.includes('No valid data')) return 404;
  if (errorMessage.includes('timeout') || errorMessage.includes('network')) return 504;
  if (errorMessage.includes('not yet implemented')) return 501;
  
  return 500;
}
