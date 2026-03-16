/**
 * Dual Data Source Monitoring System
 * 
 * Comprehensive monitoring and logging for the dual data source system,
 * including failover events, API health tracking, and performance metrics.
 */

import { FailoverEvent, ProviderHealth } from '@/shared/config/dualDataSourceConfig';
import { performanceMonitor } from '@/backend/lib/performance-monitoring';

// Event types for monitoring
export enum MonitoringEventType {
  FAILOVER = 'failover',
  API_HEALTH_CHECK = 'api_health_check',
  DATA_SOURCE_SWITCH = 'data_source_switch',
  PERFORMANCE_ALERT = 'performance_alert',
  CACHE_EVENT = 'cache_event',
  CIRCUIT_BREAKER = 'circuit_breaker',
  RATE_LIMIT = 'rate_limit',
}

// Severity levels for events
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Monitoring event interface
export interface MonitoringEvent {
  id: string;
  timestamp: Date;
  type: MonitoringEventType;
  severity: EventSeverity;
  dataType: string;
  provider?: string;
  message: string;
  metadata: Record<string, unknown>;
  duration?: number;
  success: boolean;
}

// Performance metrics for data sources
export interface DataSourcePerformanceMetrics {
  provider: string;
  dataType: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastRequestTime: Date | null;
  successRate: number;
  errorRate: number;
  rateLimitHits: number;
  circuitBreakerTrips: number;
}

// Alert configuration
export interface AlertConfig {
  type: MonitoringEventType;
  threshold: number;
  timeWindow: number; // milliseconds
  severity: EventSeverity;
  enabled: boolean;
}

class DualDataSourceMonitor {
  private events: MonitoringEvent[] = [];
  private performanceMetrics = new Map<string, DataSourcePerformanceMetrics>();
  private alertConfigs: AlertConfig[] = [];
  private maxEventHistory = 1000;
  private alertCooldowns = new Map<string, Date>();

