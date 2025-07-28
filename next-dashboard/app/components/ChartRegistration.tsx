'use client';

import {
  Chart as ChartJS,
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
  Interaction,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

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
ChartJS.defaults.interaction = {
  mode: 'index' as const,
  intersect: false,
};

// This component doesn't render anything, it just registers Chart.js components
export default function ChartRegistration() {
  return null;
}
