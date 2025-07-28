/**
 * Redis Client Configuration
 * 
 * Centralized Redis client setup with connection pooling, error handling,
 * and environment-based configuration for the finance-factors dashboard.
 */

import { createClient, RedisClientType, RedisDefaultModules, RedisFunctions, RedisModules, RedisScripts } from 'redis';

// Redis client type definition
export type RedisClient = RedisClientType<RedisDefaultModules & RedisModules, RedisFunctions, RedisScripts>;

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

// Global Redis client instance
let redisClient: RedisClient | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClient> | null = null;

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
      commandTimeout: config.commandTimeout,
      keepAlive: config.keepAlive,
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
    info.split('\r\n').forEach(line => {
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
 * Execute Redis command with error handling and retry logic
 */
export async function executeRedisCommand<T>(
  command: (client: RedisClient) => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    const client = await getRedisClient();
    return await command(client);
  } catch (error) {
    console.error('Redis command execution failed:', error);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    return null;
  }
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', closeRedisConnection);
  process.on('SIGTERM', closeRedisConnection);
  process.on('exit', closeRedisConnection);
}