  constructor() {
    this.initializeDefaultAlerts();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultAlerts(): void {
    this.alertConfigs = [
      {
        type: MonitoringEventType.FAILOVER,
        threshold: 3, // 3 failovers in time window
        timeWindow: 5 * 60 * 1000, // 5 minutes
        severity: EventSeverity.WARNING,
        enabled: true,
      },
      {
        type: MonitoringEventType.API_HEALTH_CHECK,
        threshold: 5, // 5 failed health checks
        timeWindow: 10 * 60 * 1000, // 10 minutes
        severity: EventSeverity.ERROR,
        enabled: true,
      },
      {
        type: MonitoringEventType.CIRCUIT_BREAKER,
        threshold: 1, // Any circuit breaker trip
        timeWindow: 1 * 60 * 1000, // 1 minute
        severity: EventSeverity.CRITICAL,
        enabled: true,
      },
      {
        type: MonitoringEventType.RATE_LIMIT,
        threshold: 10, // 10 rate limit hits
        timeWindow: 15 * 60 * 1000, // 15 minutes
        severity: EventSeverity.WARNING,
        enabled: true,
      },
    ];
  }

  /**
   * Setup performance monitoring integration
   */
  private setupPerformanceMonitoring(): void {
    // Set up performance thresholds
    performanceMonitor.setThreshold('data_source_response_time', 5000, 10000); // 5s warning, 10s critical
    performanceMonitor.setThreshold('failover_frequency', 3, 10); // 3 warning, 10 critical per hour
    performanceMonitor.setThreshold('api_error_rate', 0.1, 0.3); // 10% warning, 30% critical

    // Listen for performance alerts
    performanceMonitor.on('alert', (alert) => {
      this.logEvent({
        type: MonitoringEventType.PERFORMANCE_ALERT,
        severity: alert.level === 'critical' ? EventSeverity.CRITICAL : EventSeverity.WARNING,
        dataType: 'system',
        message: `Performance alert: ${alert.message}`,
        metadata: {
          metricName: alert.metricName,
          value: alert.value,
          threshold: alert.threshold,
        },
        success: false,
      });
    });
  }

  /**
   * Log a monitoring event. Never throws - monitoring must not crash the app.
   */
  logEvent(eventData: Omit<MonitoringEvent, 'id' | 'timestamp'>): void {
    try {
      const event: MonitoringEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        ...eventData,
      };

      // Add to event history
      this.events.unshift(event);

      // Limit history size
      if (this.events.length > this.maxEventHistory) {
        this.events = this.events.slice(0, this.maxEventHistory);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(event);

      // Check for alerts
      this.checkAlerts(event);

      // Log to console with appropriate level
      this.logToConsole(event);

      // Record performance metric
      if (event.duration !== undefined) {
        performanceMonitor.recordMetric(
          `${event.type}_duration`,
          event.duration,
          'ms',
          {
            provider: event.provider || 'unknown',
            dataType: event.dataType,
            success: event.success.toString(),
          }
        );
      }
    } catch (monitoringError) {
      // Monitoring must never crash the app - log and swallow
      console.error('[DualDataSourceMonitor] logEvent failed:', monitoringError instanceof Error ? monitoringError.message : String(monitoringError));
    }
  }

  /**
   * Log a failover event
   */
  logFailoverEvent(failoverEvent: FailoverEvent): void {
    this.logEvent({
      type: MonitoringEventType.FAILOVER,
      severity: EventSeverity.WARNING,
      dataType: failoverEvent.dataType,
      provider: failoverEvent.fromProvider,
      message: `Failover from ${failoverEvent.fromProvider} to ${failoverEvent.toProvider}: ${failoverEvent.reason}`,
      metadata: {
        fromProvider: failoverEvent.fromProvider,
        toProvider: failoverEvent.toProvider,
        reason: failoverEvent.reason,
        ...failoverEvent.metadata,
      },
      duration: failoverEvent.duration,
      success: failoverEvent.success,
    });
  }

  /**
   * Log API health check result
   * @param duration - Optional duration in ms of the request that triggered this update
   */
  logApiHealthCheck(provider: string, dataType: string, health: ProviderHealth, duration?: number): void {
    const severity = health.status === 'healthy' ? EventSeverity.INFO :
                    health.status === 'degraded' ? EventSeverity.WARNING :
                    health.status === 'rate-limited' ? EventSeverity.WARNING :
                    EventSeverity.ERROR;

    this.logEvent({
      type: MonitoringEventType.API_HEALTH_CHECK,
      severity,
      dataType,
      provider,
      message: `API health check for ${provider}: ${health.status}`,
      metadata: {
        status: health.status,
        consecutiveFailures: health.consecutiveFailures,
        averageResponseTime: health.averageResponseTime,
        successRate: health.successRate,
        circuitBreakerState: health.circuitBreakerState,
        lastSuccess: health.lastSuccess?.toISOString(),
        lastFailure: health.lastFailure?.toISOString(),
      },
      duration,
      success: health.status === 'healthy',
    });
  }

  /**
   * Log data source switch event
   */
  logDataSourceSwitch(dataType: string, fromSource: string, toSource: string, reason: string): void {
    this.logEvent({
      type: MonitoringEventType.DATA_SOURCE_SWITCH,
      severity: EventSeverity.INFO,
      dataType,
      message: `Data source switched from ${fromSource} to ${toSource}: ${reason}`,
      metadata: {
        fromSource,
        toSource,
        reason,
      },
      success: true,
    });
  }

  /**
   * Log cache event
   */
  logCacheEvent(operation: string, key: string, hit: boolean, duration?: number): void {
    this.logEvent({
      type: MonitoringEventType.CACHE_EVENT,
      severity: EventSeverity.INFO,
      dataType: 'cache',
      message: `Cache ${operation}: ${hit ? 'HIT' : 'MISS'} for key ${key}`,
      metadata: {
        operation,
        key,
        hit,
      },
      duration,
      success: true,
    });
  }

  /**
   * Log circuit breaker event
   */
  logCircuitBreakerEvent(provider: string, state: string, reason: string): void {
    this.logEvent({
      type: MonitoringEventType.CIRCUIT_BREAKER,
      severity: state === 'open' ? EventSeverity.CRITICAL : EventSeverity.WARNING,
      dataType: 'circuit-breaker',
      provider,
      message: `Circuit breaker ${state} for ${provider}: ${reason}`,
      metadata: {
        state,
        reason,
      },
      success: state !== 'open',
    });
  }

  /**
   * Log rate limit event
   */
  logRateLimitEvent(provider: string, dataType: string, resetTime?: Date): void {
    this.logEvent({
      type: MonitoringEventType.RATE_LIMIT,
      severity: EventSeverity.WARNING,
      dataType,
      provider,
      message: `Rate limit hit for ${provider}`,
      metadata: {
        resetTime: resetTime?.toISOString(),
      },
      success: false,
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update performance metrics based on event
   */
  private updatePerformanceMetrics(event: MonitoringEvent): void {
    if (!event.provider) return;

    const key = `${event.provider}_${event.dataType}`;
    let metrics = this.performanceMetrics.get(key);

    if (!metrics) {
      metrics = {
        provider: event.provider,
        dataType: event.dataType,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        lastRequestTime: null,
        successRate: 0,
        errorRate: 0,
        rateLimitHits: 0,
        circuitBreakerTrips: 0,
      };
      this.performanceMetrics.set(key, metrics);
    }

    // Update basic counters
    metrics.totalRequests++;
    metrics.lastRequestTime = event.timestamp;

    if (event.success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update response time metrics
    if (event.duration !== undefined) {
      metrics.averageResponseTime =
        (metrics.averageResponseTime * (metrics.totalRequests - 1) + event.duration) / metrics.totalRequests;
      metrics.minResponseTime = Math.min(metrics.minResponseTime, event.duration);
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, event.duration);
    }

    // Update rates
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    // Update specific event counters
    if (event.type === MonitoringEventType.RATE_LIMIT) {
      metrics.rateLimitHits++;
    }
    if (event.type === MonitoringEventType.CIRCUIT_BREAKER) {
      metrics.circuitBreakerTrips++;
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(event: MonitoringEvent): void {
    for (const config of this.alertConfigs) {
      if (!config.enabled || config.type !== event.type) continue;

      // Check cooldown
      const cooldownKey = `${config.type}_${event.provider || 'global'}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (lastAlert && Date.now() - lastAlert.getTime() < config.timeWindow) {
        continue;
      }

      // Count events in time window
      const windowStart = Date.now() - config.timeWindow;
      const eventsInWindow = this.events.filter(e =>
        e.type === config.type &&
        e.timestamp.getTime() > windowStart &&
        (config.type !== MonitoringEventType.API_HEALTH_CHECK || !e.success)
      ).length;

      if (eventsInWindow >= config.threshold) {
        this.triggerAlert(config, eventsInWindow, event);
        this.alertCooldowns.set(cooldownKey, new Date());
      }
    }
  }

  /**
   * Trigger an alert. Never throws - alerts must not crash the app.
   */
  private triggerAlert(config: AlertConfig, eventCount: number, triggerEvent: MonitoringEvent): void {
    try {
      const alertMessage = `ALERT: ${config.type} threshold exceeded - ${eventCount} events in ${config.timeWindow / 1000}s`;

      console.warn(`🚨 ${config.severity.toUpperCase()} ALERT:`, {
        type: config.type,
        threshold: config.threshold,
        actual: eventCount,
        timeWindow: config.timeWindow,
        triggerEvent: {
          id: triggerEvent.id,
          provider: triggerEvent.provider,
          dataType: triggerEvent.dataType,
          message: triggerEvent.message,
        },
      });

      // Log alert as monitoring event
      this.logEvent({
        type: MonitoringEventType.PERFORMANCE_ALERT,
        severity: config.severity,
        dataType: 'monitoring',
        message: alertMessage,
        metadata: {
          alertType: config.type,
          threshold: config.threshold,
          actualCount: eventCount,
          timeWindow: config.timeWindow,
          triggerEventId: triggerEvent.id,
        },
        success: false,
      });

      // In production, you might want to send to external alerting service
      if (process.env.NODE_ENV === 'production') {
        this.sendExternalAlert(config, eventCount, triggerEvent);
      }
    } catch (alertError) {
      console.error('[DualDataSourceMonitor] triggerAlert failed:', alertError instanceof Error ? alertError.message : String(alertError));
    }
  }

  /**
   * Send alert to external service (placeholder)
   */
  private sendExternalAlert(config: AlertConfig, eventCount: number, triggerEvent: MonitoringEvent): void {
    // This would integrate with services like PagerDuty, Slack, etc.
    console.log('External alert would be sent:', {
      config,
      eventCount,
      triggerEvent,
    });
  }

  /**
   * Log event to console with appropriate formatting
   */
  private logToConsole(event: MonitoringEvent): void {
    // Safely serialize the log data to prevent circular references and handle complex objects
    const logData = this.safeSerializeLogData({
      id: event.id,
      type: event.type,
      dataType: event.dataType,
      provider: event.provider,
      message: event.message,
      duration: event.duration,
      success: event.success,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata,
    });

    const emoji = this.getEventEmoji(event);
    const prefix = `${emoji} [${event.severity.toUpperCase()}]`;

    try {
      switch (event.severity) {
        case EventSeverity.CRITICAL:
          console.error(`${prefix} CRITICAL:`, logData);
          break;
        case EventSeverity.ERROR:
          console.error(`${prefix} ERROR:`, logData);
          break;
        case EventSeverity.WARNING:
          console.warn(`${prefix} WARNING:`, logData);
          break;
        case EventSeverity.INFO:
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MONITORING === 'true') {
            console.info(`${prefix} INFO:`, logData);
          }
          break;
      }
    } catch (consoleError) {
      // Fallback logging if console methods fail
      console.log(`${prefix} [CONSOLE_ERROR] Failed to log event:`, {
        eventId: event.id,
        eventType: event.type,
        severity: event.severity,
        message: event.message,
        consoleError: consoleError instanceof Error ? consoleError.message : String(consoleError),
      });
    }
  }

  /**
   * Safely serialize log data to prevent circular references and handle complex objects
   */
  private safeSerializeLogData(data: Record<string, unknown>): Record<string, unknown> {
    const seen = new WeakSet();

    const serialize = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (seen.has(obj as object)) {
        return '[Circular Reference]';
      }

      seen.add(obj as object);

      if (obj instanceof Date) {
        return obj.toISOString();
      }

      if (obj instanceof Error) {
        return {
          name: obj.name,
          message: obj.message,
          stack: obj.stack,
        };
      }

      if (Array.isArray(obj)) {
        return obj.map(serialize);
      }

      if (typeof obj === 'object') {
        const serialized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          try {
            serialized[key] = serialize(value);
          } catch (error) {
            serialized[key] = `[Serialization Error: ${error instanceof Error ? error.message : String(error)}]`;
          }
        }
        return serialized;
      }

      return obj;
    };

    try {
      return serialize(data) as Record<string, unknown>;
    } catch (error) {
      return {
        error: 'Failed to serialize log data',
        originalKeys: Object.keys(data),
        serializationError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get emoji for event type
   */
  private getEventEmoji(event: MonitoringEvent): string {
    switch (event.type) {
      case MonitoringEventType.FAILOVER:
        return '🔄';
      case MonitoringEventType.API_HEALTH_CHECK:
        return event.success ? '✅' : '❌';
      case MonitoringEventType.DATA_SOURCE_SWITCH:
        return '🔀';
      case MonitoringEventType.PERFORMANCE_ALERT:
        return '⚠️';
      case MonitoringEventType.CACHE_EVENT:
        return '💾';
      case MonitoringEventType.CIRCUIT_BREAKER:
        return '🔌';
      case MonitoringEventType.RATE_LIMIT:
        return '🚦';
      default:
        return '📊';
    }
  }

  // Public methods for accessing monitoring data

  /**
   * Get recent events with optional filtering
   */
  getEvents(options: {
    limit?: number;
    type?: MonitoringEventType;
    severity?: EventSeverity;
    provider?: string;
    dataType?: string;
    since?: Date;
  } = {}): MonitoringEvent[] {
    let filteredEvents = this.events;

    if (options.type) {
      filteredEvents = filteredEvents.filter(e => e.type === options.type);
    }
    if (options.severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === options.severity);
    }
    if (options.provider) {
      filteredEvents = filteredEvents.filter(e => e.provider === options.provider);
    }
    if (options.dataType) {
      filteredEvents = filteredEvents.filter(e => e.dataType === options.dataType);
    }
    if (options.since) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= options.since!);
    }

    return filteredEvents.slice(0, options.limit || 100);
  }

  /**
   * Get performance metrics for a specific provider/dataType
   */
  getPerformanceMetrics(provider?: string, dataType?: string): DataSourcePerformanceMetrics[] {
    if (provider && dataType) {
      const key = `${provider}_${dataType}`;
      const metrics = this.performanceMetrics.get(key);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.performanceMetrics.values()).filter(metrics => {
      if (provider && metrics.provider !== provider) return false;
      if (dataType && metrics.dataType !== dataType) return false;
      return true;
    });
  }

  /**
   * Get monitoring summary
   */
  getSummary(timeWindow: number = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    eventsByType: Record<MonitoringEventType, number>;
    eventsBySeverity: Record<EventSeverity, number>;
    failoverCount: number;
    healthCheckFailures: number;
    averageResponseTime: number;
    topProvidersByErrors: Array<{ provider: string; errorCount: number }>;
  } {
    const since = new Date(Date.now() - timeWindow);
    const recentEvents = this.getEvents({ since });

    const eventsByType = {} as Record<MonitoringEventType, number>;
    const eventsBySeverity = {} as Record<EventSeverity, number>;

    // Initialize counters
    Object.values(MonitoringEventType).forEach(type => {
      eventsByType[type] = 0;
    });
    Object.values(EventSeverity).forEach(severity => {
      eventsBySeverity[severity] = 0;
    });

    // Count events
    recentEvents.forEach(event => {
      eventsByType[event.type]++;
      eventsBySeverity[event.severity]++;
    });

    // Calculate metrics
    const failoverCount = eventsByType[MonitoringEventType.FAILOVER];
    const healthCheckFailures = recentEvents.filter(e =>
      e.type === MonitoringEventType.API_HEALTH_CHECK && !e.success
    ).length;

    const eventsWithDuration = recentEvents.filter(e => e.duration !== undefined);
    const averageResponseTime = eventsWithDuration.length > 0
      ? eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / eventsWithDuration.length
      : 0;

    // Top providers by errors
    const providerErrors = new Map<string, number>();
    recentEvents.filter(e => !e.success && e.provider).forEach(event => {
      const count = providerErrors.get(event.provider!) || 0;
      providerErrors.set(event.provider!, count + 1);
    });

    const topProvidersByErrors = Array.from(providerErrors.entries())
      .map(([provider, errorCount]) => ({ provider, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 5);

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      failoverCount,
      healthCheckFailures,
      averageResponseTime,
      topProvidersByErrors,
    };
  }

  /**
   * Get alert configurations
   */
  getAlertConfigs(): AlertConfig[] {
    return [...this.alertConfigs];
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(type: MonitoringEventType, updates: Partial<AlertConfig>): void {
    const index = this.alertConfigs.findIndex(config => config.type === type);
    if (index !== -1) {
      this.alertConfigs[index] = { ...this.alertConfigs[index], ...updates };
    }
  }

  /**
   * Clear event history
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Export monitoring data for external analysis
   */
  exportData(): {
    events: MonitoringEvent[];
    performanceMetrics: DataSourcePerformanceMetrics[];
    alertConfigs: AlertConfig[];
    summary: {
      totalEvents: number;
      eventsByType: Record<MonitoringEventType, number>;
      eventsBySeverity: Record<EventSeverity, number>;
      failoverCount: number;
      healthCheckFailures: number;
      averageResponseTime: number;
      topProvidersByErrors: Array<{ provider: string; errorCount: number }>;
    };
  } {
    return {
      events: this.events,
      performanceMetrics: Array.from(this.performanceMetrics.values()),
      alertConfigs: this.alertConfigs,
      summary: this.getSummary(),
    };
  }
}

// Global monitor instance
export const dualDataSourceMonitor = new DualDataSourceMonitor();

// Convenience functions
export const logFailoverEvent = (event: FailoverEvent) =>
  dualDataSourceMonitor.logFailoverEvent(event);

export const logApiHealthCheck = (provider: string, dataType: string, health: ProviderHealth, duration?: number) =>
  dualDataSourceMonitor.logApiHealthCheck(provider, dataType, health, duration);

export const logDataSourceSwitch = (dataType: string, fromSource: string, toSource: string, reason: string) =>
  dualDataSourceMonitor.logDataSourceSwitch(dataType, fromSource, toSource, reason);

export const logCacheEvent = (operation: string, key: string, hit: boolean, duration?: number) =>
  dualDataSourceMonitor.logCacheEvent(operation, key, hit, duration);

export const logCircuitBreakerEvent = (provider: string, state: string, reason: string) =>
  dualDataSourceMonitor.logCircuitBreakerEvent(provider, state, reason);

export const logRateLimitEvent = (provider: string, dataType: string, resetTime?: Date) =>
  dualDataSourceMonitor.logRateLimitEvent(provider, dataType, resetTime);

export const getMonitoringEvents = (options?: Parameters<typeof dualDataSourceMonitor.getEvents>[0]) =>
  dualDataSourceMonitor.getEvents(options);

export const getMonitoringSummary = (timeWindow?: number) =>
  dualDataSourceMonitor.getSummary(timeWindow);

export const getDataSourcePerformanceMetrics = (provider?: string, dataType?: string) =>
  dualDataSourceMonitor.getPerformanceMetrics(provider, dataType);

export default dualDataSourceMonitor;
