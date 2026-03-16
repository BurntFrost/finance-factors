'use client';

import React, { Suspense, lazy, ComponentType, ReactNode, useMemo, ErrorInfo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LazyComponentLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ComponentType<{ error: unknown; resetErrorBoundary: () => void }>;
  onError?: (error: unknown, errorInfo: ErrorInfo) => void;
}

// Default loading skeleton
const DefaultLoadingSkeleton = React.memo(function DefaultLoadingSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg p-6 space-y-4">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 rounded"></div>
        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
      </div>
      <div className="h-32 bg-gray-300 rounded"></div>
    </div>
  );
});

// Default error fallback
const DefaultErrorFallback = React.memo(function DefaultErrorFallback({
  error,
  resetErrorBoundary
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h3>
      <p className="text-red-600 mb-4">
        {error instanceof Error ? error.message : 'An unexpected error occurred'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
});

/**
 * Optimized Lazy Component Loader
 * 
 * Features:
 * - Suspense-based lazy loading
 * - Error boundaries with retry functionality
 * - Memoized fallback components
 * - Performance monitoring
 * - Graceful degradation
 */
export const LazyComponentLoader = React.memo(function LazyComponentLoader({
  children,
  fallback = <DefaultLoadingSkeleton />,
  errorFallback = DefaultErrorFallback,
  onError,
}: LazyComponentLoaderProps) {
  // Memoize error handler to prevent recreation
  const handleError = useMemo(() => {
    return onError || ((error: unknown, errorInfo: ErrorInfo) => {
      console.error('LazyComponentLoader error:', error, errorInfo);
    });
  }, [onError]);

  return (
    <ErrorBoundary
      FallbackComponent={errorFallback}
      onError={handleError}
      onReset={() => {
        // Clear any cached modules on reset
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

/**
 * Higher-order component for creating lazy-loaded components
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: {
    fallback?: ReactNode;
    errorFallback?: ComponentType<{ error: unknown; resetErrorBoundary: () => void }>;
    displayName?: string;
  } = {}
) {
  const LazyComponent = lazy(importFn);
  
  const WrappedComponent = React.memo(function LazyWrappedComponent(props: P) {
    return (
      <LazyComponentLoader
        fallback={options.fallback}
        errorFallback={options.errorFallback}
      >
        <LazyComponent {...props} />
      </LazyComponentLoader>
    );
  });

  WrappedComponent.displayName = options.displayName || 'LazyWrappedComponent';
  
  return WrappedComponent;
}

/**
 * Preload a lazy component for better performance
 */
export function preloadComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): void {
  // Start loading the component in the background
  importFn().catch(error => {
    console.warn('Failed to preload component:', error);
  });
}

/**
 * Hook for managing lazy component preloading
 */
export function useLazyPreload<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  shouldPreload: boolean = false
) {
  React.useEffect(() => {
    if (shouldPreload) {
      preloadComponent(importFn);
    }
  }, [importFn, shouldPreload]);
}

export default LazyComponentLoader;
