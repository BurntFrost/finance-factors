'use client';

import React from 'react';

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
    <>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={onClick}
        disabled={isRefreshing || disabled}
        className={`${sizeClasses[size]} ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'transparent',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          cursor: disabled || isRefreshing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: disabled || isRefreshing ? 0.5 : 1,
        }}
        title={lastRefresh ? `Last refreshed: ${lastRefresh.toLocaleTimeString()}` : 'Refresh chart'}
        aria-label={isRefreshing ? 'Refreshing chart' : 'Refresh chart'}
      >
        <span
          style={{
            fontSize: iconSizes[size],
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
          }}
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
    </>
  );
}
