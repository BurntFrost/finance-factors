'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChartData, VisualizationType } from '../types/dashboard';
import styles from './SmoothChartTransition.module.css';

interface SmoothChartTransitionProps {
  data: ChartData;
  fromType: VisualizationType;
  toType: VisualizationType;
  onTransitionComplete: () => void;
  duration?: number;
}

export default function SmoothChartTransition({
  data,
  fromType,
  toType,
  onTransitionComplete,
  duration = 750,
}: SmoothChartTransitionProps) {
  const [transitionPhase, setTransitionPhase] = useState<'fadeOut' | 'fadeIn' | 'complete'>('fadeOut');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start with fade out
    setTransitionPhase('fadeOut');

    // After half the duration, switch to fade in
    timeoutRef.current = setTimeout(() => {
      setTransitionPhase('fadeIn');
      
      // After the full duration, complete the transition
      timeoutRef.current = setTimeout(() => {
        setTransitionPhase('complete');
        onTransitionComplete();
      }, duration / 2);
    }, duration / 2);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, onTransitionComplete]);

  const getTransitionClass = () => {
    switch (transitionPhase) {
      case 'fadeOut':
        return styles.fadeOut;
      case 'fadeIn':
        return styles.fadeIn;
      case 'complete':
        return styles.complete;
      default:
        return '';
    }
  };

  const getTransitionContent = () => {
    switch (transitionPhase) {
      case 'fadeOut':
        return (
          <div className={styles.transitionMessage}>
            <div className={styles.transitionIcon}>📊</div>
            <div className={styles.transitionText}>
              Switching from {getChartTypeLabel(fromType)} to {getChartTypeLabel(toType)}...
            </div>
          </div>
        );
      case 'fadeIn':
        return (
          <div className={styles.transitionMessage}>
            <div className={styles.transitionIcon}>✨</div>
            <div className={styles.transitionText}>
              Loading {getChartTypeLabel(toType)} visualization...
            </div>
          </div>
        );
      case 'complete':
        return null;
      default:
        return null;
    }
  };

  if (transitionPhase === 'complete') {
    return null;
  }

  return (
    <div className={`${styles.transitionContainer} ${getTransitionClass()}`}>
      <div className={styles.transitionOverlay}>
        {getTransitionContent()}
      </div>
      <div className={styles.transitionBackground}>
        <div className={styles.animatedBars}>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={styles.animatedBar}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${duration}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getChartTypeLabel(type: VisualizationType): string {
  switch (type) {
    case 'line-chart':
      return 'Line Chart';
    case 'bar-chart':
      return 'Bar Chart';
    case 'pie-chart':
      return 'Pie Chart';
    case 'doughnut-chart':
      return 'Doughnut Chart';
    case 'data-table':
      return 'Data Table';
    case 'summary-card':
      return 'Summary Cards';
    default:
      return 'Chart';
  }
}

/**
 * Hook for managing smooth chart transitions
 */
export function useChartTransition(
  initialType: VisualizationType,
  onTypeChange?: (newType: VisualizationType) => void
) {
  const [currentType, setCurrentType] = useState(initialType);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingType, setPendingType] = useState<VisualizationType | null>(null);

  const startTransition = (newType: VisualizationType) => {
    if (newType === currentType || isTransitioning) {
      return;
    }

    setIsTransitioning(true);
    setPendingType(newType);
  };

  const completeTransition = () => {
    if (pendingType) {
      setCurrentType(pendingType);
      onTypeChange?.(pendingType);
      setPendingType(null);
    }
    setIsTransitioning(false);
  };

  return {
    currentType,
    isTransitioning,
    pendingType,
    startTransition,
    completeTransition,
  };
}

/**
 * Enhanced chart type switcher with smooth transitions
 */
interface EnhancedVisualizationSwitcherProps {
  currentType: VisualizationType;
  onTypeChange: (newType: VisualizationType) => void;
  disabled?: boolean;
  showLabels?: boolean;
}

export function EnhancedVisualizationSwitcher({
  currentType,
  onTypeChange,
  disabled = false,
  showLabels = true,
}: EnhancedVisualizationSwitcherProps) {
  const { isTransitioning, startTransition } = useChartTransition(currentType, onTypeChange);

  const chartTypes: { type: VisualizationType; icon: string; label: string }[] = [
    { type: 'line-chart', icon: '📈', label: 'Line' },
    { type: 'bar-chart', icon: '📊', label: 'Bar' },
    { type: 'pie-chart', icon: '🥧', label: 'Pie' },
    { type: 'doughnut-chart', icon: '🍩', label: 'Doughnut' },
    { type: 'data-table', icon: '📋', label: 'Table' },
    { type: 'summary-card', icon: '📇', label: 'Cards' },
  ];

  return (
    <div className={styles.visualizationSwitcher}>
      {chartTypes.map(({ type, icon, label }) => (
        <button
          key={type}
          className={`${styles.typeButton} ${
            currentType === type ? styles.active : ''
          } ${isTransitioning ? styles.transitioning : ''}`}
          onClick={() => startTransition(type)}
          disabled={disabled || isTransitioning}
          title={`Switch to ${label} view`}
        >
          <span className={styles.typeIcon}>{icon}</span>
          {showLabels && <span className={styles.typeLabel}>{label}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Chart container with built-in transition support
 */
interface TransitionChartContainerProps {
  children: React.ReactNode;
  data: ChartData;
  currentType: VisualizationType;
  isTransitioning: boolean;
  fromType?: VisualizationType;
  toType?: VisualizationType;
  onTransitionComplete: () => void;
}

export function TransitionChartContainer({
  children,
  data,
  currentType,
  isTransitioning,
  fromType,
  toType,
  onTransitionComplete,
}: TransitionChartContainerProps) {
  return (
    <div className={styles.chartContainer}>
      {isTransitioning && fromType && toType ? (
        <SmoothChartTransition
          data={data}
          fromType={fromType}
          toType={toType}
          onTransitionComplete={onTransitionComplete}
        />
      ) : (
        <div className={`${styles.chartContent} ${isTransitioning ? styles.hidden : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}
