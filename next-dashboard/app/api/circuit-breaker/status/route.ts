/**
 * Circuit Breaker Status API Route
 * 
 * Provides endpoints to check circuit breaker status and rate limit information
 * for frontend components to make informed decisions about API calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enhancedCircuitBreaker } from '@/backend/lib/enhanced-circuit-breaker';

export interface CircuitBreakerStatusResponse {
  provider: string;
  dataType: string;
  state: 'closed' | 'open' | 'half-open' | 'rate-limited';
  isAllowed: boolean;
  failureCount: number;
  lastFailureTime?: string;
  nextRetryTime?: string;
  rateLimitStatus?: {
    isRateLimited: boolean;
    lastRateLimitTime?: string;
    cooldownExpiresAt?: string;
    consecutiveRateLimits: number;
    totalRateLimits: number;
  };
  metadata?: {
    lastError?: string;
    consecutiveRateLimits?: number;
    totalRequests?: number;
    successRate?: number;
  };
}

export interface AllCircuitBreakersResponse {
  circuitBreakers: Record<string, CircuitBreakerStatusResponse>;
  summary: {
    totalProviders: number;
    healthyProviders: number;
    rateLimitedProviders: number;
    openCircuits: number;
  };
}

/**
 * GET /api/circuit-breaker/status
 * 
 * Query parameters:
 * - provider: specific provider to check (optional)
 * - dataType: specific data type to check (optional, requires provider)
 * 
 * Returns circuit breaker status for specified provider/dataType or all circuit breakers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const dataType = searchParams.get('dataType');

    if (provider && dataType) {
      // Get status for specific provider/dataType combination
      const circuitState = await enhancedCircuitBreaker.getCircuitBreakerState(provider, dataType);
      const isAllowed = await enhancedCircuitBreaker.shouldAllowRequest(provider, dataType);

      const response: CircuitBreakerStatusResponse = {
        provider,
        dataType,
        state: circuitState.state,
        isAllowed,
        failureCount: circuitState.failureCount,
        lastFailureTime: circuitState.lastFailureTime?.toISOString(),
        nextRetryTime: circuitState.nextRetryTime?.toISOString(),
        rateLimitStatus: circuitState.rateLimitStatus ? {
          isRateLimited: circuitState.rateLimitStatus.isRateLimited,
          lastRateLimitTime: circuitState.rateLimitStatus.lastRateLimitTime?.toISOString(),
          cooldownExpiresAt: circuitState.rateLimitStatus.cooldownExpiresAt?.toISOString(),
          consecutiveRateLimits: circuitState.rateLimitStatus.consecutiveRateLimits,
          totalRateLimits: circuitState.rateLimitStatus.totalRateLimits,
        } : undefined,
        metadata: circuitState.metadata,
      };

      return NextResponse.json(response);
    } else if (provider) {
      // Get status for all data types for a specific provider
      const allStates = await enhancedCircuitBreaker.getAllStates();
      const providerStates: Record<string, CircuitBreakerStatusResponse> = {};

      for (const [key, state] of allStates.entries()) {
        const [stateProvider, stateDataType] = key.split(':');
        if (stateProvider === provider) {
          const isAllowed = await enhancedCircuitBreaker.shouldAllowRequest(stateProvider, stateDataType);
          
          providerStates[stateDataType] = {
            provider: stateProvider,
            dataType: stateDataType,
            state: state.state,
            isAllowed,
            failureCount: state.failureCount,
            lastFailureTime: state.lastFailureTime?.toISOString(),
            nextRetryTime: state.nextRetryTime?.toISOString(),
            rateLimitStatus: state.rateLimitStatus ? {
              isRateLimited: state.rateLimitStatus.isRateLimited,
              lastRateLimitTime: state.rateLimitStatus.lastRateLimitTime?.toISOString(),
              cooldownExpiresAt: state.rateLimitStatus.cooldownExpiresAt?.toISOString(),
              consecutiveRateLimits: state.rateLimitStatus.consecutiveRateLimits,
              totalRateLimits: state.rateLimitStatus.totalRateLimits,
            } : undefined,
            metadata: state.metadata,
          };
        }
      }

      return NextResponse.json({ provider, dataTypes: providerStates });
    } else {
      // Get status for all circuit breakers
      const allStates = await enhancedCircuitBreaker.getAllStates();
      const circuitBreakers: Record<string, CircuitBreakerStatusResponse> = {};
      
      let healthyProviders = 0;
      let rateLimitedProviders = 0;
      let openCircuits = 0;
      const providerSet = new Set<string>();

      for (const [key, state] of allStates.entries()) {
        const [stateProvider, stateDataType] = key.split(':');
        providerSet.add(stateProvider);
        
        const isAllowed = await enhancedCircuitBreaker.shouldAllowRequest(stateProvider, stateDataType);
        
        circuitBreakers[key] = {
          provider: stateProvider,
          dataType: stateDataType,
          state: state.state,
          isAllowed,
          failureCount: state.failureCount,
          lastFailureTime: state.lastFailureTime?.toISOString(),
          nextRetryTime: state.nextRetryTime?.toISOString(),
          rateLimitStatus: state.rateLimitStatus ? {
            isRateLimited: state.rateLimitStatus.isRateLimited,
            lastRateLimitTime: state.rateLimitStatus.lastRateLimitTime?.toISOString(),
            cooldownExpiresAt: state.rateLimitStatus.cooldownExpiresAt?.toISOString(),
            consecutiveRateLimits: state.rateLimitStatus.consecutiveRateLimits,
            totalRateLimits: state.rateLimitStatus.totalRateLimits,
          } : undefined,
          metadata: state.metadata,
        };

        // Count states for summary
        if (state.state === 'closed') {
          healthyProviders++;
        } else if (state.state === 'rate-limited') {
          rateLimitedProviders++;
        } else if (state.state === 'open') {
          openCircuits++;
        }
      }

      const response: AllCircuitBreakersResponse = {
        circuitBreakers,
        summary: {
          totalProviders: providerSet.size,
          healthyProviders,
          rateLimitedProviders,
          openCircuits,
        },
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Circuit breaker status API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get circuit breaker status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circuit-breaker/status
 * 
 * Body: { provider: string, dataType: string, action: 'reset' | 'clear' }
 * 
 * Allows manual reset or clearing of circuit breaker state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, dataType, action } = body;

    if (!provider || !dataType || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, dataType, action' },
        { status: 400 }
      );
    }

    if (action === 'clear' || action === 'reset') {
      await enhancedCircuitBreaker.clearState(provider, dataType);
      
      return NextResponse.json({
        success: true,
        message: `Circuit breaker state cleared for ${provider}:${dataType}`,
        provider,
        dataType,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: reset, clear' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Circuit breaker action API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform circuit breaker action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

