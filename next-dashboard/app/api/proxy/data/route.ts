/**
 * Main API Proxy Data Route (App Router)
 * 
 * Handles requests for financial data through the API proxy
 */

import { NextRequest, NextResponse } from 'next/server';

// Import types and utilities
interface ProxyApiResponse<T = unknown> {
  data: T | null;
  success: boolean;
  error?: string;
  timestamp: string;
  source: string;
  metadata?: {
    totalRecords?: number;
    rateLimit?: {
      remaining: number;
      resetTime: string;
    };
    isFallback?: boolean;
    reason?: string;
  };
}

interface StandardDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface ProxyRequestOptions {
  dataType: string;
  timeRange?: {
    start?: string;
    end?: string;
  };
  useCache?: boolean;
}

// FRED API specific types
interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

interface FredApiResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredObservation[];
}

// Configuration for different data sources
const PROXY_API_ENDPOINTS: Record<string, {
  provider: 'FRED' | 'BLS' | 'CENSUS' | 'ALPHA_VANTAGE';
  seriesId?: string;
  endpoint: string;
  params?: Record<string, string>;
}> = {
  'house-prices': {
    provider: 'FRED',
    seriesId: 'CSUSHPISA',
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'federal-funds-rate': {
    provider: 'FRED',
    seriesId: 'FEDFUNDS',
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'unemployment-rate': {
    provider: 'FRED',
    seriesId: 'UNRATE',
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
};

// In-memory cache
const responseCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Transform FRED observations to standard format
 */
function transformFredData(observations: FredObservation[]): StandardDataPoint[] {
  return observations
    .filter(obs => obs.value !== '.' && obs.value !== '')
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value),
      label: new Date(obs.date).getFullYear().toString(),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse<T>(cacheKey: string): T | null {
  const cached = responseCache.get(cacheKey);
  
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.timestamp + cached.ttl) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  return cached.data as T;
}

/**
 * Cache a response
 */
function setCachedResponse(cacheKey: string, data: unknown, ttl: number = CACHE_TTL): void {
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Fetch data from FRED API
 */
async function fetchFromFred(
  seriesId: string,
  params: Record<string, string>,
  options: { startDate?: string; endDate?: string }
): Promise<StandardDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED API key not configured');
  }

  const urlParams = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    ...params,
  });

  if (options.startDate) {
    urlParams.append('observation_start', options.startDate);
  }
  if (options.endDate) {
    urlParams.append('observation_end', options.endDate);
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?${urlParams}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Finance-Factors-Dashboard/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
  }

  const data: FredApiResponse = await response.json();

  if ('error_code' in data) {
    throw new Error(`FRED API error: ${(data as any).error_message}`);
  }

  if (!data.observations || !Array.isArray(data.observations)) {
    throw new Error('Invalid response format from FRED API');
  }

  return transformFredData(data.observations);
}

/**
 * POST /api/proxy/data
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProxyApiResponse<StandardDataPoint[]>>> {
  const startTime = Date.now();

  try {
    const body: ProxyRequestOptions = await request.json();
    const { dataType, timeRange, useCache = true } = body;

    if (!dataType) {
      return NextResponse.json({
        data: null,
        success: false,
        error: 'dataType parameter is required',
        timestamp: new Date().toISOString(),
        source: 'API Proxy',
      }, {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Get endpoint configuration
    const endpointConfig = PROXY_API_ENDPOINTS[dataType];
    if (!endpointConfig) {
      return NextResponse.json({
        data: null,
        success: false,
        error: `Unknown data type: ${dataType}`,
        timestamp: new Date().toISOString(),
        source: 'API Proxy',
      }, {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Generate cache key
    const cacheKey = `${endpointConfig.provider}-${endpointConfig.seriesId}-${JSON.stringify(timeRange)}`;

    // Check cache if enabled
    if (useCache) {
      const cached = getCachedResponse<StandardDataPoint[]>(cacheKey);
      if (cached) {
        return NextResponse.json({
          data: cached,
          success: true,
          timestamp: new Date().toISOString(),
          source: `${endpointConfig.provider} API (Cached)`,
          metadata: {
            totalRecords: cached.length,
            rateLimit: {
              remaining: 120,
              resetTime: new Date(Date.now() + 60000).toISOString(),
            },
          },
        }, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }
    }

    let transformedData: StandardDataPoint[];

    // Route to appropriate service based on provider
    switch (endpointConfig.provider) {
      case 'FRED':
        if (!endpointConfig.seriesId) {
          throw new Error('Series ID required for FRED API');
        }
        transformedData = await fetchFromFred(
          endpointConfig.seriesId,
          endpointConfig.params || {},
          {
            startDate: timeRange?.start,
            endDate: timeRange?.end,
          }
        );
        break;

      default:
        return NextResponse.json({
          data: null,
          success: false,
          error: `Provider ${endpointConfig.provider} not yet implemented`,
          timestamp: new Date().toISOString(),
          source: 'API Proxy',
        }, {
          status: 501,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
    }

    if (transformedData.length === 0) {
      return NextResponse.json({
        data: null,
        success: false,
        error: 'No valid data points found',
        timestamp: new Date().toISOString(),
        source: `${endpointConfig.provider} API`,
      }, {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Cache the response
    if (useCache) {
      setCachedResponse(cacheKey, transformedData);
    }

    const duration = Date.now() - startTime;
    console.log(`API Proxy: ${endpointConfig.provider} ${dataType} - Success (${duration}ms)`);

    return NextResponse.json({
      data: transformedData,
      success: true,
      timestamp: new Date().toISOString(),
      source: `${endpointConfig.provider} API`,
      metadata: {
        totalRecords: transformedData.length,
        rateLimit: {
          remaining: 120,
          resetTime: new Date(Date.now() + 60000).toISOString(),
        },
      },
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    
    console.error(`API Proxy Error (${duration}ms):`, errorMessage);

    return NextResponse.json({
      data: null,
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      source: 'API Proxy',
    }, {
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
 * OPTIONS /api/proxy/data (CORS preflight)
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
