'use client';

import React, { Suspense, lazy, useRef, useState, useCallback } from 'react';
import DataStatusPill, { getDataStatus } from './DataStatusPill';
import InteractiveChart from './InteractiveChart';
import { ChartData } from '../types/dashboard';
import { DataSourceType } from '../types/dataSource';
import { useChartDataSource } from '../hooks/useChartDataSource';
import styles from './LazyChart.module.css';

// Lazy load Chart.js components to reduce initial bundle size
const Line = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

// Type for chart ref
type ChartRef = React.ComponentRef<typeof Line>;

// Lazy load Chart.js registration
const ChartRegistration = lazy(() => 
  import('./ChartRegistration').then(module => ({ default: module.default }))
);

// Lazy load components
const ChartSkeleton = lazy(() => 
  import('./ChartSkeleton').then(module => ({ default: module.default }))
);

const RefreshButton = lazy(() => 
  import('./RefreshButton').then(module => ({ default: module.default }))
);

interface InteractiveLazyChartProps {
  chartId: string;
  dataType: string;
  title: string;
  isLiveViewMode?: boolean;
  fallbackData?: ChartData;
  onDataSourceChange?: (newSource: DataSourceType, newData: ChartData) => void;
}

function ChartContent({ 
  data, 
  chartRef, 
  onRefresh, 
  isRefreshing 
}: { 
  data: ChartData; 
  chartRef: React.RefObject<ChartRef>; 
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <>
      <div className={styles.chartHeader}>
        <div className={styles.titleSection}>
          <DataStatusPill
            status={getDataStatus(data.lastUpdated, data.isRealData)}
            lastUpdated={data.lastUpdated}
            size="small"
          />
        </div>
        <RefreshButton onClick={onRefresh} isRefreshing={isRefreshing} />
      </div>
      <div className={styles.chartWrapper}>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartRegistration />
          <Line
            ref={chartRef}
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 750,
                easing: 'easeInOutQuart'
              },
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: false, // We're using our own title
                },
              },
              scales: {
                y: {
                  beginAtZero: false,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                  },
                },
                x: {
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                  },
                },
              },
            }}
          />
        </Suspense>
      </div>
    </>
  );
}

export default function InteractiveLazyChart({
  chartId,
  dataType,
  title,
  isLiveViewMode = false,
  fallbackData,
  onDataSourceChange,
}: InteractiveLazyChartProps) {
  const chartRef = useRef<ChartRef>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use chart-specific data source management
  const {
    data: chartData,
    isLoading,
    error,
    refresh,
    currentSource,
  } = useChartDataSource({
    chartId,
    dataType,
    autoFetch: true,
    onError: (error) => {
      console.error(`Error loading ${dataType} data for chart ${chartId}:`, error);
    },
  });

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Failed to refresh chart data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, isRefreshing]);

  // Determine which data to use
  const displayData = chartData || fallbackData;

  // Handle data source change from InteractiveChart
  const handleDataSourceChange = useCallback((newSource: DataSourceType, newData: ChartData) => {
    onDataSourceChange?.(newSource, newData);
  }, [onDataSourceChange]);

  // Loading state
  if (isLoading && !displayData) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>{title}</h2>
        </div>
        <div className={styles.chartWrapper}>
          <Suspense fallback={<div>Loading...</div>}>
            <ChartSkeleton />
          </Suspense>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !displayData) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>{title}</h2>
        </div>
        <div className={styles.chartWrapper}>
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: 'var(--foreground-secondary, #666)' 
          }}>
            <p>Error loading {dataType} data: {error.message}</p>
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!displayData) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>{title}</h2>
        </div>
        <div className={styles.chartWrapper}>
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: 'var(--foreground-secondary, #666)' 
          }}>
            <p>No data available for {dataType}</p>
            <button
              onClick={handleRefresh}
              className={styles.refreshButton}
              disabled={isRefreshing}
            >
              Load Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render chart with or without interactive wrapper
  const chartContent = (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>{title}</h2>
      </div>
      <ChartContent
        data={displayData}
        chartRef={chartRef}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
    </div>
  );

  // Wrap with InteractiveChart if in live view mode
  if (isLiveViewMode) {
    return (
      <InteractiveChart
        chartId={chartId}
        dataType={dataType}
        title={title}
        isLiveViewMode={isLiveViewMode}
        onDataSourceChange={handleDataSourceChange}
      >
        {chartContent}
      </InteractiveChart>
    );
  }

  return chartContent;
}
