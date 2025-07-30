/**
 * Rate Limit Testing API Route
 * 
 * Provides endpoints to manually test rate limit functionality
 * including triggering rate limits, checking status, and clearing state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedCircuitBreaker } from '@/backend/lib/enhanced-circuit-breaker';
import { rateLimitTracker, RateLimitEvent } from '@/backend/lib/rate-limit-tracker';
import { rateLimitMonitor } from '@/backend/lib/rate-limit-monitor';

/**
 * GET /api/test/rate-limit
 * 
 * Query parameters:
 * - action: 'status' | 'trigger' | 'clear' | 'stats'
 * - provider: provider name (default: 'FRED')
 * - dataType: data type (default: 'treasury-2y')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const provider = searchParams.get('provider') || 'FRED';
    const dataType = searchParams.get('dataType') || 'treasury-2y';

    switch (action) {
      case 'status':
        return await handleStatusCheck(provider, dataType);
      
      case 'trigger':
        return await handleTriggerRateLimit(provider, dataType);
      
      case 'clear':
        return await handleClearState(provider, dataType);
      
      case 'stats':
        return await handleGetStats();
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: status, trigger, clear, stats' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Rate limit test API error:', error);
    return NextResponse.json(
      { 
        error: 'Rate limit test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Check current rate limit and circuit breaker status
 */
async function handleStatusCheck(provider: string, dataType: string) {
  const [circuitBreakerState, rateLimitStatus, shouldAllow] = await Promise.all([
    enhancedCircuitBreaker.getCircuitBreakerState(provider, dataType),
    rateLimitTracker.isRateLimited(provider, dataType),
    enhancedCircuitBreaker.shouldAllowRequest(provider, dataType),
  ]);

  const recentEvents = await rateLimitTracker.getRecentRateLimitEvents(provider, dataType, 5);

  return NextResponse.json({
    provider,
    dataType,
    timestamp: new Date().toISOString(),
    circuitBreaker: {
      state: circuitBreakerState.state,
      failureCount: circuitBreakerState.failureCount,
      lastFailureTime: circuitBreakerState.lastFailureTime?.toISOString(),
      nextRetryTime: circuitBreakerState.nextRetryTime?.toISOString(),
      shouldAllow,
    },
    rateLimit: {
      isRateLimited: rateLimitStatus.isRateLimited,
      lastRateLimitTime: rateLimitStatus.lastRateLimitTime?.toISOString(),
      cooldownExpiresAt: rateLimitStatus.cooldownExpiresAt?.toISOString(),
      consecutiveRateLimits: rateLimitStatus.consecutiveRateLimits,
      totalRateLimits: rateLimitStatus.totalRateLimits,
    },
    recentEvents: recentEvents.map(event => ({
      timestamp: event.timestamp.toISOString(),
      error: event.error,
      metadata: event.metadata,
    })),
  });
}

/**
 * Trigger a rate limit event for testing
 */
async function handleTriggerRateLimit(provider: string, dataType: string) {
  const rateLimitEvent: RateLimitEvent = {
    provider,
    dataType,
    timestamp: new Date(),
    error: `${provider} API rate limit exceeded (test trigger)`,
    metadata: {
      statusCode: 429,
      requestsRemaining: 0,
      resetTime: new Date(Date.now() + 60000), // 1 minute from now
      testTrigger: true,
    },
  };

  // Record the rate limit event
  await rateLimitTracker.recordRateLimitEvent(rateLimitEvent);

  // Record failure in circuit breaker
  await enhancedCircuitBreaker.recordFailure(
    provider,
    dataType,
    rateLimitEvent.error!,
    true // isRateLimit = true
  );

  // Log to monitor
  await rateLimitMonitor.logRateLimitEvent(
    provider,
    dataType,
    rateLimitEvent.error!,
    rateLimitEvent.metadata
  );

  // Get updated status
  const [circuitBreakerState, rateLimitStatus] = await Promise.all([
    enhancedCircuitBreaker.getCircuitBreakerState(provider, dataType),
    rateLimitTracker.isRateLimited(provider, dataType),
  ]);

  return NextResponse.json({
    success: true,
    message: `Rate limit triggered for ${provider}:${dataType}`,
    provider,
    dataType,
    timestamp: new Date().toISOString(),
    triggeredEvent: {
      ...rateLimitEvent,
      timestamp: rateLimitEvent.timestamp.toISOString(),
    },
    updatedStatus: {
      circuitBreakerState: circuitBreakerState.state,
      isRateLimited: rateLimitStatus.isRateLimited,
      cooldownExpiresAt: rateLimitStatus.cooldownExpiresAt?.toISOString(),
      consecutiveRateLimits: rateLimitStatus.consecutiveRateLimits,
    },
  });
}

/**
 * Clear rate limit and circuit breaker state
 */
