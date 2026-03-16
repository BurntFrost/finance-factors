'use client';

/**
 * Parallel Dashboard Component
 *
 * A dashboard component that demonstrates parallel data fetching capabilities
 * for improved performance while maintaining the existing user experience.
 */

import React, { useState, useCallback, memo, lazy, Suspense } from 'react';
import { useStandardDashboardData } from '@/frontend/hooks/useParallelDashboardData';
import { ChartData } from '@/shared/types/dashboard';
import { formatLastUpdatedTime } from '@/frontend/lib/utils';
import { DASHBOARD_COPY, ERROR_COPY } from '@/shared/constants/plainLanguageCopy';
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

interface ChartSlotProps {
  chart: typeof CHART_CONFIGS[number];
  chartData: ChartData | null;
  chartError: string | null;
  chartLastUpdated: Date | null;
  enableRealTime: boolean;
  refreshInterval?: number;
  onRemove: (chartId: string) => void;
  onRefreshSingle: (dataType: string) => void;
}

const ChartSlot = memo(function ChartSlot({
  chart, chartData, chartError, chartLastUpdated,
  enableRealTime, refreshInterval, onRemove, onRefreshSingle,
}: ChartSlotProps) {
  return (
    <div className={styles.chartContainer}>
      <Suspense fallback={<div className={styles.chartSkeleton}><div className={styles.skeletonHeader}></div><div className={styles.skeletonChart}></div></div>}>
        {chartError ? (
          <div className={styles.errorState}>
            <p>{ERROR_COPY.unableToLoad}</p>
            <p className={styles.errorMessage}>{chartError}</p>
            <button onClick={() => onRefreshSingle(chart.dataType)} className={styles.retryButton}>{ERROR_COPY.tryAgain}</button>
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
            onRemove={() => onRemove(chart.id)}
            showVisualizationSwitcher={true}
            enableRealTime={enableRealTime}
            showRealTimeIndicator={enableRealTime}
            enableZoom={true}
            enablePan={true}
            enableCrossfilter={false}
            showInteractiveControls={true}
          />
        ) : (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading {chart.title}...</p>
          </div>
        )}
        {chartLastUpdated != null && (
          <div className={styles.chartFooter}>
            <small>Last updated: {formatLastUpdatedTime(chartLastUpdated)}</small>
          </div>
        )}
      </Suspense>
    </div>
  );
});

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
    isInitialLoad,
  } = useStandardDashboardData({
    autoFetch: true,
    refreshInterval: enableRealTime ? refreshInterval : undefined,
    staggerDelay,
  });

  // Handler to remove charts
  const handleRemoveChart = useCallback((chartId: string) => {
    setVisibleCharts(prev => {
      const newSet = new Set(prev);
      newSet.delete(chartId);
      return newSet;
    });
  }, []);

  // Get loading progress
  const progress = getLoadingProgress();



  return (
    <div className={styles.container}>
      {/* Loading Progress Indicator - Only show during initial load or user-triggered refresh */}
      {showLoadingProgress && isInitialLoad && (isLoading || isAnyLoading) && (
        <div className={styles.loadingProgress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {DASHBOARD_COPY.loadingCharts} {progress.completed}/{progress.total} ({progress.percentage}%)
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
          {isAnyLoading ? 'Refreshing…' : DASHBOARD_COPY.refreshAll}
        </button>
        
        {hasAnyError && (
          <div className={styles.errorSummary}>
            ⚠️ {ERROR_COPY.someSourcesFailed}
          </div>
        )}
        
        <div className={styles.stats}>
          <span>Charts: {visibleCharts.size}</span>
          <span>Auto-refresh: {enableRealTime ? 'On' : 'Off'}</span>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className={styles.dashboardGrid}>
        {CHART_CONFIGS
          .filter(chart => visibleCharts.has(chart.id))
          .map((chart) => (
            <ChartSlot
              key={chart.id}
              chart={chart}
              chartData={data[chart.dataType] as ChartData | null}
              chartError={errors[chart.dataType]}
              chartLastUpdated={lastUpdated[chart.dataType]}
              enableRealTime={enableRealTime}
              refreshInterval={refreshInterval}
              onRemove={handleRemoveChart}
              onRefreshSingle={refreshSingle}
            />
          ))}
      </div>

      {/* Technical details (collapsed by default for non-expert users) */}
      <div className={styles.performanceInfo}>
        <details>
          <summary>Technical details</summary>
          <div className={styles.performanceDetails}>
            <p><strong>Charts loaded:</strong> {Object.keys(data).filter(key => data[key] !== null).length} of {Object.keys(data).length}</p>
            <p><strong>Refresh:</strong> {refreshInterval ? `every ${refreshInterval / 60000} min` : 'manual only'}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
