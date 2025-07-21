'use client';

import React from 'react';
import styles from './DataStatusPill.module.css';

export type DataStatus = 'recent' | 'sample' | 'stale' | 'loading';

interface DataStatusPillProps {
  status: DataStatus;
  lastUpdated?: Date;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function DataStatusPill({ 
  status, 
  lastUpdated, 
  className = '',
  size = 'medium'
}: DataStatusPillProps) {
  const getStatusConfig = (status: DataStatus) => {
    switch (status) {
      case 'recent':
        return {
          label: 'Live Data',
          icon: '🟢',
          color: '#28a745',
          description: 'Recently updated data'
        };
      case 'sample':
        return {
          label: 'Sample Data',
          icon: '🔶',
          color: '#ffc107',
          description: 'Demo/sample data for visualization'
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

  const pillClasses = [
    styles.pill,
    styles[size],
    styles[status],
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
      title={`${config.description}${lastUpdated ? ` - Last updated: ${formatLastUpdated(lastUpdated)}` : ''}`}
    >
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.label}>{config.label}</span>
      {lastUpdated && status === 'recent' && (
        <span className={styles.timestamp}>
          {formatLastUpdated(lastUpdated)}
        </span>
      )}
    </div>
  );
}

// Utility function to determine data status based on timestamp
export function getDataStatus(lastUpdated?: Date, isRealData: boolean = false): DataStatus {
  if (!isRealData) return 'sample';
  if (!lastUpdated) return 'stale';
  
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 1) return 'recent';
  if (diffHours < 24) return 'recent';
  return 'stale';
}
