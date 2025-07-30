/**
 * Frontend Circuit Breaker Service
 * 
 * Provides frontend access to circuit breaker status and rate limit information
 * through API calls to the backend circuit breaker service.
 */

import { CircuitBreakerStatusResponse, AllCircuitBreakersResponse } from '@/app/api/circuit-breaker/status/route';

export interface CircuitBreakerCheckResult {
  isAllowed: boolean;
  state: 'closed' | 'open' | 'half-open' | 'rate-limited';
  reason?: string;
  nextRetryTime?: Date;
  cooldownExpiresAt?: Date;
}

/**
 * Frontend Circuit Breaker Service Class
 */
export class CircuitBreakerService {
  private cache: Map<string, { data: CircuitBreakerStatusResponse; timestamp: number }> = new Map();
  private cacheTimeout = 5000; // 5 seconds cache to avoid excessive API calls

  /**
   * Check if a request should be allowed for a specific provider/dataType
   */
  async shouldAllowRequest(provider: string, dataType: string): Promise<CircuitBreakerCheckResult> {
    try {
      const status = await this.getCircuitBreakerStatus(provider, dataType);
      
      const result: CircuitBreakerCheckResult = {
        isAllowed: status.isAllowed,
        state: status.state,
      };

      if (!status.isAllowed) {
        if (status.state === 'rate-limited') {
          result.reason = 'Rate limit exceeded';
          if (status.rateLimitStatus?.cooldownExpiresAt) {
            result.cooldownExpiresAt = new Date(status.rateLimitStatus.cooldownExpiresAt);
            const timeUntilReset = Math.ceil((result.cooldownExpiresAt.getTime() - Date.now()) / 1000);
            result.reason += ` - cooldown expires in ${timeUntilReset}s`;
          }
        } else if (status.state === 'open') {
          result.reason = `Circuit breaker open (${status.failureCount} failures)`;
          if (status.nextRetryTime) {
            result.nextRetryTime = new Date(status.nextRetryTime);
            const timeUntilRetry = Math.ceil((result.nextRetryTime.getTime() - Date.now()) / 1000);
            result.reason += ` - next retry in ${timeUntilRetry}s`;
          }
        } else {
          result.reason = `Circuit breaker in ${status.state} state`;
        }
      }

      return result;
    } catch (error) {
      console.warn(`Failed to check circuit breaker for ${provider}:${dataType}:`, error);
      
      // Default to allowing requests if we can't check the circuit breaker
      return {
        isAllowed: true,
        state: 'closed',
        reason: 'Circuit breaker check failed - allowing request',
      };
    }
  }

  /**
   * Get circuit breaker status for a specific provider/dataType
   */
  async getCircuitBreakerStatus(provider: string, dataType: string): Promise<CircuitBreakerStatusResponse> {
    const cacheKey = `${provider}:${dataType}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if it's still fresh
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/circuit-breaker/status?provider=${encodeURIComponent(provider)}&dataType=${encodeURIComponent(dataType)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const status: CircuitBreakerStatusResponse = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: status,
        timestamp: Date.now(),
      });

      return status;
    } catch (error) {
      console.error(`Failed to get circuit breaker status for ${provider}:${dataType}:`, error);
      
      // Return a default status if the API call fails
      return {
        provider,
        dataType,
        state: 'closed',
        isAllowed: true,
        failureCount: 0,
      };
    }
  }

  /**
   * Get all circuit breaker statuses
   */
  async getAllCircuitBreakerStatuses(): Promise<AllCircuitBreakersResponse> {
    try {
      const response = await fetch('/api/circuit-breaker/status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get all circuit breaker statuses:', error);
      
      // Return empty response if the API call fails
      return {
        circuitBreakers: {},
        summary: {
          totalProviders: 0,
          healthyProviders: 0,
          rateLimitedProviders: 0,
          openCircuits: 0,
        },
      };
    }
  }

  /**
   * Get circuit breaker statuses for a specific provider
   */
  async getProviderCircuitBreakerStatuses(provider: string): Promise<Record<string, CircuitBreakerStatusResponse>> {
    try {
      const response = await fetch(`/api/circuit-breaker/status?provider=${encodeURIComponent(provider)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.dataTypes || {};
    } catch (error) {
      console.error(`Failed to get circuit breaker statuses for provider ${provider}:`, error);
      return {};
    }
  }

  /**
   * Clear circuit breaker state for a specific provider/dataType
   */
  async clearCircuitBreakerState(provider: string, dataType: string): Promise<boolean> {
    try {
      const response = await fetch('/api/circuit-breaker/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          dataType,
          action: 'clear',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear from cache
      const cacheKey = `${provider}:${dataType}`;
      this.cache.delete(cacheKey);

      console.info(`✅ Cleared circuit breaker state for ${provider}:${dataType}`);
      return true;
    } catch (error) {
      console.error(`Failed to clear circuit breaker state for ${provider}:${dataType}:`, error);
      return false;
    }
  }

  /**
   * Get recent rate limit events
   */
  async getRateLimitEvents(
    provider?: string,
    dataType?: string,
    limit: number = 100
  ): Promise<Array<{
    provider: string;
    dataType: string;
    timestamp: string;
    error?: string;
    metadata?: Record<string, any>;
  }>> {
    try {
      const params = new URLSearchParams();
      if (provider) params.append('provider', provider);
      if (dataType) params.append('dataType', dataType);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/circuit-breaker/status/events?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.events || [];
    } catch (error) {
      console.error('Failed to get rate limit events:', error);
      return [];
    }
  }

  /**
   * Check if any provider is currently rate limited
   */
  async hasRateLimitedProviders(): Promise<boolean> {
    try {
      const allStatuses = await this.getAllCircuitBreakerStatuses();
      return allStatuses.summary.rateLimitedProviders > 0;
    } catch (error) {
      console.warn('Failed to check for rate limited providers:', error);
      return false;
    }
  }

  /**
   * Get summary of circuit breaker health
   */
  async getHealthSummary(): Promise<{
    totalProviders: number;
    healthyProviders: number;
    rateLimitedProviders: number;
    openCircuits: number;
    healthPercentage: number;
  }> {
    try {
      const allStatuses = await this.getAllCircuitBreakerStatuses();
      const { summary } = allStatuses;
      
      const healthPercentage = summary.totalProviders > 0 
        ? Math.round((summary.healthyProviders / summary.totalProviders) * 100)
        : 100;

      return {
        ...summary,
        healthPercentage,
      };
    } catch (error) {
      console.warn('Failed to get health summary:', error);
      return {
        totalProviders: 0,
        healthyProviders: 0,
        rateLimitedProviders: 0,
        openCircuits: 0,
        healthPercentage: 100,
      };
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.debug('Circuit breaker service cache cleared');
  }
}

// Export singleton instance
export const circuitBreakerService = new CircuitBreakerService();
