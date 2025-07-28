'use client';

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { MultiChartCrossfilter, FilterState } from '../utils/crossfilter';
import { ChartData } from '../types/dashboard';

interface CrossfilterContextType {
  registerChart: (chartId: string, data: any[], updateCallback: (data: ChartData) => void) => void;
  unregisterChart: (chartId: string) => void;
  applyFilter: (sourceChartId: string, dimensionId: string, filter: FilterState) => void;
  clearAllFilters: () => void;
  clearChartFilter: (chartId: string, dimensionId: string) => void;
  isFilterActive: (dimensionId: string) => boolean;
  getActiveFilters: () => Map<string, FilterState>;
}

const CrossfilterContext = createContext<CrossfilterContextType | null>(null);

interface CrossfilterProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function CrossfilterProvider({ children, enabled = true }: CrossfilterProviderProps) {
  const multiCrossfilterRef = useRef<MultiChartCrossfilter | null>(null);
  const activeFiltersRef = useRef<Map<string, FilterState>>(new Map());

  // Initialize the multi-chart crossfilter
  if (!multiCrossfilterRef.current && enabled) {
    multiCrossfilterRef.current = new MultiChartCrossfilter();
  }

  const registerChart = useCallback((
    chartId: string,
    data: any[],
    updateCallback: (data: ChartData) => void
  ) => {
    if (!multiCrossfilterRef.current || !enabled) return;
    
    multiCrossfilterRef.current.addChart(chartId, data, updateCallback);
  }, [enabled]);

  const unregisterChart = useCallback((chartId: string) => {
    if (!multiCrossfilterRef.current || !enabled) return;
    
    multiCrossfilterRef.current.removeChart(chartId);
  }, [enabled]);

  const applyFilter = useCallback((
    sourceChartId: string,
    dimensionId: string,
    filter: FilterState
  ) => {
    if (!multiCrossfilterRef.current || !enabled) return;
    
    // Store the active filter
    activeFiltersRef.current.set(dimensionId, filter);
    
    // Apply filter to all other charts
    multiCrossfilterRef.current.applyFilter(sourceChartId, dimensionId, filter);
  }, [enabled]);

  const clearAllFilters = useCallback(() => {
    if (!multiCrossfilterRef.current || !enabled) return;
    
    // Clear stored filters
    activeFiltersRef.current.clear();
    
    // Clear filters in crossfilter
    multiCrossfilterRef.current.clearAllFilters();
  }, [enabled]);

  const clearChartFilter = useCallback((chartId: string, dimensionId: string) => {
    if (!multiCrossfilterRef.current || !enabled) return;
    
    // Remove from active filters
    activeFiltersRef.current.delete(dimensionId);
    
    // This would need to be implemented in MultiChartCrossfilter
    // For now, we'll clear all filters as a workaround
    multiCrossfilterRef.current.clearAllFilters();
  }, [enabled]);

  const isFilterActive = useCallback((dimensionId: string) => {
    return activeFiltersRef.current.has(dimensionId);
  }, []);

  const getActiveFilters = useCallback(() => {
    return new Map(activeFiltersRef.current);
  }, []);

  const contextValue: CrossfilterContextType = {
    registerChart,
    unregisterChart,
    applyFilter,
    clearAllFilters,
    clearChartFilter,
    isFilterActive,
    getActiveFilters,
  };

  return (
    <CrossfilterContext.Provider value={contextValue}>
      {children}
    </CrossfilterContext.Provider>
  );
}

export function useCrossfilter(): CrossfilterContextType {
  const context = useContext(CrossfilterContext);
  if (!context) {
    throw new Error('useCrossfilter must be used within a CrossfilterProvider');
  }
  return context;
}

/**
 * Hook for individual charts to integrate with crossfilter
 */
export function useChartCrossfilter(
  chartId: string,
  data: any[],
  onDataUpdate?: (filteredData: ChartData) => void
) {
  const crossfilter = useCrossfilter();
  const registeredRef = useRef(false);

  // Register chart with crossfilter system
  React.useEffect(() => {
    if (!registeredRef.current && data.length > 0) {
      crossfilter.registerChart(chartId, data, (filteredData) => {
        onDataUpdate?.(filteredData);
      });
      registeredRef.current = true;
    }

    return () => {
      if (registeredRef.current) {
        crossfilter.unregisterChart(chartId);
        registeredRef.current = false;
      }
    };
  }, [chartId, data, crossfilter, onDataUpdate]);

  // Apply time range filter
  const applyTimeFilter = useCallback((startDate: Date, endDate: Date) => {
    crossfilter.applyFilter(chartId, 'date', {
      dimensionId: 'date',
      range: [startDate, endDate],
    });
  }, [chartId, crossfilter]);

  // Apply value range filter
  const applyValueFilter = useCallback((minValue: number, maxValue: number) => {
    crossfilter.applyFilter(chartId, 'value', {
      dimensionId: 'value',
      range: [minValue, maxValue],
    });
  }, [chartId, crossfilter]);

  // Apply categorical filter
  const applyCategoryFilter = useCallback((categories: string[]) => {
    crossfilter.applyFilter(chartId, 'category', {
      dimensionId: 'category',
      values: categories,
    });
  }, [chartId, crossfilter]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    crossfilter.clearAllFilters();
  }, [crossfilter]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    const activeFilters = crossfilter.getActiveFilters();
    return activeFilters.size > 0;
  }, [crossfilter]);

  return {
    applyTimeFilter,
    applyValueFilter,
    applyCategoryFilter,
    clearFilters,
    hasActiveFilters,
    isFilterActive: crossfilter.isFilterActive,
    getActiveFilters: crossfilter.getActiveFilters,
  };
}

/**
 * Hook for creating brush selection on charts
 */
export function useChartBrush(
  chartId: string,
  onBrushSelection?: (selection: { start: any; end: any; dimension: string }) => void
) {
  const crossfilter = useCrossfilter();
  const [brushSelection, setBrushSelection] = React.useState<{
    start: any;
    end: any;
    dimension: string;
  } | null>(null);

  const handleBrushStart = useCallback((start: any, dimension: string = 'date') => {
    setBrushSelection({ start, end: start, dimension });
  }, []);

  const handleBrushMove = useCallback((end: any) => {
    setBrushSelection(prev => prev ? { ...prev, end } : null);
  }, []);

  const handleBrushEnd = useCallback(() => {
    if (brushSelection) {
      // Apply the brush selection as a filter
      crossfilter.applyFilter(chartId, brushSelection.dimension, {
        dimensionId: brushSelection.dimension,
        range: [brushSelection.start, brushSelection.end],
      });

      onBrushSelection?.(brushSelection);
    }
    setBrushSelection(null);
  }, [brushSelection, chartId, crossfilter, onBrushSelection]);

  const clearBrush = useCallback(() => {
    setBrushSelection(null);
    crossfilter.clearAllFilters();
  }, [crossfilter]);

  return {
    brushSelection,
    handleBrushStart,
    handleBrushMove,
    handleBrushEnd,
    clearBrush,
    isActive: brushSelection !== null,
  };
}
