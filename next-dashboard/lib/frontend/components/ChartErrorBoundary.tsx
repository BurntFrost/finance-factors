'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically designed to catch Chart.js errors
 * including the "this._fn is not a function" animation error
 */
export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is the specific Chart.js animation error
    if (error.message && error.message.includes('this._fn is not a function')) {
      console.warn('Chart.js animation error caught by error boundary:', error);
      // Don't show error UI for this specific error, just log it
      return { hasError: false };
    }
    
    // For other errors, show the error UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('ChartErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Handle specific Chart.js errors
    if (error.message && error.message.includes('this._fn is not a function')) {
      // For Chart.js animation errors, try to recover by resetting the state
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback || (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <div className="text-gray-600 text-sm">
              Chart temporarily unavailable
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to handle Chart.js errors in functional components
 */
export function useChartErrorHandler() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.message && event.error.message.includes('this._fn is not a function')) {
        console.warn('Chart.js animation error caught by global handler:', event.error);
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('this._fn is not a function')) {
        console.warn('Chart.js animation promise rejection caught:', event.reason);
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
}

export default ChartErrorBoundary;
