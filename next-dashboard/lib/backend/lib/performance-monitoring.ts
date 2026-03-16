/**
 * Advanced Performance Monitoring System
 * 
 * Comprehensive monitoring with:
 * - Real-time metrics collection
 * - Performance alerting
 * - Trend analysis
 * - Bottleneck detection
 * - Resource utilization tracking
 * - Custom metric dashboards
 */

import { EventEmitter } from 'events';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved?: Date;
  tags?: Record<string, string>;
}

export interface PerformanceTrend {
  metric: string;
  timeframe: '1h' | '24h' | '7d' | '30d';
  values: Array<{ timestamp: Date; value: number }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics = new Map<string, PerformanceMetric[]>();
  private alerts = new Map<string, PerformanceAlert>();
  private thresholds = new Map<string, { warning: number; critical: number }>();
  private collectors = new Map<string, () => Promise<number>>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private maxMetricHistory = 1000;
  private alertHistory: PerformanceAlert[] = [];

  constructor() {
    super();
    this.setupDefaultThresholds();
    this.setupDefaultCollectors();
    this.startMonitoring();
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
      threshold: this.thresholds.get(name),
    };

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Limit history size
    if (metricHistory.length > this.maxMetricHistory) {
      metricHistory.shift();
    }

    // Check thresholds and create alerts
    this.checkThresholds(metric);

