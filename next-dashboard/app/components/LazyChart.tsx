'use client';

import React, { Suspense, lazy, useRef, useState, useCallback } from 'react';
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

interface ChartData {
  labels: number[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }>;
}

interface LazyChartProps {
  data: ChartData;
  title: string;
}

// Loading component for chart
const ChartSkeleton = () => (
  <div
    style={{
      width: '100%',
      height: '400px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666',
      fontSize: '16px'
    }}
  >
    Loading chart...
  </div>
);

// Refresh button component
const RefreshButton = ({ onClick, isRefreshing }: { onClick: () => void; isRefreshing: boolean }) => (
  <button
    onClick={onClick}
    disabled={isRefreshing}
    className={styles.refreshButton}
  >
    <span className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`}>
      ↻
    </span>
    {isRefreshing ? 'Refreshing...' : 'Refresh Chart'}
  </button>
);

// Chart component with refresh capability
const RefreshableChart = ({ data, title }: LazyChartProps) => {
  const chartRef = useRef<ChartRef>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!chartRef.current || isRefreshing) return;

    setIsRefreshing(true);

    try {
      // Add a small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Force chart to re-render with animation
      chartRef.current.update('active');

      // Optional: You could also trigger a re-draw with different animation
      // chartRef.current.update('resize');

    } catch (error) {
      console.error('Error refreshing chart:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>{title}</h2>
        <RefreshButton onClick={handleRefresh} isRefreshing={isRefreshing} />
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
    </div>
  );
};

export default function LazyChart({ data, title }: LazyChartProps) {
  return <RefreshableChart data={data} title={title} />;
}
