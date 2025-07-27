/**
 * Main API Proxy Endpoint
 * 
 * Vercel serverless function that proxies requests to external APIs
 * Handles CORS, rate limiting, caching, and API key security
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  ProxyApiResponse,
  StandardDataPoint,
  ProxyError,
  PROXY_API_ENDPOINTS,
} from '../types/proxy';
import {
  setCorsHeaders,
  handleCorsOptions,
  createErrorResponse,
  validateRequest,
  extractRequestOptions,
  logApiRequest,
} from '../utils/proxy-utils';
import { fredProxyService } from '../services/fred-proxy';

/**
 * Main API proxy handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProxyApiResponse<StandardDataPoint[]>>
): Promise<void> {
  const startTime = Date.now();

  // Handle CORS preflight requests
  if (handleCorsOptions(req, res)) {
    return;
  }

  // Set CORS headers for all responses
  setCorsHeaders(res);

  try {
    // Validate request method
    const validation = validateRequest(req);
    if (!validation.isValid) {
      res.status(validation.error!.statusCode || 400).json(
        createErrorResponse(validation.error!, 'API Proxy')
      );
      return;
    }

    // Extract request options
    const options = extractRequestOptions(req);
    const { dataType, timeRange, useCache } = options;

    if (!dataType) {
      const error: ProxyError = {
        type: 'validation',
        message: 'dataType parameter is required',
        statusCode: 400,
        retryable: false,
      };
      res.status(400).json(createErrorResponse(error, 'API Proxy'));
      return;
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
      res.status(400).json(createErrorResponse(error, 'API Proxy'));
      return;
    }

    let response: ProxyApiResponse<StandardDataPoint[]>;

    // Route to appropriate service based on provider
    switch (endpointConfig.provider) {
      case 'FRED':
        response = await fredProxyService.fetchSeries(dataType, {
          startDate: timeRange?.start,
          endDate: timeRange?.end,
          useCache,
        });
        break;

      case 'BLS':
        // TODO: Implement BLS proxy service
        const blsError: ProxyError = {
          type: 'api',
          message: 'BLS API proxy not yet implemented',
          statusCode: 501,
          retryable: false,
        };
        response = createErrorResponse(blsError, 'API Proxy');
        break;

      case 'CENSUS':
        // TODO: Implement Census proxy service
        const censusError: ProxyError = {
          type: 'api',
          message: 'Census API proxy not yet implemented',
          statusCode: 501,
          retryable: false,
        };
        response = createErrorResponse(censusError, 'API Proxy');
        break;

      case 'ALPHA_VANTAGE':
        // TODO: Implement Alpha Vantage proxy service
        const alphaError: ProxyError = {
          type: 'api',
          message: 'Alpha Vantage API proxy not yet implemented',
          statusCode: 501,
          retryable: false,
        };
        response = createErrorResponse(alphaError, 'API Proxy');
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

    // Send response with appropriate status code
    const statusCode = response.success ? 200 : getStatusCodeFromError(response.error);
    res.status(statusCode).json(response);

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

    res.status(500).json(createErrorResponse(serverError, 'API Proxy'));
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
