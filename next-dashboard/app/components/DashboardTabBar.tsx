'use client';

/**
 * Dashboard Tab Bar Component
 * 
 * A consolidated navigation bar that combines view mode switching,
 * API status, settings, and other dashboard controls into a clean tab interface.
 */

import React, { useState } from 'react';
import { ViewMode, useViewMode } from '../context/ViewModeContext';
import { DataType, VisualizationType } from '../types/dashboard';
import ApiHealthStatus from './ApiHealthStatus';
import AddElementDropdown, { ElementType } from './AddElementDropdown';
import HydrationSafeWrapper from './HydrationSafeWrapper';
import styles from './DashboardTabBar.module.css';

interface DashboardTabBarProps {
  className?: string;
  onSettingsClick?: () => void;
  onElementSelect?: (type: ElementType) => void;
  onElementCreate?: (dataType: DataType, visualizationType: VisualizationType) => void;
  showAddElement?: boolean;
}

interface TabConfig {
  id: string;
  mode?: ViewMode;
  label: string;
  icon: string;
  description: string;
  isAction?: boolean;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'edit',
    mode: 'edit',
    label: 'Edit',
    icon: '✏️',
    description: 'Edit dashboard layout and add/remove components',
  },
  {
    id: 'live',
    mode: 'live',
    label: 'Live',
    icon: '🔴',
    description: 'Interactive mode with data source editing',
  },
];

export default function DashboardTabBar({
  className = '',
  onSettingsClick,
  onElementSelect,
  onElementCreate,
  showAddElement = true,
}: DashboardTabBarProps) {
  const { state, setViewMode } = useViewMode();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleModeChange = (mode: ViewMode) => {
    if (mode === state.currentMode) {
      return;
    }
    setViewMode(mode);
  };

  const handleSettingsClick = () => {
    onSettingsClick?.();
  };

  return (
    <div className={`${styles.tabBar} ${className}`}>
      {/* Left section - Mode tabs */}
      <div className={styles.leftSection}>
        <div className={styles.modeTabsContainer}>
          {TAB_CONFIGS.map((config) => {
            const isActive = config.mode === state.currentMode;
            
            return (
              <button
                key={config.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Switch to ${config.label} mode`}
                className={`${styles.modeTab} ${isActive ? styles.active : ''}`}
                onClick={() => config.mode && handleModeChange(config.mode)}
                onMouseEnter={() => setActiveTooltip(config.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                title={config.description}
              >
                <span className={styles.tabIcon} aria-hidden="true">
                  {config.icon}
                </span>
                <span className={styles.tabLabel}>
                  {config.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className={styles.activeIndicator} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mode description */}
        <div className={styles.modeDescription}>
          {TAB_CONFIGS.find(config => config.mode === state.currentMode)?.description}
        </div>
      </div>

      {/* Center section - API Status */}
      <div className={styles.centerSection}>
        <HydrationSafeWrapper fallback={
          <div className={styles.statusFallback}>
            <span className={styles.statusIcon}>⚪</span>
            <span className={styles.statusText}>Loading API status...</span>
          </div>
        }>
          <div className={styles.apiStatusWrapper}>
            <ApiHealthStatus className={styles.apiStatus} showDetails={false} />
          </div>
        </HydrationSafeWrapper>
      </div>

      {/* Right section - Actions */}
      <div className={styles.rightSection}>
        {/* Add Element Dropdown (Edit mode only) */}
        {state.isEditMode && showAddElement && onElementSelect && onElementCreate && (
          <div className={styles.actionItem}>
            <AddElementDropdown
              onElementSelect={onElementSelect}
              onElementCreate={onElementCreate}
            />
          </div>
        )}

        {/* Settings Button */}
        <button
          type="button"
          className={styles.settingsButton}
          onClick={handleSettingsClick}
          onMouseEnter={() => setActiveTooltip('settings')}
          onMouseLeave={() => setActiveTooltip(null)}
          title="Dashboard Settings"
          aria-label="Open dashboard settings"
        >
          <span className={styles.settingsIcon} aria-hidden="true">
            ⚙️
          </span>
          <span className={styles.settingsLabel}>
            Settings
          </span>
        </button>
      </div>

      {/* Tooltip */}
      {activeTooltip && (
        <div className={styles.tooltip} role="tooltip">
          {activeTooltip === 'settings' && 'Dashboard Settings'}
          {activeTooltip === 'edit' && 'Edit dashboard layout and add/remove components'}
          {activeTooltip === 'live' && 'Interactive mode with data source editing'}
        </div>
      )}
    </div>
  );
}

// Export a simplified version for basic use cases
export function SimpleDashboardTabBar({
  className = '',
  onSettingsClick,
}: {
  className?: string;
  onSettingsClick?: () => void;
}) {
  return (
    <DashboardTabBar
      className={className}
      onSettingsClick={onSettingsClick}
      showAddElement={false}
    />
  );
}
