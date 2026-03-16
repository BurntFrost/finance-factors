'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DashboardElement } from '@/shared/types/dashboard';
import { useIsEditMode } from '@/frontend/context/ViewModeContext';
import styles from './ResizableChartContainer.module.css';

interface ResizableChartContainerProps {
  children: React.ReactNode;
  element: DashboardElement;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  maintainAspectRatio?: boolean;
  resizeHandles?: ('top' | 'right' | 'bottom' | 'left' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft')[];
}

export default function ResizableChartContainer({
  children,
  element: _element,
  onResize,
  onResizeEnd,
  minWidth = 300,
  minHeight = 200,
  maxWidth,
  maxHeight,
  aspectRatio,
  maintainAspectRatio: _maintainAspectRatio = false,
  resizeHandles = ['right', 'bottom', 'bottomRight'],
}: ResizableChartContainerProps) {
  const isEditMode = useIsEditMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);

  // Update dimensions when container size changes
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
          onResize?.(width, height);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [onResize]);

  const handleResizeStart = useCallback((direction: string) => {
    setIsResizing(true);
    setResizeDirection(direction);
  }, []);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection(null);
    onResizeEnd?.(dimensions.width, dimensions.height);
  }, [dimensions, onResizeEnd]);

  // Calculate responsive breakpoints
  const getResponsiveSize = useCallback(() => {
    if (typeof window === 'undefined') return { width: '100%', height: '400px' };

    const screenWidth = window.innerWidth;
    const width = '100%';
    let height = '400px';

    if (screenWidth < 768) {
      height = '300px';
    } else if (screenWidth < 1024) {
      height = '350px';
    } else if (screenWidth >= 1400) {
      height = '450px';
    }

    return { width, height };
  }, []);

  const responsiveSize = getResponsiveSize();

  if (!isEditMode) {
    // In view mode, use responsive sizing without resize handles
    return (
      <div
        ref={containerRef}
        className={styles.staticContainer}
        style={{
          width: responsiveSize.width,
          height: responsiveSize.height,
          minWidth,
          minHeight,
          maxWidth,
          maxHeight,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${styles.resizableContainer} ${isResizing ? styles.resizing : ''}`}
      data-resize-direction={resizeDirection}
    >
      <PanelGroup orientation="horizontal" className={styles.panelGroup}>
        <Panel
          panelRef={panelRef}
          className={styles.chartPanel}
          minSize={20}
          defaultSize={100}
          style={{
            minWidth,
            minHeight,
            maxWidth,
            maxHeight,
          }}
        >
          <div ref={containerRef} className={styles.chartContent}>
            {children}
            
            {/* Resize indicators */}
            {isEditMode && (
              <div className={styles.resizeIndicators}>
                <div className={styles.dimensionDisplay}>
                  {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
                </div>
                {aspectRatio && (
                  <div className={styles.aspectRatioDisplay}>
                    Ratio: {aspectRatio.toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {/* Custom resize handles */}
      {isEditMode && (
        <div className={styles.resizeHandles}>
          {resizeHandles.includes('right') && (
            <div
              className={`${styles.resizeHandle} ${styles.right}`}
              onMouseDown={() => handleResizeStart('right')}
              onMouseUp={handleResizeEnd}
            />
          )}
          {resizeHandles.includes('bottom') && (
            <div
              className={`${styles.resizeHandle} ${styles.bottom}`}
              onMouseDown={() => handleResizeStart('bottom')}
              onMouseUp={handleResizeEnd}
            />
          )}
          {resizeHandles.includes('bottomRight') && (
            <div
              className={`${styles.resizeHandle} ${styles.bottomRight}`}
              onMouseDown={() => handleResizeStart('bottomRight')}
              onMouseUp={handleResizeEnd}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Resizable dashboard grid that maintains responsive behavior
 */
interface ResizableDashboardGridProps {
  elements: DashboardElement[];
  onElementResize?: (elementId: string, width: number, height: number) => void;
  children: React.ReactNode;
}

export function ResizableDashboardGrid({
  elements,
  onElementResize,
  children,
}: ResizableDashboardGridProps) {
  const isEditMode = useIsEditMode();
  const [gridLayout, setGridLayout] = useState<'auto' | 'manual'>('auto');

  const handleElementResize = useCallback((elementId: string, width: number, height: number) => {
    onElementResize?.(elementId, width, height);
  }, [onElementResize]);

  if (!isEditMode) {
    // In view mode, use CSS Grid with responsive behavior
    return (
      <div className={styles.responsiveGrid}>
        {children}
      </div>
    );
  }

  return (
    <div className={styles.resizableGrid}>
      <div className={styles.gridControls}>
        <button
          className={`${styles.gridModeButton} ${gridLayout === 'auto' ? styles.active : ''}`}
          onClick={() => setGridLayout('auto')}
        >
          Auto Layout
        </button>
        <button
          className={`${styles.gridModeButton} ${gridLayout === 'manual' ? styles.active : ''}`}
          onClick={() => setGridLayout('manual')}
        >
          Manual Layout
        </button>
      </div>

      <PanelGroup
        orientation="vertical"
        className={styles.mainPanelGroup}
      >
        {/* Top row */}
        <Panel defaultSize={50} minSize={20}>
          <PanelGroup orientation="horizontal">
            {elements.slice(0, Math.ceil(elements.length / 2)).map((element, index) => (
              <React.Fragment key={element.id}>
                <Panel defaultSize={50} minSize={20}>
                  <ResizableChartContainer
                    element={element}
                    onResizeEnd={(width, height) => handleElementResize(element.id, width, height)}
                  >
                    {React.Children.toArray(children)[index]}
                  </ResizableChartContainer>
                </Panel>
                {index < Math.ceil(elements.length / 2) - 1 && (
                  <PanelResizeHandle className={styles.resizeHandle} />
                )}
              </React.Fragment>
            ))}
          </PanelGroup>
        </Panel>

        {elements.length > 2 && (
          <>
            <PanelResizeHandle className={styles.resizeHandle} />
            {/* Bottom row */}
            <Panel defaultSize={50} minSize={20}>
              <PanelGroup orientation="horizontal">
                {elements.slice(Math.ceil(elements.length / 2)).map((element, index) => (
                  <React.Fragment key={element.id}>
                    <Panel defaultSize={50} minSize={20}>
                      <ResizableChartContainer
                        element={element}
                        onResizeEnd={(width, height) => handleElementResize(element.id, width, height)}
                      >
                        {React.Children.toArray(children)[Math.ceil(elements.length / 2) + index]}
                      </ResizableChartContainer>
                    </Panel>
                    {index < elements.slice(Math.ceil(elements.length / 2)).length - 1 && (
                      <PanelResizeHandle className={styles.resizeHandle} />
                    )}
                  </React.Fragment>
                ))}
              </PanelGroup>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

/**
 * Hook for managing chart container dimensions
 */
export function useChartDimensions(
  elementId: string,
  initialWidth: number = 400,
  initialHeight: number = 300
) {
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const updateDimensions = useCallback((width: number, height: number) => {
    setDimensions({ width, height });
    
    // Save to localStorage for persistence
    const key = `chart-dimensions-${elementId}`;
    localStorage.setItem(key, JSON.stringify({ width, height }));
  }, [elementId]);

  // Load saved dimensions on mount
  useEffect(() => {
    const key = `chart-dimensions-${elementId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDimensions(parsed);
      } catch (error) {
        console.warn('Failed to parse saved dimensions:', error);
      }
    }
  }, [elementId]);

  return {
    dimensions,
    updateDimensions,
    width: dimensions.width,
    height: dimensions.height,
  };
}
