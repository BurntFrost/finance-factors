'use client';

/**
 * Data Source Indicator Component
 *
 * A subtle visual indicator that shows users when they're viewing historical data
 * instead of live data. Provides context about data source status and retry options.
 */

import React, { useState, useCallback } from 'react';
import { DataSourceStatus } from '@/frontend/context/AutomaticDataSourceContext';
import { getChartConfig } from '@/shared/config/chartConfiguration';
import styles from './DataSourceIndicator.module.css';

export interface DataSourceIndicatorProps {
  status: DataSourceStatus;
  lastUpdated?: Date | null;
  lastLiveAttempt?: Date | null;
  onRetry?: () => Promise<void>;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showDetails?: boolean;
  dataType?: string; // For showing data type specific information
  timePeriod?: string; // For showing time period (e.g., "Monthly", "Annual")
}

interface StatusConfig {
  icon: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  live: {
    icon: '🟢',
    label: 'Live API Data',
    description: 'Displaying real-time data from external APIs',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  'historical-fallback': {
    icon: '📊',
    label: 'Sample Data',
    description: 'Live data unavailable, showing sample/historical data instead',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fed7aa',
  },
  loading: {
    icon: '🔄',
    label: 'Loading',
    description: 'Fetching data...',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  error: {
    icon: '🔴',
    label: 'Error',
    description: 'Failed to load data',
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
  },
};

// Helper function to map enhanced statuses to basic configurations
function getStatusConfig(status: DataSourceStatus): StatusConfig {
  // Map enhanced statuses to basic configurations
  if (status.startsWith('live-') || status === 'live') {
    return STATUS_CONFIGS.live;
  }
  if (status.startsWith('fallback-') || status === 'historical-fallback') {
    return STATUS_CONFIGS['historical-fallback'];
  }
  if (status === 'loading') {
    return STATUS_CONFIGS.loading;
  }
  if (status === 'error' || status === 'circuit-breaker-open') {
    return STATUS_CONFIGS.error;
  }

  // Default to error for unknown statuses
  return STATUS_CONFIGS.error;
}

export default function DataSourceIndicator({
  status,
  lastUpdated,
  lastLiveAttempt,
  onRetry,
  className = '',
  size = 'medium',
  position = 'top-right',
  showDetails = false,
  dataType,
  timePeriod,
}: DataSourceIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const config = getStatusConfig(status);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  const formatTime = useCallback((date: Date | null): string => {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  // Get dynamic label based on data source
  const getDisplayLabel = useCallback(() => {
    if (isRetrying) return 'Retrying...';

    // For live data, show the specific API source if available
    if (status === 'live' && dataType) {
      const chartConfig = getChartConfig(dataType);
      if (chartConfig?.dataSource?.primary) {
        return chartConfig.dataSource.primary;
      }
    }

    // Fall back to the default config label
    return config.label;
  }, [status, dataType, isRetrying, config.label]);

  // Don't show indicator for live data unless details are requested
  if (status === 'live' && !showDetails) {
    return null;
  }

  return (
    <div 
      className={`${styles.container} ${styles[size]} ${styles[position]} ${className}`}
      style={{
        '--indicator-color': config.color,
        '--indicator-bg': config.bgColor,
        '--indicator-border': config.borderColor,
      } as React.CSSProperties}
    >
      <div 
        className={`${styles.indicator} ${isExpanded ? styles.expanded : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-label={`Data source: ${getDisplayLabel()}. Click for details.`}
        title={config.description}
      >
        <span className={styles.icon} aria-hidden="true">
          {status === 'loading' || isRetrying ? (
            <span className={styles.spinner}>🔄</span>
          ) : (
            config.icon
          )}
        </span>
        
        <span className={styles.label}>
          {getDisplayLabel()}
        </span>

        {(showDetails || isExpanded) && (
          <span className={styles.expandIcon} aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className={styles.details}>
          <div className={styles.detailsContent}>
            <div className={styles.description}>
              {config.description}
            </div>

            {/* Data type and source information */}
            {dataType && (() => {
              const chartConfig = getChartConfig(dataType);
              return chartConfig && (
                <div className={styles.dataInfo}>
                  <div className={styles.dataType}>
                    <strong>Data:</strong> {chartConfig.description}
                  </div>
                  <div className={styles.dataSource}>
                    <strong>Source:</strong> {(status === 'live' || status.startsWith('live-')) ? chartConfig.dataSource.primary : chartConfig.dataSource.fallback}
                  </div>
                  {timePeriod && (
                    <div className={styles.timePeriod}>
                      <strong>Frequency:</strong> {timePeriod}
                    </div>
                  )}
                </div>
              );
            })()}

            {lastUpdated && (
              <div className={styles.timestamp}>
                <strong>Last updated:</strong> {formatTime(lastUpdated)}
              </div>
            )}

            {status === 'historical-fallback' && lastLiveAttempt && (
              <div className={styles.timestamp}>
                <strong>Last live attempt:</strong> {formatTime(lastLiveAttempt)}
              </div>
            )}
            
            {status === 'historical-fallback' && onRetry && (
              <button
                className={styles.retryButton}
                onClick={handleRetry}
                disabled={isRetrying}
                aria-label="Retry fetching live data"
              >
                {isRetrying ? (
                  <>
                    <span className={styles.spinner}>🔄</span>
                    Retrying...
                  </>
                ) : (
                  <>
                    🔄 Retry Live Data
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for use in tight spaces
export function CompactDataSourceIndicator({
  status,
  onRetry,
  className = '',
}: {
  status: DataSourceStatus;
  onRetry?: () => Promise<void>;
  className?: string;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const config = getStatusConfig(status);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  // Don't show for live data
  if (status === 'live' || status.startsWith('live-')) {
    return null;
  }

  return (
    <div className={`${styles.compact} ${className}`}>
      <span 
        className={styles.compactIndicator}
        style={{
          '--indicator-color': config.color,
          '--indicator-bg': config.bgColor,
        } as React.CSSProperties}
        title={config.description}
        aria-label={config.label}
      >
        {status === 'loading' || isRetrying ? (
          <span className={styles.spinner}>🔄</span>
        ) : (
          config.icon
        )}
      </span>
      
      {(status === 'historical-fallback' || status.startsWith('fallback-')) && onRetry && (
        <button
          className={styles.compactRetry}
          onClick={handleRetry}
          disabled={isRetrying}
          title="Retry live data"
          aria-label="Retry fetching live data"
        >
          🔄
        </button>
      )}
    </div>
  );
}
