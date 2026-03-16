/**
 * Chart Configuration for Finance Factors Dashboard
 *
 * Comprehensive configuration mapping for all data types including:
 * - Units and axis labels
 * - Tooltip formatting
 * - Value formatting functions
 * - Time period labels
 * - Data source indicators
 */

import { TooltipItem, ChartTypeRegistry } from 'chart.js';

export interface ChartAxisConfig {
  x: {
    label: string;
    unit?: string;
    type: 'time' | 'category' | 'linear';
  };
  y: {
    label: string;
    unit: string;
    beginAtZero?: boolean;
    formatValue: (value: number) => string;
  };
}

export interface TooltipConfig {
  title: (context: TooltipItem<keyof ChartTypeRegistry>[]) => string;
  label: (context: TooltipItem<keyof ChartTypeRegistry>) => string;
  afterLabel?: (context: TooltipItem<keyof ChartTypeRegistry>) => string;
}

export interface DataTypeChartConfig {
  name: string;
  description: string;
  category: 'financial' | 'economic' | 'personal';
  axes: ChartAxisConfig;
  tooltip: TooltipConfig;
  legend: {
    display: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  timePeriod: {
    default: string;
    available: string[];
  };
  dataSource: {
    primary: string;
    fallback: string;
  };
}

// Utility functions for value formatting
export const formatters = {
  currency: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  currencyDetailed: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  },

  percentage: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value / 100);
  },

  decimal: (value: number, decimals: number = 1): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  index: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  },

  integer: (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  rate: (value: number): string => {
    return `${value.toFixed(2)}%`;
  },
};

// Comprehensive chart configuration for all data types
export const CHART_CONFIGURATIONS: Record<string, DataTypeChartConfig> = {
  'house-prices': {
    name: 'House Prices',
    description: 'Real estate market data and housing price trends',
    category: 'financial',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'House Price Index',
        unit: 'Index Value',
        beginAtZero: false,
        formatValue: formatters.index,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `${context.dataset.label}: ${formatters.index(context.parsed.y ?? 0)}`,
      afterLabel: (_context) => 'Case-Shiller U.S. National Home Price Index',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Monthly',
      available: ['Monthly', 'Quarterly', 'Annual'],
    },
    dataSource: {
      primary: 'FRED API (Federal Reserve)',
      fallback: 'Historical Sample Data',
    },
  },

  'salary-income': {
    name: 'Salary & Income',
    description: 'Wage trends, salary data, and income statistics',
    category: 'personal',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Average Hourly Earnings',
        unit: 'USD/hour',
        beginAtZero: false,
        formatValue: formatters.currencyDetailed,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `${context.dataset.label}: ${formatters.currencyDetailed(context.parsed.y ?? 0)}/hour`,
      afterLabel: (_context) => 'All employees, total nonfarm',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Monthly',
      available: ['Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'BLS API (Bureau of Labor Statistics)',
      fallback: 'Historical Sample Data',
    },
  },

  'inflation-cpi': {
    name: 'Consumer Price Index',
    description: 'Consumer Price Index and inflation trends',
    category: 'economic',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Consumer Price Index',
        unit: 'Index (1982-84=100)',
        beginAtZero: false,
        formatValue: formatters.index,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `CPI: ${formatters.index(context.parsed.y ?? 0)}`,
      afterLabel: (_context) => 'All Urban Consumers (CPI-U)',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Monthly',
      available: ['Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'BLS API (Bureau of Labor Statistics)',
      fallback: 'Historical Sample Data',
    },
  },

  'core-inflation': {
    name: 'Core Inflation Rate',
    description: 'Core inflation excluding food and energy',
    category: 'economic',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Core Inflation Rate',
        unit: 'Percent (%)',
        beginAtZero: true,
        formatValue: formatters.rate,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `Core Inflation: ${formatters.rate(context.parsed.y ?? 0)}`,
      afterLabel: (_context) => 'Year-over-year change, excluding food & energy',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Monthly',
      available: ['Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'FRED API (Federal Reserve)',
      fallback: 'Historical Sample Data',
    },
  },

  'fed-balance-sheet': {
    name: 'Federal Reserve Balance Sheet',
    description: 'Total assets held by the Federal Reserve',
    category: 'economic',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Total Assets',
        unit: 'Billions of USD',
        beginAtZero: false,
        formatValue: (value) => `$${formatters.decimal(value / 1000, 1)}T`,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `Fed Assets: $${formatters.decimal((context.parsed.y ?? 0) / 1000, 2)}T`,
      afterLabel: (_context) => 'Total assets of the Federal Reserve',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Weekly',
      available: ['Weekly', 'Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'FRED API (Federal Reserve)',
      fallback: 'Historical Sample Data',
    },
  },

  'federal-funds-rate': {
    name: 'Federal Funds Rate',
    description: 'Federal funds effective rate',
    category: 'economic',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Interest Rate',
        unit: 'Percent (%)',
        beginAtZero: true,
        formatValue: formatters.rate,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `Fed Funds Rate: ${formatters.rate(context.parsed.y ?? 0)}`,
      afterLabel: (_context) => 'Federal funds effective rate',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Daily',
      available: ['Daily', 'Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'FRED API (Federal Reserve)',
      fallback: 'Historical Sample Data',
    },
  },

  'unemployment-rate': {
    name: 'Unemployment Rate',
    description: 'Civilian unemployment rate',
    category: 'economic',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Unemployment Rate',
        unit: 'Percent (%)',
        beginAtZero: true,
        formatValue: formatters.rate,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `Unemployment: ${formatters.rate(context.parsed.y ?? 0)}`,
      afterLabel: (_context) => 'Civilian unemployment rate, seasonally adjusted',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Monthly',
      available: ['Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'BLS API (Bureau of Labor Statistics)',
      fallback: 'Historical Sample Data',
    },
  },

  'cost-of-living': {
    name: 'Cost of Living',
    description: 'Living expenses and cost indices',
    category: 'economic',
    axes: {
      x: {
        label: 'Time Period',
        type: 'time',
      },
      y: {
        label: 'Cost of Living Index',
        unit: 'Index Value',
        beginAtZero: false,
        formatValue: formatters.index,
      },
    },
    tooltip: {
      title: (context) => `${context[0].label}`,
      label: (context) => `Cost Index: ${formatters.index(context.parsed.y ?? 0)}`,
      afterLabel: (_context) => 'Consumer Price Index - All Urban Consumers',
    },
    legend: {
      display: true,
      position: 'top',
    },
    timePeriod: {
      default: 'Monthly',
      available: ['Monthly', 'Annual'],
    },
    dataSource: {
      primary: 'BLS API (Bureau of Labor Statistics)',
      fallback: 'Historical Sample Data',
    },
  },
};

// Helper function to get chart configuration for a data type
export function getChartConfig(dataType: string): DataTypeChartConfig | null {
  return CHART_CONFIGURATIONS[dataType] || null;
}

// Helper function to get all available data types
export function getAvailableDataTypes(): string[] {
  return Object.keys(CHART_CONFIGURATIONS);
}

// Helper function to format tooltip based on data type
export function formatTooltip(dataType: string, context: TooltipItem<keyof ChartTypeRegistry>): string {
  const config = getChartConfig(dataType);
  if (!config) return `${context.dataset.label}: ${context.parsed.y ?? 0}`;

  return config.tooltip.label(context);
}

// Helper function to get axis configuration
export function getAxisConfig(dataType: string): ChartAxisConfig | null {
  const config = getChartConfig(dataType);
  return config ? config.axes : null;
}
