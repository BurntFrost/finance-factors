'use client';

import { useEffect, useState } from 'react';

// Track registration status globally
let chartRegistered = false;

// This component doesn't render anything, it just registers Chart.js components
export default function ChartRegistration() {
  const [_isRegistered, setIsRegistered] = useState(chartRegistered);

  useEffect(() => {
    if (chartRegistered) {
      setIsRegistered(true);
      return;
    }

    // Dynamic import and registration to avoid SSR issues
    const registerChartJS = async () => {
      try {
        // Import Chart.js components dynamically
        const [
          chartModule,
          zoomPluginModule
        ] = await Promise.all([
          import('chart.js'),
          import('chartjs-plugin-zoom')
        ]);

        // Import date adapter separately to avoid TypeScript issues
        try {
          await import('chartjs-adapter-date-fns');
        } catch (error) {
          console.warn('Failed to load chartjs-adapter-date-fns:', error);
        }

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

        chartRegistered = true;
        setIsRegistered(true);

        if (process.env.NODE_ENV === 'development') {
          console.log('Chart.js registration completed successfully');
        }
      } catch (error) {
        console.error('Failed to register Chart.js:', error);
      }
    };

    registerChartJS();
  }, []);

  return null;
}

// Export registration status for other components
export const isChartJSRegistered = () => chartRegistered;
