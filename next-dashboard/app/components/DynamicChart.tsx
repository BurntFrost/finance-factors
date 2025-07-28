'use client';

import React, { Suspense, lazy, useRef, useState, useCallback } from 'react';
import { ChartData } from '../types/dashboard';
import DataStatusPill, { getDataStatus } from './DataStatusPill';
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

// Lazy load Chart.js registration
const ChartRegistration = lazy(() =>
  import('./ChartRegistration').then(module => ({ default: module.default }))
);

interface DynamicChartProps {
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart';
  data: ChartData;
  title: string;
  dataType?: string; // Data type for configuration lookup
  onRemove?: () => void;
  config?: Record<string, unknown>;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

// Chart skeleton component for loading state
const ChartSkeleton = () => (
  <div className={styles.chartWrapper}>
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'loading 1.5s infinite',
      borderRadius: '4px'
    }} />
    <style jsx>{`
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

// Refresh button component
const _RefreshButton = ({ onClick, isRefreshing }: { onClick: () => void; isRefreshing: boolean }) => (
  <button
    className={styles.refreshButton}
    onClick={onClick}
    disabled={isRefreshing}
    aria-label="Refresh chart"
  >
    <span className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`}>
      🔄
    </span>
    {isRefreshing ? 'Refreshing...' : 'Refresh'}
  </button>
);

// Remove button component
const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button
    className={`${styles.refreshButton} ${styles.removeButton}`}
    onClick={onClick}
    aria-label="Remove chart"
    style={{ backgroundColor: '#dc3545', marginLeft: '8px' }}
  >
    <span>🗑️</span>
    Remove
  </button>
);

export default function DynamicChart({ type, data, title, dataType, onRemove, config, hideHeader = false, hideFooter = false }: DynamicChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isEditMode = useIsEditMode();

  const handleRefresh = useCallback(async () => {
    if (!chartRef.current || isRefreshing) return;

    setIsRefreshing(true);

    try {
      // Add a small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force chart to re-render with animation
      if (chartRef.current) {
        chartRef.current.update('active');
      }
    } catch (error) {
      console.error('Error refreshing chart:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

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
    <div className={styles.chartContainer}>
      {!hideHeader && (
        <div className={styles.chartHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.chartTitle}>{title}</h2>
            <DataStatusPill
              status={dataStatus}
              lastUpdated={data.lastUpdated}
              size="small"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {onRemove && isEditMode && <RemoveButton onClick={onRemove} />}
          </div>
        </div>
      )}
      <div className={styles.chartWrapper}>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartRegistration />
          {renderChart()}
        </Suspense>
      </div>

      {/* Footer with data source info and refresh button */}
      {!hideFooter && (
        <div className={styles.footer}>
          <div className={styles.dataInfo}>
            {data.lastUpdated && (
              <span className={styles.timestamp}>
                Updated: {data.lastUpdated.toLocaleTimeString()}
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
            disabled={isRefreshing}
            title="Refresh data"
            aria-label="Refresh chart data"
          >
            <span className={isRefreshing ? styles.spinning : ''}>
              🔄
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
