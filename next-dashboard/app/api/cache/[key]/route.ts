/**
 * Individual Cache Key Management API
 *
 * Provides endpoints for managing individual cache keys,
 * including get, set, and delete operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCacheData,
  setCacheData,
  deleteCacheKey,
  cacheExists,
  DEFAULT_TTL
} from '@/backend/lib/redis-cache';
import { isRedisAvailable } from '@/backend/lib/redis';
import { isRedisEnabled } from '@/backend/lib/feature-toggles';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/cache/[key]
 *
 * Get data for a specific cache key
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // FEATURE TOGGLE: Check if Redis is enabled
    if (!isRedisEnabled()) {
      return NextResponse.json({
        error: 'Redis disabled',
        message: 'Redis cache is disabled via feature toggle',
        featureToggle: 'ENABLE_REDIS=false',
      }, {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis cache is not available',
      }, {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { key } = await params;
    
    if (!key) {
      return NextResponse.json({
        error: 'Missing key',
        message: 'Cache key is required',
      }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Decode the key (in case it was URL encoded)
    const decodedKey = decodeURIComponent(key);
    
    // Check if key exists
    const exists = await cacheExists(decodedKey);
    
    if (!exists) {
      return NextResponse.json({
        exists: false,
        key: decodedKey,
        message: 'Cache key not found',
      }, { 
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Get the cached data
    const data = await getCacheData(decodedKey);
    
    return NextResponse.json({
      exists: true,
      key: decodedKey,
      data,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Cache key retrieval failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

/**
 * PUT /api/cache/[key]
 *
 * Set or update data for a specific cache key
 * Body:
 * - data: any - the data to cache
 * - ttl: number - time to live in seconds (optional)
 * - source: string - source identifier (optional)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis cache is not available',
      }, {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { key } = await params;
    
    if (!key) {
      return NextResponse.json({
        error: 'Missing key',
        message: 'Cache key is required',
      }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body = await request.json();
    const { data, ttl, source } = body;

    if (data === undefined) {
      return NextResponse.json({
        error: 'Missing data',
        message: 'Data is required to set cache',
      }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Decode the key (in case it was URL encoded)
    const decodedKey = decodeURIComponent(key);
    
    // Set the cache data
    const success = await setCacheData(
      decodedKey,
      data,
      ttl || DEFAULT_TTL.API_RESPONSE,
      source || 'API'
    );

    if (!success) {
      return NextResponse.json({
        error: 'Cache operation failed',
        message: 'Failed to set cache data',
      }, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return NextResponse.json({
      success: true,
      key: decodedKey,
      message: 'Cache data set successfully',
      ttl: ttl || DEFAULT_TTL.API_RESPONSE,
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('Cache key update failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

/**
 * DELETE /api/cache/[key]
 *
 * Delete a specific cache key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis cache is not available',
      }, {
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { key } = await params;
    
    if (!key) {
      return NextResponse.json({
        error: 'Missing key',
        message: 'Cache key is required',
      }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Decode the key (in case it was URL encoded)
    const decodedKey = decodeURIComponent(key);
    
    // Check if key exists before deletion
    const exists = await cacheExists(decodedKey);
    
    if (!exists) {
      return NextResponse.json({
        success: false,
        key: decodedKey,
        message: 'Cache key not found',
      }, { 
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Delete the cache key
    const success = await deleteCacheKey(decodedKey);

    return NextResponse.json({
      success,
      key: decodedKey,
      message: success ? 'Cache key deleted successfully' : 'Failed to delete cache key',
      timestamp: new Date().toISOString(),
    }, {
      status: success ? 200 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('Cache key deletion failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
