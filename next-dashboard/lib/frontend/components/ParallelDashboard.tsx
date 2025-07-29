'use client';

/**
 * Parallel Dashboard Component
 *
 * A dashboard component that demonstrates parallel data fetching capabilities
 * for improved performance while maintaining the existing user experience.
 */

import React, { useState, lazy, Suspense } from 'react';
import { useStandardDashboardData } from '@/frontend/hooks/useParallelDashboardData';
import { ChartData } from '@/shared/types/dashboard';
import styles from './ParallelDashboard.module.css';

// Lazy load chart component
const AutomaticChart = lazy(() => import('./AutomaticChart'));

interface ParallelDashboardProps {
  enableRealTime?: boolean;
  refreshInterval?: number;
  staggerDelay?: number;
  showLoadingProgress?: boolean;
}

// Chart configuration matching the main dashboard
const CHART_CONFIGS = [
  { id: 'house-prices', dataType: 'house-prices', title: 'Average House Price Over Time' },
  { id: 'salary-income', dataType: 'salary-income', title: 'Average Household Income Over Time' },
  { id: 'inflation-cpi', dataType: 'inflation-cpi', title: 'Consumer Price Index (CPI)' },
  { id: 'core-inflation', dataType: 'core-inflation', title: 'Core Inflation Rate' },
  { id: 'fed-balance-sheet', dataType: 'fed-balance-sheet', title: 'Federal Reserve Balance Sheet' },
  { id: 'federal-funds-rate', dataType: 'federal-funds-rate', title: 'Federal Funds Rate' },
  { id: 'unemployment-rate', dataType: 'unemployment-rate', title: 'Unemployment Rate' },
  { id: 'gdp-growth', dataType: 'gdp-growth', title: 'GDP Growth Rate' },
  { id: 'money-supply-m1', dataType: 'money-supply-m1', title: 'Money Supply (M1)' },
  { id: 'money-supply-m2', dataType: 'money-supply-m2', title: 'Money Supply (M2)' },
  { id: 'treasury-10y', dataType: 'treasury-10y', title: '10-Year Treasury Yield' },
  { id: 'treasury-2y', dataType: 'treasury-2y', title: '2-Year Treasury Yield' },
];

