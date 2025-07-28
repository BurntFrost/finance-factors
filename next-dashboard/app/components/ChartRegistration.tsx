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

// This component doesn't render anything, it just registers Chart.js components
export default function ChartRegistration() {
  const [_isRegistered, setIsRegistered] = useState(getChartRegistered());

  useEffect(() => {
    if (getChartRegistered()) {
      setIsRegistered(true);
      return;
    }

    // Dynamic import and registration to avoid SSR issues
    const registerChartJS = async () => {
      try {
        // Import Chart.js components individually for better control
        const [
          chartModule,
          zoomPluginModule,
          dateAdapterModule
        ] = await Promise.all([
          import('chart.js'),
          import('chartjs-plugin-zoom'),
          import('chartjs-adapter-date-fns')
        ]);

        const {
          Chart: ChartJS,
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          ArcElement,
          Title,
          Tooltip,
          Legend,
          TimeScale,
        } = chartModule;

        const zoomPlugin = zoomPluginModule.default;

        // Register Chart.js components and plugins
        ChartJS.register(
          CategoryScale,
          LinearScale,
          TimeScale,
          PointElement,
          LineElement,
          BarElement,
          ArcElement,
          Title,
          Tooltip,
          Legend,
          zoomPlugin
        );

        // Verify time scale is registered
        if (!ChartJS.registry.getScale('time')) {
          console.error('Time scale not registered properly');
        } else {
          console.log('Time scale registered successfully');
        }

        // Configure global Chart.js defaults for better interactivity
        ChartJS.defaults.font.family = 'var(--font-geist-sans), system-ui, sans-serif';
        ChartJS.defaults.color = '#374151';
        ChartJS.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';

        // Enable better interactions
        if (ChartJS.defaults.interaction) {
          ChartJS.defaults.interaction.mode = 'index';
          ChartJS.defaults.interaction.intersect = false;
        }

        // Configure responsive behavior
        ChartJS.defaults.responsive = true;
        ChartJS.defaults.maintainAspectRatio = false;

        // Configure animation defaults for smooth transitions
        ChartJS.defaults.animation = {
          duration: 750,
          easing: 'easeInOutQuart',
        };

        // Configure hover animations
        if (ChartJS.defaults.hover) {
          (ChartJS.defaults.hover as any).animationDuration = 200;
        }

        setChartRegistered(true);
        setIsRegistered(true);

        if (process.env.NODE_ENV === 'development') {
          console.log('Chart.js registration completed successfully');
        }
      } catch (error) {
        console.error('Failed to register Chart.js:', error);
        // Fallback registration attempt with chart.js/auto
        try {
          const chartModule = await import('chart.js/auto');
          const { Chart: ChartJS } = chartModule;

          // Try to register zoom plugin again
          try {
            const zoomPluginModule = await import('chartjs-plugin-zoom');
            const zoomPlugin = zoomPluginModule.default;
            ChartJS.register(zoomPlugin);
          } catch (zoomError) {
            console.warn('Failed to load chartjs-plugin-zoom in fallback:', zoomError);
          }

          setChartRegistered(true);
          setIsRegistered(true);
          console.log('Chart.js fallback registration completed');
        } catch (fallbackError) {
          console.error('Fallback Chart.js registration failed:', fallbackError);
          // Final fallback - try chart.js/auto which includes everything
          try {
            await import('chart.js/auto');
            setChartRegistered(true);
            setIsRegistered(true);
            console.log('Chart.js auto registration completed as final fallback');
          } catch (autoError) {
            console.error('Chart.js auto registration failed:', autoError);
          }
        }
      }
    };

    registerChartJS();
  }, []);

  return null;
}

// Export registration status for other components
export const isChartJSRegistered = () => getChartRegistered();
