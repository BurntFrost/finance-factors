/**
 * Shared Code Index
 * 
 * Main barrel export for all shared code (types, utils, constants, config)
 */

// Export all types with explicit naming to avoid conflicts
export * from './types';
export * from './types/dashboard';
// Export dataSource types with explicit naming to avoid ApiEndpoint conflicts
export type {
  DataSourceType as DataSourceTypeV1,
  DataSourceConfig as DataSourceConfigV1,
  ApiEndpoint as ApiEndpointV1,
  REAL_API_ENDPOINTS,
  DATA_SOURCE_CONFIGS
} from './types/dataSource';
// Export proxy types with explicit naming to avoid ApiEndpointConfig conflicts
export type {
  ProxyApiResponse as ProxyResponse,
  ApiEndpointConfig as ProxyApiEndpointConfig,
  PROXY_API_ENDPOINTS
} from './types/proxy';

// Export utilities with explicit naming to avoid conflicts
// Export specific utilities from utils index (excluding dataExport to avoid conflicts)
export {
  transformToChartData,
  chartDataToTableData,
  tableDataToChartData,
  chartDataToSummaryCards,
  summaryCardsToChartData,
  validateDataPoints,
  calculateStatistics,
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
} from './utils';
export * from './utils/crossfilter';
export * from './utils/dataConverter';
// Export dataExport utilities with explicit naming to avoid ExportData conflicts
export type { ExportOptions as DataExportOptions, ExportData as DataExportData } from './utils/dataExport';
export { exportToCSV, exportToJSON, exportToPDF, exportMultipleToPDF } from './utils/dataExport';
export * from './utils/historicalDataGenerators';
export * from './utils/localStorage';
export * from './utils/proxy-utils';

// Export all constants
export * from './constants';

// Export configuration with explicit naming to avoid conflicts
// Export from config index (excluding DATA_TYPES to avoid conflicts)
export {
  DATA_SOURCES,
  DEFAULT_DATA_SOURCE,
  REFRESH_INTERVALS,
  DATA_CACHE_TTL,
  VISUALIZATION_TYPES as CONFIG_VISUALIZATION_TYPES,
  CHART_CONFIGS,
  DATA_TYPE_COLORS,
  DEFAULT_DASHBOARD_LAYOUT,
} from './config';
export * from './config/chartConfiguration';
// Export elementTypes with explicit naming to avoid DATA_TYPES conflicts
export {
  DATA_TYPES as ELEMENT_DATA_TYPES,
  VISUALIZATION_TYPES as ELEMENT_VISUALIZATION_TYPES,
  getSuitableVisualizations,
  getDataTypeById,
  getVisualizationTypeById
} from './config/elementTypes';
export * from './config/interactiveChartConfiguration';
