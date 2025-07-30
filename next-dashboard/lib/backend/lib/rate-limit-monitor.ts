/**
 * Rate Limit Monitor Service
 * 
 * Provides comprehensive monitoring and logging for rate limit events,
 * circuit breaker activations, and fallback behavior across the application.
 */

import { enhancedCircuitBreaker } from './enhanced-circuit-breaker';
import { rateLimitTracker, RateLimitEvent } from './rate-limit-tracker';
import { executeRedisCommand } from './redis';
import { generateCacheKey, CACHE_PREFIXES } from './redis-cache';
import { isRedisEnabled } from './feature-toggles';

// Monitoring event types
export interface MonitoringEvent {
  id: string;
  timestamp: Date;
  type: 'rate_limit' | 'circuit_breaker' | 'fallback' | 'recovery' | 'api_call';
  provider: string;
  dataType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: {
    duration?: number;
    statusCode?: number;
    errorMessage?: string;
    circuitBreakerState?: string;
    rateLimitInfo?: {
      consecutiveRateLimits: number;
      totalRateLimits: number;
      cooldownExpiresAt?: Date;
    };
    fallbackInfo?: {
      reason: string;
      fallbackType: 'historical' | 'cached';
      dataSource: string;
    };
    [key: string]: any;
  };
}

// Monitoring statistics
export interface MonitoringStats {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  providerStats: Record<string, {
    totalEvents: number;
    rateLimitEvents: number;
    circuitBreakerEvents: number;
    fallbackEvents: number;
    successRate: number;
    averageResponseTime: number;
  }>;
  rateLimitSummary: {
    totalRateLimits: number;
    activeRateLimits: number;
    providersAffected: string[];
    longestCooldown: number; // in seconds
  };
  circuitBreakerSummary: {
    openCircuits: number;
    rateLimitedCircuits: number;
    totalFailures: number;
    averageRecoveryTime: number; // in seconds
  };
}

// Alert configuration
export interface AlertConfig {
  rateLimitThreshold: number; // Number of rate limits before alerting
  circuitBreakerThreshold: number; // Number of open circuits before alerting
  fallbackRateThreshold: number; // Percentage of fallback usage before alerting
  timeWindowMs: number; // Time window for threshold calculations
}

// Default alert configuration
const DEFAULT_ALERT_CONFIG: AlertConfig = {
  rateLimitThreshold: 3,
  circuitBreakerThreshold: 2,
  fallbackRateThreshold: 50, // 50% fallback rate
  timeWindowMs: 60 * 60 * 1000, // 1 hour
};

/**
 * Rate Limit Monitor Service Class
 */
