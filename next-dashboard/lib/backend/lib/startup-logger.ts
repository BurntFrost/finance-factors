/**
 * Startup Logger
 * 
 * Logs important configuration and feature toggle status when the application starts
 */

import { logFeatureToggleStatus } from './feature-toggles';

/**
 * Log application startup information
 * This should be called once when the application starts
 */
export function logApplicationStartup(): void {
  console.log('=== Finance Factors Dashboard Starting ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Next.js Version: ${process.env.npm_package_dependencies_next || 'unknown'}`);
  
  // Log feature toggle status
  logFeatureToggleStatus();
  
  // Log data source configuration
  console.log('=== Data Source Configuration ===');
  console.log(`Default Data Source: ${process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE || 'not set'}`);
  console.log(`Use API Proxy: ${process.env.NEXT_PUBLIC_USE_API_PROXY || 'not set'}`);
  console.log(`Enable Caching: ${process.env.NEXT_PUBLIC_ENABLE_CACHING || 'not set'}`);
  
  // Log API key status (without revealing the keys)
  console.log('=== API Key Status ===');
  console.log(`FRED API Key: ${process.env.NEXT_PUBLIC_FRED_API_KEY ? 'configured' : 'not configured'}`);
  console.log(`BLS API Key: ${process.env.NEXT_PUBLIC_BLS_API_KEY ? 'configured' : 'not configured'}`);
  console.log(`Census API Key: ${process.env.NEXT_PUBLIC_CENSUS_API_KEY ? 'configured' : 'not configured'}`);
  console.log(`Alpha Vantage API Key: ${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY ? 'configured' : 'not configured'}`);
  
  console.log('==========================================');
}

// Auto-log on import in server environments
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only log once per process
  if (!global.__startupLogged) {
    global.__startupLogged = true;
    logApplicationStartup();
  }
}

// Extend global type for TypeScript
declare global {
  var __startupLogged: boolean | undefined;
}
