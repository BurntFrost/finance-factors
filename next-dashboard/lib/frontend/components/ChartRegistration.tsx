'use client';

import { useEffect, useState } from 'react';

// Shared global registration state to prevent conflicts between registration components
declare global {
  var __CHART_JS_REGISTERED__: boolean | undefined;
  var __CHART_JS_REGISTRATION_PROMISE__: Promise<void> | undefined;
}

// Track registration status globally using a shared variable
const getChartRegistered = () => globalThis.__CHART_JS_REGISTERED__ ?? false;
const setChartRegistered = (value: boolean) => {
  globalThis.__CHART_JS_REGISTERED__ = value;
};

// Get or create the registration promise
const getRegistrationPromise = () => {
  if (!globalThis.__CHART_JS_REGISTRATION_PROMISE__) {
    globalThis.__CHART_JS_REGISTRATION_PROMISE__ = registerChartJSGlobally();
  }
  return globalThis.__CHART_JS_REGISTRATION_PROMISE__;
};

// Global registration function
async function registerChartJSGlobally(): Promise<void> {
  if (getChartRegistered()) {
    return;
  }

  try {
    // Import Chart.js components with proper error handling
    const [chartModule, _dateAdapterModule] = await Promise.all([
      import('chart.js/auto'),
      import('chartjs-adapter-date-fns').catch(() => null)
    ]);

    const { Chart: ChartJS } = chartModule;

    // Try to import zoom plugin
    try {
      const zoomPluginModule = await import('chartjs-plugin-zoom');
      const zoomPlugin = zoomPluginModule.default;
      ChartJS.register(zoomPlugin);
    } catch (error) {
      console.warn('Failed to load chartjs-plugin-zoom:', error);
    }

    // Set global defaults
    ChartJS.defaults.font.family = 'var(--font-geist-sans), system-ui, sans-serif';
    ChartJS.defaults.color = '#374151';
    ChartJS.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
    ChartJS.defaults.animation = {
      duration: 750,
      easing: 'easeInOutQuart',
    };

    // Verify time scale is available
    if (ChartJS.registry && ChartJS.registry.getScale('time')) {
      console.log('Chart.js registered successfully with time scale');
    } else {
      console.warn('Time scale not available after registration');
    }

    setChartRegistered(true);
  } catch (error) {
    console.error('Failed to register Chart.js globally:', error);
    throw error;
  }
}

// This component doesn't render anything, it just ensures Chart.js is registered
export default function ChartRegistration() {
  const [_isRegistered, setIsRegistered] = useState(getChartRegistered());

  useEffect(() => {
    if (getChartRegistered()) {
      setIsRegistered(true);
      return;
    }

    // Use the global registration promise
    const ensureRegistration = async () => {
      try {
        await getRegistrationPromise();
        setIsRegistered(true);
      } catch (error) {
        console.error('Failed to ensure Chart.js registration:', error);
        // Fallback - assume registration after delay
        setTimeout(() => setIsRegistered(true), 1000);
      }
    };

    ensureRegistration();
  }, []);

  return null;
}

// Export function to check if Chart.js is ready
export const waitForChartJS = () => getRegistrationPromise();

// Export registration status for other components
export const isChartJSRegistered = () => getChartRegistered();
