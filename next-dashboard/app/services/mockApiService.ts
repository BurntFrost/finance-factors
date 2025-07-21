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