async function handleClearState(provider: string, dataType: string) {
  await Promise.all([
    rateLimitTracker.clearRateLimitStatus(provider, dataType),
    enhancedCircuitBreaker.clearState(provider, dataType),
  ]);

  // Log recovery event
  await rateLimitMonitor.logRecoveryEvent(
    provider,
    dataType,
    'rate_limit',
    { manualClear: true }
  );

  return NextResponse.json({
    success: true,
    message: `Rate limit and circuit breaker state cleared for ${provider}:${dataType}`,
    provider,
    dataType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get monitoring statistics
 */
async function handleGetStats() {
  const [stats, report] = await Promise.all([
    rateLimitMonitor.getMonitoringStats(),
    rateLimitMonitor.generateReport(),
  ]);

  // Get all circuit breaker states
  const allStates = await enhancedCircuitBreaker.getAllStates();
  const circuitBreakerSummary: Record<string, any> = {};
  
  for (const [key, state] of allStates.entries()) {
    circuitBreakerSummary[key] = {
      state: state.state,
      failureCount: state.failureCount,
      lastFailureTime: state.lastFailureTime?.toISOString(),
      nextRetryTime: state.nextRetryTime?.toISOString(),
      isRateLimited: state.rateLimitStatus?.isRateLimited || false,
      cooldownExpiresAt: state.rateLimitStatus?.cooldownExpiresAt?.toISOString(),
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    monitoringStats: stats,
    circuitBreakerStates: circuitBreakerSummary,
    report,
  });
}

/**
 * POST /api/test/rate-limit
 * 
 * Body: {
 *   action: 'bulk-trigger' | 'simulate-recovery',
 *   provider?: string,
 *   dataType?: string,
 *   count?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider = 'FRED', dataType = 'treasury-2y', count = 3 } = body;

    switch (action) {
      case 'bulk-trigger':
        return await handleBulkTrigger(provider, dataType, count);
      
      case 'simulate-recovery':
        return await handleSimulateRecovery(provider, dataType);
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: bulk-trigger, simulate-recovery' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Rate limit test POST API error:', error);
    return NextResponse.json(
      { 
        error: 'Rate limit test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger multiple rate limit events to test consecutive rate limit handling
 */
async function handleBulkTrigger(provider: string, dataType: string, count: number) {
  const events: RateLimitEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const event: RateLimitEvent = {
      provider,
      dataType,
      timestamp: new Date(Date.now() + i * 1000), // Spread events over time
      error: `${provider} API rate limit exceeded (bulk trigger ${i + 1}/${count})`,
      metadata: {
        statusCode: 429,
        bulkTrigger: true,
        sequenceNumber: i + 1,
        totalCount: count,
      },
    };

    events.push(event);
    
    // Record each event
    await rateLimitTracker.recordRateLimitEvent(event);
    await enhancedCircuitBreaker.recordFailure(provider, dataType, event.error!, true);
    await rateLimitMonitor.logRateLimitEvent(provider, dataType, event.error!, event.metadata);
    
    // Small delay between events
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Get final status
  const [circuitBreakerState, rateLimitStatus] = await Promise.all([
    enhancedCircuitBreaker.getCircuitBreakerState(provider, dataType),
    rateLimitTracker.isRateLimited(provider, dataType),
  ]);

  return NextResponse.json({
    success: true,
    message: `Triggered ${count} rate limit events for ${provider}:${dataType}`,
    provider,
    dataType,
    count,
    timestamp: new Date().toISOString(),
    events: events.map(e => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    })),
    finalStatus: {
      circuitBreakerState: circuitBreakerState.state,
      isRateLimited: rateLimitStatus.isRateLimited,
      consecutiveRateLimits: rateLimitStatus.consecutiveRateLimits,
      totalRateLimits: rateLimitStatus.totalRateLimits,
      cooldownExpiresAt: rateLimitStatus.cooldownExpiresAt?.toISOString(),
    },
  });
}

/**
 * Simulate recovery by recording successful requests
 */
async function handleSimulateRecovery(provider: string, dataType: string) {
  // Record a successful request
  await enhancedCircuitBreaker.recordSuccess(provider, dataType);
  
  // Log recovery
  await rateLimitMonitor.logRecoveryEvent(
    provider,
    dataType,
    'circuit_breaker',
    { simulatedRecovery: true }
  );

  // Get updated status
  const [circuitBreakerState, rateLimitStatus] = await Promise.all([
    enhancedCircuitBreaker.getCircuitBreakerState(provider, dataType),
    rateLimitTracker.isRateLimited(provider, dataType),
  ]);

  return NextResponse.json({
    success: true,
    message: `Simulated recovery for ${provider}:${dataType}`,
    provider,
    dataType,
    timestamp: new Date().toISOString(),
    updatedStatus: {
      circuitBreakerState: circuitBreakerState.state,
      failureCount: circuitBreakerState.failureCount,
      isRateLimited: rateLimitStatus.isRateLimited,
      shouldAllow: await enhancedCircuitBreaker.shouldAllowRequest(provider, dataType),
    },
  });
}
