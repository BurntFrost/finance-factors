'use client';

import React, { Suspense, lazy, useRef, useState, useCallback } from 'react';
import { ChartData } from '../types/dashboard';
import { DataSourceType } from '../types/dataSource';
import DataStatusPill, { getDataStatus } from './DataStatusPill';
import InteractiveChart from './InteractiveChart';
import { useChartDataSource } from '../hooks/useChartDataSource';
import { useIsEditMode } from '../context/ViewModeContext';
import { getChartConfig, getAxisConfig } from '../config/chartConfiguration';
import styles from './LazyChart.module.css';

// Lazy load Chart.js components to reduce initial bundle size
const Line = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

const Bar = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Bar }))
);

const Pie = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Pie }))
);

const Doughnut = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Doughnut }))
);

// Type for chart ref - use any to support all chart types
type ChartRef = any;

// Lazy load components
const ChartRegistration = lazy(() => 
  import('./ChartRegistration').then(module => ({ default: module.default }))
);

const ChartSkeleton = lazy(() => 
  import('./ChartSkeleton').then(module => ({ default: module.default }))
);

const RefreshButton = lazy(() => 
  import('./RefreshButton').then(module => ({ default: module.default }))
);

const RemoveButton = lazy(() => 
  import('./RemoveButton').then(module => ({ default: module.default }))
);

type ChartType = 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart';

interface InteractiveDynamicChartProps {
  chartId: string;
  type: ChartType;
  dataType: string;
  title: string;
  fallbackData?: ChartData;
  config?: Record<string, unknown>;
  onRemove?: () => void;
  isLiveViewMode?: boolean;
  onDataSourceChange?: (newSource: DataSourceType, newData: ChartData) => void;
}

function ChartContent({
  type,
  data,
  dataType,
  config,
  chartRef,
  onRefresh,
  onRemove,
  isRefreshing
}: {
  type: ChartType;
  data: ChartData;
  dataType?: string;
  config?: Record<string, unknown>;
  chartRef: React.RefObject<ChartRef>;
  onRefresh: () => void;
  onRemove?: () => void;
  isRefreshing: boolean;
}) {
  const isEditMode = useIsEditMode();
  const getChartOptions = () => {
    // Get configuration for this data type
    const chartConfig = dataType ? getChartConfig(dataType) : null;
    const axisConfig = dataType ? getAxisConfig(dataType) : null;

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const
      },
      plugins: {
        legend: {
          display: chartConfig?.legend.display ?? true,
          position: chartConfig?.legend.position ?? 'top' as const,
        },
        title: {
          display: false, // We're using our own title
        },
        tooltip: chartConfig ? {
          callbacks: {
            title: chartConfig.tooltip.title,
            label: chartConfig.tooltip.label,
            afterLabel: chartConfig.tooltip.afterLabel,
          }
        } : undefined,
      },
      ...config
    };

    // Add scales for line and bar charts
    if (type === 'line-chart' || type === 'bar-chart') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: axisConfig?.y.beginAtZero ?? (type === 'bar-chart'),
            title: {
              display: true,
              text: axisConfig ? `${axisConfig.y.label} (${axisConfig.y.unit})` : 'Value',
              font: {
                size: 12,
                weight: 'bold' as const,
              },
            },
            ticks: axisConfig ? {
              callback: function(value: number | string) {
                return axisConfig.y.formatValue(Number(value));
              }
            } : undefined,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
          x: {
            type: axisConfig?.x.type === 'time' ? 'category' : (axisConfig?.x.type ?? 'category'),
            title: {
              display: true,
              text: axisConfig?.x.label ?? 'Time',
              font: {
                size: 12,
                weight: 'bold' as const,
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
      };
    }

    return baseOptions;
  };

  const renderChart = () => {
    const options = getChartOptions();

    switch (type) {
      case 'line-chart':
        return <Line ref={chartRef} data={data} options={options} />;
      case 'bar-chart':
        return <Bar ref={chartRef} data={data} options={options} />;
      case 'pie-chart':
        return <Pie ref={chartRef} data={data} options={options} />;
      case 'doughnut-chart':
        return <Doughnut ref={chartRef} data={data} options={options} />;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const dataStatus = getDataStatus(data.lastUpdated, data.isRealData);

  return (
    <>
      <div className={styles.chartHeader}>
        <div className={styles.titleSection}>
          <DataStatusPill
            status={dataStatus}
            lastUpdated={data.lastUpdated}
            size="small"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <RefreshButton onClick={onRefresh} isRefreshing={isRefreshing} />
          {onRemove && isEditMode && <RemoveButton onClick={onRemove} />}
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartRegistration />
          {renderChart()}
        </Suspense>
      </div>
    </>
  );
}

export default function InteractiveDynamicChart({
  chartId,
  type,
  dataType,
  title,
  fallbackData,
  config,
  onRemove,
  isLiveViewMode = false,
  onDataSourceChange,
}: InteractiveDynamicChartProps) {
  const chartRef = useRef<ChartRef>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isEditMode = useIsEditMode();

  // Use chart-specific data source management
  const {
    data: chartData,
    isLoading,
    error,
    refresh,
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
          {onRemove && isEditMode && <RemoveButton onClick={onRemove} />}
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
          {onRemove && isEditMode && <RemoveButton onClick={onRemove} />}
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
          {onRemove && isEditMode && <RemoveButton onClick={onRemove} />}
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
        type={type}
        data={displayData}
        dataType={dataType}
        config={config}
        chartRef={chartRef}
        onRefresh={handleRefresh}
        onRemove={onRemove}
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
