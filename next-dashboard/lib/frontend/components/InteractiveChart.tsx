'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChartData } from '@/shared/types/dashboard';
import { DataSourceType, DATA_SOURCE_CONFIGS } from '@/shared/types/dataSource';
import { useExtendedDataSourceContext } from '@/frontend/context/ExtendedDataSourceContext';
import { useChartDataSource } from '@/frontend/hooks/useChartDataSource';
import styles from './InteractiveChart.module.css';

interface InteractiveChartProps {
  children: React.ReactNode;
  chartId: string;
  dataType: string;
  title: string;
  isLiveViewMode?: boolean;
  onDataSourceChange?: (newSource: DataSourceType, newData: ChartData) => void;
}

interface DataSourceEditProps {
  currentSource: DataSourceType;
  dataType: string;
  onSave: (newSource: DataSourceType) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function DataSourceEditInterface({
  currentSource,
  dataType,
  onSave,
  onCancel,
  isLoading = false
}: DataSourceEditProps) {
  const [selectedSource, setSelectedSource] = useState<DataSourceType>(currentSource);
  const { isSourceAvailable } = useExtendedDataSourceContext();

  const availableSources: DataSourceType[] = ['historical', 'live-api'];

  const handleSave = () => {
    if (selectedSource !== currentSource) {
      onSave(selectedSource);
    } else {
      onCancel();
    }
  };

  return (
    <div className={styles.editInterface}>
      <div className={styles.editHeader}>
        <h3 className={styles.editTitle}>Configure Data Source</h3>
        <p className={styles.editSubtitle}>Choose data source for {dataType}</p>
      </div>

      <div className={styles.editContent}>
        <div className={styles.sourceSelector}>
          <label className={styles.selectorLabel}>Data Source:</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as DataSourceType)}
            className={styles.sourceDropdown}
            disabled={isLoading}
          >
            {availableSources.map((source) => {
              const config = DATA_SOURCE_CONFIGS[source];
              const available = isSourceAvailable(source);
              return (
                <option 
                  key={source} 
                  value={source}
                  disabled={!available}
                >
                  {config.icon} {config.name}
                  {!available ? ' (Unavailable)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className={styles.sourceDescription}>
          <p>{DATA_SOURCE_CONFIGS[selectedSource].description}</p>
        </div>
      </div>

      <div className={styles.editActions}>
        <button
          type="button"
          onClick={onCancel}
          className={`${styles.actionButton} ${styles.cancelButton}`}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={`${styles.actionButton} ${styles.saveButton}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}>⟳</span>
              Applying...
            </>
          ) : (
            selectedSource !== currentSource ? 'Apply Changes' : 'Close'
          )}
        </button>
      </div>
    </div>
  );
}

export default function InteractiveChart({
  children,
  chartId,
  dataType,
  title,
  isLiveViewMode = false,
  onDataSourceChange,
}: InteractiveChartProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use chart-specific data source management
  const {
    data: chartData,
    isLoading,
    currentSource,
    switchSource,
  } = useChartDataSource({
    chartId,
    dataType,
    autoFetch: false, // We'll manage fetching manually
  });

  // Handle hover state
  const handleMouseEnter = useCallback(() => {
    if (isLiveViewMode && !isEditMode) {
      setIsHovered(true);
    }
  }, [isLiveViewMode, isEditMode]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Handle edit mode toggle
  const handleEditClick = useCallback(() => {
    if (!isLiveViewMode) return;
    
    setIsFlipping(true);
    setIsEditMode(true);
    setIsHovered(false);
  }, [isLiveViewMode]);

  // Handle data source change
  const handleDataSourceSave = useCallback(async (newSource: DataSourceType) => {
    try {
      // Switch the chart-specific data source
      await switchSource(newSource);

      // Notify parent component if callback provided
      if (onDataSourceChange && chartData) {
        onDataSourceChange(newSource, chartData);
      }

      // Exit edit mode with flip animation
      setIsFlipping(true);
      setTimeout(() => {
        setIsEditMode(false);
        setIsFlipping(false);
      }, 300);
    } catch (error) {
      console.error('Failed to change data source:', error);
      // TODO: Add proper error handling/notification
    }
  }, [switchSource, onDataSourceChange, chartData]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setIsFlipping(true);
    setTimeout(() => {
      setIsEditMode(false);
      setIsFlipping(false);
    }, 300);
  }, []);

  // Handle flip animation completion
  useEffect(() => {
    if (isFlipping) {
      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 600); // Total flip duration
      return () => clearTimeout(timer);
    }
  }, [isFlipping]);

  return (
    <div
      ref={containerRef}
      className={`${styles.interactiveContainer} ${isEditMode ? styles.editMode : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${styles.flipContainer} ${isFlipping ? styles.flipping : ''}`}>
        {/* Front side - Chart */}
        <div className={`${styles.flipSide} ${styles.frontSide} ${isEditMode ? styles.hidden : ''}`}>
          {children}
          
          {/* Data source edit icon overlay */}
          {isLiveViewMode && isHovered && !isEditMode && (
            <button
              type="button"
              className={styles.editOverlay}
              onClick={handleEditClick}
              aria-label={`Edit data source for ${title}`}
              title="Configure data source"
            >
              <span className={styles.editIcon}>⚙️</span>
            </button>
          )}
        </div>

        {/* Back side - Edit Interface */}
        <div className={`${styles.flipSide} ${styles.backSide} ${!isEditMode ? styles.hidden : ''}`}>
          <DataSourceEditInterface
            currentSource={currentSource}
            dataType={dataType}
            onSave={handleDataSourceSave}
            onCancel={handleEditCancel}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
