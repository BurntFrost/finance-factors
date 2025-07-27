/**
 * API Proxy Utilities
 * 
 * Utility functions for the serverless API proxy
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  ProxyApiResponse,
  ProxyError,
  StandardDataPoint,
  FredObservation,
  BlsDataPoint,
  RATE_LIMITS,
  CACHE_CONFIG,
} from '../types/proxy';

// In-memory cache for rate limiting and response caching
const rateLimit = new Map<string, { requests: number; resetTime: number }>();
const responseCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

/**
 * Handle CORS headers for all API responses
 */
export function setCorsHeaders(res: NextApiResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export function handleCorsOptions(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse<T = unknown>(
  error: ProxyError,
  source: string = 'API Proxy'
): ProxyApiResponse<T> {
  return {
    data: null,
    success: false,
    error: error.message,
    timestamp: new Date(),
    source,
    metadata: {
      isFallback: false,
      reason: error.type,
    },
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  source: string,
  metadata?: ProxyApiResponse<T>['metadata']
): ProxyApiResponse<T> {
  return {
    data,
    success: true,
    timestamp: new Date(),
    source,
    metadata,
  };
}

/**
 * Check rate limits for a provider
 */
export function checkRateLimit(provider: string, clientId: string = 'default'): boolean {
  const key = `${provider}-${clientId}`;
  const now = Date.now();
  const limits = RATE_LIMITS[provider];
  
  if (!limits) return true; // No limits configured
  
  const current = rateLimit.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or initialize rate limit
    rateLimit.set(key, {
      requests: 1,
      resetTime: now + 60000, // 1 minute window
    });
    return true;
  }
  
  if (current.requests >= limits.requestsPerMinute) {
    return false; // Rate limit exceeded
  }
  
  current.requests++;
  return true;
}

/**
 * Get cached response if available and not expired
 */
export function getCachedResponse<T>(cacheKey: string): T | null {
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
export function setCachedResponse(cacheKey: string, data: unknown, ttl: number = CACHE_CONFIG.ttl): void {
  // Clean up old entries if cache is too large
  if (responseCache.size >= CACHE_CONFIG.maxSize) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }
  
  responseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Generate a cache key for a request
 */
export function generateCacheKey(provider: string, seriesId: string, params: Record<string, string>): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${provider}-${seriesId}-${paramString}`;
}

/**
 * Transform FRED observations to standard format
 */
export function transformFredData(observations: FredObservation[]): StandardDataPoint[] {
  return observations
    .filter(obs => obs.value !== '.' && obs.value !== '') // Filter out missing values
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value),
      label: formatDateLabel(obs.date),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronologically
}

/**
 * Transform BLS data to standard format
 */
export function transformBlsData(dataPoints: BlsDataPoint[]): StandardDataPoint[] {
  return dataPoints
    .filter(point => point.value !== '' && point.value !== '.')
    .map(point => {
      // Convert BLS period format to date
      const year = parseInt(point.year);
      const period = point.period;
      
      let month = 1;
      if (period.startsWith('M')) {
        month = parseInt(period.substring(1));
      } else if (period === 'M13') {
        month = 12; // Annual average, use December
      }
      
      const date = new Date(year, month - 1, 1);
      
      return {
        date: date.toISOString().split('T')[0],
        value: parseFloat(point.value),
        label: year.toString(),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Format date for display labels
 */
export function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.getFullYear().toString();
}

/**
 * Validate request parameters (Pages Router version)
 */
export function validateRequest(req: NextApiRequest): { isValid: boolean; error?: ProxyError } {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return {
      isValid: false,
      error: {
        type: 'validation',
        message: 'Only GET and POST methods are allowed',
        statusCode: 405,
        retryable: false,
      },
    };
  }

  return { isValid: true };
}

/**
 * Validate request body (App Router version)
 */
export function validateRequestBody(body: any): { isValid: boolean; error?: ProxyError } {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      error: {
        type: 'validation',
        message: 'Request body must be a valid JSON object',
        statusCode: 400,
        retryable: false,
      },
    };
  }

  if (!body.dataType || typeof body.dataType !== 'string') {
    return {
      isValid: false,
      error: {
        type: 'validation',
        message: 'dataType parameter is required and must be a string',
        statusCode: 400,
        retryable: false,
      },
    };
  }

  return { isValid: true };
}

/**
 * Extract request options from query parameters or body
 */
export function extractRequestOptions(req: NextApiRequest): {
  dataType?: string;
  timeRange?: { start?: string; end?: string };
  useCache?: boolean;
} {
  const isPost = req.method === 'POST';
  const source = isPost ? req.body : req.query;
  
  return {
    dataType: source.dataType as string,
    timeRange: source.timeRange ? {
      start: source.timeRange.start as string,
      end: source.timeRange.end as string,
    } : undefined,
    useCache: source.useCache !== 'false', // Default to true
  };
}

/**
 * Extract request options from request body (App Router version)
 */
export function extractRequestOptionsFromBody(body: any): {
  dataType: string;
  timeRange?: { start: Date; end: Date };
  useCache: boolean;
} {
  return {
    dataType: body.dataType,
    timeRange: body.timeRange ? {
      start: new Date(body.timeRange.start),
      end: new Date(body.timeRange.end),
    } : undefined,
    useCache: body.useCache !== false, // Default to true
  };
}

/**
 * Get environment variable with validation
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Make HTTP request with timeout and error handling
 */
export async function makeHttpRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Finance-Factors-Dashboard/1.0',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
    
    throw new Error('Unknown request error');
  }
}

/**
 * Log API request for monitoring
 */
export function logApiRequest(
  provider: string,
  dataType: string,
  success: boolean,
  duration: number,
  error?: string
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    provider,
    dataType,
    success,
    duration,
    error,
  };
  
  // In production, you might want to send this to a logging service
  console.log('API Request:', JSON.stringify(logEntry));
}
