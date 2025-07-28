/**
 * Prisma Client Configuration
 * 
 * Optimized for serverless environments with connection pooling,
 * performance monitoring, and proper error handling.
 */

import { PrismaClient } from '../../../app/generated/prisma';
import { isPrismaEnabled } from './feature-toggles';

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined | null;
}

// Prisma client configuration for optimal performance
const prismaClientConfig = {
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error'] as any
    : ['error'] as any,

  // Connection pooling configuration with strict limits
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },

  // Error formatting for better debugging
  errorFormat: 'pretty' as const,
};

/**
 * Create Prisma client with performance optimizations
 */
function createPrismaClient() {
  const client = new PrismaClient(prismaClientConfig);

  // Add connection monitoring middleware
  client.$use(async (params, next) => {
    const start = Date.now();

    try {
      const result = await next(params);
      const duration = Date.now() - start;

      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Query ${params.model}.${params.action} took ${duration}ms`);

        // Log slow queries (>1000ms)
        if (duration > 1000) {
          console.warn(`Slow query detected: ${params.model}.${params.action} (${duration}ms)`);
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Query ${params.model}.${params.action} failed after ${duration}ms:`, error);
      throw error;
    }
  });

  // Add error logging middleware with connection error handling
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for connection limit errors
      if (errorMessage.includes('too many connections') ||
          errorMessage.includes('connection limit') ||
          errorMessage.includes('FATAL: too many connections')) {
        console.error('Database connection limit reached:', {
          model: params.model,
          action: params.action,
          error: errorMessage,
        });

        // For connection limit errors, throw a specific error type
        const connectionError = new Error('Database connection limit exceeded');
        (connectionError as any).code = 'CONNECTION_LIMIT_EXCEEDED';
        throw connectionError;
      }

      console.error('Prisma query error:', {
        model: params.model,
        action: params.action,
        error: errorMessage,
      });
      throw error;
    }
  });

  return client;
}

/**
 * Get Prisma client instance with proper singleton pattern for serverless
 * FEATURE TOGGLE: When Prisma is disabled, this will be null
 */
export const prisma = isPrismaEnabled() ? (globalThis.__prisma ?? createPrismaClient()) : null;

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production' && isPrismaEnabled()) {
  globalThis.__prisma = prisma;
}

/**
 * Graceful shutdown handler with connection cleanup
 */
export async function disconnectPrisma() {
  try {
    if (!prisma) {
      console.log('Prisma client is not initialized, skipping disconnect');
      return;
    }
    console.log('Disconnecting Prisma client...');
    await prisma.$disconnect();
    console.log('Prisma client disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting Prisma client:', error);
  }
}

/**
 * Force disconnect and cleanup connections
 */
export async function forceDisconnectPrisma() {
  try {
    if (!prisma) {
      console.log('Prisma client is not initialized, skipping force disconnect');
      return;
    }
    // Force disconnect without waiting for active queries
    await Promise.race([
      prisma.$disconnect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
      )
    ]);
  } catch (error) {
    console.warn('Force disconnect completed with warnings:', error);
  }
}

/**
 * Health check for database connection with connection limit awareness
 * FEATURE TOGGLE: When Prisma is disabled, returns disabled status
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'connection_limit' | 'disabled';
  latency?: number;
  error?: string;
}> {
  // FEATURE TOGGLE: Return disabled status when Prisma is disabled
  if (!isPrismaEnabled()) {
    console.debug('Prisma disabled - skipping database health check');
    return {
      status: 'disabled',
      error: 'Prisma functionality is disabled via feature toggle',
    };
  }

  // Check if prisma client is available
  if (!prisma) {
    return {
      status: 'unhealthy',
      error: 'Prisma client is not initialized',
    };
  }

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for connection limit errors
    if (errorMessage.includes('too many connections') ||
        errorMessage.includes('connection limit') ||
        errorMessage.includes('FATAL: too many connections')) {
      return {
        status: 'connection_limit',
        error: errorMessage,
      };
    }

    return {
      status: 'unhealthy',
      error: errorMessage,
    };
  }
}

/**
 * Safe database operation with connection limit handling
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T | null>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('too many connections') ||
        errorMessage.includes('connection limit') ||
        errorMessage.includes('CONNECTION_LIMIT_EXCEEDED')) {
      console.warn('Database connection limit reached, using fallback');
      return fallback ? await fallback() : null;
    }

    throw error;
  }
}

/**
 * Database transaction helper with retry logic
 */
export async function withTransaction<T>(
  fn: (tx: any) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  if (!prisma) {
    throw new Error('Prisma client is not initialized');
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      }) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes('Unique constraint')) {
        throw lastError;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Batch operations helper for better performance
 */
export class PrismaBatch {
  private operations: Array<() => Promise<any>> = [];
  
  add<T>(operation: () => Promise<T>): this {
    this.operations.push(operation);
    return this;
  }
  
  async execute(): Promise<any[]> {
    return Promise.all(this.operations.map(op => op()));
  }
  
  clear(): this {
    this.operations = [];
    return this;
  }
}

/**
 * Query optimization helpers
 */
export const queryHelpers = {
  /**
   * Get user with all related data efficiently
   */
  getUserWithRelations: (userId: string) => {
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        dashboards: {
          include: {
            elements: true,
            shares: true,
          },
        },
        apiKeys: {
          where: { isActive: true },
        },
      },
    });
  },

  /**
   * Get dashboard with optimized element loading
   */
  getDashboardWithElements: (dashboardId: string) => {
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }
    return prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: {
        elements: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get cached data with automatic cleanup
   */
  getCachedData: async (cacheKey: string) => {
    if (!prisma) {
      throw new Error('Prisma client is not initialized');
    }
    // Clean up expired entries
    await prisma.cachedData.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Get and update access count
    return prisma.cachedData.update({
      where: { cacheKey },
      data: {
        lastAccessed: new Date(),
        accessCount: {
          increment: 1,
        },
      },
    });
  },
};

// Export types for use in other files
export type { User, Dashboard, DashboardElement, UserPreferences } from '../../../app/generated/prisma';
