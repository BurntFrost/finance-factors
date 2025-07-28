'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
  componentName?: string;
}

interface UsePerformanceOptimizationOptions {
  componentName?: string;
  enableLogging?: boolean;
  enableMemoryTracking?: boolean;
  renderThreshold?: number; // Log if render time exceeds this (ms)
}

/**
 * Hook for monitoring and optimizing React component performance
 */
export function usePerformanceOptimization(
  options: UsePerformanceOptimizationOptions = {}
) {
  const {
    componentName = 'Unknown Component',
    enableLogging = process.env.NODE_ENV === 'development',
    enableMemoryTracking = false,
    renderThreshold = 16, // 60fps = ~16ms per frame
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastRenderStartRef = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    componentName,
  });

  // Track render start
  const trackRenderStart = useCallback(() => {
    lastRenderStartRef.current = performance.now();
  }, []);

  // Track render end and calculate metrics
  const trackRenderEnd = useCallback(() => {
    const renderTime = performance.now() - lastRenderStartRef.current;
    renderCountRef.current += 1;
    renderTimesRef.current.push(renderTime);

    // Keep only last 100 render times for average calculation
    if (renderTimesRef.current.length > 100) {
      renderTimesRef.current.shift();
    }

    const averageRenderTime = 
      renderTimesRef.current.reduce((sum, time) => sum + time, 0) / 
      renderTimesRef.current.length;

    let memoryUsage: number | undefined;
    if (enableMemoryTracking && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    const newMetrics: PerformanceMetrics = {
      renderCount: renderCountRef.current,
      lastRenderTime: renderTime,
      averageRenderTime,
      memoryUsage,
      componentName,
    };

    setMetrics(newMetrics);

    // Log performance warnings
    if (enableLogging) {
      if (renderTime > renderThreshold) {
        console.warn(
          `🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`
        );
      }

      if (renderCountRef.current % 50 === 0) {
        console.log(
          `📊 ${componentName} Performance:`,
          `Renders: ${renderCountRef.current},`,
          `Avg: ${averageRenderTime.toFixed(2)}ms,`,
          `Last: ${renderTime.toFixed(2)}ms`,
          memoryUsage ? `, Memory: ${memoryUsage.toFixed(2)}MB` : ''
        );
      }
    }
  }, [componentName, enableLogging, enableMemoryTracking, renderThreshold]);

  // Track renders automatically
  useEffect(() => {
    trackRenderStart();
    return trackRenderEnd;
  });

  return {
    metrics,
    trackRenderStart,
    trackRenderEnd,
  };
}

/**
 * Hook for debouncing values to prevent excessive re-renders
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - (now - lastCallRef.current));
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook for memoizing expensive calculations with dependency tracking
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options: { enableLogging?: boolean; name?: string } = {}
): T {
  const { enableLogging = false, name = 'ExpensiveMemo' } = options;
  
  return useMemo(() => {
    const start = performance.now();
    const result = factory();
    const duration = performance.now() - start;

    if (enableLogging && duration > 5) {
      console.log(`⚡ ${name} calculation took ${duration.toFixed(2)}ms`);
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, enableLogging, name, ...deps]);
}

/**
 * Hook for tracking component mount/unmount cycles
 */
export function useComponentLifecycle(
  componentName: string,
  enableLogging: boolean = process.env.NODE_ENV === 'development'
) {
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    if (enableLogging) {
      console.log(`🚀 ${componentName} mounted`);
    }

    return () => {
      const lifetime = performance.now() - mountTimeRef.current;
      
      if (enableLogging) {
        console.log(
          `💀 ${componentName} unmounted after ${lifetime.toFixed(2)}ms`
        );
      }
    };
  }, [componentName, enableLogging]);
}

/**
 * Hook for preventing unnecessary re-renders with shallow comparison
 */
export function useShallowMemo<T extends Record<string, any>>(obj: T): T {
  const prevRef = useRef<T>(obj);
  
  return useMemo(() => {
    // Shallow comparison
    const keys = Object.keys(obj);
    const prevKeys = Object.keys(prevRef.current);
    
    if (keys.length !== prevKeys.length) {
      prevRef.current = obj;
      return obj;
    }
    
    for (const key of keys) {
      if (obj[key] !== prevRef.current[key]) {
        prevRef.current = obj;
        return obj;
      }
    }
    
    return prevRef.current;
  }, [obj]);
}

/**
 * Hook for optimizing callback functions with stable references
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef<T>(callback);
  
  // Update the ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  // Return a stable callback that always calls the latest version
  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}

/**
 * Hook for batch state updates to prevent multiple re-renders
 */
export function useBatchedState<T>(
  initialState: T
): [T, (updater: (prev: T) => T) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Array<(prev: T) => T>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const batchedSetState = useCallback((updater: (prev: T) => T) => {
    pendingUpdatesRef.current.push(updater);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = prevState;
        for (const update of pendingUpdatesRef.current) {
          newState = update(newState);
        }
        pendingUpdatesRef.current = [];
        return newState;
      });
    }, 0);
  }, []);

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setState(prevState => {
      let newState = prevState;
      for (const update of pendingUpdatesRef.current) {
        newState = update(newState);
      }
      pendingUpdatesRef.current = [];
      return newState;
    });
  }, []);

  return [state, batchedSetState, flushUpdates];
}

export default usePerformanceOptimization;
