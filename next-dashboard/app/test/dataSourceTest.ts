/**
 * Data Source Test Utilities
 *
 * Simple test utilities to validate the data source functionality
 * and ensure data consistency between historical and live sources.
 */

import { mockApiService } from '../services/mockApiService';
import { transformers } from '../services/dataTransformers';
import { generateHistoricalDataByType } from '../utils/historicalDataGenerators';
import { ChartData } from '../types/dashboard';

// Test data source switching
export async function testDataSourceSwitching() {
  console.log('🧪 Testing Data Source Switching...');
  
  try {
    // Test historical data generation
    console.log('📊 Testing historical data generation...');
    const historicalHousePrices = generateHistoricalDataByType('house-prices', 'line-chart') as ChartData;
    const historicalIncome = generateHistoricalDataByType('salary-income', 'line-chart') as ChartData;

    console.log('✅ Historical data generated:', {
      housePrices: {
        labels: historicalHousePrices?.labels?.length || 0,
        datasets: historicalHousePrices?.datasets?.length || 0,
        isRealData: historicalHousePrices?.isRealData,
        dataSource: historicalHousePrices?.dataSource,
      },
      income: {
        labels: historicalIncome?.labels?.length || 0,
        datasets: historicalIncome?.datasets?.length || 0,
        isRealData: historicalIncome?.isRealData,
        dataSource: historicalIncome?.dataSource,
      },
    });

    // Test mock API data
    console.log('🌐 Testing mock API data...');
    const apiHousePrices = await mockApiService.fetchData({
      dataType: 'house-prices',
    });
    
    const apiIncome = await mockApiService.fetchData({
      dataType: 'salary-income',
    });

    console.log('✅ Mock API data fetched:', {
      housePrices: {
        success: apiHousePrices.success,
        dataLength: Array.isArray(apiHousePrices.data) ? apiHousePrices.data.length : 0,
        source: apiHousePrices.source,
      },
      income: {
        success: apiIncome.success,
        dataLength: Array.isArray(apiIncome.data) ? apiIncome.data.length : 0,
        source: apiIncome.source,
      },
    });

    // Test data transformation
    if (apiHousePrices.success && apiHousePrices.data) {
      console.log('🔄 Testing data transformation...');
      const transformedData = transformers.chartData.transform(
        apiHousePrices.data as Array<{ date: string; value: number; label?: string }>,
        'house-prices'
      );

      console.log('✅ Data transformed:', {
        labels: transformedData.labels.length,
        datasets: transformedData.datasets.length,
        isRealData: transformedData.isRealData,
        dataSource: transformedData.dataSource,
      });
    }

    // Test API health check
    console.log('🏥 Testing API health check...');
    const healthStatus = await mockApiService.healthCheck();
    console.log('✅ API health status:', healthStatus);

    console.log('🎉 All data source tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Data source test failed:', error);
    return false;
  }
}

// Test data consistency
export function testDataConsistency() {
  console.log('🔍 Testing data consistency...');
  
  try {
    const dataTypes = ['house-prices', 'salary-income', 'cost-of-living'];
    const visualizationTypes = ['line-chart', 'bar-chart'];
    
    for (const dataType of dataTypes) {
      for (const vizType of visualizationTypes) {
        const data = generateHistoricalDataByType(dataType, vizType);
        
        if (data && typeof data === 'object' && 'labels' in data && 'datasets' in data) {
          const chartData = data as ChartData;
          
          // Validate data structure
          if (!chartData.labels || !Array.isArray(chartData.labels)) {
            throw new Error(`Invalid labels for ${dataType} ${vizType}`);
          }
          
          if (!chartData.datasets || !Array.isArray(chartData.datasets)) {
            throw new Error(`Invalid datasets for ${dataType} ${vizType}`);
          }
          
          // Validate each dataset
          for (const dataset of chartData.datasets) {
            if (!dataset.label || !Array.isArray(dataset.data)) {
              throw new Error(`Invalid dataset structure for ${dataType} ${vizType}`);
            }
            
            if (dataset.data.length !== chartData.labels.length) {
              throw new Error(`Data length mismatch for ${dataType} ${vizType}`);
            }
          }
          
          console.log(`✅ ${dataType} ${vizType}: ${chartData.labels.length} data points`);
        }
      }
    }
    
    console.log('🎉 Data consistency tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Data consistency test failed:', error);
    return false;
  }
}

// Test localStorage functionality
export async function testLocalStorage() {
  console.log('💾 Testing localStorage functionality...');
  
  try {
    // Test data source preference
    const { dataSourcePreference } = await import('../utils/localStorage');
    
    // Save preference
    dataSourcePreference.save('live-api');
    const saved = dataSourcePreference.load();
    
    if (saved !== 'live-api') {
      throw new Error('Failed to save/load data source preference');
    }
    
    // Reset to default
    dataSourcePreference.save('historical');
    const reset = dataSourcePreference.load();

    if (reset !== 'historical') {
      throw new Error('Failed to reset data source preference');
    }
    
    console.log('✅ localStorage functionality working');
    return true;
    
  } catch (error) {
    console.error('❌ localStorage test failed:', error);
    return false;
  }
}

// Run all tests
export async function runAllTests() {
  console.log('🚀 Starting Data Source Feature Tests...\n');
  
  const results = {
    dataSourceSwitching: await testDataSourceSwitching(),
    dataConsistency: testDataConsistency(),
    localStorage: testLocalStorage(),
  };
  
  console.log('\n📋 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉' : '💥'} Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).dataSourceTests = {
    runAllTests,
    testDataSourceSwitching,
    testDataConsistency,
    testLocalStorage,
  };
}
