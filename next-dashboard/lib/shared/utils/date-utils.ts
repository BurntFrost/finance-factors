/**
 * Shared Date Utilities
 * 
 * Pure functions for date manipulation and formatting
 */

/**
 * Check if a date is recent (within the last 24 hours)
 */
export function isRecentDate(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 24;
}

/**
 * Format a date for display in the dashboard
 */
export function formatDisplayDate(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
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
 * Format date for API requests (ISO format)
 */
export function formatApiDate(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Parse various date formats to Date object
 */
export function parseDate(dateString: string): Date | null {
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Try MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Try timestamp
  if (/^\d+$/.test(dateString)) {
    const timestamp = parseInt(dateString, 10);
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Fallback to Date constructor
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function getRelativeTime(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: '1d' | '7d' | '30d' | '90d' | '1y' | 'ytd' | 'all'): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case '1d':
      start.setDate(end.getDate() - 1);
      break;
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case 'ytd':
      start.setMonth(0, 1); // January 1st of current year
      break;
    case 'all':
      start.setFullYear(2000, 0, 1); // January 1st, 2000
      break;
  }
  
  return { start, end };
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
  });
  
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get the start of day for a given date
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of day for a given date
 */
export function getEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/**
 * Get business days between two dates (excluding weekends)
 */
export function getBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}
