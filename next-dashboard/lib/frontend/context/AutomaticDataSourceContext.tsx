'use client';

/**
 * Automatic Data Source Context
 *
 * This context automatically attempts to load live data first, then falls back
 * to historical data if live data fails. It eliminates the need for manual data
 * source switching and provides a seamless user experience.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { DataFetchOptions, ApiResponse } from '@/shared/types/dataSource';

// Data source status types
export type DataSourceStatus = 'live' | 'historical-fallback' | 'loading' | 'error';

export interface AutomaticDataSourceState {
  status: DataSourceStatus;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  lastLiveAttempt: Date | null;
  retryCount: number;
  cache: Map<string, { data: unknown; timestamp: Date; ttl: number }>;
}

export interface AutomaticDataSourceContextType {
  state: AutomaticDataSourceState;
  fetchData: <T = unknown>(options: DataFetchOptions) => Promise<ApiResponse<T>>;
  clearCache: () => void;
  forceRetryLive: () => Promise<void>;
  getDataSourceStatus: () => DataSourceStatus;
}

// Action types for reducer
type AutomaticDataSourceAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STATUS'; payload: DataSourceStatus }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_UPDATED'; payload: Date }
  | { type: 'SET_LAST_LIVE_ATTEMPT'; payload: Date }
  | { type: 'INCREMENT_RETRY_COUNT' }
  | { type: 'RESET_RETRY_COUNT' }
  | { type: 'SET_CACHE_DATA'; payload: { key: string; data: unknown; ttl: number } }
  | { type: 'CLEAR_CACHE' };

// Initial state
const initialState: AutomaticDataSourceState = {
  status: 'loading',
  isLoading: false,
  error: null,
  lastUpdated: null,
  lastLiveAttempt: null,
  retryCount: 0,
  cache: new Map(),
};

// Reducer
function automaticDataSourceReducer(
  state: AutomaticDataSourceState,
  action: AutomaticDataSourceAction
): AutomaticDataSourceState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    case 'SET_LAST_LIVE_ATTEMPT':
      return { ...state, lastLiveAttempt: action.payload };
    case 'INCREMENT_RETRY_COUNT':
      return { ...state, retryCount: state.retryCount + 1 };
    case 'RESET_RETRY_COUNT':
      return { ...state, retryCount: 0 };
    case 'SET_CACHE_DATA':
      const newCache = new Map(state.cache);
      newCache.set(action.payload.key, {
        data: action.payload.data,
        timestamp: new Date(),
        ttl: action.payload.ttl,
      });
      return { ...state, cache: newCache };
    case 'CLEAR_CACHE':
      return { ...state, cache: new Map() };
    default:
      return state;
  }
}

// Context
const AutomaticDataSourceContext = createContext<AutomaticDataSourceContextType | null>(null);

// Provider props
interface AutomaticDataSourceProviderProps {
  children: React.ReactNode;
  retryInterval?: number; // Retry interval in milliseconds (default: 5 minutes)
  maxRetries?: number; // Maximum retry attempts before giving up (default: 3)
}

export function AutomaticDataSourceProvider({
  children,
  retryInterval = 5 * 60 * 1000, // 5 minutes
  maxRetries = 3,
}: AutomaticDataSourceProviderProps) {
  const [state, dispatch] = useReducer(automaticDataSourceReducer, initialState);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Check if cached data is still valid
  const isCacheValid = useCallback((key: string): boolean => {
    const cached = state.cache.get(key);
    if (!cached) return false;
    
    const now = new Date().getTime();
    const cacheTime = cached.timestamp.getTime();
    return (now - cacheTime) < cached.ttl;
  }, [state.cache]);

  // Get cached data if valid
  const getCachedData = useCallback(<T = unknown>(key: string): T | null => {
    if (!isCacheValid(key)) return null;
    return state.cache.get(key)?.data as T || null;
  }, [isCacheValid, state.cache]);

  // Attempt to fetch live data
  const attemptLiveData = useCallback(async <T = unknown>(
    options: DataFetchOptions
  ): Promise<ApiResponse<T> | null> => {
    try {
      dispatch({ type: 'SET_LAST_LIVE_ATTEMPT', payload: new Date() });
      
      // Import real API service dynamically
      const { realApiService } = await import('../../backend/services/realApiService');
      const { transformers } = await import('../../backend/services/dataTransformers');

      const apiResponse = await realApiService.fetchData(options);

      if (apiResponse.success && apiResponse.data) {
        const transformedData = transformers.chartData.transform(
          apiResponse.data as Array<{ date: string; value: number; label?: string }>,
          options.dataType
        );

        dispatch({ type: 'RESET_RETRY_COUNT' });
        dispatch({ type: 'SET_STATUS', payload: 'live' });
        dispatch({ type: 'SET_ERROR', payload: null });

        return {
          data: transformedData as T,
          success: true,
          timestamp: apiResponse.timestamp,
          source: apiResponse.source,
          metadata: apiResponse.metadata,
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Live data fetch failed:', error);
      return null;
    }
  }, []);

  // Fetch historical data as fallback
  const fetchHistoricalData = useCallback(async <T = unknown>(
    options: DataFetchOptions
  ): Promise<ApiResponse<T>> => {
    try {
      // Import historical data generators dynamically
      const { generateHistoricalDataByType } = await import('../../shared/utils/historicalDataGenerators');
      const historicalData = generateHistoricalDataByType(options.dataType, 'line-chart');

      dispatch({ type: 'SET_STATUS', payload: 'historical-fallback' });

      return {
        data: historicalData as T,
        success: true,
        timestamp: new Date(),
        source: 'Historical Data Generator (Fallback)',
        metadata: {
          isFallback: true,
          reason: 'Live data unavailable',
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate historical data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Schedule retry for live data with exponential backoff
  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    if (state.retryCount < maxRetries) {
      // Exponential backoff: 5min, 10min, 20min
      const backoffMultiplier = Math.pow(2, state.retryCount);
      const delay = retryInterval * backoffMultiplier;

      console.info(`Scheduling retry ${state.retryCount + 1}/${maxRetries} in ${Math.round(delay / 1000 / 60)} minutes`);

      retryTimeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;

        dispatch({ type: 'INCREMENT_RETRY_COUNT' });

        // Attempt to fetch live data for all cached data types
        const cacheKeys = Array.from(state.cache.keys());
        for (const cacheKey of cacheKeys) {
          if (cacheKey.startsWith('auto-')) {
            const dataType = cacheKey.replace('auto-', '');
            try {
              await attemptLiveData({ dataType });
            } catch (error) {
              console.warn(`Retry failed for ${dataType}:`, error);
            }
          }
        }
      }, delay);
    } else {
      console.info('Maximum retry attempts reached. Will retry on next user interaction.');
    }
  }, [state.retryCount, maxRetries, retryInterval, state.cache, attemptLiveData]);

  // Add mounted ref for cleanup
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Main fetch data function
  const fetchData = useCallback(async <T = unknown>(
    options: DataFetchOptions
  ): Promise<ApiResponse<T>> => {
    const { dataType, useCache = true } = options;
    const cacheKey = `auto-${dataType}`;

    try {
      // Don't set global loading state for individual component refreshes
      // Each component manages its own loading state
      dispatch({ type: 'SET_ERROR', payload: null });

      // Check cache first if enabled
      if (useCache) {
        const cachedData = getCachedData<T>(cacheKey);
        if (cachedData) {
          return {
            data: cachedData,
            success: true,
            timestamp: new Date(),
            source: 'Cache',
            metadata: { fromCache: true },
          };
        }
      }

      // Attempt live data first
      const liveResponse = await attemptLiveData<T>(options);
      
      if (liveResponse && liveResponse.success) {
        // Cache successful live data
        if (useCache && liveResponse.data) {
          dispatch({
            type: 'SET_CACHE_DATA',
            payload: {
              key: cacheKey,
              data: liveResponse.data,
              ttl: 15 * 60 * 1000, // 15 minutes
            },
          });
        }

        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        return liveResponse;
      }

      // Fall back to historical data
      console.info(`Falling back to historical data for ${dataType}`);
      const historicalResponse = await fetchHistoricalData<T>(options);

      // Cache historical data with shorter TTL
      if (useCache && historicalResponse.data) {
        dispatch({
          type: 'SET_CACHE_DATA',
          payload: {
            key: cacheKey,
            data: historicalResponse.data,
            ttl: 5 * 60 * 1000, // 5 minutes for historical data
          },
        });
      }

      // Schedule retry for live data
      scheduleRetry();

      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
      return historicalResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STATUS', payload: 'error' });
      
      return {
        data: null as T,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        source: 'Automatic Data Source',
      };
    } finally {
      // Individual components manage their own loading state
      // Don't set global loading state here
    }
  }, [attemptLiveData, fetchHistoricalData, getCachedData, scheduleRetry]);

  // Clear cache
  const clearCache = useCallback((): void => {
    dispatch({ type: 'CLEAR_CACHE' });
  }, []);

  // Check network connectivity
  const checkNetworkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Force retry live data
  const forceRetryLive = useCallback(async (): Promise<void> => {
    // Check network connectivity first
    const isOnline = await checkNetworkConnectivity();
    if (!isOnline) {
      console.warn('Network connectivity check failed. Skipping retry.');
      return;
    }

    dispatch({ type: 'RESET_RETRY_COUNT' });
    dispatch({ type: 'CLEAR_CACHE' });

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, [checkNetworkConnectivity]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.info('Network connection restored. Attempting to fetch live data.');
      dispatch({ type: 'RESET_RETRY_COUNT' });
      scheduleRetry();
    };

    const handleOffline = () => {
      console.info('Network connection lost. Pausing retry attempts.');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [scheduleRetry]);

  // Get current data source status
  const getDataSourceStatus = useCallback((): DataSourceStatus => {
    return state.status;
  }, [state.status]);

  // Context value
  const contextValue: AutomaticDataSourceContextType = {
    state,
    fetchData,
    clearCache,
    forceRetryLive,
    getDataSourceStatus,
  };

  return (
    <AutomaticDataSourceContext.Provider value={contextValue}>
      {children}
    </AutomaticDataSourceContext.Provider>
  );
}

// Hook to use the automatic data source context
export function useAutomaticDataSource(): AutomaticDataSourceContextType {
  const context = useContext(AutomaticDataSourceContext);
  if (!context) {
    throw new Error('useAutomaticDataSource must be used within an AutomaticDataSourceProvider');
  }
  return context;
}

// Export the context for direct access if needed
export { AutomaticDataSourceContext };
