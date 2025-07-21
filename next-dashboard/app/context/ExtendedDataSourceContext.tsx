'use client';

/**
 * Extended Data Source Context
 * 
 * This module extends the base DataSourceContext to support per-chart data source management.
 * It allows individual charts to have their own data sources while maintaining global state consistency.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useState } from 'react';
import {
  DataSourceType,
  ExtendedDataSourceState,
  ExtendedDataSourceAction,
  ExtendedDataSourceContextType,
  DataSourceConfig,
  DATA_SOURCE_CONFIGS,
  DataFetchOptions,
  ApiResponse,
  ChartDataSourceConfig,
} from '../types/dataSource';
import { dataSourcePreference, apiCache, initializeStorage } from '../utils/localStorage';

// Initial state
const initialState: ExtendedDataSourceState = {
  currentSource: 'sample',
  isLoading: false,
  error: null,
  lastUpdated: null,
  cache: {},
  chartConfigs: {},
};

// Extended reducer function
function extendedDataSourceReducer(state: ExtendedDataSourceState, action: ExtendedDataSourceAction): ExtendedDataSourceState {
  switch (action.type) {
    case 'SET_SOURCE':
      return {
        ...state,
        currentSource: action.payload,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'SET_LAST_UPDATED':
      return {
        ...state,
        lastUpdated: action.payload,
      };

    case 'SET_CACHE_DATA':
      const { key, data, ttl = 15 * 60 * 1000 } = action.payload;
      const expiresAt = new Date(Date.now() + ttl);
      return {
        ...state,
        cache: {
          ...state.cache,
          [key]: {
            data,
            timestamp: new Date(),
            expiresAt,
          },
        },
      };

    case 'CLEAR_CACHE':
      return {
        ...state,
        cache: {},
      };

    case 'SET_CHART_DATA_SOURCE':
      return {
        ...state,
        chartConfigs: {
          ...state.chartConfigs,
          [action.payload.chartId]: action.payload,
        },
      };

    case 'REMOVE_CHART_CONFIG':
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.payload]: _removed, ...remainingConfigs } = state.chartConfigs;
      return {
        ...state,
        chartConfigs: remainingConfigs,
      };

    case 'CLEAR_CHART_CONFIGS':
      return {
        ...state,
        chartConfigs: {},
      };

    default:
      return state;
  }
}

// Create context
const ExtendedDataSourceContext = createContext<ExtendedDataSourceContextType | undefined>(undefined);

// Custom hook to use the context
export function useExtendedDataSourceContext(): ExtendedDataSourceContextType {
  const context = useContext(ExtendedDataSourceContext);
  if (context === undefined) {
    throw new Error('useExtendedDataSourceContext must be used within an ExtendedDataSourceProvider');
  }
  return context;
}

// Provider component
export function ExtendedDataSourceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(extendedDataSourceReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize storage and handle hydration
  useEffect(() => {
    // Mark as hydrated to prevent SSR mismatches
    setIsHydrated(true);

    initializeStorage();

    // Load saved preference only after hydration
    const savedSource = dataSourcePreference.load();
    if (savedSource && savedSource !== state.currentSource) {
      dispatch({ type: 'SET_SOURCE', payload: savedSource });
    }
  }, []); // Remove state.currentSource dependency to prevent loops

  // Check if a data source is available
  const isSourceAvailable = useCallback((source: DataSourceType): boolean => {
    const config = DATA_SOURCE_CONFIGS[source];
    return !!config;
  }, []);

  // Switch global data source
  const switchDataSource = useCallback(async (source: DataSourceType): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      if (!isSourceAvailable(source)) {
        throw new Error(`Data source "${source}" is not available`);
      }

      dataSourcePreference.save(source);
      dispatch({ type: 'SET_SOURCE', payload: source });
      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });

      if (source !== state.currentSource) {
        dispatch({ type: 'CLEAR_CACHE' });
        apiCache.clear();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch data source';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentSource, isSourceAvailable]);

  // Set data source for a specific chart
  const setChartDataSource = useCallback(async (chartId: string, dataType: string, source: DataSourceType): Promise<void> => {
    try {
      if (!isSourceAvailable(source)) {
        throw new Error(`Data source "${source}" is not available`);
      }

      const config: ChartDataSourceConfig = {
        chartId,
        dataType,
        dataSource: source,
        lastUpdated: new Date(),
      };

      dispatch({ type: 'SET_CHART_DATA_SOURCE', payload: config });
    } catch (error) {
      console.error('Failed to set chart data source:', error);
      throw error;
    }
  }, [isSourceAvailable]);

  // Get data source for a specific chart (falls back to global source)
  const getChartDataSource = useCallback((chartId: string): DataSourceType => {
    const chartConfig = state.chartConfigs[chartId];
    return chartConfig ? chartConfig.dataSource : state.currentSource;
  }, [state.chartConfigs, state.currentSource]);

  // Remove chart configuration
  const removeChartConfig = useCallback((chartId: string): void => {
    dispatch({ type: 'REMOVE_CHART_CONFIG', payload: chartId });
  }, []);

  // Clear all chart configurations
  const clearChartConfigs = useCallback((): void => {
    dispatch({ type: 'CLEAR_CHART_CONFIGS' });
  }, []);

  // Fetch data based on current or chart-specific source
  const fetchData = useCallback(async <T = unknown>(
    options: DataFetchOptions & { chartId?: string }
  ): Promise<ApiResponse<T>> => {
    const { dataType, useCache = true, forceRefresh = false, chartId } = options;
    
    // Determine which data source to use
    const effectiveSource = chartId ? getChartDataSource(chartId) : state.currentSource;
    const cacheKey = `${effectiveSource}-${dataType}${chartId ? `-${chartId}` : ''}`;

    // Check cache first
    if (useCache && !forceRefresh) {
      const cached = state.cache[cacheKey];
      if (cached && cached.expiresAt > new Date()) {
        return {
          data: cached.data as T,
          success: true,
          timestamp: cached.timestamp,
          source: DATA_SOURCE_CONFIGS[effectiveSource].name,
        };
      }
    }

    let response: ApiResponse<T>;

    try {
      if (effectiveSource === 'sample') {
        const { generateSampleDataByType } = await import('../utils/sampleDataGenerators');
        const sampleData = generateSampleDataByType(dataType, 'line-chart');

        response = {
          data: sampleData as T,
          success: true,
          timestamp: new Date(),
          source: 'Sample Data Generator',
        };
      } else {
        // Use real API service for live data
        try {
          const { realApiService } = await import('../services/realApiService');
          const { transformers } = await import('../services/dataTransformers');

          const apiResponse = await realApiService.fetchData(options);

          if (apiResponse.success && apiResponse.data) {
            const transformedData = transformers.chartData.transform(
              apiResponse.data as Array<{ date: string; value: number; label?: string }>,
              dataType
            );

            response = {
              data: transformedData as T,
              success: true,
              timestamp: apiResponse.timestamp,
              source: apiResponse.source,
              metadata: apiResponse.metadata,
            };
          } else {
            throw new Error(apiResponse.error || 'Failed to fetch live data');
          }
        } catch (apiError) {
          // Handle CORS and other API errors gracefully
          console.warn(`Live API failed for ${dataType}:`, apiError);

          // Fall back to mock data with clear indication
          const { mockApiService } = await import('../services/mockApiService');
          const mockResponse = await mockApiService.fetchData(options);

          if (mockResponse.success && mockResponse.data) {
            const { transformers } = await import('../services/dataTransformers');
            const transformedData = transformers.chartData.transform(
              mockResponse.data as Array<{ date: string; value: number; label?: string }>,
              dataType
            );

            response = {
              data: transformedData as T,
              success: true,
              timestamp: mockResponse.timestamp,
              source: `${mockResponse.source} (Fallback)`,
              metadata: mockResponse.metadata,
            };
          } else {
            throw apiError; // Re-throw if fallback also fails
          }
        }
      }

      // Cache the response
      if (response.success && response.data) {
        dispatch({
          type: 'SET_CACHE_DATA',
          payload: {
            key: cacheKey,
            data: response.data,
            ttl: 15 * 60 * 1000, // 15 minutes
          },
        });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      return {
        data: null as T,
        success: false,
        timestamp: new Date(),
        error: errorMessage,
        source: DATA_SOURCE_CONFIGS[effectiveSource].name,
      };
    }
  }, [state.cache, state.currentSource, getChartDataSource]);

  // Clear cache
  const clearCache = useCallback((): void => {
    dispatch({ type: 'CLEAR_CACHE' });
    apiCache.clear();
  }, []);

  // Get configuration for a data source
  const getConfig = useCallback((source?: DataSourceType): DataSourceConfig => {
    const targetSource = source || state.currentSource;
    return DATA_SOURCE_CONFIGS[targetSource];
  }, [state.currentSource]);

  // Context value
  const contextValue: ExtendedDataSourceContextType = {
    state,
    dispatch,
    switchDataSource,
    fetchData,
    clearCache,
    getConfig,
    isSourceAvailable,
    setChartDataSource,
    getChartDataSource,
    removeChartConfig,
    clearChartConfigs,
  };

  return (
    <ExtendedDataSourceContext.Provider value={contextValue}>
      {children}
    </ExtendedDataSourceContext.Provider>
  );
}

// Export the context for direct access if needed
export { ExtendedDataSourceContext };
