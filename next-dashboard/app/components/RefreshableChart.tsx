'use client';

import React, { Suspense, lazy, useRef, useState, useCallback } from 'react';
import styles from './LazyChart.module.css';

// Lazy load Chart.js components to reduce initial bundle size
const Line = lazy(() => 
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

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

interface RefreshableChartProps {
  data: ChartData;
  title: string;
  onRefresh?: () => Promise<ChartData> | ChartData; // Optional data refresh function
  refreshInterval?: number; // Optional auto-refresh interval in seconds
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
const RefreshButton = ({ 
  onClick, 
  isRefreshing, 
  lastRefresh 
}: { 
  onClick: () => void; 
  isRefreshing: boolean;
  lastRefresh?: Date;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
    <button
      onClick={onClick}
      disabled={isRefreshing}
      className={styles.refreshButton}
      title={lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Refresh chart'}
    >
      <span className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`}>
        ↻
      </span>
      {isRefreshing ? 'Refreshing...' : 'Refresh Chart'}
    </button>
    {lastRefresh && (
      <small style={{ color: '#666', fontSize: '12px' }}>
        Last updated: {lastRefresh.toLocaleTimeString()}
      </small>
    )}
  </div>
);

export default function RefreshableChart({ 
  data: initialData, 
  title, 
  onRefresh,
  refreshInterval 
}: RefreshableChartProps) {
  const chartRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartData, setChartData] = useState(initialData);
  const [lastRefresh, setLastRefresh] = useState<Date>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Auto-refresh functionality
  React.useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    
    try {
      // Add a small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // If onRefresh function is provided, fetch new data
      if (onRefresh) {
        const newData = await onRefresh();
        setChartData(newData);
        setLastRefresh(new Date());
      }
      
      // Force chart to re-render with animation
      if (chartRef.current) {
        chartRef.current.update('active');
      }
      
    } catch (error) {
      console.error('Error refreshing chart:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>{title}</h2>
        <RefreshButton 
          onClick={handleRefresh} 
          isRefreshing={isRefreshing}
          lastRefresh={lastRefresh}
        />
      </div>
      <div className={styles.chartWrapper}>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartRegistration />
          <Line 
            ref={chartRef}
            data={chartData}
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
}
