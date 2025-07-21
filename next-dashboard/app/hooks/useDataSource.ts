'use client';

/**
 * useDataSource Hook
 * 
 * A custom hook that provides components with data source functionality,
 * including data fetching, loading states, and error handling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDataSourceContext } from '../context/DataSourceContext';
import {
  DataSourceType,
  UseDataSourceReturn,
  DataSourceError,
  DataFetchOptions,
  CACHE_TTL,
} from '../types/dataSource';

interface UseDataSourceOptions {
  dataType: string;
  autoFetch?: boolean;
  useCache?: boolean;
  cacheTTL?: number;
  refreshInterval?: number;
  onError?: (error: DataSourceError) => void;
  onSuccess?: (data: unknown) => void;
}

export function useDataSource<T = unknown>(
  options: UseDataSourceOptions
): UseDataSourceReturn<T> {
  const {
    dataType,
    autoFetch = true,
    useCache = true,
    cacheTTL = CACHE_TTL.LIVE_DATA,
    refreshInterval,
    onError,
    onSuccess,
  } = options;

  const { state, switchDataSource, fetchData } = useDataSourceContext();
  
  // Local state for this hook instance
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

  // Fetch data function
  const fetchDataInternal = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchData<T>({
        ...fetchOptions,
        forceRefresh,
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
  }, [fetchData, fetchOptions, onError, onSuccess]);

  // Refresh function (force refresh)
  const refresh = useCallback(async () => {
    await fetchDataInternal(true);
  }, [fetchDataInternal]);

  // Switch source function
  const switchSource = useCallback(async (source: DataSourceType) => {
    try {
      await switchDataSource(source);
      // Data will be refetched automatically due to the effect below
    } catch (err) {
      const errorObj: DataSourceError = {
        type: 'unknown',
        message: err instanceof Error ? err.message : 'Failed to switch data source',
        retryable: true,
      };
      setError(errorObj);
      onError?.(errorObj);
    }
  }, [switchDataSource, onError]);

  // Auto-fetch when data source changes or component mounts
  useEffect(() => {
    if (autoFetch) {
      fetchDataInternal();
    }
  }, [state.currentSource, dataType, autoFetch, fetchDataInternal]);

  // Auto-refresh interval
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

  // Clear local state when global error occurs
  useEffect(() => {
    if (state.error) {
      const errorObj: DataSourceError = {
        type: 'api',
        message: state.error,
        retryable: true,
      };
      setError(errorObj);
    }
  }, [state.error]);

  // Sync loading state with global state
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
    refresh,
    source: state.currentSource,
    switchSource,
  };
}

// Specialized hooks for common data types
export function useHousePricesData(options?: Omit<UseDataSourceOptions, 'dataType'>) {
  return useDataSource({
    ...options,
    dataType: 'house-prices',
  });
}

export function useIncomeData(options?: Omit<UseDataSourceOptions, 'dataType'>) {
  return useDataSource({
    ...options,
    dataType: 'salary-income',
  });
}

export function useCostOfLivingData(options?: Omit<UseDataSourceOptions, 'dataType'>) {
  return useDataSource({
    ...options,
    dataType: 'cost-of-living',
  });
}

export function useInvestmentData(options?: Omit<UseDataSourceOptions, 'dataType'>) {
  return useDataSource({
    ...options,
    dataType: 'investment-returns',
  });
}

// Hook for multiple data types
export function useMultipleDataSources<T = unknown>(
  dataTypes: string[],
  options?: Omit<UseDataSourceOptions, 'dataType'>
): Record<string, UseDataSourceReturn<T>> {
  const results: Record<string, UseDataSourceReturn<T>> = {};

  dataTypes.forEach(dataType => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[dataType] = useDataSource<T>({
      ...options,
      dataType,
    });
  });

  return results;
}

// Hook for data source status and controls
export function useDataSourceStatus() {
  const { state, switchDataSource, clearCache, getConfig } = useDataSourceContext();

  const currentConfig = useMemo(() => getConfig(), [getConfig]);

  const switchToSample = useCallback(() => switchDataSource('sample'), [switchDataSource]);
  const switchToLive = useCallback(() => switchDataSource('live-api'), [switchDataSource]);

  return {
    currentSource: state.currentSource,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    config: currentConfig,
    switchToSample,
    switchToLive,
    switchDataSource,
    clearCache,
  };
}
