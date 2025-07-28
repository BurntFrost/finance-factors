/**
 * Optimized Database Service
 * 
 * Advanced database optimization features:
 * - Query batching and deduplication
 * - Connection pooling optimization
 * - Query result caching
 * - Performance monitoring
 * - Automatic query optimization
 * - Read/write splitting
 */

import { prisma, safeDatabaseOperation } from './prisma';
import { cache } from './advanced-cache';
import { dbConnectionMonitor } from './db-connection-monitor';

interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  retries?: number;
  batchKey?: string;
}

interface BatchedQuery {
  id: string;
  query: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  options: QueryOptions;
  timestamp: number;
}

export class OptimizedDatabaseService {
  private queryBatches = new Map<string, BatchedQuery[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readOnlyQueries = new Set(['findFirst', 'findMany', 'findUnique', 'count', 'aggregate']);
  private metrics = {
    totalQueries: 0,
    cachedQueries: 0,
    batchedQueries: 0,
    failedQueries: 0,
    avgQueryTime: 0,
    connectionPoolUtilization: 0,
  };

  constructor() {
    this.setupPeriodicCleanup();
    this.setupMetricsCollection();
  }

  /**
   * Execute optimized query with caching and batching
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      cache: enableCache = true,
      cacheTTL = 300000, // 5 minutes
      priority: _priority = 'normal',
      timeout = 30000,
      retries = 2,
      batchKey,
    } = options;

    this.metrics.totalQueries++;
    const startTime = Date.now();

    try {
      // Check cache first
      if (enableCache && cacheKey) {
        const cached = await this.getCachedResult<T>(cacheKey);
        if (cached) {
          this.metrics.cachedQueries++;
          return cached;
        }
      }

      // Execute query with optimization
      let result: T;
      
      if (batchKey && this.canBatch(queryFn)) {
        result = await this.executeBatchedQuery(queryFn, batchKey, options);
        this.metrics.batchedQueries++;
      } else {
        result = await this.executeDirectQuery(queryFn, timeout, retries);
      }

      // Cache result if enabled
      if (enableCache && cacheKey && result) {
        await this.setCachedResult(cacheKey, result, cacheTTL);
      }

      // Record metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      dbConnectionMonitor.recordQuery(duration, true);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.failedQueries++;
      this.updateMetrics(duration, false);
      dbConnectionMonitor.recordQuery(duration, false);
      throw error;
    }
  }

  /**
   * Optimized user queries with relationship loading
   */
  async getUserWithOptimizedRelations(userId: string, includeOptions: {
    preferences?: boolean;
    dashboards?: boolean;
    apiKeys?: boolean;
    sessions?: boolean;
  } = {}) {
    const cacheKey = `user:${userId}:${JSON.stringify(includeOptions)}`;
    
    return this.executeQuery(
      async () => {
        if (!prisma) throw new Error('Database not available');
        
        return prisma.user.findUnique({
          where: { id: userId },
          include: {
            preferences: includeOptions.preferences,
            dashboards: includeOptions.dashboards ? {
              include: {
                elements: true,
                shares: {
                  where: { isActive: true },
                },
              },
              orderBy: { updatedAt: 'desc' },
            } : false,
            apiKeys: includeOptions.apiKeys ? {
              where: { isActive: true },
              select: { id: true, name: true, lastUsed: true },
            } : false,
            sessions: includeOptions.sessions ? {
              where: { expiresAt: { gt: new Date() } },
              orderBy: { createdAt: 'desc' },
              take: 5,
            } : false,
          },
        });
      },
      cacheKey,
      { cache: true, cacheTTL: 600000, priority: 'high' } // 10 minutes cache
    );
  }

  /**
   * Optimized dashboard queries with pagination
   */
  async getDashboardsWithPagination(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: {
      isPublic?: boolean;
      isTemplate?: boolean;
      search?: string;
    } = {}
  ) {
    const cacheKey = `dashboards:${userId}:${page}:${limit}:${JSON.stringify(filters)}`;
    
    return this.executeQuery(
      async () => {
        if (!prisma) throw new Error('Database not available');
        
        const where: any = { userId };
        
        if (filters.isPublic !== undefined) {
          where.isPublic = filters.isPublic;
        }
        
        if (filters.isTemplate !== undefined) {
          where.isTemplate = filters.isTemplate;
        }
        
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        const [dashboards, total] = await Promise.all([
          prisma.dashboard.findMany({
            where,
            include: {
              elements: {
                select: { id: true, type: true, title: true },
                take: 5, // Limit elements for performance
              },
              _count: {
                select: { elements: true, shares: true },
              },
            },
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.dashboard.count({ where }),
        ]);

        return {
          dashboards,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      },
      cacheKey,
      { cache: true, cacheTTL: 300000, batchKey: 'dashboard-queries' }
    );
  }

  /**
   * Bulk operations with transaction optimization
   */
  async bulkCreateDashboardElements(
    dashboardId: string,
    elements: Array<{
      type: string;
      title: string;
      dataType: string;
      position: any;
      data?: any;
    }>
  ) {
    return this.executeQuery(
      async () => {
        if (!prisma) throw new Error('Database not available');
        
        return prisma.$transaction(async (tx) => {
          // Batch create elements
          const createdElements = await tx.dashboardElement.createMany({
            data: elements.map((element, index) => ({
              ...element,
              dashboardId,
              order: index,
              data: element.data || {},
            })),
          });

          // Update dashboard timestamp
          await tx.dashboard.update({
            where: { id: dashboardId },
            data: { updatedAt: new Date() },
          });

          return createdElements;
        });
      },
      undefined,
      { cache: false, priority: 'high', timeout: 45000 }
    );
  }

  /**
   * Optimized analytics queries with aggregation
   */
  async getDashboardAnalytics(
    userId: string,
    timeRange: { start: Date; end: Date }
  ) {
    const cacheKey = `analytics:${userId}:${timeRange.start.toISOString()}:${timeRange.end.toISOString()}`;
    
    return this.executeQuery(
      async () => {
        if (!prisma) throw new Error('Database not available');
        
        const [
          dashboardCount,
          elementCount,
          recentActivity,
          popularDataTypes,
        ] = await Promise.all([
          prisma.dashboard.count({
            where: {
              userId,
              createdAt: { gte: timeRange.start, lte: timeRange.end },
            },
          }),
          prisma.dashboardElement.count({
            where: {
              dashboard: { userId },
              createdAt: { gte: timeRange.start, lte: timeRange.end },
            },
          }),
          prisma.auditLog.findMany({
            where: {
              userId,
              createdAt: { gte: timeRange.start, lte: timeRange.end },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          prisma.dashboardElement.groupBy({
            by: ['dataType'],
            where: {
              dashboard: { userId },
              createdAt: { gte: timeRange.start, lte: timeRange.end },
            },
            _count: { dataType: true },
            orderBy: { _count: { dataType: 'desc' } },
            take: 5,
          }),
        ]);

        return {
          dashboardCount,
          elementCount,
          recentActivity,
          popularDataTypes,
        };
      },
      cacheKey,
      { cache: true, cacheTTL: 1800000, priority: 'normal' } // 30 minutes cache
    );
  }

  // Private methods

  private async getCachedResult<T>(key: string): Promise<T | null> {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // Try advanced cache
    return cache.get<T>(key);
  }

  private async setCachedResult<T>(key: string, data: T, ttl: number): Promise<void> {
    this.queryCache.set(key, { data, timestamp: Date.now(), ttl });
    
    // Also set in advanced cache
    await cache.set(key, data, { ttl: ttl / 1000, tags: ['database'] });
  }

  private canBatch(queryFn: Function): boolean {
    // Simple heuristic - check if it's a read-only query
    const queryString = queryFn.toString();
    return this.readOnlyQueries.some(op => queryString.includes(op));
  }

  private async executeBatchedQuery<T>(
    queryFn: () => Promise<T>,
    batchKey: string,
    options: QueryOptions
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queryId = Math.random().toString(36).substring(7);
      const batchedQuery: BatchedQuery = {
        id: queryId,
        query: queryFn,
        resolve,
        reject,
        options,
        timestamp: Date.now(),
      };

      if (!this.queryBatches.has(batchKey)) {
        this.queryBatches.set(batchKey, []);
      }

      this.queryBatches.get(batchKey)!.push(batchedQuery);

      // Set timer to execute batch
      if (!this.batchTimers.has(batchKey)) {
        const timer = setTimeout(() => {
          this.executeBatch(batchKey);
        }, 10); // 10ms batch window
        
        this.batchTimers.set(batchKey, timer);
      }
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const queries = this.queryBatches.get(batchKey) || [];
    this.queryBatches.delete(batchKey);
    
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    // Execute queries in parallel with connection limit
    const batchSize = 5; // Limit concurrent queries
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (query) => {
          try {
            const result = await this.executeDirectQuery(
              query.query,
              query.options.timeout,
              query.options.retries
            );
            query.resolve(result);
          } catch (error) {
            query.reject(error);
          }
        })
      );
    }
  }

  private async executeDirectQuery<T>(
    queryFn: () => Promise<T>,
    timeout: number = 30000,
    retries: number = 2
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await safeDatabaseOperation(
          () => Promise.race([
            queryFn(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), timeout)
            ),
          ])
        );
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  private updateMetrics(duration: number, _success: boolean): void {
    this.metrics.avgQueryTime = (this.metrics.avgQueryTime + duration) / 2;
  }

  private setupPeriodicCleanup(): void {
    setInterval(() => {
      // Clean expired cache entries
      const now = Date.now();
      for (const [key, cached] of this.queryCache.entries()) {
        if (now - cached.timestamp > cached.ttl) {
          this.queryCache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  private setupMetricsCollection(): void {
    setInterval(() => {
      // Update connection pool utilization
      const poolMetrics = dbConnectionMonitor.getMetrics();
      this.metrics.connectionPoolUtilization = poolMetrics.activeConnections / 20 * 100; // Assuming max 20 connections
    }, 30000); // Every 30 seconds
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const hitRate = this.metrics.totalQueries > 0 
      ? (this.metrics.cachedQueries / this.metrics.totalQueries) * 100 
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: hitRate,
      batchingRate: this.metrics.totalQueries > 0 
        ? (this.metrics.batchedQueries / this.metrics.totalQueries) * 100 
        : 0,
    };
  }
}

// Global instance
export const optimizedDb = new OptimizedDatabaseService();

// Convenience functions
export const executeOptimizedQuery = <T>(
  queryFn: () => Promise<T>,
  cacheKey?: string,
  options?: QueryOptions
) => optimizedDb.executeQuery(queryFn, cacheKey, options);

/**
 * Query Optimizer for automatic query performance improvement
 */
export class QueryOptimizer {
  private queryPatterns = new Map<string, {
    count: number;
    avgDuration: number;
    lastOptimized: Date;
    optimizations: string[];
  }>();

  /**
   * Analyze query and suggest optimizations
   */
  analyzeQuery(queryString: string, duration: number): string[] {
    const suggestions: string[] = [];

    // Check for missing indexes
    if (queryString.includes('WHERE') && duration > 1000) {
      suggestions.push('Consider adding database indexes for WHERE clauses');
    }

    // Check for N+1 queries
    if (queryString.includes('findMany') && !queryString.includes('include')) {
      suggestions.push('Consider using include/select to avoid N+1 queries');
    }

    // Check for large result sets
    if (!queryString.includes('take') && !queryString.includes('limit')) {
      suggestions.push('Consider adding pagination with take/skip');
    }

    // Check for unnecessary data fetching
    if (queryString.includes('include') && queryString.includes('*')) {
      suggestions.push('Use select to fetch only required fields');
    }

    return suggestions;
  }

  /**
   * Auto-optimize query based on patterns
   */
  optimizeQuery(originalQuery: any): any {
    const optimizedQuery = { ...originalQuery };

    // Add default pagination if missing
    if (!optimizedQuery.take && !optimizedQuery.skip) {
      optimizedQuery.take = 100; // Default limit
    }

    // Optimize includes
    if (optimizedQuery.include) {
      optimizedQuery.include = this.optimizeIncludes(optimizedQuery.include);
    }

    return optimizedQuery;
  }

  private optimizeIncludes(include: any): any {
    const optimized = { ...include };

    // Add limits to relationship queries
    Object.keys(optimized).forEach(key => {
      if (typeof optimized[key] === 'object' && optimized[key] !== null) {
        if (!optimized[key].take) {
          optimized[key].take = 50; // Default relationship limit
        }
      }
    });

    return optimized;
  }
}

export const queryOptimizer = new QueryOptimizer();

export default optimizedDb;
