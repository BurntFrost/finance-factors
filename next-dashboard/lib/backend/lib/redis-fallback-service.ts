/**
 * Redis Fallback Service
 * 
 * Centralized service for handling Redis failures and implementing
 * graceful fallback strategies to ensure uninterrupted data delivery.
 */

import { redisErrorLogger, RedisErrorType, RedisOperationType } from './redis-error-logger';
import { ProxyApiResponse } from '../api/types/proxy';
import { redisPredictiveAnalytics } from './redis-predictive-analytics';

// Fallback mode status
interface FallbackStatus {
  isActive: boolean;
  reason: string;
  activatedAt: string;
  errorType?: RedisErrorType;
  consecutiveFailures: number;
}

// Fallback service configuration
interface FallbackConfig {
  maxConsecutiveFailures: number;
  fallbackCooldownMs: number;
  healthCheckIntervalMs: number;
  enableAutoRecovery: boolean;
}

/**
 * Redis Fallback Service Class
 */
export class RedisFallbackService {
  private static instance: RedisFallbackService;
  private fallbackStatus: FallbackStatus = {
    isActive: false,
    reason: '',
    activatedAt: '',
    consecutiveFailures: 0,
  };
  
  private config: FallbackConfig = {
    maxConsecutiveFailures: 3,
    fallbackCooldownMs: 60000, // 1 minute
    healthCheckIntervalMs: 30000, // 30 seconds
    enableAutoRecovery: true,
  };

  private healthCheckTimer?: NodeJS.Timeout;

