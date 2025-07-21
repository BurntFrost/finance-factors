'use client';

/**
 * Data Source Selector Component
 * 
 * A segmented control component that allows users to switch between
 * Sample Data and Live API Data modes for the dashboard.
 */

import React, { useState } from 'react';
import { DataSourceType, DATA_SOURCE_CONFIGS } from '../types/dataSource';
import { useExtendedDataSourceContext } from '../context/ExtendedDataSourceContext';
import styles from './DataSourceSelector.module.css';

interface DataSourceSelectorProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showIcons?: boolean;
  disabled?: boolean;
}

export default function DataSourceSelector({
  className = '',
  size = 'medium',
  showLabels = true,
  showIcons = true,
  disabled = false,
}: DataSourceSelectorProps) {
  const { state, switchDataSource } = useExtendedDataSourceContext();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSourceChange = async (source: DataSourceType) => {
    if (source === state.currentSource || disabled || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    try {
      await switchDataSource(source);
    } catch (error) {
      console.error('Failed to switch data source:', error);
      // Error is handled by the context, we just need to reset the transition state
    } finally {
      setIsTransitioning(false);
    }
  };

  const sources: DataSourceType[] = ['sample', 'live-api'];

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <div className={styles.label}>
        Data Source
      </div>
      
      <div 
        className={`${styles.segmentedControl} ${disabled ? styles.disabled : ''}`}
        role="radiogroup"
        aria-label="Select data source"
      >
        {sources.map((source) => {
          const config = DATA_SOURCE_CONFIGS[source];
          const isActive = state.currentSource === source;
          const isLoading = isTransitioning && isActive;
          
          return (
            <button
              key={source}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`Switch to ${config.name}`}
              className={`${styles.segment} ${isActive ? styles.active : ''} ${isLoading ? styles.loading : ''}`}
              onClick={() => handleSourceChange(source)}
              disabled={disabled || isTransitioning}
              title={config.description}
            >
              {showIcons && (
                <span className={styles.icon} aria-hidden="true">
                  {isLoading ? (
                    <span className={styles.spinner}>⟳</span>
                  ) : (
                    config.icon
                  )}
                </span>
              )}
              
              {showLabels && (
                <span className={styles.text}>
                  {config.name}
                </span>
              )}
              
              {isActive && (
                <span className={styles.activeIndicator} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {state.error && (
        <div className={styles.error} role="alert">
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>
            {state.error}
          </span>
        </div>
      )}

      {state.isLoading && !isTransitioning && (
        <div className={styles.globalLoading}>
          <span className={styles.loadingIcon}>⟳</span>
          <span>Loading data...</span>
        </div>
      )}
    </div>
  );
}
