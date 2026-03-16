import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number for financial display
 */
export function formatFinancialNumber(value: number, options?: {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}): string {
  const { currency, minimumFractionDigits = 0, maximumFractionDigits = 2 } = options || {};
  
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  }
  
  // Format large numbers with appropriate suffixes
  if (Math.abs(value) >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Get the appropriate color class for a financial change
 */
export function getChangeColorClass(change: number): string {
  if (change > 0) return 'text-chart-positive';
  if (change < 0) return 'text-chart-negative';
  return 'text-chart-neutral';
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if a date is recent (within the last 24 hours)
 */
export function isRecentDate(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(targetDate.getTime())) return false;
  const now = new Date();
  const diffInHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 24;
}

/**
 * Parse a value to a valid Date or null (avoids "Invalid Date" from JSON-deserialized strings).
 */
export function parseSafeDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format a date for display in the dashboard. Returns fallback for invalid dates.
 */
export function formatDisplayDate(date: Date | string, fallback = '—'): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(targetDate.getTime())) return fallback;

  if (isRecentDate(targetDate)) {
    return targetDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format a timestamp for "Last updated" (time only). Returns fallback for invalid dates.
 */
export function formatLastUpdatedTime(date: Date | string | null | undefined, fallback = '—'): string {
  const d = parseSafeDate(date);
  return d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : fallback;
}
