'use client';

/**
 * Rate Limit Monitor Component
 * 
 * Displays rate limiting information and API call patterns for debugging and monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAutomaticDataSource } from '../context/AutomaticDataSourceContext';

interface RateLimitMonitorProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function RateLimitMonitor({
  className = '',
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 5000,
}: RateLimitMonitorProps) {
  const { getMonitoringData, getCircuitBreakerStatus } = useAutomaticDataSource();
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(showDetails);

  // Refresh monitoring data
  const refreshData = useCallback(() => {
    const data = getMonitoringData();
    setMonitoringData(data);
  }, [getMonitoringData]);

  // Auto-refresh effect
  useEffect(() => {
    refreshData(); // Initial load

    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  if (!monitoringData) {
    return (
      <div className={`rate-limit-monitor ${className}`}>
        <div className="text-sm text-gray-500">Loading monitoring data...</div>
      </div>
    );
  }

  const { stats, patterns } = monitoringData;
  const circuitBreakers = getCircuitBreakerStatus() as Map<string, any>;

  return (
    <div className={`rate-limit-monitor bg-gray-50 border rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          📊 Rate Limit Monitor
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-blue-600">{stats.totalEvents}</div>
          <div className="text-xs text-gray-600">Total Events</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-red-600">{stats.rateLimitHits}</div>
          <div className="text-xs text-gray-600">Rate Limit Hits</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-orange-600">{stats.circuitBreakerTrips}</div>
          <div className="text-xs text-gray-600">Circuit Breaker Trips</div>
        </div>
        <div className="bg-white p-3 rounded border">
          <div className="text-2xl font-bold text-yellow-600">{stats.fallbacksTriggered}</div>
          <div className="text-xs text-gray-600">Fallbacks Triggered</div>
        </div>
      </div>

      {/* Circuit Breaker Status */}
      <div className="mb-4">
        <h4 className="text-md font-semibold text-gray-700 mb-2">Circuit Breaker Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from(circuitBreakers.entries()).map(([provider, info]) => (
            <div
              key={provider}
              className={`p-2 rounded border text-sm ${
                info.state === 'closed'
                  ? 'bg-green-50 border-green-200'
                  : info.state === 'open'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="font-semibold">{provider}</div>
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    info.state === 'closed'
                      ? 'bg-green-500'
                      : info.state === 'open'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                  }`}
                />
                <span className="capitalize">{info.state}</span>
              </div>
              {info.failureCount > 0 && (
                <div className="text-xs text-gray-600">
                  Failures: {info.failureCount}
                </div>
              )}
              {info.nextRetryTime && (
                <div className="text-xs text-gray-600">
                  Next retry: {new Date(info.nextRetryTime).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <>
          {/* Provider Patterns */}
          <div className="mb-4">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Provider Performance</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-1 text-left">Provider</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Requests</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Success Rate</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Rate Limits</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Avg Response</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">Last Request</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(patterns.values()).map((pattern: any) => {
                    const successRate = pattern.totalRequests > 0 
                      ? ((pattern.successfulRequests / pattern.totalRequests) * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <tr key={pattern.provider}>
                        <td className="border border-gray-300 px-2 py-1 font-medium">
                          {pattern.provider}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {pattern.totalRequests}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          <span className={`${
                            parseFloat(successRate) >= 90 
                              ? 'text-green-600' 
                              : parseFloat(successRate) >= 70 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                          }`}>
                            {successRate}%
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          <span className={pattern.rateLimitHits > 0 ? 'text-red-600' : 'text-green-600'}>
                            {pattern.rateLimitHits}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right">
                          {pattern.averageResponseTime.toFixed(0)}ms
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-xs">
                          {new Date(pattern.lastRequestTime).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Problematic Providers */}
          {stats.topProblematicProviders.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-700 mb-2">⚠️ Top Issues</h4>
              <div className="space-y-1">
                {stats.topProblematicProviders.map((provider: any, index: number) => (
                  <div key={provider.provider} className="flex justify-between items-center p-2 bg-red-50 border border-red-200 rounded">
                    <span className="font-medium">{index + 1}. {provider.provider}</span>
                    <span className="text-red-600 font-bold">{provider.issues} issues</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Events */}
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-2">Recent Events (Last 10)</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {monitoringData.events.slice(-10).reverse().map((event: any, index: number) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs border ${
                    event.eventType === 'request' && event.success
                      ? 'bg-green-50 border-green-200'
                      : event.eventType === 'rate_limit_hit'
                      ? 'bg-red-50 border-red-200'
                      : event.eventType === 'circuit_breaker_open'
                      ? 'bg-orange-50 border-orange-200'
                      : event.eventType === 'fallback_triggered'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{event.provider}</span>
                      <span className="mx-1">•</span>
                      <span>{event.dataType}</span>
                      <span className="mx-1">•</span>
                      <span className="capitalize">{event.eventType.replace('_', ' ')}</span>
                    </div>
                    <div className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {event.error && (
                    <div className="text-red-600 mt-1">{event.error}</div>
                  )}
                  {event.duration && (
                    <div className="text-gray-600 mt-1">{event.duration}ms</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
