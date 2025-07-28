/**
 * Shared Validation Utilities
 * 
 * Pure functions for data validation and type checking
 */

import type { StandardDataPoint, ChartData, TableData, SummaryCardData } from '../types';

/**
 * Validate if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validate if value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Validate if string is a valid date string
 */
export function isValidDateString(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate StandardDataPoint
 */
export function isValidStandardDataPoint(value: unknown): value is StandardDataPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const point = value as Record<string, unknown>;
  
  return (
    isNonEmptyString(point.date) &&
    isValidNumber(point.value) &&
    (point.label === undefined || typeof point.label === 'string')
  );
}

/**
 * Validate array of StandardDataPoints
 */
export function isValidDataPointArray(value: unknown): value is StandardDataPoint[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isValidStandardDataPoint)
  );
}

/**
 * Validate ChartData
 */
export function isValidChartData(value: unknown): value is ChartData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const chart = value as Record<string, unknown>;
  
  return (
    Array.isArray(chart.labels) &&
    chart.labels.length > 0 &&
    Array.isArray(chart.datasets) &&
    chart.datasets.length > 0 &&
    chart.datasets.every(dataset => 
      typeof dataset === 'object' &&
      dataset !== null &&
      typeof (dataset as any).label === 'string' &&
      Array.isArray((dataset as any).data)
    )
  );
}

/**
 * Validate TableData
 */
export function isValidTableData(value: unknown): value is TableData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const table = value as Record<string, unknown>;
  
  return (
    Array.isArray(table.columns) &&
    table.columns.length > 0 &&
    table.columns.every(col => 
      typeof col === 'object' &&
      col !== null &&
      typeof (col as any).key === 'string' &&
      typeof (col as any).label === 'string' &&
      ['string', 'number', 'date', 'boolean'].includes((col as any).type)
    ) &&
    Array.isArray(table.rows) &&
    table.rows.every(row => typeof row === 'object' && row !== null)
  );
}

/**
 * Validate SummaryCardData
 */
export function isValidSummaryCardData(value: unknown): value is SummaryCardData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const card = value as Record<string, unknown>;
  
  return (
    isNonEmptyString(card.title) &&
    (typeof card.value === 'string' || isValidNumber(card.value)) &&
    (card.change === undefined || (
      typeof card.change === 'object' &&
      card.change !== null &&
      isValidNumber((card.change as any).value) &&
      typeof (card.change as any).period === 'string' &&
      ['up', 'down', 'neutral'].includes((card.change as any).direction)
    ))
  );
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(key: string): boolean {
  return (
    typeof key === 'string' &&
    key.length >= 8 &&
    key.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(key)
  );
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate RGB color format
 */
export function isValidRgbColor(color: string): boolean {
  return /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color);
}

/**
 * Validate RGBA color format
 */
export function isValidRgbaColor(color: string): boolean {
  return /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/.test(color);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\w\s-_.]/g, ''); // Keep only alphanumeric, spaces, hyphens, underscores, dots
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(input: unknown, defaultValue: number = 0): number {
  if (isValidNumber(input)) {
    return input;
  }
  
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    return isValidNumber(parsed) ? parsed : defaultValue;
  }
  
  return defaultValue;
}

/**
 * Validate data type for dashboard elements
 */
export function isValidDataType(dataType: string): boolean {
  const validDataTypes = [
    'house-prices',
    'household-income',
    'unemployment-rate',
    'inflation-rate',
    'gdp-growth',
    'stock-market',
    'interest-rates',
    'consumer-spending',
  ];
  
  return validDataTypes.includes(dataType);
}

/**
 * Validate visualization type
 */
export function isValidVisualizationType(type: string): boolean {
  const validTypes = [
    'line-chart',
    'bar-chart',
    'pie-chart',
    'doughnut-chart',
    'data-table',
    'summary-card',
  ];
  
  return validTypes.includes(type);
}

/**
 * Validate time range
 */
export function isValidTimeRange(start: Date, end: Date): boolean {
  return (
    isValidDate(start) &&
    isValidDate(end) &&
    start.getTime() < end.getTime() &&
    end.getTime() <= Date.now() // End date cannot be in the future
  );
}

/**
 * Validate cache TTL value
 */
export function isValidCacheTTL(ttl: number): boolean {
  return isValidNumber(ttl) && ttl > 0 && ttl <= 86400; // Max 24 hours
}

/**
 * Validate rate limit configuration
 */
export function isValidRateLimit(config: {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}): boolean {
  return (
    isValidNumber(config.requestsPerMinute) &&
    isValidNumber(config.requestsPerHour) &&
    isValidNumber(config.requestsPerDay) &&
    config.requestsPerMinute > 0 &&
    config.requestsPerHour > 0 &&
    config.requestsPerDay > 0 &&
    config.requestsPerMinute <= config.requestsPerHour &&
    config.requestsPerHour <= config.requestsPerDay
  );
}
