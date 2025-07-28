/**
 * Redis Client Configuration
 * 
 * Centralized Redis client setup with connection pooling, error handling,
 * and environment-based configuration for the finance-factors dashboard.
 */

import { createClient } from 'redis';

// Redis client type definition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Redis queue configuration
const REDIS_QUEUE_CONFIG = {
  commandsQueueMaxLength: 1000, // Increased from 3 to handle concurrent operations
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
        if (retries > config.maxRetriesPerRequest!) {
          console.error(`Redis connection failed after ${retries} retries`);
          return new Error('Redis connection failed');
        }

        // Exponential backoff with jitter
        const delay = Math.min(config.retryDelayOnFailover! * Math.pow(2, retries), 3000);
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
      },
    },
    commandsQueueMaxLength: REDIS_QUEUE_CONFIG.commandsQueueMaxLength,
  });

  // Error handling
  client.on('error', (error) => {
    console.error('Redis Client Error:', error);
  });

  client.on('connect', () => {
    console.log('Redis Client Connected');
  });

  client.on('ready', () => {
    console.log('Redis Client Ready');
  });

  client.on('end', () => {
    console.log('Redis Client Connection Ended');
  });

  client.on('reconnecting', () => {
    console.log('Redis Client Reconnecting');
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
 * Check if Redis is available and connected
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('Redis availability check failed:', error);
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
 * Execute Redis command with error handling and retry logic
 */
export async function executeRedisCommand<T>(
  command: (client: RedisClient) => Promise<T>,
  fallback?: T
): Promise<T | null> {
  // Check circuit breaker
  if (!shouldAllowOperation()) {
    console.warn('Redis circuit breaker is open - using fallback');
    return fallback !== undefined ? fallback : null;
  }

  try {
    const client = await getRedisClient();
    const result = await command(client);
    handleOperationSuccess();
    return result;
  } catch (error) {
    console.error('Redis command execution failed:', error);
    handleOperationFailure(error);

    if (fallback !== undefined) {
      return fallback;
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
