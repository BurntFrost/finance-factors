/**
 * Shared Chart Configuration Constants
 * 
 * Chart configurations and styling constants used by both frontend and backend
 */

// Chart color schemes
export const CHART_COLORS = {
  primary: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
  ],
  background: [
    '#3B82F620', // Blue with opacity
    '#10B98120', // Green with opacity
    '#F59E0B20', // Yellow with opacity
    '#EF444420', // Red with opacity
    '#8B5CF620', // Purple with opacity
    '#06B6D420', // Cyan with opacity
    '#F9731620', // Orange with opacity
    '#84CC1620', // Lime with opacity
  ],
  gradients: {
    blue: ['#3B82F6', '#1D4ED8'],
    green: ['#10B981', '#059669'],
    yellow: ['#F59E0B', '#D97706'],
    red: ['#EF4444', '#DC2626'],
    purple: ['#8B5CF6', '#7C3AED'],
    cyan: ['#06B6D4', '#0891B2'],
  },
} as const;

// Chart type configurations
export const CHART_TYPES = {
  LINE: {
    id: 'line-chart',
    name: 'Line Chart',
    description: 'Show trends over time',
    icon: '📈',
    category: 'chart',
    suitableFor: ['time-series', 'trends', 'continuous-data'],
  },
  BAR: {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: '📊',
    category: 'chart',
    suitableFor: ['categorical', 'comparison', 'discrete-data'],
  },
  PIE: {
    id: 'pie-chart',
    name: 'Pie Chart',
    description: 'Show proportions of a whole',
    icon: '🥧',
    category: 'chart',
    suitableFor: ['proportions', 'percentages', 'parts-of-whole'],
  },
  DOUGHNUT: {
    id: 'doughnut-chart',
    name: 'Doughnut Chart',
    description: 'Show proportions with center space',
    icon: '🍩',
    category: 'chart',
    suitableFor: ['proportions', 'percentages', 'parts-of-whole'],
  },
  DATA_TABLE: {
    id: 'data-table',
    name: 'Data Table',
    description: 'Display data in tabular format',
    icon: '📋',
    category: 'data',
    suitableFor: ['detailed-data', 'raw-values', 'searchable'],
  },
  SUMMARY_CARD: {
    id: 'summary-card',
    name: 'Summary Card',
    description: 'Show key metrics and KPIs',
    icon: '📄',
    category: 'widget',
    suitableFor: ['kpis', 'metrics', 'summary-stats'],
  },
} as const;

// Default chart options
export const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#3B82F6',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false,
  },
} as const;

// Chart dimensions
export const CHART_DIMENSIONS = {
  DEFAULT_HEIGHT: 400,
  COMPACT_HEIGHT: 300,
  LARGE_HEIGHT: 500,
  MIN_WIDTH: 300,
  MAX_WIDTH: 1200,
} as const;

// Animation configurations
export const CHART_ANIMATIONS = {
  DEFAULT: {
    duration: 750,
    easing: 'easeInOutQuart' as const,
  },
  FAST: {
    duration: 300,
    easing: 'easeOutQuart' as const,
  },
  SLOW: {
    duration: 1500,
    easing: 'easeInOutQuart' as const,
  },
  NONE: {
    duration: 0,
  },
} as const;

// Data point limits
export const DATA_LIMITS = {
  MAX_POINTS_LINE: 1000,
  MAX_POINTS_BAR: 50,
  MAX_POINTS_PIE: 20,
  MAX_POINTS_TABLE: 10000,
  PAGINATION_SIZE: 50,
} as const;

// Export formats
export const EXPORT_FORMATS = {
  PNG: 'png',
  JPEG: 'jpeg',
  PDF: 'pdf',
  CSV: 'csv',
  EXCEL: 'xlsx',
  JSON: 'json',
} as const;

// Chart themes
export const CHART_THEMES = {
  LIGHT: {
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    gridColor: 'rgba(0, 0, 0, 0.1)',
    borderColor: '#e5e7eb',
  },
  DARK: {
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    gridColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#374151',
  },
} as const;
