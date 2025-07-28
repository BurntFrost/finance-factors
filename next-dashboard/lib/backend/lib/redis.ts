/**
 * Redis Client Configuration
 * 
 * Centralized Redis client setup with connection pooling, error handling,
 * and environment-based configuration for the finance-factors dashboard.
 */

import { createClient } from 'redis';
import {
  redisErrorLogger,
  RedisErrorType,
  RedisErrorSeverity,
  RedisOperationType
} from './redis-error-logger';
import { isRedisEnabled } from './feature-toggles';

// Redis client type definition
export type RedisClient = any;

// Redis configuration interface
interface RedisConfig {
  url: string;
  retryDelayOnFailover: number;
  retryDelayOnClusterDown: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  connectTimeout: number;
  commandTimeout: number;
}

// Default Redis configuration
const DEFAULT_CONFIG: Partial<RedisConfig> = {
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 300,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000, // 30 seconds
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 5000, // 5 seconds
};

// Redis queue configuration with improved error handling
const REDIS_QUEUE_CONFIG = {
  commandsQueueMaxLength: 500, // Reduced to prevent memory issues
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false, // Prevent queuing when disconnected
};

// Global Redis client instance
let redisClient: RedisClient | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClient> | null = null;

// Circuit breaker for Redis operations
let circuitBreakerOpen = false;
let circuitBreakerOpenTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
let consecutiveFailures = 0;

// Fallback strategy mapping for different error types
const _FALLBACK_STRATEGIES = {
  [RedisErrorType.CONNECTION_FAILED]: 'immediate_fallback',
  [RedisErrorType.CONNECTION_TIMEOUT]: 'retry_then_fallback',
  [RedisErrorType.COMMAND_TIMEOUT]: 'retry_then_fallback',
  [RedisErrorType.NETWORK_ERROR]: 'retry_then_fallback',
  [RedisErrorType.AUTHENTICATION_ERROR]: 'immediate_fallback',
  [RedisErrorType.PERMISSION_ERROR]: 'immediate_fallback',
  [RedisErrorType.DATA_CORRUPTION]: 'clear_and_fallback',
  [RedisErrorType.MEMORY_ERROR]: 'immediate_fallback',
  [RedisErrorType.CLUSTER_ERROR]: 'retry_then_fallback',
  [RedisErrorType.UNKNOWN_ERROR]: 'retry_then_fallback',
} as const;

type FallbackStrategy = typeof _FALLBACK_STRATEGIES[keyof typeof _FALLBACK_STRATEGIES];

/**
 * Get Redis configuration from environment variables
 */
function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  return {
    url: redisUrl,
    ...DEFAULT_CONFIG,
  } as RedisConfig;
}

/**
 * Create and configure Redis client
 */
function createRedisClient(): RedisClient {
  const config = getRedisConfig();
  
  const client = createClient({
    url: config.url,
    socket: {
      connectTimeout: config.connectTimeout,
      keepAlive: config.keepAlive ? true : false,
      reconnectStrategy: (retries) => {
        if (retries > REDIS_QUEUE_CONFIG.maxRetriesPerRequest) {
          console.error(`Redis connection failed after ${retries} retries`);
          return new Error('Redis connection failed');
        }

        // Exponential backoff with jitter
        const delay = Math.min(REDIS_QUEUE_CONFIG.retryDelayOnFailover * Math.pow(2, retries), 5000);
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
      },
    },
    commandsQueueMaxLength: REDIS_QUEUE_CONFIG.commandsQueueMaxLength,
  });

  // Enhanced error handling with logging
  client.on('error', (error) => {
    redisErrorLogger.logError(error, {
      operation: RedisOperationType.CONNECT,
      command: 'client_error_event',
    }, RedisErrorSeverity.HIGH);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
    redisErrorLogger.logSuccess({
      operation: RedisOperationType.CONNECT,
      command: 'client_connect_event',
    });
  });

  client.on('ready', () => {
    console.log('Redis Client Ready');
    redisErrorLogger.logSuccess({
      operation: RedisOperationType.CONNECT,
      command: 'client_ready_event',
    });
  });

  client.on('end', () => {
    console.log('Redis Client Connection Ended');
    redisErrorLogger.logError('Redis connection ended', {
      operation: RedisOperationType.DISCONNECT,
      command: 'client_end_event',
    }, RedisErrorSeverity.MEDIUM);
  });

  client.on('reconnecting', () => {
    console.log('Redis Client Reconnecting');
    redisErrorLogger.logError('Redis client reconnecting', {
      operation: RedisOperationType.CONNECT,
      command: 'client_reconnecting_event',
    }, RedisErrorSeverity.LOW);
  });

  return client;
}

