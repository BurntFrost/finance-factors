/**
 * Health Service
 * 
 * Centralized health monitoring service for the backend
 */

import { checkDatabaseHealth } from '../lib/database/prisma';
import { isRedisAvailable, getRedisInfo } from '../lib/redis/redis';
import { cacheService } from './cache-service';
import type { ApiHealthCheck, ServiceStatus, PerformanceMetrics } from '@/shared/types';

export class HealthService {
  /**
   * Get comprehensive health check
   */
  async getHealthCheck(detailed: boolean = false): Promise<ApiHealthCheck> {
    const startTime = Date.now();
    
    // Get performance metrics
    const performance = this.getPerformanceMetrics();
    performance.responseTime = Date.now() - startTime;

    // Check all services
    const [databaseHealth, redisHealth, cacheHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkCacheHealth(),
    ]);

    // Determine overall status
    const overallStatus = this.determineOverallStatus([
      databaseHealth.status,
      redisHealth.status,
      cacheHealth.status,
    ]);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      performance,
      services: {
        database: databaseHealth,
        redis: redisHealth,
        cache: cacheHealth,
        fred: await this.checkApiServiceHealth('FRED'),
        bls: await this.checkApiServiceHealth('BLS'),
        census: await this.checkApiServiceHealth('CENSUS'),
        alphaVantage: await this.checkApiServiceHealth('ALPHA_VANTAGE'),
      },
      cache: detailed ? await this.getCacheInfo() : undefined,
      deployment: this.getDeploymentInfo(),
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth() {
    try {
      const health = await checkDatabaseHealth();
      return {
        configured: true,
        status: health.connected ? 'healthy' as ServiceStatus : 'unhealthy' as ServiceStatus,
        lastChecked: new Date().toISOString(),
        responseTime: health.responseTime,
        error: health.error,
      };
    } catch (error) {
      return {
        configured: false,
        status: 'unhealthy' as ServiceStatus,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth() {
    try {
      const isAvailable = await isRedisAvailable();
      const info = isAvailable ? await getRedisInfo() : null;
      
      return {
        configured: true,
        status: isAvailable ? 'healthy' as ServiceStatus : 'unhealthy' as ServiceStatus,
        lastChecked: new Date().toISOString(),
        responseTime: info?.responseTime,
        note: isAvailable ? 'Redis is operational' : 'Redis is not available',
      };
    } catch (error) {
      return {
        configured: false,
        status: 'unhealthy' as ServiceStatus,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth() {
    try {
      const stats = await cacheService.getCacheStatistics();
      
      return {
        configured: true,
        status: 'healthy' as ServiceStatus,
        lastChecked: new Date().toISOString(),
        note: `Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`,
      };
    } catch (error) {
      return {
        configured: false,
        status: 'degraded' as ServiceStatus,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Cache unavailable',
      };
    }
  }

  /**
   * Check API service health
   */
  private async checkApiServiceHealth(provider: string) {
    const envKey = `${provider}_API_KEY`;
    const configured = !!process.env[envKey];
    
    return {
      configured,
      status: configured ? 'available' as ServiceStatus : 'unavailable' as ServiceStatus,
      lastChecked: new Date().toISOString(),
      note: configured ? 'API key configured' : 'API key not configured',
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      responseTime: 0, // Will be set by caller
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: process.uptime(),
      requestCount: 0, // Would need to be tracked separately
      errorCount: 0, // Would need to be tracked separately
    };
  }

  /**
   * Determine overall status from service statuses
   */
  private determineOverallStatus(statuses: ServiceStatus[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.some(status => status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get cache information
   */
  private async getCacheInfo() {
    try {
      const stats = await cacheService.getCacheStatistics();
      return {
        enabled: true,
        size: stats.totalKeys,
        hitRate: stats.hitRate,
      };
    } catch {
      return {
        enabled: false,
        size: 0,
      };
    }
  }

  /**
   * Get deployment information
   */
  private getDeploymentInfo() {
    return {
      region: process.env.VERCEL_REGION,
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      branch: process.env.VERCEL_GIT_COMMIT_REF,
      buildTime: process.env.BUILD_TIME,
    };
  }

  /**
   * Check if system is ready to serve requests
   */
  async isReady(): Promise<boolean> {
    try {
      const health = await this.getHealthCheck();
      return health.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  /**
   * Check if system is alive (basic liveness check)
   */
  async isAlive(): Promise<boolean> {
    return true; // If this method is called, the process is alive
  }
}

// Export singleton instance
export const healthService = new HealthService();
