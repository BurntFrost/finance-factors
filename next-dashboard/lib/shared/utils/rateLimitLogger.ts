/**
 * Rate Limit Logger
 * 
 * Enhanced logging and monitoring for rate limit events and API call patterns
 */

export interface RateLimitEvent {
  timestamp: Date;
  provider: string;
  dataType: string;
  eventType: 'request' | 'rate_limit_hit' | 'circuit_breaker_open' | 'circuit_breaker_close' | 'fallback_triggered';
  success: boolean;
  duration?: number;
  error?: string;
  metadata?: {
    requestsRemaining?: number;
    resetTime?: Date;
    circuitBreakerState?: string;
    fallbackReason?: string;
    retryCount?: number;
  };
}

export interface ApiCallPattern {
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  circuitBreakerTrips: number;
  fallbackTriggered: number;
}

class RateLimitLogger {
  private events: RateLimitEvent[] = [];
  private patterns: Map<string, ApiCallPattern> = new Map();
  private maxEvents = 1000; // Keep last 1000 events in memory

  /**
   * Log a rate limit event
   */
  logEvent(event: Omit<RateLimitEvent, 'timestamp'>): void {
    const fullEvent: RateLimitEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add to events array
    this.events.push(fullEvent);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update patterns
    this.updatePattern(fullEvent);

    // Log to console with appropriate level
    this.logToConsole(fullEvent);
  }

  /**
   * Update API call patterns
   */
  private updatePattern(event: RateLimitEvent): void {
    const key = event.provider;
    const existing = this.patterns.get(key) || {
      provider: event.provider,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
      circuitBreakerTrips: 0,
      fallbackTriggered: 0,
    };

    // Update counters
    if (event.eventType === 'request') {
      existing.totalRequests++;
      if (event.success) {
        existing.successfulRequests++;
      } else {
        existing.failedRequests++;
      }
      
      // Update average response time
      if (event.duration !== undefined) {
        const totalTime = existing.averageResponseTime * (existing.totalRequests - 1) + event.duration;
        existing.averageResponseTime = totalTime / existing.totalRequests;
      }
    }

    if (event.eventType === 'rate_limit_hit') {
      existing.rateLimitHits++;
    }

    if (event.eventType === 'circuit_breaker_open') {
      existing.circuitBreakerTrips++;
    }

    if (event.eventType === 'fallback_triggered') {
      existing.fallbackTriggered++;
    }

    existing.lastRequestTime = event.timestamp;
    this.patterns.set(key, existing);
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(event: RateLimitEvent): void {
    const timestamp = event.timestamp.toISOString();
    const baseMessage = `[${timestamp}] ${event.provider} - ${event.dataType}`;

    switch (event.eventType) {
      case 'request':
        if (event.success) {
          console.log(`✅ ${baseMessage}: Request successful (${event.duration}ms)`);
        } else {
          console.warn(`❌ ${baseMessage}: Request failed - ${event.error}`);
        }
        break;

      case 'rate_limit_hit':
        console.warn(`🚫 ${baseMessage}: Rate limit exceeded`, {
          remaining: event.metadata?.requestsRemaining,
          resetTime: event.metadata?.resetTime?.toISOString(),
        });
        break;

      case 'circuit_breaker_open':
        console.warn(`🔴 ${baseMessage}: Circuit breaker opened`, {
          state: event.metadata?.circuitBreakerState,
          retryCount: event.metadata?.retryCount,
        });
        break;

      case 'circuit_breaker_close':
        console.info(`🟢 ${baseMessage}: Circuit breaker closed - service recovered`);
        break;

      case 'fallback_triggered':
        console.info(`🔄 ${baseMessage}: Fallback triggered - ${event.metadata?.fallbackReason}`);
        break;

      default:
        console.log(`📊 ${baseMessage}: ${event.eventType}`);
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): RateLimitEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for a specific provider
   */
  getProviderEvents(provider: string, limit: number = 50): RateLimitEvent[] {
    return this.events
      .filter(event => event.provider === provider)
      .slice(-limit);
  }

  /**
   * Get API call patterns
   */
  getPatterns(): Map<string, ApiCallPattern> {
    return new Map(this.patterns);
  }

  /**
   * Get pattern for specific provider
   */
  getProviderPattern(provider: string): ApiCallPattern | null {
    return this.patterns.get(provider) || null;
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): {
    totalEvents: number;
    rateLimitHits: number;
    circuitBreakerTrips: number;
    fallbacksTriggered: number;
    topProblematicProviders: Array<{ provider: string; issues: number }>;
  } {
    const rateLimitHits = this.events.filter(e => e.eventType === 'rate_limit_hit').length;
    const circuitBreakerTrips = this.events.filter(e => e.eventType === 'circuit_breaker_open').length;
    const fallbacksTriggered = this.events.filter(e => e.eventType === 'fallback_triggered').length;

    // Calculate problematic providers
    const providerIssues = new Map<string, number>();
    this.events.forEach(event => {
      if (['rate_limit_hit', 'circuit_breaker_open', 'fallback_triggered'].includes(event.eventType)) {
        const current = providerIssues.get(event.provider) || 0;
        providerIssues.set(event.provider, current + 1);
      }
    });

    const topProblematicProviders = Array.from(providerIssues.entries())
      .map(([provider, issues]) => ({ provider, issues }))
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 5);

    return {
      totalEvents: this.events.length,
      rateLimitHits,
      circuitBreakerTrips,
      fallbacksTriggered,
      topProblematicProviders,
    };
  }

  /**
   * Clear old events (keep only recent ones)
   */
  clearOldEvents(keepLast: number = 500): void {
    if (this.events.length > keepLast) {
      this.events = this.events.slice(-keepLast);
    }
  }

  /**
   * Export events for analysis
   */
  exportEvents(): RateLimitEvent[] {
    return [...this.events];
  }

  /**
   * Generate monitoring report
   */
  generateReport(): string {
    const stats = this.getRateLimitStats();
    const patterns = Array.from(this.patterns.values());

    let report = '📊 Rate Limit Monitoring Report\n';
    report += '================================\n\n';

    report += `Total Events: ${stats.totalEvents}\n`;
    report += `Rate Limit Hits: ${stats.rateLimitHits}\n`;
    report += `Circuit Breaker Trips: ${stats.circuitBreakerTrips}\n`;
    report += `Fallbacks Triggered: ${stats.fallbacksTriggered}\n\n`;

    if (stats.topProblematicProviders.length > 0) {
      report += 'Top Problematic Providers:\n';
      stats.topProblematicProviders.forEach((provider, index) => {
        report += `${index + 1}. ${provider.provider}: ${provider.issues} issues\n`;
      });
      report += '\n';
    }

    report += 'Provider Patterns:\n';
    patterns.forEach(pattern => {
      const successRate = pattern.totalRequests > 0 
        ? ((pattern.successfulRequests / pattern.totalRequests) * 100).toFixed(1)
        : '0';
      
      report += `${pattern.provider}:\n`;
      report += `  - Total Requests: ${pattern.totalRequests}\n`;
      report += `  - Success Rate: ${successRate}%\n`;
      report += `  - Rate Limit Hits: ${pattern.rateLimitHits}\n`;
      report += `  - Circuit Breaker Trips: ${pattern.circuitBreakerTrips}\n`;
      report += `  - Avg Response Time: ${pattern.averageResponseTime.toFixed(0)}ms\n`;
      report += `  - Last Request: ${pattern.lastRequestTime.toISOString()}\n\n`;
    });

    return report;
  }
}

// Export singleton instance
export const rateLimitLogger = new RateLimitLogger();
