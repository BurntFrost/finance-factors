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
import { rateLimitLogger } from '@/shared/utils/rateLimitLogger';

// Data source status types
export type DataSourceStatus = 'live' | 'historical-fallback' | 'loading' | 'error';

// Circuit breaker states
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerInfo {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

export interface AutomaticDataSourceState {
  status: DataSourceStatus;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  lastLiveAttempt: Date | null;
  retryCount: number;
  cache: Map<string, { data: unknown; timestamp: Date; ttl: number }>;
  circuitBreakers: Map<string, CircuitBreakerInfo>; // Track circuit breaker state per provider
  pendingRequests: Set<string>; // Track pending requests to prevent duplicates
}

export interface AutomaticDataSourceContextType {
  state: AutomaticDataSourceState;
  fetchData: <T = unknown>(options: DataFetchOptions) => Promise<ApiResponse<T>>;
  clearCache: () => void;
  forceRetryLive: () => Promise<void>;
  getDataSourceStatus: () => DataSourceStatus;
  getCircuitBreakerStatus: (provider?: string) => Map<string, CircuitBreakerInfo> | CircuitBreakerInfo | null;
  getMonitoringData: () => {
    events: any[];
    patterns: Map<string, any>;
    stats: any;
    report: string;
  };
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
  | { type: 'CLEAR_CACHE' }
  | { type: 'SET_CIRCUIT_BREAKER'; payload: { provider: string; info: CircuitBreakerInfo } }
  | { type: 'ADD_PENDING_REQUEST'; payload: string }
  | { type: 'REMOVE_PENDING_REQUEST'; payload: string };

// Initial state
const initialState: AutomaticDataSourceState = {
  status: 'loading',
  isLoading: false,
  error: null,
  lastUpdated: null,
  lastLiveAttempt: null,
  retryCount: 0,
  cache: new Map(),
  circuitBreakers: new Map(),
  pendingRequests: new Set(),
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
    case 'SET_CIRCUIT_BREAKER':
      const newCircuitBreakers = new Map(state.circuitBreakers);
      newCircuitBreakers.set(action.payload.provider, action.payload.info);
      return { ...state, circuitBreakers: newCircuitBreakers };
    case 'ADD_PENDING_REQUEST':
      const newPendingRequests = new Set(state.pendingRequests);
      newPendingRequests.add(action.payload);
      return { ...state, pendingRequests: newPendingRequests };
    case 'REMOVE_PENDING_REQUEST':
      const updatedPendingRequests = new Set(state.pendingRequests);
      updatedPendingRequests.delete(action.payload);
      return { ...state, pendingRequests: updatedPendingRequests };
    default:
      return state;
  }
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3, // Number of failures before opening circuit
  recoveryTimeout: 60000, // 1 minute before attempting recovery
  halfOpenMaxAttempts: 1, // Max attempts in half-open state
};

// Circuit breaker utility functions
function isRateLimitError(error: string, apiResponse?: any): boolean {
  // Check error message
  const messageCheck = error.toLowerCase().includes('rate limit') ||
                      error.toLowerCase().includes('too many requests') ||
                      error.includes('429');

  // Check API response metadata for rate limit error type
  const metadataCheck = apiResponse?.metadata?.reason === 'rate_limit' ||
                       apiResponse?.error?.includes('rate limit') ||
                       apiResponse?.statusCode === 429;

  return messageCheck || metadataCheck;
}

function getProviderFromDataType(dataType: string): string {
  // Map data types to their providers
  const providerMap: Record<string, string> = {
    'treasury-2y': 'FRED',
    'treasury-10y': 'FRED',
    'fed-funds-rate': 'FRED',
    'unemployment-rate': 'BLS',
    'inflation-rate': 'BLS',
    'gdp-growth': 'FRED',
    'sp500': 'ALPHA_VANTAGE',
    'nasdaq': 'ALPHA_VANTAGE',
    'population': 'CENSUS',
    // World Bank data types
    'world-bank-gdp-us': 'WORLD_BANK',
    'world-bank-inflation-us': 'WORLD_BANK',
    'world-bank-unemployment-us': 'WORLD_BANK',
    'world-bank-trade-us': 'WORLD_BANK',
    'world-bank-gdp-global': 'WORLD_BANK',
    // OECD data types
    'oecd-gdp-us': 'OECD',
    'oecd-employment-us': 'OECD',
    'oecd-productivity-us': 'OECD',
    'oecd-interest-rates-us': 'OECD',
  };

  return providerMap[dataType] || 'UNKNOWN';
}

function shouldAllowRequest(circuitBreaker: CircuitBreakerInfo | undefined): boolean {
  if (!circuitBreaker) return true;

  const now = new Date();

  switch (circuitBreaker.state) {
    case 'closed':
      return true;
    case 'open':
      // Check if recovery timeout has passed
      if (circuitBreaker.nextRetryTime && now >= circuitBreaker.nextRetryTime) {
        return true; // Allow one request to test if service is recovered
      }
      return false;
    case 'half-open':
      return true; // Allow limited requests in half-open state
    default:
      return true;
  }
}

function shouldImmediatelyFallback(error: string, apiResponse?: any): boolean {
  // Immediately fall back for rate limit errors
  if (isRateLimitError(error, apiResponse)) {
    return true;
  }

  // Immediately fall back for certain API errors that won't recover quickly
  const immediateFailurePatterns = [
    'api key',
    'unauthorized',
    'forbidden',
    'invalid key',
    'authentication',
    'quota exceeded'
  ];

  return immediateFailurePatterns.some(pattern =>
    error.toLowerCase().includes(pattern)
  );
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

  // Update circuit breaker state
  const updateCircuitBreaker = useCallback((provider: string, success: boolean, error?: string, apiResponse?: any) => {
    const currentBreaker = state.circuitBreakers.get(provider);
    const now = new Date();

    if (success) {
      // Reset circuit breaker on success
      const wasOpen = currentBreaker?.state === 'open';

      dispatch({
        type: 'SET_CIRCUIT_BREAKER',
        payload: {
          provider,
          info: {
            state: 'closed',
            failureCount: 0,
            lastFailureTime: null,
            nextRetryTime: null,
          },
        },
      });

      // Log circuit breaker recovery
      if (wasOpen) {
        rateLimitLogger.logEvent({
          provider,
          dataType: 'unknown', // Will be updated when we have dataType context
          eventType: 'circuit_breaker_close',
          success: true,
          metadata: {
            circuitBreakerState: 'closed',
          },
        });
      }
    } else {
      const failureCount = (currentBreaker?.failureCount || 0) + 1;
      const isRateLimit = error && isRateLimitError(error, apiResponse);

      // Open circuit breaker if threshold reached or rate limit error
      const shouldOpen = failureCount >= CIRCUIT_BREAKER_CONFIG.failureThreshold || isRateLimit;

      // For rate limit errors, use a longer recovery timeout
      const recoveryTimeout = isRateLimit
        ? CIRCUIT_BREAKER_CONFIG.recoveryTimeout * 2 // 2 minutes for rate limits
        : CIRCUIT_BREAKER_CONFIG.recoveryTimeout;

      dispatch({
        type: 'SET_CIRCUIT_BREAKER',
        payload: {
          provider,
          info: {
            state: shouldOpen ? 'open' : 'closed',
            failureCount,
            lastFailureTime: now,
            nextRetryTime: shouldOpen ? new Date(now.getTime() + recoveryTimeout) : null,
          },
        },
      });

      // Log circuit breaker events
      if (isRateLimit) {
        console.warn(`Circuit breaker opened for ${provider} due to rate limit. Recovery in ${recoveryTimeout / 1000} seconds.`);

        rateLimitLogger.logEvent({
          provider,
          dataType: 'unknown', // Will be updated when we have dataType context
          eventType: 'rate_limit_hit',
          success: false,
          error: error || 'Rate limit exceeded',
          metadata: {
            circuitBreakerState: shouldOpen ? 'open' : 'closed',
            retryCount: failureCount,
            resetTime: shouldOpen ? new Date(now.getTime() + recoveryTimeout) : undefined,
          },
        });

        if (shouldOpen) {
          rateLimitLogger.logEvent({
            provider,
            dataType: 'unknown',
            eventType: 'circuit_breaker_open',
            success: false,
            error: 'Rate limit circuit breaker opened',
            metadata: {
              circuitBreakerState: 'open',
              retryCount: failureCount,
            },
          });
        }
      } else if (shouldOpen) {
        console.warn(`Circuit breaker opened for ${provider} after ${failureCount} failures. Recovery in ${recoveryTimeout / 1000} seconds.`);

        rateLimitLogger.logEvent({
          provider,
          dataType: 'unknown',
          eventType: 'circuit_breaker_open',
          success: false,
          error: error || 'Multiple failures',
          metadata: {
            circuitBreakerState: 'open',
            retryCount: failureCount,
          },
        });
      }
    }
  }, [state.circuitBreakers]);

  // Attempt to fetch live data with circuit breaker protection
  const attemptLiveData = useCallback(async <T = unknown>(
    options: DataFetchOptions
  ): Promise<ApiResponse<T> | null> => {
    const { dataType } = options;
    const provider = getProviderFromDataType(dataType);
    const requestKey = `${provider}-${dataType}`;

    // Check if request is already pending (deduplication)
    if (state.pendingRequests.has(requestKey)) {
      console.log(`Request already pending for ${dataType}, skipping duplicate`);
      return null;
    }

    // Check circuit breaker
    const circuitBreaker = state.circuitBreakers.get(provider);
    if (!shouldAllowRequest(circuitBreaker)) {
      const nextRetry = circuitBreaker?.nextRetryTime;
      console.log(`Circuit breaker open for ${provider}, next retry: ${nextRetry?.toISOString()}`);
      return null;
    }

    try {
      // Mark request as pending
      dispatch({ type: 'ADD_PENDING_REQUEST', payload: requestKey });
      dispatch({ type: 'SET_LAST_LIVE_ATTEMPT', payload: new Date() });

      const startTime = Date.now();

      // Import real API service dynamically
      const { realApiService } = await import('../../backend/services/realApiService');
      const { transformers } = await import('../../backend/services/dataTransformers');

      const apiResponse = await realApiService.fetchData(options);
      const duration = Date.now() - startTime;

      if (apiResponse.success && apiResponse.data) {
        const transformedData = transformers.chartData.transform(
          apiResponse.data as Array<{ date: string; value: number; label?: string }>,
          options.dataType
        );

        // Log successful request
        rateLimitLogger.logEvent({
          provider,
          dataType,
          eventType: 'request',
          success: true,
          duration,
        });

        // Update circuit breaker on success
        updateCircuitBreaker(provider, true);

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
      } else {
        // Log failed request
        rateLimitLogger.logEvent({
          provider,
          dataType,
          eventType: 'request',
          success: false,
          duration,
          error: apiResponse.error,
          metadata: {
            requestsRemaining: apiResponse.metadata?.rateLimit?.remaining,
            resetTime: apiResponse.metadata?.rateLimit?.resetTime,
          },
        });

        // Update circuit breaker on failure with API response for better error detection
        updateCircuitBreaker(provider, false, apiResponse.error, apiResponse);

        // Log detailed error information for debugging
        console.warn(`API request failed for ${dataType}:`, {
          error: apiResponse.error,
          metadata: apiResponse.metadata,
          provider,
          timestamp: apiResponse.timestamp
        });

        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Live data fetch failed for ${dataType}:`, errorMessage);

      // Update circuit breaker on error
      updateCircuitBreaker(provider, false, errorMessage);
      return null;
    } finally {
      // Remove from pending requests
      dispatch({ type: 'REMOVE_PENDING_REQUEST', payload: requestKey });
    }
  }, [state.circuitBreakers, state.pendingRequests, updateCircuitBreaker]);

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
      const provider = getProviderFromDataType(dataType);
      const circuitBreaker = state.circuitBreakers.get(provider);

      // Log circuit breaker status
      if (circuitBreaker && circuitBreaker.state !== 'closed') {
        console.info(`Circuit breaker status for ${provider}: ${circuitBreaker.state}, failures: ${circuitBreaker.failureCount}, next retry: ${circuitBreaker.nextRetryTime?.toISOString()}`);
      }

      const liveResponse = await attemptLiveData<T>(options);

      if (liveResponse && liveResponse.success) {
        // Cache successful live data with 24-hour TTL (matching Redis cache)
        if (useCache && liveResponse.data) {
          dispatch({
            type: 'SET_CACHE_DATA',
            payload: {
              key: cacheKey,
              data: liveResponse.data,
              ttl: 24 * 60 * 60 * 1000, // 24 hours - as per requirements
            },
          });
        }

        dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });
        return liveResponse;
      }

      // Fall back to historical data with detailed reasoning
      let fallbackReason = `Live API unavailable for ${dataType}`;
      let shouldScheduleRetry = true;

      if (circuitBreaker?.state === 'open') {
        const nextRetry = circuitBreaker.nextRetryTime;
        const timeUntilRetry = nextRetry ? Math.round((nextRetry.getTime() - Date.now()) / 1000) : 0;

        if (circuitBreaker.lastFailureTime && isRateLimitError('', { metadata: { reason: 'rate_limit' } })) {
          fallbackReason = `Rate limit exceeded for ${provider}. Next retry in ${timeUntilRetry}s`;
          shouldScheduleRetry = false; // Don't schedule additional retries for rate limits
        } else {
          fallbackReason = `Circuit breaker open for ${provider} (${circuitBreaker.failureCount} failures). Next retry in ${timeUntilRetry}s`;
        }
      }

      console.info(`Falling back to historical data: ${fallbackReason}`);

      // Log fallback event
      rateLimitLogger.logEvent({
        provider,
        dataType,
        eventType: 'fallback_triggered',
        success: true,
        metadata: {
          fallbackReason,
          circuitBreakerState: circuitBreaker?.state,
        },
      });

      const historicalResponse = await fetchHistoricalData<T>(options);

      // Add fallback reason to metadata
      if (historicalResponse.metadata) {
        historicalResponse.metadata.reason = fallbackReason;
      } else {
        historicalResponse.metadata = { reason: fallbackReason, isFallback: true };
      }

      // Cache historical data with 24-hour TTL (consistent with Redis cache)
      if (useCache && historicalResponse.data) {
        dispatch({
          type: 'SET_CACHE_DATA',
          payload: {
            key: cacheKey,
            data: historicalResponse.data,
            ttl: 24 * 60 * 60 * 1000, // 24 hours - as per requirements
          },
        });
      }

      // Schedule retry for live data only if circuit breaker allows it
      if (shouldScheduleRetry) {
        scheduleRetry();
      } else {
        console.info(`Skipping retry scheduling due to circuit breaker state for ${provider}`);
      }

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

  // Get circuit breaker status
  const getCircuitBreakerStatus = useCallback((provider?: string): Map<string, CircuitBreakerInfo> | CircuitBreakerInfo | null => {
    if (provider) {
      return state.circuitBreakers.get(provider) || null;
    }
    return state.circuitBreakers;
  }, [state.circuitBreakers]);

  // Get monitoring data
  const getMonitoringData = useCallback(() => {
    return {
      events: rateLimitLogger.getRecentEvents(100),
      patterns: rateLimitLogger.getPatterns(),
      stats: rateLimitLogger.getRateLimitStats(),
      report: rateLimitLogger.generateReport(),
    };
  }, []);

  // Context value
  const contextValue: AutomaticDataSourceContextType = {
    state,
    fetchData,
    clearCache,
    forceRetryLive,
    getDataSourceStatus,
    getCircuitBreakerStatus,
    getMonitoringData,
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
