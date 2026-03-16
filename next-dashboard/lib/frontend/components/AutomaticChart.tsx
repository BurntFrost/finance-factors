'use client';

/**
 * Automatic Chart Component
 *
 * A chart component that automatically attempts to load live data first,
 * then falls back to historical data if live data is unavailable. Includes
 * visual indicators and retry functionality.
 */

import React, { Suspense, useRef, useCallback, useState, useMemo, memo } from 'react';
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
import DataFetchErrorBoundary from './DataFetchErrorBoundary';
import { getChartConfig } from '@/shared/config/chartConfiguration';
import { CHART_PLAIN_DESCRIPTIONS, CHART_CONTROL_COPY, ERROR_COPY } from '@/shared/constants/plainLanguageCopy';
import { formatLastUpdatedTime } from '@/frontend/lib/utils';
import styles from './AutomaticChart.module.css';

function formatSummaryValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

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
  /** When data is provided by parent (e.g. parallel fetch), use this for the indicator instead of inferring from hook. */
  dataSourceStatusFromParent?: 'live' | 'historical-fallback';
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
  /** When false, zoom/pan/reset buttons are hidden and chart interaction is hover-only (tooltips). */
  showInteractiveControls?: boolean;
  /** When false, footer refresh button is hidden. Last updated and source still shown. */
  showFooterRefresh?: boolean;
}

