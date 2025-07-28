'use client';

import React, { Suspense, lazy, useMemo } from 'react';
import { ChartData, VisualizationType } from '@/shared/types/dashboard';
import ChartErrorBoundary, { useChartErrorHandler } from './ChartErrorBoundary';

// Optimized lazy loading with better chunk splitting
const chartComponents = {
  line: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Line 
    }))
  ),
  bar: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Bar 
    }))
  ),
  pie: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Pie 
    }))
  ),
  doughnut: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Doughnut 
    }))
  ),
  scatter: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Scatter 
    }))
  ),
  bubble: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Bubble 
    }))
  ),
  radar: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.Radar 
    }))
  ),
  polarArea: lazy(() => 
    import('react-chartjs-2').then(module => ({ 
      default: module.PolarArea 
    }))
  ),
};

// Lazy load Chart.js registration with optimized imports
const ChartRegistration = lazy(() => 
  import('./OptimizedChartRegistration').then(module => ({ 
    default: module.default 
  }))
);

// Chart skeleton with better performance
const ChartSkeleton = React.memo(({ height = 400 }: { height?: number }) => (
  <div 
    className="animate-pulse bg-gray-200 rounded-lg flex items-center justify-center"
    style={{ height }}
    role="status"
    aria-label="Loading chart..."
  >
    <div className="text-gray-400 text-sm">Loading chart...</div>
  </div>
));

ChartSkeleton.displayName = 'ChartSkeleton';

interface OptimizedChartLoaderProps {
  type: VisualizationType;
  data: ChartData;
  options?: any;
  height?: number;
  className?: string;
  onChartReady?: (chart: any) => void;
}

/**
 * Optimized Chart Loader with advanced performance features:
 * - Dynamic imports for each chart type
 * - Memoized component selection
 * - Optimized Chart.js registration
 * - Better error boundaries
 * - Performance monitoring
 */
export default function OptimizedChartLoader({
  type,
  data,
  options = {},
  height = 400,
  className = '',
  onChartReady,
}: OptimizedChartLoaderProps) {
  // Use chart error handler
  useChartErrorHandler();
  // Extract type ID for consistent usage
  const typeId = typeof type === 'string' ? type : type.id;

  // Memoize chart component selection to prevent unnecessary re-renders
  const ChartComponent = useMemo(() => {
    const chartType = typeId === 'line-chart' ? 'line' :
                     typeId === 'bar-chart' ? 'bar' :
                     typeId === 'pie-chart' ? 'pie' :
                     typeId === 'doughnut-chart' ? 'doughnut' : 'line';

    return chartComponents[chartType as keyof typeof chartComponents];
  }, [typeId]);

  // Memoize chart options to prevent unnecessary re-renders
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
      onComplete: function() {
        // Animation complete callback - ensure proper binding
      },
      onProgress: function() {
        // Animation progress callback - ensure proper binding
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
      },
    },
    scales: typeId.includes('pie') || typeId.includes('doughnut') || typeId.includes('radar') || typeId.includes('polar') ? {} : {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 8,
        },
      },
    },
    ...options,
  }), [typeId, options]);

  // Chart ref for performance monitoring
  const chartRef = React.useRef<any>(null);

  // Performance monitoring
  React.useEffect(() => {
    if (chartRef.current && onChartReady) {
      onChartReady(chartRef.current);
    }
  }, [onChartReady]);

  return (
    <ChartErrorBoundary>
      <div className={`optimized-chart-container ${className}`} style={{ height }}>
        <Suspense fallback={<ChartSkeleton height={height} />}>
          <ChartRegistration />
          <ChartComponent
            ref={chartRef}
            data={data}
            options={chartOptions}
          />
        </Suspense>
      </div>
    </ChartErrorBoundary>
  );
}

// Export chart skeleton for reuse
export { ChartSkeleton };

// Export chart components for direct use if needed
export { chartComponents };
