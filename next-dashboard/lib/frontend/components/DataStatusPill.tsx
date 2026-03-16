'use client';

import React from 'react';
import styles from './DataStatusPill.module.css';
import { EnhancedDataSourceStatus, DataSourceConfigManager } from '@/shared/config/dualDataSourceConfig';
import { STATUS_PLAIN_COPY } from '@/shared/constants/plainLanguageCopy';

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
    const plain = STATUS_PLAIN_COPY[status];
    const base = (label: string, icon: string, color: string, description: string) =>
      ({ label: plain?.label ?? label, icon, color, description: plain?.description ?? description });

    switch (status) {
      case 'live-fred':
        return base('FRED Live', '🏦', '#28a745', 'Up-to-date data from the Federal Reserve.');
      case 'live-bls':
        return base('BLS Live', '📈', '#28a745', 'Up-to-date data from the Bureau of Labor Statistics.');
      case 'live-census':
        return base('Census Live', '🏛️', '#28a745', 'Up-to-date data from the U.S. Census Bureau.');
      case 'live-alpha-vantage':
        return base('Alpha Vantage Live', '📊', '#28a745', 'Up-to-date financial data.');
      case 'live-world-bank':
        return base('World Bank Live', '🌍', '#28a745', 'Up-to-date data from the World Bank.');
      case 'live-oecd':
        return base('OECD Live', '🏛️', '#28a745', 'Up-to-date data from OECD.');
      case 'fallback-cached':
        return base('Cached', '💾', '#17a2b8', 'Showing recently saved data.');
      case 'fallback-historical':
        return base('Sample data', '📊', '#ffc107', 'Showing sample data so you can still explore.');
      case 'fallback-synthetic':
        return base('Sample data', '🔧', '#fd7e14', 'Showing sample data for demonstration.');
      case 'degraded-partial':
        return base('Partial', '⚠️', '#ffc107', 'Some sources unavailable; showing what we have.');
      case 'circuit-breaker-open':
        return base('Temporarily unavailable', '🚫', '#dc3545', 'Data source is briefly paused; try again soon.');
      case 'rate-limited':
        return base('Slowed', '⏱️', '#fd7e14', 'Too many requests; we\'ll retry shortly.');
      case 'recent':
        return base('Up to date', '🟢', '#28a745', 'Data was updated recently.');
      case 'historical':
        return base('Sample data', '📊', '#ffc107', 'Sample data for exploration.');
      case 'world-bank':
        return base('World Bank Data', '🌍', '#17a2b8', 'Global economic data from World Bank.');
      case 'oecd':
        return base('OECD Data', '🏛️', '#6f42c1', 'Economic data from OECD.');
      case 'stale':
        return base('Outdated', '🔴', '#dc3545', 'This data may be old.');
      case 'loading':
        return base('Loading…', '⏳', '#6c757d', 'Fetching data…');
      default:
        return base('Unknown', '❓', '#6c757d', 'Data status unknown.');
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
