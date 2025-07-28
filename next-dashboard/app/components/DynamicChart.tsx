'use client';

import React, { Suspense, lazy, useRef, useState, useCallback, useEffect } from 'react';
import { ChartData, VisualizationType } from '../types/dashboard';
import { getDataStatus } from './DataStatusPill';
import { useIsEditMode } from '../context/ViewModeContext';
import { getChartConfig, getAxisConfig } from '../config/chartConfiguration';
import VisualizationTypeSwitcher from './VisualizationTypeSwitcher';
import { ChartCard } from '../../components/ui/chart-card';

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

// Import the wait function
const waitForChartJS = lazy(() =>
  import('./ChartRegistration').then(module => ({ default: module.waitForChartJS }))
);

interface DynamicChartProps {
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart';
  data: ChartData;
  title: string;
  dataType?: string; // Data type for configuration lookup
  onRemove?: () => void;
  onVisualizationChange?: (newType: VisualizationType) => void;
  config?: Record<string, unknown>;
  hideHeader?: boolean;
  hideFooter?: boolean;
  isChangingVisualization?: boolean;
}

// Chart skeleton component for loading state
const ChartSkeleton = () => (
  <div className="w-full h-full min-h-[300px] flex items-center justify-center">
    <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-pulse rounded"
         style={{
           animation: 'loading 1.5s infinite',
         }} />
    <style jsx>{`
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

// These button components are now handled by ChartCard

export default function DynamicChart({
  type,
  data,
  title,
  dataType,
  onRemove,
  onVisualizationChange,
  config,
  hideHeader = false,
  hideFooter = false,
  isChangingVisualization = false
}: DynamicChartProps) {
  const chartRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const isEditMode = useIsEditMode();

  // Wait for Chart.js to be properly registered
  useEffect(() => {
    const checkChartRegistration = async () => {
      try {
        // Import the wait function and wait for registration
        const { waitForChartJS } = await import('./ChartRegistration');
        await waitForChartJS();
        setIsChartReady(true);
      } catch (error) {
        console.error('Error waiting for Chart.js registration:', error);
        // Fallback - assume it's ready after a delay
        setTimeout(() => setIsChartReady(true), 2000);
      }
    };

    checkChartRegistration();
  }, []);

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

  // Prepare header actions
  const headerActions = (
    <>
      {dataType && onVisualizationChange && (
        <VisualizationTypeSwitcher
          dataType={dataType}
          currentVisualizationType={type as string}
          onVisualizationChange={onVisualizationChange}
          size="small"
          showLabels={false}
          showIcons={true}
          disabled={isChangingVisualization}
          isLoading={isChangingVisualization}
        />
      )}
    </>
  );

  // Prepare footer content
  const footerContent = !hideFooter ? (
    <div className="flex justify-between items-center text-sm text-muted-foreground">
      <div className="flex flex-col space-y-1">
        {data.lastUpdated && (
          <span>
            Updated: {data.lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <span>
          Source: Live API Data
        </span>
      </div>
    </div>
  ) : null;

  return (
    <ChartCard
      title={hideHeader ? "" : title}
      status={hideHeader ? undefined : dataStatus}
      lastUpdated={hideHeader ? undefined : data.lastUpdated}
      isEditable={isEditMode}
      onRemove={onRemove}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
      headerActions={hideHeader ? undefined : headerActions}
      footerContent={footerContent}
      showFooter={!hideFooter}
    >
      <Suspense fallback={<ChartSkeleton />}>
        <ChartRegistration />
        {!isChartReady || isChangingVisualization ? <ChartSkeleton /> : renderChart()}
      </Suspense>
      {isChangingVisualization && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin text-2xl">⟳</div>
            <div className="text-sm text-muted-foreground">Switching visualization...</div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
