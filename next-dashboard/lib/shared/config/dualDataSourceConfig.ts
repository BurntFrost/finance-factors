/**
 * Dual Data Source Configuration
 * 
 * Comprehensive configuration system for primary/backup data source architecture
 * Maps dashboard elements to their optimal government APIs with intelligent fallback
 */

// Enhanced data source status types with provider-specific information
export type EnhancedDataSourceStatus = 
  // Live API sources
  | 'live-fred'
  | 'live-bls' 
  | 'live-census'
  | 'live-alpha-vantage'
  | 'live-world-bank'
  | 'live-oecd'
  // Fallback sources
  | 'fallback-cached'
  | 'fallback-historical'
  | 'fallback-synthetic'
  // Degraded states
  | 'degraded-partial'
  | 'circuit-breaker-open'
  // System states
  | 'loading'
  | 'error'
  // Legacy compatibility
  | 'live'
  | 'historical-fallback';

// Provider health status
export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'rate-limited' | 'circuit-open';

// Data source priority levels
export type DataSourcePriority = 'primary' | 'secondary' | 'tertiary' | 'fallback';

// Provider configuration interface
export interface ProviderConfig {
  name: string;
  displayName: string;
  baseUrl: string;
  healthCheckEndpoint?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay?: number;
    burstLimit?: number;
  };
  timeout: number;
  retryAttempts: number;
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeout: number; // milliseconds
    halfOpenMaxRequests: number;
  };
  fallbackDelay: number; // milliseconds before falling back
}

// Data source configuration for each element
export interface DataSourceElementConfig {
  dataType: string;
  displayName: string;
  category: 'economic' | 'financial' | 'demographic' | 'housing' | 'employment';
  sources: {
    primary: {
      provider: string;
      seriesId?: string;
      endpoint: string;
      params?: Record<string, string>;
      priority: DataSourcePriority;
    };
    secondary?: {
      provider: string;
      seriesId?: string;
      endpoint: string;
      params?: Record<string, string>;
      priority: DataSourcePriority;
    };
    fallback: {
      type: 'cached' | 'historical' | 'synthetic';
      priority: DataSourcePriority;
      cacheTTL?: number; // milliseconds
    };
  };
  updateFrequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  cacheTTL: number; // milliseconds
}

// Provider health tracking
export interface ProviderHealth {
  provider: string;
  status: ProviderHealthStatus;
  lastChecked: Date;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  consecutiveFailures: number;
  averageResponseTime: number;
  successRate: number; // percentage over last 100 requests
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  nextRetryTime: Date | null;
  rateLimitResetTime: Date | null;
}

// Failover event tracking
export interface FailoverEvent {
  timestamp: Date;
  dataType: string;
  fromProvider: string;
  toProvider: string;
  reason: 'timeout' | 'error' | 'rate-limit' | 'circuit-breaker' | 'manual' | 'configured_secondary' | 'intelligent_fallback';
  duration: number; // milliseconds
  success: boolean;
  metadata?: Record<string, unknown>;
}