const AutomaticChartInternal = memo(function AutomaticChartInternal({
  dataType,
  title,
  chartType = 'line',
  className = '',
  height = 400,
  showIndicator = true,
  indicatorPosition = 'top-right',
  refreshInterval,
  fallbackData,
  dataSourceStatusFromParent,
  onDataChange,
  onRemove,
  showVisualizationSwitcher = true,
  onVisualizationChange,
  enableRealTime = false,
  showRealTimeIndicator = false,
  // Enhanced interactive features with defaults
  enableZoom = false,
  enablePan = false,
  enableCrossfilter = false,
  onDataPointClick,
  onDataPointHover,
  showInteractiveControls = false,
  showFooterRefresh: _showFooterRefresh = false,
}: AutomaticChartProps) {
  const isEditMode = useIsEditMode();
  const chartRef = useRef<HTMLDivElement>(null);
  const dynamicChartRef = useRef<Chart | null>(null);
  const [currentChartType, setCurrentChartType] = useState(chartType);
  const [isChangingVisualization, setIsChangingVisualization] = useState(false);
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
    autoFetch: !fallbackData, // Don't auto-fetch if fallback data is provided
    refreshInterval,
    retryOnError: true,
  });



  // Determine which data to use - WebSocket data takes priority, then fetched data, then fallback data
  const rawDisplayData = enableRealTime && wsData ? wsData : (data || fallbackData);
  // When we have display data but hook is still "loading" (e.g. fallbackData passed, autoFetch false), use parent's status if provided
  const displayStatus =
    enableRealTime && wsConnected
      ? 'live'
      : dataSourceStatusFromParent != null && fallbackData
        ? dataSourceStatusFromParent
        : status === 'loading' && rawDisplayData && !isLoading
          ? (fallbackData ? 'historical-fallback' : 'live')
          : status;
  const _displayStatus = displayStatus;
  const _displayError = enableRealTime ? _wsError : error?.message;

  // Adapt data for the current chart type
  const displayData = React.useMemo(() => {
    if (!rawDisplayData) return rawDisplayData;
    return adaptChartDataForType(rawDisplayData, currentChartType);
  }, [rawDisplayData, currentChartType]);

  // Sync chartType prop with internal state
  React.useEffect(() => {
    setCurrentChartType(chartType);
  }, [chartType]);

  // Notify parent of data changes
  React.useEffect(() => {
    if (onDataChange) {
      onDataChange(data, status);
    }
  }, [data, status, onDataChange]);

  const handleChartReadyCapture = useCallback((chart: any) => {
    dynamicChartRef.current = chart;
  }, []);

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

  // Data summary for at-a-glance understanding (line/bar time series)
  const dataSummary = useMemo(() => {
    if (!displayData?.datasets?.length || !displayData.labels?.length) return null;
    const ds = displayData.datasets[0];
    const values = (ds?.data ?? []).filter((v): v is number => typeof v === 'number');
    if (values.length === 0) return null;
    const labels = displayData.labels;
    const latest = values[values.length - 1];
    const first = values[0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latestLabel = labels[labels.length - 1];
    const firstLabel = labels[0];
    const pctChange = typeof first === 'number' && first !== 0
      ? (((latest - first) / first) * 100).toFixed(1)
      : null;
    const seriesLabel = ds?.label ?? 'Value';
    return {
      seriesLabel,
      latest,
      latestLabel: String(latestLabel ?? ''),
      min,
      max,
      firstLabel: String(firstLabel ?? ''),
      pctChange: pctChange != null ? parseFloat(pctChange) : null,
    };
  }, [displayData]);

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
  const dashboardElement = React.useMemo(() => {
    // Move displayLastUpdated calculation inside useMemo to fix dependency warning
    const displayLastUpdated = enableRealTime && wsLastUpdate ? wsLastUpdate : (lastUpdated || (fallbackData ? new Date() : null));

    return {
      id: `auto-chart-${dataType}`,
      type: `${currentChartType}-chart` as const,
      dataType,
      title,
      data: displayData,
      config: {},
      isRealData: enableRealTime ? wsConnected : (displayStatus !== 'historical-fallback'),
      dataSource: enableRealTime && wsConnected ? 'WebSocket' : (displayStatus === 'historical-fallback' ? 'Historical Data' : 'API'),
      createdAt: new Date(),
      updatedAt: displayLastUpdated || new Date(),
      lastUpdated: displayLastUpdated || undefined,
    };
  }, [dataType, currentChartType, title, displayData, enableRealTime, wsConnected, displayStatus, wsLastUpdate, lastUpdated, fallbackData]);

  // Handle export completion
  const _handleExportComplete = React.useCallback((format: string) => {
    console.log(`Export completed: ${format} for chart ${title}`);
    // Could show success notification
  }, [title]);

  // Handle refresh - combines both refresh and retry functionality
  const handleRefresh = React.useCallback(async () => {
    try {
      if (status === 'historical-fallback') {
        // If showing historical data, try to retry live data first
        await forceRetryLive();
      } else {
        // Otherwise, do a regular refresh
        await refresh();
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, [refresh, forceRetryLive, status]);

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Data source indicator */}
      {showIndicator && (
        <DataSourceIndicator
          status={displayStatus}
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
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{title}</h3>
          {CHART_PLAIN_DESCRIPTIONS[dataType] && (
            <p className={styles.plainSubtitle} title={CHART_PLAIN_DESCRIPTIONS[dataType]}>
              {CHART_PLAIN_DESCRIPTIONS[dataType]}
            </p>
          )}
          {/* Data summary: key values at a glance; hover chart for exact values */}
          {dataSummary && (currentChartType === 'line' || currentChartType === 'bar') && (
            <div className={styles.dataSummary} role="status" aria-live="polite">
              <span className={styles.dataSummaryItem}>
                <span className={styles.dataSummaryLabel}>Latest</span>
                <span className={styles.dataSummaryValue}>{formatSummaryValue(dataSummary.latest)}</span>
                {dataSummary.latestLabel && (
                  <span className={styles.dataSummaryMeta}>({dataSummary.latestLabel})</span>
                )}
              </span>
              <span className={styles.dataSummaryDivider} aria-hidden>·</span>
              <span className={styles.dataSummaryItem}>
                <span className={styles.dataSummaryLabel}>Range</span>
                <span className={styles.dataSummaryValue}>{formatSummaryValue(dataSummary.min)} – {formatSummaryValue(dataSummary.max)}</span>
              </span>
              {dataSummary.pctChange != null && (
                <>
                  <span className={styles.dataSummaryDivider} aria-hidden>·</span>
                  <span className={styles.dataSummaryItem}>
                    <span className={styles.dataSummaryLabel}>Change</span>
                    <span className={styles.dataSummaryValue}>
                      {dataSummary.pctChange >= 0 ? '+' : ''}{dataSummary.pctChange}% since {dataSummary.firstLabel}
                    </span>
                  </span>
                </>
              )}
              <span className={styles.dataSummaryHint}>Hover over the chart for exact values.</span>
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          {/* Crossfilter selection feedback */}
          {enableCrossfilter && selectedDataPoints.length > 0 && (
            <span className={styles.selectionIndicator} role="status" aria-live="polite">
              {selectedDataPoints.length} selected
            </span>
          )}
          {/* Real-time status indicator */}
          {enableRealTime && showRealTimeIndicator && (
            <RealTimeStatusIndicator
              position="top-right"
              showDetails={false}
            />
          )}



          {/* Remove button */}
          {onRemove && isEditMode && (
            <button
              className={styles.removeButton}
              onClick={onRemove}
              title={CHART_CONTROL_COPY.removeChart}
              aria-label={CHART_CONTROL_COPY.removeChart}
            >
              🗑️ Remove
            </button>
          )}

          {/* Status indicator in header */}
          {displayStatus === 'historical-fallback' && !enableRealTime && (
            <span className={styles.fallbackBadge} title="Showing sample data">
              Sample data
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
        {(isLoading && !displayData && !fallbackData) ? (
          <ChartSkeleton height={height} />
        ) : error && !displayData ? (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorMessage}>
              <h4>{ERROR_COPY.unableToLoad}</h4>
              <p>{error.message}</p>
              {status === 'historical-fallback' && (
                <p className={styles.errorHint}>{ERROR_COPY.willUseSample}</p>
              )}
              <button
                className={styles.retryButton}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {ERROR_COPY.tryAgain}
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
                enableZoom={showInteractiveControls ? enableZoom : false}
                enablePan={showInteractiveControls ? enablePan : false}
                enableCrossfilter={enableCrossfilter}
                onDataPointClick={handleDataPointClick}
                onDataPointHover={handleDataPointHover}
                onChartReady={handleChartReadyCapture}
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
              <h4>{ERROR_COPY.noDataAvailable}</h4>
              <p>{ERROR_COPY.noDataHint}</p>
              <button
                className={styles.retryButton}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {ERROR_COPY.tryLoadingData}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer: data source and last updated (no refresh button) */}
      {displayData && (
        <div className={styles.footer}>
          <div className={styles.dataInfo}>
            <span className={styles.timestamp}>
              Last updated: {formatLastUpdatedTime(lastUpdated)}
            </span>
            <span className={styles.source}>
              {displayStatus === 'historical-fallback' ? 'Source: Sample data' : 'Source: Up-to-date data'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Wrapped version with error boundary to prevent infinite loops
export default function AutomaticChart(props: AutomaticChartProps) {
  return (
    <DataFetchErrorBoundary
      dataType={props.dataType}
      maxRetries={2}
      infiniteLoopThreshold={3}
      infiniteLoopTimeWindow={3000}
    >
      <AutomaticChartInternal {...props} />
    </DataFetchErrorBoundary>
  );
}

// Compact version for use in grids or tight spaces
function CompactAutomaticChartInternal({
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
    autoFetch: !fallbackData, // Don't auto-fetch if fallback data is provided
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

// Wrapped compact version with error boundary
export function CompactAutomaticChart(props: Omit<AutomaticChartProps, 'showIndicator' | 'indicatorPosition' | 'onDataChange'>) {
  return (
    <DataFetchErrorBoundary
      dataType={props.dataType}
      maxRetries={2}
      infiniteLoopThreshold={3}
      infiniteLoopTimeWindow={3000}
    >
      <CompactAutomaticChartInternal {...props} />
    </DataFetchErrorBoundary>
  );
}