/**
 * Get or create Redis client instance (singleton pattern)
 */
export async function getRedisClient(): Promise<RedisClient> {
  // Return existing client if available and connected
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Return existing connection promise if already connecting
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  isConnecting = true;
  connectionPromise = (async () => {
    try {
      if (redisClient && !redisClient.isOpen) {
        await redisClient.quit().catch(() => {}); // Ignore errors when closing
      }

      redisClient = createRedisClient();
      await redisClient.connect();
      
      console.log('Redis client connected successfully');
      return redisClient;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
      throw error;
    } finally {
      isConnecting = false;
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Determine error severity based on error type and context
 */
function determineSeverity(error: unknown): RedisErrorSeverity {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Critical errors that require immediate attention
  if (errorMessage.includes('NOAUTH') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('NOPERM') ||
      errorMessage.includes('permission denied')) {
    return RedisErrorSeverity.CRITICAL;
  }

  // High severity errors
  if (errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('connection refused') ||
      errorMessage.includes('OOM') ||
      errorMessage.includes('out of memory')) {
    return RedisErrorSeverity.HIGH;
  }

  // Medium severity errors (default)
  if (errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('EPIPE')) {
    return RedisErrorSeverity.MEDIUM;
  }

  // Low severity for minor issues
  return RedisErrorSeverity.LOW;
}

/**
 * Determine fallback strategy based on error type
 */
function determineFallbackStrategy(error: unknown): FallbackStrategy {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Immediate fallback for authentication/permission errors
  if (errorMessage.includes('NOAUTH') ||
      errorMessage.includes('NOPERM') ||
      errorMessage.includes('authentication') ||
      errorMessage.includes('permission denied')) {
    return 'immediate_fallback';
  }

  // Immediate fallback for connection failures
  if (errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('connection refused')) {
    return 'immediate_fallback';
  }

  // Clear and fallback for data corruption
  if (errorMessage.includes('WRONGTYPE') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('corrupt')) {
    return 'clear_and_fallback';
  }

  // Retry then fallback for temporary issues
  return 'retry_then_fallback';
}

/**
 * Check if Redis is available and connected with enhanced logging
 * FEATURE TOGGLE: When Redis is disabled, this function returns false
 */
export async function isRedisAvailable(): Promise<boolean> {
  // FEATURE TOGGLE: Return false immediately when Redis is disabled
  if (!isRedisEnabled()) {
    console.debug('Redis disabled via feature toggle - returning false for availability check');
    return false;
  }

  const startTime = Date.now();

  try {
    const client = await getRedisClient();
    await client.ping();

    redisErrorLogger.logSuccess({
      operation: RedisOperationType.PING,
      command: 'availability_check',
      duration: Date.now() - startTime,
    });

    return true;
  } catch (error) {
    redisErrorLogger.logError(error instanceof Error ? error : String(error), {
      operation: RedisOperationType.PING,
      command: 'availability_check',
      duration: Date.now() - startTime,
    }, RedisErrorSeverity.MEDIUM);

    return false;
  }
}

/**
 * Get Redis connection info and stats
 */
export async function getRedisInfo(): Promise<{
  connected: boolean;
  info?: Record<string, string>;
  error?: string;
}> {
  try {
    const client = await getRedisClient();
    const info = await client.info();
    
    // Parse Redis INFO response
    const infoObj: Record<string, string> = {};
    info.split('\r\n').forEach((line: string) => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        infoObj[key] = value;
      }
    });

    return {
      connected: true,
      info: infoObj,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    } finally {
      redisClient = null;
    }
  }
}

/**
 * Check if circuit breaker should allow operation
 */
function shouldAllowOperation(): boolean {
  if (!circuitBreakerOpen) {
    return true;
  }

  // Check if circuit breaker timeout has passed
  if (Date.now() - circuitBreakerOpenTime > CIRCUIT_BREAKER_TIMEOUT) {
    circuitBreakerOpen = false;
    consecutiveFailures = 0;
    console.log('Redis circuit breaker closed - attempting operations again');
    return true;
  }

  return false;
}

/**
 * Handle operation success
 */
function handleOperationSuccess(): void {
  if (consecutiveFailures > 0) {
    consecutiveFailures = 0;
    console.log('Redis operation succeeded - resetting failure count');
  }
}

/**
 * Handle operation failure
 */
function handleOperationFailure(error: unknown): void {
  consecutiveFailures++;

  // Check for queue full error specifically
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isQueueFullError = errorMessage.includes('queue is full') || errorMessage.includes('commandsQueueMaxLength');

  if (isQueueFullError) {
    console.warn(`Redis queue full error (attempt ${consecutiveFailures}):`, errorMessage);
  }

  if (consecutiveFailures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
    circuitBreakerOpen = true;
    circuitBreakerOpenTime = Date.now();
    console.error(`Redis circuit breaker opened after ${consecutiveFailures} consecutive failures`);
  }
}

/**
 * Execute Redis pipeline commands with improved error handling
 */
export async function executeRedisPipeline<T>(
  commands: Array<(pipeline: any) => void>,
  fallback: T[] = [] as T[]
): Promise<T[]> {
  try {
    const client = await getRedisClient();
    if (!client) {
      console.warn('Redis client unavailable for pipeline, using fallback');
      return fallback;
    }

    const pipeline = client.multi();
    commands.forEach(cmd => cmd(pipeline));

    const results = await pipeline.exec();

    if (!results) {
      console.warn('Redis pipeline returned null results');
      return fallback;
    }

    // Check for individual command failures
    const failedCommands = results.filter((result: [Error | null, any], _index: number) => result[0] !== null);
    if (failedCommands.length > 0) {
      console.warn(`Some Redis pipeline commands failed: [${failedCommands.map((_: [Error | null, any], i: number) => i).join(', ')}]`);
    }

    return results.map((result: [Error | null, any]) => result[1] as T);
  } catch (error) {
    console.error('Redis pipeline execution failed:', error);
    return fallback;
  }
}

/**
 * Execute Redis command with enhanced error handling, logging, and retry logic
 */
export async function executeRedisCommand<T>(
  command: (client: RedisClient) => Promise<T>,
  fallback?: T,
  operationType: RedisOperationType = RedisOperationType.GET,
  key?: string
): Promise<T | null> {
  const startTime = Date.now();

  // Check circuit breaker
  if (!shouldAllowOperation()) {
    const message = 'Redis circuit breaker is open - using fallback';
    redisErrorLogger.logError(message, {
      operation: operationType,
      key,
      command: 'circuit_breaker_open',
      duration: Date.now() - startTime,
    }, RedisErrorSeverity.MEDIUM);

    return fallback !== undefined ? fallback : null;
  }

  try {
    const client = await getRedisClient();
    const result = await command(client);

    // Log successful operation
    redisErrorLogger.logSuccess({
      operation: operationType,
      key,
      duration: Date.now() - startTime,
    });

    handleOperationSuccess();
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Enhanced error logging with context
    redisErrorLogger.logError(error instanceof Error ? error : String(error), {
      operation: operationType,
      key,
      command: 'redis_command',
      duration,
    }, determineSeverity(error));

    handleOperationFailure(error);

    // Determine fallback strategy based on error type
    const strategy = determineFallbackStrategy(error);

    if (strategy === 'immediate_fallback' || fallback !== undefined) {
      return fallback !== undefined ? fallback : null;
    }

    return null;
  }
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus(): {
  isOpen: boolean;
  consecutiveFailures: number;
  openTime?: number;
  timeUntilRetry?: number;
} {
  return {
    isOpen: circuitBreakerOpen,
    consecutiveFailures,
    openTime: circuitBreakerOpen ? circuitBreakerOpenTime : undefined,
    timeUntilRetry: circuitBreakerOpen
      ? Math.max(0, CIRCUIT_BREAKER_TIMEOUT - (Date.now() - circuitBreakerOpenTime))
      : undefined,
  };
}

/**
 * Manually reset circuit breaker (for admin/debugging purposes)
 */
export function resetCircuitBreaker(): void {
  circuitBreakerOpen = false;
  consecutiveFailures = 0;
  circuitBreakerOpenTime = 0;
  console.log('Redis circuit breaker manually reset');
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', closeRedisConnection);
  process.on('SIGTERM', closeRedisConnection);
  process.on('exit', closeRedisConnection);
}
