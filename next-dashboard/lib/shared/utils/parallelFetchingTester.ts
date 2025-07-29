/**
 * Parallel Fetching Performance Tester
 *
 * Utility to test and compare performance between sequential and parallel data fetching
 */

import { DataFetchOptions, ApiResponse } from '@/shared/types/dataSource';

export interface FetchingTestResult {
  method: 'sequential' | 'parallel';
  dataTypes: string[];
  totalTime: number;
  individualTimes: Record<string, number>;
  successCount: number;
  errorCount: number;
  errors: Record<string, string>;
  averageTime: number;
  throughput: number; // requests per second
}

export interface FetchingComparison {
  sequential: FetchingTestResult;
  parallel: FetchingTestResult;
  performanceImprovement: {
    timeReduction: number; // percentage
    throughputIncrease: number; // percentage
    speedupFactor: number; // how many times faster
  };
  summary: string;
}

export class ParallelFetchingTester {
  private fetchFunction: <T = unknown>(options: DataFetchOptions) => Promise<ApiResponse<T>>;

  constructor(fetchFunction: <T = unknown>(options: DataFetchOptions) => Promise<ApiResponse<T>>) {
    this.fetchFunction = fetchFunction;
  }

  /**
   * Test sequential fetching performance
   */
  async testSequentialFetching(dataTypes: string[]): Promise<FetchingTestResult> {
    console.log(`🔄 Testing sequential fetching for ${dataTypes.length} data types...`);
    
    const startTime = Date.now();
    const individualTimes: Record<string, number> = {};
    const errors: Record<string, string> = {};
    let successCount = 0;
    let errorCount = 0;

    // Fetch data types sequentially
    for (const dataType of dataTypes) {
      const itemStartTime = Date.now();
      
      try {
        const response = await this.fetchFunction({ dataType });
        const itemTime = Date.now() - itemStartTime;
        
        individualTimes[dataType] = itemTime;
        
        if (response.success) {
          successCount++;
          console.log(`✅ Sequential: ${dataType} completed in ${itemTime}ms`);
        } else {
          errorCount++;
          errors[dataType] = response.error || 'Unknown error';
          console.warn(`❌ Sequential: ${dataType} failed in ${itemTime}ms - ${response.error}`);
        }
      } catch (error) {
        const itemTime = Date.now() - itemStartTime;
        individualTimes[dataType] = itemTime;
        errorCount++;
        errors[dataType] = error instanceof Error ? error.message : 'Unknown error';
        console.error(`💥 Sequential: ${dataType} error in ${itemTime}ms -`, error);
      }
    }

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / dataTypes.length;
    const throughput = (dataTypes.length / totalTime) * 1000; // requests per second

    console.log(`📊 Sequential fetching completed: ${totalTime}ms total, ${successCount}/${dataTypes.length} successful`);

    return {
      method: 'sequential',
      dataTypes,
      totalTime,
      individualTimes,
      successCount,
      errorCount,
      errors,
      averageTime,
      throughput,
    };
  }

