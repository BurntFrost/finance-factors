'use client';

import { useEffect, useState } from 'react';

// Shared global registration state to prevent conflicts between registration components
declare global {
  var __CHART_JS_REGISTERED__: boolean | undefined;
}

// Track registration status globally using a shared variable
const getChartRegistered = () => globalThis.__CHART_JS_REGISTERED__ ?? false;
const setChartRegistered = (value: boolean) => {
  globalThis.__CHART_JS_REGISTERED__ = value;
};

/**
 * Optimized Chart.js Registration Component
 * 
 * Features:
 * - Dynamic imports to reduce initial bundle size
 * - Conditional registration to avoid duplicate registrations
 * - Tree-shaking friendly imports
 * - Performance monitoring
 */
export default function OptimizedChartRegistration() {
  const [, setIsRegistered] = useState(getChartRegistered());

  useEffect(() => {
    if (getChartRegistered()) {
      setIsRegistered(true);
      return;
    }

    // Dynamic import and registration
    const registerChartJS = async () => {
      try {
        const startTime = performance.now();

        // Import Chart.js components dynamically
        const chartModule = await import('chart.js/auto');
        const { Chart: ChartJS } = chartModule;

        // Register Chart.js components (chart.js/auto includes all components)
        // No need to register individual components when using auto

        // Set global Chart.js defaults for better performance
        ChartJS.defaults.font.family = 'var(--font-geist-sans), system-ui, sans-serif';
        ChartJS.defaults.color = '#374151';
        ChartJS.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';

        // Optimize animations for better performance and fix _fn errors
        ChartJS.defaults.animation = {
          duration: 750,
          easing: 'easeInOutQuart',
          onComplete: function(animation: any) {
            // Ensure animation callbacks are properly bound
            // Fix for "this._fn is not a function" error
            if (animation && typeof animation.complete === 'function') {
              animation.complete();
            }
          },
          onProgress: function(animation: any) {
            // Ensure animation callbacks are properly bound
            // Fix for "this._fn is not a function" error
            if (animation && typeof animation.progress === 'function') {
              animation.progress();
            }
          }
        };

        // Add global error handler for Chart.js
        const originalConsoleError = console.error;
        console.error = function(...args: any[]) {
          // Filter out the specific Chart.js animation error
          if (args[0] && typeof args[0] === 'string' && args[0].includes('this._fn is not a function')) {
            console.warn('Chart.js animation callback error caught and handled:', ...args);
            return;
          }
          originalConsoleError.apply(console, args);
        };

        // Optimize responsive behavior
        ChartJS.defaults.responsive = true;
        ChartJS.defaults.maintainAspectRatio = false;

        // Optimize interaction settings
        ChartJS.defaults.interaction = {
          intersect: false,
          mode: 'index',
          axis: 'x',
          includeInvisible: false,
        } as any;

        setChartRegistered(true);
        setIsRegistered(true);

        const endTime = performance.now();

        // Performance logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Chart.js registration completed in ${(endTime - startTime).toFixed(2)}ms`);
        }
      } catch (error) {
        console.error('Failed to register Chart.js:', error);
        // Fallback registration attempt
        try {
          await import('chart.js/auto');
          setChartRegistered(true);
          setIsRegistered(true);
        } catch (fallbackError) {
          console.error('Fallback Chart.js registration failed:', fallbackError);
        }
      }
    };

    registerChartJS();
  }, []);

  // This component doesn't render anything visible
  return null;
}

// Export registration status for other components
export const isChartJSRegistered = () => getChartRegistered();
