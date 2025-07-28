/**
 * Data Source Configurations
 * 
 * Configuration for different data sources and providers
 */

import type { DataSourceConfig } from '../types';
import { PROXY_API_ENDPOINTS, RATE_LIMITS } from '../constants';

// Available data sources
export const DATA_SOURCES: Record<string, DataSourceConfig> = {
  historical: {
    type: 'historical',
    name: 'Historical Data Generator',
    description: 'Generated historical data for demonstration purposes',
    icon: '📊',
    isDefault: true,
  },
  
  liveApi: {
    type: 'live-api',
    name: 'Live Government APIs',
    description: 'Real-time data from government APIs (FRED, BLS, Census)',
    icon: '🔴',
    apiConfig: {
      endpoints: {
        fred: PROXY_API_ENDPOINTS.FRED.BASE_URL,
        bls: PROXY_API_ENDPOINTS.BLS.BASE_URL,
        census: PROXY_API_ENDPOINTS.CENSUS.BASE_URL,
        alphaVantage: PROXY_API_ENDPOINTS.ALPHA_VANTAGE.BASE_URL,
      },
      rateLimit: RATE_LIMITS.INTERNAL,
      timeout: 30000,
      retryAttempts: 3,
    },
  },
  
  cached: {
    type: 'cached',
    name: 'Cached Data',
    description: 'Previously fetched data stored in cache',
    icon: '💾',
  },
} as const;

// Data type configurations
export const DATA_TYPES = {
  'house-prices': {
    id: 'house-prices',
    name: 'House Prices',
    description: 'Median home prices and housing market trends',
    icon: '🏠',
    category: 'financial' as const,
    apiSeries: {
      fred: 'MSPUS', // Median Sales Price of Houses Sold for the United States
      census: 'MSPNHSUS', // New House Sales Price
    },
  },
  
  'household-income': {
    id: 'household-income',
    name: 'Household Income',
    description: 'Median household income statistics',
    icon: '💰',
    category: 'economic' as const,
    apiSeries: {
      census: 'MEHOINUSA672N', // Real Median Household Income
      fred: 'MEHOINUSA672N',
    },
  },
  
  'unemployment-rate': {
    id: 'unemployment-rate',
    name: 'Unemployment Rate',
    description: 'National unemployment rate statistics',
    icon: '📈',
    category: 'economic' as const,
    apiSeries: {
      fred: 'UNRATE', // Unemployment Rate
      bls: 'LNS14000000', // Unemployment Rate
    },
  },
  
  'inflation-rate': {
    id: 'inflation-rate',
    name: 'Inflation Rate',
    description: 'Consumer Price Index and inflation metrics',
    icon: '📊',
    category: 'economic' as const,
    apiSeries: {
      fred: 'CPIAUCSL', // Consumer Price Index for All Urban Consumers
      bls: 'CUUR0000SA0', // CPI-U All Items
    },
  },
  
  'gdp-growth': {
    id: 'gdp-growth',
    name: 'GDP Growth',
    description: 'Gross Domestic Product growth rates',
    icon: '📈',
    category: 'economic' as const,
    apiSeries: {
      fred: 'GDP', // Gross Domestic Product
    },
  },
  
  'stock-market': {
    id: 'stock-market',
    name: 'Stock Market',
    description: 'Stock market indices and performance',
    icon: '📈',
    category: 'financial' as const,
    apiSeries: {
      fred: 'SP500', // S&P 500
      alphaVantage: 'SPY', // SPDR S&P 500 ETF
    },
  },
  
  'interest-rates': {
    id: 'interest-rates',
    name: 'Interest Rates',
    description: 'Federal funds rate and other interest rates',
    icon: '💹',
    category: 'financial' as const,
    apiSeries: {
      fred: 'FEDFUNDS', // Federal Funds Rate
    },
  },
  
  'consumer-spending': {
    id: 'consumer-spending',
    name: 'Consumer Spending',
    description: 'Personal consumption expenditures',
    icon: '🛒',
    category: 'economic' as const,
    apiSeries: {
      fred: 'PCE', // Personal Consumption Expenditures
      census: 'PCEC96', // Real Personal Consumption Expenditures
    },
  },
} as const;

// Default data source preference
export const DEFAULT_DATA_SOURCE: keyof typeof DATA_SOURCES = 'historical';

// Data refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  realTime: 30000,    // 30 seconds
  frequent: 300000,   // 5 minutes
  normal: 900000,     // 15 minutes
  slow: 3600000,      // 1 hour
  daily: 86400000,    // 24 hours
} as const;

// Cache TTL for different data types (in seconds) - Updated to 24 hours as per requirements
export const DATA_CACHE_TTL = {
  'house-prices': 86400,       // 24 hours - as per requirements
  'household-income': 86400,   // 24 hours
  'unemployment-rate': 86400,  // 24 hours - as per requirements
  'inflation-rate': 86400,     // 24 hours - as per requirements
  'gdp-growth': 86400,         // 24 hours
  'stock-market': 86400,       // 24 hours - as per requirements (was 5 minutes)
  'interest-rates': 86400,     // 24 hours - as per requirements
  'consumer-spending': 86400,  // 24 hours - as per requirements
} as const;