  /**
   * Test parallel fetching performance
   */
  async testParallelFetching(dataTypes: string[]): Promise<FetchingTestResult> {
    console.log(`🚀 Testing parallel fetching for ${dataTypes.length} data types...`);
    
    const startTime = Date.now();
    const individualTimes: Record<string, number> = {};
    const errors: Record<string, string> = {};
    let successCount = 0;
    let errorCount = 0;

    // Create parallel fetch promises
    const fetchPromises = dataTypes.map(async (dataType) => {
      const itemStartTime = Date.now();
      
      try {
        const response = await this.fetchFunction({ dataType });
        const itemTime = Date.now() - itemStartTime;
        
        return {
          dataType,
          response,
          time: itemTime,
          success: response.success,
          error: response.error,
        };
      } catch (error) {
        const itemTime = Date.now() - itemStartTime;
        return {
          dataType,
          response: null,
          time: itemTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Execute all requests in parallel
    const results = await Promise.allSettled(fetchPromises);
    
    // Process results
    results.forEach((result, index) => {
      const dataType = dataTypes[index];
      
      if (result.status === 'fulfilled') {
        const { time, success, error } = result.value;
        individualTimes[dataType] = time;
        
        if (success) {
          successCount++;
          console.log(`✅ Parallel: ${dataType} completed in ${time}ms`);
        } else {
          errorCount++;
          errors[dataType] = error || 'Unknown error';
          console.warn(`❌ Parallel: ${dataType} failed in ${time}ms - ${error}`);
        }
      } else {
        // Promise was rejected
        errorCount++;
        errors[dataType] = result.reason?.message || 'Promise rejected';
        individualTimes[dataType] = Date.now() - startTime; // Fallback time
        console.error(`💥 Parallel: ${dataType} promise rejected -`, result.reason);
      }
    });

    const totalTime = Date.now() - startTime;
    const averageTime = Object.values(individualTimes).reduce((sum, time) => sum + time, 0) / dataTypes.length;
    const throughput = (dataTypes.length / totalTime) * 1000; // requests per second

    console.log(`📊 Parallel fetching completed: ${totalTime}ms total, ${successCount}/${dataTypes.length} successful`);

    return {
      method: 'parallel',
      dataTypes,
      totalTime,
      individualTimes,
      successCount,
      errorCount,
      errors,
      averageTime,
      throughput,
    };
  }

  /**
   * Compare sequential vs parallel fetching performance
   */
  async comparePerformance(dataTypes: string[]): Promise<FetchingComparison> {
    console.log(`🏁 Starting performance comparison for ${dataTypes.length} data types...`);
    
    // Test sequential fetching
    const sequential = await this.testSequentialFetching(dataTypes);
    
    // Wait a bit between tests to avoid overwhelming APIs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test parallel fetching
    const parallel = await this.testParallelFetching(dataTypes);
    
    // Calculate performance improvements
    const timeReduction = ((sequential.totalTime - parallel.totalTime) / sequential.totalTime) * 100;
    const throughputIncrease = ((parallel.throughput - sequential.throughput) / sequential.throughput) * 100;
    const speedupFactor = sequential.totalTime / parallel.totalTime;
    
    const performanceImprovement = {
      timeReduction,
      throughputIncrease,
      speedupFactor,
    };
    
    // Generate summary
    const summary = this.generateSummary(sequential, parallel, performanceImprovement);
    
    console.log(`🎯 Performance comparison completed:`);
    console.log(`   Sequential: ${sequential.totalTime}ms (${sequential.successCount}/${dataTypes.length} successful)`);
    console.log(`   Parallel: ${parallel.totalTime}ms (${parallel.successCount}/${dataTypes.length} successful)`);
    console.log(`   Improvement: ${timeReduction.toFixed(1)}% faster, ${speedupFactor.toFixed(2)}x speedup`);
    
    return {
      sequential,
      parallel,
      performanceImprovement,
      summary,
    };
  }

  /**
   * Generate a human-readable summary of the performance comparison
   */
  private generateSummary(
    sequential: FetchingTestResult,
    parallel: FetchingTestResult,
    improvement: { timeReduction: number; throughputIncrease: number; speedupFactor: number }
  ): string {
    const lines = [
      `Performance Comparison Summary`,
      `================================`,
      ``,
      `Data Types Tested: ${sequential.dataTypes.length}`,
      ``,
      `Sequential Fetching:`,
      `  - Total Time: ${sequential.totalTime}ms`,
      `  - Average Time: ${sequential.averageTime.toFixed(1)}ms per request`,
      `  - Throughput: ${sequential.throughput.toFixed(2)} requests/second`,
      `  - Success Rate: ${sequential.successCount}/${sequential.dataTypes.length} (${((sequential.successCount / sequential.dataTypes.length) * 100).toFixed(1)}%)`,
      ``,
      `Parallel Fetching:`,
      `  - Total Time: ${parallel.totalTime}ms`,
      `  - Average Time: ${parallel.averageTime.toFixed(1)}ms per request`,
      `  - Throughput: ${parallel.throughput.toFixed(2)} requests/second`,
      `  - Success Rate: ${parallel.successCount}/${parallel.dataTypes.length} (${((parallel.successCount / parallel.dataTypes.length) * 100).toFixed(1)}%)`,
      ``,
      `Performance Improvement:`,
      `  - Time Reduction: ${improvement.timeReduction.toFixed(1)}%`,
      `  - Speedup Factor: ${improvement.speedupFactor.toFixed(2)}x`,
      `  - Throughput Increase: ${improvement.throughputIncrease.toFixed(1)}%`,
      ``,
      `Conclusion: ${improvement.timeReduction > 0 ? 'Parallel fetching is faster' : 'Sequential fetching is faster'} by ${Math.abs(improvement.timeReduction).toFixed(1)}%`,
    ];
    
    return lines.join('\n');
  }

  /**
   * Test with standard dashboard data types
   */
  async testStandardDashboard(): Promise<FetchingComparison> {
    const standardDataTypes = [
      'house-prices',
      'salary-income',
      'inflation-cpi',
      'core-inflation',
      'fed-balance-sheet',
      'federal-funds-rate',
      'unemployment-rate',
      'gdp-growth',
      'money-supply-m1',
      'money-supply-m2',
      'treasury-10y',
      'treasury-2y',
    ];
    
    return this.comparePerformance(standardDataTypes);
  }
}
