/**
 * Prisma Client Configuration
 * 
 * Optimized for serverless environments with connection pooling,
 * performance monitoring, and proper error handling.
 */

import { PrismaClient } from '../generated/prisma';

// Global variable to store the Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma client configuration for optimal performance
const prismaClientConfig = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] as const
    : ['error'] as const,
  
  // Connection pooling configuration
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

  // Add query performance monitoring in development
  if (process.env.NODE_ENV === 'development') {
    client.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const end = Date.now();
      
      console.log(`Query ${params.model}.${params.action} took ${end - start}ms`);
      
      // Log slow queries (>1000ms)
      if (end - start > 1000) {
        console.warn(`Slow query detected: ${params.model}.${params.action} (${end - start}ms)`);
      }
      
      return result;
    });
  }

  // Add error logging middleware
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      console.error('Prisma query error:', {
        model: params.model,
        action: params.action,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  });

  return client;
}

/**
 * Get Prisma client instance with proper singleton pattern for serverless
 */
export const prisma = globalThis.__prisma ?? createPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Graceful shutdown handler
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Database transaction helper with retry logic
 */
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      });
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
  getUserWithRelations: (userId: string) =>
    prisma.user.findUnique({
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
    }),

  /**
   * Get dashboard with optimized element loading
   */
  getDashboardWithElements: (dashboardId: string) =>
    prisma.dashboard.findUnique({
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
    }),

  /**
   * Get cached data with automatic cleanup
   */
  getCachedData: async (cacheKey: string) => {
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
export type { User, Dashboard, DashboardElement, UserPreferences } from '../generated/prisma';
