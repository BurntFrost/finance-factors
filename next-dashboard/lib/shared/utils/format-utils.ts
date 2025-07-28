/**
 * Shared Format Utilities
 * 
 * Pure functions for formatting numbers, currencies, and other values
 */

/**
 * Format a number for financial display
 */
export function formatFinancialNumber(value: number, options?: {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}): string {
  const { 
    currency, 
    minimumFractionDigits = 0, 
    maximumFractionDigits = 2,
    compact = false 
  } = options || {};
  
  // Handle compact formatting for large numbers
  if (compact) {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
  }
  
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
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
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format a number with appropriate suffix (K, M, B, T)
 */
export function formatNumberWithSuffix(value: number, decimals: number = 1): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000000000) {
    return `${sign}${(absValue / 1000000000000).toFixed(decimals)}T`;
  } else if (absValue >= 1000000000) {
    return `${sign}${(absValue / 1000000000).toFixed(decimals)}B`;
  } else if (absValue >= 1000000) {
    return `${sign}${(absValue / 1000000).toFixed(decimals)}M`;
  } else if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(decimals)}K`;
  }
  
  return value.toString();
}

/**
 * Get the appropriate color class for a financial change
 */
export function getChangeColorClass(change: number): string {
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
}

/**
 * Get the appropriate icon for a financial change
 */
export function getChangeIcon(change: number): string {
  if (change > 0) return '↗️';
  if (change < 0) return '↘️';
  return '➡️';
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(text: string): string {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(text: string): string {
  return text
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format API response time
 */
export function formatResponseTime(milliseconds: number): string {
  if (milliseconds < 100) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }
}

/**
 * Format cache hit rate as percentage
 */
export function formatCacheHitRate(hitRate: number): string {
  return `${(hitRate * 100).toFixed(1)}%`;
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }
  
  return 'An unknown error occurred';
}

/**
 * Format validation errors
 */
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages = Object.entries(errors)
    .map(([field, fieldErrors]) => 
      `${titleCase(field)}: ${fieldErrors.join(', ')}`
    );
  
  return messages.join('; ');
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
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
