'use client';

import { useEffect, useState } from 'react';

// Dynamic Chart.js registration with optimized imports
let chartRegistered = false;

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
  const [isRegistered, setIsRegistered] = useState(chartRegistered);

  useEffect(() => {
    if (chartRegistered) {
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
        
        // Optimize animations for better performance
        ChartJS.defaults.animation = {
          duration: 750,
          easing: 'easeInOutQuart',
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

        chartRegistered = true;
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
          const chartModule = await import('chart.js/auto');
          const { Chart: ChartJS } = chartModule;
          chartRegistered = true;
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
export const isChartJSRegistered = () => chartRegistered;
