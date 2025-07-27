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

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
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
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
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

    // Log the request
    const duration = Date.now() - startTime;
    logApiRequest(
      endpointConfig.provider,
      dataType,
      response.success,
      duration,
      response.error
    );

    // Send response with appropriate status code and CORS headers
    const statusCode = response.success ? 200 : getStatusCodeFromError(response.error);
    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
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
