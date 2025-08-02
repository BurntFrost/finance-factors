import { NextRequest, NextResponse } from 'next/server';
import { rateLimitTracker } from '@/backend/lib/rate-limit-tracker';

/**
 * GET /api/circuit-breaker/status/events
 *
 * Query parameters:
 * - provider: filter by provider (optional)
 * - dataType: filter by data type (optional)
 * - limit: number of events to return (default: 100)
 *
 * Returns recent rate limit events for analysis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || undefined;
    const dataType = searchParams.get('dataType') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const events = await rateLimitTracker.getRecentRateLimitEvents(provider, dataType, limit);

    return NextResponse.json({
      events: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString(),
      })),
      total: events.length,
      provider,
      dataType,
    });
  } catch (error) {
    console.error('Rate limit events API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get rate limit events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
