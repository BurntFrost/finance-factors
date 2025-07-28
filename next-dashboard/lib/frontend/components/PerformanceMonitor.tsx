'use client';

import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  cacheHitRate: number;
  memoryUsage: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * Performance Monitor Component
 * 
 * Tracks and displays real-time performance metrics including:
 * - Page load time
 * - Component render time
 * - Bundle size impact
 * - Cache hit rates
 * - Memory usage
 */
export default function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false,
  onMetricsUpdate 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    bundleSize: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();

    // Measure initial load time
    const measureLoadTime = () => {
      const loadTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, loadTime }));
    };

    // Measure memory usage
    const measureMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    // Measure bundle size from navigation timing
    const measureBundleSize = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const bundleSize = navigation.transferSize / 1024; // KB
        setMetrics(prev => ({ ...prev, bundleSize }));
      }
    };

    // Measure render time
    const measureRenderTime = () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    };

    // Initial measurements
    measureLoadTime();
    measureMemoryUsage();
    measureBundleSize();
    measureRenderTime();

    // Set up periodic measurements
    const interval = setInterval(() => {
      measureMemoryUsage();
    }, 5000);

    // Measure cache hit rate from API calls
    const measureCacheHitRate = async () => {
      try {
        const response = await fetch('/api/performance?category=cache');
        const data = await response.json();
        if (data.success && data.data.cache) {
          const cacheStats = data.data.cache;
          const totalRequests = cacheStats.hits + cacheStats.misses;
          const cacheHitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0;
          setMetrics(prev => ({ ...prev, cacheHitRate }));
        }
      } catch (error) {
        console.warn('Failed to fetch cache metrics:', error);
      }
    };

    measureCacheHitRate();

    return () => {
      clearInterval(interval);
    };
  }, [enabled]);

  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!enabled) return null;

  const formatNumber = (num: number, decimals = 2) => {
    return num.toFixed(decimals);
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Performance Monitor (Ctrl+Shift+P)"
      >
        📊
      </button>

      {/* Performance panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Monitor
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Load Time:</span>
              <span className={getPerformanceColor(metrics.loadTime, { good: 1000, warning: 3000 })}>
                {formatNumber(metrics.loadTime)}ms
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Render Time:</span>
              <span className={getPerformanceColor(metrics.renderTime, { good: 500, warning: 1500 })}>
                {formatNumber(metrics.renderTime)}ms
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Bundle Size:</span>
              <span className={getPerformanceColor(metrics.bundleSize, { good: 500, warning: 1000 })}>
                {formatNumber(metrics.bundleSize)}KB
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Cache Hit Rate:</span>
              <span className={getPerformanceColor(100 - metrics.cacheHitRate, { good: 20, warning: 50 })}>
                {formatNumber(metrics.cacheHitRate)}%
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Memory Usage:</span>
              <span className={getPerformanceColor(metrics.memoryUsage, { good: 50, warning: 100 })}>
                {formatNumber(metrics.memoryUsage)}MB
              </span>
            </div>
          </div>

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div>Press Ctrl+Shift+P to toggle</div>
                <div>Updates every 5 seconds</div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Hook for using performance metrics in other components
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    bundleSize: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
  });

  return {
    metrics,
    updateMetrics: setMetrics,
  };
}
