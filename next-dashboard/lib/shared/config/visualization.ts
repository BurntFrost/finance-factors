/**
 * Visualization Configurations
 * 
 * Configuration for charts, tables, and other visualizations
 */

import type { VisualizationType } from '../types';
import { DEFAULT_CHART_OPTIONS } from '../constants';

// Available visualization types
export const VISUALIZATION_TYPES: Record<string, VisualizationType> = {
  'line-chart': {
    id: 'line-chart',
    name: 'Line Chart',
    description: 'Show trends over time with connected data points',
    icon: '📈',
    category: 'chart',
    suitableFor: [
      'house-prices',
      'household-income',
      'unemployment-rate',
      'inflation-rate',
      'gdp-growth',
      'stock-market',
      'interest-rates',
      'consumer-spending',
    ],
  },
  
  'bar-chart': {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'Compare values across different categories or time periods',
    icon: '📊',
    category: 'chart',
    suitableFor: [
      'house-prices',
      'household-income',
      'unemployment-rate',
      'inflation-rate',
      'gdp-growth',
      'consumer-spending',
    ],
  },
  
  'pie-chart': {
    id: 'pie-chart',
    name: 'Pie Chart',
    description: 'Show proportions and percentages of a whole',
    icon: '🥧',
    category: 'chart',
    suitableFor: [
      'consumer-spending',
      'household-income',
    ],
  },
  
  'doughnut-chart': {
    id: 'doughnut-chart',
    name: 'Doughnut Chart',
    description: 'Show proportions with a hollow center for additional information',
    icon: '🍩',
    category: 'chart',
    suitableFor: [
      'consumer-spending',
      'household-income',
    ],
  },
  
  'data-table': {
    id: 'data-table',
    name: 'Data Table',
    description: 'Display detailed data in a sortable and filterable table',
    icon: '📋',
    category: 'data',
    suitableFor: [
      'house-prices',
      'household-income',
      'unemployment-rate',
      'inflation-rate',
      'gdp-growth',
      'stock-market',
      'interest-rates',
      'consumer-spending',
    ],
  },
  
  'summary-card': {
    id: 'summary-card',
    name: 'Summary Card',
    description: 'Show key metrics and KPIs with trend indicators',
    icon: '📄',
    category: 'widget',
    suitableFor: [
      'house-prices',
      'household-income',
      'unemployment-rate',
      'inflation-rate',
      'gdp-growth',
      'stock-market',
      'interest-rates',
      'consumer-spending',
    ],
  },
} as const;

// Chart configuration templates
export const CHART_CONFIGS = {
  'line-chart': {
    ...DEFAULT_CHART_OPTIONS,
    scales: {
      x: {
        type: 'time' as const,
        display: true,
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value',
        },
      },
    },
    elements: {
      line: {
        tension: 0.1,
      },
      point: {
        radius: 3,
        hoverRadius: 6,
      },
    },
  },
  
  'bar-chart': {
    ...DEFAULT_CHART_OPTIONS,
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Category',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value',
        },
        beginAtZero: true,
      },
    },
  },
  
  'pie-chart': {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${percentage}%`;
          },
        },
      },
    },
  },
  
  'doughnut-chart': {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${percentage}%`;
          },
        },
      },
    },
  },
} as const;

// Color schemes for different data types
export const DATA_TYPE_COLORS = {
  'house-prices': {
    primary: '#3B82F6',
    secondary: '#1D4ED8',
    background: '#3B82F620',
  },
  'household-income': {
    primary: '#10B981',
    secondary: '#059669',
    background: '#10B98120',
  },
  'unemployment-rate': {
    primary: '#EF4444',
    secondary: '#DC2626',
    background: '#EF444420',
  },
  'inflation-rate': {
    primary: '#F59E0B',
    secondary: '#D97706',
    background: '#F59E0B20',
  },
  'gdp-growth': {
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    background: '#8B5CF620',
  },
  'stock-market': {
    primary: '#06B6D4',
    secondary: '#0891B2',
    background: '#06B6D420',
  },
  'interest-rates': {
    primary: '#F97316',
    secondary: '#EA580C',
    background: '#F9731620',
  },
  'consumer-spending': {
    primary: '#84CC16',
    secondary: '#65A30D',
    background: '#84CC1620',
  },
} as const;

// Default dashboard layout
export const DEFAULT_DASHBOARD_LAYOUT = {
  layout: 'grid' as const,
  elements: [
    {
      id: 'house-prices-chart',
      type: 'line-chart' as const,
      dataType: 'house-prices',
      title: 'House Prices Over Time',
      position: { row: 0, col: 0 },
    },
    {
      id: 'unemployment-summary',
      type: 'summary-card' as const,
      dataType: 'unemployment-rate',
      title: 'Current Unemployment Rate',
      position: { row: 0, col: 1 },
    },
    {
      id: 'income-table',
      type: 'data-table' as const,
      dataType: 'household-income',
      title: 'Household Income Data',
      position: { row: 1, col: 0 },
    },
  ],
} as const;
