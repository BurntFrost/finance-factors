'use client';

/**
 * Automatic Data Source Hook
 *
 * A hook that provides automatic data fetching with live-first, historical-fallback behavior.
 * Eliminates the need for manual data source switching.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAutomaticDataSource as useAutomaticDataSourceContext } from '@/frontend/context/AutomaticDataSourceContext';
import { DataFetchOptions, ApiResponse } from '@/shared/types/dataSource';
import { ChartData, TableData, SummaryCardData } from '@/shared/types/dashboard';

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
  status: 'live' | 'historical-fallback' | 'loading' | 'error';
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
  const { fetchData, clearCache, forceRetryLive } = useAutomaticDataSourceContext();

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Track status/timestamps locally per-hook to avoid subscribing to shared context state
  const [localStatus, setLocalStatus] = useState<'live' | 'historical-fallback' | 'loading' | 'error'>('loading');
  const [localLastUpdated, setLocalLastUpdated] = useState<Date | null>(null);
  const [localLastLiveAttempt, setLocalLastLiveAttempt] = useState<Date | null>(null);

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const retryCountRef = useRef(0); // Track retry attempts for exponential backoff

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

  // Fetch data function — derives status locally from response metadata
  const fetchDataInternal = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setLocalStatus('loading');
      setError(null);
      setLocalLastLiveAttempt(new Date());

      const options: DataFetchOptions = {
        dataType,
        useCache: !forceRefresh,
        forceRefresh,
      };

      const response: ApiResponse<T> = await fetchData<T>(options);

      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        setData(response.data);
        retryCountRef.current = 0; // Reset retry backoff on success
        setLocalLastUpdated(response.timestamp || new Date());
        // Derive status from response source/metadata
        const isFallback = response.metadata?.isFallback === true;
        setLocalStatus(isFallback ? 'historical-fallback' : 'live');
      } else {
        const errorMessage = response.error || 'Failed to fetch data';
        setError(new Error(errorMessage));
        setLocalStatus('error');
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setLocalStatus('error');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dataType, fetchData]);

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

  // Refs for values used inside interval to avoid teardown/rebuild
  const fetchDataInternalRef = useRef(fetchDataInternal);
  fetchDataInternalRef.current = fetchDataInternal;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // Set up refresh interval with randomization — only rebuilds when interval value changes
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      // Add random delay (±10% of interval) to prevent all components from refreshing simultaneously
      const randomOffset = Math.random() * 0.2 - 0.1; // -10% to +10%
      const randomizedInterval = refreshInterval * (1 + randomOffset);

      // Add small initial delay to stagger the start of intervals
      const initialDelay = Math.random() * 5000; // 0-5 seconds

      const timeoutId = setTimeout(() => {
        refreshIntervalRef.current = setInterval(() => {
          if (!isLoadingRef.current) {
            fetchDataInternalRef.current();
          }
        }, randomizedInterval);
      }, initialDelay);

      return () => {
        clearTimeout(timeoutId);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval]);

  // Retry on error with exponential backoff (5s, 10s, 20s, 40s, capped at 60s)
  // Max 5 retries to prevent infinite retry storms across 12+ chart instances
  const MAX_RETRIES = 5;
  useEffect(() => {
    if (retryOnError && error && !isLoading && retryCountRef.current < MAX_RETRIES) {
      const backoffDelay = Math.min(5000 * Math.pow(2, retryCountRef.current), 60000);
      const retryTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          retryCountRef.current += 1;
          fetchDataInternalRef.current();
        }
      }, backoffDelay);

      return () => clearTimeout(retryTimeout);
    }
  }, [error, isLoading, retryOnError]);

  // Memoize the result — all values are local state, no context state subscription
  return useMemo(() => ({
    data,
    isLoading,
    error,
    status: localStatus,
    lastUpdated: localLastUpdated,
    lastLiveAttempt: localLastLiveAttempt,
    refresh,
    forceRetryLive: handleForceRetryLive,
    clearCache: handleClearCache,
  }), [
    data,
    isLoading,
    error,
    localStatus,
    localLastUpdated,
    localLastLiveAttempt,
    refresh,
    handleForceRetryLive,
    handleClearCache,
  ]);
}

// Specialized hooks for common data types
export function useHousePricesDataAutomatic(): UseAutomaticDataSourceResult<ChartData> {
  return useAutomaticDataSource<ChartData>({
    dataType: 'house-prices',
    autoFetch: true,
    refreshInterval: 24 * 60 * 60 * 1000, // 24 hours - matches cache TTL
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
    refreshInterval: 24 * 60 * 60 * 1000, // 24 hours - matches cache TTL
  });
}

// Hook for table data
export function useTableDataAutomatic(dataType: string): UseAutomaticDataSourceResult<TableData> {
  return useAutomaticDataSource<TableData>({
    dataType,
    autoFetch: true,
    refreshInterval: 24 * 60 * 60 * 1000, // 24 hours - matches cache TTL
  });
}

// Hook for summary card data
export function useSummaryCardDataAutomatic(dataType: string): UseAutomaticDataSourceResult<SummaryCardData[]> {
  return useAutomaticDataSource<SummaryCardData[]>({
    dataType,
    autoFetch: true,
    refreshInterval: 24 * 60 * 60 * 1000, // 24 hours - matches cache TTL
  });
}
