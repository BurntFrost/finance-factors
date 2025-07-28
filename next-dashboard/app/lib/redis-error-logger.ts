/**
 * Redis Error Logging System
 * 
 * Comprehensive logging utility for Redis operations that captures error types,
 * timestamps, operation context, and provides structured logging for debugging.
 */

// Redis error types for classification
export enum RedisErrorType {
  CONNECTION_FAILED = 'connection_failed',
  CONNECTION_TIMEOUT = 'connection_timeout',
  COMMAND_TIMEOUT = 'command_timeout',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_ERROR = 'permission_error',
  DATA_CORRUPTION = 'data_corruption',
  MEMORY_ERROR = 'memory_error',
  CLUSTER_ERROR = 'cluster_error',
  UNKNOWN_ERROR = 'unknown_error',
}

// Redis operation types
export enum RedisOperationType {
  GET = 'get',
  SET = 'set',
  DEL = 'del',
  EXISTS = 'exists',
  EXPIRE = 'expire',
  PING = 'ping',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HGET = 'hget',
  HSET = 'hset',
  HGETALL = 'hgetall',
  SETEX = 'setex',
}

// Severity levels for Redis errors
export enum RedisErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Redis error context interface
export interface RedisErrorContext {
  operation: RedisOperationType;
  key?: string;
  command?: string;
  duration?: number;
  retryAttempt?: number;
  maxRetries?: number;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

// Redis error log entry interface
export interface RedisErrorLogEntry {
  id: string;
  timestamp: string;
  errorType: RedisErrorType;
  severity: RedisErrorSeverity;
  message: string;
  originalError?: Error;
  context: RedisErrorContext;
  stackTrace?: string;
  environment: {
    nodeEnv: string;
    redisUrl?: string;
    userAgent?: string;
  };
}

// Redis operation metrics
export interface RedisOperationMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageLatency: number;
  errorRate: number;
  lastErrorTime?: string;
  consecutiveFailures: number;
}

/**
 * Redis Error Logger Class
 */
