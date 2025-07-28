/**
 * Redis Predictive Analytics Service
 * 
 * Advanced analytics for predicting Redis failures and optimizing performance
 * before issues impact users.
 */

import { redisErrorLogger, RedisOperationType } from './redis-error-logger';
import { redisHealthMonitor } from './redis-health-monitor';

interface PredictiveMetrics {
  latencyTrend: number[]; // Last 20 measurements
  errorRateWindow: number[]; // Last 10 error rates
  connectionStability: number; // 0-1 score
  predictedFailureRisk: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  timeToFailure?: number; // milliseconds
}

interface PerformancePattern {
  pattern: 'degrading' | 'unstable' | 'recovering' | 'stable';
  confidence: number; // 0-1
  triggerThreshold: number;
  recommendedAction: 'monitor' | 'prepare_fallback' | 'activate_fallback' | 'scale_up';
}

class RedisPredictiveAnalytics {
  private metrics: PredictiveMetrics = {
    latencyTrend: [],
    errorRateWindow: [],
    connectionStability: 1.0,
    predictedFailureRisk: 'low',
    recommendedActions: [],
  };

  private readonly TREND_WINDOW_SIZE = 20;
  private readonly ERROR_WINDOW_SIZE = 10;
  private readonly PREDICTION_INTERVAL_MS = 15000; // 15 seconds

  /**
   * Analyze current metrics and predict potential issues
   */
  public analyzePredictiveMetrics(): PredictiveMetrics {
    const healthCheck = redisHealthMonitor.getLastHealthCheck();
    const errorMetrics = redisErrorLogger.getMetrics();

    // Update latency trend
    if (healthCheck?.latency) {
      this.updateLatencyTrend(healthCheck.latency);
    }

    // Update error rate window
    this.updateErrorRateWindow(errorMetrics.errorRate);

    // Calculate connection stability
    this.calculateConnectionStability(errorMetrics);

    // Predict failure risk
    this.predictFailureRisk();

    // Generate recommendations
    this.generateRecommendations();

    return { ...this.metrics };
  }

  /**
   * Detect performance patterns using trend analysis
   */
  public detectPerformancePattern(): PerformancePattern {
    const latencySlope = this.calculateTrendSlope(this.metrics.latencyTrend);
    const errorTrend = this.calculateTrendSlope(this.metrics.errorRateWindow);
    
    // Pattern detection logic
    if (latencySlope > 50 && errorTrend > 0.1) {
      return {
        pattern: 'degrading',
        confidence: 0.85,
        triggerThreshold: 2000, // 2 second latency
        recommendedAction: 'prepare_fallback'
      };
    }

    if (this.metrics.connectionStability < 0.7) {
      return {
        pattern: 'unstable',
        confidence: 0.9,
        triggerThreshold: 0.5, // 50% error rate
        recommendedAction: 'activate_fallback'
      };
    }

    return {
      pattern: 'stable',
      confidence: 0.95,
      triggerThreshold: 1000,
      recommendedAction: 'monitor'
    };
  }

  private updateLatencyTrend(latency: number): void {
    this.metrics.latencyTrend.push(latency);
    if (this.metrics.latencyTrend.length > this.TREND_WINDOW_SIZE) {
      this.metrics.latencyTrend.shift();
    }
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private predictFailureRisk(): void {
    const pattern = this.detectPerformancePattern();
    const avgLatency = this.metrics.latencyTrend.reduce((a, b) => a + b, 0) / this.metrics.latencyTrend.length;
    const avgErrorRate = this.metrics.errorRateWindow.reduce((a, b) => a + b, 0) / this.metrics.errorRateWindow.length;

    if (pattern.pattern === 'degrading' && avgLatency > 3000) {
      this.metrics.predictedFailureRisk = 'critical';
      this.metrics.timeToFailure = 30000; // 30 seconds
    } else if (pattern.pattern === 'unstable' || avgErrorRate > 0.5) {
      this.metrics.predictedFailureRisk = 'high';
      this.metrics.timeToFailure = 60000; // 1 minute
    } else if (avgLatency > 1500 || avgErrorRate > 0.2) {
      this.metrics.predictedFailureRisk = 'medium';
    } else {
      this.metrics.predictedFailureRisk = 'low';
    }
  }
}

export const redisPredictiveAnalytics = new RedisPredictiveAnalytics();