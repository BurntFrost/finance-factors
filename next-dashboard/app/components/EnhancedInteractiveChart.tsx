'use client';

import React, { Suspense, lazy, useRef, useState, useCallback } from 'react';
import type { Chart } from 'chart.js';
import { ChartData, VisualizationType } from '../types/dashboard';
import { getDataStatus } from './DataStatusPill';
import { useIsEditMode } from '../context/ViewModeContext';
import {
  getInteractiveChartOptions,
  resetChartZoom,
  toggleChartZoom,
  toggleChartPan
} from '../config/interactiveChartConfiguration';
import VisualizationTypeSwitcher from './VisualizationTypeSwitcher';
import ExportMenu from './ExportMenu';
import { ChartCard } from '../../components/ui/chart-card';
import ChartSkeleton from './ChartSkeleton';
import styles from './EnhancedInteractiveChart.module.css';

// Lazy load Chart.js components
const Line = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Line }))
);

const Bar = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Bar }))
);

const Pie = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Pie }))
);

const Doughnut = lazy(() =>
  import('react-chartjs-2').then(module => ({ default: module.Doughnut }))
);

const ChartRegistration = lazy(() =>
  import('./ChartRegistration').then(module => ({ default: module.default }))
);

interface EnhancedInteractiveChartProps {
  type: 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart';
  data: ChartData;
  title: string;
  dataType?: string;
  onRemove?: () => void;
  onVisualizationChange?: (newType: VisualizationType) => void;
  config?: Record<string, unknown>;
  hideHeader?: boolean;
  hideFooter?: boolean;
  isChangingVisualization?: boolean;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableCrossfilter?: boolean;
  onDataPointClick?: (dataPoint: any) => void;
  onDataPointSelect?: (selectedPoints: any[]) => void;
}