  private constructor() {
    if (this.config.enableAutoRecovery) {
      this.startHealthCheckTimer();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisFallbackService {
    if (!RedisFallbackService.instance) {
      RedisFallbackService.instance = new RedisFallbackService();
    }
    return RedisFallbackService.instance;
  }

  /**
   * Check if fallback mode should be activated based on Redis health
   */
  public shouldActivateFallback(): boolean {
    const metrics = redisErrorLogger.getMetrics();
    
    // Activate fallback if consecutive failures exceed threshold
    if (metrics.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.activateFallback(
        `Consecutive failures threshold exceeded (${metrics.consecutiveFailures})`,
        RedisErrorType.UNKNOWN_ERROR
      );
      return true;
    }

    // Activate fallback if error rate is too high
    if (metrics.errorRate > 0.8 && metrics.totalOperations > 10) {
      this.activateFallback(
        `High error rate detected (${(metrics.errorRate * 100).toFixed(1)}%)`,
        RedisErrorType.UNKNOWN_ERROR
      );
      return true;
    }

    return this.fallbackStatus.isActive;
  }

  /**
   * Activate fallback mode
   */
  public activateFallback(reason: string, errorType?: RedisErrorType): void {
    if (!this.fallbackStatus.isActive) {
      this.fallbackStatus = {
        isActive: true,
        reason,
        activatedAt: new Date().toISOString(),
        errorType,
        consecutiveFailures: this.fallbackStatus.consecutiveFailures + 1,
      };

      console.warn('🔄 Redis fallback mode activated:', {
        reason,
        errorType,
        activatedAt: this.fallbackStatus.activatedAt,
      });

      // Log the fallback activation
      redisErrorLogger.logError(`Fallback mode activated: ${reason}`, {
        operation: RedisOperationType.CONNECT,
        command: 'fallback_activation',
        metadata: { reason, errorType },
      });
    }
  }

  /**
   * Deactivate fallback mode
   */
  public deactivateFallback(): void {
    if (this.fallbackStatus.isActive) {
      const duration = Date.now() - new Date(this.fallbackStatus.activatedAt).getTime();
      
      console.info('✅ Redis fallback mode deactivated after', {
        duration: `${Math.round(duration / 1000)}s`,
        reason: this.fallbackStatus.reason,
      });

      this.fallbackStatus = {
        isActive: false,
        reason: '',
        activatedAt: '',
        consecutiveFailures: 0,
      };

      // Log the fallback deactivation
      redisErrorLogger.logSuccess({
        operation: RedisOperationType.CONNECT,
        command: 'fallback_deactivation',
        duration,
      });
    }
  }

  /**
   * Get current fallback status
   */
  public getFallbackStatus(): FallbackStatus {
    return { ...this.fallbackStatus };
  }

  /**
   * Execute operation with automatic fallback
   */
  public async executeWithFallback<T>(
    redisOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // If fallback is already active, skip Redis and use fallback
    if (this.shouldActivateFallback()) {
      console.debug(`Using fallback for ${operationName} (fallback mode active)`);
      return await this.executeFallbackWithMetadata(fallbackOperation, operationName);
    }

    try {
      // Try Redis operation first
      const result = await redisOperation();
      
      // If successful and fallback was active, consider deactivating it
      if (this.fallbackStatus.isActive && this.config.enableAutoRecovery) {
        this.checkForRecovery();
      }
      
      return result;
    } catch (error) {
      console.warn(`Redis operation failed for ${operationName}, falling back:`, error);
      
      // Activate fallback mode
      this.activateFallback(
        `Redis operation failed: ${error instanceof Error ? error.message : String(error)}`,
        RedisErrorType.UNKNOWN_ERROR
      );

      // Execute fallback operation
      return await this.executeFallbackWithMetadata(fallbackOperation, operationName);
    }
  }

  /**
   * Execute fallback operation with metadata
   */
  private async executeFallbackWithMetadata<T>(
    fallbackOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await fallbackOperation();
      
      // Add fallback metadata if result is a ProxyApiResponse
      if (result && typeof result === 'object' && 'metadata' in result &&
          'data' in result && 'success' in result && 'timestamp' in result && 'source' in result) {
        const response = result as ProxyApiResponse<unknown>;
        response.metadata = {
          ...response.metadata,
          isFallback: true,
          reason: 'Redis unavailable - using direct API',
        };
      }
      
      console.debug(`Fallback operation successful for ${operationName}`, {
        duration: Date.now() - startTime,
      });
      
      return result;
    } catch (fallbackError) {
      console.error(`Fallback operation also failed for ${operationName}:`, fallbackError);
      throw fallbackError;
    }
  }

  /**
   * Check if Redis has recovered and fallback can be deactivated
   */
  private async checkForRecovery(): Promise<void> {
    // Only check for recovery if fallback has been active for the cooldown period
    const fallbackDuration = Date.now() - new Date(this.fallbackStatus.activatedAt).getTime();
    if (fallbackDuration < this.config.fallbackCooldownMs) {
      return;
    }

    try {
      // Import here to avoid circular dependency
      const { isRedisAvailable } = await import('./redis');
      
      if (await isRedisAvailable()) {
        const metrics = redisErrorLogger.getMetrics();
        
        // Deactivate fallback if Redis is available and error rate is acceptable
        if (metrics.consecutiveFailures === 0 && metrics.errorRate < 0.2) {
          this.deactivateFallback();
        }
      }
    } catch (error) {
      console.debug('Recovery check failed:', error);
    }
  }

  /**
   * Start periodic health check timer
   */
  private startHealthCheckTimer(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      if (this.fallbackStatus.isActive) {
        this.checkForRecovery();
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop health check timer
   */
  public stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableAutoRecovery && !this.healthCheckTimer) {
      this.startHealthCheckTimer();
    } else if (!this.config.enableAutoRecovery && this.healthCheckTimer) {
      this.stopHealthCheck();
    }
  }

  /**
   * Reset fallback service state
   */
  public reset(): void {
    this.deactivateFallback();
    redisErrorLogger.reset();
  }

  /**
   * Check predictive analytics and proactively prepare fallback
   */
  public checkPredictiveFailure(): boolean {
    const analytics = redisPredictiveAnalytics.analyzePredictiveMetrics();
    const pattern = redisPredictiveAnalytics.detectPerformancePattern();

    // Proactively prepare fallback for high-risk scenarios
    if (analytics.predictedFailureRisk === 'critical' || 
        (analytics.predictedFailureRisk === 'high' && pattern.recommendedAction === 'activate_fallback')) {
      
      this.activateFallback(
        `Predictive analytics detected imminent failure (risk: ${analytics.predictedFailureRisk})`,
        RedisErrorType.PREDICTIVE_FAILURE
      );
      
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const redisFallbackService = RedisFallbackService.getInstance();
