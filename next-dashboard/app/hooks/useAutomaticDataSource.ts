'use client';

/**
 * Automatic Data Source Hook
 * 
 * A hook that provides automatic data fetching with live-first, sample-fallback behavior.
 * Eliminates the need for manual data source switching.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutomaticDataSource as useAutomaticDataSourceContext } from '../context/AutomaticDataSourceContext';
import { DataFetchOptions, ApiResponse } from '../types/dataSource';
import { ChartData, TableData, SummaryCardData } from '../types/dashboard';

export interface UseAutomaticDataSourceOptions {
  dataType: string;
  autoFetch?: boolean;
  refreshInterval?: number; // Auto-refresh interval in milliseconds
  retryOnError?: boolean;
}

export interface UseAutomaticDataSourceResult<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  status: 'live' | 'sample-fallback' | 'loading' | 'error';
  lastUpdated: Date | null;
  lastLiveAttempt: Date | null;
  refresh: () => Promise<void>;
  forceRetryLive: () => Promise<void>;
  clearCache: () => void;
}

export function useAutomaticDataSource<T = unknown>({
  dataType,
  autoFetch = true,
  refreshInterval,
  retryOnError = true,
}: UseAutomaticDataSourceOptions): UseAutomaticDataSourceResult<T> {
  const { state, fetchData, clearCache, forceRetryLive } = useAutomaticDataSourceContext();
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Fetch data function
  const fetchDataInternal = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const options: DataFetchOptions = {
        dataType,
        useCache: !forceRefresh,
        forceRefresh,
      };

      const response: ApiResponse<T> = await fetchData<T>(options);

      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        setData(response.data);
        setError(null);
      } else {
        const errorMessage = response.error || 'Failed to fetch data';
        setError(new Error(errorMessage));
        
        // Don't clear data on error if we have existing data
        if (!data) {
          setData(null);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      // Don't clear data on error if we have existing data
      if (!data) {
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dataType, fetchData, data]);

  // Refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await fetchDataInternal(true);
  }, [fetchDataInternal]);

  // Force retry live data
  const handleForceRetryLive = useCallback(async (): Promise<void> => {
    await forceRetryLive();
    await fetchDataInternal(true);
  }, [forceRetryLive, fetchDataInternal]);

  // Clear cache function
  const handleClearCache = useCallback((): void => {
    clearCache();
    setData(null);
    setError(null);
  }, [clearCache]);

  // Auto-fetch on mount and dataType change
  useEffect(() => {
    if (autoFetch) {
      fetchDataInternal();
    }
  }, [dataType, autoFetch, fetchDataInternal]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isLoading) {
          fetchDataInternal();
        }
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, isLoading, fetchDataInternal]);

  // Retry on error if enabled
  useEffect(() => {
    if (retryOnError && error && !isLoading) {
      const retryTimeout = setTimeout(() => {
        if (isMountedRef.current && error) {
          fetchDataInternal();
        }
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(retryTimeout);
    }
  }, [error, isLoading, retryOnError, fetchDataInternal]);

  return {
    data,
    isLoading: isLoading || state.isLoading,
    error,
    status: state.status,
    lastUpdated: state.lastUpdated,
    lastLiveAttempt: state.lastLiveAttempt,
    refresh,
    forceRetryLive: handleForceRetryLive,
    clearCache: handleClearCache,
  };
}

// Specialized hooks for common data types
export function useHousePricesDataAutomatic(): UseAutomaticDataSourceResult<ChartData> {
  return useAutomaticDataSource<ChartData>({
    dataType: 'house-prices',
    autoFetch: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
  });
}

export function useIncomeDataAutomatic(): UseAutomaticDataSourceResult<ChartData> {
  return useAutomaticDataSource<ChartData>({
    dataType: 'salary-income',
    autoFetch: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
  });
}

export function useUnemploymentDataAutomatic(): UseAutomaticDataSourceResult<ChartData> {
  return useAutomaticDataSource<ChartData>({
    dataType: 'unemployment-rate',
    autoFetch: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
  });
}

export function useInflationDataAutomatic(): UseAutomaticDataSourceResult<ChartData> {
  return useAutomaticDataSource<ChartData>({
    dataType: 'inflation-rate',
    autoFetch: true,
    refreshInterval: 60 * 60 * 1000, // 1 hour
  });
}

export function useGdpDataAutomatic(): UseAutomaticDataSourceResult<ChartData> {
  return useAutomaticDataSource<ChartData>({
    dataType: 'gdp-growth',
    autoFetch: true,
    refreshInterval: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for table data
export function useTableDataAutomatic(dataType: string): UseAutomaticDataSourceResult<TableData> {
  return useAutomaticDataSource<TableData>({
    dataType,
    autoFetch: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
  });
}

// Hook for summary card data
export function useSummaryCardDataAutomatic(dataType: string): UseAutomaticDataSourceResult<SummaryCardData[]> {
  return useAutomaticDataSource<SummaryCardData[]>({
    dataType,
    autoFetch: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
  });
}
