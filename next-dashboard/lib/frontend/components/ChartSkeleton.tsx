'use client';

import React from 'react';

interface ChartSkeletonProps {
  height?: string | number;
  width?: string | number;
  className?: string;
}

export default function ChartSkeleton({ 
  height = '400px', 
  width = '100%',
  className = ''
}: ChartSkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'chartSkeletonLoading 1.5s infinite',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: '16px'
      }}
    >
      <span>Loading chart...</span>
      
      <style jsx>{`
        @keyframes chartSkeletonLoading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
