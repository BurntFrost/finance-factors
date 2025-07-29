/**
 * Test script for World Bank API integration
 * 
 * This script tests the World Bank API endpoints to verify they work correctly
 * Run with: node scripts/test-world-bank-api.js
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Test World Bank API endpoints
 */
async function testWorldBankAPI() {
  console.log('🌍 Testing World Bank API Integration...\n');

  const testCases = [
    {
      name: 'US GDP Data',
      dataType: 'world-bank-gdp-us',
      description: 'GDP (current US$) for United States'
    },
    {
      name: 'US Inflation Data',
      dataType: 'world-bank-inflation-us',
      description: 'Inflation, consumer prices (annual %) for United States'
    },
    {
      name: 'US Unemployment Data',
      dataType: 'world-bank-unemployment-us',
      description: 'Unemployment, total (% of total labor force) for United States'
    },
    {
      name: 'US Trade Data',
      dataType: 'world-bank-trade-us',
      description: 'Trade (% of GDP) for United States'
    },
    {
      name: 'Global GDP Data',
      dataType: 'world-bank-gdp-global',
      description: 'World GDP (current US$)'
    }
  ];

  let successCount = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    try {
      console.log(`📊 Testing: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      
      const response = await fetch(`${API_BASE_URL}/api/proxy/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType: testCase.dataType,
          timeRange: {
            start: new Date('2020-01-01').toISOString(),
            end: new Date('2023-12-31').toISOString(),
          },
          useCache: false, // Disable cache for testing
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data)) {
        console.log(`   ✅ Success: Retrieved ${data.data.length} data points`);
        console.log(`   📈 Sample data: ${JSON.stringify(data.data.slice(0, 2), null, 2)}`);
        console.log(`   🏷️  Source: ${data.source}`);
        console.log(`   ⏱️  Response time: ${response.headers.get('X-Response-Time') || 'N/A'}`);
        successCount++;
      } else {
        console.log(`   ❌ Failed: ${data.error || 'No data returned'}`);
        console.log(`   📄 Response: ${JSON.stringify(data, null, 2)}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📋 Test Summary:');
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${totalTests - successCount}`);
  console.log(`   Success rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);

  if (successCount === totalTests) {
    console.log('\n🎉 All World Bank API tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some World Bank API tests failed. Check the logs above.');
    process.exit(1);
  }
}

/**
 * Test direct World Bank API (without proxy)
 */
async function testDirectWorldBankAPI() {
  console.log('🔗 Testing direct World Bank API access...\n');

  try {
    const response = await fetch('https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&date=2020:2023&per_page=10');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length >= 2) {
      const [metadata, dataPoints] = data;
      console.log('✅ Direct World Bank API access successful');
      console.log(`📊 Retrieved ${dataPoints.length} data points`);
      console.log(`📈 Sample: ${JSON.stringify(dataPoints.slice(0, 2), null, 2)}`);
    } else {
      console.log('❌ Unexpected response format from World Bank API');
    }

  } catch (error) {
    console.log(`❌ Direct API test failed: ${error.message}`);
  }

  console.log('');
}

// Run tests
async function main() {
  console.log('🚀 Starting World Bank API Integration Tests\n');
  
  // Test direct API access first
  await testDirectWorldBankAPI();
  
  // Test through our proxy
  await testWorldBankAPI();
}

main().catch(console.error);
