'use client';

/**
 * Automatic Chart Component
 *
 * A chart component that automatically attempts to load live data first,
 * then falls back to historical data if live data is unavailable. Includes
 * visual indicators and retry functionality.
 */

import React, { Suspense } from 'react';
import { useAutomaticDataSource } from '../hooks/useAutomaticDataSource';
import { useIsEditMode } from '../context/ViewModeContext';
import { ChartData } from '../types/dashboard';
import DataSourceIndicator from './DataSourceIndicator';
import ChartSkeleton from './ChartSkeleton';
import { getChartConfig } from '../config/chartConfiguration';
import styles from './AutomaticChart.module.css';

// Lazy load the chart component for better performance
const DynamicChart = React.lazy(() => import('./DynamicChart'));

export interface AutomaticChartProps {
  dataType: string;
  title: string;
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut';
  className?: string;
  height?: number;
  showIndicator?: boolean;
  indicatorPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  refreshInterval?: number;
  fallbackData?: ChartData;
  onDataChange?: (data: ChartData | null, status: string) => void;
  onRemove?: () => void;
}

export default function AutomaticChart({
  dataType,
  title,
  chartType = 'line',
  className = '',
  height = 400,
  showIndicator = true,
  indicatorPosition = 'top-right',
  refreshInterval,
  fallbackData,
  onDataChange,
  onRemove,
}: AutomaticChartProps) {
  const isEditMode = useIsEditMode();
  const {
    data,
    isLoading,
    error,
    status,
    lastUpdated,
    lastLiveAttempt,
    refresh,
    forceRetryLive,
  } = useAutomaticDataSource<ChartData>({
    dataType,
    autoFetch: true,
    refreshInterval,
    retryOnError: true,
  });

  // Notify parent of data changes
  React.useEffect(() => {
    if (onDataChange) {
      onDataChange(data, status);
    }
  }, [data, status, onDataChange]);

  // Determine which data to display
  const displayData = data || fallbackData;

  // Handle retry
  const handleRetry = React.useCallback(async () => {
    try {
      await forceRetryLive();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [forceRetryLive]);

  // Handle refresh
  const handleRefresh = React.useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, [refresh]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Data source indicator */}
      {showIndicator && (
        <DataSourceIndicator
          status={status}
          lastUpdated={lastUpdated}
          lastLiveAttempt={lastLiveAttempt}
          onRetry={handleRetry}
          position={indicatorPosition}
          size="medium"
          dataType={dataType}
          timePeriod={getChartConfig(dataType)?.timePeriod.default}
        />
      )}

      {/* Chart header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        
        <div className={styles.actions}>
          {/* Historical data retry button - positioned to the left */}
          {status === 'historical-fallback' && (
            <button
              className={styles.retryButton}
              onClick={handleRetry}
              disabled={isLoading}
              title="Retry live data"
              aria-label="Retry fetching live data"
            >
              <span className={isLoading ? styles.spinning : ''}>
                🔄
              </span>
            </button>
          )}

          {/* Refresh button */}
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh data"
            aria-label="Refresh chart data"
          >
            <span className={isLoading ? styles.spinning : ''}>
              🔄
            </span>
          </button>

          {/* Remove button */}
          {onRemove && isEditMode && (
            <button
              className={styles.removeButton}
              onClick={onRemove}
              title="Remove chart"
              aria-label="Remove chart"
            >
              🗑️ Remove
            </button>
          )}

          {/* Status indicator in header */}
          {status === 'historical-fallback' && (
            <span className={styles.fallbackBadge} title="Showing historical data">
              Historical Data
            </span>
          )}
        </div>
      </div>

      {/* Chart content */}
      <div className={styles.chartWrapper} style={{ height }}>
        {isLoading && !displayData ? (
          <ChartSkeleton height={height} />
        ) : error && !displayData ? (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorMessage}>
              <h4>Unable to load chart data</h4>
              <p>{error.message}</p>
              <button
                className={styles.retryButton}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : displayData ? (
          <Suspense fallback={<ChartSkeleton height={height} />}>
            <div className={styles.chartContainer}>
              <DynamicChart
                data={displayData}
                title=""
                type={`${chartType}-chart` as 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart'}
                dataType={dataType}
                hideHeader={true}
              />
              
              {/* Loading overlay for refresh */}
              {isLoading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.loadingSpinner}>
                    <span className={styles.spinning}>🔄</span>
                    <span>Updating...</span>
                  </div>
                </div>
              )}
            </div>
          </Suspense>
        ) : (
          <div className={styles.noDataState}>
            <div className={styles.noDataIcon}>📊</div>
            <div className={styles.noDataMessage}>
              <h4>No data available</h4>
              <p>Unable to load chart data at this time.</p>
              <button
                className={styles.retryButton}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Try Loading Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer with data source info */}
      {displayData && (
        <div className={styles.footer}>
          <div className={styles.dataInfo}>
            {lastUpdated && (
              <span className={styles.timestamp}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            
            {displayData.dataSource && (
              <span className={styles.source}>
                Source: {displayData.dataSource}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for use in grids or tight spaces
export function CompactAutomaticChart({
  dataType,
  title,
  chartType = 'line',
  className = '',
  height = 300,
  fallbackData,
}: Omit<AutomaticChartProps, 'showIndicator' | 'indicatorPosition' | 'onDataChange'>) {
  const {
    data,
    isLoading,
    status,
    forceRetryLive,
  } = useAutomaticDataSource<ChartData>({
    dataType,
    autoFetch: true,
    retryOnError: true,
  });

  const displayData = data || fallbackData;

  const handleRetry = React.useCallback(async () => {
    try {
      await forceRetryLive();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [forceRetryLive]);

  return (
    <div className={`${styles.compactContainer} ${className}`}>
      <div className={styles.compactHeader}>
        <h4 className={styles.compactTitle}>{title}</h4>
        
        {/* Compact status indicator */}
        {status === 'historical-fallback' && (
          <div className={styles.compactIndicator}>
            <span className={styles.compactBadge} title="Historical data">
              📊
            </span>
            <button
              className={styles.compactRetry}
              onClick={handleRetry}
              disabled={isLoading}
              title="Retry live data"
              aria-label="Retry fetching live data"
            >
              🔄
            </button>
          </div>
        )}
      </div>

      <div className={styles.compactChartWrapper} style={{ height }}>
        {isLoading && !displayData ? (
          <ChartSkeleton height={height} />
        ) : displayData ? (
          <Suspense fallback={<ChartSkeleton height={height} />}>
            <DynamicChart
              data={displayData}
              title=""
              type={`${chartType}-chart` as 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart'}
              dataType={dataType}
              hideHeader={true}
            />
          </Suspense>
        ) : (
          <div className={styles.compactNoData}>
            <span>No data</span>
            <button onClick={handleRetry} disabled={isLoading}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
