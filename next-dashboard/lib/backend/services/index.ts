/**
 * Backend Services Index
 * 
 * Barrel export for all backend services
 */

// Core services
export { cacheService, CacheService } from './cache-service';
export { healthService, HealthService } from './health-service';

// Data provider services
export { fredProxyService } from './data-providers/fred-proxy';
export { blsProxyService } from './data-providers/bls-proxy';
export { censusProxyService } from './data-providers/census-proxy';
export { alphaVantageProxyService } from './data-providers/alpha-vantage-proxy';
