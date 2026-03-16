'use client';

/**
 * Parallel Dashboard Data Hook
 *
 * A specialized hook for fetching multiple dashboard data types in parallel
 * to improve initial dashboard load performance while maintaining fallback mechanisms.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutomaticDataSource as useAutomaticDataSourceContext } from '@/frontend/context/AutomaticDataSourceContext';
import { DataFetchOptions, ApiResponse } from '@/shared/types/dataSource';
import { ChartData } from '@/shared/types/dashboard';

export interface DashboardDataRequest {
  dataType: string;
  options?: Omit<DataFetchOptions, 'dataType'>;
}

export interface ParallelDashboardResult<T = ChartData> {
  data: Record<string, T | null>;
  isLoading: boolean;
  errors: Record<string, string | null>;
  lastUpdated: Record<string, Date | null>;
  isAnyLoading: boolean;
  hasAnyError: boolean;
  refreshAll: () => Promise<void>;
  refreshSingle: (dataType: string) => Promise<void>;
  getLoadingProgress: () => { completed: number; total: number; percentage: number };
  isInitialLoad: boolean; // New field to track initial vs retry loading
}

export function useParallelDashboardData<T = ChartData>(
  requests: DashboardDataRequest[],
  options?: {
    autoFetch?: boolean;
    refreshInterval?: number;
    staggerDelay?: number; // Delay between parallel requests to avoid overwhelming APIs
  }
): ParallelDashboardResult<T> {
  const { fetchData } = useAutomaticDataSourceContext();
  const { autoFetch = true, refreshInterval, staggerDelay = 100 } = options || {};



  // State for each data type
  const [data, setData] = useState<Record<string, T | null>>(() =>
    requests.reduce((acc, req) => ({ ...acc, [req.dataType]: null }), {})
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true); // Track if this is initial load
  const isInitialLoadRef = useRef(true); // Ref mirror to avoid callback identity changes
  const [errors, setErrors] = useState<Record<string, string | null>>(() =>
    requests.reduce((acc, req) => ({ ...acc, [req.dataType]: null }), {})
  );
  const [lastUpdated, setLastUpdated] = useState<Record<string, Date | null>>(() =>
    requests.reduce((acc, req) => ({ ...acc, [req.dataType]: null }), {})
  );
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(() =>
    requests.reduce((acc, req) => ({ ...acc, [req.dataType]: false }), {})
  );

  // Refs for cleanup and interval management
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Computed states
  const isAnyLoading = Object.values(loadingStates).some(loading => loading);
  const hasAnyError = Object.values(errors).some(error => error !== null);

  // Function to fetch a single data type
  const fetchSingleData = useCallback(async (request: DashboardDataRequest): Promise<void> => {
    const { dataType, options: requestOptions } = request;

    // Note: Removed mounted check to allow staggered requests to complete
    // The state updates are protected by React's built-in safeguards

    // Set loading state for this specific data type
    setLoadingStates(prev => ({ ...prev, [dataType]: true }));
    setErrors(prev => ({ ...prev, [dataType]: null }));

    try {
      const fetchOptions: DataFetchOptions = {
        dataType,
        useCache: true,
        ...requestOptions,
      };

      const response: ApiResponse<T> = await fetchData<T>(fetchOptions);

      if (response.success && response.data) {
        setData(prev => ({ ...prev, [dataType]: response.data }));
        setLastUpdated(prev => ({ ...prev, [dataType]: response.timestamp }));
        console.log(`✅ Parallel fetch completed for ${dataType}:`, {
          source: response.source,
          timestamp: response.timestamp,
          dataType: typeof response.data,
          hasLabels: !!(response.data as any)?.labels,
          hasDatasets: !!(response.data as any)?.datasets,
          datasetCount: (response.data as any)?.datasets?.length || 0,
        });
      } else {
        const errorMessage = response.error || 'Failed to fetch data';
        setErrors(prev => ({ ...prev, [dataType]: errorMessage }));
        console.warn(`❌ Parallel fetch failed for ${dataType}:`, errorMessage);
      }
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, [dataType]: errorMessage }));
      console.error(`💥 Parallel fetch error for ${dataType}:`, error);
    } finally {
      if (isMountedRef.current) {
        setLoadingStates(prev => ({ ...prev, [dataType]: false }));
      }
    }
  }, [fetchData]);

  // Function to fetch all data types in parallel with optional staggering
  const fetchAllData = useCallback(async (isUserTriggered: boolean = false): Promise<void> => {

    setIsLoading(true);

    // Only show progress bar for initial load or user-triggered refreshes
    if (!isInitialLoadRef.current && !isUserTriggered) {
      // Background retry — already marked as non-initial, no state change needed
    }

    console.log(`🚀 Starting parallel fetch for ${requests.length} data types:`,
      requests.map(r => r.dataType).join(', '));

    try {
      if (staggerDelay > 0) {
        // Staggered parallel requests to be gentler on APIs
        const promises = requests.map((request, index) =>
          new Promise<void>(resolve => {
            setTimeout(async () => {
              await fetchSingleData(request);
              resolve();
            }, index * staggerDelay);
          })
        );
        await Promise.allSettled(promises);
      } else {
        // True parallel requests
        const promises = requests.map(request => fetchSingleData(request));
        await Promise.allSettled(promises);
      }

      console.log(`✨ Parallel fetch completed for all ${requests.length} data types`);

      // Mark initial load as complete after first successful fetch
      if (isInitialLoadRef.current) {
        setIsInitialLoad(false);
        isInitialLoadRef.current = false;
      }
    } catch (error) {
      console.error('💥 Error in parallel fetch:', error);
    } finally {
      setIsLoading(false);
    }
  }, [requests, fetchSingleData, staggerDelay]); // isInitialLoad removed — read from ref

  // Function to refresh a single data type
  const refreshSingle = useCallback(async (dataType: string): Promise<void> => {
    const request = requests.find(req => req.dataType === dataType);
    if (request) {
      await fetchSingleData(request);
    }
  }, [requests, fetchSingleData]);

  // Function to refresh all data types
  const refreshAll = useCallback(async (): Promise<void> => {
    await fetchAllData(true); // Mark as user-triggered to show progress bar
  }, [fetchAllData]);

  // Function to get loading progress — uses ref to avoid rebuilding on every loadingStates change
  const loadingStatesRef = useRef(loadingStates);
  loadingStatesRef.current = loadingStates;

  const getLoadingProgress = useCallback(() => {
    const total = requests.length;
    const completed = Object.values(loadingStatesRef.current).filter(loading => !loading).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { completed, total, percentage };
  }, [requests.length]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchAllData(false); // Initial load, but not user-triggered
    }
  }, [autoFetch, fetchAllData]);

  // Keep refs for values used in interval to avoid teardown/rebuild on every render
  const fetchAllDataRef = useRef(fetchAllData);
  fetchAllDataRef.current = fetchAllData;
  const isAnyLoadingRef = useRef(isAnyLoading);
  isAnyLoadingRef.current = isAnyLoading;

  // Set up refresh interval — only depends on refreshInterval value
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (isMountedRef.current && !isAnyLoadingRef.current) {
          console.log(`🔄 Auto-refreshing dashboard data (interval: ${refreshInterval}ms)`);
          fetchAllDataRef.current(false);
        }
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    data,
    isLoading,
    errors,
    lastUpdated,
    isAnyLoading,
    hasAnyError,
    refreshAll,
    refreshSingle,
    getLoadingProgress,
    isInitialLoad,
  };
}

// Static array of standard dashboard requests — module-scoped to avoid re-creation on every render
const STANDARD_REQUESTS: DashboardDataRequest[] = [
  { dataType: 'house-prices' },
  { dataType: 'salary-income' },
  { dataType: 'inflation-cpi' },
  { dataType: 'core-inflation' },
  { dataType: 'fed-balance-sheet' },
  { dataType: 'federal-funds-rate' },
  { dataType: 'unemployment-rate' },
  { dataType: 'gdp-growth' },
  { dataType: 'money-supply-m1' },
  { dataType: 'money-supply-m2' },
  { dataType: 'treasury-10y' },
  { dataType: 'treasury-2y' },
];

// Predefined hook for common dashboard data types
export function useStandardDashboardData(options?: {
  autoFetch?: boolean;
  refreshInterval?: number;
  staggerDelay?: number;
}): ParallelDashboardResult<ChartData> {
  return useParallelDashboardData(STANDARD_REQUESTS, options);
}
