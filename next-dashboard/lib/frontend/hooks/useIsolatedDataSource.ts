'use client';

/**
 * useIsolatedDataSource Hook
 * 
 * A custom hook that provides components with completely isolated data source functionality.
 * This hook ensures that individual component operations (like refreshes) do not affect
 * global state or other components, providing true component-level isolation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useExtendedDataSourceContext } from '@/frontend/context/ExtendedDataSourceContext';
import {
  DataSourceType,
  UseDataSourceReturn,
  DataSourceError,
  DataFetchOptions,
  CACHE_TTL,
} from '@/shared/types/dataSource';

interface UseIsolatedDataSourceOptions {
  dataType: string;
  chartId?: string; // Optional chart ID for chart-specific operations
  autoFetch?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
  refreshInterval?: number;
  onError?: (error: DataSourceError) => void;
  onSuccess?: (data: unknown) => void;
}

export function useIsolatedDataSource<T = unknown>(
  options: UseIsolatedDataSourceOptions
): UseDataSourceReturn<T> {
  const {
    dataType,
    chartId,
    autoFetch = true,
    useCache = true,
    cacheTTL = CACHE_TTL.LIVE_DATA,
    refreshInterval,
    onError,
    onSuccess,
  } = options;

  const { state, fetchData } = useExtendedDataSourceContext();
  
  // Local state for this hook instance - completely isolated from global state
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<DataSourceError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Create fetch options
  const fetchOptions: DataFetchOptions = useMemo(() => ({
    dataType,
    useCache,
    cacheTTL,
  }), [dataType, useCache, cacheTTL]);

  // Isolated fetch data function - never affects global state
  const fetchDataInternal = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchData<T>({
        ...fetchOptions,
        forceRefresh,
        chartId,
        isGlobalOperation: false, // Always mark as component operation
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
  }, [fetchData, fetchOptions, chartId, onError, onSuccess]);

  // Isolated refresh function - only affects this component
  const refresh = useCallback(async () => {
    await fetchDataInternal(true);
  }, [fetchDataInternal]);

  // Switch source function - this is a global operation, so we delegate to the global hook
  const switchSource = useCallback(async (_source: DataSourceType) => {
    // For source switching, we need to use the global mechanism
    // This will be handled by the parent component using the regular useDataSource hook
    console.warn('Source switching should be handled at the global level, not component level');
  }, []);

  // Auto-fetch when component mounts or dataType changes
  useEffect(() => {
    if (autoFetch) {
      fetchDataInternal();
    }
  }, [dataType, autoFetch, fetchDataInternal]);

  // Auto-refresh interval - completely isolated
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

  // Don't sync with global error state - keep component isolated
  // Components using this hook should handle their own error states

  return {
    data,
    isLoading, // Always use local loading state - no global synchronization
    error,
    lastUpdated,
    refresh,
    source: state.currentSource, // Read-only access to current source
    switchSource, // Placeholder - should be handled globally
  };
}

// Specialized hooks for common data types with isolation
export function useIsolatedHousePricesData(
  chartId?: string,
  options?: Omit<UseIsolatedDataSourceOptions, 'dataType' | 'chartId'>
) {
  return useIsolatedDataSource({
    ...options,
    dataType: 'house-prices',
    chartId,
  });
}

export function useIsolatedIncomeData(
  chartId?: string,
  options?: Omit<UseIsolatedDataSourceOptions, 'dataType' | 'chartId'>
) {
  return useIsolatedDataSource({
    ...options,
    dataType: 'salary-income',
    chartId,
  });
}

export function useIsolatedCostOfLivingData(
  chartId?: string,
  options?: Omit<UseIsolatedDataSourceOptions, 'dataType' | 'chartId'>
) {
  return useIsolatedDataSource({
    ...options,
    dataType: 'cost-of-living',
    chartId,
  });
}

export function useIsolatedInvestmentData(
  chartId?: string,
  options?: Omit<UseIsolatedDataSourceOptions, 'dataType' | 'chartId'>
) {
  return useIsolatedDataSource({
    ...options,
    dataType: 'investment-returns',
    chartId,
  });
}
