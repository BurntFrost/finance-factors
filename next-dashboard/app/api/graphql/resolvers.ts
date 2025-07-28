/**
 * GraphQL Resolvers
 * 
 * Implements the business logic for GraphQL operations with
 * performance optimizations, caching, and error handling.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { prisma } from '../../lib/prisma';
import { cache } from '../../lib/advanced-cache';
import { batchRequest } from '../../lib/request-batcher';
import { fredProxyService } from '../services/fred-proxy';
import { blsProxyService } from '../services/bls-proxy';
import { censusProxyService } from '../services/census-proxy';
import { PROXY_API_ENDPOINTS } from '../types/proxy';

// Custom scalar types
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return null;
      }
    }
    return null;
  },
});

// Context type for resolvers
interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  req: Request;
}

export const resolvers = {
  // Custom scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  // Query resolvers
  Query: {
    // Data queries
    async getChartData(_: any, { input }: { input: any }, context: GraphQLContext) {
      try {
        const { dataType, timeRange, useCache = true, priority = 'normal' } = input;
        
        // Check cache first if enabled
        if (useCache) {
          const cacheKey = `chart:${dataType}:${JSON.stringify(timeRange)}`;
          const cached = await cache.get(cacheKey);
          if (cached) {
            return cached;
          }
        }

        // Get endpoint configuration
        const endpointConfig = PROXY_API_ENDPOINTS[dataType];
        if (!endpointConfig) {
          throw new Error(`Unknown data type: ${dataType}`);
        }

        // Use request batcher for optimal performance
        const response = await batchRequest(
          'data',
          {
            dataType,
            timeRange: timeRange ? {
              start: timeRange.start?.toISOString(),
              end: timeRange.end?.toISOString(),
            } : undefined,
            useCache,
          },
          { priority: priority as any }
        );

        // Cache the result
        if (useCache && response.success) {
          const cacheKey = `chart:${dataType}:${JSON.stringify(timeRange)}`;
          await cache.set(cacheKey, response.data, {
            ttl: 900, // 15 minutes
            tags: [dataType, 'chart-data'],
          });
        }

        return response.data;
      } catch (error) {
        console.error('GraphQL getChartData error:', error);
        throw new Error(`Failed to fetch chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },

    async getMultipleChartData(_: any, { inputs }: { inputs: any[] }) {
      try {
        // Batch multiple requests for optimal performance
        const promises = inputs.map(input => 
          resolvers.Query.getChartData(_, { input }, {} as GraphQLContext)
        );
        
        const results = await Promise.allSettled(promises);
        
        return results.map(result => 
          result.status === 'fulfilled' ? result.value : null
        ).filter(Boolean);
      } catch (error) {
        console.error('GraphQL getMultipleChartData error:', error);
        throw new Error('Failed to fetch multiple chart data');
      }
    },

    // User queries
    async me(_: any, __: any, context: GraphQLContext) {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          preferences: true,
          dashboards: {
            include: {
              elements: true,
            },
          },
        },
      });
    },

    async getUser(_: any, { id }: { id: string }) {
      return prisma.user.findUnique({
        where: { id },
        include: {
          preferences: true,
          dashboards: {
            where: { isPublic: true },
            include: {
              elements: true,
            },
          },
        },
      });
    },

    // Dashboard queries
    async getDashboard(_: any, { id }: { id: string }, context: GraphQLContext) {
      const dashboard = await prisma.dashboard.findUnique({
        where: { id },
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

      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Check permissions
      if (!dashboard.isPublic && dashboard.userId !== context.user?.id) {
        throw new Error('Access denied');
      }

      return dashboard;
    },

    async getDashboards(_: any, { userId, isPublic }: { userId?: string; isPublic?: boolean }) {
      const where: any = {};
      
      if (userId) where.userId = userId;
      if (isPublic !== undefined) where.isPublic = isPublic;

      return prisma.dashboard.findMany({
        where,
        include: {
          elements: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    },

    async getDashboardTemplates() {
      return prisma.dashboard.findMany({
        where: { isTemplate: true },
        include: {
          elements: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    // Performance queries
    async getCacheStats() {
      const stats = cache.stats();
      return Object.entries(stats).map(([level, data]) => ({
        level: level.toUpperCase(),
        ...data,
      }));
    },

    async getPerformanceMetrics() {
      // Get metrics from various sources
      const cacheStats = cache.stats();
      const totalRequests = Object.values(cacheStats).reduce((sum, stat) => sum + stat.hits + stat.misses, 0);
      const totalHits = Object.values(cacheStats).reduce((sum, stat) => sum + stat.hits, 0);
      
      return {
        apiResponseTime: Object.values(cacheStats).reduce((sum, stat) => sum + stat.avgResponseTime, 0) / Object.keys(cacheStats).length,
        chartRenderTime: 0, // Would be measured on frontend
        cacheHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        totalRequests,
        errorRate: 0, // Would be tracked separately
        uptime: process.uptime(),
      };
    },

    async getApiHealth() {
      // Check health of all API services
      const healthChecks = await Promise.allSettled([
        fetch('/api/proxy/health').then(r => r.json()),
        // Add other health checks as needed
      ]);

      return {
        status: healthChecks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
        checks: healthChecks.map((check, index) => ({
          service: ['proxy'][index],
          status: check.status,
          data: check.status === 'fulfilled' ? check.value : null,
        })),
        timestamp: new Date().toISOString(),
      };
    },

    // Search queries
    async searchDashboards(_: any, { query }: { query: string }) {
      return prisma.dashboard.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
          isPublic: true,
        },
        include: {
          elements: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 20,
      });
    },

    async getPopularDataTypes() {
      // Get most used data types from dashboard elements
      const result = await prisma.dashboardElement.groupBy({
        by: ['dataType'],
        _count: {
          dataType: true,
        },
        orderBy: {
          _count: {
            dataType: 'desc',
          },
        },
        take: 10,
      });

      return result.map(item => item.dataType);
    },

    async getRecommendedDashboards(_: any, { userId }: { userId: string }) {
      // Simple recommendation based on user's existing dashboards
      const userDashboards = await prisma.dashboard.findMany({
        where: { userId },
        include: { elements: true },
      });

      const userDataTypes = new Set(
        userDashboards.flatMap(d => d.elements.map(e => e.dataType))
      );

      // Find public dashboards with similar data types
      return prisma.dashboard.findMany({
        where: {
          isPublic: true,
          userId: { not: userId },
          elements: {
            some: {
              dataType: { in: Array.from(userDataTypes) },
            },
          },
        },
        include: {
          elements: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 5,
      });
    },
  },

  // Mutation resolvers would go here
  Mutation: {
    // Dashboard mutations
    async createDashboard(_: any, { input }: { input: any }, context: GraphQLContext) {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      return prisma.dashboard.create({
        data: {
          ...input,
          userId: context.user.id,
        },
        include: {
          elements: true,
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

    // Add other mutations as needed...
  },

  // Subscription resolvers would go here for real-time features
  Subscription: {
    // Real-time subscriptions would be implemented here
  },
};
