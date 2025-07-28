/**
 * Redis Health Monitoring System
 * 
 * Real-time monitoring of Redis connection status, operation success rates,
 * and automatic triggering of fallback mode when Redis becomes unreliable.
 */

import { redisErrorLogger, RedisOperationType, RedisErrorSeverity } from './redis-error-logger';
import { redisFallbackService } from './redis-fallback-service';

// Health status levels
export enum RedisHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical',
}

// Health check result interface
export interface RedisHealthCheckResult {
  status: RedisHealthStatus;
  timestamp: string;
  latency: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'unknown';
  operationMetrics: {
    successRate: number;
    errorRate: number;
    averageLatency: number;
    consecutiveFailures: number;
    totalOperations: number;
  };
  fallbackStatus: {
    isActive: boolean;
    reason?: string;
    activatedAt?: string;
  };
  recommendations: string[];
}

// Health monitoring configuration
interface HealthMonitorConfig {
  checkIntervalMs: number;
  healthyThresholds: {
    maxLatency: number;
    minSuccessRate: number;
    maxConsecutiveFailures: number;
  };
  degradedThresholds: {
    maxLatency: number;
    minSuccessRate: number;
    maxConsecutiveFailures: number;
  };
  enableAutoFallback: boolean;
  enablePeriodicChecks: boolean;
}

/**
 * Redis Health Monitor Class
 */
export class RedisHealthMonitor {
  private static instance: RedisHealthMonitor;
  private config: HealthMonitorConfig = {
    checkIntervalMs: 30000, // 30 seconds
    healthyThresholds: {
      maxLatency: 100, // 100ms
      minSuccessRate: 0.95, // 95%
      maxConsecutiveFailures: 2,
    },
    degradedThresholds: {
      maxLatency: 500, // 500ms
      minSuccessRate: 0.8, // 80%
      maxConsecutiveFailures: 5,
    },
    enableAutoFallback: true,
    enablePeriodicChecks: true,
  };

  private healthCheckTimer?: NodeJS.Timeout;
  private lastHealthCheck?: RedisHealthCheckResult;
  private healthHistory: RedisHealthCheckResult[] = [];
  private readonly maxHistorySize = 100;

