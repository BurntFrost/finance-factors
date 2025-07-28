/**
 * Shared Utils Index
 * 
 * Barrel export for all shared utility functions
 */

// Data transformation utilities
export {
  transformToChartData,
  chartDataToTableData,
  tableDataToChartData,
  chartDataToSummaryCards,
  summaryCardsToChartData,
  validateDataPoints,
  calculateStatistics,
} from './data-transform';

// Date utilities
export {
  isRecentDate,
  formatDisplayDate,
  formatApiDate,
  parseDate,
  getRelativeTime,
  getDateRange,
  formatDateRange,
  isSameDay,
  getStartOfDay,
  getEndOfDay,
  addDays,
  subtractDays,
  getBusinessDaysBetween,
} from './date-utils';

// Format utilities
export {
  formatFinancialNumber,
  formatPercentage,
  formatNumberWithSuffix,
  getChangeColorClass,
  getChangeIcon,
  formatBytes,
  formatDuration,
  truncateText,
  titleCase,
  camelToTitle,
  snakeToTitle,
  formatResponseTime,
  formatCacheHitRate,
  formatErrorMessage,
  formatValidationErrors,
  debounce,
  throttle,
} from './format-utils';

// Validation utilities
export {
  isValidNumber,
  isValidDate,
  isValidDateString,
  isNonEmptyString,
  isValidStandardDataPoint,
  isValidDataPointArray,
  isValidChartData,
  isValidTableData,
  isValidSummaryCardData,
  isValidEmail,
  isValidUrl,
  isValidApiKey,
  isValidHexColor,
  isValidRgbColor,
  isValidRgbaColor,
  sanitizeString,
  sanitizeNumber,
  isValidDataType,
  isValidVisualizationType,
  isValidTimeRange,
  isValidCacheTTL,
  isValidRateLimit,
} from './validation';

// Historical data generators
export * from './historicalDataGenerators';

// Data converters
export * from './dataConverter';

// Data export utilities
export * from './dataExport';

// Local storage utilities
export * from './localStorage';

// Crossfilter utilities
export * from './crossfilter';