export default function ParallelDashboard({
  enableRealTime = false,
  refreshInterval = 15 * 60 * 1000, // 15 minutes
  staggerDelay = 100, // 100ms between requests
  showLoadingProgress = true,
}: ParallelDashboardProps) {
  const [visibleCharts, setVisibleCharts] = useState<Set<string>>(
    new Set(CHART_CONFIGS.map(chart => chart.id))
  );

  // Use parallel data fetching hook
  const {
    data,
    isLoading,
    errors,
    lastUpdated,
    isAnyLoading,
    hasAnyError,
    refreshAll,
    refreshSingle,
    getLoadingProgress,
  } = useStandardDashboardData({
    autoFetch: true,
    refreshInterval: enableRealTime ? refreshInterval : undefined,
    staggerDelay,
  });

  // Handler to remove charts
  const handleRemoveChart = (chartId: string) => {
    setVisibleCharts(prev => {
      const newSet = new Set(prev);
      newSet.delete(chartId);
      return newSet;
    });
  };

  // Get loading progress
  const progress = getLoadingProgress();

  return (
    <div className={styles.container}>
      {/* Loading Progress Indicator */}
      {showLoadingProgress && (isLoading || isAnyLoading) && (
        <div className={styles.loadingProgress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className={styles.progressText}>
            Loading dashboard data... {progress.completed}/{progress.total} ({progress.percentage}%)
          </span>
        </div>
      )}

      {/* Dashboard Controls */}
      <div className={styles.controls}>
        <button 
          onClick={refreshAll}
          disabled={isAnyLoading}
          className={styles.refreshButton}
        >
          {isAnyLoading ? 'Refreshing...' : 'Refresh All Data'}
        </button>
        
        {hasAnyError && (
          <div className={styles.errorSummary}>
            ⚠️ Some data sources failed to load
          </div>
        )}
        
        <div className={styles.stats}>
          <span>Charts: {visibleCharts.size}</span>
          <span>Parallel Fetching: ✅</span>
          <span>Real-time: {enableRealTime ? '✅' : '❌'}</span>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className={styles.dashboardGrid}>
        {CHART_CONFIGS
          .filter(chart => visibleCharts.has(chart.id))
          .map((chart) => {
            const chartData = data[chart.dataType] as ChartData | null;
            const chartError = errors[chart.dataType];
            const chartLastUpdated = lastUpdated[chart.dataType];

            return (
              <div key={chart.id} className={styles.chartContainer}>
                <Suspense 
                  fallback={
                    <div className={styles.chartSkeleton}>
                      <div className={styles.skeletonHeader}></div>
                      <div className={styles.skeletonChart}></div>
                    </div>
                  }
                >
                  <div className={styles.chartWrapper}>
                    {/* Chart Header with Status */}
                    <div className={styles.chartHeader}>
                      <h3 className={styles.chartTitle}>{chart.title}</h3>
                      <div className={styles.chartStatus}>
                        {chartError ? (
                          <span className={styles.errorIndicator} title={chartError}>
                            ❌ Error
                          </span>
                        ) : chartData ? (
                          <span className={styles.successIndicator}>
                            ✅ Loaded
                          </span>
                        ) : (
                          <span className={styles.loadingIndicator}>
                            ⏳ Loading...
                          </span>
                        )}
                        <button
                          onClick={() => refreshSingle(chart.dataType)}
                          className={styles.refreshSingleButton}
                          title="Refresh this chart"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => handleRemoveChart(chart.id)}
                          className={styles.removeButton}
                          title="Remove chart"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Chart Content */}
                    {chartError ? (
                      <div className={styles.errorState}>
                        <p>Failed to load data</p>
                        <p className={styles.errorMessage}>{chartError}</p>
                        <button 
                          onClick={() => refreshSingle(chart.dataType)}
                          className={styles.retryButton}
                        >
                          Retry
                        </button>
                      </div>
                    ) : chartData ? (
                      <AutomaticChart
                        dataType={chart.dataType}
                        title={chart.title}
                        chartType="line"
                        height={400}
                        showIndicator={true}
                        indicatorPosition="top-right"
                        refreshInterval={enableRealTime ? refreshInterval : undefined}
                        fallbackData={chartData}
                        onRemove={() => handleRemoveChart(chart.id)}
                        showVisualizationSwitcher={true}
                        onVisualizationChange={(newType) => {
                          console.log(`Chart ${chart.id} visualization changed to ${newType}`);
                        }}
                        enableRealTime={enableRealTime}
                        showRealTimeIndicator={enableRealTime}
                        enableZoom={true}
                        enablePan={true}
                        enableCrossfilter={false}
                        showInteractiveControls={true}
                        onDataPointClick={(dataPoint, chartInstance) => {
                          console.log(`Chart ${chart.id} data point clicked:`, dataPoint, chartInstance);
                        }}
                      />
                    ) : (
                      <div className={styles.loadingState}>
                        <div className={styles.spinner}></div>
                        <p>Loading {chart.title}...</p>
                      </div>
                    )}

                    {/* Chart Footer with Metadata */}
                    {chartLastUpdated && (
                      <div className={styles.chartFooter}>
                        <small>
                          Last updated: {chartLastUpdated.toLocaleTimeString()}
                        </small>
                      </div>
                    )}
                  </div>
                </Suspense>
              </div>
            );
          })}
      </div>

      {/* Performance Info */}
      <div className={styles.performanceInfo}>
        <details>
          <summary>Performance Details</summary>
          <div className={styles.performanceDetails}>
            <p><strong>Parallel Fetching:</strong> Enabled</p>
            <p><strong>Stagger Delay:</strong> {staggerDelay}ms</p>
            <p><strong>Refresh Interval:</strong> {refreshInterval ? `${refreshInterval / 1000}s` : 'Disabled'}</p>
            <p><strong>Charts Loaded:</strong> {Object.keys(data).filter(key => data[key] !== null).length}/{Object.keys(data).length}</p>
            <p><strong>Errors:</strong> {Object.values(errors).filter(error => error !== null).length}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
