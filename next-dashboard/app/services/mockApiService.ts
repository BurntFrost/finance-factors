/**
 * Mock API Service
 * 
 * This module provides mock financial data APIs for testing the data source
 * integration without external dependencies. It simulates real API responses
 * with realistic data patterns and timing.
 */

import { ApiResponse, DataFetchOptions } from '../types/dataSource';

// Utility function to create delay (simulating network latency)
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Utility function to generate random number within range
const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Utility function to generate random float within range
const randomFloatInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Generate realistic time series data with trends
function generateTimeSeriesData(
  startYear: number,
  endYear: number,
  baseValue: number,
  growthRate: number,
  volatility: number = 0.1
) {
  const data = [];
  let currentValue = baseValue;
  
  for (let year = startYear; year <= endYear; year++) {
    // Apply growth trend
    currentValue *= (1 + growthRate);
    
    // Add volatility
    const volatilityFactor = 1 + (Math.random() - 0.5) * volatility;
    const finalValue = Math.round(currentValue * volatilityFactor);
    
    data.push({
      date: `${year}-01-01`,
      value: finalValue,
    });
  }
  
  return data;
}

// Mock API endpoints
const mockEndpoints = {
  // House prices data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  housing: async (_options: DataFetchOptions) => {
    await delay(randomInRange(500, 1500)); // Simulate network delay
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 29;
    
    // Generate realistic house price data with 3-5% annual growth
    const data = generateTimeSeriesData(
      startYear,
      currentYear,
      180000, // Base price
      0.04, // 4% annual growth
      0.15 // 15% volatility
    );
    
    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Housing API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Income data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  income: async (_options: DataFetchOptions) => {
    await delay(randomInRange(300, 1200));
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 29;
    
    // Generate realistic income data with 2-3% annual growth
    const data = generateTimeSeriesData(
      startYear,
      currentYear,
      45000, // Base income
      0.025, // 2.5% annual growth
      0.08 // 8% volatility
    );
    
    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Income API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Cost of living data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  economic: async (_options: DataFetchOptions) => {
    await delay(randomInRange(400, 1000));
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19; // 20 years of data
    
    // Generate cost of living index (base 100)
    const data = generateTimeSeriesData(
      startYear,
      currentYear,
      100, // Base index
      0.03, // 3% annual inflation
      0.05 // 5% volatility
    );
    
    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Economic API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Education costs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  education: async (_options: DataFetchOptions) => {
    await delay(randomInRange(600, 1400));
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 24; // 25 years of data
    
    // Generate tuition data with higher growth rate
    const data = generateTimeSeriesData(
      startYear,
      currentYear,
      15000, // Base tuition
      0.06, // 6% annual growth
      0.12 // 12% volatility
    );
    
    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Education API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Healthcare costs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  healthcare: async (_options: DataFetchOptions) => {
    await delay(randomInRange(500, 1300));
    
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;
    
    // Generate healthcare cost data with high growth
    const data = generateTimeSeriesData(
      startYear,
      currentYear,
      8000, // Base healthcare cost
      0.07, // 7% annual growth
      0.15 // 15% volatility
    );
    
    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Healthcare API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Investment returns
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  investments: async (_options: DataFetchOptions) => {
    await delay(randomInRange(400, 1100));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 29;

    // Generate investment return data (percentage returns)
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      // Simulate market volatility with occasional negative years
      const baseReturn = 7; // 7% average return
      const volatility = randomFloatInRange(-20, 25); // High volatility
      const annualReturn = Math.round((baseReturn + volatility) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: annualReturn,
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Investment API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // New Economic Indicators
  // Consumer Price Index
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'inflation-cpi': async (_options: DataFetchOptions) => {
    await delay(randomInRange(500, 1200));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate CPI data with realistic inflation trends
    const data = generateTimeSeriesData(
      startYear,
      currentYear,
      250, // Base CPI value
      0.025, // 2.5% annual inflation
      0.08 // 8% volatility
    );

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock CPI API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Core Inflation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'core-inflation': async (_options: DataFetchOptions) => {
    await delay(randomInRange(400, 1000));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate core inflation data (more stable than headline)
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseInflation = 2.0; // 2% target
      const variation = randomFloatInRange(-0.5, 1.0);
      const coreInflation = Math.round((baseInflation + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(0, coreInflation), // Ensure non-negative
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Core Inflation API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Federal Reserve Balance Sheet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'fed-balance-sheet': async (_options: DataFetchOptions) => {
    await delay(randomInRange(600, 1300));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate Fed balance sheet data (trillions)
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseValue = 1.0 + (year - startYear) * 0.4; // Growing trend
      const variation = randomFloatInRange(-0.2, 0.3);
      const balanceSheet = Math.round((baseValue + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(0.5, balanceSheet), // Minimum 0.5 trillion
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Fed Balance Sheet API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Federal Funds Rate
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'federal-funds-rate': async (_options: DataFetchOptions) => {
    await delay(randomInRange(400, 900));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate federal funds rate data
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseRate = 0.5 + (year - startYear) * 0.2; // Gradual increase
      const variation = randomFloatInRange(-0.3, 0.5);
      const fundsRate = Math.round((baseRate + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(0, fundsRate), // Ensure non-negative
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock Federal Funds Rate API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Money Supply M1
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'money-supply-m1': async (_options: DataFetchOptions) => {
    await delay(randomInRange(500, 1100));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate M1 money supply data (trillions)
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseValue = 2.0 + (year - startYear) * 0.3; // Growing trend
      const variation = randomFloatInRange(-0.2, 0.4);
      const m1Supply = Math.round((baseValue + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(1.0, m1Supply), // Minimum 1.0 trillion
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock M1 Money Supply API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // Money Supply M2
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'money-supply-m2': async (_options: DataFetchOptions) => {
    await delay(randomInRange(500, 1100));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate M2 money supply data (trillions)
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseValue = 12.0 + (year - startYear) * 0.8; // Growing trend
      const variation = randomFloatInRange(-0.5, 0.8);
      const m2Supply = Math.round((baseValue + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(10.0, m2Supply), // Minimum 10.0 trillion
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock M2 Money Supply API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // 10-Year Treasury Yield
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'treasury-10y': async (_options: DataFetchOptions) => {
    await delay(randomInRange(400, 900));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate 10-year treasury yield data
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseYield = 2.0 + (year - startYear) * 0.15; // Gradual increase
      const variation = randomFloatInRange(-0.5, 0.8);
      const treasuryYield = Math.round((baseYield + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(0.5, treasuryYield), // Minimum 0.5%
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock 10Y Treasury API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },

  // 2-Year Treasury Yield
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  'treasury-2y': async (_options: DataFetchOptions) => {
    await delay(randomInRange(400, 900));

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 19;

    // Generate 2-year treasury yield data
    const data = [];
    for (let year = startYear; year <= currentYear; year++) {
      const baseYield = 1.5 + (year - startYear) * 0.2; // Gradual increase
      const variation = randomFloatInRange(-0.4, 0.6);
      const treasuryYield = Math.round((baseYield + variation) * 100) / 100;

      data.push({
        date: `${year}-01-01`,
        value: Math.max(0.25, treasuryYield), // Minimum 0.25%
      });
    }

    return {
      data,
      success: true,
      timestamp: new Date(),
      source: 'Mock 2Y Treasury API',
      metadata: {
        totalRecords: data.length,
        rateLimit: {
          remaining: randomInRange(50, 100),
          resetTime: new Date(Date.now() + 60000),
        },
      },
    };
  },
};

// Error simulation for testing error handling
const shouldSimulateError = (): boolean => {
  // 5% chance of simulating an error
  return Math.random() < 0.05;
};

const getRandomError = () => {
  const errors = [
    { status: 429, message: 'Rate limit exceeded' },
    { status: 500, message: 'Internal server error' },
    { status: 503, message: 'Service temporarily unavailable' },
    { status: 408, message: 'Request timeout' },
  ];
  
  return errors[Math.floor(Math.random() * errors.length)];
};

// Main mock API service
export class MockApiService {
  async fetchData<T = unknown>(options: DataFetchOptions): Promise<ApiResponse<T>> {
    const { dataType } = options;
    
    // Simulate random errors for testing
    if (shouldSimulateError()) {
      const error = getRandomError();
      await delay(randomInRange(2000, 5000)); // Longer delay for errors
      
      return {
        data: null as T,
        success: false,
        error: error.message,
        timestamp: new Date(),
        source: 'Mock API',
      };
    }
    
    // Map data type to endpoint
    const endpointMap: Record<string, keyof typeof mockEndpoints> = {
      'house-prices': 'housing',
      'salary-income': 'income',
      'cost-of-living': 'economic',
      'tuition-education': 'education',
      'medical-costs': 'healthcare',
      'childcare-costs': 'healthcare', // Reuse healthcare pattern
      'transportation-costs': 'economic', // Reuse economic pattern
      'food-prices': 'economic', // Reuse economic pattern
      'utilities-costs': 'economic', // Reuse economic pattern
      'investment-returns': 'investments',
      // New Economic Indicators
      'inflation-cpi': 'inflation-cpi',
      'core-inflation': 'core-inflation',
      'fed-balance-sheet': 'fed-balance-sheet',
      'federal-funds-rate': 'federal-funds-rate',
      'unemployment-rate': 'economic', // Reuse existing unemployment endpoint
      'gdp-growth': 'economic', // Reuse economic pattern for GDP
      'money-supply-m1': 'money-supply-m1',
      'money-supply-m2': 'money-supply-m2',
      'treasury-10y': 'treasury-10y',
      'treasury-2y': 'treasury-2y',
    };
    
    const endpoint = endpointMap[dataType];
    if (!endpoint) {
      return {
        data: null as T,
        success: false,
        error: `Unknown data type: ${dataType}`,
        timestamp: new Date(),
        source: 'Mock API',
      };
    }
    
    try {
      const response = await mockEndpoints[endpoint](options);
      return response as ApiResponse<T>;
    } catch (error) {
      return {
        data: null as T,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        source: 'Mock API',
      };
    }
  }
  
  // Health check simulation
  async healthCheck(): Promise<boolean> {
    await delay(randomInRange(100, 500));
    return Math.random() > 0.1; // 90% uptime
  }
  
  // Simulate rate limit status
  getRateLimitStatus() {
    return {
      remaining: randomInRange(10, 100),
      limit: 100,
      resetTime: new Date(Date.now() + 60000),
    };
  }
}

// Default mock service instance
export const mockApiService = new MockApiService();
