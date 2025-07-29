#!/usr/bin/env node

/**
 * Test Script for Parallel Fetching
 * 
 * This script tests the parallel fetching implementation by making requests
 * to the API proxy endpoints and measuring performance improvements.
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/proxy/data`;

// Standard dashboard data types
const DATA_TYPES = [
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

/**
 * Make a request to the API proxy
 */
async function fetchDataType(dataType) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType,
        useCache: false, // Disable cache for accurate timing
      }),
    });
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    return {
      dataType,
      success: data.success || false,
      duration,
      error: data.error || null,
      source: data.source || 'Unknown',
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      dataType,
      success: false,
      duration,
      error: error.message,
      source: 'Network Error',
    };
  }
}

/**
 * Test sequential fetching
 */
async function testSequentialFetching(dataTypes) {
  console.log(`🔄 Testing sequential fetching for ${dataTypes.length} data types...`);
  
  const startTime = Date.now();
  const results = [];
  
  for (const dataType of dataTypes) {
    console.log(`  Fetching ${dataType}...`);
    const result = await fetchDataType(dataType);
    results.push(result);
    
    if (result.success) {
      console.log(`    ✅ ${dataType}: ${result.duration}ms (${result.source})`);
    } else {
      console.log(`    ❌ ${dataType}: ${result.duration}ms - ${result.error}`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  
  console.log(`📊 Sequential completed: ${totalTime}ms total, ${successCount}/${dataTypes.length} successful\n`);
  
  return {
    method: 'sequential',
    totalTime,
    results,
    successCount,
    errorCount: dataTypes.length - successCount,
  };
}

/**
 * Test parallel fetching
 */
async function testParallelFetching(dataTypes) {
  console.log(`🚀 Testing parallel fetching for ${dataTypes.length} data types...`);
  
  const startTime = Date.now();
  
  // Create all promises
  const promises = dataTypes.map(dataType => {
    console.log(`  Starting ${dataType}...`);
    return fetchDataType(dataType);
  });
  
  // Wait for all to complete
  const results = await Promise.allSettled(promises);
  const totalTime = Date.now() - startTime;
  
  // Process results
  const processedResults = results.map((result, index) => {
    const dataType = dataTypes[index];
    
    if (result.status === 'fulfilled') {
      const data = result.value;
      if (data.success) {
        console.log(`    ✅ ${dataType}: ${data.duration}ms (${data.source})`);
      } else {
        console.log(`    ❌ ${dataType}: ${data.duration}ms - ${data.error}`);
      }
      return data;
    } else {
      console.log(`    💥 ${dataType}: Promise rejected - ${result.reason.message}`);
      return {
        dataType,
        success: false,
        duration: totalTime,
        error: result.reason.message,
        source: 'Promise Rejection',
      };
    }
  });
  
  const successCount = processedResults.filter(r => r.success).length;
  
  console.log(`📊 Parallel completed: ${totalTime}ms total, ${successCount}/${dataTypes.length} successful\n`);
  
  return {
    method: 'parallel',
    totalTime,
    results: processedResults,
    successCount,
    errorCount: dataTypes.length - successCount,
  };
}

/**
 * Compare performance between sequential and parallel fetching
 */
async function comparePerformance(dataTypes) {
  console.log(`🏁 Starting performance comparison for ${dataTypes.length} data types...\n`);
  
  // Test sequential fetching
  const sequential = await testSequentialFetching(dataTypes);
  
  // Wait between tests
  console.log('⏳ Waiting 2 seconds between tests...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test parallel fetching
  const parallel = await testParallelFetching(dataTypes);
  
  // Calculate improvements
  const timeReduction = ((sequential.totalTime - parallel.totalTime) / sequential.totalTime) * 100;
  const speedupFactor = sequential.totalTime / parallel.totalTime;
  
  // Display results
  console.log('🎯 PERFORMANCE COMPARISON RESULTS');
  console.log('=====================================');
  console.log(`Data Types: ${dataTypes.length}`);
  console.log('');
  console.log('Sequential Fetching:');
  console.log(`  Total Time: ${sequential.totalTime}ms`);
  console.log(`  Success Rate: ${sequential.successCount}/${dataTypes.length} (${((sequential.successCount / dataTypes.length) * 100).toFixed(1)}%)`);
  console.log(`  Average per Request: ${(sequential.totalTime / dataTypes.length).toFixed(1)}ms`);
  console.log('');
  console.log('Parallel Fetching:');
  console.log(`  Total Time: ${parallel.totalTime}ms`);
  console.log(`  Success Rate: ${parallel.successCount}/${dataTypes.length} (${((parallel.successCount / dataTypes.length) * 100).toFixed(1)}%)`);
  console.log(`  Average per Request: ${(parallel.results.reduce((sum, r) => sum + r.duration, 0) / dataTypes.length).toFixed(1)}ms`);
  console.log('');
  console.log('Performance Improvement:');
  console.log(`  Time Reduction: ${timeReduction.toFixed(1)}%`);
  console.log(`  Speedup Factor: ${speedupFactor.toFixed(2)}x`);
  console.log('');
  
  if (timeReduction > 0) {
    console.log(`✅ Parallel fetching is ${timeReduction.toFixed(1)}% faster!`);
  } else {
    console.log(`⚠️  Sequential fetching was ${Math.abs(timeReduction).toFixed(1)}% faster`);
  }
  
  return {
    sequential,
    parallel,
    timeReduction,
    speedupFactor,
  };
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 PARALLEL FETCHING PERFORMANCE TEST');
  console.log('=====================================\n');
  
  try {
    // Test with a subset first (faster testing)
    const testDataTypes = DATA_TYPES.slice(0, 6); // First 6 data types
    
    console.log(`Testing with ${testDataTypes.length} data types: ${testDataTypes.join(', ')}\n`);
    
    const results = await comparePerformance(testDataTypes);
    
    console.log('\n🏆 TEST COMPLETED SUCCESSFULLY!');
    
    // Optionally test with all data types
    if (process.argv.includes('--full')) {
      console.log('\n🔄 Running full test with all data types...\n');
      await comparePerformance(DATA_TYPES);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = {
  fetchDataType,
  testSequentialFetching,
  testParallelFetching,
  comparePerformance,
};
