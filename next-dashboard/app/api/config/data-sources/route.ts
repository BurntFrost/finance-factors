/**
 * Data Source Configuration API Endpoint
 *
 * Provides runtime configuration information about enabled/disabled data sources
 * Used by the frontend to determine which data sources are available
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  isWorldBankApiEnabled, 
  isOECDApiEnabled, 
  isTraditionalApisEnabled,
  getFeatureToggleStatus 
} from '@/backend/lib/feature-toggles';

// CORS headers for cross-origin requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * Get data source configuration
 */
export async function GET(_request: NextRequest) {
  try {
    const config = {
      dataSources: {
        worldBank: {
          enabled: isWorldBankApiEnabled(),
          name: 'World Bank Open Data',
          description: 'Global economic indicators and development data',
          baseUrl: 'https://api.worldbank.org/v2',
          requiresApiKey: false,
        },
        oecd: {
          enabled: isOECDApiEnabled(),
          name: 'OECD Statistics',
          description: 'High-quality economic statistics and indicators',
          baseUrl: 'https://sdmx.oecd.org/public/rest/data',
          requiresApiKey: false,
        },
        traditionalApis: {
          enabled: isTraditionalApisEnabled(),
          name: 'Traditional Government APIs',
          description: 'FRED, BLS, Census, and Alpha Vantage APIs',
          apis: {
            fred: {
              name: 'Federal Reserve Economic Data',
              baseUrl: 'https://api.stlouisfed.org/fred',
              requiresApiKey: true,
            },
            bls: {
              name: 'Bureau of Labor Statistics',
              baseUrl: 'https://api.bls.gov/publicAPI/v2',
              requiresApiKey: true,
            },
            census: {
              name: 'U.S. Census Bureau',
              baseUrl: 'https://api.census.gov/data',
              requiresApiKey: true,
            },
            alphaVantage: {
              name: 'Alpha Vantage',
              baseUrl: 'https://www.alphavantage.co/query',
              requiresApiKey: true,
            },
          },
        },
      },
      featureToggles: getFeatureToggleStatus(),
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    return NextResponse.json(config, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching data source configuration:', error);
    
    const errorResponse = {
      error: 'Failed to fetch data source configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