    // Emit metric event
    this.emit('metric', metric);
  }

  /**
   * Set performance thresholds for alerting
   */
  setThreshold(
    metricName: string,
    warning: number,
    critical: number
  ): void {
    this.thresholds.set(metricName, { warning, critical });
  }

  /**
   * Add custom metric collector
   */
  addCollector(
    name: string,
    collector: () => Promise<number>,
    interval: number = 30000
  ): void {
    this.collectors.set(name, collector);
    
    // Start collection interval
    const intervalId = setInterval(async () => {
      try {
        const value = await collector();
        this.recordMetric(name, value);
      } catch (error) {
        console.error(`Failed to collect metric ${name}:`, error);
      }
    }, interval);
    
    this.intervals.set(name, intervalId);
  }

  /**
   * Get current metrics
   */
  getMetrics(metricName?: string): PerformanceMetric[] {
    if (metricName) {
      return this.metrics.get(metricName) || [];
    }
    
    const allMetrics: PerformanceMetric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance trends
   */
  getTrends(metricName: string, timeframe: '1h' | '24h' | '7d' | '30d'): PerformanceTrend {
    const metrics = this.metrics.get(metricName) || [];
    const now = new Date();
    const timeframeDuration = this.getTimeframeDuration(timeframe);
    const cutoff = new Date(now.getTime() - timeframeDuration);
    
    const filteredMetrics = metrics.filter(m => m.timestamp >= cutoff);
    const values = filteredMetrics.map(m => ({
      timestamp: m.timestamp,
      value: m.value,
    }));

    // Calculate trend
    const trend = this.calculateTrend(values);
    
    return {
      metric: metricName,
      timeframe,
      values,
      trend: trend.direction,
      changePercent: trend.changePercent,
    };
  }

  /**
   * Get active alerts
   */
  getAlerts(level?: PerformanceAlert['level']): PerformanceAlert[] {
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved);
    
    if (level) {
      return activeAlerts.filter(alert => alert.level === level);
    }
    
    return activeAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 50): PerformanceAlert[] {
    return this.alertHistory
      .slice(0, limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = new Date();
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    activeAlerts: number;
    criticalAlerts: number;
    avgResponseTime: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const totalMetrics = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const activeAlerts = this.getAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.level === 'critical');
    
    // Calculate average response time from API metrics
    const apiMetrics = this.metrics.get('api.response_time') || [];
    const recentApiMetrics = apiMetrics.slice(-10);
    const avgResponseTime = recentApiMetrics.length > 0
      ? recentApiMetrics.reduce((sum, m) => sum + m.value, 0) / recentApiMetrics.length
      : 0;

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      systemHealth = 'critical';
    } else if (activeAlerts.length > 0) {
      systemHealth = 'warning';
    }

    return {
      totalMetrics,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      avgResponseTime,
      systemHealth,
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusFormat();
    }
    
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([name, metrics]) => [
          name,
          metrics.slice(-1)[0], // Latest value
        ])
      ),
      alerts: this.getAlerts(),
      summary: this.getSummary(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Private methods

  private setupDefaultThresholds(): void {
    this.setThreshold('api.response_time', 1000, 5000); // 1s warning, 5s critical
    this.setThreshold('memory.usage_percent', 80, 95); // 80% warning, 95% critical
    this.setThreshold('cpu.usage_percent', 70, 90); // 70% warning, 90% critical
    this.setThreshold('database.query_time', 500, 2000); // 500ms warning, 2s critical
    this.setThreshold('cache.hit_rate', 70, 50); // Below 70% warning, below 50% critical
    this.setThreshold('error.rate_percent', 5, 10); // 5% warning, 10% critical
  }

  private setupDefaultCollectors(): void {
    // Memory usage collector
    this.addCollector('memory.usage_percent', async () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        return (usage.heapUsed / usage.heapTotal) * 100;
      }
      return 0;
    }, 30000);

    // CPU usage collector (Node.js only; process.cpuUsage is not available in browser)
    this.addCollector('cpu.usage_percent', async () => {
      if (typeof process === 'undefined' || typeof process.cpuUsage !== 'function') {
        return 0;
      }
      // This is a simplified CPU usage calculation
      // In production, you'd use a proper CPU monitoring library
      const start = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const end = process.cpuUsage(start);
      const totalUsage = (end.user + end.system) / 1000; // Convert to milliseconds
      return Math.min(totalUsage / 100 * 100, 100); // Normalize to percentage
    }, 60000);
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.name);
    if (!threshold) return;

    let alertLevel: PerformanceAlert['level'] | null = null;
    let thresholdValue = 0;

    if (metric.value >= threshold.critical) {
      alertLevel = 'critical';
      thresholdValue = threshold.critical;
    } else if (metric.value >= threshold.warning) {
      alertLevel = 'warning';
      thresholdValue = threshold.warning;
    }

    if (alertLevel) {
      const alertId = `${metric.name}-${alertLevel}-${Date.now()}`;
      const alert: PerformanceAlert = {
        id: alertId,
        level: alertLevel,
        metric: metric.name,
        message: `${metric.name} exceeded ${alertLevel} threshold: ${metric.value}${metric.unit} > ${thresholdValue}${metric.unit}`,
        value: metric.value,
        threshold: thresholdValue,
        timestamp: new Date(),
        tags: metric.tags,
      };

      this.alerts.set(alertId, alert);
      this.alertHistory.unshift(alert);
      
      // Limit alert history
      if (this.alertHistory.length > 1000) {
        this.alertHistory = this.alertHistory.slice(0, 1000);
      }

      this.emit('alert', alert);
    }
  }

  private getTimeframeDuration(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private calculateTrend(values: Array<{ timestamp: Date; value: number }>): {
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', changePercent: 0 };
    }

    const first = values[0].value;
    const last = values[values.length - 1].value;
    const changePercent = ((last - first) / first) * 100;

    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) { // 5% threshold for trend detection
      direction = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    return { direction, changePercent };
  }

  private exportPrometheusFormat(): string {
    const lines: string[] = [];
    
    for (const [metricName, metrics] of this.metrics.entries()) {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        const sanitizedName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');
        const tags = latest.tags 
          ? Object.entries(latest.tags).map(([k, v]) => `${k}="${v}"`).join(',')
          : '';
        const tagString = tags ? `{${tags}}` : '';
        
        lines.push(`${sanitizedName}${tagString} ${latest.value} ${latest.timestamp.getTime()}`);
      }
    }
    
    return lines.join('\n');
  }

  private startMonitoring(): void {
    // Auto-resolve old alerts
    setInterval(() => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      for (const [alertId, alert] of this.alerts.entries()) {
        if (!alert.resolved && alert.timestamp < fiveMinutesAgo) {
          // Check if the condition still exists
          const recentMetrics = this.metrics.get(alert.metric) || [];
          const latestMetric = recentMetrics[recentMetrics.length - 1];
          
          if (latestMetric && latestMetric.value < alert.threshold) {
            this.resolveAlert(alertId);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.removeAllListeners();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const recordMetric = (name: string, value: number, unit?: string, tags?: Record<string, string>) =>
  performanceMonitor.recordMetric(name, value, unit, tags);

export const getPerformanceMetrics = (metricName?: string) =>
  performanceMonitor.getMetrics(metricName);

export const getPerformanceAlerts = (level?: PerformanceAlert['level']) =>
  performanceMonitor.getAlerts(level);

export const getPerformanceSummary = () =>
  performanceMonitor.getSummary();

export default performanceMonitor;
