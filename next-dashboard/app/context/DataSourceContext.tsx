'use client';

/**
 * Data Source Context
 * 
 * This module provides React context for managing data source state across the application.
 * It handles switching between sample and live API data sources with persistence and caching.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import {
  DataSourceType,
  DataSourceState,
  DataSourceAction,
  DataSourceContextType,
  DataSourceConfig,
  DATA_SOURCE_CONFIGS,
  DataFetchOptions,
  ApiResponse,
} from '../types/dataSource';
import { dataSourcePreference, apiCache, initializeStorage } from '../utils/localStorage';

// Initial state - always start with sample to avoid hydration issues
const initialState: DataSourceState = {
  currentSource: 'sample',
  isLoading: false,
  error: null,
  lastUpdated: null,
  cache: {},
};

// Reducer function
function dataSourceReducer(state: DataSourceState, action: DataSourceAction): DataSourceState {
  switch (action.type) {
    case 'SET_SOURCE':
      return {
        ...state,
        currentSource: action.payload,
        error: null, // Clear errors when switching sources
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
      const { key, data, ttl = 15 * 60 * 1000 } = action.payload; // Default 15 minutes TTL
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

    case 'REMOVE_CACHE_ITEM':
      const newCache = { ...state.cache };
      delete newCache[action.payload];
      return {
        ...state,
        cache: newCache,
      };

    default:
      return state;
  }
}

// Create context
const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

// Provider component
interface DataSourceProviderProps {
  children: ReactNode;
}

export function DataSourceProvider({ children }: DataSourceProviderProps) {
  const [state, dispatch] = useReducer(dataSourceReducer, initialState);

  // Initialize storage and handle hydration
  useEffect(() => {
    initializeStorage();

    // Load saved preference only after hydration
    const savedSource = dataSourcePreference.load();
    if (savedSource && savedSource !== state.currentSource) {
      dispatch({ type: 'SET_SOURCE', payload: savedSource });
    }
  }, [state.currentSource]);

  // Check if a data source is available
  const isSourceAvailable = useCallback((source: DataSourceType): boolean => {
    return source in DATA_SOURCE_CONFIGS;
  }, []);

  // Switch data source
  const switchDataSource = useCallback(async (source: DataSourceType): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Validate source
      if (!isSourceAvailable(source)) {
        throw new Error(`Data source "${source}" is not available`);
      }

      // Save preference
      dataSourcePreference.save(source);

      // Update state
      dispatch({ type: 'SET_SOURCE', payload: source });
      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });

      // Clear cache when switching sources to ensure fresh data
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

  // Fetch data based on current source
  const fetchData = useCallback(async <T = unknown>(
    options: DataFetchOptions
  ): Promise<ApiResponse<T>> => {
    const { dataType, useCache = true, forceRefresh = false } = options;
    const cacheKey = `${state.currentSource}-${dataType}`;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Check cache first (unless force refresh)
      if (useCache && !forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return cachedData as ApiResponse<T>;
        }
      }

      // Fetch data based on source type
      let response: ApiResponse<T>;
      
      if (state.currentSource === 'sample') {
        // Import sample data generators dynamically
        const { generateSampleDataByType } = await import('../utils/sampleDataGenerators');
        const sampleData = generateSampleDataByType(dataType, 'line-chart'); // Default to line chart

        response = {
          data: sampleData as T,
          success: true,
          timestamp: new Date(),
          source: 'Sample Data Generator',
        };
      } else {
        // Use real API service for live data
        const { realApiService } = await import('../services/realApiService');
        const { transformers } = await import('../services/dataTransformers');

        const apiResponse = await realApiService.fetchData(options);

        if (apiResponse.success && apiResponse.data) {
          // Transform API data to ChartData format
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
          // Fallback to mock data if real API fails
          console.warn(`Real API failed for ${dataType}, falling back to mock data:`, apiResponse.error);

          const { mockApiService } = await import('../services/mockApiService');
          const mockResponse = await mockApiService.fetchData(options);

          if (mockResponse.success && mockResponse.data) {
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
            throw new Error(apiResponse.error || 'Failed to fetch live data and fallback failed');
          }
        }
      }

      // Cache the response
      if (useCache) {
        apiCache.set(cacheKey, response, state.currentSource);
        dispatch({
          type: 'SET_CACHE_DATA',
          payload: { key: cacheKey, data: response },
        });
      }

      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // Return error response
      return {
        data: null as T,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        source: state.currentSource,
      };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentSource]);

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
  const contextValue: DataSourceContextType = {
    state,
    dispatch,
    switchDataSource,
    fetchData,
    clearCache,
    getConfig,
    isSourceAvailable,
  };

  return (
    <DataSourceContext.Provider value={contextValue}>
      {children}
    </DataSourceContext.Provider>
  );
}

// Custom hook to use the data source context
export function useDataSourceContext(): DataSourceContextType {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSourceContext must be used within a DataSourceProvider');
  }
  return context;
}
