'use client';

/**
 * IsolationTestComponent
 * 
 * A test component to verify that individual component refreshes are isolated
 * from global state and don't affect other components.
 */

import React, { useState } from 'react';
import { useIsolatedDataSource } from '@/frontend/hooks/useIsolatedDataSource';
import { useDataSourceStatus } from '@/frontend/hooks/useDataSource';

interface IsolationTestComponentProps {
  componentId: string;
  dataType: string;
  title: string;
}

export default function IsolationTestComponent({
  componentId,
  dataType,
  title,
}: IsolationTestComponentProps) {
  const [refreshCount, setRefreshCount] = useState(0);

  // Use isolated data source for this component
  const {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
  } = useIsolatedDataSource({
    dataType,
    chartId: componentId,
    autoFetch: true,
  });

  // Get global data source status for comparison
  const globalStatus = useDataSourceStatus();

  const handleRefresh = async () => {
    setRefreshCount(prev => prev + 1);
    await refresh();
  };

  return (
    <div style={{
      border: '2px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px',
      backgroundColor: isLoading ? '#f0f8ff' : '#fff',
      transition: 'background-color 0.3s ease',
    }}>
      <h3>{title}</h3>
      <div style={{ marginBottom: '12px' }}>
        <strong>Component ID:</strong> {componentId}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Component State */}
        <div>
          <h4>Component State (Isolated)</h4>
          <div><strong>Loading:</strong> {isLoading ? '✅ YES' : '❌ NO'}</div>
          <div><strong>Has Data:</strong> {data ? '✅ YES' : '❌ NO'}</div>
          <div><strong>Error:</strong> {error ? `❌ ${error.message}` : '✅ None'}</div>
          <div><strong>Last Updated:</strong> {lastUpdated?.toLocaleTimeString() || 'Never'}</div>
          <div><strong>Refresh Count:</strong> {refreshCount}</div>
        </div>

        {/* Global State */}
        <div>
          <h4>Global State (For Comparison)</h4>
          <div><strong>Global Loading:</strong> {globalStatus.isLoading ? '✅ YES' : '❌ NO'}</div>
          <div><strong>Global Source:</strong> {globalStatus.currentSource}</div>
          <div><strong>Global Error:</strong> {globalStatus.error || '✅ None'}</div>
          <div><strong>Global Last Updated:</strong> {globalStatus.lastUpdated?.toLocaleTimeString() || 'Never'}</div>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh This Component'}
        </button>
      </div>

      {/* Visual indicator of loading state */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '12px',
          height: '12px',
          backgroundColor: '#007bff',
          borderRadius: '50%',
          animation: 'pulse 1s infinite',
        }} />
      )}
    </div>
  );
}
