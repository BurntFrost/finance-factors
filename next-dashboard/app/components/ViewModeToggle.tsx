'use client';

/**
 * View Mode Toggle Component
 * 
 * A segmented control component that allows users to switch between
 * different view modes: Edit, Live, and Preview.
 */

import React from 'react';
import { ViewMode, useViewMode } from '../context/ViewModeContext';
import styles from './ViewModeToggle.module.css';

interface ViewModeToggleProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showIcons?: boolean;
  disabled?: boolean;
}

interface ModeConfig {
  mode: ViewMode;
  label: string;
  icon: string;
  description: string;
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    mode: 'edit',
    label: 'Edit',
    icon: '✏️',
    description: 'Edit dashboard layout and add/remove components',
  },
  {
    mode: 'live',
    label: 'Live',
    icon: '🔴',
    description: 'Interactive mode with data source editing',
  },
];

export default function ViewModeToggle({
  className = '',
  size = 'medium',
  showLabels = true,
  showIcons = true,
  disabled = false,
}: ViewModeToggleProps) {
  const { state, setViewMode } = useViewMode();

  const handleModeChange = (mode: ViewMode) => {
    if (mode === state.currentMode || disabled) {
      return;
    }
    setViewMode(mode);
  };

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      <div className={styles.label}>
        View Mode
      </div>
      
      <div 
        className={`${styles.segmentedControl} ${disabled ? styles.disabled : ''}`}
        role="radiogroup"
        aria-label="Select view mode"
      >
        {MODE_CONFIGS.map((config) => {
          const isActive = state.currentMode === config.mode;
          
          return (
            <button
              key={config.mode}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`Switch to ${config.label} mode`}
              className={`${styles.segment} ${isActive ? styles.active : ''}`}
              onClick={() => handleModeChange(config.mode)}
              disabled={disabled}
              title={config.description}
            >
              {showIcons && (
                <span className={styles.icon} aria-hidden="true">
                  {config.icon}
                </span>
              )}
              
              {showLabels && (
                <span className={styles.text}>
                  {config.label}
                </span>
              )}
              
              {isActive && (
                <span className={styles.activeIndicator} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mode description */}
      <div className={styles.description}>
        {MODE_CONFIGS.find(config => config.mode === state.currentMode)?.description}
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactViewModeToggle({
  className = '',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  return (
    <ViewModeToggle
      className={className}
      size="small"
      showLabels={false}
      showIcons={true}
      disabled={disabled}
    />
  );
}

// Quick toggle between edit and live modes
export function LiveModeToggle({
  className = '',
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const { state, toggleLiveMode } = useViewMode();
  
  return (
    <button
      type="button"
      className={`${styles.quickToggle} ${state.isLiveViewMode ? styles.liveActive : ''} ${className}`}
      onClick={toggleLiveMode}
      disabled={disabled}
      title={state.isLiveViewMode ? 'Exit Live Mode' : 'Enter Live Mode'}
    >
      <span className={styles.quickToggleIcon}>
        {state.isLiveViewMode ? '🔴' : '⚪'}
      </span>
      <span className={styles.quickToggleText}>
        {state.isLiveViewMode ? 'Live' : 'Edit'}
      </span>
    </button>
  );
}