  private constructor() {
    if (this.config.enablePeriodicChecks) {
      this.startPeriodicHealthChecks();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisHealthMonitor {
    if (!RedisHealthMonitor.instance) {
      RedisHealthMonitor.instance = new RedisHealthMonitor();
    }
    return RedisHealthMonitor.instance;
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<RedisHealthCheckResult> {
    const startTime = Date.now();
    let connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'unknown' = 'unknown';
    let latency = 0;

    try {
      // Import here to avoid circular dependency
      const { isRedisAvailable } = await import('./redis');
      
      const isAvailable = await isRedisAvailable();
      latency = Date.now() - startTime;
      connectionStatus = isAvailable ? 'connected' : 'disconnected';
    } catch (error) {
      latency = Date.now() - startTime;
      connectionStatus = 'disconnected';
      
      redisErrorLogger.logError(error instanceof Error ? error : String(error), {
        operation: RedisOperationType.PING,
        command: 'health_check',
        duration: latency,
      }, RedisErrorSeverity.MEDIUM);
    }

    // Get operation metrics
    const metrics = redisErrorLogger.getMetrics();
    const fallbackStatus = redisFallbackService.getFallbackStatus();

    // Determine health status
    const status = this.determineHealthStatus(latency, metrics, connectionStatus);

    // Generate recommendations
    const recommendations = this.generateRecommendations(status, latency, metrics, connectionStatus);

    const healthResult: RedisHealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      latency,
      connectionStatus,
      operationMetrics: {
        successRate: metrics.totalOperations > 0 ? metrics.successfulOperations / metrics.totalOperations : 1,
        errorRate: metrics.errorRate,
        averageLatency: metrics.averageLatency,
        consecutiveFailures: metrics.consecutiveFailures,
        totalOperations: metrics.totalOperations,
      },
      fallbackStatus: {
        isActive: fallbackStatus.isActive,
        reason: fallbackStatus.reason,
        activatedAt: fallbackStatus.activatedAt,
      },
      recommendations,
    };

    // Store health check result
    this.lastHealthCheck = healthResult;
    this.addToHistory(healthResult);

    // Trigger automatic actions based on health status
    if (this.config.enableAutoFallback) {
      this.handleAutoFallback(healthResult);
    }

    return healthResult;
  }

  /**
   * Determine health status based on metrics
   */
  private determineHealthStatus(
    latency: number,
    metrics: typeof redisErrorLogger.getMetrics extends () => infer R ? R : never,
    connectionStatus: string
  ): RedisHealthStatus {
    // Critical if disconnected
    if (connectionStatus === 'disconnected') {
      return RedisHealthStatus.CRITICAL;
    }

    const successRate = metrics.totalOperations > 0 ? metrics.successfulOperations / metrics.totalOperations : 1;

    // Critical thresholds
    if (metrics.consecutiveFailures > this.config.degradedThresholds.maxConsecutiveFailures * 2 ||
        successRate < 0.5) {
      return RedisHealthStatus.CRITICAL;
    }

    // Unhealthy thresholds
    if (latency > this.config.degradedThresholds.maxLatency ||
        successRate < this.config.degradedThresholds.minSuccessRate ||
        metrics.consecutiveFailures > this.config.degradedThresholds.maxConsecutiveFailures) {
      return RedisHealthStatus.UNHEALTHY;
    }

    // Degraded thresholds
    if (latency > this.config.healthyThresholds.maxLatency ||
        successRate < this.config.healthyThresholds.minSuccessRate ||
        metrics.consecutiveFailures > this.config.healthyThresholds.maxConsecutiveFailures) {
      return RedisHealthStatus.DEGRADED;
    }

    return RedisHealthStatus.HEALTHY;
  }

  /**
   * Generate recommendations based on health status
   */
  private generateRecommendations(
    status: RedisHealthStatus,
    latency: number,
    metrics: typeof redisErrorLogger.getMetrics extends () => infer R ? R : never,
    connectionStatus: string
  ): string[] {
    const recommendations: string[] = [];

    if (connectionStatus === 'disconnected') {
      recommendations.push('Check Redis server availability and network connectivity');
      recommendations.push('Verify Redis configuration and credentials');
    }

    if (latency > this.config.degradedThresholds.maxLatency) {
      recommendations.push('High latency detected - consider optimizing Redis queries or checking network');
    }

    if (metrics.consecutiveFailures > this.config.healthyThresholds.maxConsecutiveFailures) {
      recommendations.push('Multiple consecutive failures - investigate Redis server stability');
    }

    if (metrics.errorRate > 0.2) {
      recommendations.push('High error rate - review Redis error logs for patterns');
    }

    if (status === RedisHealthStatus.CRITICAL) {
      recommendations.push('CRITICAL: Immediate attention required - fallback mode recommended');
    } else if (status === RedisHealthStatus.UNHEALTHY) {
      recommendations.push('Consider enabling fallback mode to ensure service availability');
    }

    if (recommendations.length === 0) {
      recommendations.push('Redis is operating normally');
    }

    return recommendations;
  }

  /**
   * Handle automatic fallback based on health status
   */
  private handleAutoFallback(healthResult: RedisHealthCheckResult): void {
    const { status, operationMetrics } = healthResult;

    // Activate fallback for critical or unhealthy status
    if ((status === RedisHealthStatus.CRITICAL || status === RedisHealthStatus.UNHEALTHY) &&
        !redisFallbackService.getFallbackStatus().isActive) {
      
      const reason = `Health check failed: ${status} (success rate: ${(operationMetrics.successRate * 100).toFixed(1)}%, latency: ${healthResult.latency}ms)`;
      redisFallbackService.activateFallback(reason);
    }
  }

  /**
   * Add health check result to history
   */
  private addToHistory(result: RedisHealthCheckResult): void {
    this.healthHistory.push(result);
    
    // Maintain maximum history size
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop periodic health checks
   */
  public stopPeriodicHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Get last health check result
   */
  public getLastHealthCheck(): RedisHealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Get health history
   */
  public getHealthHistory(limit?: number): RedisHealthCheckResult[] {
    if (limit) {
      return this.healthHistory.slice(-limit);
    }
    return [...this.healthHistory];
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enablePeriodicChecks && !this.healthCheckTimer) {
      this.startPeriodicHealthChecks();
    } else if (!this.config.enablePeriodicChecks && this.healthCheckTimer) {
      this.stopPeriodicHealthChecks();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): HealthMonitorConfig {
    return { ...this.config };
  }

  /**
   * Reset health monitor state
   */
  public reset(): void {
    this.healthHistory = [];
    this.lastHealthCheck = undefined;
  }
}

// Export singleton instance
export const redisHealthMonitor = RedisHealthMonitor.getInstance();
