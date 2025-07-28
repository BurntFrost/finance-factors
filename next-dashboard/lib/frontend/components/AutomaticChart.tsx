'use client';

/**
 * Automatic Chart Component
 *
 * A chart component that automatically attempts to load live data first,
 * then falls back to historical data if live data is unavailable. Includes
 * visual indicators and retry functionality.
 */

import React, { Suspense, useRef, useCallback, useState } from 'react';
import type { Chart } from 'chart.js';
import { useAutomaticDataSource } from '@/frontend/hooks/useAutomaticDataSource';
// import { useWebSocket } from '@/backend/services/websocketService'; // Temporarily disabled for SSR
import { useIsEditMode } from '@/frontend/context/ViewModeContext';
import { ChartData, VisualizationType } from '@/shared/types/dashboard';
import { adaptChartDataForType } from '@/shared/utils/data-transform';
import DataSourceIndicator from './DataSourceIndicator';
import RealTimeStatusIndicator from './RealTimeStatusIndicator';
import ExportMenu from './ExportMenu';
import ChartSkeleton from './ChartSkeleton';
import { getChartConfig } from '@/shared/config/chartConfiguration';
import {
  getInteractiveChartOptions,
  resetChartZoom,
  toggleChartZoom,
  toggleChartPan
} from '@/shared/config/interactiveChartConfiguration';
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
  showVisualizationSwitcher?: boolean;
  onVisualizationChange?: (newType: 'line' | 'bar' | 'pie' | 'doughnut') => void;
  enableRealTime?: boolean;
  showRealTimeIndicator?: boolean;
  // Enhanced interactive features
  enableZoom?: boolean;
  enablePan?: boolean;
  enableCrossfilter?: boolean;
  onDataPointClick?: (dataPoint: any, chart: Chart) => void;
  onDataPointHover?: (dataPoint: any, chart: Chart) => void;
  showInteractiveControls?: boolean;
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
  showVisualizationSwitcher = true,
  onVisualizationChange,
  enableRealTime = false,
  showRealTimeIndicator = false,
  // Enhanced interactive features with defaults
  enableZoom = true,
  enablePan = true,
  enableCrossfilter = false,
  onDataPointClick,
  onDataPointHover,
  showInteractiveControls = true,
}: AutomaticChartProps) {
  const isEditMode = useIsEditMode();
  const chartRef = useRef<HTMLDivElement>(null);
  const dynamicChartRef = useRef<Chart | null>(null);
  const [currentChartType, setCurrentChartType] = React.useState(chartType);
  const [isChangingVisualization, setIsChangingVisualization] = React.useState(false);

  // Interactive chart state
  const [isZoomEnabled, setIsZoomEnabled] = useState(enableZoom);
  const [isPanEnabled, setIsPanEnabled] = useState(enablePan);
  const [selectedDataPoints, setSelectedDataPoints] = useState<any[]>([]);

  // Use WebSocket for real-time data if enabled (temporarily disabled for SSR)
  const wsData = null;
  const wsConnected = false;
  const _wsError = null;
  const wsLastUpdate = null;

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

  // Determine which data to use - WebSocket data takes priority if available
  const rawDisplayData = enableRealTime && wsData ? wsData : (data || fallbackData);
  const _displayStatus = enableRealTime && wsConnected ? 'live' : status;
  const _displayError = enableRealTime ? _wsError : error?.message;
  const displayLastUpdated = enableRealTime && wsLastUpdate ? wsLastUpdate : lastUpdated;

  // Adapt data for the current chart type
  const displayData = React.useMemo(() => {
    if (!rawDisplayData) return rawDisplayData;
    return adaptChartDataForType(rawDisplayData, currentChartType);
  }, [rawDisplayData, currentChartType]);

  // Sync chartType prop with internal state
  React.useEffect(() => {
    if (chartType !== currentChartType) {
      setCurrentChartType(chartType);
    }
  }, [chartType, currentChartType]);

  // Notify parent of data changes
  React.useEffect(() => {
    if (onDataChange) {
      onDataChange(data, status);
    }
  }, [data, status, onDataChange]);

  // Interactive chart handlers
  const handleDataPointClick = useCallback((dataPoint: any, chart: Chart) => {
    if (enableCrossfilter) {
      setSelectedDataPoints(prev => {
        const isSelected = prev.some(p =>
          p.datasetIndex === dataPoint.datasetIndex && p.dataIndex === dataPoint.dataIndex
        );

        if (isSelected) {
          return prev.filter(p =>
            !(p.datasetIndex === dataPoint.datasetIndex && p.dataIndex === dataPoint.dataIndex)
          );
        } else {
          return [...prev, dataPoint];
        }
      });
    }

    if (onDataPointClick) {
      onDataPointClick(dataPoint, chart);
    }
  }, [enableCrossfilter, onDataPointClick]);

  const handleDataPointHover = useCallback((dataPoint: any, chart: Chart) => {
    if (onDataPointHover) {
      onDataPointHover(dataPoint, chart);
    }
  }, [onDataPointHover]);

  // Interactive controls handlers
  const handleResetZoom = useCallback(() => {
    if (dynamicChartRef.current) {
      resetChartZoom(dynamicChartRef.current);
    }
  }, []);

  const handleToggleZoom = useCallback(() => {
    if (dynamicChartRef.current) {
      const newZoomState = !isZoomEnabled;
      setIsZoomEnabled(newZoomState);
      toggleChartZoom(dynamicChartRef.current, newZoomState);
    }
  }, [isZoomEnabled]);

  const handleTogglePan = useCallback(() => {
    if (dynamicChartRef.current) {
      const newPanState = !isPanEnabled;
      setIsPanEnabled(newPanState);
      toggleChartPan(dynamicChartRef.current, newPanState);
    }
  }, [isPanEnabled]);

  // Handle visualization type changes
  const handleVisualizationChange = React.useCallback(async (newVisualization: VisualizationType) => {
    if (newVisualization.id === `${currentChartType}-chart`) {
      return; // No change needed
    }

    const previousChartType = currentChartType;
    setIsChangingVisualization(true);

    try {
      // Extract chart type from visualization ID (e.g., 'line-chart' -> 'line')
      const newChartType = newVisualization.id.replace('-chart', '') as 'line' | 'bar' | 'pie' | 'doughnut';

      // Validate the new chart type
      if (!['line', 'bar', 'pie', 'doughnut'].includes(newChartType)) {
        throw new Error(`Invalid chart type: ${newChartType}`);
      }

      // Check if data can be adapted for the new chart type
      if (displayData) {
        try {
          adaptChartDataForType(displayData, newChartType);
        } catch (adaptError) {
          console.warn('Data adaptation failed, but continuing with chart type change:', adaptError);
        }
      }

      setCurrentChartType(newChartType);

      // Notify parent component if callback provided
      if (onVisualizationChange) {
        onVisualizationChange(newChartType);
      }
    } catch (error) {
      console.error('Failed to change visualization type:', error);

      // Revert to previous chart type on error
      setCurrentChartType(previousChartType);

      // Show user-friendly error message (could be enhanced with toast notifications)
      if (typeof window !== 'undefined') {
        console.warn(`Unable to switch to ${newVisualization.name}. Please try again.`);
      }
    } finally {
      // Add a small delay for smooth transition
      setTimeout(() => {
        setIsChangingVisualization(false);
      }, 300);
    }
  }, [currentChartType, onVisualizationChange, displayData]);

  // Determine which data to display (already defined above with WebSocket integration)
  // const displayData = data || fallbackData; // Moved to WebSocket integration section

  // Handle retry
  const handleRetry = React.useCallback(async () => {
    try {
      await forceRetryLive();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [forceRetryLive]);

  // Create dashboard element for export
  const dashboardElement = React.useMemo(() => ({
    id: `auto-chart-${dataType}`,
    type: `${currentChartType}-chart` as const,
    dataType,
    title,
    data: displayData,
    config: {},
    isRealData: enableRealTime ? wsConnected : (status !== 'historical-fallback'),
    dataSource: enableRealTime && wsConnected ? 'WebSocket' : (status === 'historical-fallback' ? 'Historical Data' : 'API'),
    createdAt: new Date(),
    updatedAt: displayLastUpdated || new Date(),
    lastUpdated: displayLastUpdated || undefined,
  }), [dataType, currentChartType, title, displayData, enableRealTime, wsConnected, status, displayLastUpdated]);

  // Handle export completion
  const _handleExportComplete = React.useCallback((format: string) => {
    console.log(`Export completed: ${format} for chart ${title}`);
    // Could show success notification
  }, [title]);

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
          {/* Interactive controls */}
          {showInteractiveControls && displayData && (
            <div className={styles.interactiveControls}>
              <button
                className={`${styles.controlButton} ${isZoomEnabled ? styles.active : ''}`}
                onClick={handleToggleZoom}
                title={`${isZoomEnabled ? 'Disable' : 'Enable'} zoom`}
                aria-label={`${isZoomEnabled ? 'Disable' : 'Enable'} chart zoom`}
              >
                🔍
              </button>
              <button
                className={`${styles.controlButton} ${isPanEnabled ? styles.active : ''}`}
                onClick={handleTogglePan}
                title={`${isPanEnabled ? 'Disable' : 'Enable'} pan`}
                aria-label={`${isPanEnabled ? 'Disable' : 'Enable'} chart pan`}
              >
                ✋
              </button>
              <button
                className={styles.controlButton}
                onClick={handleResetZoom}
                title="Reset zoom and pan"
                aria-label="Reset chart zoom and pan"
              >
                🏠
              </button>
              {enableCrossfilter && selectedDataPoints.length > 0 && (
                <span className={styles.selectionIndicator}>
                  {selectedDataPoints.length} selected
                </span>
              )}
            </div>
          )}

          {/* Real-time status indicator */}
          {enableRealTime && showRealTimeIndicator && (
            <RealTimeStatusIndicator
              position="top-right"
              showDetails={false}
            />
          )}

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
          {status === 'historical-fallback' && !enableRealTime && (
            <span className={styles.fallbackBadge} title="Showing historical data">
              Historical Data
            </span>
          )}

          {/* WebSocket status indicator */}
          {enableRealTime && wsConnected && (
            <span className={styles.liveBadge} title="Live data connection active">
              🟢 Live
            </span>
          )}

          {/* Export menu */}
          {displayData && (
            <ExportMenu
              element={dashboardElement}
              onExportComplete={_handleExportComplete}
            />
          )}
        </div>
      </div>

      {/* Chart content */}
      <div className={styles.chartWrapper} style={{ height }} ref={chartRef}>
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
                type={`${currentChartType}-chart` as 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart'}
                dataType={dataType}
                hideHeader={true}
                hideFooter={true}
                onVisualizationChange={showVisualizationSwitcher ? handleVisualizationChange : undefined}
                onRemove={onRemove}
                isChangingVisualization={isChangingVisualization}
                enableZoom={isZoomEnabled}
                enablePan={isPanEnabled}
                enableCrossfilter={enableCrossfilter}
                onDataPointClick={handleDataPointClick}
                onDataPointHover={handleDataPointHover}
                onChartReady={(chart) => {
                  dynamicChartRef.current = chart;
                }}
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

      {/* Footer with data source info and refresh button */}
      {displayData && (
        <div className={styles.footer}>
          <div className={styles.dataInfo}>
            {lastUpdated && (
              <span className={styles.timestamp}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            <span className={styles.source}>
              Source: Live API Data
            </span>
          </div>

          {/* Refresh button in footer */}
          <button
            className={styles.footerRefreshButton}
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh data"
            aria-label="Refresh chart data"
          >
            <span className={isLoading ? styles.spinning : ''}>
              🔄
            </span>
          </button>
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
              hideFooter={true}
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
