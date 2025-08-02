'use client';

import React from 'react';
import styles from './DataStatusPill.module.css';
import { EnhancedDataSourceStatus, DataSourceConfigManager } from '@/shared/config/dualDataSourceConfig';

export type DataStatus = 'recent' | 'historical' | 'stale' | 'loading' | 'world-bank' | 'oecd' | EnhancedDataSourceStatus;

interface DataStatusPillProps {
  status: DataStatus;
  lastUpdated?: Date;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  provider?: string; // Optional provider name for enhanced display
  showDetails?: boolean; // Show detailed tooltip information
}

export default function DataStatusPill({
  status,
  lastUpdated,
  className = '',
  size = 'medium',
  provider,
  showDetails = true
}: DataStatusPillProps) {
  const getStatusConfig = (status: DataStatus) => {
    switch (status) {
      // Enhanced live API statuses
      case 'live-fred':
        return {
          label: 'FRED Live',
          icon: '🏦',
          color: '#28a745',
          description: 'Live data from Federal Reserve Economic Data (FRED)'
        };
      case 'live-bls':
        return {
          label: 'BLS Live',
          icon: '📈',
          color: '#28a745',
          description: 'Live data from Bureau of Labor Statistics'
        };
      case 'live-census':
        return {
          label: 'Census Live',
          icon: '🏛️',
          color: '#28a745',
          description: 'Live data from U.S. Census Bureau'
        };
      case 'live-alpha-vantage':
        return {
          label: 'Alpha Vantage Live',
          icon: '📊',
          color: '#28a745',
          description: 'Live financial data from Alpha Vantage'
        };
      case 'live-world-bank':
        return {
          label: 'World Bank Live',
          icon: '🌍',
          color: '#28a745',
          description: 'Live data from World Bank Open Data'
        };
      case 'live-oecd':
        return {
          label: 'OECD Live',
          icon: '🏛️',
          color: '#28a745',
          description: 'Live data from OECD Statistics'
        };
      // Fallback statuses
      case 'fallback-cached':
        return {
          label: 'Cached Data',
          icon: '💾',
          color: '#17a2b8',
          description: 'Using cached data from previous API calls'
        };
      case 'fallback-historical':
        return {
          label: 'Historical Data',
          icon: '📊',
          color: '#ffc107',
          description: 'Using historical data generator as fallback'
        };
      case 'fallback-synthetic':
        return {
          label: 'Synthetic Data',
          icon: '🔧',
          color: '#fd7e14',
          description: 'Using synthetic data for demonstration'
        };
      // Degraded states
      case 'degraded-partial':
        return {
          label: 'Partial Data',
          icon: '⚠️',
          color: '#ffc107',
          description: 'Some data sources unavailable, using available sources'
        };
      case 'circuit-breaker-open':
        return {
          label: 'Service Unavailable',
          icon: '🚫',
          color: '#dc3545',
          description: 'API temporarily unavailable, circuit breaker active'
        };
      case 'rate-limited':
        return {
          label: 'Rate Limited',
          icon: '⏱️',
          color: '#fd7e14',
          description: 'API rate limit exceeded, retrying with backoff'
        };
      // Legacy compatibility
      case 'recent':
        return {
          label: 'Live Data',
          icon: '🟢',
          color: '#28a745',
          description: 'Recently updated data'
        };
      case 'historical':
        return {
          label: 'Historical Data',
          icon: '📊',
          color: '#ffc107',
          description: 'Real historical financial data for analysis'
        };
      case 'world-bank':
        return {
          label: 'World Bank Data',
          icon: '🌍',
          color: '#17a2b8',
          description: 'Global economic data from World Bank Open Data'
        };
      case 'oecd':
        return {
          label: 'OECD Data',
          icon: '🏛️',
          color: '#6f42c1',
          description: 'High-quality economic data from OECD Statistics'
        };
      case 'stale':
        return {
          label: 'Outdated',
          icon: '🔴',
          color: '#dc3545',
          description: 'Data may be outdated'
        };
      case 'loading':
        return {
          label: 'Loading...',
          icon: '⏳',
          color: '#6c757d',
          description: 'Data is being loaded'
        };
      default:
        return {
          label: 'Unknown',
          icon: '❓',
          color: '#6c757d',
          description: 'Data status unknown'
        };
    }
  };

  const config = getStatusConfig(status);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Enhanced tooltip with provider information
  const getTooltipText = () => {
    let tooltip = config.description;

    if (provider && showDetails) {
      const providerDisplayName = DataSourceConfigManager.getProviderDisplayName(provider);
      tooltip += ` (${providerDisplayName})`;
    }

    if (lastUpdated) {
      tooltip += ` - Last updated: ${formatLastUpdated(lastUpdated)}`;
    }

    return tooltip;
  };

  // Determine if this is a live API status
  const isLiveStatus = DataSourceConfigManager.isLiveApiStatus(status as EnhancedDataSourceStatus);
  const isFallbackStatus = DataSourceConfigManager.isFallbackStatus(status as EnhancedDataSourceStatus);

  const pillClasses = [
    styles.pill,
    styles[size],
    styles[status] || (isLiveStatus ? styles.live : isFallbackStatus ? styles.fallback : styles.default),
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={pillClasses}
      style={{
        '--status-color': config.color,
        backgroundColor: `${config.color}15`,
        borderColor: `${config.color}40`
      } as React.CSSProperties}
      title={getTooltipText()}
      data-testid="data-status-pill"
    >
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.label}>{config.label}</span>
      {lastUpdated && (isLiveStatus || status === 'recent') && (
        <span className={styles.timestamp}>
          {formatLastUpdated(lastUpdated)}
        </span>
      )}
      {provider && showDetails && size !== 'small' && (
        <span className={styles.provider}>
          {DataSourceConfigManager.getProviderDisplayName(provider)}
        </span>
      )}
    </div>
  );
}

// Utility function to determine data status based on timestamp
export function getDataStatus(lastUpdated?: Date, isRealData: boolean = false): DataStatus {
  if (!isRealData) return 'historical';
  if (!lastUpdated) return 'stale';

  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return 'recent';
  if (diffHours < 24) return 'recent';
  return 'stale';
}