// Provider configurations
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  FRED: {
    name: 'FRED',
    displayName: 'Federal Reserve Economic Data',
    baseUrl: 'https://api.stlouisfed.org/fred',
    healthCheckEndpoint: '/series?series_id=GDP',
    rateLimit: {
      requestsPerMinute: 120,
      requestsPerDay: 100000,
      burstLimit: 10,
    },
    timeout: 10000,
    retryAttempts: 3,
    circuitBreakerConfig: {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      halfOpenMaxRequests: 3,
    },
    fallbackDelay: 2000,
  },
  BLS: {
    name: 'BLS',
    displayName: 'Bureau of Labor Statistics',
    baseUrl: 'https://api.bls.gov/publicAPI/v2',
    healthCheckEndpoint: '/timeseries/data',
    rateLimit: {
      requestsPerMinute: 25,
      requestsPerDay: 500,
      burstLimit: 5,
    },
    timeout: 15000,
    retryAttempts: 3,
    circuitBreakerConfig: {
      failureThreshold: 3,
      recoveryTimeout: 120000, // 2 minutes
      halfOpenMaxRequests: 2,
    },
    fallbackDelay: 3000,
  },
  CENSUS: {
    name: 'CENSUS',
    displayName: 'U.S. Census Bureau',
    baseUrl: 'https://api.census.gov/data',
    healthCheckEndpoint: '/2022/acs/acs1',
    rateLimit: {
      requestsPerMinute: 500,
      requestsPerDay: 50000,
      burstLimit: 20,
    },
    timeout: 12000,
    retryAttempts: 3,
    circuitBreakerConfig: {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      halfOpenMaxRequests: 3,
    },
    fallbackDelay: 2500,
  },
  ALPHA_VANTAGE: {
    name: 'ALPHA_VANTAGE',
    displayName: 'Alpha Vantage',
    baseUrl: 'https://www.alphavantage.co/query',
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 500,
      burstLimit: 2,
    },
    timeout: 10000,
    retryAttempts: 2,
    circuitBreakerConfig: {
      failureThreshold: 3,
      recoveryTimeout: 300000, // 5 minutes
      halfOpenMaxRequests: 1,
    },
    fallbackDelay: 5000,
  },
  WORLD_BANK: {
    name: 'WORLD_BANK',
    displayName: 'World Bank Open Data',
    baseUrl: 'https://api.worldbank.org/v2',
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
      burstLimit: 10,
    },
    timeout: 15000,
    retryAttempts: 3,
    circuitBreakerConfig: {
      failureThreshold: 5,
      recoveryTimeout: 120000, // 2 minutes
      halfOpenMaxRequests: 3,
    },
    fallbackDelay: 3000,
  },
  OECD: {
    name: 'OECD',
    displayName: 'OECD Statistics',
    baseUrl: 'https://stats.oecd.org/restsdmx/sdmx.ashx',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 5000,
      burstLimit: 8,
    },
    timeout: 12000,
    retryAttempts: 3,
    circuitBreakerConfig: {
      failureThreshold: 4,
      recoveryTimeout: 90000, // 1.5 minutes
      halfOpenMaxRequests: 2,
    },
    fallbackDelay: 2500,
  },
};

// Default cache TTL values (in milliseconds)
export const CACHE_TTL_CONFIG = {
  REAL_TIME: 5 * 60 * 1000,      // 5 minutes
  HOURLY: 60 * 60 * 1000,        // 1 hour
  DAILY: 24 * 60 * 60 * 1000,    // 24 hours
  WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
  MONTHLY: 30 * 24 * 60 * 60 * 1000, // 30 days
  FALLBACK: 24 * 60 * 60 * 1000,  // 24 hours for fallback data
  ERROR: 2 * 60 * 1000,           // 2 minutes for error responses
} as const;