export default function EnhancedInteractiveChart({
  type,
  data,
  title,
  dataType,
  onRemove,
  onVisualizationChange,
  config = {},
  hideHeader = false,
  hideFooter = false,
  isChangingVisualization = false,
  enableZoom = true,
  enablePan = true,
  enableCrossfilter = false,
  onDataPointClick,
  onDataPointSelect,
}: EnhancedInteractiveChartProps) {
  const isEditMode = useIsEditMode();
  const chartRef = useRef<Chart | null>(null);
  const _containerRef = useRef<HTMLDivElement>(null);
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [isZoomEnabled, setIsZoomEnabled] = useState(enableZoom);
  const [isPanEnabled, setIsPanEnabled] = useState(enablePan);
  const [showControls, setShowControls] = useState(false);

  // Handle data point selection
  const handleDataPointClick = useCallback((dataPoint: any, _chart: Chart) => {
    if (enableCrossfilter) {
      const newSelectedPoints = [...selectedPoints];
      const existingIndex = newSelectedPoints.findIndex(
        p => p.datasetIndex === dataPoint.datasetIndex && p.dataIndex === dataPoint.dataIndex
      );

      if (existingIndex >= 0) {
        // Remove if already selected
        newSelectedPoints.splice(existingIndex, 1);
      } else {
        // Add to selection
        newSelectedPoints.push(dataPoint);
      }

      setSelectedPoints(newSelectedPoints);
      onDataPointSelect?.(newSelectedPoints);
    }

    onDataPointClick?.(dataPoint);
  }, [selectedPoints, enableCrossfilter, onDataPointClick, onDataPointSelect]);

  // Handle data point hover for enhanced tooltips
  const handleDataPointHover = useCallback((_dataPoint: any, _chart: Chart) => {
    // Could add hover effects or preview functionality here
  }, []);

  // Get chart options with interactive features
  const chartOptions = getInteractiveChartOptions(dataType || '', {
    enableZoom: isZoomEnabled,
    enablePan: isPanEnabled,
    enableCrossfilter,
    onDataPointClick: handleDataPointClick,
    onDataPointHover: handleDataPointHover,
    customTooltip: true,
  });

  // Merge with any additional config
  const finalOptions = {
    ...chartOptions,
    ...config,
  };

  // Reset zoom handler
  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      resetChartZoom(chartRef.current);
    }
  }, []);

  // Toggle zoom handler
  const handleToggleZoom = useCallback(() => {
    const newZoomState = !isZoomEnabled;
    setIsZoomEnabled(newZoomState);
    if (chartRef.current) {
      toggleChartZoom(chartRef.current, newZoomState);
    }
  }, [isZoomEnabled]);

  // Toggle pan handler
  const handleTogglePan = useCallback(() => {
    const newPanState = !isPanEnabled;
    setIsPanEnabled(newPanState);
    if (chartRef.current) {
      toggleChartPan(chartRef.current, newPanState);
    }
  }, [isPanEnabled]);

  // Clear selection handler
  const handleClearSelection = useCallback(() => {
    setSelectedPoints([]);
    onDataPointSelect?.([]);
  }, [onDataPointSelect]);

  // Get chart component based on type
  const getChartComponent = () => {
    const commonProps = {
      ref: chartRef,
      data,
      options: finalOptions,
    };

    switch (type) {
      case 'line-chart':
        return <Line {...(commonProps as any)} />;
      case 'bar-chart':
        return <Bar {...(commonProps as any)} />;
      case 'pie-chart':
        return <Pie {...(commonProps as any)} />;
      case 'doughnut-chart':
        return <Doughnut {...(commonProps as any)} />;
      default:
        return <Line {...(commonProps as any)} />;
    }
  };

  const dataStatus = getDataStatus(data.lastUpdated, data.isRealData);

  // Create dashboard element for export
  const dashboardElement = React.useMemo(() => ({
    id: `enhanced-chart-${dataType || 'unknown'}`,
    type,
    dataType: dataType || 'unknown',
    title,
    data,
    config,
    isRealData: data.isRealData || false,
    dataSource: data.dataSource || 'Unknown',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUpdated: data.lastUpdated,
  }), [type, dataType, title, data, config]);

  // Handle export completion
  const handleExportComplete = useCallback((format: string) => {
    console.log(`Export completed: ${format} for chart ${title}`);
  }, [title]);

  return (
    <ChartCard
      title={hideHeader ? "" : title}
      status={hideHeader ? undefined : dataStatus}
      lastUpdated={hideHeader ? undefined : data.lastUpdated}
      isEditable={isEditMode}
      onRemove={onRemove}
      className={styles.enhancedChart}
      headerActions={!hideHeader ? (
        <div className={styles.headerActions}>
          <ExportMenu
            element={dashboardElement}
            onExportComplete={handleExportComplete}
          />
        </div>
      ) : undefined}
    >
      {!hideHeader && (
        <div className={styles.chartHeader}>
          <div className={styles.titleSection}>
            <h3 className={styles.chartTitle}>{title}</h3>
            {selectedPoints.length > 0 && (
              <span className={styles.selectionCount}>
                {selectedPoints.length} point{selectedPoints.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          
          <div className={styles.headerControls}>
            {/* Interactive controls */}
            <button
              className={styles.controlButton}
              onClick={() => setShowControls(!showControls)}
              title="Chart Controls"
            >
              ⚙️
            </button>
            
            {isEditMode && onRemove && (
              <button
                className={styles.removeButton}
                onClick={onRemove}
                title="Remove Chart"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Controls Panel */}
      {showControls && (
        <div className={styles.controlsPanel}>
          <div className={styles.controlGroup}>
            <button
              className={`${styles.controlBtn} ${isZoomEnabled ? styles.active : ''}`}
              onClick={handleToggleZoom}
              title="Toggle Zoom"
            >
              🔍 Zoom
            </button>
            <button
              className={`${styles.controlBtn} ${isPanEnabled ? styles.active : ''}`}
              onClick={handleTogglePan}
              title="Toggle Pan"
            >
              ✋ Pan
            </button>
            <button
              className={styles.controlBtn}
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              🔄 Reset
            </button>
          </div>
          
          {enableCrossfilter && selectedPoints.length > 0 && (
            <div className={styles.controlGroup}>
              <button
                className={styles.controlBtn}
                onClick={handleClearSelection}
                title="Clear Selection"
              >
                🗑️ Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div className={styles.chartWrapper}>
        {isChangingVisualization ? (
          <ChartSkeleton height={400} />
        ) : (
          <Suspense fallback={<ChartSkeleton height={400} />}>
            <ChartRegistration />
            {getChartComponent()}
          </Suspense>
        )}
      </div>

      {/* Footer with visualization switcher */}
      {!hideFooter && onVisualizationChange && (
        <div className={styles.chartFooter}>
          <VisualizationTypeSwitcher
            dataType={dataType || 'unknown'}
            currentVisualizationType={type}
            onVisualizationChange={onVisualizationChange}
            disabled={isChangingVisualization}
          />
        </div>
      )}
    </ChartCard>
  );
}
