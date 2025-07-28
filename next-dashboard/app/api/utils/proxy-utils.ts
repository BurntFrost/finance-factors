/**
 * API Proxy Utilities
 *
 * Utility functions for the serverless API proxy with Redis integration
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
} from '@/shared/types/proxy';

// Redis integration
import {
  generateCacheKey,
  CACHE_PREFIXES,
  getCacheData,
  setCacheData
} from '@/backend/lib/redis-cache';
import {
  checkRateLimit as redisCheckRateLimit,
  RateLimitResult
} from '@/backend/lib/redis-rate-limit';
import { isRedisAvailable as _isRedisAvailable } from '@/backend/lib/redis';
import { redisFallbackService } from '@/backend/lib/redis-fallback-service';
import { isRedisEnabled } from '@/backend/lib/feature-toggles';
import { userExperienceService } from '@/backend/lib/user-experience-service';

// Fallback in-memory cache for when Redis is unavailable
const fallbackRateLimit = new Map<string, { requests: number; resetTime: number }>();
const fallbackResponseCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

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
 * Create a standardized error response with user experience enhancements
 */
export function createErrorResponse<T = unknown>(
  error: ProxyError,
  source: string = 'API Proxy',
  responseTime?: number
): ProxyApiResponse<T> {
  const response: ProxyApiResponse<T> = {
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

  // Add user-friendly error indicator
  const userFriendlyError = userExperienceService.getUserFriendlyErrorMessage(error.message);

  response.metadata = {
    ...response.metadata,
    userIndicators: [userFriendlyError],
  };

  // Enhance with performance metrics if response time is provided
  if (responseTime !== undefined) {
    response.metadata.performanceMetrics = {
      responseTime,
      cacheHit: false,
      dataFreshness: 'fallback',
    };
  }

  return response;
}

/**
 * Create a standardized success response with user experience enhancements
 */
export function createSuccessResponse<T>(
  data: T,
  source: string,
  metadata?: ProxyApiResponse<T>['metadata'],
  responseTime?: number
): ProxyApiResponse<T> {
  const response: ProxyApiResponse<T> = {
    data,
    success: true,
    timestamp: new Date(),
    source,
    metadata,
  };

  // Enhance with user experience indicators if response time is provided
  if (responseTime !== undefined) {
    const cacheHit = metadata?.isFallback === false && source.includes('Cache');
    const dataSource = metadata?.isFallback ? 'fallback' : (cacheHit ? 'redis' : 'direct');

    return userExperienceService.enhanceApiResponse(
      response,
      responseTime,
      cacheHit,
      dataSource as 'redis' | 'fallback' | 'direct'
    );
  }

  return response;
}

/**
 * Check rate limits for a provider with enhanced Redis fallback
 */
export async function checkRateLimit(provider: string, clientId: string = 'default'): Promise<boolean> {
  return await redisFallbackService.executeWithFallback(
    // Redis operation
    async () => {
      const result: RateLimitResult = await redisCheckRateLimit(provider, clientId);
      return result.allowed;
    },
    // Fallback operation
    async () => {
      return checkInMemoryRateLimit(provider, clientId);
    },
    `rate_limit_check_${provider}`
  );
}

/**
 * In-memory rate limiting fallback
 */
function checkInMemoryRateLimit(provider: string, clientId: string): boolean {

  // Fallback to in-memory rate limiting
  const key = `${provider}-${clientId}`;
  const now = Date.now();
  const limits = RATE_LIMITS[provider];

  if (!limits) return true; // No limits configured

  const current = fallbackRateLimit.get(key);

  if (!current || now > current.resetTime) {
    // Reset or initialize rate limit
    fallbackRateLimit.set(key, {
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
 * Get cached response with enhanced Redis fallback
 * FEATURE TOGGLE: When Redis is disabled, uses only in-memory cache
 */
export async function getCachedResponse<T>(cacheKey: string): Promise<T | null> {
  // FEATURE TOGGLE: Skip Redis entirely when disabled
  if (!isRedisEnabled()) {
    console.debug(`Redis disabled - using only in-memory cache for key: ${cacheKey}`);
    return getInMemoryCachedResponse<T>(cacheKey);
  }

  return await redisFallbackService.executeWithFallback(
    // Redis operation
    async () => {
      const redisKey = generateCacheKey(CACHE_PREFIXES.API_RESPONSE, cacheKey);
      return await getCacheData<T>(redisKey);
    },
    // Fallback operation
    async () => {
      return getInMemoryCachedResponse<T>(cacheKey);
    },
    `get_cache_${cacheKey}`
  );
}

/**
 * Get cached response from in-memory fallback
 */
function getInMemoryCachedResponse<T>(cacheKey: string): T | null {
  const cached = fallbackResponseCache.get(cacheKey);

  if (!cached) return null;

  const now = Date.now();
  if (now > cached.timestamp + cached.ttl) {
    fallbackResponseCache.delete(cacheKey);
    return null;
  }

  return cached.data as T;
}

/**
 * Cache a response with enhanced Redis fallback
 * FEATURE TOGGLE: When Redis is disabled, uses only in-memory cache
 */
export async function setCachedResponse(
  cacheKey: string,
  data: unknown,
  ttl: number = CACHE_CONFIG.ttl,
  source: string = 'API Proxy'
): Promise<void> {
  // FEATURE TOGGLE: Skip Redis entirely when disabled
  if (!isRedisEnabled()) {
    console.debug(`Redis disabled - using only in-memory cache for key: ${cacheKey}`);
    setInMemoryCachedResponse(cacheKey, data, ttl);
    return;
  }

  await redisFallbackService.executeWithFallback(
    // Redis operation
    async () => {
      const redisKey = generateCacheKey(CACHE_PREFIXES.API_RESPONSE, cacheKey);
      const ttlSeconds = Math.floor(ttl / 1000);
      await setCacheData(redisKey, data, ttlSeconds, source);
      return true;
    },
    // Fallback operation
    async () => {
      setInMemoryCachedResponse(cacheKey, data, ttl);
      return true;
    },
    `set_cache_${cacheKey}`
  );
}

/**
 * Set cached response in in-memory fallback
 */
function setInMemoryCachedResponse(cacheKey: string, data: unknown, ttl: number): void {
  // Clean up old entries if cache is too large
  if (fallbackResponseCache.size >= CACHE_CONFIG.maxSize) {
    const oldestKey = fallbackResponseCache.keys().next().value;
    if (oldestKey) {
      fallbackResponseCache.delete(oldestKey);
    }
  }

  fallbackResponseCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Generate a cache key for a request (legacy function for backward compatibility)
 */
export function generateLegacyCacheKey(provider: string, seriesId: string, params: Record<string, string>): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  return `${provider}-${seriesId}-${paramString}`;
}

/**
 * Enhanced cache key generation with Redis integration
 */
export function generateApiCacheKey(provider: string, seriesId: string, params: Record<string, string>): string {
  return generateLegacyCacheKey(provider, seriesId, params);
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
export function validateRequestBody(body: unknown): { isValid: boolean; error?: ProxyError } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
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

  const bodyObj = body as Record<string, unknown>;
  if (!bodyObj.dataType || typeof bodyObj.dataType !== 'string') {
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
export function extractRequestOptionsFromBody(body: Record<string, unknown>): {
  dataType: string;
  timeRange?: { start: Date; end: Date };
  useCache: boolean;
} {
  const timeRange = body.timeRange as { start?: string; end?: string } | undefined;

  return {
    dataType: body.dataType as string,
    timeRange: timeRange && timeRange.start && timeRange.end ? {
      start: new Date(timeRange.start),
      end: new Date(timeRange.end),
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
 * Get optional environment variable
 */
export function getOptionalEnvVar(name: string): string | undefined {
  return process.env[name];
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