// Comprehensive data source element configurations
export const DATA_SOURCE_ELEMENTS: Record<string, DataSourceElementConfig> = {
  'house-prices': {
    dataType: 'house-prices',
    displayName: 'House Prices',
    category: 'housing',
    sources: {
      primary: {
        provider: 'FRED',
        seriesId: 'CSUSHPISA',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '120',
        },
        priority: 'primary',
      },
      secondary: {
        provider: 'CENSUS',
        endpoint: '/2022/acs/acs1',
        params: {
          get: 'B25077_001E',
          for: 'us:*',
        },
        priority: 'secondary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'monthly',
    cacheTTL: CACHE_TTL_CONFIG.DAILY,
  },
  'unemployment-rate': {
    dataType: 'unemployment-rate',
    displayName: 'Unemployment Rate',
    category: 'employment',
    sources: {
      primary: {
        provider: 'BLS',
        seriesId: 'LNS14000000',
        endpoint: '/timeseries/data',
        params: {
          calculations: 'true',
          annualaverage: 'false',
        },
        priority: 'primary',
      },
      secondary: {
        provider: 'FRED',
        seriesId: 'UNRATE',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '120',
        },
        priority: 'secondary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'monthly',
    cacheTTL: CACHE_TTL_CONFIG.DAILY,
  },
  'inflation-rate': {
    dataType: 'inflation-rate',
    displayName: 'Inflation Rate (CPI)',
    category: 'economic',
    sources: {
      primary: {
        provider: 'BLS',
        seriesId: 'CUUR0000SA0',
        endpoint: '/timeseries/data',
        params: {
          calculations: 'true',
          annualaverage: 'false',
        },
        priority: 'primary',
      },
      secondary: {
        provider: 'FRED',
        seriesId: 'CPIAUCSL',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '120',
        },
        priority: 'secondary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'monthly',
    cacheTTL: CACHE_TTL_CONFIG.DAILY,
  },
  'gdp-growth': {
    dataType: 'gdp-growth',
    displayName: 'GDP Growth',
    category: 'economic',
    sources: {
      primary: {
        provider: 'FRED',
        seriesId: 'GDP',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '40',
        },
        priority: 'primary',
      },
      secondary: {
        provider: 'WORLD_BANK',
        endpoint: '/country/USA/indicator/NY.GDP.MKTP.KD.ZG',
        params: {
          format: 'json',
          per_page: '50',
        },
        priority: 'secondary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.WEEKLY,
      },
    },
    updateFrequency: 'monthly',
    cacheTTL: CACHE_TTL_CONFIG.WEEKLY,
  },
  'fed-funds-rate': {
    dataType: 'fed-funds-rate',
    displayName: 'Federal Funds Rate',
    category: 'economic',
    sources: {
      primary: {
        provider: 'FRED',
        seriesId: 'FEDFUNDS',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '120',
        },
        priority: 'primary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'monthly',
    cacheTTL: CACHE_TTL_CONFIG.DAILY,
  },
  'treasury-10y': {
    dataType: 'treasury-10y',
    displayName: '10-Year Treasury Rate',
    category: 'financial',
    sources: {
      primary: {
        provider: 'FRED',
        seriesId: 'GS10',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '120',
        },
        priority: 'primary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'daily',
    cacheTTL: CACHE_TTL_CONFIG.HOURLY,
  },
  'treasury-2y': {
    dataType: 'treasury-2y',
    displayName: '2-Year Treasury Rate',
    category: 'financial',
    sources: {
      primary: {
        provider: 'FRED',
        seriesId: 'GS2',
        endpoint: '/series/observations',
        params: {
          file_type: 'json',
          sort_order: 'desc',
          limit: '120',
        },
        priority: 'primary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'daily',
    cacheTTL: CACHE_TTL_CONFIG.HOURLY,
  },
  'sp500': {
    dataType: 'sp500',
    displayName: 'S&P 500 Index',
    category: 'financial',
    sources: {
      primary: {
        provider: 'ALPHA_VANTAGE',
        endpoint: '',
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: 'SPY',
          outputsize: 'compact',
          datatype: 'json',
        },
        priority: 'primary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.DAILY,
      },
    },
    updateFrequency: 'daily',
    cacheTTL: CACHE_TTL_CONFIG.HOURLY,
  },
  'population': {
    dataType: 'population',
    displayName: 'U.S. Population',
    category: 'demographic',
    sources: {
      primary: {
        provider: 'CENSUS',
        endpoint: '/2022/acs/acs1',
        params: {
          get: 'B01003_001E',
          for: 'us:*',
        },
        priority: 'primary',
      },
      fallback: {
        type: 'historical',
        priority: 'fallback',
        cacheTTL: CACHE_TTL_CONFIG.MONTHLY,
      },
    },
    updateFrequency: 'monthly',
    cacheTTL: CACHE_TTL_CONFIG.WEEKLY,
  },
};

// Utility functions for data source configuration
export class DataSourceConfigManager {
  /**
   * Get data source configuration for a specific data type
   */
  static getElementConfig(dataType: string): DataSourceElementConfig | null {
    return DATA_SOURCE_ELEMENTS[dataType] || null;
  }

  /**
   * Get provider configuration
   */
  static getProviderConfig(provider: string): ProviderConfig | null {
    return PROVIDER_CONFIGS[provider] || null;
  }

  /**
   * Get primary provider for a data type
   */
  static getPrimaryProvider(dataType: string): string | null {
    const config = this.getElementConfig(dataType);
    return config?.sources.primary.provider || null;
  }

  /**
   * Get secondary provider for a data type
   */
  static getSecondaryProvider(dataType: string): string | null {
    const config = this.getElementConfig(dataType);
    return config?.sources.secondary?.provider || null;
  }

  /**
   * Get fallback configuration for a data type
   */
  static getFallbackConfig(dataType: string): { type: 'cached' | 'historical' | 'synthetic'; priority: DataSourcePriority; cacheTTL?: number } | null {
    const config = this.getElementConfig(dataType);
    return config?.sources.fallback || null;
  }

  /**
   * Get all providers used by a data type (primary + secondary)
   */
  static getProvidersForDataType(dataType: string): string[] {
    const config = this.getElementConfig(dataType);
    if (!config) return [];

    const providers = [config.sources.primary.provider];
    if (config.sources.secondary) {
      providers.push(config.sources.secondary.provider);
    }
    return providers;
  }

  /**
   * Get all available live providers that could potentially serve any data type
   * This is used for intelligent fallback - try all live APIs before historical data
   */
  static getAllLiveProviders(): string[] {
    return Object.keys(PROVIDER_CONFIGS);
  }

  /**
   * Get providers to try for a data type in order of preference
   * Returns: [primary, secondary, ...other live providers]
   */
  static getProvidersToTryForDataType(dataType: string): string[] {
    const configuredProviders = this.getProvidersForDataType(dataType);
    const allLiveProviders = this.getAllLiveProviders();

    // Start with configured providers (primary, secondary)
    const providersToTry = [...configuredProviders];

    // Add other live providers that aren't already configured for this data type
    const otherProviders = allLiveProviders.filter(provider =>
      !configuredProviders.includes(provider)
    );

    providersToTry.push(...otherProviders);

    return providersToTry;
  }

  /**
   * Get all data types that use a specific provider
   */
  static getDataTypesForProvider(provider: string): string[] {
    return Object.entries(DATA_SOURCE_ELEMENTS)
      .filter(([_, config]) =>
        config.sources.primary.provider === provider ||
        config.sources.secondary?.provider === provider
      )
      .map(([dataType, _]) => dataType);
  }

  /**
   * Get cache TTL for a data type
   */
  static getCacheTTL(dataType: string): number {
    const config = this.getElementConfig(dataType);
    return config?.cacheTTL || CACHE_TTL_CONFIG.DAILY;
  }

  /**
   * Get update frequency for a data type
   */
  static getUpdateFrequency(dataType: string): 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly' {
    const config = this.getElementConfig(dataType);
    return config?.updateFrequency || 'daily';
  }

  /**
   * Check if a provider supports a specific data type
   */
  static providerSupportsDataType(provider: string, dataType: string): boolean {
    const providers = this.getProvidersForDataType(dataType);
    return providers.includes(provider);
  }

  /**
   * Get provider display name
   */
  static getProviderDisplayName(provider: string): string {
    const config = this.getProviderConfig(provider);
    return config?.displayName || provider;
  }

  /**
   * Get data source status based on provider
   */
  static getDataSourceStatus(provider: string): EnhancedDataSourceStatus {
    switch (provider.toLowerCase()) {
      case 'fred':
        return 'live-fred';
      case 'bls':
        return 'live-bls';
      case 'census':
        return 'live-census';
      case 'alpha_vantage':
        return 'live-alpha-vantage';
      case 'world_bank':
        return 'live-world-bank';
      case 'oecd':
        return 'live-oecd';
      case 'cached':
        return 'fallback-cached';
      case 'historical':
        return 'fallback-historical';
      case 'synthetic':
        return 'fallback-synthetic';
      default:
        return 'error';
    }
  }

  /**
   * Get provider from data source status
   */
  static getProviderFromStatus(status: EnhancedDataSourceStatus): string | null {
    switch (status) {
      case 'live-fred':
        return 'FRED';
      case 'live-bls':
        return 'BLS';
      case 'live-census':
        return 'CENSUS';
      case 'live-alpha-vantage':
        return 'ALPHA_VANTAGE';
      case 'live-world-bank':
        return 'WORLD_BANK';
      case 'live-oecd':
        return 'OECD';
      default:
        return null;
    }
  }

  /**
   * Check if status indicates a live API source
   */
  static isLiveApiStatus(status: EnhancedDataSourceStatus): boolean {
    return status.startsWith('live-');
  }

  /**
   * Check if status indicates a fallback source
   */
  static isFallbackStatus(status: EnhancedDataSourceStatus): boolean {
    return status.startsWith('fallback-');
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): string[] {
    return Object.keys(PROVIDER_CONFIGS);
  }

  /**
   * Get all available data types
   */
  static getAllDataTypes(): string[] {
    return Object.keys(DATA_SOURCE_ELEMENTS);
  }
}
