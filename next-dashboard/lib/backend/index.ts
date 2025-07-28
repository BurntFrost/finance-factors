/**
 * Backend Index
 * 
 * Main barrel export for all backend code
 */

// Export all services
export * from './services';
export * from './services/alphaVantageApiService';
export * from './services/apiDataService';
export * from './services/blsApiService';
export * from './services/censusApiService';
export * from './services/dataTransformers';
export * from './services/fredApiService';
export * from './services/mockApiService';
export * from './services/proxyApiService';
export * from './services/realApiService';
export * from './services/websocketService';

// Export all libraries
export * from './lib';
export * from './lib/adaptive-circuit-breaker';
export * from './lib/advanced-cache';
export * from './lib/compression';
export * from './lib/connection-pool';
export * from './lib/db-connection-monitor';
export * from './lib/distributed-health-dashboard';
export * from './lib/prisma';
export * from './lib/redis-cache';
export * from './lib/redis-error-logger';
export * from './lib/redis-fallback-service';
export * from './lib/redis-health-monitor';
export * from './lib/redis-predictive-analytics';
export * from './lib/redis-rate-limit';
export * from './lib/redis';
export * from './lib/request-batcher';
export * from './lib/smart-cache-optimizer';
export * from './lib/user-context-service';
export * from './lib/user-experience-service';

// Export backend-specific types
export * from './types/health';

// Export backend-specific utils
export * from './utils/health-utils';
