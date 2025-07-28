/**
 * Shared Code Index
 * 
 * Main barrel export for all shared code (types, utils, constants, config)
 */

// Export all types
export * from './types';
export * from './types/dashboard';
export * from './types/dataSource';
export * from './types/proxy';

// Export all utilities
export * from './utils';
export * from './utils/crossfilter';
export * from './utils/dataConverter';
export * from './utils/dataExport';
export * from './utils/historicalDataGenerators';
export * from './utils/localStorage';
export * from './utils/proxy-utils';

// Export all constants
export * from './constants';

// Export all configuration
export * from './config';
export * from './config/chartConfiguration';
export * from './config/elementTypes';
export * from './config/interactiveChartConfiguration';