export class RateLimitMonitor {
  private config: AlertConfig;
  private inMemoryEvents: MonitoringEvent[] = [];
  private maxInMemoryEvents = 1000;

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = { ...DEFAULT_ALERT_CONFIG, ...config };
  }

  /**
   * Generate Redis key for monitoring events
   */
  private generateEventKey(timeWindow: string): string {
    return generateCacheKey(CACHE_PREFIXES.RATE_LIMIT, `monitor:events:${timeWindow}`);
  }

  /**
   * Log a monitoring event
   */
  async logEvent(event: Omit<MonitoringEvent, 'id' | 'timestamp'>): Promise<void> {
    const monitoringEvent: MonitoringEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Store in memory
    this.inMemoryEvents.push(monitoringEvent);
    if (this.inMemoryEvents.length > this.maxInMemoryEvents) {
      this.inMemoryEvents.shift(); // Remove oldest event
    }

    // Store in Redis if available
    if (isRedisEnabled()) {
      await this.storeEventInRedis(monitoringEvent);
    }

    // Log to console with appropriate level
    this.logToConsole(monitoringEvent);

    // Check for alert conditions
    await this.checkAlertConditions(monitoringEvent);
  }

  /**
   * Log rate limit event
   */
  async logRateLimitEvent(
    provider: string,
    dataType: string,
    error: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      type: 'rate_limit',
      provider,
      dataType,
      severity: 'warning',
      message: `Rate limit exceeded for ${provider}:${dataType}`,
      metadata: {
        errorMessage: error,
        ...metadata,
      },
    });
  }

  /**
   * Log circuit breaker event
   */
  async logCircuitBreakerEvent(
    provider: string,
    dataType: string,
    state: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const severity = state === 'open' ? 'error' : state === 'rate-limited' ? 'warning' : 'info';
    
    await this.logEvent({
      type: 'circuit_breaker',
      provider,
      dataType,
      severity,
      message: `Circuit breaker ${state} for ${provider}:${dataType} - ${reason}`,
      metadata: {
        circuitBreakerState: state,
        reason,
        ...metadata,
      },
    });
  }

  /**
   * Log fallback event
   */
  async logFallbackEvent(
    provider: string,
    dataType: string,
    reason: string,
    fallbackType: 'historical' | 'cached',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      type: 'fallback',
      provider,
      dataType,
      severity: 'warning',
      message: `Fallback to ${fallbackType} data for ${provider}:${dataType} - ${reason}`,
      metadata: {
        fallbackInfo: {
          reason,
          fallbackType,
          dataSource: fallbackType === 'historical' ? 'generator' : 'cache',
        },
        ...metadata,
      },
    });
  }

  /**
   * Log recovery event
   */
  async logRecoveryEvent(
    provider: string,
    dataType: string,
    recoveryType: 'circuit_breaker' | 'rate_limit',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      type: 'recovery',
      provider,
      dataType,
      severity: 'info',
      message: `${recoveryType} recovery for ${provider}:${dataType}`,
      metadata: {
        recoveryType,
        ...metadata,
      },
    });
  }

  /**
   * Log API call event
   */
  async logApiCallEvent(
    provider: string,
    dataType: string,
    success: boolean,
    duration: number,
    statusCode?: number,
    error?: string
  ): Promise<void> {
    await this.logEvent({
      type: 'api_call',
      provider,
      dataType,
      severity: success ? 'info' : 'warning',
      message: `API call ${success ? 'succeeded' : 'failed'} for ${provider}:${dataType}`,
      metadata: {
        duration,
        statusCode,
        errorMessage: error,
        success,
      },
    });
  }

  /**
   * Get monitoring statistics for a time range
   */
  async getMonitoringStats(
    startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    endTime: Date = new Date()
  ): Promise<MonitoringStats> {
    const events = await this.getEvents(startTime, endTime);
    
    const stats: MonitoringStats = {
      timeRange: { start: startTime, end: endTime },
      totalEvents: events.length,
      eventsByType: {},
      eventsBySeverity: {},
      providerStats: {},
      rateLimitSummary: {
        totalRateLimits: 0,
        activeRateLimits: 0,
        providersAffected: [],
        longestCooldown: 0,
      },
      circuitBreakerSummary: {
        openCircuits: 0,
        rateLimitedCircuits: 0,
        totalFailures: 0,
        averageRecoveryTime: 0,
      },
    };

    // Process events to generate statistics
    const providerData: Record<string, {
      events: MonitoringEvent[];
      rateLimits: number;
      circuitBreakers: number;
      fallbacks: number;
      apiCalls: number;
      successfulCalls: number;
      totalResponseTime: number;
    }> = {};

    for (const event of events) {
      // Count by type and severity
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      stats.eventsBySeverity[event.severity] = (stats.eventsBySeverity[event.severity] || 0) + 1;

      // Initialize provider data
      const providerKey = event.provider;
      if (!providerData[providerKey]) {
        providerData[providerKey] = {
          events: [],
          rateLimits: 0,
          circuitBreakers: 0,
          fallbacks: 0,
          apiCalls: 0,
          successfulCalls: 0,
          totalResponseTime: 0,
        };
      }

      const provider = providerData[providerKey];
      provider.events.push(event);

      // Count specific event types
      switch (event.type) {
        case 'rate_limit':
          provider.rateLimits++;
          stats.rateLimitSummary.totalRateLimits++;
          break;
        case 'circuit_breaker':
          provider.circuitBreakers++;
          if (event.metadata?.circuitBreakerState === 'open') {
            stats.circuitBreakerSummary.openCircuits++;
          } else if (event.metadata?.circuitBreakerState === 'rate-limited') {
            stats.circuitBreakerSummary.rateLimitedCircuits++;
          }
          break;
        case 'fallback':
          provider.fallbacks++;
          break;
        case 'api_call':
          provider.apiCalls++;
          if (event.metadata?.success) {
            provider.successfulCalls++;
          }
          if (event.metadata?.duration) {
            provider.totalResponseTime += event.metadata.duration;
          }
          break;
      }
    }

    // Calculate provider statistics
    for (const [providerName, data] of Object.entries(providerData)) {
      stats.providerStats[providerName] = {
        totalEvents: data.events.length,
        rateLimitEvents: data.rateLimits,
        circuitBreakerEvents: data.circuitBreakers,
        fallbackEvents: data.fallbacks,
        successRate: data.apiCalls > 0 ? (data.successfulCalls / data.apiCalls) * 100 : 100,
        averageResponseTime: data.apiCalls > 0 ? data.totalResponseTime / data.apiCalls : 0,
      };
    }

    // Get current rate limit status
    const allCircuitBreakers = await enhancedCircuitBreaker.getAllStates();
    for (const [key, state] of allCircuitBreakers.entries()) {
      const [provider] = key.split(':');
      if (state.rateLimitStatus?.isRateLimited) {
        stats.rateLimitSummary.activeRateLimits++;
        if (!stats.rateLimitSummary.providersAffected.includes(provider)) {
          stats.rateLimitSummary.providersAffected.push(provider);
        }
        
        if (state.rateLimitStatus.cooldownExpiresAt) {
          const cooldownSeconds = Math.ceil((state.rateLimitStatus.cooldownExpiresAt.getTime() - Date.now()) / 1000);
          stats.rateLimitSummary.longestCooldown = Math.max(stats.rateLimitSummary.longestCooldown, cooldownSeconds);
        }
      }
    }

    return stats;
  }

  /**
   * Generate monitoring report
   */
  async generateReport(
    startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: Date = new Date()
  ): Promise<string> {
    const stats = await this.getMonitoringStats(startTime, endTime);
    
    const report = [
      '# Rate Limit Monitoring Report',
      `Time Range: ${startTime.toISOString()} to ${endTime.toISOString()}`,
      '',
      '## Summary',
      `- Total Events: ${stats.totalEvents}`,
      `- Rate Limit Events: ${stats.eventsByType.rate_limit || 0}`,
      `- Circuit Breaker Events: ${stats.eventsByType.circuit_breaker || 0}`,
      `- Fallback Events: ${stats.eventsByType.fallback || 0}`,
      `- API Call Events: ${stats.eventsByType.api_call || 0}`,
      '',
      '## Rate Limit Status',
      `- Active Rate Limits: ${stats.rateLimitSummary.activeRateLimits}`,
      `- Providers Affected: ${stats.rateLimitSummary.providersAffected.join(', ') || 'None'}`,
      `- Longest Cooldown: ${stats.rateLimitSummary.longestCooldown}s`,
      '',
      '## Circuit Breaker Status',
      `- Open Circuits: ${stats.circuitBreakerSummary.openCircuits}`,
      `- Rate Limited Circuits: ${stats.circuitBreakerSummary.rateLimitedCircuits}`,
      '',
      '## Provider Statistics',
    ];

    for (const [provider, providerStats] of Object.entries(stats.providerStats)) {
      report.push(`### ${provider}`);
      report.push(`- Success Rate: ${providerStats.successRate.toFixed(1)}%`);
      report.push(`- Average Response Time: ${providerStats.averageResponseTime.toFixed(0)}ms`);
      report.push(`- Rate Limit Events: ${providerStats.rateLimitEvents}`);
      report.push(`- Fallback Events: ${providerStats.fallbackEvents}`);
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Private helper methods
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeEventInRedis(event: MonitoringEvent): Promise<void> {
    const timeWindow = this.getTimeWindow(event.timestamp);
    const key = this.generateEventKey(timeWindow);

    await executeRedisCommand(
      async (client) => {
        await client.zAdd(key, {
          score: event.timestamp.getTime(),
          value: JSON.stringify({
            ...event,
            timestamp: event.timestamp.toISOString(),
          }),
        });

        // Set expiration to keep events for 7 days
        await client.expire(key, 7 * 24 * 60 * 60);
      },
      null
    );
  }

  private logToConsole(event: MonitoringEvent): void {
    const logLevel = event.severity === 'error' || event.severity === 'critical' ? 'error' :
                    event.severity === 'warning' ? 'warn' : 'info';
    
    console[logLevel](`[${event.type.toUpperCase()}] ${event.message}`, {
      provider: event.provider,
      dataType: event.dataType,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata,
    });
  }

  private async checkAlertConditions(event: MonitoringEvent): Promise<void> {
    // This is a placeholder for alert logic
    // In a production system, you would integrate with alerting services
    if (event.severity === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${event.message}`, event.metadata);
    }
  }

  private getTimeWindow(timestamp: Date): string {
    // Group events by hour for efficient storage
    const hour = new Date(timestamp);
    hour.setMinutes(0, 0, 0);
    return hour.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  }

  private async getEvents(startTime: Date, endTime: Date): Promise<MonitoringEvent[]> {
    // For now, return in-memory events within the time range
    // In production, you would query Redis for historical events
    return this.inMemoryEvents.filter(
      event => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }
}

// Export singleton instance
export const rateLimitMonitor = new RateLimitMonitor();
