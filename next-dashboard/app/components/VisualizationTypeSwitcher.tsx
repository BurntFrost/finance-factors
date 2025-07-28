'use client';

/**
 * Visualization Type Switcher Component
 *
 * A segmented control component that allows users to switch between
 * different visualization types for the same data within element cards.
 */

import React, { useState } from 'react';
import { VisualizationType } from '../types/dashboard';
import { getSuitableVisualizations } from '../config/elementTypes';
import styles from './VisualizationTypeSwitcher.module.css';

export interface VisualizationTypeSwitcherProps {
  dataType: string;
  currentVisualizationType: string;
  onVisualizationChange: (newType: VisualizationType) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showIcons?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function VisualizationTypeSwitcher({
  dataType,
  currentVisualizationType,
  onVisualizationChange,
  className = '',
  size = 'small',
  showLabels = false,
  showIcons = true,
  disabled = false,
  isLoading = false,
}: VisualizationTypeSwitcherProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Get suitable visualizations for this data type
  const availableVisualizations = getSuitableVisualizations(dataType);

  // Don't render if there's only one visualization option
  if (availableVisualizations.length <= 1) {
    return null;
  }

  const handleVisualizationChange = async (visualization: VisualizationType) => {
    if (
      visualization.id === currentVisualizationType ||
      disabled ||
      isTransitioning ||
      isLoading
    ) {
      return;
    }

    setIsTransitioning(true);
    try {
      await onVisualizationChange(visualization);
    } catch (error) {
      console.error('Failed to switch visualization type:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <div 
        className={`${styles.segmentedControl} ${disabled ? styles.disabled : ''}`}
        role="radiogroup"
        aria-label="Select visualization type"
      >
        {availableVisualizations.map((visualization) => {
          const isActive = currentVisualizationType === visualization.id;
          const isCurrentlyLoading = (isTransitioning && isActive) || isLoading;
          
          return (
            <button
              key={visualization.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`Switch to ${visualization.name}`}
              className={`${styles.segment} ${isActive ? styles.active : ''} ${isCurrentlyLoading ? styles.loading : ''}`}
              onClick={() => handleVisualizationChange(visualization)}
              disabled={disabled || isTransitioning || isLoading}
              title={visualization.description}
            >
              {showIcons && (
                <span className={styles.icon} aria-hidden="true">
                  {isCurrentlyLoading ? (
                    <span className={styles.spinner}>⟳</span>
                  ) : (
                    visualization.icon
                  )}
                </span>
              )}
              
              {showLabels && (
                <span className={styles.text}>
                  {visualization.name}
                </span>
              )}
              
              {isActive && (
                <span className={styles.activeIndicator} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
