'use client';

import React, { Suspense, lazy } from 'react';

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

export default function LazyChart({ data, title }: LazyChartProps) {
  return (
    <div>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{title}</h2>
      <Suspense fallback={<ChartSkeleton />}>
        <ChartRegistration />
        <Line data={data} />
      </Suspense>
    </div>
  );
}
