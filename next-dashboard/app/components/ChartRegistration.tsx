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

// Configure zoom plugin defaults (will be overridden per chart as needed)
// Note: These are just defaults, individual charts will configure zoom as needed

// This component doesn't render anything, it just registers Chart.js components
export default function ChartRegistration() {
  return null;
}
