/**
 * API Proxy Types
 * 
 * Type definitions for the serverless API proxy functions
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { RATE_LIMITS as CENTRALIZED_RATE_LIMITS } from '../constants/api-endpoints';

// User experience indicator types
export interface UserExperienceIndicator {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  icon?: string;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number; // in milliseconds
}

// Performance impact levels
export enum PerformanceImpact {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Fallback mode information
export interface FallbackModeInfo {
  isActive: boolean;
  reason?: string;
  activatedAt?: string;
  performanceImpact: PerformanceImpact;
  expectedDelay?: number; // in milliseconds
  userIndicator?: UserExperienceIndicator;
}

// Base API response structure that matches the frontend expectations
export interface ProxyApiResponse<T = unknown> {
  data: T | null;
  success: boolean;
  error?: string;
  timestamp: Date;
  source: string;
  metadata?: {
    totalRecords?: number;
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
    isFallback?: boolean;
    reason?: string;
    fallbackMode?: FallbackModeInfo;
    userIndicators?: UserExperienceIndicator[];
    performanceMetrics?: {
      responseTime: number;
      cacheHit: boolean;
      dataFreshness: 'real-time' | 'cached' | 'fallback';
    };
  };
}

// Request options that match the frontend DataFetchOptions
export interface ProxyRequestOptions {
  dataType: string;
  timeRange?: {
    start?: string; // ISO date string
    end?: string;   // ISO date string
  };
  useCache?: boolean;
  cacheTTL?: number;
}

// FRED API specific types
export interface FredObservation {
  realtime_start: string;
  realtime_end: string;
  date: string;
  value: string;
}

export interface FredApiResponse {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations: FredObservation[];
}

// BLS API specific types
export interface BlsDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: Array<{ code: string; text: string }>;
}

export interface BlsSeries {
  seriesID: string;
  data: BlsDataPoint[];
}

export interface BlsApiResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BlsSeries[];
  };
}

// Standard data point format that the frontend expects
export interface StandardDataPoint {
  date: string;
  value: number;
  label?: string;
}

// World Bank API specific types
export interface WorldBankDataPoint {
  indicator: {
    id: string;
    value: string;
  };
  country: {
    id: string;
    value: string;
  };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  obs_status: string;
  decimal: number;
}

export interface WorldBankApiResponse {
  page: number;
  pages: number;
  per_page: number;
  total: number;
  sourceid: string;
  lastupdated: string;
}

// OECD API specific types (SDMX format)
export interface OECDDataPoint {
  TIME_PERIOD: string;
  OBS_VALUE: number | string;
  UNIT_MEASURE?: string;
  OBS_STATUS?: string;
  CONF_STATUS?: string;
}

export interface OECDSeries {
  name: string;
  observations: Record<string, OECDDataPoint>;
}

export interface OECDDataSet {
  series: Record<string, OECDSeries>;
  structure: {
    dimensions: {
      observation: Array<{
        id: string;
        name: string;
        values: Array<{
          id: string;
          name: string;
        }>;
      }>;
    };
  };
}

export interface OECDApiResponse {
  data: {
    dataSets: OECDDataSet[];
  };
  meta: {
    id: string;
    prepared: string;
    sender: {
      id: string;
      name: string;
    };
  };
}

// API endpoint configuration
export interface ApiEndpointConfig {
  provider: 'FRED' | 'BLS' | 'CENSUS' | 'ALPHA_VANTAGE' | 'WORLD_BANK' | 'OECD';
  seriesId?: string;
  endpoint: string;
  params?: Record<string, string>;
  countryCode?: string; // For World Bank and OECD APIs
  indicatorId?: string; // For World Bank and OECD APIs
}

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// Cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
}

// Error types
export type ProxyErrorType = 'api' | 'network' | 'rate_limit' | 'validation' | 'configuration' | 'unknown';

export interface ProxyError {
  type: ProxyErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

// Utility type for API handlers
export type ProxyApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse<ProxyApiResponse>
) => Promise<void>;

// Configuration for different data sources
export const PROXY_API_ENDPOINTS: Record<string, ApiEndpointConfig> = {
  'house-prices': {
    provider: 'FRED',
    seriesId: 'CSUSHPISA', // Case-Shiller U.S. National Home Price Index
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120', // 10 years of monthly data
    },
  },
  'salary-income': {
    provider: 'BLS',
    seriesId: 'CES0500000003', // Average hourly earnings of all employees
    endpoint: '/timeseries/data',
    params: {
      calculations: 'true',
      annualaverage: 'true',
    },
  },
  'cost-of-living': {
    provider: 'BLS',
    seriesId: 'CUUR0000SA0', // Consumer Price Index - All Urban Consumers
    endpoint: '/timeseries/data',
    params: {
      calculations: 'true',
      annualaverage: 'true',
    },
  },
  'federal-funds-rate': {
    provider: 'FRED',
    seriesId: 'FEDFUNDS', // Federal Funds Effective Rate
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'unemployment-rate': {
    provider: 'FRED',
    seriesId: 'UNRATE', // Unemployment Rate
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'inflation-cpi': {
    provider: 'FRED',
    seriesId: 'CPIAUCSL', // Consumer Price Index for All Urban Consumers
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'core-inflation': {
    provider: 'FRED',
    seriesId: 'CPILFESL', // Consumer Price Index for All Urban Consumers: All Items Less Food and Energy
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'gdp-growth': {
    provider: 'FRED',
    seriesId: 'GDP', // Gross Domestic Product
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '40', // 10 years of quarterly data
    },
  },
  'money-supply-m1': {
    provider: 'FRED',
    seriesId: 'M1SL', // M1 Money Stock
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'money-supply-m2': {
    provider: 'FRED',
    seriesId: 'M2SL', // M2 Money Stock
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'treasury-10y': {
    provider: 'FRED',
    seriesId: 'GS10', // 10-Year Treasury Constant Maturity Rate
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'treasury-2y': {
    provider: 'FRED',
    seriesId: 'GS2', // 2-Year Treasury Constant Maturity Rate
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'fed-balance-sheet': {
    provider: 'FRED',
    seriesId: 'WALCL', // All Federal Reserve Banks: Total Assets
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  // Missing data types - using Census for demographic/economic proxies
  'tuition-education': {
    provider: 'CENSUS',
    seriesId: 'B15003_022E', // Bachelor's degree or higher (education proxy)
    endpoint: '/acs/acs5',
    params: {
      get: 'B15003_022E,NAME',
      for: 'us:*',
    },
  },
  'medical-costs': {
    provider: 'CENSUS',
    seriesId: 'B19301_001E', // Per capita income (healthcare affordability proxy)
    endpoint: '/acs/acs5',
    params: {
      get: 'B19301_001E,NAME',
      for: 'us:*',
    },
  },
  'childcare-costs': {
    provider: 'CENSUS',
    seriesId: 'B19301_001E', // Per capita income (childcare affordability proxy)
    endpoint: '/acs/acs5',
    params: {
      get: 'B19301_001E,NAME',
      for: 'us:*',
    },
  },
  'transportation-costs': {
    provider: 'CENSUS',
    seriesId: 'B19301_001E', // Per capita income (transportation affordability proxy)
    endpoint: '/acs/acs5',
    params: {
      get: 'B19301_001E,NAME',
      for: 'us:*',
    },
  },
  'food-prices': {
    provider: 'FRED',
    seriesId: 'CPIUFDSL', // Consumer Price Index for All Urban Consumers: Food
    endpoint: '/series/observations',
    params: {
      file_type: 'json',
      sort_order: 'desc',
      limit: '120',
    },
  },
  'utilities-costs': {
    provider: 'CENSUS',
    seriesId: 'B25064_001E', // Median gross rent (includes utilities)
    endpoint: '/acs/acs5',
    params: {
      get: 'B25064_001E,NAME',
      for: 'us:*',
    },
  },
  'investment-returns': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'SPY', // S&P 500 ETF as investment proxy
      outputsize: 'compact',
    },
  },

  // Investment ETFs — all use Alpha Vantage TIME_SERIES_MONTHLY
  'sp500-index': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'SPY',
      outputsize: 'full', // Need 20+ years for CAGR
    },
  },
  'nasdaq-100': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'QQQ',
      outputsize: 'full',
    },
  },
  'sector-realestate': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'VNQ',
      outputsize: 'full',
    },
  },
  'sector-energy': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'XLE',
      outputsize: 'full',
    },
  },
  'sector-financials': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'XLF',
      outputsize: 'full',
    },
  },
  'sector-healthcare': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'XLV',
      outputsize: 'full',
    },
  },
  'gold': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'GLD',
      outputsize: 'full',
    },
  },
  'long-term-treasuries': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'TLT',
      outputsize: 'full',
    },
  },
  'emerging-markets': {
    provider: 'ALPHA_VANTAGE',
    endpoint: '/query',
    params: {
      function: 'TIME_SERIES_MONTHLY',
      symbol: 'VWO',
      outputsize: 'full',
    },
  },

  // World Bank API endpoints
  'world-bank-gdp-us': {
    provider: 'WORLD_BANK',
    countryCode: 'US',
    indicatorId: 'NY.GDP.MKTP.CD', // GDP (current US$)
    endpoint: '/country/US/indicator/NY.GDP.MKTP.CD',
    params: {
      format: 'json',
      date: '2000:2024',
      per_page: '100',
    },
  },
  'world-bank-inflation-us': {
    provider: 'WORLD_BANK',
    countryCode: 'US',
    indicatorId: 'FP.CPI.TOTL.ZG', // Inflation, consumer prices (annual %)
    endpoint: '/country/US/indicator/FP.CPI.TOTL.ZG',
    params: {
      format: 'json',
      date: '2000:2024',
      per_page: '100',
    },
  },
  'world-bank-unemployment-us': {
    provider: 'WORLD_BANK',
    countryCode: 'US',
    indicatorId: 'SL.UEM.TOTL.ZS', // Unemployment, total (% of total labor force)
    endpoint: '/country/US/indicator/SL.UEM.TOTL.ZS',
    params: {
      format: 'json',
      date: '2000:2024',
      per_page: '100',
    },
  },
  'world-bank-trade-us': {
    provider: 'WORLD_BANK',
    countryCode: 'US',
    indicatorId: 'NE.TRD.GNFS.ZS', // Trade (% of GDP)
    endpoint: '/country/US/indicator/NE.TRD.GNFS.ZS',
    params: {
      format: 'json',
      date: '2000:2024',
      per_page: '100',
    },
  },
  // Global indicators for comparison
  'world-bank-gdp-global': {
    provider: 'WORLD_BANK',
    countryCode: 'WLD',
    indicatorId: 'NY.GDP.MKTP.CD', // World GDP (current US$)
    endpoint: '/country/WLD/indicator/NY.GDP.MKTP.CD',
    params: {
      format: 'json',
      date: '2000:2024',
      per_page: '100',
    },
  },

  // OECD API endpoints
  'oecd-gdp-us': {
    provider: 'OECD',
    countryCode: 'USA',
    indicatorId: 'GDP',
    endpoint: '/OECD.SDD.NAD,DSD_NAAG@DF_NAAG_I/USA.GDP.CPC.A',
    params: {
      format: 'jsondata',
      startPeriod: '2000',
      endPeriod: '2024',
    },
  },
  'oecd-employment-us': {
    provider: 'OECD',
    countryCode: 'USA',
    indicatorId: 'EMPLOYMENT',
    endpoint: '/OECD.SDD.STES,DSD_STES@DF_STES/USA.EMPLOYMENT.STSA.M',
    params: {
      format: 'jsondata',
      startPeriod: '2000-01',
      endPeriod: '2024-12',
    },
  },
  'oecd-productivity-us': {
    provider: 'OECD',
    countryCode: 'USA',
    indicatorId: 'PRODUCTIVITY',
    endpoint: '/OECD.SDD.PDB,DSD_PDB@DF_PDB/USA.T_GDPHRS.A',
    params: {
      format: 'jsondata',
      startPeriod: '2000',
      endPeriod: '2024',
    },
  },
  'oecd-interest-rates-us': {
    provider: 'OECD',
    countryCode: 'USA',
    indicatorId: 'INTEREST_RATES',
    endpoint: '/OECD.SDD.MEI,DSD_MEI@DF_MEI/USA.IR3TIB01.ST.M',
    params: {
      format: 'jsondata',
      startPeriod: '2000-01',
      endPeriod: '2024-12',
    },
  },
};

// Use centralized rate limit configurations
export const RATE_LIMITS: Record<string, RateLimitConfig> = CENTRALIZED_RATE_LIMITS;

// Cache configuration
export const CACHE_CONFIG: CacheConfig = {
  ttl: 24 * 60 * 60 * 1000, // 24 hours (86400000 milliseconds) - as per requirements
  maxSize: 1000, // Maximum 1000 cached items
};
