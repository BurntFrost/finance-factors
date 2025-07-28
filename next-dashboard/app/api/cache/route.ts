/**
 * Redis Cache Management API
 *
 * Provides endpoints for managing Redis cache data, statistics,
 * and administrative operations for the finance-factors dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCacheStats,
  getCacheKeys,
  deleteCacheKey,
  deleteCacheKeys,
  clearCacheByPrefix,
  setCacheData,
  CACHE_PREFIXES,
  DEFAULT_TTL
} from '../../lib/redis-cache';
import { isRedisAvailable } from '../../lib/redis';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET /api/cache
 * 
 * Get cache statistics and information
 * Query parameters:
 * - keys: boolean - include list of all cache keys
 * - prefix: string - filter keys by prefix
 * - pattern: string - filter keys by pattern
 */
export async function GET(request: NextRequest) {
  try {
    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis cache is not available',
        available: false,
      }, { 
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { searchParams } = new URL(request.url);
    const includeKeys = searchParams.get('keys') === 'true';
    const prefix = searchParams.get('prefix');
    const pattern = searchParams.get('pattern');

    // Get cache statistics
    const stats = await getCacheStats();
    
    if (!stats) {
      return NextResponse.json({
        error: 'Failed to get cache statistics',
        available: false,
      }, { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const response: {
      available: boolean;
      timestamp: string;
      statistics: import('../../lib/redis-cache').CacheStats;
      prefixes: string[];
      defaultTtl: typeof DEFAULT_TTL;
      keys?: string[];
      keyCount?: number;
    } = {
      available: true,
      timestamp: new Date().toISOString(),
      statistics: stats,
      prefixes: Object.values(CACHE_PREFIXES),
      defaultTtl: DEFAULT_TTL,
    };

    // Include keys if requested
    if (includeKeys) {
      let keyPattern = '*';
      
      if (prefix) {
        keyPattern = `${prefix}*`;
      } else if (pattern) {
        keyPattern = pattern;
      }
      
      const keys = await getCacheKeys(keyPattern);
      response.keys = keys;
      response.keyCount = keys.length;
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Cache statistics request failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      available: false,
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

/**
 * POST /api/cache
 * 
 * Set cache data or perform cache operations
 * Body:
 * - action: 'set' | 'warm' | 'clear'
 * - key: string (for set action)
 * - data: any (for set action)
 * - ttl: number (for set action, optional)
 * - prefix: string (for clear action)
 * - pattern: string (for clear action)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, key, data, ttl, prefix, pattern, source } = body;

    switch (action) {
      case 'set':
        if (!key || data === undefined) {
          return NextResponse.json({
            error: 'Invalid request',
            message: 'Key and data are required for set action',
          }, { 
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }

        const success = await setCacheData(
          key, 
          data, 
          ttl || DEFAULT_TTL.API_RESPONSE,
          source || 'Manual'
        );

        return NextResponse.json({
          success,
          message: success ? 'Cache data set successfully' : 'Failed to set cache data',
          key,
          ttl: ttl || DEFAULT_TTL.API_RESPONSE,
          timestamp: new Date().toISOString(),
        }, {
          status: success ? 200 : 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });

      case 'clear':
        let clearedCount = 0;
        
        if (prefix) {
          clearedCount = await clearCacheByPrefix(prefix);
        } else if (pattern) {
          const keys = await getCacheKeys(pattern);
          clearedCount = await deleteCacheKeys(keys);
        } else {
          // Clear all cache
          const keys = await getCacheKeys('*');
          clearedCount = await deleteCacheKeys(keys);
        }

        return NextResponse.json({
          success: true,
          message: `Cleared ${clearedCount} cache entries`,
          clearedCount,
          prefix: prefix || null,
          pattern: pattern || null,
          timestamp: new Date().toISOString(),
        }, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        });

      case 'warm':
        // Cache warming would be implemented based on specific needs
        return NextResponse.json({
          success: true,
          message: 'Cache warming initiated',
          timestamp: new Date().toISOString(),
        }, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          message: 'Supported actions: set, clear, warm',
        }, { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
    }

  } catch (error) {
    console.error('Cache operation failed:', error);
    
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
 * DELETE /api/cache
 * 
 * Delete specific cache keys
 * Query parameters:
 * - key: string - specific key to delete
 * - keys: string[] - multiple keys to delete (JSON array)
 * - prefix: string - delete all keys with prefix
 * - pattern: string - delete keys matching pattern
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const keysParam = searchParams.get('keys');
    const prefix = searchParams.get('prefix');
    const pattern = searchParams.get('pattern');

    let deletedCount = 0;

    if (key) {
      // Delete single key
      const success = await deleteCacheKey(key);
      deletedCount = success ? 1 : 0;
    } else if (keysParam) {
      // Delete multiple specific keys
      try {
        const keys = JSON.parse(keysParam);
        if (Array.isArray(keys)) {
          deletedCount = await deleteCacheKeys(keys);
        } else {
          return NextResponse.json({
            error: 'Invalid keys parameter',
            message: 'Keys parameter must be a JSON array',
          }, { 
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (_parseError) {
        return NextResponse.json({
          error: 'Invalid JSON',
          message: 'Keys parameter must be valid JSON array',
        }, { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }
    } else if (prefix) {
      // Delete by prefix
      deletedCount = await clearCacheByPrefix(prefix);
    } else if (pattern) {
      // Delete by pattern
      const keys = await getCacheKeys(pattern);
      deletedCount = await deleteCacheKeys(keys);
    } else {
      return NextResponse.json({
        error: 'Missing parameter',
        message: 'Specify key, keys, prefix, or pattern parameter',
      }, { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} cache entries`,
      deletedCount,
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('Cache deletion failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
