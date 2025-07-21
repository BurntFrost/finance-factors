'use client';

import React from 'react';
import styles from './LazyChart.module.css';

interface RefreshButtonProps {
  onClick: () => void;
  isRefreshing: boolean;
  lastRefresh?: Date;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

export default function RefreshButton({
  onClick,
  isRefreshing,
  lastRefresh,
  disabled = false,
  size = 'medium',
  showText = true,
  className = ''
}: RefreshButtonProps) {
  const sizeClasses = {
    small: 'text-sm px-2 py-1',
    medium: 'text-sm px-4 py-2',
    large: 'text-base px-6 py-3'
  };

  const iconSizes = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={onClick}
        disabled={isRefreshing || disabled}
        className={`${styles.refreshButton} ${sizeClasses[size]}`}
        title={lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Refresh chart'}
        aria-label={isRefreshing ? 'Refreshing chart' : 'Refresh chart'}
      >
        <span 
          className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`}
          style={{ fontSize: iconSizes[size] }}
        >
          ↻
        </span>
        {showText && (
          <span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </span>
        )}
      </button>
      
      {lastRefresh && size !== 'small' && (
        <small style={{ color: '#666', fontSize: '12px' }}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </small>
      )}
    </div>
  );
}
