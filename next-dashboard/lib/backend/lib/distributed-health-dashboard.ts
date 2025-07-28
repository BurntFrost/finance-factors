/**
 * Distributed Health Monitoring Dashboard
 * 
 * Centralized health monitoring with historical analysis and
 * multi-instance coordination for distributed deployments.
 */

import { redisHealthMonitor } from './redis-health-monitor';
import { redisErrorLogger } from './redis-error-logger';
import { redisFallbackService } from './redis-fallback-service';

interface HealthSnapshot {
  instanceId: string;
  timestamp: Date;
  redisHealth: ReturnType<typeof redisHealthMonitor.getLastHealthCheck>;
  errorMetrics: ReturnType<typeof redisErrorLogger.getMetrics>;
  fallbackStatus: ReturnType<typeof redisFallbackService.getFallbackStatus>;
  systemMetrics: SystemMetrics;
}

interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
}

interface HealthTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
  changeRate: number;
  prediction: number; // Predicted value in next interval
  confidence: number; // 0-1
}

class DistributedHealthDashboard {
  private healthHistory: HealthSnapshot[] = [];
  private readonly instanceId: string;
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly TREND_ANALYSIS_WINDOW = 50;

  constructor() {
    this.instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.startHealthCollection();
  }

  /**
   * Get comprehensive health dashboard data
   */
  public getHealthDashboard(): {
    currentStatus: HealthSnapshot;
    trends: HealthTrend[];
    alerts: HealthAlert[];
    recommendations: string[];
    historicalData: HealthSnapshot[];
  } {
    const currentStatus = this.captureHealthSnapshot();
    const trends = this.analyzeHealthTrends();
    const alerts = this.generateHealthAlerts(trends);
    const recommendations = this.generateRecommendations(trends, alerts);

    return {
      currentStatus,
      trends,
      alerts,
      recommendations,
      historicalData: this.healthHistory.slice(-100), // Last 100 snapshots
    };
  }

  /**
   * Analyze health trends using historical data
   */
  private analyzeHealthTrends(): HealthTrend[] {
    if (this.healthHistory.length < this.TREND_ANALYSIS_WINDOW) {
      return [];
    }

    const recentHistory = this.healthHistory.slice(-this.TREND_ANALYSIS_WINDOW);
    const trends: HealthTrend[] = [];

    // Analyze Redis latency trend
    const latencies = recentHistory
      .map(h => h.redisHealth?.latency)
      .filter(l => l !== undefined) as number[];
    
    if (latencies.length > 10) {
      trends.push(this.calculateTrend('redis_latency', latencies));
    }

    // Analyze error rate trend
    const errorRates = recentHistory.map(h => h.errorMetrics.errorRate);
    trends.push(this.calculateTrend('error_rate', errorRates));

    // Analyze memory usage trend
    const memoryUsages = recentHistory.map(h => h.systemMetrics.memoryUsage);
    trends.push(this.calculateTrend('memory_usage', memoryUsages));

    return trends;
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateTrend(metricName: string, values: number[]): HealthTrend {
    const slope = this.calculateLinearRegression(values);
    const recentAvg = values.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const overallAvg = values.reduce((a, b) => a + b, 0) / values.length;
    
    let trend: HealthTrend['trend'];
    if (slope > 0.1 && recentAvg > overallAvg * 1.2) {
      trend = 'critical';
    } else if (slope > 0.05) {
      trend = 'degrading';
    } else if (slope < -0.05) {
      trend = 'improving';
    } else {
      trend = 'stable';
    }

    // Simple prediction based on linear trend
    const prediction = values[values.length - 1] + slope * 5; // 5 intervals ahead
    const confidence = Math.max(0, Math.min(1, 1 - Math.abs(slope) * 10));

    return {
      metric: metricName,
      trend,
      changeRate: slope,
      prediction,
      confidence,
    };
  }

  /**
   * Generate health alerts based on trends and current status
   */
  private generateHealthAlerts(trends: HealthTrend[]): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    trends.forEach(trend => {
      if (trend.trend === 'critical') {
        alerts.push({
          severity: 'critical',
          message: `${trend.metric} is critically degrading`,
          metric: trend.metric,
          currentValue: trend.prediction,
          threshold: this.getThresholdForMetric(trend.metric),
          recommendedAction: `Immediate attention required for ${trend.metric}`,
        });
      } else if (trend.trend === 'degrading' && trend.confidence > 0.7) {
        alerts.push({
          severity: 'warning',
          message: `${trend.metric} is showing degradation trend`,
          metric: trend.metric,
          currentValue: trend.prediction,
          threshold: this.getThresholdForMetric(trend.metric),
          recommendedAction: `Monitor ${trend.metric} closely`,
        });
      }
    });

    return alerts;
  }

  private captureHealthSnapshot(): HealthSnapshot {
    return {
      instanceId: this.instanceId,
      timestamp: new Date(),
      redisHealth: redisHealthMonitor.getLastHealthCheck(),
      errorMetrics: redisErrorLogger.getMetrics(),
      fallbackStatus: redisFallbackService.getFallbackStatus(),
      systemMetrics: this.collectSystemMetrics(),
    };
  }

  private startHealthCollection(): void {
    setInterval(() => {
      const snapshot = this.captureHealthSnapshot();
      this.healthHistory.push(snapshot);

      // Maintain history size
      if (this.healthHistory.length > this.MAX_HISTORY_SIZE) {
        this.healthHistory.shift();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Generate recommendations based on trends and alerts
   */
  private generateRecommendations(trends: HealthTrend[], alerts: HealthAlert[]): string[] {
    const recommendations: string[] = [];

    // Critical alerts get immediate recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push('🚨 Immediate action required: Scale resources or investigate critical issues');
    }

    // Trend-based recommendations
    trends.forEach(trend => {
      switch (trend.metric) {
        case 'redis_latency':
          if (trend.trend === 'degrading') {
            recommendations.push('🔧 Consider Redis connection pooling optimization or cluster scaling');
          }
          break;
        case 'error_rate':
          if (trend.trend === 'degrading') {
            recommendations.push('🐛 Investigate error patterns and implement additional error handling');
          }
          break;
        case 'memory_usage':
          if (trend.trend === 'degrading') {
            recommendations.push('💾 Monitor memory leaks and consider garbage collection tuning');
          }
          break;
      }
    });

    // General health recommendations
    if (recommendations.length === 0) {
      recommendations.push('✅ System health is stable - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Calculate linear regression slope for trend analysis
   */
  private calculateLinearRegression(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ..., n-1
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get threshold value for a specific metric
   */
  private getThresholdForMetric(metric: string): number {
    const thresholds: Record<string, number> = {
      redis_latency: 100, // ms
      error_rate: 0.05, // 5%
      memory_usage: 0.8, // 80%
      cpu_usage: 0.7, // 70%
      active_connections: 1000,
      requests_per_minute: 10000,
    };

    return thresholds[metric] || 0;
  }

  /**
   * Collect current system metrics
   */
  private collectSystemMetrics(): SystemMetrics {
    // In a real implementation, these would come from actual system monitoring
    // For now, return mock data that would be replaced with actual metrics
    return {
      memoryUsage: Math.random() * 0.8, // 0-80% usage
      cpuUsage: Math.random() * 0.6, // 0-60% usage
      activeConnections: Math.floor(Math.random() * 500) + 100, // 100-600 connections
      requestsPerMinute: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 RPM
    };
  }
}

interface HealthAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  recommendedAction: string;
}

export const distributedHealthDashboard = new DistributedHealthDashboard();