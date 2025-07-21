'use client';

/**
 * Chart-specific Data Source Hook
 * 
 * This hook provides data source management for individual charts,
 * allowing each chart to have its own data source while maintaining
 * consistency with the global data source system.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useExtendedDataSourceContext } from '../context/ExtendedDataSourceContext';
import { DataSourceType, DataSourceError, CACHE_TTL } from '../types/dataSource';
import { ChartData } from '../types/dashboard';

export interface UseChartDataSourceOptions {
  chartId: string;
  dataType: string;
  autoFetch?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
  refreshInterval?: number;
  onError?: (error: DataSourceError) => void;
  onSuccess?: (data: ChartData) => void;
}

export interface UseChartDataSourceReturn {
  data: ChartData | null;
  isLoading: boolean;
  error: DataSourceError | null;
  lastUpdated: Date | null;
  currentSource: DataSourceType;
  refresh: () => Promise<void>;
  switchSource: (source: DataSourceType) => Promise<void>;
  resetToGlobal: () => void;
  isUsingCustomSource: boolean;
}

export function useChartDataSource(options: UseChartDataSourceOptions): UseChartDataSourceReturn {
  const {
    chartId,
    dataType,
    autoFetch = true,
    useCache = true,
    cacheTTL = CACHE_TTL.LIVE_DATA,
    refreshInterval,
    onError,
    onSuccess,
  } = options;

  const {
    state,
    fetchData,
    setChartDataSource,
    getChartDataSource,
    removeChartConfig,
  } = useExtendedDataSourceContext();

  // Local state for this chart
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<DataSourceError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get current data source for this chart
  const currentSource = useMemo(() => getChartDataSource(chartId), [chartId, getChartDataSource]);

  // Check if chart is using a custom source (different from global)
  const isUsingCustomSource = useMemo(() => {
    return currentSource !== state.currentSource;
  }, [currentSource, state.currentSource]);

  // Fetch data function
  const fetchDataInternal = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchData<ChartData>({
        dataType,
        useCache,
        forceRefresh,
        chartId,
        cacheTTL,
      });

      if (response.success && response.data) {
        setData(response.data);
        setLastUpdated(response.timestamp);
        onSuccess?.(response.data);
      } else {
        const errorObj: DataSourceError = {
          type: 'api',
          message: response.error || 'Failed to fetch data',
          retryable: true,
        };
        setError(errorObj);
        onError?.(errorObj);
      }
    } catch (err) {
      const errorObj: DataSourceError = {
        type: err instanceof Error && err.message.includes('network') ? 'network' : 'unknown',
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        retryable: true,
      };
      setError(errorObj);
      onError?.(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, dataType, useCache, chartId, cacheTTL, onError, onSuccess]);

  // Refresh function (force refresh)
  const refresh = useCallback(async () => {
    await fetchDataInternal(true);
  }, [fetchDataInternal]);

  // Switch data source for this specific chart
  const switchSource = useCallback(async (source: DataSourceType) => {
    try {
      setIsLoading(true);
      setError(null);

      // Set the chart-specific data source
      await setChartDataSource(chartId, dataType, source);

      // Fetch new data with the new source
      await fetchDataInternal(true);
    } catch (err) {
      const errorObj: DataSourceError = {
        type: 'unknown',
        message: err instanceof Error ? err.message : 'Failed to switch data source',
        retryable: true,
      };
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [setChartDataSource, chartId, dataType, fetchDataInternal, onError]);

  // Reset to global data source
  const resetToGlobal = useCallback(() => {
    removeChartConfig(chartId);
    // Data will be refetched automatically due to the effect below
  }, [removeChartConfig, chartId]);

  // Auto-fetch data when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchDataInternal();
    }
  }, [autoFetch, fetchDataInternal, currentSource]);

  // Handle refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (!isLoading) {
          fetchDataInternal();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, isLoading, fetchDataInternal]);

  // Sync loading state with global state when needed
  useEffect(() => {
    if (state.isLoading && !isLoading) {
      setIsLoading(true);
    }
  }, [state.isLoading, isLoading]);

  return {
    data,
    isLoading: isLoading || state.isLoading,
    error,
    lastUpdated,
    currentSource,
    refresh,
    switchSource,
    resetToGlobal,
    isUsingCustomSource,
  };
}

// Specialized hooks for common chart types
export function useHousePricesChartData(
  chartId: string,
  options?: Omit<UseChartDataSourceOptions, 'chartId' | 'dataType'>
) {
  return useChartDataSource({
    chartId,
    dataType: 'house-prices',
    ...options,
  });
}

export function useIncomeChartData(
  chartId: string,
  options?: Omit<UseChartDataSourceOptions, 'chartId' | 'dataType'>
) {
  return useChartDataSource({
    chartId,
    dataType: 'salary-income',
    ...options,
  });
}

export function useCostOfLivingChartData(
  chartId: string,
  options?: Omit<UseChartDataSourceOptions, 'chartId' | 'dataType'>
) {
  return useChartDataSource({
    chartId,
    dataType: 'cost-of-living',
    ...options,
  });
}

// Hook for managing chart data source status and controls
export function useChartDataSourceStatus(chartId: string) {
  const {
    state,
    getChartDataSource,
    setChartDataSource,
    removeChartConfig,
    getConfig,
  } = useExtendedDataSourceContext();

  const currentSource = useMemo(() => getChartDataSource(chartId), [chartId, getChartDataSource]);
  const currentConfig = useMemo(() => getConfig(currentSource), [getConfig, currentSource]);
  const isUsingCustomSource = useMemo(() => currentSource !== state.currentSource, [currentSource, state.currentSource]);

  const switchToHistorical = useCallback(
    () => setChartDataSource(chartId, 'generic', 'historical'),
    [setChartDataSource, chartId]
  );

  const switchToLive = useCallback(
    () => setChartDataSource(chartId, 'generic', 'live-api'),
    [setChartDataSource, chartId]
  );

  const resetToGlobal = useCallback(
    () => removeChartConfig(chartId),
    [removeChartConfig, chartId]
  );

  return {
    currentSource,
    globalSource: state.currentSource,
    isUsingCustomSource,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    config: currentConfig,
    switchToHistorical,
    switchToLive,
    resetToGlobal,
    setChartDataSource: (dataType: string, source: DataSourceType) => 
      setChartDataSource(chartId, dataType, source),
  };
}
