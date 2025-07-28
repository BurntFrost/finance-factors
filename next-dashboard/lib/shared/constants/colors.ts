/**
 * Shared Color Constants
 * 
 * Color schemes and palettes used throughout the application
 */

// Primary color palette
export const COLORS = {
  // Brand colors
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Financial colors
  positive: '#10B981', // Green for gains
  negative: '#EF4444', // Red for losses
  neutral: '#6B7280', // Gray for no change
} as const;

// Chart-specific color palettes
export const CHART_PALETTES = {
  // Default palette for charts
  default: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#14B8A6', // Teal
  ],
  
  // Pastel palette for softer visualizations
  pastel: [
    '#93C5FD', // Light Blue
    '#6EE7B7', // Light Green
    '#FCD34D', // Light Yellow
    '#FCA5A5', // Light Red
    '#C4B5FD', // Light Purple
    '#67E8F9', // Light Cyan
    '#FDBA74', // Light Orange
    '#BEF264', // Light Lime
    '#F9A8D4', // Light Pink
    '#5EEAD4', // Light Teal
  ],
  
  // Monochrome palette for professional look
  monochrome: [
    '#1F2937', // Dark Gray
    '#374151', // Medium Dark Gray
    '#4B5563', // Medium Gray
    '#6B7280', // Gray
    '#9CA3AF', // Light Gray
    '#D1D5DB', // Very Light Gray
    '#E5E7EB', // Lighter Gray
    '#F3F4F6', // Very Light Gray
    '#F9FAFB', // Almost White
    '#FFFFFF', // White
  ],
  
  // Financial palette for financial data
  financial: [
    '#10B981', // Green (positive)
    '#EF4444', // Red (negative)
    '#3B82F6', // Blue (neutral/info)
    '#F59E0B', // Yellow (warning)
    '#8B5CF6', // Purple (special)
    '#06B6D4', // Cyan (secondary)
  ],
} as const;

// Background colors with opacity
export const BACKGROUND_COLORS = {
  primary: 'rgba(59, 130, 246, 0.1)',
  secondary: 'rgba(16, 185, 129, 0.1)',
  accent: 'rgba(245, 158, 11, 0.1)',
  success: 'rgba(16, 185, 129, 0.1)',
  warning: 'rgba(245, 158, 11, 0.1)',
  error: 'rgba(239, 68, 68, 0.1)',
  info: 'rgba(59, 130, 246, 0.1)',
} as const;

// Gradient definitions
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  secondary: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  accent: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  info: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  
  // Chart gradients
  chart: {
    blue: 'linear-gradient(180deg, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.1) 100%)',
    green: 'linear-gradient(180deg, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0.1) 100%)',
    yellow: 'linear-gradient(180deg, rgba(245, 158, 11, 0.8) 0%, rgba(245, 158, 11, 0.1) 100%)',
    red: 'linear-gradient(180deg, rgba(239, 68, 68, 0.8) 0%, rgba(239, 68, 68, 0.1) 100%)',
    purple: 'linear-gradient(180deg, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0.1) 100%)',
    cyan: 'linear-gradient(180deg, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0.1) 100%)',
  },
} as const;

// Theme-specific colors
export const THEME_COLORS = {
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: {
      primary: '#111827',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
    },
    border: '#E5E7EB',
    divider: '#F3F4F6',
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      disabled: '#6B7280',
    },
    border: '#374151',
    divider: '#4B5563',
  },
} as const;

// Semantic color mappings
export const SEMANTIC_COLORS = {
  // Data status colors
  dataStatus: {
    recent: '#10B981',    // Green
    historical: '#F59E0B', // Yellow
    stale: '#EF4444',     // Red
    loading: '#6B7280',   // Gray
  },
  
  // Service status colors
  serviceStatus: {
    healthy: '#10B981',   // Green
    degraded: '#F59E0B',  // Yellow
    unhealthy: '#EF4444', // Red
    unknown: '#6B7280',   // Gray
  },
  
  // Performance colors
  performance: {
    excellent: '#10B981', // Green
    good: '#84CC16',      // Lime
    fair: '#F59E0B',      // Yellow
    poor: '#EF4444',      // Red
  },
} as const;
