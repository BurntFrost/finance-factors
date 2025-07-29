/**
 * Data Source Configuration Hook
 *
 * React hook for fetching and managing data source configuration
 * Provides information about which data sources are enabled/disabled
 */

import { useState, useEffect, useCallback } from 'react';

export interface DataSourceConfig {
  dataSources: {
    worldBank: {
      enabled: boolean;
      name: string;
      description: string;
      baseUrl: string;
      requiresApiKey: boolean;
    };
    oecd: {
      enabled: boolean;
      name: string;
      description: string;
      baseUrl: string;
      requiresApiKey: boolean;
    };
    traditionalApis: {
      enabled: boolean;
      name: string;
      description: string;
      apis: {
        fred: {
          name: string;
          baseUrl: string;
          requiresApiKey: boolean;
        };
        bls: {
          name: string;
          baseUrl: string;
          requiresApiKey: boolean;
        };
        census: {
          name: string;
          baseUrl: string;
          requiresApiKey: boolean;
        };
        alphaVantage: {
          name: string;
          baseUrl: string;
          requiresApiKey: boolean;
        };
      };
    };
  };
  featureToggles: {
    redis: {
      enabled: boolean;
      reason: string;
    };
    prisma: {
      enabled: boolean;
      reason: string;
    };
    worldBankApi: {
      enabled: boolean;
      reason: string;
    };
    oecdApi: {
      enabled: boolean;
      reason: string;
    };
    traditionalApis: {
      enabled: boolean;
      reason: string;
    };
    timestamp: string;
  };
  metadata: {
    timestamp: string;
    version: string;
    environment: string;
  };
}

export interface UseDataSourceConfigResult {
  config: DataSourceConfig | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isWorldBankEnabled: boolean;
  isOECDEnabled: boolean;
  isTraditionalApisEnabled: boolean;
  getEnabledDataSources: () => string[];
}

/**
 * Hook to fetch and manage data source configuration
 */
export function useDataSourceConfig(): UseDataSourceConfigResult {
  const [config, setConfig] = useState<DataSourceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/config/data-sources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data source configuration: ${response.status} ${response.statusText}`);
      }

      const configData: DataSourceConfig = await response.json();
      setConfig(configData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Error fetching data source configuration:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch configuration on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Derived values for convenience
  const isWorldBankEnabled = config?.dataSources.worldBank.enabled ?? false;
  const isOECDEnabled = config?.dataSources.oecd.enabled ?? false;
  const isTraditionalApisEnabled = config?.dataSources.traditionalApis.enabled ?? false;

  // Get list of enabled data sources
  const getEnabledDataSources = useCallback((): string[] => {
    if (!config) return [];

    const enabled: string[] = [];
    
    if (config.dataSources.worldBank.enabled) {
      enabled.push('World Bank');
    }
    
    if (config.dataSources.oecd.enabled) {
      enabled.push('OECD');
    }
    
    if (config.dataSources.traditionalApis.enabled) {
      enabled.push('FRED', 'BLS', 'Census', 'Alpha Vantage');
    }

    return enabled;
  }, [config]);

  return {
    config,
    isLoading,
    error,
    refresh: fetchConfig,
    isWorldBankEnabled,
    isOECDEnabled,
    isTraditionalApisEnabled,
    getEnabledDataSources,
  };
}

/**
 * Utility function to check if a specific data source is enabled
 * Can be used outside of React components
 */
export async function checkDataSourceEnabled(source: 'worldBank' | 'oecd' | 'traditionalApis'): Promise<boolean> {
  try {
    const response = await fetch('/api/config/data-sources');
    if (!response.ok) return false;
    
    const config: DataSourceConfig = await response.json();
    return config.dataSources[source].enabled;
  } catch {
    return false;
  }
}
