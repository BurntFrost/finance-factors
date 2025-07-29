'use client';

/**
 * Data Fetch Error Boundary Component
 * 
 * A specialized error boundary for data fetching components that prevents
 * infinite loops and cascading failures during data source initialization.
 */

import React, { Component, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface DataFetchErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  lastErrorTime: number;
  isInfiniteLoopDetected: boolean;
}

interface DataFetchErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  infiniteLoopThreshold?: number; // Number of errors within time window to detect infinite loop
  infiniteLoopTimeWindow?: number; // Time window in ms to detect infinite loop (default: 5 seconds)
  dataType?: string; // For logging purposes
}

export default class DataFetchErrorBoundary extends Component<DataFetchErrorBoundaryProps, DataFetchErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private errorTimestamps: number[] = [];

  constructor(props: DataFetchErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      isInfiniteLoopDetected: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DataFetchErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now();
    const { infiniteLoopThreshold = 5, infiniteLoopTimeWindow = 5000 } = this.props;

    // Add current error timestamp
    this.errorTimestamps.push(now);

    // Remove old timestamps outside the time window
    this.errorTimestamps = this.errorTimestamps.filter(
      timestamp => now - timestamp <= infiniteLoopTimeWindow
    );

    // Check for infinite loop
    const isInfiniteLoopDetected = this.errorTimestamps.length >= infiniteLoopThreshold;

    this.setState({
      error,
      errorInfo,
      isInfiniteLoopDetected,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error with context
    if (process.env.NODE_ENV === 'development') {
      console.error(
        `DataFetchErrorBoundary caught an error${this.props.dataType ? ` for ${this.props.dataType}` : ''}:`,
        error,
        errorInfo
      );

      if (isInfiniteLoopDetected) {
        console.error(
          `🚨 INFINITE LOOP DETECTED: ${this.errorTimestamps.length} errors in ${infiniteLoopTimeWindow}ms`,
          'Error timestamps:',
          this.errorTimestamps.map(ts => new Date(ts).toISOString())
        );
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    // Clear error timestamps when manually resetting
    this.errorTimestamps = [];

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0,
      isInfiniteLoopDetected: false,
    });
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, isInfiniteLoopDetected } = this.state;

    // Don't allow retry if infinite loop is detected
    if (isInfiniteLoopDetected) {
      console.warn('Retry blocked due to infinite loop detection');
      return;
    }

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, retryCount, isInfiniteLoopDetected } = this.state;
    const { children, fallback, maxRetries = 3, dataType } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI with infinite loop detection
      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>
              {isInfiniteLoopDetected ? '🔄' : '⚠️'}
            </div>
            <h2 className={styles.errorTitle}>
              {isInfiniteLoopDetected ? 'Infinite Loop Detected' : 'Data Fetch Error'}
            </h2>
            <p className={styles.errorMessage}>
              {isInfiniteLoopDetected
                ? `Multiple rapid errors detected${dataType ? ` while fetching ${dataType}` : ''}. This may indicate an infinite loop in data fetching.`
                : error?.message || 'An error occurred while fetching data'
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className={styles.errorDetails}>
                <summary>Error Details (Development)</summary>
                <pre className={styles.errorStack}>
                  {error?.stack}
                </pre>
                {isInfiniteLoopDetected && (
                  <div>
                    <p><strong>Error Timestamps:</strong></p>
                    <ul>
                      {this.errorTimestamps.map((timestamp, index) => (
                        <li key={index}>{new Date(timestamp).toISOString()}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </details>
            )}

            <div className={styles.errorActions}>
              {!isInfiniteLoopDetected && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className={styles.retryButton}
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className={styles.reloadButton}
              >
                Reload Page
              </button>

              {isInfiniteLoopDetected && (
                <button
                  onClick={this.resetErrorBoundary}
                  className={styles.retryButton}
                  style={{ backgroundColor: '#ff6b6b' }}
                >
                  Force Reset (Clear Loop Detection)
                </button>
              )}
            </div>

            {retryCount > 0 && !isInfiniteLoopDetected && (
              <p className={styles.retryInfo}>
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}

            {isInfiniteLoopDetected && (
              <p className={styles.retryInfo} style={{ color: '#ff6b6b' }}>
                ⚠️ Automatic retries disabled due to infinite loop detection
              </p>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook version for functional components with infinite loop detection
export function useDataFetchErrorHandler(dataType?: string) {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorCount, setErrorCount] = React.useState(0);
  const errorTimestampsRef = React.useRef<number[]>([]);

  const resetError = React.useCallback(() => {
    setError(null);
    setErrorCount(0);
    errorTimestampsRef.current = [];
  }, []);

  const captureError = React.useCallback((error: Error) => {
    const now = Date.now();
    errorTimestampsRef.current.push(now);

    // Remove old timestamps (older than 5 seconds)
    errorTimestampsRef.current = errorTimestampsRef.current.filter(
      timestamp => now - timestamp <= 5000
    );

    setErrorCount(errorTimestampsRef.current.length);

    // Check for infinite loop
    if (errorTimestampsRef.current.length >= 5) {
      console.error(
        `🚨 INFINITE LOOP DETECTED in useDataFetchErrorHandler${dataType ? ` for ${dataType}` : ''}:`,
        errorTimestampsRef.current.length,
        'errors in 5 seconds'
      );
    }

    setError(error);
  }, [dataType]);

  React.useEffect(() => {
    if (error && errorCount < 5) {
      throw error;
    }
  }, [error, errorCount]);

  return { captureError, resetError, errorCount, isInfiniteLoopDetected: errorCount >= 5 };
}

// Higher-order component for wrapping data fetch components with specialized error boundary
export function withDataFetchErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<DataFetchErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DataFetchErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </DataFetchErrorBoundary>
  );

  WrappedComponent.displayName = `withDataFetchErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
