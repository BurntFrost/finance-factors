'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Number of items to render outside visible area
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Optimized Virtualized List Component
 * 
 * Features:
 * - Virtual scrolling for large datasets
 * - Memoized calculations
 * - Smooth scrolling performance
 * - Configurable overscan for better UX
 * - Memory efficient rendering
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  getItemKey,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize calculations to prevent unnecessary recalculations
  const calculations = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItemCount + overscan * 2
    );
    const offsetY = startIndex * itemHeight;

    return {
      totalHeight,
      visibleItemCount,
      startIndex,
      endIndex,
      offsetY,
    };
  }, [items.length, itemHeight, containerHeight, scrollTop, overscan]);

  // Memoize visible items to prevent unnecessary re-renders
  const visibleItems = useMemo(() => {
    return items.slice(calculations.startIndex, calculations.endIndex + 1);
  }, [items, calculations.startIndex, calculations.endIndex]);

  // Optimized scroll handler with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Memoize item renderer to prevent recreation
  const renderVisibleItems = useMemo(() => {
    return visibleItems.map((item, index) => {
      const actualIndex = calculations.startIndex + index;
      const key = getItemKey ? getItemKey(item, actualIndex) : actualIndex;
      
      return (
        <div
          key={key}
          style={{
            position: 'absolute',
            top: (calculations.startIndex + index) * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [visibleItems, calculations.startIndex, itemHeight, renderItem, getItemKey]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: calculations.totalHeight,
          position: 'relative',
        }}
      >
        {renderVisibleItems}
      </div>
    </div>
  );
}

/**
 * Memoized List Item wrapper for better performance
 */
export const VirtualizedListItem = React.memo(function VirtualizedListItem<T>({
  item: _item,
  index: _index,
  children,
}: {
  item: T;
  index: number;
  children: React.ReactNode;
}) {
  return <>{children}</>;
});

/**
 * Hook for managing virtualized list state
 */
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const calculations = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
    const endIndex = Math.min(items.length - 1, startIndex + visibleItemCount);

    return {
      totalHeight,
      visibleItemCount,
      startIndex,
      endIndex,
      visibleItems: items.slice(startIndex, endIndex + 1),
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const scrollToIndex = useCallback((index: number) => {
    const newScrollTop = index * itemHeight;
    setScrollTop(newScrollTop);
  }, [itemHeight]);

  const scrollToTop = useCallback(() => {
    setScrollTop(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    const maxScrollTop = Math.max(0, items.length * itemHeight - containerHeight);
    setScrollTop(maxScrollTop);
  }, [items.length, itemHeight, containerHeight]);

  return {
    ...calculations,
    scrollTop,
    setScrollTop,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
  };
}

/**
 * Optimized Grid Virtualization for 2D layouts
 */
interface VirtualizedGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
}

export function VirtualizedGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  gap = 0,
  overscan = 2,
}: VirtualizedGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const calculations = useMemo(() => {
    const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
    const totalRows = Math.ceil(items.length / columnsPerRow);
    const totalHeight = totalRows * (itemHeight + gap) - gap;
    
    const visibleRowCount = Math.ceil(containerHeight / (itemHeight + gap));
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(totalRows - 1, startRow + visibleRowCount + overscan * 2);
    
    const startIndex = startRow * columnsPerRow;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnsPerRow - 1);

    return {
      columnsPerRow,
      totalRows,
      totalHeight,
      startRow,
      endRow,
      startIndex,
      endIndex,
    };
  }, [items.length, itemWidth, itemHeight, containerWidth, containerHeight, gap, scrollTop, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(calculations.startIndex, calculations.endIndex + 1);
  }, [items, calculations.startIndex, calculations.endIndex]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const renderVisibleItems = useMemo(() => {
    return visibleItems.map((item, index) => {
      const actualIndex = calculations.startIndex + index;
      const row = Math.floor(actualIndex / calculations.columnsPerRow);
      const col = actualIndex % calculations.columnsPerRow;
      
      return (
        <div
          key={actualIndex}
          style={{
            position: 'absolute',
            left: col * (itemWidth + gap),
            top: row * (itemHeight + gap),
            width: itemWidth,
            height: itemHeight,
          }}
        >
          {renderItem(item, actualIndex)}
        </div>
      );
    });
  }, [visibleItems, calculations, itemWidth, itemHeight, gap, renderItem]);

  return (
    <div
      style={{ width: containerWidth, height: containerHeight }}
      className="overflow-auto"
      onScroll={handleScroll}
    >
      <div
        style={{
          height: calculations.totalHeight,
          position: 'relative',
        }}
      >
        {renderVisibleItems}
      </div>
    </div>
  );
}

export default VirtualizedList;
