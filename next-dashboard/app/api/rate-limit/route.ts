/**
 * Rate Limiting Management API
 *
 * Provides endpoints for managing Redis-based rate limiting,
 * including status checks, resets, and configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getRateLimitStatus,
  resetRateLimit,
  getAllRateLimitStatuses,
  clearAllRateLimits,
  RATE_LIMIT_CONFIGS
} from '../../lib/redis-rate-limit';
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
 * GET /api/rate-limit
 * 
 * Get rate limiting status for all providers or a specific provider
 * Query parameters:
 * - provider: string - specific provider to check
 * - identifier: string - specific identifier to check (default: 'default')
 */
export async function GET(request: NextRequest) {
  try {
    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis-based rate limiting is not available',
        available: false,
      }, { 
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const identifier = searchParams.get('identifier') || 'default';

    if (provider) {
      // Get status for specific provider
      const status = await getRateLimitStatus(provider, identifier);
      
      if (!status) {
        return NextResponse.json({
          error: 'Provider not found',
          message: `Rate limit status not found for provider: ${provider}`,
        }, { 
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }

      const config = RATE_LIMIT_CONFIGS[provider] || RATE_LIMIT_CONFIGS.DEFAULT;

      return NextResponse.json({
        provider,
        identifier,
        status,
        config: {
          maxRequests: config.maxRequests,
          windowMs: config.windowMs,
          algorithm: config.algorithm,
        },
        timestamp: new Date().toISOString(),
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } else {
      // Get status for all providers
      const allStatuses = await getAllRateLimitStatuses();
      
      return NextResponse.json({
        available: true,
        providers: allStatuses,
        configs: Object.fromEntries(
          Object.entries(RATE_LIMIT_CONFIGS).map(([key, config]) => [
            key,
            {
              maxRequests: config.maxRequests,
              windowMs: config.windowMs,
              algorithm: config.algorithm,
            }
          ])
        ),
        timestamp: new Date().toISOString(),
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

  } catch (error) {
    console.error('Rate limit status request failed:', error);
    
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
 * POST /api/rate-limit
 * 
 * Reset rate limits or perform rate limiting operations
 * Body:
 * - action: 'reset' | 'clear-all'
 * - provider: string (for reset action)
 * - identifier: string (for reset action, optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis-based rate limiting is not available',
      }, { 
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body = await request.json();
    const { action, provider, identifier } = body;

    switch (action) {
      case 'reset':
        if (!provider) {
          return NextResponse.json({
            error: 'Missing provider',
            message: 'Provider is required for reset action',
          }, { 
            status: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }

        const success = await resetRateLimit(provider, identifier || 'default');
        
        return NextResponse.json({
          success,
          message: success 
            ? `Rate limit reset for ${provider}${identifier ? `:${identifier}` : ''}` 
            : 'Failed to reset rate limit',
          provider,
          identifier: identifier || 'default',
          timestamp: new Date().toISOString(),
        }, {
          status: success ? 200 : 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });

      case 'clear-all':
        const clearedCount = await clearAllRateLimits();
        
        return NextResponse.json({
          success: true,
          message: `Cleared ${clearedCount} rate limit entries`,
          clearedCount,
          timestamp: new Date().toISOString(),
        }, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        });

      default:
        return NextResponse.json({
          error: 'Invalid action',
          message: 'Supported actions: reset, clear-all',
        }, { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
    }

  } catch (error) {
    console.error('Rate limit operation failed:', error);
    
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
 * DELETE /api/rate-limit
 * 
 * Clear rate limits for specific provider or all providers
 * Query parameters:
 * - provider: string - specific provider to clear
 * - identifier: string - specific identifier to clear (default: 'default')
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check Redis availability
    if (!(await isRedisAvailable())) {
      return NextResponse.json({
        error: 'Redis unavailable',
        message: 'Redis-based rate limiting is not available',
      }, { 
        status: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const identifier = searchParams.get('identifier') || 'default';

    if (provider) {
      // Clear rate limit for specific provider
      const success = await resetRateLimit(provider, identifier);
      
      return NextResponse.json({
        success,
        message: success 
          ? `Rate limit cleared for ${provider}:${identifier}` 
          : 'Failed to clear rate limit',
        provider,
        identifier,
        timestamp: new Date().toISOString(),
      }, {
        status: success ? 200 : 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } else {
      // Clear all rate limits
      const clearedCount = await clearAllRateLimits();
      
      return NextResponse.json({
        success: true,
        message: `Cleared ${clearedCount} rate limit entries`,
        clearedCount,
        timestamp: new Date().toISOString(),
      }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

  } catch (error) {
    console.error('Rate limit clearing failed:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