export class RedisErrorLogger {
  private static instance: RedisErrorLogger;
  private errorHistory: RedisErrorLogEntry[] = [];
  private metrics: RedisOperationMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageLatency: 0,
    errorRate: 0,
    consecutiveFailures: 0,
  };
  private readonly maxHistorySize = 1000;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisErrorLogger {
    if (!RedisErrorLogger.instance) {
      RedisErrorLogger.instance = new RedisErrorLogger();
    }
    return RedisErrorLogger.instance;
  }

  /**
   * Log a Redis error with full context
   */
  public logError(
    error: Error | string,
    context: RedisErrorContext,
    severity: RedisErrorSeverity = RedisErrorSeverity.MEDIUM
  ): void {
    const errorType = this.classifyError(error);
    const logEntry: RedisErrorLogEntry = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      errorType,
      severity,
      message: typeof error === 'string' ? error : error.message,
      originalError: typeof error === 'string' ? undefined : error,
      context,
      stackTrace: typeof error === 'string' ? undefined : error.stack,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        redisUrl: this.sanitizeRedisUrl(process.env.REDIS_URL),
        userAgent: process.env.USER_AGENT,
      },
    };

    // Add to error history
    this.addToHistory(logEntry);

    // Update metrics
    this.updateMetrics(false, context.duration);

    // Log to console with appropriate level
    this.logToConsole(logEntry);

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry);
    }
  }

  /**
   * Log a successful Redis operation
   */
  public logSuccess(context: RedisErrorContext): void {
    this.updateMetrics(true, context.duration);
    
    // Reset consecutive failures on success
    this.metrics.consecutiveFailures = 0;

    // Log debug info in development
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.debug(`Redis ${context.operation} operation successful`, {
        key: context.key,
        duration: context.duration,
      });
    }
  }

  /**
   * Classify error type based on error message and properties
   */
  private classifyError(error: Error | string): RedisErrorType {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorName = typeof error === 'string' ? '' : error.name;

    // Connection-related errors
    if (errorMessage.includes('ECONNREFUSED') || 
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('connection refused')) {
      return RedisErrorType.CONNECTION_FAILED;
    }

    if (errorMessage.includes('timeout') || 
        errorMessage.includes('ETIMEDOUT') ||
        errorName === 'TimeoutError') {
      return RedisErrorType.CONNECTION_TIMEOUT;
    }

    if (errorMessage.includes('command timeout') ||
        errorMessage.includes('operation timeout')) {
      return RedisErrorType.COMMAND_TIMEOUT;
    }

    // Network errors
    if (errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('EPIPE') ||
        errorMessage.includes('network')) {
      return RedisErrorType.NETWORK_ERROR;
    }

    // Authentication errors
    if (errorMessage.includes('NOAUTH') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('invalid password')) {
      return RedisErrorType.AUTHENTICATION_ERROR;
    }

    // Permission errors
    if (errorMessage.includes('NOPERM') ||
        errorMessage.includes('permission denied')) {
      return RedisErrorType.PERMISSION_ERROR;
    }

    // Memory errors
    if (errorMessage.includes('OOM') ||
        errorMessage.includes('out of memory') ||
        errorMessage.includes('maxmemory')) {
      return RedisErrorType.MEMORY_ERROR;
    }

    // Data corruption
    if (errorMessage.includes('WRONGTYPE') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('corrupt')) {
      return RedisErrorType.DATA_CORRUPTION;
    }

    // Cluster errors
    if (errorMessage.includes('CLUSTERDOWN') ||
        errorMessage.includes('cluster')) {
      return RedisErrorType.CLUSTER_ERROR;
    }

    return RedisErrorType.UNKNOWN_ERROR;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `redis_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add error to history with size management
   */
  private addToHistory(logEntry: RedisErrorLogEntry): void {
    this.errorHistory.push(logEntry);
    
    // Maintain maximum history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Update operation metrics
   */
  private updateMetrics(success: boolean, duration?: number): void {
    this.metrics.totalOperations++;
    
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
      this.metrics.consecutiveFailures++;
      this.metrics.lastErrorTime = new Date().toISOString();
    }

    // Update error rate
    this.metrics.errorRate = this.metrics.failedOperations / this.metrics.totalOperations;

    // Update average latency if duration provided
    if (duration !== undefined) {
      const totalLatency = this.metrics.averageLatency * (this.metrics.totalOperations - 1) + duration;
      this.metrics.averageLatency = totalLatency / this.metrics.totalOperations;
    }
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(logEntry: RedisErrorLogEntry): void {
    const logData = {
      id: logEntry.id,
      type: logEntry.errorType,
      severity: logEntry.severity,
      operation: logEntry.context.operation,
      key: logEntry.context.key,
      message: logEntry.message,
      duration: logEntry.context.duration,
      retryAttempt: logEntry.context.retryAttempt,
    };

    switch (logEntry.severity) {
      case RedisErrorSeverity.CRITICAL:
        console.error('🔴 CRITICAL Redis Error:', logData);
        break;
      case RedisErrorSeverity.HIGH:
        console.error('🟠 HIGH Redis Error:', logData);
        break;
      case RedisErrorSeverity.MEDIUM:
        console.warn('🟡 MEDIUM Redis Error:', logData);
        break;
      case RedisErrorSeverity.LOW:
        console.info('🔵 LOW Redis Error:', logData);
        break;
    }
  }

  /**
   * Send to external logging service (placeholder)
   */
  private sendToExternalLogger(logEntry: RedisErrorLogEntry): void {
    // In a real implementation, you would send to services like:
    // - Sentry
    // - DataDog
    // - CloudWatch
    // - Custom logging endpoint

    // For now, just log that we would send it
    if (process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      console.debug('Would send to external logger:', {
        id: logEntry.id,
        type: logEntry.errorType,
        severity: logEntry.severity,
      });
    }
  }

  /**
   * Sanitize Redis URL for logging (remove credentials)
   */
  private sanitizeRedisUrl(url?: string): string | undefined {
    if (!url) return undefined;

    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;
    } catch {
      return 'invalid_url';
    }
  }

  /**
   * Get error history
   */
  public getErrorHistory(limit?: number): RedisErrorLogEntry[] {
    if (limit) {
      return this.errorHistory.slice(-limit);
    }
    return [...this.errorHistory];
  }

  /**
   * Get operation metrics
   */
  public getMetrics(): RedisOperationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent errors by type
   */
  public getRecentErrorsByType(
    errorType: RedisErrorType,
    timeWindowMs: number = 300000 // 5 minutes
  ): RedisErrorLogEntry[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();

    return this.errorHistory.filter(
      entry => entry.errorType === errorType && entry.timestamp >= cutoffTime
    );
  }

  /**
   * Check if Redis is experiencing high error rate
   */
  public isHighErrorRate(threshold: number = 0.5): boolean {
    return this.metrics.errorRate > threshold && this.metrics.totalOperations > 10;
  }

  /**
   * Check if Redis has consecutive failures
   */
  public hasConsecutiveFailures(threshold: number = 5): boolean {
    return this.metrics.consecutiveFailures >= threshold;
  }

  /**
   * Clear error history and reset metrics
   */
  public reset(): void {
    this.errorHistory = [];
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageLatency: 0,
      errorRate: 0,
      consecutiveFailures: 0,
    };
  }
}

// Export singleton instance
export const redisErrorLogger = RedisErrorLogger.getInstance();
