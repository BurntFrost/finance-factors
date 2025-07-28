'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';

interface PerformanceData {
  timestamp: string;
  responseTime: number;
  summary: {
    totalMetrics: number;
    activeAlerts: number;
    criticalAlerts: number;
    avgResponseTime: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  alerts: {
    active: Array<{
      id: string;
      level: 'info' | 'warning' | 'error' | 'critical';
      metric: string;
      message: string;
      value: number;
      threshold: number;
      timestamp: string;
    }>;
    counts: {
      total: number;
      critical: number;
      warning: number;
      error: number;
    };
  };
  metrics: {
    system: {
      current: {
        memory: number;
        cpu: number;
        responseTime: number;
        errorRate: number;
      };
    };
    database: {
      queries: {
        total: number;
        cached: number;
        failed: number;
        cacheHitRate: number;
        avgQueryTime: number;
      };
      connections: {
        active: number;
        total: number;
        errors: number;
        poolUtilization: number;
      };
    };
    cache: {
      summary: {
        totalHits: number;
        totalMisses: number;
        avgHitRate: number;
        totalSize: number;
        compressionSavings: number;
      };
    };
  };
}

interface RealTimePerformanceMonitorProps {
  refreshInterval?: number;
  showDetails?: boolean;
  onAlert?: (alert: any) => void;
}

export const RealTimePerformanceMonitor = React.memo(function RealTimePerformanceMonitor({
  refreshInterval = 30000, // 30 seconds
  showDetails = false,
  onAlert,
}: RealTimePerformanceMonitorProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Memoized fetch function
  const fetchPerformanceData = useCallback(async () => {
    try {
      const response = await fetch('/api/performance/dashboard?details=false');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setError(null);
        setLastUpdate(new Date());
        
        // Check for new critical alerts
        if (onAlert && result.data.alerts.active.length > 0) {
          const criticalAlerts = result.data.alerts.active.filter(
            (alert: any) => alert.level === 'critical'
          );
          criticalAlerts.forEach(onAlert);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch performance data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Performance monitoring error:', err);
    } finally {
      setLoading(false);
    }
  }, [onAlert]);

  // Set up polling
  useEffect(() => {
    fetchPerformanceData();
    
    const interval = setInterval(fetchPerformanceData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPerformanceData, refreshInterval]);

  // Memoized health status
  const healthStatus = useMemo(() => {
    if (!data) return { color: 'gray', text: 'Unknown' };
    
    switch (data.summary.systemHealth) {
      case 'healthy':
        return { color: 'green', text: 'Healthy' };
      case 'warning':
        return { color: 'yellow', text: 'Warning' };
      case 'critical':
        return { color: 'red', text: 'Critical' };
      default:
        return { color: 'gray', text: 'Unknown' };
    }
  }, [data]);

  // Memoized alert resolver
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const response = await fetch('/api/performance/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          data: { alertId },
        }),
      });
      
      if (response.ok) {
        // Refresh data to show resolved alert
        await fetchPerformanceData();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  }, [fetchPerformanceData]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin text-2xl">⟳</div>
            <span className="ml-2">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Failed to load performance data: {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchPerformanceData} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>System Health</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={healthStatus.color === 'green' ? 'default' : 'destructive'}
              className={`
                ${healthStatus.color === 'green' ? 'bg-green-500' : ''}
                ${healthStatus.color === 'yellow' ? 'bg-yellow-500' : ''}
                ${healthStatus.color === 'red' ? 'bg-red-500' : ''}
              `}
            >
              {healthStatus.text}
            </Badge>
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.summary.avgResponseTime.toFixed(0)}ms</div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.summary.activeAlerts}</div>
                <div className="text-sm text-muted-foreground">Active Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.metrics.database.queries.cacheHitRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.metrics.system.current.memory.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Memory Usage</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {data && data.alerts.active.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts ({data.alerts.active.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.active.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.level === 'critical' ? 'border-red-200 bg-red-50' :
                    alert.level === 'error' ? 'border-orange-200 bg-orange-50' :
                    alert.level === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={alert.level === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {alert.level.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{alert.metric}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.message}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                      className="ml-2"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {showDetails && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Database Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Queries:</span>
                  <span className="font-mono">{data.metrics.database.queries.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hit Rate:</span>
                  <span className="font-mono">{data.metrics.database.queries.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Query Time:</span>
                  <span className="font-mono">{data.metrics.database.queries.avgQueryTime.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Connections:</span>
                  <span className="font-mono">{data.metrics.database.connections.active}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pool Utilization:</span>
                  <span className="font-mono">{data.metrics.database.connections.poolUtilization.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Cache Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Hits:</span>
                  <span className="font-mono">{data.metrics.cache.summary.totalHits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Misses:</span>
                  <span className="font-mono">{data.metrics.cache.summary.totalMisses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <span className="font-mono">{data.metrics.cache.summary.avgHitRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Size:</span>
                  <span className="font-mono">{(data.metrics.cache.summary.totalSize / 1024 / 1024).toFixed(1)}MB</span>
                </div>
                <div className="flex justify-between">
                  <span>Compression Savings:</span>
                  <span className="font-mono">{data.metrics.cache.summary.compressionSavings.toFixed(1)}MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button 
          onClick={fetchPerformanceData}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </Button>
      </div>
    </div>
  );
});

export default RealTimePerformanceMonitor;
